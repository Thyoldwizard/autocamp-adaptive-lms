'use strict';

/**
 * Student check-in (MCQ quiz) routes.
 * Mounted at /api/student (see routes/student/index.js).
 * Protected by auth + requireRole('student') + ownLearnerOnly.
 *
 * POST /checkin/start/:skillCode
 * POST /checkin/submit/:skillCode  { sessionId: UUID, answers: number[] }
 */

const express        = require('express');
const auth           = require('../../middleware/auth');
const requireRole    = require('../../middleware/requireRole');
const ownLearnerOnly = require('../../middleware/ownLearnerOnly');
const { startCheckin, submitCheckin } = require('../../services/checkin.service');
const { validate }   = require('../../lib/validate');
const { startParams, submitParams, submitBody } = require('../../schemas/checkin.schemas');

const router = express.Router();

router.use(auth, requireRole('student'), ownLearnerOnly);

// POST /checkin/start/:skillCode
router.post(
  '/checkin/start/:skillCode',
  validate({ params: startParams }),
  async (req, res, next) => {
    try {
      const result = await startCheckin(req.learnerId, req.params.skillCode);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /checkin/submit/:skillCode
router.post(
  '/checkin/submit/:skillCode',
  validate({ params: submitParams, body: submitBody }),
  async (req, res, next) => {
    try {
      const result = await submitCheckin(
        req.learnerId,
        req.params.skillCode,
        req.body.sessionId,
        req.body.answers,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
