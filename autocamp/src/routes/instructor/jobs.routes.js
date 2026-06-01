'use strict';

/**
 * Instructor job-trigger routes.
 * Mounted at /api/instructor (see routes/instructor/index.js).
 * Protected by auth + requireRole('instructor').
 *
 * POST /jobs/sweep  → trigger signalSweep immediately (demo / on-demand)
 */

const express     = require('express');
const auth        = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const { runSweep } = require('../../jobs/signalSweep');

const router = express.Router();

router.use(auth, requireRole('instructor'));

// POST /jobs/sweep
router.post('/jobs/sweep', async (req, res, next) => {
  try {
    const result = await runSweep();
    res.json({
      learnersScanned: result.learnersScanned,
      signalsCreated:  result.signalsCreated.length,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
