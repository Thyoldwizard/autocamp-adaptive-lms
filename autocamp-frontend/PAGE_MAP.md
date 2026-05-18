# autocamp Adaptive LMS — Page Map

This document explains what the project does and what every frontend page is responsible for. Use it as a review checklist for what can be improved next.

## Product Overview

autocamp Adaptive LMS is a learning platform for bootcamps and cohort-based education.

The product has two connected experiences:

- Student experience: helps learners understand what to do next, track skills, complete check-ins, and ask an AI learning companion for help.
- Instructor experience: helps instructors see cohort health, identify at-risk learners, understand weak skills, and intervene earlier.

The core idea is one shared learner model. Student progress, skill confidence, module activity, companion messages, check-ins, and risk signals all feed the same system.

## Design Direction

The frontend is currently moving toward premium editorial education-tech:

- image-led public/auth pages
- cream/green/orange atomcamp palette
- large Plus Jakarta Sans headlines
- Inter for UI/body text
- glass panels for product signal
- calm Framer Motion transitions
- lucide icons
- operational dashboards that feel polished, not generic SaaS

Detailed design rules live in `DESIGN_LANGUAGE.md`.

## Data And Demo Mode

The app prefers real backend data when `atomcamp_token` exists in `localStorage`.

Protected app screens also have local demo fallbacks in `src/lib/demoData.js`. This allows direct visual review of protected pages without logging in or depending on a perfectly clean auth state.

Before production, decide whether these fallbacks should remain, move behind a demo flag, or be removed.

## Public Pages

### `/`

File: `src/app/page.js`

Purpose:

Public homepage and product story for autocamp Adaptive LMS.

What it shows:

- Full-screen image-led hero.
- Moving product ticker.
- Top nav with `Sign in` and `Create account`.
- Large `atomcamp Adaptive LMS` headline.
- CTA buttons to `/register` and `/login`.
- Glass instructor dashboard preview.
- Demo stats: cohorts, skills, modules, signal types.
- Product explanation section.
- Program chips.
- Product-depth section with signal cards.
- Workflow: Assess, Adapt, Interpret, Intervene.
- Image showcase section.
- Final CTA.

Main user goal:

Understand what the product is and choose either login or registration.

Review questions:

- Is the hero too tall or too dense on mobile?
- Does the dashboard preview communicate the product clearly?
- Are the sections enough for a demo audience?
- Should logged-in users see a dashboard CTA?

### `/login`

File: `src/app/login/page.js`

Purpose:

Authentication entry point for students and instructors.

What it shows:

- Desktop split-screen layout.
- Left image panel with green/orange overlay.
- Moving ticker.
- `Learn with signal.` headline.
- Glass cohort signal panel.
- Right glass form card.
- Email/password fields.
- Link to create account.
- Compact mobile feature chips.

Behavior:

- Calls `POST /api/auth/login`.
- Stores returned `access_token` in `localStorage` as `atomcamp_token`.
- Decodes role from JWT.
- Redirects instructor to `/instructor/cohort`.
- Redirects student to `/student/dashboard`.

Review questions:

- Is the login error message clear enough?
- Should we show demo credentials somewhere during demo mode?
- Should there be a forgot-password path?

### `/register`

File: `src/app/register/page.js`

Purpose:

Create a new student or instructor account.

What it shows:

- Desktop split-screen layout.
- Left image panel with `Build your learning signal.` headline.
- Glass onboarding-captures panel.
- Right glass form card.
- Name, email, password fields.
- Role selector: learner or instructor.
- Student-only fields:
  - background
  - program
  - learning goal
- Link to sign in.

Behavior:

- Calls `POST /api/auth/register`.
- Stores `access_token` if returned.
- Redirects instructor to `/instructor/cohort`.
- Redirects student to `/student/onboarding`.

Review questions:

- Should instructor registration collect organization/cohort info?
- Should student registration and onboarding be merged?
- Is the role selector clear enough?

## Instructor Pages

### `/instructor/cohort`

File: `src/app/instructor/cohort/page.js`

Purpose:

Instructor command center for cohort intelligence.

What it shows:

- Large instructor dashboard hero.
- Active cohort selector.
- Total learners metric.
- Needs-attention count.
- Average goal progress.
- Learner support queue.
- Risk badge per learner.
- Goal progress per learner.
- Next best action per learner.
- Flag button for instructor follow-up.
- Risk mix panel.
- Weakest skills heatmap panel.

Real API data:

- `GET /api/instructor/cohort`
- `GET /api/instructor/cohort/at-risk`
- `GET /api/instructor/cohort/heatmap`
- `POST /api/instructor/learner/:learnerId/flag`

Demo fallback:

- Uses `demoInstructorOverview`, `demoInstructorAtRisk`, and `demoInstructorHeatmap` from `src/lib/demoData.js` when no token exists.

Main user goal:

Help instructors quickly decide who needs support and what skill/module is causing friction.

Review questions:

- Is the support queue actionable enough?
- Should learner rows open a detailed learner profile?
- Should flagging use a note modal instead of a one-click default note?
- Should the heatmap be more visual?
- Should the dashboard include cohort comparison across all cohorts?

## Student Pages

### `/student/onboarding`

File: `src/app/student/onboarding/page.js`

Purpose:

Set up the student learner model after registration.

What it shows:

- Editorial onboarding layout.
- Left green learner-model setup panel.
- Three-step flow:
  - background
  - goal
  - confirmation
- Background options:
  - non-technical
  - semi-technical
  - technical
- Goal presets and custom goal field.

