'use strict';

/**
 * Student dashboard routes.
 * Mounted at /api/student (see routes/student/index.js).
 * All routes protected by auth + requireRole('student') + ownLearnerOnly.
 *
 * GET  /dashboard              → getDashboard(learnerId)
 * GET  /skills                 → getSkillBreakdown(learnerId)
 * POST /activity/:moduleId     → recordActivity(learnerId, moduleId, body)
 */

const express        = require('express');
const auth           = require('../../middleware/auth');
const requireRole    = require('../../middleware/requireRole');
const ownLearnerOnly = require('../../middleware/ownLearnerOnly');
const { getDashboard, getSkillBreakdown, recordActivity } =
  require('../../services/dashboard.service');
const { validate }       = require('../../lib/validate');
const { activityParams, activityBody } = require('../../schemas/dashboard.schemas');

const router = express.Router();

router.use(auth, requireRole('student'), ownLearnerOnly);

// GET /dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const dashboard = await getDashboard(req.learnerId);
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
});

// GET /skills
router.get('/skills', async (req, res, next) => {
  try {
    const breakdown = await getSkillBreakdown(req.learnerId);
    res.json(breakdown);
  } catch (err) {
    next(err);
  }
});

// POST /activity/:moduleId
router.post(
  '/activity/:moduleId',
  validate({ params: activityParams, body: activityBody }),
  async (req, res, next) => {
    try {
      const result = await recordActivity(req.learnerId, req.params.moduleId, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
