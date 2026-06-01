'use strict';

const { z } = require('zod');

const flagParams = z.object({
  learnerId: z.string().uuid('must be a valid UUID'),
});

const flagBody = z.object({
  note: z.string()
    .trim()
    .min(1, 'is required')
    .max(1000, 'must be 1000 characters or fewer'),
});

module.exports = { flagParams, flagBody };
