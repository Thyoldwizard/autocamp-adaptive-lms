/**
 * Demo video recorder for pace Adaptive LMS.
 * Full 1440×900, complete student + instructor walkthrough.
 *
 * Run:    node scripts/record-demo.mjs
 * Output: docs/demo.webm  →  docs/demo.mp4 (via ffmpeg)
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

async function smoothScroll(page, to) {
  await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), to);
}

async function enableDemo(page, role) {
  await page.evaluate(({ r }) => {
    localStorage.setItem('pace_demo', r);
    localStorage.removeItem('pace_sidebar_collapsed'); // sidebar expanded
  }, { r: role });
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir: DOCS, size: { width: W, height: H } },
  });

  const page = await ctx.newPage();

  // ── 1. Landing page ────────────────────────────────────────────────────────
  console.log('🎬  [1/9] Landing page...');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await wait(2500);

  // Scroll down to show features / stats
  await smoothScroll(page, 700);
  await wait(1800);
  await smoothScroll(page, 1400);
  await wait(1500);
  await smoothScroll(page, 2000);
  await wait(1200);
  // Scroll back to top to show demo buttons
  await smoothScroll(page, 0);
  await wait(1500);

  // ── 2. Enter student demo ─────────────────────────────────────────────────
  console.log('🎬  [2/9] Entering student demo...');
  await enableDemo(page, 'student');
  await page.locator('button', { hasText: 'Explore as student' }).first().click();
  await page.waitForURL('**/student/dashboard', { timeout: 10000 });
  await wait(1000);

  // ── 3. Student dashboard ──────────────────────────────────────────────────
  console.log('🎬  [3/9] Student dashboard...');
  await page.waitForLoadState('networkidle');
  await wait(1800);
  // Show the top of the dashboard — goal ring, headline
  await smoothScroll(page, 400);
  await wait(1500);
  await smoothScroll(page, 900);
  await wait(1500);
  await smoothScroll(page, 1400);
  await wait(1200);
  await smoothScroll(page, 0);
  await wait(1000);

  // ── 4. Skills page ────────────────────────────────────────────────────────
  console.log('🎬  [4/9] Skills page...');
  await page.goto(`${BASE}/student/skills`, { waitUntil: 'networkidle' });
  await wait(1500);
  await smoothScroll(page, 500);
  await wait(1200);
  await smoothScroll(page, 1200);
  await wait(1200);
  await smoothScroll(page, 0);
  await wait(800);

  // ── 5. Check-in ───────────────────────────────────────────────────────────
  console.log('🎬  [5/9] Check-in (SQL skill)...');
  await page.goto(`${BASE}/student/checkin/sql`, { waitUntil: 'networkidle' });
  await wait(1800);

  // Read the question then click an answer option
  await smoothScroll(page, 300);
  await wait(1200);

  const allBtns = await page.$$('button');
  for (const btn of allBtns) {
    const txt = (await btn.textContent() ?? '').trim();
    const type = await btn.getAttribute('type');
    if (txt.length > 10 && txt.length < 250 && type !== 'submit') {
      try {
        await btn.click();
        await wait(2000);
        break;
      } catch { /* ok */ }
    }
  }
  await smoothScroll(page, 0);
  await wait(1000);

  // ── 6. AI Companion ───────────────────────────────────────────────────────
  console.log('🎬  [6/9] AI Companion...');
  await page.goto(`${BASE}/student/companion`, { waitUntil: 'networkidle' });
  await wait(2000); // let recentActivity messages render

  // Show the starter prompts
  await smoothScroll(page, 200);
  await wait(1500);

  // Click a starter prompt
  const starters = await page.$$('button');
  let sent = false;
  for (const btn of starters) {
    const txt = (await btn.textContent() ?? '').trim();
    if (txt.length > 10 && txt.length < 120 &&
        !txt.includes('Exit') && !txt.includes('pace') && !txt.includes('Demo')) {
      try {
        await btn.click();
        sent = true;
        await wait(2500); // wait for demo response
        break;
      } catch { /* ok */ }
    }
  }

  if (!sent) {
    // Fall back: type a message
    const ta = await page.$('textarea');
    if (ta) {
      await ta.click();
      await page.keyboard.type('What should I focus on this week to improve my SQL score?', { delay: 35 });
      await wait(1000);
      await page.keyboard.press('Enter');
      await wait(2500);
    }
  }

  // Scroll to show full AI response
  await smoothScroll(page, 9999);
  await wait(2000);

  // ── 7. Back to landing, switch to instructor ───────────────────────────────
  console.log('🎬  [7/9] Returning to landing → instructor demo...');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await wait(1800);

  await enableDemo(page, 'instructor');
  await page.locator('button', { hasText: 'Explore as instructor' }).first().click();
  await page.waitForURL('**/instructor/**', { timeout: 10000 });
  await wait(1000);

  // ── 8. Instructor cohort command center ───────────────────────────────────
  console.log('🎬  [8/9] Instructor cohort view...');
  await page.waitForLoadState('networkidle');
  await wait(2000);

  // Show the metrics at the top
  await smoothScroll(page, 500);
  await wait(1500);
  // Show the learner queue
  await smoothScroll(page, 1000);
  await wait(1500);
  // Show the risk chart / skill heatmap further down
  await smoothScroll(page, 1800);
  await wait(1500);
  await smoothScroll(page, 0);
  await wait(1000);

  // ── 9. Learner detail ─────────────────────────────────────────────────────
  console.log('🎬  [9/9] Learner detail (Amna Malik)...');
  await page.goto(`${BASE}/instructor/learner/demo-amna`, { waitUntil: 'networkidle' });
  await wait(2000);
  await smoothScroll(page, 500);
  await wait(1500);
  await smoothScroll(page, 1200);
  await wait(1500);
  await smoothScroll(page, 0);
  await wait(2000); // hold final frame

  // ── Wrap up ───────────────────────────────────────────────────────────────
  await ctx.close();
  await browser.close();

  // Rename the Playwright-generated webm
  const webms = fs.readdirSync(DOCS)
    .filter(f => f.endsWith('.webm') && f !== 'demo.webm')
    .sort((a, b) => {
      const sa = fs.statSync(path.join(DOCS, a));
      const sb = fs.statSync(path.join(DOCS, b));
      return sb.mtimeMs - sa.mtimeMs;
    });

  if (webms.length) {
    const src = path.join(DOCS, webms[0]);
    const dst = path.join(DOCS, 'demo.webm');
    if (fs.existsSync(dst)) fs.unlinkSync(dst);
    fs.renameSync(src, dst);
    console.log('\n✅  Video saved → docs/demo.webm');
    console.log('    Convert:  ffmpeg -i docs/demo.webm -c:v libx264 -crf 18 -preset slow -movflags +faststart docs/demo.mp4\n');
  } else {
    console.log('\n⚠️  No webm found in docs/ — check Playwright recordVideo config\n');
  }
})().catch(err => { console.error(err); process.exit(1); });
