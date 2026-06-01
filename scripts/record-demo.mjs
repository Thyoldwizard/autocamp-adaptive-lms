/**
 * Demo video recorder for pace Adaptive LMS.
 * Records a ~90 second walkthrough covering student + instructor flows.
 *
 * Run: node scripts/record-demo.mjs
 * Output: docs/demo.webm  (then convert to mp4 with ffmpeg if needed)
 *
 * Requires: Playwright Chromium (npx playwright install chromium)
 * Optional: ffmpeg for mp4 conversion
 */
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.resolve(__dirname, '../docs');
const BASE = 'http://localhost:3001';

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function enableDemo(page, role) {
  await page.evaluate((r) => localStorage.setItem('pace_demo', r), role);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: DOCS,
      size: { width: 1440, height: 900 },
    },
  });

  const page = await ctx.newPage();

  // ── 1. Landing page ────────────────────────────────────────────────────────
  console.log('🎬 Landing page...');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await wait(2500); // let visitor absorb the hero

  // scroll down gently to show the features section
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'smooth' }));
  await wait(1500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(800);

  // ── 2. Enter student demo ─────────────────────────────────────────────────
  console.log('🎬 Entering student demo...');
  await enableDemo(page, 'student');

  const studentBtn = page.locator('button', { hasText: 'Explore as student' }).first();
  await studentBtn.click();
  await page.waitForURL('**/student/dashboard', { timeout: 8000 });
  await wait(1500);

  // ── 3. Student dashboard ──────────────────────────────────────────────────
  console.log('🎬 Student dashboard...');
  await page.waitForLoadState('networkidle');
  await wait(1200);
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
  await wait(1000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(800);

  // ── 4. Skills page ────────────────────────────────────────────────────────
  console.log('🎬 Skills page...');
  await page.goto(`${BASE}/student/skills`, { waitUntil: 'networkidle' });
  await wait(1200);
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await wait(1000);

  // ── 5. Check-in ───────────────────────────────────────────────────────────
  console.log('🎬 Check-in...');
  await page.goto(`${BASE}/student/checkin/sql`, { waitUntil: 'networkidle' });
  await wait(1200);
  // Click first answer option
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const txt = (await btn.textContent())?.trim();
    if (txt && txt.length > 8 && txt.length < 200) {
      const type = await btn.getAttribute('type');
      if (type !== 'submit') {
        await btn.click();
        await wait(1500);
        break;
      }
    }
  }
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
  await wait(800);

  // ── 6. AI Companion ───────────────────────────────────────────────────────
  console.log('🎬 AI Companion...');
  await page.goto(`${BASE}/student/companion`, { waitUntil: 'networkidle' });
  await wait(1500);

  // Click a starter prompt
  const allBtns = await page.$$('button');
  let clicked = false;
  for (const btn of allBtns) {
    const txt = (await btn.textContent())?.trim();
    if (txt && (txt.includes('SQL') || txt.includes('plan') || txt.includes('practice'))) {
      await btn.click();
      clicked = true;
      await wait(2000);
      break;
    }
  }
  if (!clicked) {
    // Type a message manually
    const textarea = await page.$('textarea');
    if (textarea) {
      await textarea.click();
      await page.keyboard.type('What should I focus on to improve my SQL score this week?', { delay: 40 });
      await wait(800);
      await page.keyboard.press('Enter');
      await wait(2000);
    }
  }
  await page.evaluate(() => window.scrollTo({ top: 9999, behavior: 'smooth' }));
  await wait(1500);

  // ── 7. Exit student, enter instructor ─────────────────────────────────────
  console.log('🎬 Switching to instructor demo...');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await wait(1000);

  // Click exit demo / back to normal, then enter instructor
  await enableDemo(page, 'instructor');
  const instBtn = page.locator('button', { hasText: 'Explore as instructor' }).first();
  await instBtn.click();
  await page.waitForURL('**/instructor/**', { timeout: 8000 });
  await wait(1200);

  // ── 8. Instructor cohort command center ───────────────────────────────────
  console.log('🎬 Instructor cohort view...');
  await page.waitForLoadState('networkidle');
  await wait(1200);
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await wait(1000);
  await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'smooth' }));
  await wait(800);

  // ── 9. Learner detail ─────────────────────────────────────────────────────
  console.log('🎬 Learner detail...');
  await page.goto(`${BASE}/instructor/learner/demo-amna`, { waitUntil: 'networkidle' });
  await wait(1200);
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await wait(800);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(1000);

  // ── Done ──────────────────────────────────────────────────────────────────
  await ctx.close();
  await browser.close();

  // The recorded file lands in DOCS/ with a generated name — rename it
  const files = fs.readdirSync(DOCS).filter(f => f.endsWith('.webm'));
  if (files.length) {
    const src = path.join(DOCS, files[files.length - 1]);
    const dst = path.join(DOCS, 'demo.webm');
    fs.renameSync(src, dst);
    console.log(`\n✅  Video saved to docs/demo.webm`);
    console.log(`    To convert to mp4:  ffmpeg -i docs/demo.webm -c:v libx264 -crf 20 docs/demo.mp4\n`);
  }
})().catch((err) => { console.error(err); process.exit(1); });
