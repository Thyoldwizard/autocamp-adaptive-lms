'use strict';

/**
 * cohort.service.js
 *
 * Powers the instructor-facing intelligence dashboard.  Reads across all
 * learners in a cohort and aggregates their individual models into
 * cohort-level views.
 *
 * Design principles:
 *   - Per-learner refreshAnalysis calls run in Promise.all (parallel).
 *   - No req/res — pure business logic.
 *   - Rules engine is the sole author of risk scores (no custom scoring here).
 */

const learnersRepo   = require('../db/repositories/learners.repo');
const skillStateRepo = require('../db/repositories/skillState.repo');
const signalsRepo    = require('../db/repositories/signals.repo');
const { refreshAnalysis } = require('./learnerModel.service');

// ─── Severity levels considered "at risk" enough to surface to instructors ────
const AT_RISK_LEVELS = new Set(['medium', 'high', 'critical']);
const ACTION_LEVELS  = new Set(['high', 'critical']);

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Map an atRisk level to a numeric score for sort ordering.
 * Critical → highest, low → 0.
 */
const LEVEL_ORDER = { critical: 3, high: 2, medium: 1, low: 0 };

function levelRank(level) {
  return LEVEL_ORDER[level] ?? 0;
}

/**
 * For a list of learners, run refreshAnalysis on each in parallel and
 * zip the results into enriched learner summary objects.
 *
 * @param {object[]} learners - rows from learnersRepo.findByCohort
 * @returns {Promise<object[]>} enriched summaries sorted by atRisk score desc
 */
async function buildLearnerSummaries(learners) {
  if (!learners.length) return [];

  // Run all analyses in parallel — one Promise.all for the entire cohort
  const analyses = await Promise.all(
    learners.map((l) => refreshAnalysis(l.id)),
  );

  const summaries = learners.map((learner, i) => ({
    learnerId:      learner.id,
    name:           learner.name,
    atRisk:         analyses[i].atRisk,
    goalProgress:   analyses[i].goalProgress,
    nextBestAction: analyses[i].nextBestAction,
  }));

  // Sort: highest atRisk score first; break ties by level rank
  summaries.sort((a, b) => {
    const scoreDiff = b.atRisk.score - a.atRisk.score;
    if (scoreDiff !== 0) return scoreDiff;
    return levelRank(b.atRisk.level) - levelRank(a.atRisk.level);
  });

  return summaries;
}

/**
 * Compute cohort-level aggregate counts from a summaries array.
 */
function buildAtRiskCounts(summaries) {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const s of summaries) {
    const level = s.atRisk.level;
    if (level in counts) counts[level]++;
  }
  return counts;
}

/**
 * Compute the average goalProgress.percentage across all learners.
 */
