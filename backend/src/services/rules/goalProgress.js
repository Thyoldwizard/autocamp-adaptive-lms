'use strict';

const { getRules } = require('../../config/rules');

/**
 * Estimates how far a learner is toward their goal.
 *
 * percentage is a weighted composite (weights from config/rules.js → goalProgress):
 *   module completion rate     (objective curriculum progress)
 *   average skill proficiency  (knowledge depth)
 *
 * Strong/weak area thresholds come from the shared proficiency bands.
 *
 * weakAreas excludes skills at exactly 0 — those are not-yet-started
 * future skills, not active struggles.
 *
 * @param {{
 *   skillState: Array<{ skill_id: string, skill_code: string, proficiency: number }>,
 *   progress:   Array<{ module_id: string, status: string }>,
 * }} args
 * @returns {{ percentage: number, strongAreas: string[], weakAreas: string[], onTrack: boolean }}
 */
function goalProgress({ skillState, progress }) {
  const { bands, goalProgress: weights } = getRules();

  const skillScore = skillState.length > 0
    ? (skillState.reduce((sum, s) => sum + s.proficiency, 0) / skillState.length) * 100
    : 0;

  const completedCount = progress.filter((p) => p.status === 'completed').length;
  const moduleScore    = progress.length > 0
    ? (completedCount / progress.length) * 100
    : 0;

  const percentage = Math.min(
    100,
    Math.round(moduleScore * weights.moduleWeight + skillScore * weights.skillWeight),
  );

  const strongAreas = skillState
    .filter((s) => s.proficiency >= bands.strong)
    .map((s) => s.skill_code);

  const weakAreas = skillState
    .filter((s) => s.proficiency > 0 && s.proficiency < bands.developing)
    .map((s) => s.skill_code);

  return { percentage, strongAreas, weakAreas, onTrack: percentage >= weights.onTrackCutoff };
}

module.exports = { goalProgress };
