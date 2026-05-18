# autocamp Adaptive LMS — New Chat Handoff

## Project Snapshot

This workspace has two sibling apps:

- `autocamp/` — Node.js + Express backend using Supabase.
- `autocamp-frontend/` — Next.js 14 frontend using Tailwind, Framer Motion, lucide-react, Inter, and Plus Jakarta Sans.

The product is an adaptive LMS for bootcamps/cohort-based education. It has two user surfaces:

- Student experience: onboarding, dashboard, skills/check-ins, companion.
- Instructor experience: cohort intelligence, heatmaps, at-risk learners.

Design direction now chosen for frontend: **premium editorial education-tech**, inspired by Media Innovatie Campus layout/motion, but using atomcamp’s existing color scheme.

Current palette:

- background: `#F9F7F4`
- primary green: `#2D6A4F`
- accent orange: `#F4A261`
- text: `#1A1A1A`
- muted: `#6B7280`
- danger: `#E07B6A`

Fonts:

- Display: Plus Jakarta Sans
- Body/UI: Inter

## Backend Status

Backend is in good MVP/demo-ready shape.

Important backend fixes already completed:

- `/api/auth/register` now returns `access_token`, matching login behavior.
- Registration writes a `profiles` row for all users.
- Student registration still creates `learners` rows.
- Instructor registration does not create a learner.
- If profile/learner/sign-in fails after auth user creation, registration rolls back by deleting the created Supabase auth user.
- `profiles` and `instructor_cohorts` migrations were applied to live Supabase.
- Seed script now creates a demo instructor user and cohort mappings.
- `GET /api/instructor/at-risk/:learnerId` is now cohort-scoped:
  - loads learner
  - returns `404` if learner missing
  - returns `403` if learner cohort is outside instructor’s allowed cohorts
  - only then returns `{ learnerId, analysis }`
- `autocamp/HANDOFF.md` was updated to reflect backend truth.

Backend verification completed:

- `npm run test:auth` passed.
- `npm run test:routes` passed.
- `npm run test:cohort` passed.
- `npm run test:service` passed.
- `npm run test:all` passed: **262 tests, 0 failures**.
- `npm run seed` passed after applying migrations `010_profiles.sql` and `011_instructor_cohorts.sql`.

Seed output confirmed:

- `profiles`: 4
- `instructor_cohorts`: 3
- `learners`: 4
- `skills`: 12
- `modules`: 22

Demo credentials:

- Instructor: `instructor@atomcamp.test` / `AtomCamp2026!`
- Student Amna: `amna.malik@atomcamp.test` / `AtomCamp2026!`
- Student Bilal: `bilal.ahmed@atomcamp.test` / `AtomCamp2026!`
- Student Sadia: `sadia.hussain@atomcamp.test` / `AtomCamp2026!`

Backend scripts:

```bash
cd autocamp
npm run dev
npm run seed
npm run test:all
```

Backend runs on port `3000`.

## Frontend Status

Frontend app is in `autocamp-frontend/`.

Current frontend pages:

- `/` — public homepage, redesigned into a richer editorial product page.
- `/login` — redesigned split editorial login page with glass cohort signal panel.
- `/register` — redesigned split editorial create-account page with learner-profile controls.
- `/instructor/cohort` — newly built instructor command center for cohort intelligence.
- `/student/onboarding` — redesigned student onboarding flow.
- `/student/dashboard` — redesigned student dashboard.
- `/student/skills` — newly built student skill map.
- `/student/companion` — newly built AI companion chat workspace.
- `/student/checkin/[skillCode]` — newly built dynamic skill check-in flow.

Frontend scripts:

```bash
cd autocamp-frontend
npm run dev
npm run lint
```

Frontend runs on port `3001`.

Current local URLs:

- Homepage: `http://localhost:3001/`
- Login: `http://localhost:3001/login`
- Register: `http://localhost:3001/register`
- Instructor dashboard: `http://localhost:3001/instructor/cohort`
- Student onboarding: `http://localhost:3001/student/onboarding`
- Student dashboard: `http://localhost:3001/student/dashboard`
- Student skills: `http://localhost:3001/student/skills`
- Student companion: `http://localhost:3001/student/companion`
- Student check-in example: `http://localhost:3001/student/checkin/sql`

Frontend env:

```env
NEXT_PUBLIC_API_URL=/api
```

