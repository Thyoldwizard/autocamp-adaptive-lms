# autocamp Adaptive LMS — Project Handoff

## 1. Project

**autocamp Smart Adaptive LMS** is a Node.js + Express backend for atomcamp's AI/data-science bootcamp company. It exposes two role-scoped API surfaces (`/student` and `/instructor`) over a single shared learner model, using deterministic rules for all adaptive logic and Gemini LLM only for the onboarding diagnostic and the AI learning companion.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js v24 |
| Framework | Express 4 |
| Database | PostgreSQL via Supabase (project ref configured in env) |
| DB client | `@supabase/supabase-js` v2 |
| Auth | Supabase Auth (JWT) + async verification via `supabase.auth.getUser()` |
| LLM | Google Gemini 2.5 Flash (free tier), rules-based fallback |
| Env | `dotenv` |
| Test runner | Node.js built-in `node:test` |

---

## 3. Architectural Decisions (all confirmed with the user)

### Auth & access control
**Supabase Auth + Express middleware. No Postgres RLS.**
- Supabase issues JWTs; the backend verifies them locally using `SUPABASE_JWT_SECRET` (HS256, no HTTP round-trip).
- User's app role (`student` / `instructor`) is stored in `app_metadata.role` on the Supabase auth user — this field is admin-only (not user-editable), set via `supabase.auth.admin.createUser({ app_metadata: { role: 'student' } })`.
- Access control is enforced by three Express middleware layers (see §10).
- **Safety net replacing RLS**: every repository function requires an explicit scoping arg (`learnerId` or `cohorts[]`) and throws if called without one. An unscoped query fails loudly rather than leaking data.

### Schema / taxonomy
**Hybrid.** `skills` and `modules` are catalog tables (referenced by UUID). `program` and `cohort` on the `learners` table are free-text strings — not foreign keys. This avoids a catalog join on every learner query while still making the skill/module heatmaps join-friendly.

### Companion conversation state
**Persisted.** A `companion_messages` table stores the full chat history per learner (role enum: `user` | `assistant`). Context is rebuilt from the learner model on each call — the history is for recall and auditing, not the primary grounding mechanism.

### Struggle signals authorship
**Mixed.** The `source` enum has three values:
- `system` — written inline by the rules engine on progress events, or by the `signalSweep` job (inactivity, stalled modules, no progress after enrollment).
- `instructor` — manual flags written via the instructor API; `notes` (free-text) is encouraged.
- `companion` — written when a student explicitly requests help via the companion.

### LLM usage boundary
**LLM is used in three places:** the onboarding diagnostic, the AI learning companion, and the check-in MCQ generator. Everything instructor-facing (at-risk scoring, heatmaps, cohort overview, next-best-action) is rules-only — deterministic and auditable. The check-in system has a rules-based fallback with hardcoded questions per skill code, so it degrades gracefully without the LLM. This conserves the free Gemini quota and keeps instructor dashboards reproducible.

### Migration runner
Uses the **Supabase Management API** (`https://api.supabase.com/v1/projects/{ref}/database/query`) via `fetch`, authenticated with a Personal Access Token (`SUPABASE_ACCESS_TOKEN`). No direct Postgres connection is used — the direct connection resolves to IPv6 only and is not reachable from this machine.

---

## 4. Database Tables

All tables are in the `public` schema of the Supabase project.

### Core entity tables (the shared learner model)

| Table | Description |
|---|---|
| `learners` | One row per enrolled student: name, background_type, program, cohort, enrolled_at, stated_goal. FK to `auth.users`. |
| `skill_state` | Per-learner per-skill proficiency (0–1) and confidence (0–1). Written by the diagnostic LLM; updated by the rules engine. UNIQUE(learner_id, skill_id). |
| `progress` | Per-learner per-module tracking: status, completion_pct, time_spent_minutes, attempts, last_score. UNIQUE(learner_id, module_id). |
| `struggle_signals` | Timestamped events signalling a learner is struggling. signal_type and source are Postgres enums. Nullable `resolved_at`. |
| `outcomes` | Portfolio items, milestones, placement records. Tracks goal_progress_pct (rules-engine estimate). |
| `companion_messages` | Persisted AI companion chat history. role enum (user/assistant). Nullable skill_id and module_id FK for context tagging. |

### Catalog tables

| Table | Description |
|---|---|
| `skills` | Master skill list. code is the machine-readable key (e.g. `sql_joins`). Referenced by skill_state and companion_messages. |
| `modules` | Master module list ordered within a program. skill_ids is a denormalized UUID[] (no FK enforcement — intentional). Referenced by progress and companion_messages. |

