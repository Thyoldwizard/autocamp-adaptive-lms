'use strict';

const { getRules } = require('../../config/rules');

// Tunables come from config/rules.js → nextBestAction:
//   proficiencyThreshold — skills with 0 < proficiency < this are "active gaps"
//     the learner is working on. Skills at exactly 0 are future territory and
//     should not pull focus away from active work.
//   inProgressBoost — a fixed tie-breaker nudge added to an in-progress
//     module's gap score so it wins over a fresh module of similar difficulty
//     ("finish what you started"). It is a nudge, not an override: a fresh
//     module whose gap is more than `inProgressBoost` larger still wins.

/**
 * Returns the single most important next module for a learner.
 *
 * @param {{
 *   skillState: Array<{ skill_id: string, skill_code: string, proficiency: number }>,
 *   modules:    Array<{ id: string, name: string, skill_ids: string[] }>,
 *   progress:   Array<{ module_id: string, status: string }>,
 * }} args
 * @returns {{ moduleId: string, moduleName: string, skillGap: number, reason: string } | null}
 */
function nextBestAction({ skillState, modules, progress }) {
  if (!skillState.length || !modules.length) return null;

  const { proficiencyThreshold: PROFICIENCY_THRESHOLD, inProgressBoost: IN_PROGRESS_BOOST } =
    getRules().nextBestAction;

  const proficiencyMap = Object.fromEntries(
    skillState.map((s) => [s.skill_id, s.proficiency])
  );

  const completedIds = new Set(
    progress.filter((p) => p.status === 'completed').map((p) => p.module_id)
  );
  const inProgressIds = new Set(
    progress.filter((p) => p.status === 'in_progress').map((p) => p.module_id)
  );

  const candidates = [];

  for (const mod of modules) {
    if (completedIds.has(mod.id)) continue;

    // Active gaps: learner has some proficiency (> 0) but hasn't mastered the skill yet.
    // Excluding 0-proficiency skills keeps recommendations focused on current work
    // rather than jumping ahead to skills the learner hasn't touched.
    const activeGaps = (mod.skill_ids ?? [])
      .filter((sid) => {
        const p = proficiencyMap[sid];
        return p !== undefined && p > 0 && p < PROFICIENCY_THRESHOLD;
      })
      .map((sid) => PROFICIENCY_THRESHOLD - proficiencyMap[sid]);

    if (activeGaps.length === 0) continue;

    const maxGap = Math.max(...activeGaps);
    const score = maxGap + (inProgressIds.has(mod.id) ? IN_PROGRESS_BOOST : 0);
    candidates.push({ mod, score, maxGap });
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => b.score - a.score);
  const { mod, maxGap } = candidates[0];

  const drivingSkill = skillState
    .filter(
      (s) =>
        (mod.skill_ids ?? []).includes(s.skill_id) &&
        s.proficiency > 0 &&
        s.proficiency < PROFICIENCY_THRESHOLD
    )
    .sort((a, b) => a.proficiency - b.proficiency)[0];

  return {
    moduleId:   mod.id,
    moduleName: mod.name,
    skillGap:   Math.round(maxGap * 100) / 100,
    reason:     drivingSkill
      ? `${drivingSkill.skill_code} proficiency is at ${Math.round(drivingSkill.proficiency * 100)}% — this module targets that gap`
      : 'This module covers skills where improvement is needed',
  };
}

module.exports = { nextBestAction };
