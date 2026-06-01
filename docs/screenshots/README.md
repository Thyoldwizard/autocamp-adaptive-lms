# Screenshots

All screenshots were captured in demo mode (no backend or login required) using Playwright against `localhost:3001`.

| Filename | Page |
|---|---|
| `landing.png` | Homepage (desktop 1280px, full page) |
| `mobile.png` | Homepage (390px mobile viewport) |
| `login.png` | Login page |
| `register.png` | Register page |
| `student-dashboard.png` | Student dashboard — goal progress ring, risk badge, next-best-action |
| `skills-chart.png` | Skills page — proficiency bars across strong / developing / weak bands |
| `checkin-result.png` | Skill check-in question with answer options |
| `companion.png` | AI Learning Companion (Gemini 2.5 Flash) — starter prompts + live conversation |
| `instructor-cohort.png` | Instructor cohort command center — learner queue and risk metrics |
| `instructor-learner.png` | Learner detail view — signal history, risk analysis, next-best-action |

## Recapturing

```bash
# Make sure the frontend dev server is running:
cd autocamp-frontend && npm run dev

# Then from the repo root:
node scripts/capture-screenshots.mjs
```
