'use strict';

const express = require('express');
const router  = express.Router();

router.use(require('./cohort.routes'));
router.use(require('./atRisk.routes'));
router.use(require('./jobs.routes'));

module.exports = router;
