'use strict';

/**
 * learnerModel.service.js
 *
 * Assembles the complete learner model by reading from all repositories in
 * parallel and running the deterministic rules engine over the result.
 *
 * Design invariants (from HANDOFF.md §14):
 *   - ALL repo calls run in Promise.all — never sequential awaits.
 *   - The rules engine is the sole author of adaptive decisions.
 *   - No req/res — pure business logic; services are injectable.
 */

const learnersRepo   = require('../db/repositories/learners.repo');
const skillStateRepo = require('../db/repositories/skillState.repo');
const progressRepo   = require('../db/repositories/progress.repo');
const signalsRepo    = require('../db/repositories/signals.repo');
const outcomesRepo   = require('../db/repositories/outcomes.repo');
const companionRepo  = require('../db/repositories/companion.repo');
const modulesRepo    = require('../db/repositories/modules.repo');

const { atRiskScore }     = require('./rules/atRiskScore');
const { goalProgress }    = require('./rules/goalProgress');
const { nextBestAction }  = require('./rules/nextBestAction');

// ─── Shape helpers ────────────────────────────────────────────────────────────
//
// The rules engine functions expect plain flat objects.  The repo layer returns
// rows with a nested `skill` join object (e.g. row.skill.code).  These helpers
// project repo rows into the shapes the rules functions declare in their JSDoc.

/**
 * Project a skill_state repo row into the shape expected by the rules engine.
 * goalProgress and nextBestAction both want { skill_id, skill_code, proficiency }.
 * @param {object} row - skill_state row with joined skill object
 * @returns {{ skill_id: string, skill_code: string, proficiency: number }}
 */
function toRulesSkill(row) {
  return {
    skill_id:   row.skill_id,
    skill_code: row.skill?.code ?? row.skill_code ?? '',
    proficiency: Number(row.proficiency),
  };
}

/**
 * Project a progress repo row into the minimal shape the rules engine needs.
 * @param {object} row - progress row (with or without the nested module join)
 * @returns {{ module_id: string, status: string }}
 */
function toRulesProgress(row) {
  return {
    module_id: row.module_id,
    status:    row.status,
  };
}

// ─── Core analysis runner ─────────────────────────────────────────────────────

/**
 * Run all three rules functions over the already-fetched learner data and
 * return the analysis object.  This is extracted so both getLearnerModel and
 * refreshAnalysis share the exact same logic.
 *
 * @param {{
 *   skillState:     object[],
 *   progress:       object[],
 *   recentSignals:  object[],
 *   programModules: object[],
 * }} data
 * @returns {{ atRisk: object, goalProgress: object, nextBestAction: object|null }}
 */
function runAnalysis({ skillState, progress, recentSignals, programModules }) {
  const rulesSkills   = skillState.map(toRulesSkill);
  const rulesProgress = progress.map(toRulesProgress);

  return {
    atRisk:         atRiskScore({ signals: recentSignals }),
    goalProgress:   goalProgress({ skillState: rulesSkills, progress: rulesProgress }),
    nextBestAction: nextBestAction({
      skillState: rulesSkills,
      modules:    programModules,
      progress:   rulesProgress,
    }),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Assemble the complete learner model for a given learnerId.
 * All repository reads run in a single Promise.all — no sequential awaits.
 *
 * @param {string} learnerId - learners.id UUID
 * @returns {Promise<{
 *   learner:        object,
 *   skillState:     object[],
 *   progress:       object[],
 *   recentSignals:  object[],
 *   outcomes:       object[],
 *   recentMessages: object[],
 *   analysis: {
 *     atRisk:         object,
 *     goalProgress:   object,
 *     nextBestAction: object|null,
 *   }
 * }>}
 */
async function getLearnerModel(learnerId) {
  if (!learnerId) throw new Error('getLearnerModel: learnerId is required');

  // ── Phase 1: fetch all learner-specific data in parallel ──────────────────
  const [learner, skillState, progress, recentSignals, outcomes, recentMessages] =
    await Promise.all([
      learnersRepo.findById(learnerId),
      skillStateRepo.findByLearnerId(learnerId),
      progressRepo.findByLearnerId(learnerId),
      signalsRepo.findRecentByLearnerId(learnerId, 14),
      outcomesRepo.findByLearnerId(learnerId),
      companionRepo.findRecentByLearnerId(learnerId, 10),
    ]);

  if (!learner) {
    const err = new Error(`Learner not found: ${learnerId}`);
    err.statusCode = 404;
    throw err;
  }

  // ── Phase 2: fetch modules for this learner's program ────────────────────
  // This is a separate await because it depends on learner.program from phase 1.
  // modulesRepo.findByProgram is a single fast catalog read — acceptable serial step.
  const programModules = await modulesRepo.findByProgram(learner.program);

  // ── Phase 3: run rules engine (pure, synchronous) ─────────────────────────
  const analysis = runAnalysis({ skillState, progress, recentSignals, programModules });

  return {
    learner,
    skillState,
    progress,
    recentSignals,
    outcomes,
    recentMessages,
    analysis,
  };
}

/**
 * Lightweight recalculation used by the instructor dashboard.
 * Fetches only the data needed for analysis (no messages, no outcomes)
 * — all in a single Promise.all.
 *
 * @param {string} learnerId
 * @returns {Promise<{ atRisk: object, goalProgress: object, nextBestAction: object|null }>}
 */
async function refreshAnalysis(learnerId) {
  if (!learnerId) throw new Error('refreshAnalysis: learnerId is required');

  // Learner needed for program; signals/skills/progress needed for rules.
  // We can parallelize learner lookup with skills/progress/signals even though
  // we don't yet know the program — programModules fetch must wait for learner.
  const [learner, skillState, progress, recentSignals] = await Promise.all([
    learnersRepo.findById(learnerId),
    skillStateRepo.findByLearnerId(learnerId),
    progressRepo.findByLearnerId(learnerId),
    signalsRepo.findRecentByLearnerId(learnerId, 14),
  ]);

  if (!learner) {
    const err = new Error(`Learner not found: ${learnerId}`);
    err.statusCode = 404;
    throw err;
  }

  const programModules = await modulesRepo.findByProgram(learner.program);

  return runAnalysis({ skillState, progress, recentSignals, programModules });
}

module.exports = { getLearnerModel, refreshAnalysis };
