'use strict';

const { z } = require('zod');

const BACKGROUND_TYPES = ['non_technical', 'stem_grad', 'working_professional'];

const register = z.object({
  email:           z.string().email('must be a valid email address'),
  password:        z.string().min(8, 'must be at least 8 characters'),
  role:            z.enum(['student', 'instructor'], { error: "must be 'student' or 'instructor'" }),
  name:            z.string().trim().min(1, 'is required').max(100, 'must be 100 characters or fewer'),
  background_type: z.enum(BACKGROUND_TYPES).optional(),
  program:         z.string().trim().min(1).max(100).optional(),
  cohort:          z.string().trim().min(1).max(100).optional(),
  goal:            z.string().trim().max(500).optional(),
}).refine(
  (d) => d.role !== 'student' || (d.background_type && d.program && d.cohort),
  { message: 'background_type, program, and cohort are required for students', path: ['background_type'] },
);

const login = z.object({
  email:    z.string().email('must be a valid email address'),
  password: z.string().min(1, 'is required'),
});

module.exports = { register, login };
