import { test, expect } from '@playwright/test';

/**
 * Meetings 页面 Smoke 测试
 * 覆盖核心数据链路，作为数据层重构的安全网。
 * 不写数据，所有用例可并行执行。
 */

test.describe('Meetings Page Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // 强制走 mock 数据路径，避免本地 localStorage 污染导致断言不稳定
    await page.goto('/src/meetings.html');
    await page.evaluate(() => {
      localStorage.removeItem('dste_meetings');
      localStorage.removeItem('dste_resolutions_v2');
      localStorage.removeItem('dste_review_scores');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
  });

  test('page loads with meeting cards and no JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await expect(page.locator('.meeting-card').first()).toBeVisible();
    await expect(page.locator('text=本月会议').first()).toBeVisible();
    await expect(page.locator('text=决议总数').first()).toBeVisible();
    await expect(page.locator('text=效果评分').first()).toBeVisible();
    await expect(page.locator('button:has-text("新建会议")')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('mock meetings are loaded into runtime data', async ({ page }) => {
    const seedCheck = await page.evaluate(() => {
      const meetings = window._meetingsData || [];
      return {
        meetingCount: Array.isArray(meetings) ? meetings.length : 0,
      };
    });

    expect(seedCheck.meetingCount).toBeGreaterThan(0);
  });

  test('clicking first meeting card opens detail overlay', async ({ page }) => {
    const card = page.locator('.meeting-card').first();
    await card.scrollIntoViewIfNeeded();
    await card.click();

    const overlay = page.locator('#meeting-detail-overlay');
    await expect(overlay).toBeVisible();
    await expect(page.locator('#meeting-detail-header-left')).not.toBeEmpty();
    await expect(page.locator('text=会议议程').first()).toBeVisible();
    await expect(page.locator('text=行动项').first()).toBeVisible();
    await expect(page.locator('text=决议').first()).toBeVisible();
  });

  test('clicking resolution total opens decisions drawer', async ({ page }) => {
    await page.locator('text=决议总数').first().click();

    const drawer = page.locator('#decisions-list');
    await expect(drawer).toBeVisible();
    await expect(page.locator('text=决议中心').first()).toBeVisible();
    await expect(drawer.filter({ hasText: /共 \d+ 项/ })).toBeVisible();
  });

  test('clicking pending actions stat opens pending actions drawer', async ({ page }) => {
    const statCard = page.locator('[data-stat="pending-actions"]');
    await expect(statCard).toBeVisible();
    await statCard.click();

    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('[data-pending-action]').first()).toBeVisible();

    await page.locator('#pending-actions-drawer button[onclick="closePendingActionsDrawer()"]').click();
    await expect(drawer).toBeHidden();
  });

  test('new meeting button opens editor overlay', async ({ page }) => {
    await page.getByRole('button', { name: /新建会议/ }).click();

    const overlay = page.locator('#meeting-editor-overlay');
    await expect(overlay).toBeVisible();
    await expect(page.locator('#edit-title')).toBeVisible();

    // 取消关闭
    await page.locator('#meeting-editor-overlay button').filter({ hasText: '取消' }).first().click();
    await expect(overlay).toBeHidden();
  });

  test('calendar/list view toggle works', async ({ page }) => {
    const toggleBtn = page.locator('#btn-toggle-view');
    await expect(toggleBtn).toBeVisible();

    await toggleBtn.click();
    await page.waitForTimeout(150);
    await expect(page.locator('#meetings-calendar-panel')).toBeVisible();
    await expect(page.locator('#meetings-list-panel')).toBeHidden();

    await toggleBtn.click();
    await page.waitForTimeout(150);
    await expect(page.locator('#meetings-list-panel')).toBeVisible();
    await expect(page.locator('#meetings-calendar-panel')).toBeHidden();
  });
});