### Auth/scoping tables

| Table | Description |
|---|---|
| `profiles` | Mirrors `auth.users`. Holds `role` (student/instructor/admin), email, name. Created by migration `010_profiles.sql` and written during registration/seed. |
| `instructor_cohorts` | Maps an instructor to the cohort strings they can see. PK(instructor_id, cohort). Created by migration `011_instructor_cohorts.sql` and used by `cohortScope.js`. |

> **Note:** Auth middleware still reads role from `app_metadata` in the JWT (no DB lookup needed). `profiles` is the app/admin mirror, and `instructor_cohorts` is the authorization source for instructor cohort-scoped routes.

---

## 5. Enum Types

All three are Postgres native enums in the `public` schema.

| Enum | Values |
|---|---|
| `signal_type` | `missed_deadline`, `low_score`, `repeated_attempts`, `inactivity`, `help_requested`, `instructor_flag` |
| `signal_source` | `system`, `instructor`, `companion` |
| `companion_role` | `user`, `assistant` |

---

## 6. Grants Migration (`009_grants.sql`)

**Why it exists:** Tables created via raw SQL (rather than through the Supabase dashboard) do not automatically receive `GRANT` permissions to Supabase's PostgREST roles. Without this migration, `supabase-js` queries return `permission denied for table <name>` even with the service role key.

**What it does:**
```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;     -- supabase-js server client
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON skills, modules TO anon;
```

**Remember:** Any future migration that creates a new table must either include its own `GRANT` or re-run this file — otherwise the table will be invisible to the supabase-js client.

---

## 7. Seed Personas

Re-seed at any time with `npm run seed`. The script is idempotent: it deletes and recreates all three auth users (cascade clears all child rows) before reinserting.

All three are `role: 'student'` in `app_metadata`. Emails use the `@atomcamp.test` domain. Password for all: `AtomCamp2026!`.

### Demo Instructor — `instructor@atomcamp.test`
- **Password:** `AtomCamp2026!`
- **Role:** `instructor`
- **Authorized cohorts:** `da-2026-spring`, `ai-2026-spring`, `auto-2026-spring`
- **Purpose:** Seeded instructor dashboard/demo account. The seed writes both the `profiles` row and `instructor_cohorts` mappings.

### Amna Malik — `amna.malik@atomcamp.test`
- **Background:** Non-technical career-changer from finance.
- **Program:** `data-analytics-bootcamp` · Cohort: `da-2026-spring`
- **Enrolled:** 2026-05-02 (two weeks in at seed time)
- **Goal:** Get a data analyst job at a bank or fintech company within 6 months.
- **Skill state:** Excel 0.62 (her strength — used it daily at work), SQL 0.20, Python 0.10, Statistics 0.35, Power BI 0.0, ML 0.0.
- **Progress:** Excel Fundamentals completed (score 82); SQL for Data Analysis stalled at 35% (score 48, 2 attempts).
- **Signals:** 1 × `missed_deadline` (source: system) — SQL Joins Practice Set, missed by 3 days.
- **Companion:** 1 exchange — she asked about INNER JOIN vs LEFT JOIN.

### Bilal Ahmed — `bilal.ahmed@atomcamp.test`
- **Background:** STEM graduate (CS background).
- **Program:** `ai-bootcamp` · Cohort: `ai-2026-spring`
- **Enrolled:** 2026-04-04 (six weeks in at seed time)
- **Goal:** Build and deploy production ML models; get hired as an ML engineer.
- **Skill state:** Python 0.85, ML 0.75, Statistics 0.72 (all strong); Deep Learning 0.30, NLP 0.20 (wall hits here); CV/GenAI/LangChain/MLOps all 0.0.
- **Progress:** Python Refresher completed (95); ML Foundations completed (88); Deep Learning in-progress at 40% (score 62, 3 attempts).
- **Signals:** None.
- **Companion:** 1 exchange — loss plateau after epoch 5, Adam lr=0.001.

