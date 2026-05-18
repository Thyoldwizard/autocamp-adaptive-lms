'use strict';

/**
 * Instructor at-risk routes.
 * Mounted at /api/instructor (see routes/instructor/index.js).
 * Protected by auth + requireRole('instructor') + cohortScope.
 *
 * GET /learner/:learnerId → getLearnerModel(learnerId)
 * GET /at-risk/:learnerId → refreshAnalysis(learnerId)
 *   Quick per-learner recalculation without loading messages/outcomes.
 *   Instructor must be authorised for the learner's cohort.
 */

const express     = require('express');
const auth        = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const cohortScope = require('../../middleware/cohortScope');
const learnersRepo = require('../../db/repositories/learners.repo');
const { getLearnerModel, refreshAnalysis } = require('../../services/learnerModel.service');
const { ForbiddenError, NotFoundError } = require('../../lib/errors');

const router = express.Router();

// ── Guard: requires instructor role + authorised cohort scope ────────────────
router.use(auth, requireRole('instructor'), cohortScope);

async function loadScopedLearner(req, learnerId) {
  const learner = await learnersRepo.findById(learnerId);

  if (!learner) {
    throw new NotFoundError('Learner not found');
  }

  if (!req.instructorCohorts.includes(learner.cohort)) {
    throw new ForbiddenError('Learner is outside instructor cohort scope');
  }

  return learner;
}

// GET /learner/:learnerId
router.get('/learner/:learnerId', async (req, res, next) => {
  try {
    const { learnerId } = req.params;
    await loadScopedLearner(req, learnerId);

    const model = await getLearnerModel(learnerId);
    res.json({
      learner: model.learner,
      analysis: model.analysis,
      skillState: model.skillState,
      progress: model.progress,
      recentSignals: model.recentSignals,
      outcomes: model.outcomes,
      recentMessages: model.recentMessages,
    });
  } catch (err) {
    next(err);
  }
});

// GET /at-risk/:learnerId
router.get('/at-risk/:learnerId', async (req, res, next) => {
  try {
    const { learnerId } = req.params;
    await loadScopedLearner(req, learnerId);

    const analysis = await refreshAnalysis(learnerId);
    res.json({ learnerId, analysis });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
