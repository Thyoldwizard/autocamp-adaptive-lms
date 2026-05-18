'use strict';

/**
 * Companion (AI chat) route.
 * Mounted at /api/student (see routes/student/index.js).
 * Protected by auth + requireRole('student') + ownLearnerOnly.
 *
 * POST /companion   { message: string } → { response, signalCreated }
 */

const express        = require('express');
const auth           = require('../../middleware/auth');
const requireRole    = require('../../middleware/requireRole');
const ownLearnerOnly = require('../../middleware/ownLearnerOnly');
const { chat }       = require('../../services/companion.service');
const { BadRequestError } = require('../../lib/errors');

const router = express.Router();

router.use(auth, requireRole('student'), ownLearnerOnly);

// POST /companion
router.post('/companion', async (req, res, next) => {
  try {
    const { message } = req.body ?? {};

    if (!message || !String(message).trim()) {
      return next(new BadRequestError('message is required in request body'));
    }

    const result = await chat(req.learnerId, String(message).trim());
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
