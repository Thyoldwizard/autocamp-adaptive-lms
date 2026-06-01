'use strict';

const { z } = require('zod');

const messageBody = z.object({
  message: z.string()
    .trim()
    .min(1, 'is required')
    .max(2000, 'must be 2000 characters or fewer'),
});

module.exports = { messageBody };
