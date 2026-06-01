/**
 * Screenshot capture script for pace Adaptive LMS docs.
 * Run: node scripts/capture-screenshots.mjs
 * Requires: Playwright Chromium (npx playwright install chromium)
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../docs/screenshots');
const BASE = 'http://localhost:3001';

async function shot(page, filename, { waitFor = 600 } = {}) {
  await page.waitForTimeout(waitFor);
  await page.screenshot({ path: path.join(OUT, filename), fullPage: true, type: 'png' });
  console.log(`  ✓ ${filename}`);
}

async function enableDemo(page, role) {
  await page.evaluate((r) => localStorage.setItem('autocamp_demo', r), role);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ── Landing (desktop) ──────────────────────────────────────────────────────
  console.log('\n📸 Landing & auth pages...');
  const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const landing = await ctx1.newPage();
  await landing.goto(BASE, { waitUntil: 'networkidle' });
  await shot(landing, 'landing.png', { waitFor: 700 });

  // ── Landing (mobile 390px) ─────────────────────────────────────────────────
  await landing.setViewportSize({ width: 390, height: 844 });
  await landing.reload({ waitUntil: 'networkidle' });
  await shot(landing, 'mobile.png', { waitFor: 500 });
  await ctx1.close();

  // ── Login ──────────────────────────────────────────────────────────────────
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const login = await ctx2.newPage();
  await login.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await shot(login, 'login.png');
  await ctx2.close();

  // ── Register ───────────────────────────────────────────────────────────────
  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const register = await ctx3.newPage();
  await register.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
  await shot(register, 'register.png');
  await ctx3.close();

  // ── Student pages ──────────────────────────────────────────────────────────
  console.log('\n📸 Student pages...');
  const ctxS = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const s = await ctxS.newPage();
  await s.goto(BASE, { waitUntil: 'networkidle' });
  await enableDemo(s, 'student');

  // Dashboard
  await s.goto(`${BASE}/student/dashboard`, { waitUntil: 'networkidle' });
  await shot(s, 'student-dashboard.png', { waitFor: 1000 });

  // Skills
  await s.goto(`${BASE}/student/skills`, { waitUntil: 'networkidle' });
  await shot(s, 'skills-chart.png', { waitFor: 1000 });

  // Check-in
  await s.goto(`${BASE}/student/checkin/sql`, { waitUntil: 'networkidle' });
  await s.waitForTimeout(800);
  // Click first answer option
  const opts = await s.$$('button');
  for (const btn of opts) {
    const txt = await btn.textContent();
    const t = txt?.trim();
    if (t && t.length > 8 && t.length < 200 && !(await btn.getAttribute('type') === 'submit')) {
      try { await btn.click({ timeout: 1000 }); break; } catch { /* ok */ }
    }
  }
  await shot(s, 'checkin-result.png', { waitFor: 800 });

  // AI Companion — load page, wait for demo messages to render, then screenshot
  await s.goto(`${BASE}/student/companion`, { waitUntil: 'networkidle' });
  // Wait for the conversation history (recentActivity) to render
  await s.waitForTimeout(1500);
  // Try to click a starter prompt to trigger demo response
  try {
    const starterBtns = await s.$$('button');
    for (const btn of starterBtns) {
      const txt = (await btn.textContent())?.trim();
      if (txt && (txt.includes('SQL') || txt.includes('practice') || txt.includes('plan'))) {
        await btn.click();
        await s.waitForTimeout(1500);
        break;
      }
    }
  } catch { /* existing demo messages are enough */ }
  await shot(s, 'companion.png', { waitFor: 600 });

  await ctxS.close();

  // ── Instructor pages ───────────────────────────────────────────────────────
  console.log('\n📸 Instructor pages...');
  const ctxI = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const inst = await ctxI.newPage();
  await inst.goto(BASE, { waitUntil: 'networkidle' });
  await enableDemo(inst, 'instructor');

  await inst.goto(`${BASE}/instructor/cohort`, { waitUntil: 'networkidle' });
  await shot(inst, 'instructor-cohort.png', { waitFor: 1000 });

  await inst.goto(`${BASE}/instructor/learner/demo-amna`, { waitUntil: 'networkidle' });
  await shot(inst, 'instructor-learner.png', { waitFor: 800 });

  await ctxI.close();
  await browser.close();

  console.log('\n✅  All screenshots saved to docs/screenshots/\n');
})().catch((err) => { console.error(err); process.exit(1); });
