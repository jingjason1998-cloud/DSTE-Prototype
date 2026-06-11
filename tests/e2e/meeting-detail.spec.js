import { test, expect } from '@playwright/test';

test.describe('Meeting Detail View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/meetings.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
  });

  test('clicking meeting card opens detail overlay', async ({ page }) => {
    const card = page.locator('.meeting-card').first();
    await expect(card).toBeVisible();
    await card.scrollIntoViewIfNeeded();
    await card.click();

    const overlay = page.locator('#meeting-detail-overlay');
    await expect(overlay).toBeVisible();
  });

  test('detail overlay shows meeting title', async ({ page }) => {
    const card = page.locator('.meeting-card').first();
    await card.scrollIntoViewIfNeeded();
    await card.click();

    const headerLeft = page.locator('#meeting-detail-header-left');
    await expect(headerLeft).not.toBeEmpty();
    const text = await headerLeft.textContent();
    expect(text.length).toBeGreaterThan(0);
  });

  test('detail overlay has sections without tabs', async ({ page }) => {
    const card = page.locator('.meeting-card').first();
    await card.scrollIntoViewIfNeeded();
    await card.click();

    // Agenda section should be visible
    await expect(page.locator('text=会议议程').first()).toBeVisible();
    // Actions section should be visible
    await expect(page.locator('text=行动项').first()).toBeVisible();
    // Decisions section should be visible
    await expect(page.locator('text=决议').first()).toBeVisible();
    // Meeting chain section should be visible
    await expect(page.locator('text=会议链').first()).toBeVisible();
    // Old tab buttons should NOT exist
    await expect(page.locator('.meeting-tab-btn').first()).not.toBeVisible();
  });

  test('no JavaScript errors when opening detail', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const card = page.locator('.meeting-card').first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForTimeout(300);

    expect(errors).toEqual([]);
  });

  test('clicking each meeting card opens its detail', async ({ page }) => {
    const cards = page.locator('.meeting-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 3); i++) {
      const card = cards.nth(i);
      await card.scrollIntoViewIfNeeded();
      await card.click();
      const overlay = page.locator('#meeting-detail-overlay');
      await expect(overlay).toBeVisible();

      const headerLeft = page.locator('#meeting-detail-header-left');
      const text = await headerLeft.textContent();
      expect(text.length).toBeGreaterThan(0);

      // Close detail
      await page.locator('#meeting-detail-overlay button[onclick="closeMeetingDetail()"]').click();
      await expect(overlay).toBeHidden();
    }
  });

  test('clicking tab button inside card should NOT open detail', async ({ page }) => {
    // Find first card with tabs
    const card = page.locator('.meeting-card').first();
    await card.scrollIntoViewIfNeeded();
    const tabBtn = card.locator('button').first();
    
    if (await tabBtn.isVisible().catch(() => false)) {
      await tabBtn.click();
      // Tab switching should not open the full detail overlay
      const overlay = page.locator('#meeting-detail-overlay');
      await expect(overlay).toBeHidden();
    }
  });
});