`next.config.mjs` proxies `/api/:path*` to backend `http://localhost:3000/api/:path*`.

If login/dashboard API calls fail with `ECONNREFUSED` or `HTTP 500`, the backend is probably not running on port `3000`.

Frontend verification completed:

- `npm run lint` passes.
- `/` homepage visually checked in browser at narrow/mobile and desktop sizes.
- `/login` visually checked in browser at narrow/mobile and desktop sizes.
- `/register` visually checked in browser at narrow/mobile and desktop sizes.
- New instructor/student app screens were opened in the in-app browser and user said they "look good" on 2026-05-18.
- Latest lint after app-screen/demo-fallback changes passed with no warnings.

Frontend docs now include:

- `autocamp-frontend/README.md` — frontend progress/runbook.
- `autocamp-frontend/DESIGN_LANGUAGE.md` — visual system, layout, glass, typography, and animation guidance.
- `autocamp-frontend/PAGE_MAP.md` — product overview and route-by-route page explanation/review checklist.

Demo fallback note:

- Protected app pages now include frontend demo fallbacks in `autocamp-frontend/src/lib/demoData.js`.
- This was added so every screen can be reviewed directly by URL even if login/API state is not clean.
- Real API calls still run when `atomcamp_token` exists in localStorage.
- Fallbacks are currently used by:
  - `/instructor/cohort`
  - `/student/dashboard`
  - `/student/onboarding`
  - `/student/skills`
  - `/student/companion`
  - `/student/checkin/[skillCode]`

## New Homepage Details

File: `autocamp-frontend/src/app/page.js`

Homepage was changed from root redirect to a public marketing/product homepage.

It includes:

- full-screen image-led editorial hero
- moving ticker strip
- top nav with `Sign in` and `Create account`
- large atomcamp Adaptive LMS headline
- primary CTA to `/register`
- secondary CTA to `/login`
- glass instructor dashboard preview
- stats row with demo cohorts, skills, modules, and signal types
- product explanation section with program chips
- product-depth section with image card and glass signal cards:
  - Learner model
  - Risk sensing
  - Companion memory
  - Instructor focus
- workflow section:
  - Assess
  - Adapt
  - Interpret
  - Intervene
- image showcase section with compact glass overlay
- final CTA

Important behavior change:

- `/` no longer redirects users based on token.
- It is now public.
- Auth redirects still happen from login/register flows.

Design notes:

- The homepage uses remote Unsplash imagery as a temporary placeholder.
- It intentionally borrows the bold editorial/image-led feeling from the inspiration site, not its neon palette.
- It keeps atomcamp green/orange/cream colors.
- It avoids a generic SaaS white-card landing page.
- Glass style is layered and functional: translucent panels, white borders, backdrop blur, and subtle shadows.
- Hero badge text should stay light on green/image backgrounds.
- Avoid oversized glass overlays that hide the underlying image, especially on mobile.

## New Login Page Details

File: `autocamp-frontend/src/app/login/page.js`

Login was redesigned from a centered card to a split-screen editorial layout.

Desktop:

- Left half:
  - large education/team image
  - green/orange overlay
  - moving ticker
  - atomcamp wordmark
  - headline: `Learn with signal.`
  - compact glass cohort signal panel
  - glass metric cards for cohorts, progress, and modules
- Right half:
  - glass form card on cream grid background
  - strong typography
  - staggered Framer Motion entrance
  - CTA link to create account

Mobile:

- Left visual panel hidden.
- Form remains primary on a cream grid background.
- Compact feature chips appear below form.

Login behavior preserved:

- Calls `post('/auth/login', { email, password })`
- Saves `data.access_token`
- Decodes user role from token
- Redirects:
  - instructor → `/instructor/cohort`
  - student → `/student/dashboard`

## New Register Page Details

File: `autocamp-frontend/src/app/register/page.js`

Register was redesigned from the old centered card into the same split editorial system as login.

Desktop:

- Left half:
  - workshop/team image
  - green/orange overlay
  - moving ticker
  - headline: `Build your learning signal.`
  - glass onboarding-captures panel for program, background, and goal
- Right half:
  - glass form card on cream grid background
  - larger editorial heading: `Start adaptive.`
  - two-column name/email row at desktop sizes
  - role selector using lucide icons
  - learner-only background, program, and goal fields

Mobile:

