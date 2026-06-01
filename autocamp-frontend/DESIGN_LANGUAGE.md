# pace Frontend Design Language

This document is the source of truth for the current pace frontend direction.

## Design Position

The frontend should feel like premium editorial education-tech for cohort-based bootcamps.

The reference mood is image-led, confident, and spacious, with product signal layered over real educational imagery. It should not feel like a generic SaaS template, a purple/blue AI dashboard, or a cartoon learning app.

Core feeling:

- premium
- editorial
- image-led
- confident
- calm
- bootcamp/education-tech
- useful and demo-ready

## Palette

Use pace colors as the system base:

- background: `#F9F7F4`
- primary green: `#2D6A4F`
- accent orange: `#F4A261`
- text: `#1A1A1A`
- muted: `#6B7280`
- danger: `#E07B6A`
- white/card: `#FFFFFF`

Green should carry brand and product intelligence. Orange should be an accent for signal, emphasis, and tiny detail. Cream should keep the interface warm and editorial.

Avoid:

- dominant purple or blue SaaS palettes
- neon color systems
- beige-only pages with no green contrast
- gradients without real image or product substance

## Typography

Fonts:

- Display: Plus Jakarta Sans
- Body/UI: Inter

Use Plus Jakarta Sans for:

- hero headlines
- section headings
- metric numbers
- brand wordmark

Use Inter for:

- form labels
- body copy
- buttons
- badges
- navigation
- dashboard content

Hero headlines should be large, heavy, and editorial. Current examples:

- `pace`
- `Learn with signal.`
- `Build your learning signal.`
- `Start adaptive.`

Keep letter spacing normal. Do not use negative tracking.

## Layout System

Public/auth pages use a strong split between editorial image and functional UI.

Desktop auth pages:

- left side: full-height image panel
- right side: cream grid background with glass form card
- left image panel uses brand, badge, large headline, supporting copy, and a useful glass signal panel

Mobile auth pages:

- hide the left image panel
- keep the form as the primary surface
- use cream grid background
- add compact feature chips below form

Homepage:

- first viewport should immediately show the brand/product signal
- use a full-screen image-led hero
- include a real product preview, not just copy
- show enough detail to make the LMS feel concrete
- use image sections and glass overlays, but keep overlays compact enough that images stay visible

## Image Treatment

Use real education/workshop/team imagery as temporary placeholders until brand assets are available.

Current image approach:

- remote Unsplash images
- full-bleed or section-wide image panels
- green overlay with orange warmth
- subtle grid overlay above image
- content layered in white/light text

Image overlays should improve readability without killing the image. If people or workspace details disappear completely, the overlay is too strong.

## Glass Treatment

Glass is now part of the design language, but it must carry actual product content.

Use glass for:

- hero dashboard previews
- cohort signal panels
- onboarding summary panels
- compact image overlays
- form cards on cream grid backgrounds
- small metric cards

Glass recipe:

- translucent white or deep green fill
- white or cream border
- `backdrop-blur-xl` or `backdrop-blur-2xl`
- soft shadow
- 8px radius via `rounded-input`

Examples:

- image panel glass: `border-white/20 bg-white/10 backdrop-blur-2xl`
- form card: `border-[#ded7cd] bg-white/70 backdrop-blur-2xl`
- compact overlay on image: deep green translucent fill with white border

Rules:

- Glass text on green/image backgrounds should be light.
- Avoid dark text on translucent green panels.
- Avoid giant glass blocks that cover the image on mobile.
- Avoid cards inside cards unless the inner element is a repeated item or a control.
- Prefer one compact glass overlay over multiple bulky stacked overlays.

## Motion

Motion should feel calm and editorial.

Use Framer Motion for:

- hero entrance
- form stagger
- section reveal on scroll
- subtle metric/progress animation
- ticker/marquee strips

Current easing:

```js
const EASE_OUT = [0.16, 1, 0.3, 1];
```

Typical timings:

- page/hero entrance: `0.9s` to `1.1s`
- form field stagger: `0.07s` to `0.08s`
- field reveal: `0.55s`
- small error reveal: `0.2s` to `0.24s`
- ticker loop: about `30s`, linear, infinite

Ticker rules:

- Use ticker strips sparingly.
- Keep ticker text short and uppercase.
- Use small orange dot separators.
- Tickers should reinforce product signal, not distract from the form.

Avoid:

- bouncy motion
- cartoon motion
- excessive hover movement
- fast marquee speeds
- decorative animation that does not support the product story

## Controls

Use lucide-react icons for controls and product signals.

Good icons already in use:

- `ArrowRight`
- `BarChart3`
- `BookOpenCheck`
- `Brain`
- `CheckCircle2`
- `GraduationCap`
- `Radar`
- `Sparkles`
- `Users`

Controls should be familiar:

- buttons for commands
- segmented/card-like buttons for role and program selection
- pills for compact option sets
- badges for status and product signal

Avoid emoji in production UI controls. The register role selector was updated from emoji to lucide icons.

## Current Page Patterns

Homepage `src/app/page.js`:

- public landing/product page
- full-screen hero
- glass dashboard preview
- product depth sections
- workflow section
- image showcase
- final CTA

Login `src/app/login/page.js`:

- split editorial layout
- left visual panel hidden on mobile
- right glass form card
- auth behavior preserved

Register `src/app/register/page.js`:

- split editorial layout
- left visual panel hidden on mobile
- right glass form card
- learner-only fields animated with `AnimatePresence`
- auth behavior preserved

Instructor/student app pages:

- use cream grid backgrounds
- use glass panels for dashboard cards and workspaces
- use primary green hero/summary panels
- keep page headers large and editorial
- keep dense operational data organized in tables, queues, bands, and compact metric cards
- support local demo fallback data from `src/lib/demoData.js` when no auth token exists

## Copy Voice

Copy should be clear, product-specific, and demo-oriented.

Good phrases:

- adaptive learner model
- cohort intelligence
- early risk signals
- instructor interventions
- skills heatmaps
- secure cohort workspace
- learner intelligence for modern bootcamps
- build your learning signal

Avoid:

- generic AI hype
- long explanatory UI paragraphs
- docs-like instructions inside the app
- vague SaaS phrases that could fit any product

## Things To Avoid

- bland centered cards everywhere
- empty glass decoration
- giant overlays that hide useful imagery
- nested card-heavy sections
- generic white-card SaaS layouts
- purple/blue AI palette
- neon effects
- cartoonish illustrations
- visible tutorial text explaining the interface
- text that overflows buttons or compact panels

## Implementation Notes

Keep most page-level visual logic self-contained in the page file unless a pattern is repeated enough to justify a shared component.

When adding or updating pages:

1. Match the palette and typography above.
2. Use real image-led sections where the page is public or editorial.
3. Use glass panels for real product information.
4. Preserve auth/API behavior.
5. Run `npm run lint`.
6. Check at narrow/mobile and desktop widths in the browser.

For frontend work, the most important next route is `/instructor/cohort`.
