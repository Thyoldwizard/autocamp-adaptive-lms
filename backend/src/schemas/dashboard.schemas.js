'use strict';

const { z } = require('zod');

const activityParams = z.object({
  moduleId: z.string().uuid('must be a valid UUID'),
});

const activityBody = z.object({
  attempts:            z.number().int().min(0, 'must be >= 0'),
  score:               z.number().min(0).max(100).optional(),
  timeSpentMinutes:    z.number().min(0).optional(),
  expectedTimeMinutes: z.number().min(0).optional(),
  completionPct:       z.number().min(0).max(100).optional(),
});

module.exports = { activityParams, activityBody };
