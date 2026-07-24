import { test, expect } from '@playwright/test';

/**
 * meetings.html embed 模式测试
 * 验证 ?embed=1 参数正确隐藏导航栏和侧边栏
 */

test.describe('meetings.html embed 模式', () => {
  test('默认模式显示顶部导航', async ({ page }) => {
    await page.goto('/src/meetings.html');
    await page.waitForTimeout(1000);
    const topNav = page.locator('.top-nav');
    await expect(topNav).toBeVisible();
  });

  test('默认模式显示侧边栏', async ({ page }) => {
    await page.goto('/src/meetings.html');
    await page.waitForTimeout(1000);
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();
  });

  test('embed=1 隐藏顶部导航', async ({ page }) => {
    await page.goto('/src/meetings.html?embed=1');
    await page.waitForTimeout(1000);
    const topNav = page.locator('.top-nav');
    await expect(topNav).toBeHidden();
  });

  test('embed=1 隐藏侧边栏', async ({ page }) => {
    await page.goto('/src/meetings.html?embed=1');
    await page.waitForTimeout(1000);
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeHidden();
  });

  test('embed=1 内容区占满全宽', async ({ page }) => {
    await page.goto('/src/meetings.html?embed=1');
    await page.waitForTimeout(1000);
    const contentArea = page.locator('.content-area');
    const box = await contentArea.boundingBox();
    expect(box.width).toBeGreaterThan(1000);
  });

  test('embed=1 经营分析会标题可见', async ({ page }) => {
    await page.goto('/src/meetings.html?embed=1');
    await page.waitForTimeout(1000);
    await expect(page.locator('h1.page-title').filter({ hasText: '经营分析会' })).toBeVisible();
  });
});
