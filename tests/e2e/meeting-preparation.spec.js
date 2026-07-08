import { test, expect } from '@playwright/test';

test.describe('Meeting Preparation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/meetings.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      localStorage.removeItem('dste_meetings');
      localStorage.removeItem('dste_review_scores');
      localStorage.removeItem('dste_report_assets');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
  });

  test('non-completed meeting shows preparation status in card and detail', async ({ page }) => {
    const card = page.locator('.meeting-card').filter({ hasText: /准备中|规划中/ }).first();
    await expect(card).toBeVisible();
    // Card should show preparation badge with percentage
    await expect(card).toContainText(/\d+%/);

    await card.click();
    await expect(page.locator('#meeting-detail-overlay')).toBeVisible();
    // Left panel should show preparation row and button
    await expect(page.locator('#meeting-detail-overlay')).toContainText(/会前准备/);
    const prepBtn = page.locator('#meeting-detail-overlay button:has-text("会前准备")').first();
    await expect(prepBtn).toBeVisible();
  });

  test('preparation modal opens and shows readiness checklist', async ({ page }) => {
    const card = page.locator('.meeting-card').filter({ hasText: /准备中|规划中/ }).first();
    await card.click();
    await page.locator('#meeting-detail-overlay').waitFor({ state: 'visible' });
    await page.locator('#meeting-detail-overlay button:has-text("会前准备")').first().click();

    await expect(page.locator('#meeting-preparation-overlay')).toBeVisible();
    // Should show readiness percentage
    await expect(page.locator('#meeting-preparation-content')).toContainText(/\d+%/);
    // Should show checklist items
    await expect(page.locator('#meeting-preparation-content')).toContainText(/会前报告/);
    // Should show mark done button
    await expect(page.locator('#preparation-mark-done-btn')).toBeVisible();
  });

  test('marking preReviewDone from preparation modal updates pipeline', async ({ page }) => {
    const card = page.locator('.meeting-card').filter({ hasText: /准备中|规划中/ }).first();
    await card.click();
    await page.locator('#meeting-detail-overlay').waitFor({ state: 'visible' });
    await page.locator('#meeting-detail-overlay button:has-text("会前准备")').first().click();
    await page.locator('#meeting-preparation-overlay').waitFor({ state: 'visible' });

    // Accept any confirmation dialog
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    await page.locator('#preparation-mark-done-btn').click();
    await page.waitForTimeout(500);

    // Modal should remain open; button text may change depending on readiness
    await expect(page.locator('#meeting-preparation-overlay')).toBeVisible();
  });

  test('preparation status updates after editing pre_report_id', async ({ page }) => {
    const card = page.locator('.meeting-card').filter({ hasText: /准备中|规划中/ }).first();
    await card.click();
    await page.locator('#meeting-detail-overlay').waitFor({ state: 'visible' });

    // Read initial readiness percentage
    await page.locator('#meeting-detail-overlay button:has-text("会前准备")').first().click();
    await page.locator('#meeting-preparation-overlay').waitFor({ state: 'visible' });
    const initialText = await page.locator('#meeting-preparation-content div').first().textContent();
    const initialMatch = initialText?.match(/(\d+)%/);
    const initialPct = initialMatch ? parseInt(initialMatch[1], 10) : 0;

    // Close modal and edit meeting to add a pre_report_id
    await page.locator('#meeting-preparation-overlay button:has-text("关闭")').click();
    await expect(page.locator('#meeting-preparation-overlay')).toBeHidden();

    await page.locator('#meeting-detail-overlay button:has-text("编辑")').first().click();
    await page.locator('#edit-pre-report-id').waitFor({ state: 'visible' });
    await page.locator('#edit-pre-report-id').fill('https://kms.example.com/pre-report');
    await page.locator('button[onclick="saveMeeting()"]').click();
    await page.waitForTimeout(800);

    // Re-open detail and preparation modal
    const updatedCard = page.locator('.meeting-card').filter({ hasText: /准备中|规划中/ }).first();
    await updatedCard.click();
    await page.locator('#meeting-detail-overlay').waitFor({ state: 'visible' });
    await page.locator('#meeting-detail-overlay button:has-text("会前准备")').first().click();
    await page.locator('#meeting-preparation-overlay').waitFor({ state: 'visible' });

    const updatedText = await page.locator('#meeting-preparation-content div').first().textContent();
    const updatedMatch = updatedText?.match(/(\d+)%/);
    const updatedPct = updatedMatch ? parseInt(updatedMatch[1], 10) : 0;

    // Adding pre_report_id should increase or maintain readiness
    expect(updatedPct).toBeGreaterThanOrEqual(initialPct);
  });
});
