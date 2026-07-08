import { test, expect } from '@playwright/test';

test.describe('Meeting Evaluation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/meetings.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    // Ensure mock data is used by clearing any stale localStorage
    await page.evaluate(() => localStorage.removeItem('dste_meetings'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
  });

  test('completed meeting shows eval button in detail view', async ({ page }) => {
    // Find a completed meeting card
    const card = page.locator('.meeting-card').filter({ hasText: /已完成/ }).first();
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.locator('#meeting-detail-overlay')).toBeVisible();
    // Left panel should show eval button
    const evalBtn = page.locator('#meeting-detail-overlay button:has-text("⭐ 评估会议"), #meeting-detail-overlay button:has-text("⭐ 重新评估")').first();
    await expect(evalBtn).toBeVisible();
  });

  test('in-progress meeting does not show eval button', async ({ page }) => {
    const card = page.locator('.meeting-card').filter({ hasText: /准备中/ }).first();
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.locator('#meeting-detail-overlay')).toBeVisible();
    const evalBtn = page.locator('#meeting-detail-overlay button:has-text("⭐ 评估会议")');
    await expect(evalBtn).toHaveCount(0);
  });

  test('eval modal opens with AI recommended score', async ({ page }) => {
    const card = page.locator('.meeting-card').filter({ hasText: /已完成/ }).first();
    await card.click();
    await page.locator('#meeting-detail-overlay').waitFor({ state: 'visible' });
    await page.locator('#meeting-detail-overlay button:has-text("⭐ 评估会议"), #meeting-detail-overlay button:has-text("⭐ 重新评估")').first().click();
    await expect(page.locator('#meeting-eval-overlay')).toBeVisible();
    // Should show overall score
    const scoreDisplay = page.locator('#eval-overall-display');
    await expect(scoreDisplay).toContainText(/[0-9]+/);
    // Should show dimension sliders (3 stages: before / during / after)
    const sliders = page.locator('#eval-dimensions input[type="range"]');
    await expect(sliders).toHaveCount(3);
    // Should show tags
    const tagCount = await page.locator('#eval-tags button').count();
    expect(tagCount).toBeGreaterThan(0);
  });

  test('can save evaluation and reflect in detail', async ({ page }) => {
    const card = page.locator('.meeting-card').filter({ hasText: /已完成/ }).first();
    await card.click();
    await page.locator('#meeting-detail-overlay').waitFor({ state: 'visible' });
    await page.locator('#meeting-detail-overlay button:has-text("⭐ 评估会议"), #meeting-detail-overlay button:has-text("⭐ 重新评估")').first().click();
    await page.locator('#meeting-eval-overlay').waitFor({ state: 'visible' });

    // Adjust the first slider (会前, max 35)
    const slider = page.locator('#eval-dimensions input[type="range"]').first();
    await slider.fill('30');
    await page.waitForTimeout(200);

    // Set up dialog listener before clicking save
    let dialogMsg = '';
    page.on('dialog', async dialog => {
      dialogMsg = dialog.message();
      await dialog.accept();
    });
    // Save
    await page.locator('button:has-text("保存评估")').click();
    await expect(page.locator('#meeting-eval-overlay')).toBeHidden();
    await page.waitForTimeout(500);
    // 当前实现使用 toast 提示保存成功，而非 alert
    await expect(page.locator('#dste-toast-container')).toContainText('评估已保存');
  });

  test('eval tab shows score with progress bars when evaluated', async ({ page }) => {
    // This test depends on a meeting that already has effectiveness in mock data
    // Find a completed meeting card that shows a score (e.g. 92)
    const card = page.locator('.meeting-card').filter({ hasText: /综合评分\s*9/ }).first();
    await card.click();
    await page.locator('#meeting-detail-overlay').waitFor({ state: 'visible' });
    // Eval section should be visible directly (no tab needed in detail view)
    await expect(page.locator('#meeting-detail-content')).toContainText(/综合评分/);
    // Should show progress bars (3 stage bars inside eval section)
    const bars = page.locator('#detail-eval [style*="height: 4px"]').filter({ has: page.locator('[style*="transition"]') });
    await expect(bars).toHaveCount(3);
  });
});
