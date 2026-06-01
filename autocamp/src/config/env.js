const dotenv = require('dotenv');

dotenv.config();

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'fallback',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  ENABLE_SIGNAL_SWEEP: process.env.ENABLE_SIGNAL_SWEEP === 'true',
  SIGNAL_SWEEP_INTERVAL_MS: parseInt(process.env.SIGNAL_SWEEP_INTERVAL_MS, 10) || 60 * 60 * 1000,
};
