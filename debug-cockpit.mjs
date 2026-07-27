import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:3456/src/cockpit.html#exe/report-center', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const html = await page.locator('#page-content').innerHTML();
  console.log('page-content HTML length:', html.length);
  console.log('Contains marketing-budget:', html.includes('营销线预算执行监控表'));
  console.log('Contains fr-marketing-budget:', html.includes('fr-marketing-budget'));
  console.log('First 1000 chars:', html.slice(0, 1000));
  await browser.close();
})();
