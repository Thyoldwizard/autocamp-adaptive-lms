# Architecture

## Overview

pace is a monorepo with two applications:

- **`backend/`** — Node.js + Express backend, exposes a REST API consumed by the frontend and any future clients
- **`frontend/`** — Next.js 14 frontend, App Router, server-side rendering is minimal (most pages are `'use client'`)

```
Browser
  └─▶ Next.js (port 3001)
        ├─ /api/* rewritten ─▶ Express (port 3000)
        │                          └─▶ Supabase (PostgreSQL + Auth)
        │                          └─▶ Gemini API (optional)
        └─ demo mode: all API calls short-circuit to demoData.js (no network)
```

---

## Backend

### Layer diagram

```
HTTP request
  └─▶ Express router (src/routes/)
        └─▶ Middleware chain
              ├─ authenticateToken     — verifies Supabase JWT (HS256, local)
              ├─ requireRole           — student | instructor gate
              ├─ cohortScope           — attaches req.instructorCohorts from DB
              └─ validate(schema)      — Zod shape check (POST routes)
        └─▶ Service (src/services/)
              └─▶ Repository (src/db/repositories/)
                    └─▶ Supabase client (service_role — bypasses RLS)
```

### Services

| Service | Responsibility |
|---|---|
| `auth.service` | register, login, logout via Supabase Admin SDK |
| `onboarding.service` | captures background, program, goal; sets initial skill baselines |
| `dashboard.service` | assembles learner, journey, skills, atRisk, goalProgress, recentActivity |
| `skills.service` | reads skill_state rows and buckets into strong / developing / weak |
| `checkin.service` | generates MCQ sessions (DB-persisted), scores submissions, updates proficiency |
| `companion.service` | sends messages to the LLM with context window, persists turns, detects struggle signals |
| `cohort.service` | aggregates overview, at-risk list, and skill heatmap across cohort learners |
| `rules/` | `atRiskScore`, `goalProgress`, `nextBestAction` — pure functions operating on learner state |

### Rules engine

All adaptive thresholds (proficiency bands, risk weights, signal recency windows, companion context limit, check-in TTL) are defined in `src/config/rules.js`. The resolution order is:

```
Built-in defaults
  ↑ overridden by RULES_* env vars
    ↑ overridden by rules_config DB row (live-tunable without deploy)
```

### LLM provider abstraction

```
src/services/llm/
  index.js          — picks provider from LLM_PROVIDER env
  gemini.provider   — Google Gemini 2.5 Flash via REST, 1 retry
  fallback.provider — deterministic rule-based response (always safe)
```

If `GEMINI_API_KEY` is absent or the request fails after one retry, the fallback provider responds automatically.

### Migrations

Applied via `npm run migrate`. All migrations are idempotent.

| Migration | Content |
|---|---|
| 001–011 | Core schema: learners, skills, skill_state, modules, progress, companion_messages, signals, outcomes |
| 012 | `checkin_sessions` — persistent MCQ sessions |
| 013 | `rules_config` — DB-backed rules override row |
| 014 | Additional indexes for heatmap and signal sweep queries |
| 015 | Row-level security on learner-owned tables (service-role bypass enabled) |

---

## Frontend

### Pages

| Route | Purpose |
|---|---|
| `/` | Public editorial homepage with demo entry points |
| `/login` | Split-screen auth — signs in, reads role from JWT, routes to correct shell |
| `/register` | Split-screen auth — captures name, email, password, role, background, program, goal |
| `/student/onboarding` | Three-step learner profile setup (wizard style, posts to onboarding API) |
| `/student/dashboard` | Goal ring, dynamic headline, metrics row, progress sparkline, next-best-action, skill snapshot, activity feed |
| `/student/skills` | BandColumn grid (strong/developing/weak) + AllSkillsChart vertical bar chart |
| `/student/companion` | Full-page chat UI with context-aware starter prompts and animated typing indicator |
| `/student/checkin/[skillCode]` | MCQ check-in; staggered result review after submission |
| `/instructor/cohort` | Learner support queue, risk mix grid, skill proficiency bar chart |
| `/instructor/learner/[id]` | Full learner detail — signals, outcomes, activity |

### Data fetching

All data fetching uses `src/hooks/useFetch.js`, which:
- Accepts a single path string or multiple paths for `Promise.all` fan-out
- Returns `{ data, loading, error, reload }`
- Automatically routes through the demo short-circuit when demo mode is active

The cohort page uses manual `Promise.all` to fan out three requests simultaneously; all others use `useFetch`.

### Demo mode

```
localStorage key: pace_demo = "student" | "instructor" | null

src/lib/demoMode.js   — getDemoRole / setDemoMode / exitDemoMode
src/lib/demoData.js   — static fixtures for every API route
src/lib/api.js        — get() and post() check getDemoRole() first;
                        if active, return the matching demoData entry;
                        no network request is made
```

This means every page renders correctly with no backend, no Supabase, and no Gemini key — essential for keeping the portfolio live when the free-tier Supabase project is paused.

### Design system

Components live in `src/components/ui/`:

| Component | Usage |
|---|---|
| `Card` | Glass content card with `elevated` (heavy shadow) and `flat` variants; both have `hover:shadow-card-hover` |
| `MetricCard` | Icon + label + value used across dashboard and cohort metrics rows |
| `Button` | primary / secondary / ghost variants with loading state |
| `RiskBadge` | Colour-coded `low / medium / high / critical` pill |
| `Modal` | Focus-trapped dialog with Escape-to-close and outside-click dismiss |
| `ProgressBar` | Animated fill bar for proficiency display |

Design tokens live in `src/lib/constants.js` (EASE_OUT, CARD_V, CONTAINER_V, RISK, BAND).

---

## Auth flow

```
Register
  POST /auth/register → Supabase Admin createUser (sets app_metadata.role)
                       → returns access_token
  Frontend saves token to localStorage key pace_token

Login
  POST /auth/login → Supabase Auth signInWithPassword
                   → returns access_token
  Frontend saves token, reads role from decoded JWT,
  routes to /instructor/cohort or /student/dashboard

Every API request
  Authorization: Bearer <token>
  → authenticateToken middleware: supabase.auth.getUser(token)
  → req.user = { id, email, app_metadata: { role } }

401 response
  → Frontend clears token, redirects to /login?reason=session-expired
```

---

## Student flow

```
/register → /student/onboarding → /student/dashboard
                                        │
                        ┌───────────────┼───────────────┐
                        ▼               ▼               ▼
                 /student/skills   /student/companion   /student/checkin/[skill]
```

The dashboard is the hub. "Skill map" and "Open companion" CTAs route outward. Check-in is reachable from any skill card.

---

## Instructor flow

```
/login (role=instructor) → /instructor/cohort
                                   │
                           /instructor/learner/[id]
```

The cohort page fans out three API calls in parallel (overview, at-risk, heatmap). Clicking a learner name routes to their detail page. The flag workflow is an inline modal — no separate route.

---

## Deployment assumptions

- **Backend:** Railway or Render (Node.js service). Set all env vars from `backend/.env.example`. Run `npm run migrate` as a release command.
- **Frontend:** Vercel. Set `NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api`. The `next.config.mjs` rewrite only applies in local dev.
- **Database:** Supabase free tier. Migrations 001–015 must be applied before any API call succeeds. The seed script is optional but creates the demo accounts.
- **Supabase pause:** Free-tier projects pause after 1 week of inactivity. Demo mode keeps the frontend usable regardless.
