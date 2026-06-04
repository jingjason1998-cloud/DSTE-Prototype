import { test, expect } from '@playwright/test';
test('check for loadErrors error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('http://localhost:3456/src/business-topics.html', { timeout: 60000 });
  await page.waitForTimeout(2000);
  console.log('Errors:', errors);
  await page.waitForSelector('#topicTableBody tr', { timeout: 30000 });
});
