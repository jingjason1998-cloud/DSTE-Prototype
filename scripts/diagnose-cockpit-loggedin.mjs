import { chromium } from '@playwright/test';

const url = process.argv[2] || 'https://dste.fineres.com/src/cockpit.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Pre-set token before page scripts run
  await page.addInitScript(() => {
    localStorage.setItem('dste-token', 'fake-token-for-diagnosis');
  });

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

  page.on('request', req => {
    if (req.url().includes('/api/')) {
      console.log('REQUEST:', req.method(), req.url());
    }
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      failedRequests.push({ url: res.url(), status: res.status() });
      console.log('FAILED RESPONSE:', res.status(), res.url());
    }
  });

  // Mock APIs to simulate logged-in user
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.includes('/api/auth/me')) {
      console.log('MOCKED /api/auth/me');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user: { name: '测试用户', username: 'testuser' } })
      });
    }
    if (url.includes('/api/meetings')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }
    if (url.includes('/api/omp/')) {
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'internal error' }) });
    }
    if (url.includes('/api/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    }
    route.continue();
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const title = await page.title();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const html = await page.content();
    const urlAfter = page.url();

    console.log('\n--- Summary ---');
    console.log('Initial URL:', url);
    console.log('Final URL:', urlAfter);
    console.log('Title:', title);
    console.log('Body text:', bodyText.substring(0, 300));
    console.log('Console/Page errors:', errors.length);
    console.log('Failed requests:', failedRequests.length);

    if (errors.length === 0) {
      console.log('No JS errors detected');
    }

    if (html.includes('page-content') || html.includes('驾驶舱概览') || bodyText.length > 100) {
      console.log('Page appears to have rendered content');
    } else {
      console.log('WARNING: Page may be blank');
    }
  } catch (e) {
    console.log('Navigation error:', e.message);
  }

  await browser.close();
})();
