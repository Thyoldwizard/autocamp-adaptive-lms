'use strict';

const { z } = require('zod');

const startParams = z.object({
  skillCode: z.string().trim().min(1, 'is required').max(50, 'too long'),
});

const submitParams = z.object({
  skillCode: z.string().trim().min(1, 'is required').max(50, 'too long'),
});

const submitBody = z.object({
  sessionId: z.string().uuid('must be a valid UUID'),
  answers:   z.array(z.number().int().min(0)).min(1, 'must not be empty'),
});

module.exports = { startParams, submitParams, submitBody };
