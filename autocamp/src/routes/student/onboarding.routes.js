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
const { validate }    = require('../../lib/validate');
const { completeBody } = require('../../schemas/onboarding.schemas');

const router = express.Router();

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
// Body: { answers?: { [skillCode: string]: number (0–1) } }
router.post(
  '/onboarding/complete',
  validate({ body: completeBody }),
  async (req, res, next) => {
    try {
      // answers defaults to {} via schema if omitted
      const model = await completeOnboarding(req.learnerId, req.body.answers);
      res.status(201).json(model);
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
