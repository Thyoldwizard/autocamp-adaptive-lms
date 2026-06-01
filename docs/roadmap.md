# Roadmap

This roadmap reflects real priorities, not a feature-farm wishlist. Items marked ✅ are shipped. Everything else is genuinely planned or under consideration.

---

## Shipped (v0.1)

- ✅ Full backend API — auth, onboarding, dashboard, skills, check-in, companion, instructor cohort, learner detail, signal sweep
- ✅ Persistent check-in sessions (DB-backed, restart-safe)
- ✅ Configurable rules engine with env + DB overrides
- ✅ Zod validation on all POST routes, Helmet, rate limiting, structured logging
- ✅ Row-level security on Supabase (service-role bypass for backend)
- ✅ 420 backend tests, zero failures
- ✅ Full frontend — all student and instructor screens
- ✅ Demo mode: every page works with no backend or login
- ✅ Collapsible sidebar rail (Framer Motion, localStorage)
- ✅ recharts: dashboard sparkline, skills bars, instructor cohort chart
- ✅ Accessible: global `:focus-visible` ring, `aria-hidden` on decorative elements, focus-trapped modals
- ✅ SEO: title template, OpenGraph, Twitter card, theme-color
- ✅ Auth form: password show/hide toggle, "Forgot password?" stub

---

## Near-term (v0.2)

These are small, well-scoped changes anyone can pick up.

- [ ] **Mobile layout audit** — sidebar collapses correctly but pages need a full small-screen pass (forms, skill cards, instructor table)
- [ ] **Playwright E2E tests** — student registration → onboarding → dashboard → check-in flow; instructor flag workflow
- [ ] **Deployment docs** — step-by-step guide for Vercel + Railway + Supabase wiring including migration run command
- [ ] **prefers-reduced-motion** — gate all Framer Motion animations behind the media query
- [ ] **"Forgot password?" flow** — hook the stub link to Supabase `resetPasswordForEmail`
- [ ] **Check-in retake cooldown** — prevent immediate retakes to avoid proficiency gaming (configurable via rules config)
- [ ] **Cohort selector memory** — persist the last selected cohort in `localStorage` rather than resetting on reload

---

## Medium-term (v0.3)

- [ ] **Dark mode** — system-preference aware, toggle in sidebar; design tokens already structured to support it
- [ ] **Localisation** — extract all hardcoded strings into a thin i18n layer; target Urdu (primary market) first
- [ ] **Instructor notifications** — in-app alert when a learner transitions to `high` or `critical` risk
- [ ] **Cohort-level analytics** — week-over-week progress trend, module velocity chart, signal type breakdown
- [ ] **Progress export** — PDF or CSV of a learner's complete history for portfolio / employer use
- [ ] **OpenAI / Claude provider** — add providers to the LLM abstraction layer (`src/services/llm/`)

---

## Long-term (v1.0)

- [ ] **Prerequisite curriculum graph** — model skill dependencies so the next-best-action can navigate around blockers
- [ ] **Peer signals** — study group detection from companion patterns; surface to instructors
- [ ] **Adaptive check-in difficulty** — use prior proficiency to select harder/easier questions rather than a flat random set
- [ ] **Instructor messaging** — direct note-to-learner from the flag workflow
- [ ] **Multi-tenant isolation** — proper cohort ownership so different bootcamp operators can run on the same instance
- [ ] **Audit trail** — resolution workflow for flagged learners; log who acted and when
- [ ] **Native mobile app** — the learner model and companion are a natural fit for a React Native client

---

## Out of scope (not planned)

- Video hosting or course content management — use a dedicated LMS for that; this system wraps it
- Real-time collaborative features (websockets, live cursors)
- Payment / billing / enrolment — handled upstream by the bootcamp operator
- Peer assessment or group grading

---

If you want to work on something not listed here, open a discussion issue first. The best contributions solve real problems rather than adding surface area for its own sake.
