'use strict';

const STRONG_THRESHOLD = 0.7; // proficiency >= this → strong area
const WEAK_THRESHOLD   = 0.4; // 0 < proficiency < this → weak area

/**
 * Estimates how far a learner is toward their goal.
 *
 * percentage is a weighted composite:
 *   60% module completion rate  (objective curriculum progress)
 *   40% average skill proficiency  (knowledge depth)
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
  const skillScore = skillState.length > 0
    ? (skillState.reduce((sum, s) => sum + s.proficiency, 0) / skillState.length) * 100
    : 0;

  const completedCount = progress.filter((p) => p.status === 'completed').length;
  const moduleScore    = progress.length > 0
    ? (completedCount / progress.length) * 100
    : 0;

  const percentage = Math.min(100, Math.round(moduleScore * 0.6 + skillScore * 0.4));

  const strongAreas = skillState
    .filter((s) => s.proficiency >= STRONG_THRESHOLD)
    .map((s) => s.skill_code);

  const weakAreas = skillState
    .filter((s) => s.proficiency > 0 && s.proficiency < WEAK_THRESHOLD)
    .map((s) => s.skill_code);

  return { percentage, strongAreas, weakAreas, onTrack: percentage >= 50 };
}

module.exports = { goalProgress };
