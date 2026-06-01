'use strict';

/**
 * rules.js — single source of truth for every tunable in the adaptive engine.
 *
 * Previously these thresholds were hardcoded and duplicated across
 * rules/*.js, dashboard.service.js, cohort.service.js, onboarding.service.js
 * and checkin.service.js. They now live here, with three layers of precedence
 * (lowest → highest):
 *
 *   1. DEFAULTS          — documented, sensible defaults (below).
 *   2. process.env.RULES_* — per-deploy scalar overrides (no redeploy of code).
 *   3. DB rules_config    — a single JSONB row (migration 013) merged last, so
 *                           rules can be retuned live without a deploy.
 *
 * Usage:
 *   const { getRules } = require('../config/rules');
 *   const { bands } = getRules();   // synchronous, always available
 *
 * The DEFAULTS+env merge is computed synchronously at module load so every
 * consumer (and every unit test) can call getRules() without any async setup
 * or DB connection. The DB layer is overlaid only when the server calls
 * loadRules() at startup; refresh() re-reads both env and DB on demand.
 *
 * This module intentionally does NOT require ./env or ./supabase at load time
 * (Supabase is lazy-required inside loadRules) so the pure rules unit tests can
 * import it without any Supabase environment configured.
 */

// ─── Defaults ──────────────────────────────────────────────────────────────

const DEFAULTS = {
  // Proficiency bands — shared by the dashboard skill buckets, goalProgress
  // strong/weak classification, and the instructor heatmap.
  //   proficiency >= strong              → strong
  //   developing <= proficiency < strong → developing
  //   0 < proficiency < developing       → weak
  //   proficiency === 0                  → not started
  bands: {
    strong: 0.7,
    developing: 0.4,
  },

  // Goal-progress composite: percentage = moduleRate*moduleWeight + skillAvg*skillWeight.
  goalProgress: {
    moduleWeight: 0.6,
    skillWeight: 0.4,
    onTrackCutoff: 50, // percentage >= this → onTrack
  },

  // At-risk scoring from unresolved struggle signals.
  atRisk: {
    signalWeights: {
      missed_deadline: 20,
      low_score: 15,
      repeated_attempts: 10,
      inactivity: 25,
      help_requested: 5,
      instructor_flag: 30,
    },
    recencyWindowMs: 7 * 24 * 60 * 60 * 1000, // signals newer than this are weighted up
    recencyMultiplier: 1.5,
    // Ordered high → low; the first cutoff the score meets wins. Score caps at 100.
    levels: [
      { threshold: 75, level: 'critical' },
      { threshold: 50, level: 'high' },
      { threshold: 25, level: 'medium' },
      { threshold: 0, level: 'low' },
    ],
  },

  // Next-best-action recommendation.
  nextBestAction: {
    // A skill with 0 < proficiency < this is an "active gap" worth targeting.
    proficiencyThreshold: 0.7,
    // Fixed tie-breaker nudge added to an in-progress module's gap score so it
    // wins over a fresh module of similar difficulty ("finish what you
    // started"). A fresh module whose gap is more than this much larger still
    // wins — it is a nudge, not an override.
    inProgressBoost: 0.3,
  },

  // Struggle-signal detectors run on each activity event.
  struggle: {
    lowScoreThreshold: 60, // score strictly below this → low_score
    repeatedAttemptsThreshold: 3, // attempts strictly above this → repeated_attempts
    inactivityTimeRatio: 0.2, // timeSpent < expected * this → inactivity
  },

  // Onboarding placement: starting proficiency by background type.
  onboarding: {
    backgroundProficiency: {
      technical: 0.3,
      semi_technical: 0.15,
      non_technical: 0.05,
    },
    defaultProficiency: 0.05, // fallback for unknown background types
  },

  // AI companion conversation.
  companion: {
    maxHistoryMessages: 10, // messages loaded from DB as LLM context
  },

  // Skill check-in (MCQ) flow.
  checkin: {
    sessionTtlMs: 30 * 60 * 1000, // sessions expire after 30 minutes
    minQuestions: 2, // fewer than this from the LLM → use fallback bank
    maxQuestions: 4, // questions are capped at this many
    activityTimeMinutes: 5, // synthetic time recorded for a check-in event
    // Proficiency delta applied after scoring a check-in.
    proficiencyDelta: {
      highScoreCutoff: 75, // score >= this → highScore delta
      midScoreCutoff: 50, // score >= this (but < high) → midScore delta
      highScore: 0.08,
      midScore: 0.02,
      lowScore: -0.05, // score below midScoreCutoff
    },
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Deep-clone a plain config object (defaults are never mutated in place). */
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/** Recursively merge `override` onto `base` (objects merge, scalars/arrays replace). */
function deepMerge(base, override) {
  if (!override || typeof override !== 'object' || Array.isArray(override)) {
    return override === undefined ? base : override;
  }
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, val] of Object.entries(override)) {
    out[key] =
      val && typeof val === 'object' && !Array.isArray(val) && out[key]
        ? deepMerge(out[key], val)
        : val;
  }
  return out;
}