Real API data:

- `GET /api/student/onboarding/status`
- `POST /api/student/onboarding/complete`

Demo fallback:

- Opens without auth token and displays the onboarding flow directly.

Main user goal:

Give enough context for the system to calibrate recommendations.

Review questions:

- Should onboarding include diagnostic questions?
- Should program and goal from registration prefill this page?
- Should the confirmation step show the learner’s program/cohort too?

### `/student/dashboard`

File: `src/app/student/dashboard/page.js`

Purpose:

Main student workspace.

What it shows:

- Personalized greeting.
- Program and cohort.
- Risk badge.
- Day enrolled badge.
- Goal progress ring.
- Module metrics:
  - completed
  - in progress
  - not started
- Up-next module card.
- Reason for recommendation.
- Link to skill map.
- Companion CTA.
- Skill snapshot.
- Recent companion activity.

Real API data:

- `GET /api/student/dashboard`

Demo fallback:

- Uses `demoStudentDashboard` from `src/lib/demoData.js` when no token exists.

Main user goal:

Know what to work on next and why.

Review questions:

- Should `Start` open a module detail page?
- Should risk be visible to students or softened?
- Should goal progress explain what affects the percentage?
- Should recent activity include module progress, not only companion messages?

### `/student/skills`

File: `src/app/student/skills/page.js`

Purpose:

Detailed skill map for a student.

What it shows:

- Skill map hero.
- Skill signal metrics:
  - tracked
  - strong
  - practice
- Search input.
- Three skill bands:
  - Strong
  - Developing
  - Needs practice
- Skill proficiency bars.
- Check-in CTA for each skill.
- Companion CTA.

Real API data:

- `GET /api/student/skills`

Demo fallback:

- Uses `demoSkills` from `src/lib/demoData.js` when no token exists.

Main user goal:

Understand current strengths and weak areas, then start a check-in.

Review questions:

- Should skill bands show domains more prominently?
- Should each skill have a detail drawer?
- Should check-in be recommended only for weak/developing skills?
- Should this page show skill history over time?

### `/student/companion`

File: `src/app/student/companion/page.js`

Purpose:

AI learning companion chat workspace.

What it shows:

- Left explanation panel.
- Starter prompt buttons.
- Chat history.
- User and assistant bubbles.
- Message input.
- Sending/loading state.

Real API data:

- Uses `GET /api/student/dashboard` to load recent companion activity.
- Sends messages through `POST /api/student/companion`.

Demo fallback:

- Uses recent activity from `demoStudentDashboard`.
- Sends a local demo response when no token exists.

Main user goal:

Ask for help, explanations, practice plans, or next-step guidance.

Review questions:

- Should companion history have a dedicated `GET /companion` API instead of borrowing dashboard activity?
- Should the page surface related skills/modules beside each answer?
- Should help requests visibly notify instructors?
- Should starter prompts adapt to the learner’s weakest skills?

### `/student/checkin/[skillCode]`

Example: `/student/checkin/sql`

File: `src/app/student/checkin/[skillCode]/page.js`

Purpose:

Skill check-in quiz for a specific skill.

What it shows:

- Skill check-in sidebar.
- Current skill name.
- Answered count.
- Multiple-choice questions.
- Selected answer state.
- Submit button.
- Result screen:
  - score
  - correct answer count
  - total questions
  - updated proficiency
  - retake action
  - back to skills action

Real API data:

- Starts with `POST /api/student/checkin/start/:skillCode`.
- Submits with `POST /api/student/checkin/submit/:skillCode`.

Demo fallback:

- Uses `demoCheckin` from `src/lib/demoData.js`.
- Scores locally when no token exists.

Main user goal:

Generate a fresh skill signal and update proficiency.

Review questions:

- Should results show explanations per question?
- Should check-ins be timed?
- Should weak score automatically suggest companion help?
- Should check-in sessions persist beyond memory?
- Should there be a check-in index page instead of only dynamic skill links?

## Shared Technical Notes

### API Wrapper

File: `src/lib/api.js`

Responsibilities:

- Reads `NEXT_PUBLIC_API_URL`.
- Adds `Authorization: Bearer <token>` when token exists.
- Redirects to `/login` on `401`.
- Throws errors for non-OK responses.

### Auth Helpers

File: `src/lib/auth.js`

Responsibilities:

- Save token.
- Read token.
- Clear token.
- Decode JWT payload.
- Check instructor role.
- Require auth for protected pages.

### Demo Data

File: `src/lib/demoData.js`

Responsibilities:

- Local instructor overview, at-risk, and heatmap demo data.
- Local student dashboard and skill data.
- Local check-in questions and answers.
- Enables direct page review without login.

## Current Review Status

As of May 18, 2026:

- Homepage, login, and register were visually checked earlier.
- Instructor and student app screens were opened in the in-app browser.
- User said the screens look good.
- `npm run lint` passes with no warnings.

## Possible Improvement Areas

Highest value product improvements:

- Add learner detail page for instructors.
- Add module detail/start page for students.
- Add explanations to check-in results.
- Add a dedicated companion history API/page state.
- Add a demo-mode toggle or flag for fallback data.
- Add logout/dashboard navigation.
- Add logged-in dashboard CTA on homepage.

Highest value visual improvements:

- Fine-tune mobile spacing across app screens.
- Add stronger empty states.
- Add better loading skeletons.
- Make instructor heatmap more visual.
- Add page-level nav between student dashboard, skills, companion, and check-ins.
- Replace remote Unsplash images with real atomcamp assets when available.
