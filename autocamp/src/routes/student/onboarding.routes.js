'use strict';

/**
 * Student onboarding routes.
 * Mounted at /api/student (see routes/student/index.js).
 * Protected by auth + requireRole('student') + ownLearnerOnly.
 *
 * GET  /onboarding/status   → { completed, learnerId }
 * POST /onboarding/complete → runs placement, returns full learner model
 */

const express        = require('express');
const auth           = require('../../middleware/auth');
const requireRole    = require('../../middleware/requireRole');
const ownLearnerOnly = require('../../middleware/ownLearnerOnly');
const { getOnboardingStatus, completeOnboarding } =
  require('../../services/onboarding.service');

const router = express.Router();

// ── Guard: all routes below require a valid student JWT + learner record ──────
router.use(auth, requireRole('student'), ownLearnerOnly);

// GET /onboarding/status
router.get('/onboarding/status', async (req, res, next) => {
  try {
    const status = await getOnboardingStatus(req.learnerId);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// POST /onboarding/complete
router.post('/onboarding/complete', async (req, res, next) => {
  try {
    // answers is an optional map of { skillCode: proficiency }
    const answers = req.body?.answers ?? {};
    const model   = await completeOnboarding(req.learnerId, answers);
    res.status(201).json(model);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
