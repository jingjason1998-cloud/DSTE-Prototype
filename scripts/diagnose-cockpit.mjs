import { chromium } from '@playwright/test';

const url = process.argv[2] || 'https://dste.fineres.com/src/cockpit.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const failedRequests = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({ type: msg.type(), text: msg.text() });
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    errors.push({ type: 'pageerror', text: err.message });
    console.log('PAGE ERROR:', err.message);
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      failedRequests.push({ url: res.url(), status: res.status() });
      console.log('FAILED REQUEST:', res.status(), res.url());
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const title = await page.title();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const html = await page.content();

    console.log('\n--- Summary ---');
    console.log('URL:', url);
    console.log('Title:', title);
    console.log('Body text:', bodyText.substring(0, 300));
    console.log('Console/Page errors:', errors.length);
    console.log('Failed requests:', failedRequests.length);

    if (errors.length === 0) {
      console.log('No JS errors detected');
    }

    if (html.includes('page-content') || html.includes('cockpit') || bodyText.length > 50) {
      console.log('Page appears to have rendered content');
    } else {
      console.log('WARNING: Page may be blank');
    }
  } catch (e) {
    console.log('Navigation error:', e.message);
  }

  await browser.close();
})();
