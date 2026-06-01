# Contributing

Contributions are welcome. This document covers setup, workflow, and the decisions that keep the project coherent.

---

## Before you start

Read the [`README.md`](README.md) and [`docs/architecture.md`](docs/architecture.md). Understanding the rules engine and demo mode will save you time.

If you are planning something larger than a bug fix or a small UI change, open a GitHub issue first and describe what you want to build and why. This prevents duplicate work and keeps the codebase focused.

---

## Setup

### Prerequisites
- Node.js 20+
- A Supabase project (free tier is fine — create one at supabase.com)
- Git

### Steps

```bash
# 1. Fork and clone
git clone https://github.com/your-username/autocamp-adaptive-lms.git
cd autocamp-adaptive-lms

# 2. Backend
cd autocamp
cp .env.example .env
# Edit .env: fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
npm install
npm run migrate
npm run seed
npm run dev      # http://localhost:3000

# 3. Frontend (new terminal)
cd autocamp-frontend
cp .env.example .env.local
# .env.local: NEXT_PUBLIC_API_URL=/api  (uses the built-in Next.js rewrite)
npm install
npm run dev      # http://localhost:3001
```

### Without a Supabase project

Use demo mode. Click "Explore as student" or "Explore as instructor" on the landing page. Every screen works without a backend. You can contribute to UI, accessibility, charts, and documentation without a database.

### Running tests

```bash
cd autocamp
npm run test:all   # 420 tests — must stay green
```

---

## Workflow

1. Create a branch from `main` using the naming convention below.
2. Make focused commits. One logical change per commit.
3. Run `npm run lint` (frontend) and `npm run test:all` (backend) before opening a PR.
4. Open a pull request against `main` with a clear title and description.

---

## Branch naming

```
feat/short-description       # new capability
fix/short-description        # bug fix
docs/short-description       # documentation only
a11y/short-description       # accessibility
chore/short-description      # tooling, deps, CI changes
```

Examples:
```
feat/dark-mode
fix/checkin-session-expiry
docs/deployment-guide
a11y/mobile-nav-focus
```

---

## Commit style

No enforced convention, but aim for clear imperative-mood subject lines:

```
Add prefers-reduced-motion guard to sidebar animation
Fix skill proficiency not updating after check-in retake
Update architecture.md with deployment section
```

Avoid: `WIP`, `fix stuff`, `update`, or commit messages that describe what the diff shows rather than why it was made.

---

## Code style

- **Backend:** no formatter enforced — match the surrounding code's style. Prefer named functions over anonymous arrow functions for services.
- **Frontend:** ESLint runs via `npm run lint`. Keep it clean. No `console.log` left in submitted code.
- **Comments:** write a comment only when the *why* is non-obvious. Avoid describing what the code already shows.
- **No over-engineering:** don't add abstractions for hypothetical future requirements. Three similar lines are better than a premature helper.

---

## Issue types

Use these labels when opening issues:

| Label | Use for |
|---|---|
| `bug` | Something broken — include steps to reproduce |
| `enhancement` | Improvement to an existing feature |
| `feature` | New capability — open a discussion first |
| `docs` | Missing or incorrect documentation |
| `good first issue` | Suitable for first-time contributors |
| `a11y` | Accessibility |
| `question` | Not sure if something is a bug or expected behaviour |

---

## PR checklist

Before requesting review:

- [ ] `npm run lint` passes (frontend)
- [ ] `npm run test:all` passes (backend — must stay at or above 420)
- [ ] No secrets, tokens, or real credentials in any file
- [ ] New backend logic has at least one test
- [ ] If you changed a UI component, checked it in demo mode
- [ ] PR description explains *what* changed and *why*

---

## What not to change

- **Migration files** — never edit a committed migration. Add a new one.
- **`src/config/rules.js` defaults** — don't change defaults without updating tests and the architecture doc. Changes here affect live behaviour for every deployment.
- **Demo data** (`src/lib/demoData.js`) — changes here affect what contributors and portfolio visitors see. Keep the data realistic and complete.

---

## Questions?

Open a GitHub Discussion. We respond to all sincere questions.
