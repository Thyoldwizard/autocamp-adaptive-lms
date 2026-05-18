'use strict';

/**
 * Instructor cohort routes.
 * Mounted at /api/instructor (see routes/instructor/index.js).
 * Protected by auth + requireRole('instructor') + cohortScope.
 * cohortScope attaches req.instructorCohorts = ['da-2026-spring', ...]
 *
 * GET  /cohort                       → getCohortOverview for every authorised cohort
 * GET  /cohort/at-risk               → getAtRiskList for every authorised cohort
 * GET  /cohort/heatmap               → getStruggleHeatmap for every authorised cohort
 * POST /learner/:learnerId/flag      → addInstructorFlag(learnerId, instructorId, note)
 */

const express      = require('express');
const auth         = require('../../middleware/auth');
const requireRole  = require('../../middleware/requireRole');
const cohortScope  = require('../../middleware/cohortScope');
const { BadRequestError, ForbiddenError } = require('../../lib/errors');
const {
  getCohortOverview,
  getAtRiskList,
  getStruggleHeatmap,
  addInstructorFlag,
} = require('../../services/cohort.service');

const router = express.Router();

// ── Guard: all cohort routes require instructor role + cohort scope ────────────
router.use(auth, requireRole('instructor'), cohortScope);

// GET /cohort
// Returns overview for all cohorts the instructor has access to.
router.get('/cohort', async (req, res, next) => {
  try {
    if (!req.instructorCohorts.length) {
      return res.json({ cohorts: [] });
    }
    const overviews = await Promise.all(
      req.instructorCohorts.map((c) => getCohortOverview(c)),
    );
    res.json({ cohorts: overviews });
  } catch (err) {
    next(err);
  }
});

// GET /cohort/at-risk
router.get('/cohort/at-risk', async (req, res, next) => {
  try {
    if (!req.instructorCohorts.length) {
      return res.json({ cohorts: [] });
    }
    const results = await Promise.all(
      req.instructorCohorts.map((c) => getAtRiskList(c)),
    );
    res.json({ cohorts: results });
  } catch (err) {
    next(err);
  }
});

// GET /cohort/heatmap
router.get('/cohort/heatmap', async (req, res, next) => {
  try {
    if (!req.instructorCohorts.length) {
      return res.json({ cohorts: [] });
    }
    const results = await Promise.all(
      req.instructorCohorts.map((c) => getStruggleHeatmap(c)),
    );
    res.json({ cohorts: results });
  } catch (err) {
    next(err);
  }
});

// POST /learner/:learnerId/flag
router.post('/learner/:learnerId/flag', async (req, res, next) => {
  try {
    const { learnerId } = req.params;
    const { note }      = req.body ?? {};

    if (!note || !note.trim()) {
      return next(new BadRequestError('note is required in request body'));
    }

    const signal = await addInstructorFlag(learnerId, req.user.id, note.trim());
    res.status(201).json({ signal });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
