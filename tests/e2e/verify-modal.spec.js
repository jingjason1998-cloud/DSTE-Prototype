import { test, expect } from '@playwright/test';
const BASE_URL = '/src/business-topics.html';

test('form modal cancel button closes modal', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForSelector('#topicTableBody tr');

  await page.locator('[data-action="edit"]').first().click();
  await page.waitForTimeout(300);
  await expect(page.locator('#formModal')).toBeVisible();

  await page.locator('#formModal .modal-close').first().click();
  await page.waitForTimeout(300);
  await expect(page.locator('#formModal')).not.toBeVisible();
});

test('form modal add milestone button works', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForSelector('#topicTableBody tr');

  await page.locator('[data-action="new-topic"]').click();
  await page.waitForTimeout(300);

  const beforeCount = await page.locator('#formMilestones .milestone-row').count();
  await page.locator('button:has-text("添加里程碑")').click();
  await page.waitForTimeout(300);

  const afterCount = await page.locator('#formMilestones .milestone-row').count();
  expect(afterCount).toBeGreaterThan(beforeCount);
});

test('delete modal cancel button closes modal', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForSelector('#topicTableBody tr');

  await page.locator('[data-action="delete"]').first().click();
  await page.waitForTimeout(300);
  await expect(page.locator('#deleteModal')).toBeVisible();

  await page.locator('#deleteModal button:has-text("取消")').click();
  await page.waitForTimeout(300);
  await expect(page.locator('#deleteModal')).not.toBeVisible();
});