### Sadia Hussain — `sadia.hussain@atomcamp.test`
- **Background:** Working professional (HR manager).
- **Program:** `automation-with-ai-bootcamp` · Cohort: `auto-2026-spring`
- **Enrolled:** 2026-04-18 (four weeks in at seed time)
- **Goal:** Automate repetitive tasks using AI tools, reduce manual work by 50%.
- **Skill state:** Excel 0.65 (strong from work), Python 0.50, Generative AI 0.30, NLP 0.20, LangChain 0.15.
- **Progress:** Python for Automation completed (78); Excel Automation completed (72); No-Code AI Tools completed (score 55 — below threshold); Prompt Engineering in-progress at 60% (score 52 — below threshold).
- **Signals:** 1 × `low_score` (source: system) on No-Code AI Tools (score 55, threshold 70).
- **Companion:** 1 exchange — prompts giving vague outputs in Prompt Engineering exercises.

---

## 8. Folder Structure

```
autocamp/
├── src/
│   ├── server.js                   # Entry point — loads env, starts Express
│   ├── app.js                      # Express app: middleware, routes, health check, error handler
│   ├── config/
│   │   ├── env.js                  # dotenv + required-var validation; exports all config
│   │   └── supabase.js             # Service-role supabase client (server-only, no session)
│   ├── middleware/
│   │   ├── auth.js                 # ✓ JWT verify → req.user { id, role, email }
│   │   ├── requireRole.js          # ✓ Factory: requireRole('student'|'instructor')
│   │   ├── ownLearnerOnly.js       # ✓ DB lookup → req.learnerId (student guard)
│   │   ├── cohortScope.js          # ✓ loads req.allowedCohorts (instructor guard)
│   │   └── errorHandler.js         # ✓ 4-arg Express error handler
│   ├── routes/
│   │   ├── student/                # requireRole('student') + ownLearnerOnly applied to group
│   │   │   ├── index.js            # Wired router
│   │   │   ├── onboarding.routes.js
│   │   │   ├── dashboard.routes.js
│   │   │   ├── progress.routes.js
│   │   │   ├── skills.routes.js
│   │   │   ├── outcomes.routes.js
│   │   │   ├── companion.routes.js
│   │   │   └── checkin.routes.js   # ✓ POST /checkin/start/:skillCode, /checkin/submit/:skillCode
│   │   └── instructor/             # requireRole('instructor') + cohortScope applied to group
│   │       ├── index.js            # Wired router
│   │       ├── cohort.routes.js
│   │       ├── atRisk.routes.js
│   │       ├── heatmap.routes.js
│   │       └── signals.routes.js
│   ├── controllers/                # Thin HTTP layer
│   │   ├── student/
│   │   └── instructor/
│   ├── services/                   # Business logic, no req/res
│   │   ├── learnerModel.service.js
│   │   ├── onboarding.service.js
│   │   ├── dashboard.service.js
│   │   ├── companion.service.js
│   │   ├── checkin.service.js      # ✓ startCheckin + submitCheckin, in-memory session Map
│   │   ├── cohort.service.js
│   │   ├── rules/
│   │   │   ├── nextBestAction.js
│   │   │   ├── atRiskScore.js
│   │   │   ├── goalProgress.js
│   │   │   └── struggleDetectors.js
│   │   └── llm/
│   │       ├── index.js            # Swappable interface (LLM_PROVIDER env var)
│   │       ├── gemini.provider.js
│   │       ├── fallback.provider.js
│   │       └── prompts/
│   │           └── checkin.prompt.js  # ✓ buildCheckinPrompt, parseCheckinResponse, FALLBACK_QUESTIONS
│   ├── db/
│   │   ├── migrations/             # 001–009 SQL files (all applied)
│   │   ├── seeds/
│   │   │   └── seed.js             # Idempotent seed: 3 personas + catalog data
│   │   ├── migrate.js              # Runner — uses Supabase Management API
│   │   └── repositories/           # Repository layer — DB access wrappers
│   ├── jobs/
│   │   └── signalSweep.js          # ✓ runSweep() — inactivity detection, export-only
│   └── lib/
│       ├── errors.js               # ✓ AppError, BadRequest, Unauthorized, Forbidden, NotFound
│       └── logger.js               # Logger
└── tests/
    ├── middleware/
    │   ├── auth.test.js            # ✓ 6 passing
    │   ├── requireRole.test.js     # ✓ 5 passing
    │   └── ownLearnerOnly.test.js  # ✓ 4 passing
    ├── routes/
    │   ├── auth.test.js
    │   └── routes.test.js
    ├── repositories/
    │   └── repos.integration.test.js
    ├── services/
    │   ├── learnerModel.service.test.js
    │   ├── dashboard.service.test.js
    │   ├── cohort.service.test.js
    │   ├── companion.test.js
    │   └── checkin.test.js         # ✓ 37 passing
    ├── rules/
    │   ├── atRiskScore.test.js
    │   ├── struggleDetectors.test.js
    │   ├── goalProgress.test.js
    │   └── nextBestAction.test.js
    └── jobs/
        └── signalSweep.test.js     # ✓ 10 passing
```

