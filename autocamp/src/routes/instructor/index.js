'use strict';

const express = require('express');
const router  = express.Router();

router.use(require('./cohort.routes'));
router.use(require('./atRisk.routes'));

module.exports = router;
