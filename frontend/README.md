# pace-frontend

Next.js 14 App Router frontend for the pace Adaptive LMS.

See the [root README](../README.md) for full project context, setup instructions, and feature overview.

## Quick start

```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=/api for local dev (uses the built-in rewrite to localhost:3000)
npm install
npm run dev    # http://localhost:3001
```

## Commands

```bash
npm run dev     # development server
npm run build   # production build (must pass before any PR)
npm run lint    # ESLint — must be clean
```

## Demo mode

Click "Explore as student" or "Explore as instructor" on the landing page. Every screen works with no backend or account. See `src/lib/demoData.js` for the fixture data.

## Structure

```
src/
├── app/
│   ├── page.js                        # editorial homepage
│   ├── login/page.js
│   ├── register/page.js
│   ├── student/
│   │   ├── dashboard/page.js
│   │   ├── skills/page.js
│   │   ├── companion/page.js
│   │   ├── checkin/[skillCode]/page.js
│   │   └── onboarding/page.js
│   └── instructor/
│       ├── cohort/page.js
│       └── learner/[id]/page.js
├── components/
│   ├── AppShell.js                    # collapsible sidebar + demo badge
│   └── ui/                            # Card, MetricCard, Button, RiskBadge, Modal, ProgressBar
├── hooks/
│   └── useFetch.js
└── lib/
    ├── api.js                          # fetch wrapper + demo short-circuit
    ├── auth.js                         # token helpers
    ├── constants.js                    # animation + design tokens
    ├── demoData.js                     # static fixtures for every API route
    └── demoMode.js                     # getDemoRole / setDemoMode / exitDemoMode
```

## Design reference

- [`DESIGN_LANGUAGE.md`](./DESIGN_LANGUAGE.md) — visual system, palette, glass treatment, animation
- [`PAGE_MAP.md`](./PAGE_MAP.md) — product overview and page-by-page reference