## 9. What Has Been Built and Verified (Complete)
| Item | Status | Notes |
|---|---|---|
| Express scaffold & config | ✓ | JSON middleware, route groups, health check |
| Database migrations & seed | ✓ | All migrations (001-011), grants, seed personas, profiles, and demo instructor cohort mappings applied |
| Auth middleware | ✓ | JWT verify using async `supabase.auth.getUser(token)` |
| Auth routes | ✓ | `/register`, `/login`, `/logout` wired to Supabase Auth; register returns `access_token` |
| Repositories layer | ✓ | Clean DB access wrappers for all entities + `findByCode`, `findByLearnerAndSkillId`, `findAll` |
| Rules engine | ✓ | Deterministic adaptive logic functions |
| Learner model service | ✓ | Assembles complete learner profile |
| Dashboard service | ✓ | Prepares data for student UI |
| Cohort service | ✓ | Prepares intelligence reports for instructors |
| Onboarding service | ✓ | Rules-based diagnostic and placement |
| LLM service layer | ✓ | Interface + live Gemini provider + rules fallback |
| Companion service & route | ✓ | Context-aware chat + struggle detection wired |
| Check-in service & routes | ✓ | MCQ quiz start/submit with in-memory sessions, LLM + fallback |
| Signal sweep job | ✓ | `runSweep()` — inactivity detection, export-only |
| All routes wired | ✓ | Endpoints fully connected, secured, and validated |
| Full E2E Verification | ✓ | Verified against live Supabase before latest backend fixes; run `npm run test:all` after changes. |

---

## 10. Critical Fixes Made During Build

1. **Auth Verification:** The auth middleware was updated to use `supabase.auth.getUser(token)` for JWT verification instead of local `jsonwebtoken` verification. Supabase uses asymmetric ES256 keys in production, not HS256. Any rewrite of `auth.js` must use the async Supabase method.
2. **Gemini Model:** Updated the Gemini model name to `gemini-2.5-flash`. The initial string `gemini-2.5-flash-preview-04-17` returned a 404 error from the Google API.
3. **LLM Provider Config:** `LLM_PROVIDER=gemini` must be set in `.env` to use the live Gemini API. Set to `fallback` for offline development.
4. **Register Returns Token:** `POST /api/auth/register` now signs the new user in and returns `access_token`, matching `/login` so the frontend can continue directly into onboarding or instructor dashboard.
5. **Instructor At-Risk Scope:** `GET /api/instructor/at-risk/:learnerId` now loads the learner and verifies their `cohort` is in `req.instructorCohorts` before returning analysis.

---

## 10b. Check-in Endpoints (Skill MCQ Quizzes)

### POST /api/student/checkin/start/:skillCode
Starts a new check-in session. Fetches the learner's current proficiency for that skill, calls the LLM (with rules fallback) to generate 4 MCQ questions at the right difficulty level and background_type, stores correct answers in an in-memory session map keyed by a UUID `sessionId`, and returns the questions WITHOUT correct answers.

**Response:**
```json
{
  "sessionId": "uuid-here",
  "skillCode": "sql",
  "skillName": "SQL",
  "questions": [
    { "question": "...", "options": ["A", "B", "C", "D"] }
  ]
}
```

### POST /api/student/checkin/submit/:skillCode
Submits answers for a check-in session. Scores against the in-memory answer map, updates `skill_state` proficiency (+0.08 for ≥75%, +0.02 for ≥50%, -0.05 for <50%), calls `recordActivity` with the score, deletes the session, and returns the result.

**Request body:** `{ "sessionId": "uuid", "answers": [0, 1, 2, 3] }`

**Response:**
```json
{
  "score": 100,
  "totalQuestions": 4,
  "correctAnswers": 4,
  "updatedProficiency": 0.38,
  "signalsCreated": []
}
```

### In-memory session approach
Sessions are stored in a `Map<sessionId, sessionData>` in `checkin.service.js`. Sessions expire after 30 minutes. The `sessions` Map is exported for testing. This is intentional — sessions are ephemeral and tied to the running process. If the server restarts, active sessions are lost (students simply start a new check-in).

