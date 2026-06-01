'use strict';

const { z } = require('zod');

const completeBody = z.object({
  answers: z.record(z.string(), z.number().min(0).max(1)).optional().default({}),
});

module.exports = { completeBody };