- Left visual panel hidden.
- Form remains primary.
- Compact signal chips appear below the form.

Register behavior preserved:

- Calls `post('/auth/register', payload)`
- Saves `data.access_token` or `data.session.access_token` if present
- Redirects:
  - instructor → `/instructor/cohort`
  - student → `/student/onboarding`

## New App Screen Details

Instructor:

- File: `autocamp-frontend/src/app/instructor/cohort/page.js`
- Demo fallback data: `autocamp-frontend/src/lib/demoData.js`
- Route: `/instructor/cohort`
- Fetches:
  - `GET /api/instructor/cohort`
  - `GET /api/instructor/cohort/at-risk`
  - `GET /api/instructor/cohort/heatmap`
- Supports instructor flagging with `POST /api/instructor/learner/:learnerId/flag`
- Shows:
  - cohort selector
  - total learner count
  - attention queue count
  - average progress
  - learner support queue
  - risk mix
  - weakest skills

Student dashboard:

- File: `autocamp-frontend/src/app/student/dashboard/page.js`
- Demo fallback data: `autocamp-frontend/src/lib/demoData.js`
- Route: `/student/dashboard`
- Fetches `GET /api/student/dashboard`
- Redesigned with hero panel, goal ring, module metrics, up-next card, skill snapshot, and recent activity.

Student onboarding:

- File: `autocamp-frontend/src/app/student/onboarding/page.js`
- Route: `/student/onboarding`
- Fetches `GET /api/student/onboarding/status`
- Completes with `POST /api/student/onboarding/complete`
- Redesigned into a three-step learner-model setup.
- Opens in demo mode without auth token.

Student skills:

- File: `autocamp-frontend/src/app/student/skills/page.js`
- Demo fallback data: `autocamp-frontend/src/lib/demoData.js`
- Route: `/student/skills`
- Fetches `GET /api/student/skills`
- Shows strong, developing, and weak skill bands with check-in CTAs.

Student companion:

- File: `autocamp-frontend/src/app/student/companion/page.js`
- Demo fallback data: `autocamp-frontend/src/lib/demoData.js`
- Route: `/student/companion`
- Uses `GET /api/student/dashboard` for recent activity context.
- Sends messages through `POST /api/student/companion`.

Student check-in:

- File: `autocamp-frontend/src/app/student/checkin/[skillCode]/page.js`
- Demo fallback data: `autocamp-frontend/src/lib/demoData.js`
- Route: `/student/checkin/:skillCode`
- Starts sessions with `POST /api/student/checkin/start/:skillCode`
- Submits answers with `POST /api/student/checkin/submit/:skillCode`
- Shows score, correct answers, updated proficiency, and retake/back actions.

## Important Known Gaps / Next Work

Highest priority frontend work next:

1. Continue visual polish from user review comments.
2. Decide whether demo fallbacks should remain for demo convenience or be gated behind a demo flag before production.
3. Consider adding a logged-in redirect somewhere if desired:
   - Since `/` is now public, existing logged-in users landing on `/` will see the homepage.
   - This is acceptable for a public site, but a “Go to dashboard” CTA could be added later.

Backend deferred work:

- Persistent check-in sessions.
- Richer instructor signal/intervention workflow.
- Request validation library/schema layer.
- OpenAPI docs.
- Configurable rules engine.

## Design Direction For Next Chat

Keep this direction:

- premium
- editorial
- image-led
- confident
- bootcamp/education-tech
- calm motion
- strong typography
- not generic SaaS
- not cartoonish
- not neon
- keep atomcamp palette

Avoid:

- bland centered cards everywhere
- marketing-page gradients without real imagery
- purple/blue SaaS look
- excessive rounded cards inside cards
- explanatory paragraphs that feel like docs inside the UI

Use:

- large full-bleed or section-wide images
- green/cream/orange overlays
- ticker/marquee-like motion in moderation
- Framer Motion staggered reveals
- glass panels with real content, not decorative empty boxes
- lucide-react icons in controls and signal panels
- lucide icons
- clear CTAs
- responsive layouts with no text overlap

## Current Dev Server State

At the time of handoff:

- Frontend dev server was running at `http://localhost:3001`.
- In-app browser was open at `http://localhost:3001/`.
- Backend may or may not be running. Start it separately with:

```bash
cd autocamp
npm run dev
```

Then frontend API proxy calls should work.
