'use strict';

const express  = require('express');
const router   = express.Router();

router.use(require('./dashboard.routes'));
router.use(require('./onboarding.routes'));
router.use(require('./companion.routes'));
router.use(require('./checkin.routes'));

module.exports = router;
