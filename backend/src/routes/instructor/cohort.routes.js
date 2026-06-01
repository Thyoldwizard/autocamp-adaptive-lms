'use strict';

/**
 * Instructor cohort routes.
 * Mounted at /api/instructor (see routes/instructor/index.js).
 * Protected by auth + requireRole('instructor') + cohortScope.
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
const { ForbiddenError } = require('../../lib/errors');
const { validate } = require('../../lib/validate');
const { flagParams, flagBody } = require('../../schemas/instructor.schemas');
const {
  getCohortOverview,
  getAtRiskList,
  getStruggleHeatmap,
  addInstructorFlag,
} = require('../../services/cohort.service');

const router = express.Router();

router.use(auth, requireRole('instructor'), cohortScope);

// GET /cohort
router.get('/cohort', async (req, res, next) => {
  try {
    if (!req.instructorCohorts.length) return res.json({ cohorts: [] });
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
    if (!req.instructorCohorts.length) return res.json({ cohorts: [] });
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
    if (!req.instructorCohorts.length) return res.json({ cohorts: [] });
    const results = await Promise.all(
      req.instructorCohorts.map((c) => getStruggleHeatmap(c)),
    );
    res.json({ cohorts: results });
  } catch (err) {
    next(err);
  }
});

// POST /learner/:learnerId/flag
router.post(
  '/learner/:learnerId/flag',
  validate({ params: flagParams, body: flagBody }),
  async (req, res, next) => {
    try {
      const signal = await addInstructorFlag(
        req.params.learnerId,
        req.user.id,
        req.body.note,
      );
      res.status(201).json({ signal });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
