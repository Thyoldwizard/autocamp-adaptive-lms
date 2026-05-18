'use strict';

/**
 * Student check-in (MCQ quiz) routes.
 * Mounted at /api/student (see routes/student/index.js).
 * Protected by auth + requireRole('student') + ownLearnerOnly.
 *
 * POST /checkin/start/:skillCode
 *   → starts a new check-in session, returns 4 MCQ questions (no answers)
 *
 * POST /checkin/submit/:skillCode
 *   { sessionId: string, answers: number[] }
 *   → scores answers, updates proficiency, returns score + signalsCreated
 */

const express        = require('express');
const auth           = require('../../middleware/auth');
const requireRole    = require('../../middleware/requireRole');
const ownLearnerOnly = require('../../middleware/ownLearnerOnly');
const { startCheckin, submitCheckin } = require('../../services/checkin.service');
const { BadRequestError } = require('../../lib/errors');

const router = express.Router();

router.use(auth, requireRole('student'), ownLearnerOnly);

// POST /checkin/start/:skillCode
router.post('/checkin/start/:skillCode', async (req, res, next) => {
  try {
    const { skillCode } = req.params;
    const result = await startCheckin(req.learnerId, skillCode);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /checkin/submit/:skillCode
router.post('/checkin/submit/:skillCode', async (req, res, next) => {
  try {
    const { skillCode } = req.params;
    const { sessionId, answers } = req.body ?? {};

    if (!sessionId || !String(sessionId).trim()) {
      return next(new BadRequestError('sessionId is required in request body'));
    }
    if (!answers || !Array.isArray(answers)) {
      return next(new BadRequestError('answers array is required in request body'));
    }

    const result = await submitCheckin(req.learnerId, skillCode, String(sessionId).trim(), answers);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
