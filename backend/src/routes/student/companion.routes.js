'use strict';

/**
 * Companion (AI chat) route.
 * Mounted at /api/student (see routes/student/index.js).
 * Protected by auth + requireRole('student') + ownLearnerOnly.
 *
 * POST /companion  { message: string (max 2000 chars) }
 */

const express        = require('express');
const auth           = require('../../middleware/auth');
const requireRole    = require('../../middleware/requireRole');
const ownLearnerOnly = require('../../middleware/ownLearnerOnly');
const { chat }       = require('../../services/companion.service');
const { validate }   = require('../../lib/validate');
const { messageBody } = require('../../schemas/companion.schemas');

const router = express.Router();

router.use(auth, requireRole('student'), ownLearnerOnly);

// POST /companion
router.post(
  '/companion',
  validate({ body: messageBody }),
  async (req, res, next) => {
    try {
      // req.body.message is trimmed by the schema
      const result = await chat(req.learnerId, req.body.message);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
