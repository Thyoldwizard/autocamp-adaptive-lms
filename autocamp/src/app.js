'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const authRouter = require('./routes/auth.routes');
const studentRouter = require('./routes/student');
const instructorRouter = require('./routes/instructor');

const app = express();

// Security headers
app.use(helmet());

// CORS — allow origin from env, default to localhost:3001
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3001';
app.use(cors({ origin: corsOrigin }));

// Body parsing — hard cap at 100 kb
app.use(express.json({ limit: '100kb' }));

// Request ID + access log
app.use(requestLogger);

// Global rate limit: 100 req / 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Strict limiter for auth endpoints: 20 req / 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// Strict limiter for companion (LLM) endpoint: 30 req / 15 min
const companionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/student/companion', companionLimiter);

// Health check (before auth — no JWT needed)
app.get('/api/health', async (_req, res, next) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY },
      signal: AbortSignal.timeout(5000),
    });

    res.json({
      status: 'ok',
      supabase: response.ok ? 'reachable' : 'unreachable',
    });
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', authRouter);
app.use('/api/student', studentRouter);
app.use('/api/instructor', instructorRouter);

app.use(errorHandler);

module.exports = app;
