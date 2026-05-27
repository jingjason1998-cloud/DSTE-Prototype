import { test } from '@playwright/test';

test('debug console', async ({ page }) => {
  page.on('console', msg => console.log('LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('ERR:', err.message));

  await page.goto('/src/business-topics.html');
  await page.waitForTimeout(3000);

  // Check all global functions
  const globals = await page.evaluate(() => ({
    loadTopics: typeof loadTopics,
    loadIssues: typeof loadIssues,
    init: typeof init,
    renderTable: typeof renderTable,
    bindDelegatedEvents: typeof bindDelegatedEvents,
  }));
  console.log('Globals:', globals);
});