function averageGoalProgress(summaries) {
  if (!summaries.length) return 0;
  const total = summaries.reduce((sum, s) => sum + s.goalProgress.percentage, 0);
  return Math.round(total / summaries.length);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Full cohort overview — all learners, sorted by at-risk score descending.
 *
 * @param {string} cohort - cohort string, e.g. 'da-2026-spring'
 * @returns {Promise<{
 *   cohort:              string,
 *   totalLearners:       number,
 *   atRiskCounts:        { low, medium, high, critical },
 *   averageGoalProgress: number,
 *   learners:            object[],
 * }>}
 */
async function getCohortOverview(cohort) {
  if (!cohort) throw new Error('getCohortOverview: cohort is required');

  const learners  = await learnersRepo.findByCohort(cohort);
  const summaries = await buildLearnerSummaries(learners);

  return {
    cohort,
    totalLearners:       summaries.length,
    atRiskCounts:        buildAtRiskCounts(summaries),
    averageGoalProgress: averageGoalProgress(summaries),
    learners:            summaries,
  };
}

/**
 * At-risk filter — only learners with level medium, high, or critical.
 * Also surfaces a requiresAction flag when any learner is high or critical.
 *
 * @param {string} cohort
 * @returns {Promise<{
 *   cohort:         string,
 *   totalLearners:  number,
 *   requiresAction: boolean,
 *   atRiskCounts:   { low, medium, high, critical },
 *   learners:       object[],
 * }>}
 */
async function getAtRiskList(cohort) {
  if (!cohort) throw new Error('getAtRiskList: cohort is required');

  const learners  = await learnersRepo.findByCohort(cohort);
  const summaries = await buildLearnerSummaries(learners);

  const flagged = summaries.filter((s) => AT_RISK_LEVELS.has(s.atRisk.level));
  const requiresAction = flagged.some((s) => ACTION_LEVELS.has(s.atRisk.level));

  return {
    cohort,
    totalLearners:  flagged.length,
    requiresAction,
    atRiskCounts:   buildAtRiskCounts(flagged),
    learners:       flagged,
  };
}

/**
 * Struggle heatmap — aggregate skill proficiency across all cohort learners.
 *
 * For each skill that appears in at least one learner's skill_state:
 *   - averageProficiency: mean proficiency across all learners who have that skill
 *   - learnersStruggling: count of learners with proficiency < 0.4
 *   - learnersStrong:     count of learners with proficiency >= 0.7
 *
 * Sorted by averageProficiency ascending — weakest cohort skills first.
 *
 * @param {string} cohort
 * @returns {Promise<{
 *   cohort: string,
 *   skills: Array<{
 *     skillId:             string,
 *     skillCode:           string,
 *     skillName:           string,
 *     averageProficiency:  number,
 *     learnersStruggling:  number,
 *     learnersStrong:      number,
 *   }>,
 * }>}
 */
async function getStruggleHeatmap(cohort) {
  if (!cohort) throw new Error('getStruggleHeatmap: cohort is required');

  const learners = await learnersRepo.findByCohort(cohort);
  if (!learners.length) return { cohort, skills: [] };

  // Fetch all skill_state rows for every cohort learner in parallel
  const allSkillStates = await Promise.all(
    learners.map((l) => skillStateRepo.findByLearnerId(l.id)),
  );

  // Aggregate into a map keyed by skill_id
  // { [skill_id]: { skillId, skillCode, skillName, proficiencies[] } }
  const skillMap = new Map();

  for (const learnerSkills of allSkillStates) {
    for (const row of learnerSkills) {
      const sid = row.skill_id;
      if (!skillMap.has(sid)) {
        skillMap.set(sid, {
          skillId:       sid,
          skillCode:     row.skill?.code ?? '',
          skillName:     row.skill?.name ?? '',
          proficiencies: [],
        });
      }
      skillMap.get(sid).proficiencies.push(Number(row.proficiency));
    }
  }

  // Compute aggregates
  const skills = Array.from(skillMap.values()).map(
    ({ skillId, skillCode, skillName, proficiencies }) => {
      const avg = proficiencies.reduce((s, p) => s + p, 0) / proficiencies.length;
      return {
        skillId,
        skillCode,
        skillName,
        averageProficiency: Math.round(avg * 1000) / 1000, // 3 decimal places
        learnersStruggling: proficiencies.filter((p) => p < 0.4).length,
        learnersStrong:     proficiencies.filter((p) => p >= 0.7).length,
      };
    },
  );

  // Sort: weakest skill first (ascending averageProficiency)
  skills.sort((a, b) => a.averageProficiency - b.averageProficiency);

  return { cohort, skills };
}

/**
 * Write a manual instructor_flag signal for a learner.
 *
 * @param {string} learnerId    - learners.id UUID
 * @param {string} instructorId - the instructor's auth user UUID (for audit)
 * @param {string} note         - free-text note (required)
 * @returns {Promise<object>} the created struggle_signal row
 */
async function addInstructorFlag(learnerId, instructorId, note) {
  if (!learnerId)    throw new Error('addInstructorFlag: learnerId is required');
  if (!instructorId) throw new Error('addInstructorFlag: instructorId is required');
  if (!note)         throw new Error('addInstructorFlag: note is required');

  return signalsRepo.insert({
    learner_id:  learnerId,
    signal_type: 'instructor_flag',
    severity:    'medium',
    source:      'instructor',
    notes:       note,
    context: {
      flagged_by: instructorId,
      flagged_at: new Date().toISOString(),
    },
  });
}

module.exports = { getCohortOverview, getAtRiskList, getStruggleHeatmap, addInstructorFlag };
