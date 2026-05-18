const express = require('express');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const authRouter = require('./routes/auth.routes');
const studentRouter = require('./routes/student');
const instructorRouter = require('./routes/instructor');

const app = express();

app.use(express.json());

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
