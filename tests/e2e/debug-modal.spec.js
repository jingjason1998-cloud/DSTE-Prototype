import { test, expect } from '@playwright/test';
const BASE_URL = '/src/business-topics.html';

test('trace with debug logs', async ({ page }) => {
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.goto(BASE_URL);
  await page.waitForSelector('#topicTableBody tr');

  console.log('Logs after load:', logs.filter(l => l.includes('[bind') || l.includes('[handle')));

  // Open edit modal
  await page.evaluate(() => {
    document.getElementById('formModal').classList.add('active');
  });

  // Click close button
  await page.locator('#formModal .modal-close').click();
  await page.waitForTimeout(500);

  console.log('All logs:', logs);
});
