/**
 * Screenshot capture script for atomcamp Adaptive LMS docs.
 * Run: node scripts/capture-screenshots.mjs
 * Requires: npx playwright (Chromium)
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../docs/screenshots');
const BASE = 'http://localhost:3001';

async function shot(page, filename, { waitFor } = {}) {
  if (waitFor) await page.waitForTimeout(waitFor);
  await page.screenshot({
    path: path.join(OUT, filename),
    fullPage: true,
    type: 'png',
  });
  console.log(`✓ ${filename}`);
}

async function enableDemo(page, role = 'student') {
  await page.evaluate((r) => {
    localStorage.setItem('autocamp_demo', r);
  }, role);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ── Landing page (desktop) ──────────────────────────────────────────────────
  const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const landing = await ctx1.newPage();
  await landing.goto(BASE, { waitUntil: 'networkidle' });
  await shot(landing, 'landing.png', { waitFor: 500 });

  // ── Landing page (mobile 390px) ─────────────────────────────────────────────
  await landing.setViewportSize({ width: 390, height: 844 });
  await landing.reload({ waitUntil: 'networkidle' });
  await shot(landing, 'mobile.png', { waitFor: 400 });

  await ctx1.close();

  // ── Login page ──────────────────────────────────────────────────────────────
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const login = await ctx2.newPage();
  await login.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await shot(login, 'login.png', { waitFor: 400 });
  await ctx2.close();

  // ── Register page ───────────────────────────────────────────────────────────
  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const register = await ctx3.newPage();
  await register.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
  await shot(register, 'register.png', { waitFor: 400 });
  await ctx3.close();

  // ── Student pages (demo mode) ───────────────────────────────────────────────
  const ctxS = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const s = await ctxS.newPage();

  // Activate demo mode via landing page click
  await s.goto(BASE, { waitUntil: 'networkidle' });
  await enableDemo(s, 'student');

  // Dashboard
  await s.goto(`${BASE}/student/dashboard`, { waitUntil: 'networkidle' });
  await shot(s, 'student-dashboard.png', { waitFor: 800 });

  // Skills
  await s.goto(`${BASE}/student/skills`, { waitUntil: 'networkidle' });
  await shot(s, 'skills-chart.png', { waitFor: 800 });

  // Check-in (start a skill check-in for SQL)
  await s.goto(`${BASE}/student/checkin/sql`, { waitUntil: 'networkidle' });
  await s.waitForTimeout(600);
  // Answer first question (click first option)
  const opts = await s.$$('[data-option]');
  if (opts.length) {
    await opts[0].click();
    await s.waitForTimeout(400);
  }
  await shot(s, 'checkin-result.png', { waitFor: 600 });

  // Companion — navigate and type a message
  await s.goto(`${BASE}/student/companion`, { waitUntil: 'networkidle' });
  await s.waitForTimeout(800);
  // Click a starter prompt if visible
  const starters = await s.$$('button[data-starter], button.starter-prompt');
  if (starters.length) {
    await starters[0].click();
    await s.waitForTimeout(1200);
  } else {
    // Type a message directly
    const textarea = await s.$('textarea');
    if (textarea) {
      await textarea.fill('What should I focus on this week to improve my SQL skills?');
      await s.keyboard.press('Enter');
      await s.waitForTimeout(1500);
    }
  }
  await shot(s, 'companion.png', { waitFor: 500 });

  await ctxS.close();

  // ── Instructor pages (demo mode) ────────────────────────────────────────────
  const ctxI = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const inst = await ctxI.newPage();

  await inst.goto(BASE, { waitUntil: 'networkidle' });
  await enableDemo(inst, 'instructor');

  // Cohort command center
  await inst.goto(`${BASE}/instructor/cohort`, { waitUntil: 'networkidle' });
  await shot(inst, 'instructor-cohort.png', { waitFor: 800 });

  // Learner detail (demo-amna)
  await inst.goto(`${BASE}/instructor/learner/demo-amna`, { waitUntil: 'networkidle' });
  await shot(inst, 'instructor-learner.png', { waitFor: 600 });

  await ctxI.close();

  await browser.close();
  console.log('\n✅ All screenshots saved to docs/screenshots/');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
