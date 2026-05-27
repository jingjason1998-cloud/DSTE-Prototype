import { test, expect } from '@playwright/test';
const BASE_URL = '/src/business-topics.html';

test('form modal cancel button closes modal', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForSelector('#topicTableBody tr');

  await page.locator('[data-action="edit"]').first().click();
  await page.waitForTimeout(300);
  await expect(page.locator('#formModal')).toBeVisible();

  await page.locator('[data-modal-close="formModal"]').first().click();
  await page.waitForTimeout(300);
  await expect(page.locator('#formModal')).not.toBeVisible();
});

test('form modal add milestone button works', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForSelector('#topicTableBody tr');

  await page.locator('[data-action="edit"]').first().click();
  await page.waitForTimeout(300);

  await page.locator('[data-ms-action="add"]').click();
  await page.waitForTimeout(300);

  const milestoneRows = page.locator('#formMilestones .milestone-row');
  await expect(milestoneRows).toHaveCount(1);
});

test('delete modal cancel button closes modal', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForSelector('#topicTableBody tr');

  await page.locator('[data-action="delete"]').first().click();
  await page.waitForTimeout(300);
  await expect(page.locator('#deleteModal')).toBeVisible();

  await page.locator('[data-modal-close="deleteModal"]').first().click();
  await page.waitForTimeout(300);
  await expect(page.locator('#deleteModal')).not.toBeVisible();
});
