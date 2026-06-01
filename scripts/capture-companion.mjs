import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../docs/screenshots');
const BASE = 'http://localhost:3001';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('autocamp_demo', 'student'));

  await page.goto(`${BASE}/student/companion`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Click first starter prompt to trigger a demo response
  const starter = await page.$('button');
  const allButtons = await page.$$('button');
  // Find starter prompt buttons (they contain text like "Explain SQL")
  for (const btn of allButtons) {
    const text = await btn.textContent();
    if (text && text.includes('Explain SQL')) {
      await btn.click();
      break;
    }
  }
  await page.waitForTimeout(2000);

  // Full page screenshot
  await page.screenshot({
    path: path.join(OUT, 'companion.png'),
    fullPage: true,
    type: 'png',
  });

  // Also capture just the skills page
  await page.goto(`${BASE}/student/skills`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUT, 'skills-chart.png'),
    fullPage: true,
    type: 'png',
  });

  // And the check-in result page - scroll to show answer
  await page.goto(`${BASE}/student/checkin/sql`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  // Click the first option
  const options = await page.$$('[data-option], .option-btn, button');
  for (const opt of options) {
    const text = await opt.textContent();
    if (text && text.trim().length > 5 && text.trim().length < 200) {
      const role = await opt.getAttribute('role');
      const type = await opt.getAttribute('type');
      if (type !== 'submit') {
        await opt.click();
        await page.waitForTimeout(600);
        break;
      }
    }
  }
  await page.screenshot({
    path: path.join(OUT, 'checkin-result.png'),
    fullPage: true,
    type: 'png',
  });

  await browser.close();
  console.log('✅ Companion + skills + checkin re-captured');
})().catch(err => { console.error(err); process.exit(1); });
