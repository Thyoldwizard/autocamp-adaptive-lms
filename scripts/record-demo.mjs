/**
 * Demo video recorder — pace Adaptive LMS
 * 1440×900, full scroll on every page, student + instructor flows.
 *
 * Run:    node scripts/record-demo.mjs
 * Output: docs/demo.webm  →  convert with ffmpeg → docs/demo.mp4
 */
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.resolve(__dirname, '../docs');
const BASE = 'http://localhost:3001';
const W = 1440, H = 900;

const wait = ms => new Promise(r => setTimeout(r, ms));

/**
 * Scroll from current position to the bottom of the page, pausing at each
 * step so Framer Motion whileInView elements reveal and viewers can read.
 */
async function scrollFull(page, { stepPx = 400, pauseMs = 700 } = {}) {
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  let current = 0;
  while (current < totalHeight) {
    current = Math.min(current + stepPx, totalHeight);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), current);
    await wait(pauseMs);
  }
  // Hold at the bottom briefly
  await wait(800);
}

/** Scroll back to top smoothly */
async function scrollTop(page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(600);
}

async function enableDemo(page, role) {
  await page.evaluate((r) => {
    localStorage.setItem('pace_demo', r);
    localStorage.removeItem('pace_sidebar_collapsed');
  }, role);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir: DOCS, size: { width: W, height: H } },
  });

  const page = await ctx.newPage();

  // ── 1. Landing page — full scroll ─────────────────────────────────────────
  console.log('🎬  [1/9] Landing page — full scroll...');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await wait(2000);
  // Scroll through every section (hero → features → how it works → showcase)
  await scrollFull(page, { stepPx: 350, pauseMs: 700 });
  // Pause at the very bottom so viewers see the footer/CTA
  await wait(1200);
  // Scroll back to hero and show demo buttons
  await scrollTop(page);
  await wait(1500);

  // ── 2. Enter student demo ─────────────────────────────────────────────────
  console.log('🎬  [2/9] Entering student demo...');
  await enableDemo(page, 'student');
  await page.locator('button', { hasText: 'Explore as student' }).first().click();
  await page.waitForURL('**/student/dashboard', { timeout: 10000 });
  await wait(1200);

  // ── 3. Student dashboard — full scroll ────────────────────────────────────
  console.log('🎬  [3/9] Student dashboard — full scroll...');
  await page.waitForLoadState('networkidle');
  await wait(1200);
  await scrollFull(page, { stepPx: 350, pauseMs: 700 });
  await wait(800);
  await scrollTop(page);
  await wait(800);

  // ── 4. Skills page — full scroll ─────────────────────────────────────────
  console.log('🎬  [4/9] Skills page — full scroll...');
  await page.goto(`${BASE}/student/skills`, { waitUntil: 'networkidle' });
  await wait(1200);
  await scrollFull(page, { stepPx: 350, pauseMs: 700 });
  await wait(800);
  await scrollTop(page);
  await wait(800);

  // ── 5. Check-in — full scroll ─────────────────────────────────────────────
  console.log('🎬  [5/9] Check-in (SQL) — full scroll...');
  await page.goto(`${BASE}/student/checkin/sql`, { waitUntil: 'networkidle' });
  await wait(1500);
  await scrollFull(page, { stepPx: 350, pauseMs: 700 });
  await wait(800);
  await scrollTop(page);
  await wait(800);

  // ── 6. AI Companion — show pre-loaded convo, full scroll ──────────────────
  console.log('🎬  [6/9] AI Companion — full scroll...');
  await page.goto(`${BASE}/student/companion`, { waitUntil: 'networkidle' });
  // Wait for async load() + recentActivity messages to render
  await wait(2500);
  await scrollFull(page, { stepPx: 300, pauseMs: 700 });
  await wait(800);
  await scrollTop(page);
  await wait(1000);

  // ── 7. Return to landing → instructor ────────────────────────────────────
  console.log('🎬  [7/9] Back to landing → instructor demo...');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await wait(1500);
  await enableDemo(page, 'instructor');
  await page.locator('button', { hasText: 'Explore as instructor' }).first().click();
  await page.waitForURL('**/instructor/**', { timeout: 10000 });
  await wait(1200);

  // ── 8. Instructor cohort — full scroll ───────────────────────────────────
  console.log('🎬  [8/9] Instructor cohort — full scroll...');
  await page.waitForLoadState('networkidle');
  await wait(1200);
  await scrollFull(page, { stepPx: 350, pauseMs: 700 });
  await wait(800);
  await scrollTop(page);
  await wait(800);

  // ── 9. Learner detail — full scroll ──────────────────────────────────────
  console.log('🎬  [9/9] Learner detail (Amna Malik) — full scroll...');
  await page.goto(`${BASE}/instructor/learner/demo-amna`, { waitUntil: 'networkidle' });
  await wait(1500);
  await scrollFull(page, { stepPx: 350, pauseMs: 700 });
  await wait(1000);
  await scrollTop(page);
  await wait(2000); // hold final frame

  // ── Wrap up ───────────────────────────────────────────────────────────────
  await ctx.close();
  await browser.close();

  // Rename the generated webm
  const webms = fs.readdirSync(DOCS)
    .filter(f => f.endsWith('.webm') && f !== 'demo.webm')
    .sort((a, b) =>
      fs.statSync(path.join(DOCS, b)).mtimeMs - fs.statSync(path.join(DOCS, a)).mtimeMs
    );

  if (webms.length) {
    const src = path.join(DOCS, webms[0]);
    const dst = path.join(DOCS, 'demo.webm');
    if (fs.existsSync(dst)) fs.unlinkSync(dst);
    fs.renameSync(src, dst);
    console.log('\n✅  Video saved → docs/demo.webm');
    console.log('    Convert:  ffmpeg -i docs/demo.webm -c:v libx264 -crf 18 -preset slow -movflags +faststart docs/demo.mp4\n');
  }
})().catch(err => { console.error(err); process.exit(1); });
