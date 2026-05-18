# autocamp Frontend

Next.js 14 frontend for the autocamp Adaptive LMS demo.

## Stack

- Next.js App Router
- Tailwind CSS
- Framer Motion
- lucide-react
- Recharts
- Inter for body/UI
- Plus Jakarta Sans for display

## Run

```bash
npm run dev
npm run lint
```

The frontend runs on `http://localhost:3001`.

The backend is expected on `http://localhost:3000`. `next.config.mjs` proxies frontend `/api/:path*` requests to `http://localhost:3000/api/:path*`, so local frontend env should use:

```env
NEXT_PUBLIC_API_URL=/api
```

If login, registration, dashboard, or instructor calls fail with `ECONNREFUSED` or `HTTP 500`, start the backend from `../autocamp`:

```bash
cd ../autocamp
npm run dev
```

## Current Pages

- `/` — public editorial homepage.
- `/login` — split editorial login page.
- `/register` — split editorial create-account page.
- `/instructor/cohort` — instructor command center.
- `/student/onboarding` — student onboarding flow.
- `/student/dashboard` — student dashboard.
- `/student/skills` — skill map.
- `/student/companion` — companion chat workspace.
- `/student/checkin/[skillCode]` — dynamic skill check-in.

## Current Auth Behavior

Login:

- Calls `post('/auth/login', { email, password })`.
- Saves `data.access_token`.
- Reads role from JWT metadata.
- Redirects instructors to `/instructor/cohort`.
- Redirects students to `/student/dashboard`.

Register:

- Calls `post('/auth/register', payload)`.
- Saves `data.access_token` or `data.session.access_token`.
- Redirects instructors to `/instructor/cohort`.
- Redirects students to `/student/onboarding`.

## Recent Frontend Progress

Homepage was upgraded into a richer product page:

- full-screen image-led editorial hero
- moving ticker strip
- glass instructor dashboard preview
- stats row for cohorts, skills, modules, signal types
- product intro with program chips
- product-depth section with signal cards
- four-step workflow: Assess, Adapt, Interpret, Intervene
- image showcase with compact glass overlay
- final CTA

Login was upgraded:

- split-screen desktop layout
- green/orange image overlay
- ticker motion
- `Learn with signal.` editorial headline
- glass cohort signal panel
- glass form card on a cream grid background
- compact mobile feature chips

Register was upgraded:

- split-screen desktop layout
- green/orange image overlay
- ticker motion
- `Build your learning signal.` editorial headline
- glass onboarding-captures panel
- glass form card
- improved role, background, and program controls
- compact mobile feature chips

App screens were added/refreshed:

- `/instructor/cohort` uses instructor cohort, at-risk, and heatmap APIs.
- `/student/dashboard` uses the dashboard API and links into skills and companion.
- `/student/onboarding` is now a three-step learner-model setup.
- `/student/skills` shows strong, developing, and weak skill bands.
- `/student/companion` sends messages through the companion API.
- `/student/checkin/[skillCode]` starts and submits skill MCQ sessions.
- `src/lib/demoData.js` provides demo fallbacks so protected pages can be opened directly for visual review when no auth token exists.

Verification completed:

- `npm run lint` passes.
- `/`, `/login`, and `/register` were visually checked in the in-app browser at narrow/mobile and desktop widths.
- New app screens were opened in the in-app browser and user said they look good.
- Latest lint after app-screen/demo-fallback changes passes with no warnings.

## Demo Fallbacks

Protected app pages prefer real API data when `atomcamp_token` exists in localStorage. When no token exists, they render local demo data from `src/lib/demoData.js` so the screens are always reviewable from direct URLs.

Fallback-backed pages:

- `/instructor/cohort`
- `/student/onboarding`
- `/student/dashboard`
- `/student/skills`
- `/student/companion`
- `/student/checkin/[skillCode]`

Before production, decide whether to keep this behavior for demo convenience or gate it behind an explicit demo flag.

## Design Source Of Truth

See [DESIGN_LANGUAGE.md](./DESIGN_LANGUAGE.md) for the frontend visual system, including palette, typography, glass treatment, image treatment, animation, page patterns, and things to avoid.

See [PAGE_MAP.md](./PAGE_MAP.md) for the product overview and a route-by-route explanation of what each page does, what it shows, what data it uses, and what to review next.

## Next Frontend Work

1. Continue visual polish from user review comments.
2. Decide whether demo fallbacks stay as-is or move behind a flag.
3. Add a logged-in dashboard CTA or redirect behavior if desired.
