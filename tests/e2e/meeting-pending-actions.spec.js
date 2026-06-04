import { test, expect } from '@playwright/test';

test.describe('Pending Actions Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/meetings.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
  });

  test('clicking pending actions stat opens drawer', async ({ page }) => {
    const statCard = page.locator('[data-stat="pending-actions"]');
    await expect(statCard).toBeVisible();
    await statCard.click();

    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();
  });

  test('drawer shows pending action items', async ({ page }) => {
    const statCard = page.locator('[data-stat="pending-actions"]');
    await statCard.click();

    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();

    // Should contain at least one action item row
    const items = drawer.locator('[data-pending-action]');
    expect(await items.count()).toBeGreaterThan(0);
  });

  test('clicking close button hides drawer', async ({ page }) => {
    const statCard = page.locator('[data-stat="pending-actions"]');
    await statCard.click();

    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();

    await page.locator('#pending-actions-drawer button[onclick="closePendingActionsDrawer()"]').click();
    await expect(drawer).toBeHidden();
  });

  test('clicking overlay hides drawer', async ({ page }) => {
    const statCard = page.locator('[data-stat="pending-actions"]');
    await statCard.click();

    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();

    await page.locator('#pending-actions-overlay').click();
    await expect(drawer).toBeHidden();
  });

  test('no JavaScript errors when opening drawer', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const statCard = page.locator('[data-stat="pending-actions"]');
    await statCard.click();
    await page.waitForTimeout(300);

    expect(errors).toEqual([]);
  });
});
