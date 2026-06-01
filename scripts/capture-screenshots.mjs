/**
 * Screenshot capture script for pace Adaptive LMS.
 * Full-page, 1440px desktop, no cropping.
 *
 * Run: node scripts/capture-screenshots.mjs
 * Requires: Playwright Chromium  (npx playwright install chromium)
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT  = path.resolve(__dirname, '../docs/screenshots');
const BASE = 'http://localhost:3001';

// Full desktop — sidebar visible, no cropping
const DESKTOP = { width: 1440, height: 900 };
const MOBILE  = { width: 390,  height: 844 };

async function shot(page, filename, { wait = 800 } = {}) {
  await page.waitForTimeout(wait);
  await page.screenshot({
    path: path.join(OUT, filename),
    fullPage: true,   // capture entire scrollable page
    type: 'png',
  });
  console.log(`  ✓ ${filename}`);
}

async function enableDemo(page, role) {
  await page.evaluate(({ key, r }) => {
    localStorage.setItem(key, r);
    // Make sure sidebar is expanded
    localStorage.removeItem('pace_sidebar_collapsed');
  }, { key: 'pace_demo', r: role });
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ── 1. Landing — desktop ──────────────────────────────────────────────────
  console.log('\n📸  Landing & auth...');
  const ctx1 = await browser.newContext({ viewport: DESKTOP });
  const p1 = await ctx1.newPage();
  await p1.goto(BASE, { waitUntil: 'networkidle' });
  await shot(p1, 'landing.png', { wait: 900 });

  // ── 2. Landing — mobile 390 px ────────────────────────────────────────────
  await p1.setViewportSize(MOBILE);
  await p1.reload({ waitUntil: 'networkidle' });
  await shot(p1, 'mobile.png', { wait: 700 });
  await ctx1.close();

  // ── 3. Login ──────────────────────────────────────────────────────────────
  const ctx2 = await browser.newContext({ viewport: DESKTOP });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await shot(p2, 'login.png');
  await ctx2.close();

  // ── 4. Register ───────────────────────────────────────────────────────────
  const ctx3 = await browser.newContext({ viewport: DESKTOP });
  const p3 = await ctx3.newPage();
  await p3.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
  await shot(p3, 'register.png');
  await ctx3.close();

  // ── Student pages ─────────────────────────────────────────────────────────
  console.log('\n📸  Student pages...');
  const ctxS = await browser.newContext({ viewport: DESKTOP });
  const s = await ctxS.newPage();
  await s.goto(BASE, { waitUntil: 'networkidle' });
  await enableDemo(s, 'student');

  // Dashboard
  await s.goto(`${BASE}/student/dashboard`, { waitUntil: 'networkidle' });
  await shot(s, 'student-dashboard.png', { wait: 1200 });

  // Skills
  await s.goto(`${BASE}/student/skills`, { waitUntil: 'networkidle' });
  await shot(s, 'skills-chart.png', { wait: 1200 });

  // Check-in (SQL) — land on it, then click the first answer option
  await s.goto(`${BASE}/student/checkin/sql`, { waitUntil: 'networkidle' });
  await s.waitForTimeout(1000);
  // Try to click an answer option (not a nav or submit button)
  const allBtns = await s.$$('button');
  for (const btn of allBtns) {
    const txt = (await btn.textContent() ?? '').trim();
    const type = await btn.getAttribute('type');
    if (txt.length > 10 && txt.length < 250 && type !== 'submit') {
      try { await btn.click({ timeout: 800 }); break; } catch { /* ok */ }
    }
  }
  await shot(s, 'checkin-result.png', { wait: 1000 });

  // AI Companion — wait for demo history to load, then send a message
  await s.goto(`${BASE}/student/companion`, { waitUntil: 'networkidle' });
  await s.waitForTimeout(1500); // let recentActivity render
  // Click "Give me a 30 minute practice plan for SQL." starter if visible
  const starterBtns = await s.$$('button');
  let clicked = false;
  for (const btn of starterBtns) {
    const txt = (await btn.textContent() ?? '').trim();
    if (txt.length > 10 && txt.length < 120 && !txt.includes('Exit') && !txt.includes('pace')) {
      try { await btn.click(); clicked = true; await s.waitForTimeout(1800); break; } catch { /* ok */ }
    }
  }
  if (!clicked) {
    const ta = await s.$('textarea');
    if (ta) {
      await ta.fill('What should I focus on this week to improve my SQL score?');
      await s.keyboard.press('Enter');
      await s.waitForTimeout(1800);
    }
  }
  await shot(s, 'companion.png', { wait: 800 });
  await ctxS.close();

  // ── Instructor pages ──────────────────────────────────────────────────────
  console.log('\n📸  Instructor pages...');
  const ctxI = await browser.newContext({ viewport: DESKTOP });
  const inst = await ctxI.newPage();
  await inst.goto(BASE, { waitUntil: 'networkidle' });
  await enableDemo(inst, 'instructor');

  await inst.goto(`${BASE}/instructor/cohort`, { waitUntil: 'networkidle' });
  await shot(inst, 'instructor-cohort.png', { wait: 1200 });

  await inst.goto(`${BASE}/instructor/learner/demo-amna`, { waitUntil: 'networkidle' });
  await shot(inst, 'instructor-learner.png', { wait: 1000 });

  await ctxI.close();
  await browser.close();

  console.log('\n✅  All 10 screenshots saved to docs/screenshots/\n');
})().catch((err) => { console.error(err); process.exit(1); });
