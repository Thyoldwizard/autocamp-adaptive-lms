/**
 * Screenshot capture — pace Adaptive LMS
 * 1440 px desktop, full-page, no cropping.
 *
 * Fixes:
 *  - Scrolls through every page before shooting so Framer Motion
 *    whileInView elements become visible (they start at opacity:0).
 *  - Companion screenshot uses pre-loaded recentActivity; no click needed.
 *
 * Run:  node scripts/capture-screenshots.mjs
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT  = path.resolve(__dirname, '../docs/screenshots');
const BASE = 'http://localhost:3001';

const DESKTOP = { width: 1440, height: 900 };
const MOBILE  = { width: 390,  height: 844 };

// ── helpers ──────────────────────────────────────────────────────────────────

async function wait(page, ms) {
  return page.waitForTimeout(ms);
}

/**
 * Scroll through the page in steps so whileInView Framer Motion elements
 * fire their intersection observer and animate to opacity:1.
 * Then scroll back to top and settle before screenshotting.
 */
async function revealAll(page, { pause = 300 } = {}) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  const step = 600;
  for (let y = 0; y <= height; y += step) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(pause);
  }
  // Scroll back to top for the screenshot
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(400);
}

async function shot(page, filename, { scroll = true, wait: extra = 400 } = {}) {
  if (scroll) await revealAll(page);
  await page.waitForTimeout(extra);
  await page.screenshot({
    path: path.join(OUT, filename),
    fullPage: true,
    type: 'png',
  });
  console.log(`  ✓ ${filename}`);
}

async function enableDemo(page, role) {
  await page.evaluate((r) => {
    localStorage.setItem('pace_demo', r);
    localStorage.removeItem('pace_sidebar_collapsed'); // sidebar expanded
  }, role);
}

// ── main ─────────────────────────────────────────────────────────────────────

(async () => {
  const browser = await chromium.launch({ headless: true });

  // 1. Landing — desktop (full page with all whileInView sections revealed)
  console.log('\n📸  Landing & auth pages...');
  const ctx1 = await browser.newContext({ viewport: DESKTOP });
  const p1 = await ctx1.newPage();
  await p1.goto(BASE, { waitUntil: 'networkidle' });
  await shot(p1, 'landing.png', { scroll: true, wait: 600 });

  // 2. Landing — mobile 390 px
  await p1.setViewportSize(MOBILE);
  await p1.reload({ waitUntil: 'networkidle' });
  await shot(p1, 'mobile.png', { scroll: true, wait: 500 });
  await ctx1.close();

  // 3. Login
  const ctx2 = await browser.newContext({ viewport: DESKTOP });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await shot(p2, 'login.png', { scroll: false, wait: 500 });
  await ctx2.close();

  // 4. Register
  const ctx3 = await browser.newContext({ viewport: DESKTOP });
  const p3 = await ctx3.newPage();
  await p3.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
  await shot(p3, 'register.png', { scroll: false, wait: 500 });
  await ctx3.close();

  // ── Student pages ─────────────────────────────────────────────────────────
  console.log('\n📸  Student pages...');
  const ctxS = await browser.newContext({ viewport: DESKTOP });
  const s = await ctxS.newPage();

  // Seed demo mode from the landing page context
  await s.goto(BASE, { waitUntil: 'networkidle' });
  await enableDemo(s, 'student');

  // 5. Dashboard
  await s.goto(`${BASE}/student/dashboard`, { waitUntil: 'networkidle' });
  await shot(s, 'student-dashboard.png', { scroll: true, wait: 800 });

  // 6. Skills
  await s.goto(`${BASE}/student/skills`, { waitUntil: 'networkidle' });
  await shot(s, 'skills-chart.png', { scroll: true, wait: 800 });

  // 7. Check-in — just show the question page, no click needed
  await s.goto(`${BASE}/student/checkin/sql`, { waitUntil: 'networkidle' });
  await shot(s, 'checkin-result.png', { scroll: false, wait: 1000 });

  // 8. AI Companion — show the pre-loaded demo conversation (recentActivity).
  //    DO NOT click anything: clicking a starter prompt triggers a POST that
  //    would hit the real backend (not running) and show "Failed to fetch".
  //    The recentActivity in demoStudentDashboard already seeds the chat.
  await s.goto(`${BASE}/student/companion`, { waitUntil: 'networkidle' });
  // Wait generously for the async load() / setMessages to finish
  await wait(s, 2500);
  await shot(s, 'companion.png', { scroll: true, wait: 600 });

  await ctxS.close();

  // ── Instructor pages ──────────────────────────────────────────────────────
  console.log('\n📸  Instructor pages...');
  const ctxI = await browser.newContext({ viewport: DESKTOP });
  const inst = await ctxI.newPage();
  await inst.goto(BASE, { waitUntil: 'networkidle' });
  await enableDemo(inst, 'instructor');

  // 9. Cohort command center
  await inst.goto(`${BASE}/instructor/cohort`, { waitUntil: 'networkidle' });
  await shot(inst, 'instructor-cohort.png', { scroll: true, wait: 1000 });

  // 10. Learner detail
  await inst.goto(`${BASE}/instructor/learner/demo-amna`, { waitUntil: 'networkidle' });
  await shot(inst, 'instructor-learner.png', { scroll: true, wait: 800 });

  await ctxI.close();
  await browser.close();

  console.log('\n✅  All 10 screenshots saved to docs/screenshots/\n');
})().catch((err) => { console.error(err); process.exit(1); });