### LLM usage boundary update
The check-in system adds a **third** LLM use case (alongside onboarding diagnostic and companion). The LLM generates MCQ questions calibrated to proficiency level and background_type. A rules-based fallback with hardcoded questions per skill code is always available. The fallback provider does NOT support check-in generation — it falls through to `FALLBACK_QUESTIONS` in `checkin.prompt.js`.

---

## 10c. Signal Sweep Job

### src/jobs/signalSweep.js — runSweep()
A periodic job (export only, NOT auto-scheduled) that scans all learners for inactivity and writes `inactivity` struggle signals.

**Two rules:**
1. **Stalled module:** Any `in_progress` or `stalled` module whose `updated_at` is older than 7 days → `inactivity` signal with `reason: 'stalled_module'`.
2. **No progress after enrollment:** Learner enrolled more than 3 days ago with NO progress rows that are anything other than `not_started` → `inactivity` signal with `reason: 'no_progress_after_enrollment'`.

**Deduplication:** If an unresolved `inactivity` signal already exists for the learner within the last 7 days, no new signal is written. Resolved signals do NOT block new signals.

**Usage:**
```js
const { runSweep } = require('./src/jobs/signalSweep');
const result = await runSweep();
// { learnersScanned: 3, signalsCreated: [{ learnerId, reason, signal }] }
```

Schedule externally (cron, node-cron, etc.) — the module exports `runSweep()` only.

---

## 11. E2E Test User

An end-to-end test user has been seeded into Supabase Auth and the `learners` table:
- **Email:** `e2e.student@atomcamp.test`
- **Password:** `E2eTest2026!`
- **Program:** `data-analytics-bootcamp`
- **Background:** `non_technical`

**Note:** Do not delete this user; it is required for live E2E testing against the deployed or local backend.

---

## 12. What is Next

**Frontend Development:** 
There are two surfaces to build — the **student app** and the **instructor dashboard**. The tech stack for the frontend has not yet been decided (e.g., React, Next.js). The backend API is fully functional, tested, and ready to consume.

**New student-facing endpoints ready for frontend:**
- `POST /api/student/checkin/start/:skillCode` — start an MCQ quiz
- `POST /api/student/checkin/submit/:skillCode` — submit answers, get score + updated proficiency

**Backend jobs ready for scheduling:**
- `src/jobs/signalSweep.js` — `runSweep()` for inactivity detection (export-only, no auto-schedule)

---

## 13. The Core Concept — One Shared Learner Model

Every part of the system reads from and writes to a single learner model. There is no separate "student app database" and "instructor app database." Both surfaces are views into the same data.

The learner model has five dimensions:

| Dimension | Table | Who writes |
|---|---|---|
| **Who they are** | `learners` (background, goal, cohort) | Onboarding |
| **What they know** | `skill_state` (proficiency, confidence per skill) | Diagnostic LLM, rules engine |
| **What they've done** | `progress` (status, score, time per module) | Student progress events |
| **Where they're struggling** | `struggle_signals` (timestamped events) | Rules engine, instructor, companion |
| **Where they're headed** | `outcomes` (portfolio, milestones, goal %) | Student + rules engine |

**Design principle:** The rules engine is the sole author of adaptive decisions. It reads the learner model and produces: next-best-action, at-risk score, goal progress. The LLM reads the same model (via a rules-built context snapshot) to personalise its language — it does not make structural decisions. This separation means the instructor dashboard is fully deterministic, and the LLM can be swapped or disabled without affecting any adaptive logic.

---

## Quick-start Commands

```bash
npm start              # Start server (requires .env)
npm run dev            # Start with nodemon hot-reload
npm run migrate        # Apply all SQL migrations via Management API
npm run seed           # Seed catalog + 3 personas (idempotent)
```

## Test Scripts

Run `npm run test:all` before pushing any changes.

```bash
npm run test:all       # Run the entire test suite
npm run test:auth      # Run auth middleware tests
npm run test:repos     # Run repository integration tests
npm run test:service   # Run learner model / core service tests
npm run test:dashboard # Run dashboard service tests
npm run test:cohort    # Run cohort/instructor service tests
npm run test:routes    # Run route integration tests
npm run test:companion # Run companion service + route tests
npm run test:checkin   # Run checkin service + route tests (37 tests)
npm run test:sweep     # Run signal sweep job tests (10 tests)
```

## Environment Variables (`.env`)

```
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_JWT_SECRET=<JWT secret>
SUPABASE_ACCESS_TOKEN=<personal access token — migration runner only>
LLM_PROVIDER=gemini
GEMINI_API_KEY=<gemini key>
```
