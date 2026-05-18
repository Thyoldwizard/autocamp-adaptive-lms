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

const express  = require('express');
const auth     = require('../../middleware/auth');
const requireRole  = require('../../middleware/requireRole');
const ownLearnerOnly = require('../../middleware/ownLearnerOnly');
const { getDashboard, getSkillBreakdown, recordActivity } =
  require('../../services/dashboard.service');
const { BadRequestError } = require('../../lib/errors');

const router = express.Router();

// ── Guard: all routes below require a valid student JWT + learner record ──────
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
router.post('/activity/:moduleId', async (req, res, next) => {
  try {
    const { moduleId } = req.params;
    const { attempts, score, timeSpentMinutes, expectedTimeMinutes, completionPct } = req.body;

    if (attempts === undefined || attempts === null) {
      return next(new BadRequestError('attempts is required in request body'));
    }

    const result = await recordActivity(req.learnerId, moduleId, {
      attempts,
      score,
      timeSpentMinutes,
      expectedTimeMinutes,
      completionPct,
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
