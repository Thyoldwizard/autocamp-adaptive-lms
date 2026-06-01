# autocamp — Backend

Express 4 + Supabase backend for the atomcamp Adaptive LMS.

See the [root README](../README.md) for full project context, setup instructions, and API overview.

## Quick start

```bash
cp .env.example .env   # fill in Supabase credentials
npm install
npm run migrate        # applies migrations 001–015
npm run seed           # creates demo accounts
npm run dev            # http://localhost:3000
```

## Commands

```bash
npm run dev         # development server (nodemon)
npm run start       # production server
npm run migrate     # run all pending SQL migrations
npm run seed        # seed demo data
npm run test:all    # run all 420 tests
npm run test        # run unit tests only
```

## Environment

Copy `.env.example` to `.env` and fill in the required values. See the file for full documentation of every variable.

Required:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

Optional:
- `GEMINI_API_KEY` + `LLM_PROVIDER=gemini` — enables real AI companion responses; falls back to deterministic if absent
- `ENABLE_SIGNAL_SWEEP=true` — runs the background inactivity sweep

## Structure

```
src/
├── routes/
│   ├── auth.routes.js
│   ├── student/       # dashboard, skills, checkin, companion, onboarding, outcomes, progress
│   └── instructor/    # cohort, atRisk, heatmap, learner, signals, jobs
├── services/          # business logic, rules engine, LLM abstraction
├── db/
│   ├── repositories/  # Supabase data access layer
│   └── seeds/
├── config/            # env.js, rules.js, supabase.js
├── middleware/        # authenticateToken, requireRole, cohortScope, validate, errorHandler
├── jobs/              # signalSweep.js
└── lib/               # logger.js
migrations/            # 001–015 SQL files
```
