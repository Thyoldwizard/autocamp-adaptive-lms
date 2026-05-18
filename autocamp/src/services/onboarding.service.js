'use strict';

/**
 * onboarding.service.js
 *
 * Rules-based placement logic.  No LLM — uses background_type from the
 * learner record to assign starting proficiency values for program skills.
 *
 * background_type → starting_proficiency map:
 *   technical     → 0.30  (some relevant experience)
 *   semi_technical → 0.15  (limited exposure)
 *   non_technical  → 0.05  (near-zero baseline)
 */

const learnersRepo   = require('../db/repositories/learners.repo');
const skillsRepo     = require('../db/repositories/skills.repo');
const skillStateRepo = require('../db/repositories/skillState.repo');
const modulesRepo    = require('../db/repositories/modules.repo');
const { getLearnerModel } = require('./learnerModel.service');

// ─── Placement config ─────────────────────────────────────────────────────────

const BACKGROUND_PROFICIENCY = {
  technical:      0.30,
  semi_technical: 0.15,
  non_technical:  0.05,
};

const DEFAULT_PROFICIENCY = 0.05; // fallback for unknown background types

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Check whether a learner has completed onboarding.
 * Onboarding is considered complete once skill_state rows exist.
 *
 * @param {string} learnerId
 * @returns {Promise<{ completed: boolean, learnerId: string }>}
 */
async function getOnboardingStatus(learnerId) {
  if (!learnerId) throw new Error('getOnboardingStatus: learnerId is required');

  const skillStates = await skillStateRepo.findByLearnerId(learnerId);
  return {
    completed: skillStates.length > 0,
    learnerId,
  };
}

/**
 * Complete onboarding by writing initial skill_state rows for the learner's
 * program, calibrated by their background_type.
 *
 * Steps:
 *   1. Load learner record (for program + background_type).
 *   2. Load all modules for that program → collect unique skill_ids.
 *   3. Load those skills from the catalog.
 *   4. For each skill, upsert a skill_state row with proficiency based on
 *      the learner's background_type.  Any explicit overrides in `answers`
 *      (a map of skill_code → proficiency) take priority.
 *   5. Return the full learner model.
 *
 * @param {string} learnerId
 * @param {{ [skillCode: string]: number }} answers - optional explicit overrides
 * @returns {Promise<object>} full learner model from getLearnerModel
 */
async function completeOnboarding(learnerId, answers = {}) {
  if (!learnerId) throw new Error('completeOnboarding: learnerId is required');

  // 1. Load learner
  const learner = await learnersRepo.findById(learnerId);
  if (!learner) {
    const err = new Error(`Learner not found: ${learnerId}`);
    err.statusCode = 404;
    throw err;
  }

  // 2. Load program modules and collect unique skill IDs
  const modules      = await modulesRepo.findByProgram(learner.program);
  const skillIdSet   = new Set(modules.flatMap((m) => m.skill_ids ?? []));
  const skillIds     = Array.from(skillIdSet);

  if (!skillIds.length) {
    // No skills catalogued for this program — return model without writing
    return getLearnerModel(learnerId);
  }

  // 3. Load skill catalog rows for those IDs in parallel with baseline calc
  const baseProficiency = BACKGROUND_PROFICIENCY[learner.background_type] ?? DEFAULT_PROFICIENCY;

  // Fetch skills — we need code → id mapping for answers lookup
  const { data: skillRows, error } = await require('../config/supabase')
    .from('skills')
    .select('id, code')
    .in('id', skillIds);

  if (error) throw error;

  // 4. Upsert all skill_state rows in parallel
  const now = new Date().toISOString();
  await Promise.all(
    (skillRows ?? []).map((skill) => {
      const proficiency = answers[skill.code] !== undefined
        ? Number(answers[skill.code])
        : baseProficiency;

      return skillStateRepo.upsertSkill({
        learner_id:       learnerId,
        skill_id:         skill.id,
        proficiency,
        confidence:       proficiency,   // start confidence = proficiency
        last_assessed_at: now,
      });
    }),
  );

  // 5. Return the full learner model
  return getLearnerModel(learnerId);
}

module.exports = { getOnboardingStatus, completeOnboarding };