/** Set a dotted path (e.g. 'bands.strong') on an object, creating nodes as needed. */
function setPath(obj, path, value) {
  const keys = path.split('.');
  let node = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    node[keys[i]] = node[keys[i]] ?? {};
    node = node[keys[i]];
  }
  node[keys[keys.length - 1]] = value;
}

const toNum = (raw) => {
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

const toJson = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

// Declarative table of env overrides: [ENV_VAR, dotted.path, parser].
// Scalars use toNum; structured maps/arrays accept a JSON string.
const ENV_OVERRIDES = [
  ['RULES_BAND_STRONG', 'bands.strong', toNum],
  ['RULES_BAND_DEVELOPING', 'bands.developing', toNum],
  ['RULES_GOAL_MODULE_WEIGHT', 'goalProgress.moduleWeight', toNum],
  ['RULES_GOAL_SKILL_WEIGHT', 'goalProgress.skillWeight', toNum],
  ['RULES_GOAL_ONTRACK_CUTOFF', 'goalProgress.onTrackCutoff', toNum],
  ['RULES_ATRISK_SIGNAL_WEIGHTS', 'atRisk.signalWeights', toJson],
  ['RULES_ATRISK_RECENCY_WINDOW_MS', 'atRisk.recencyWindowMs', toNum],
  ['RULES_ATRISK_RECENCY_MULTIPLIER', 'atRisk.recencyMultiplier', toNum],
  ['RULES_ATRISK_LEVELS', 'atRisk.levels', toJson],
  ['RULES_NBA_PROFICIENCY_THRESHOLD', 'nextBestAction.proficiencyThreshold', toNum],
  ['RULES_NBA_IN_PROGRESS_BOOST', 'nextBestAction.inProgressBoost', toNum],
  ['RULES_STRUGGLE_LOW_SCORE', 'struggle.lowScoreThreshold', toNum],
  ['RULES_STRUGGLE_REPEATED_ATTEMPTS', 'struggle.repeatedAttemptsThreshold', toNum],
  ['RULES_STRUGGLE_INACTIVITY_RATIO', 'struggle.inactivityTimeRatio', toNum],
  ['RULES_ONBOARDING_BACKGROUND_PROFICIENCY', 'onboarding.backgroundProficiency', toJson],
  ['RULES_ONBOARDING_DEFAULT_PROFICIENCY', 'onboarding.defaultProficiency', toNum],
  ['RULES_CHECKIN_SESSION_TTL_MS', 'checkin.sessionTtlMs', toNum],
  ['RULES_CHECKIN_MIN_QUESTIONS', 'checkin.minQuestions', toNum],
  ['RULES_CHECKIN_MAX_QUESTIONS', 'checkin.maxQuestions', toNum],
  ['RULES_CHECKIN_ACTIVITY_MINUTES', 'checkin.activityTimeMinutes', toNum],
  ['RULES_CHECKIN_HIGH_SCORE_CUTOFF', 'checkin.proficiencyDelta.highScoreCutoff', toNum],
  ['RULES_CHECKIN_MID_SCORE_CUTOFF', 'checkin.proficiencyDelta.midScoreCutoff', toNum],
  ['RULES_CHECKIN_HIGH_SCORE_DELTA', 'checkin.proficiencyDelta.highScore', toNum],
  ['RULES_CHECKIN_MID_SCORE_DELTA', 'checkin.proficiencyDelta.midScore', toNum],
  ['RULES_CHECKIN_LOW_SCORE_DELTA', 'checkin.proficiencyDelta.lowScore', toNum],
  ['RULES_COMPANION_MAX_HISTORY', 'companion.maxHistoryMessages', toNum],
];

/** Build the defaults+env layer synchronously. */
function buildFromEnv() {
  const config = clone(DEFAULTS);
  for (const [envVar, path, parse] of ENV_OVERRIDES) {
    const raw = process.env[envVar];
    if (raw === undefined || raw === '') continue;
    const parsed = parse(raw);
    if (parsed !== undefined) setPath(config, path, parsed);
  }
  return config;
}

// ─── Cache ─────────────────────────────────────────────────────────────────

// Initialised synchronously so getRules() works immediately, before (and even
// without) a loadRules() call. loadRules() overlays the DB layer on top.
let cache = buildFromEnv();

/** Return the current merged config (defaults < env < DB). Synchronous. */
function getRules() {
  return cache;
}

/**
 * Overlay the DB rules_config row (if any) onto the defaults+env layer.
 * Best-effort: if the table is missing or the DB is unreachable, the env+
 * defaults layer is kept and no error is thrown. Called once at server startup.
 *
 * @returns {Promise<object>} the merged config now in effect
 */
async function loadRules() {
  const base = buildFromEnv();
  try {
    // Lazy-require so importing this module never pulls in Supabase/env config.
    const supabase = require('./supabase');
    const { data, error } = await supabase
      .from('rules_config')
      .select('config')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data && data.config) {
      cache = deepMerge(base, data.config);
      return cache;
    }
  } catch {
    // Table missing / DB down / no Supabase env — fall back to env+defaults.
  }
  cache = base;
  return cache;
}

/** Re-read env (and DB) and rebuild the cache. */
function refresh() {
  return loadRules();
}

module.exports = { getRules, loadRules, refresh, DEFAULTS };
