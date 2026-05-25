const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const URL = 'https://ai-commit-writer-nine.vercel.app';
const OUT = path.join(__dirname, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

  // 1. Landing hero
  console.log('1/6 Loading landing...');
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT, '01-landing-hero.png') });
  console.log('  ✓ 01-landing-hero.png');

  // 2. Full landing
  await page.screenshot({ path: path.join(OUT, '02-landing-full.png'), fullPage: true });
  console.log('  ✓ 02-landing-full.png');

  // 3. Click "bug fix" sample
  console.log('3/6 Loading bug-fix sample...');
  await page.evaluate(() => loadSample('fix'));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT, '03-sample-loaded.png') });
  console.log('  ✓ 03-sample-loaded.png');

  // 4. Set scope + click Generate (fix sample)
  console.log('4/6 Generating fix candidates...');
  await page.click('#scope');
  await page.type('#scope', 'date-utils', { delay: 30 });
  await page.click('#goBtn');
  await page.waitForSelector('.candidate', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, '04-fix-result.png'), fullPage: true });
  console.log('  ✓ 04-fix-result.png');

  // 5. Try a feature sample
  console.log('5/6 Generating feature candidates...');
  await page.evaluate(() => clearAll());
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => loadSample('feature'));
  await page.click('#scope');
  await page.type('#scope', 'users', { delay: 30 });
  await page.select('#style', 'verbose');
  await page.click('#goBtn');
  await page.waitForSelector('.candidate', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, '05-feature-verbose.png'), fullPage: true });
  console.log('  ✓ 05-feature-verbose.png');

  // 6. Health endpoint
  console.log('6/6 Health endpoint...');
  await page.goto(`${URL}/api/health`, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(OUT, '06-health.png') });
  console.log('  ✓ 06-health.png');

  await browser.close();
  console.log('\n✅ All screenshots ready in', OUT);
})();
