'use strict';

/**
 * dashboard.service.js
 *
 * Powers the student-facing dashboard.  Wraps getLearnerModel and shapes
 * raw repo data into UI-ready response objects.
 *
 * Three exports:
 *   getDashboard(learnerId)           — full dashboard view
 *   getSkillBreakdown(learnerId)      — skill list grouped by proficiency band
 *   recordActivity(learnerId, moduleId, event) — progress write + struggle detection
 */

const { getLearnerModel }    = require('./learnerModel.service');
const progressRepo           = require('../db/repositories/progress.repo');
const signalsRepo            = require('../db/repositories/signals.repo');
const { detectSignals }      = require('./rules/struggleDetectors');
const { getRules }           = require('../config/rules');

// Proficiency bands come from the shared rules config (config/rules.js → bands):
//   proficiency >= strong              → strong
//   developing <= proficiency < strong → developing
//   0 < proficiency < developing       → weak;  exactly 0 → not_started

// ─── Shape helpers ────────────────────────────────────────────────────────────

/**
 * Derive progress summary counts from the raw progress array.
 * @param {object[]} progress
 * @returns {{ completed: number, inProgress: number, notStarted: number }}
 */
function buildProgressSummary(progress) {
  return {
    completed:  progress.filter((p) => p.status === 'completed').length,
    inProgress: progress.filter((p) => p.status === 'in_progress' || p.status === 'stalled').length,
    notStarted: progress.filter((p) => p.status === 'not_started').length,
  };
}

/**
 * Find the in-progress (or stalled) module with the lowest completion_pct
 * as the "current" focus — the one the student should be actively working on.
 * Returns null when nothing is in-progress.
 * @param {object[]} progress - repo rows with nested module join
 * @returns {object|null}
 */
function findCurrentModule(progress) {
  const active = progress
    .filter((p) => p.status === 'in_progress' || p.status === 'stalled')
    .sort((a, b) => Number(a.completion_pct) - Number(b.completion_pct));

  if (!active.length) return null;
  const row = active[0];
  return {
    moduleId:      row.module_id,
    moduleName:    row.module?.name ?? null,
    status:        row.status,
    completionPct: Number(row.completion_pct),
    lastScore:     row.last_score !== null ? Number(row.last_score) : null,
    attempts:      row.attempts,
  };
}

/**
 * Bucket skill_state rows into strong / weak / notStarted arrays.
 * Returns arrays of { skillId, code, name, proficiency } objects.
 * @param {object[]} skillState - repo rows with nested skill join
 */
function bucketSkills(skillState) {
  const { strong: STRONG_THRESHOLD } = getRules().bands;
  const strong     = [];
  const weak       = [];
  const notStarted = [];

  for (const row of skillState) {
    const p    = Number(row.proficiency);
    const item = {
      skillId:    row.skill_id,
      code:       row.skill?.code  ?? null,
      name:       row.skill?.name  ?? null,
      proficiency: p,
    };

    if (p >= STRONG_THRESHOLD)    strong.push(item);
    else if (p === 0)             notStarted.push(item);
    else                          weak.push(item);
  }

  return { strong, weak, notStarted };
}

/**
 * Group skill_state rows into the three proficiency bands for getSkillBreakdown.
 * @param {object[]} skillState
 * @returns {{ strong: object[], developing: object[], weak: object[] }}
 */
