import { test, expect } from '@playwright/test';

test('debug event delegation', async ({ page }) => {
  const consoleLogs = [];
  const errors = [];
  page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('/src/business-topics.html');
  await page.waitForTimeout(2000);

  console.log('Console logs:', consoleLogs);
  console.log('Page errors:', errors);

  // Check if main.js loaded
  const hasMainJs = await page.evaluate(() => {
    return typeof window.loadTopics === 'function';
  });
  console.log('loadTopics defined:', hasMainJs);

  // Try clicking
  await page.locator('[data-action="new-topic"]').click();
  await page.waitForTimeout(1000);

  const modalVisible = await page.locator('#formModal').evaluate(el => el.classList.contains('active'));
  console.log('Modal active:', modalVisible);

  expect(errors).toHaveLength(0);
});