function groupSkillsByBand(skillState) {
  const { strong: STRONG_THRESHOLD, developing: DEVELOPING_MIN } = getRules().bands;
  const strong     = [];
  const developing = [];
  const weak       = [];

  for (const row of skillState) {
    const p    = Number(row.proficiency);
    const item = {
      skillId:    row.skill_id,
      code:       row.skill?.code  ?? null,
      name:       row.skill?.name  ?? null,
      domain:     row.skill?.domain ?? null,
      proficiency: p,
    };

    if (p >= STRONG_THRESHOLD)         strong.push(item);
    else if (p >= DEVELOPING_MIN)      developing.push(item);
    else                               weak.push(item);
  }

  // Sort each band by proficiency descending so highest-proficiency comes first
  const desc = (a, b) => b.proficiency - a.proficiency;
  return {
    strong:     strong.sort(desc),
    developing: developing.sort(desc),
    weak:       weak.sort(desc),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Assemble the full student dashboard view.
 *
 * @param {string} learnerId
 * @returns {Promise<{
 *   learner:       { name, program, cohort, goal },
 *   journey:       { currentModule, nextBestAction, progressSummary },
 *   skills:        { strong, weak, notStarted },
 *   atRisk:        { level, reasons },
 *   goalProgress:  { percentage, onTrack, strongAreas, weakAreas },
 *   recentActivity: object[],
 * }>}
 */
async function getDashboard(learnerId) {
  const model = await getLearnerModel(learnerId);

  const { learner, skillState, progress, recentSignals, recentMessages, analysis } = model;

  const progressSummary = buildProgressSummary(progress);
  const currentModule   = findCurrentModule(progress);
  const skillBuckets    = bucketSkills(skillState);

  return {
    learner: {
      name:    learner.name,
      program: learner.program,
      cohort:  learner.cohort,
      goal:    learner.stated_goal ?? null,
    },
    journey: {
      currentModule,
      nextBestAction:  analysis.nextBestAction,
      progressSummary,
    },
    skills: {
      strong:     skillBuckets.strong,
      weak:       skillBuckets.weak,
      notStarted: skillBuckets.notStarted,
    },
    atRisk: {
      level:   analysis.atRisk.level,
      reasons: analysis.atRisk.reasons,
    },
    goalProgress: {
      percentage:  analysis.goalProgress.percentage,
      onTrack:     analysis.goalProgress.onTrack,
      strongAreas: analysis.goalProgress.strongAreas,
      weakAreas:   analysis.goalProgress.weakAreas,
    },
    // recentActivity is the last 10 companion messages — chronological for the UI
    recentActivity: [...recentMessages].reverse(),
  };
}

/**
 * Return all skills for the learner's program with proficiency, grouped into
 * three bands: strong (≥0.7), developing (0.4–0.69), weak (<0.4 including 0).
 *
 * Not-yet-started skills (proficiency 0) fall into the "weak" band so the
 * student sees their full skill landscape, not just active ones.
 *
 * @param {string} learnerId
 * @returns {Promise<{ strong: object[], developing: object[], weak: object[] }>}
 */
async function getSkillBreakdown(learnerId) {
  const model = await getLearnerModel(learnerId);
  return groupSkillsByBand(model.skillState);
}

/**
 * Record a progress event for a student on a module.
 * Steps:
 *   1. Upsert the progress row (creates or updates the (learner, module) pair).
 *   2. Run struggleDetectors on the event.
 *   3. Write any triggered signals to struggle_signals (in parallel).
 *   4. Return { progress, signalsCreated }.
 *
 * The status is inferred from completionPct:
 *   100  → completed (completed_at = now)
 *   >  0  → in_progress
 *   == 0  → not_started
 *
 * @param {string} learnerId
 * @param {string} moduleId
 * @param {{
 *   score?:               number,
 *   attempts:             number,
 *   timeSpentMinutes?:    number,
 *   expectedTimeMinutes?: number,
 *   completionPct?:       number,
 * }} event
 * @returns {Promise<{ progress: object, signalsCreated: object[] }>}
 */
async function recordActivity(learnerId, moduleId, event) {
  if (!learnerId) throw new Error('recordActivity: learnerId is required');
  if (!moduleId)  throw new Error('recordActivity: moduleId is required');
  if (event?.attempts === undefined || event?.attempts === null) {
    throw new Error('recordActivity: event.attempts is required');
  }

  const {
    score,
    attempts,
    timeSpentMinutes,
    expectedTimeMinutes,
    completionPct = 0,
  } = event;

  // ── Infer status from completionPct ──────────────────────────────────────
  let status       = 'not_started';
  let completed_at = null;

  if (completionPct >= 100) {
    status       = 'completed';
    completed_at = new Date().toISOString();
  } else if (completionPct > 0) {
    status = 'in_progress';
  }

  // ── 1. Upsert progress ───────────────────────────────────────────────────
  // started_at must be stamped only when the (learner, module) row is first
  // created. The upsert merges every supplied column, so sending started_at
  // unconditionally would overwrite the original start time on every follow-up
  // activity event. Look up the existing row and only include started_at when
  // there isn't one yet.
  const existing = await progressRepo.findByLearnerAndModule(learnerId, moduleId);

  const progressRow = await progressRepo.upsert({
    learner_id:          learnerId,
    module_id:           moduleId,
    status,
    completion_pct:      completionPct,
    attempts,
    ...(score             !== undefined && { last_score:           score }),
    ...(timeSpentMinutes  !== undefined && { time_spent_minutes:   timeSpentMinutes }),
    ...(completed_at                    && { completed_at }),
    ...(existing                        ? {} : { started_at: new Date().toISOString() }),
  });

  // ── 2. Run struggle detectors (pure, synchronous) ────────────────────────
  const triggeredTypes = detectSignals({ score, attempts, timeSpentMinutes, expectedTimeMinutes });

  // ── 3. Write signals in parallel ─────────────────────────────────────────
  const signalsCreated = await Promise.all(
    triggeredTypes.map((signal_type) =>
      signalsRepo.insert({
        learner_id:  learnerId,
        signal_type,
        severity:    signal_type === 'repeated_attempts' || signal_type === 'missed_deadline'
                       ? 'medium'
                       : 'low',
        source:      'system',
        context: {
          module_id:  moduleId,
          score:      score ?? null,
          attempts,
          time_spent_minutes:   timeSpentMinutes   ?? null,
          expected_time_minutes: expectedTimeMinutes ?? null,
        },
      }),
    ),
  );

  return { progress: progressRow, signalsCreated };
}

module.exports = { getDashboard, getSkillBreakdown, recordActivity };
