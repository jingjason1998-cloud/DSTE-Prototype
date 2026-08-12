import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Sidebar 最近访问与收藏', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.evaluate(() => {
      localStorage.removeItem('dste-recent-pages-v1');
      localStorage.removeItem('dste-favorite-pages-v1');
      localStorage.removeItem('dste-workspace-tabs-v1');
    });
    await page.reload();
    await page.waitForSelector('.sidebar');
  });

  test('访问页面后出现在「最近访问」分组', async ({ page }) => {
    // 初始无最近访问分组
    await expect(page.locator('.sidebar-quick', { hasText: '最近访问' })).toHaveCount(0);

    // 进入战略执行阶段的 KPI 树页面
    await page.locator('.top-nav-item[data-phase="bp"]').click();
    await page.waitForTimeout(500);

    // 再切到驾驶舱，此时侧边栏应出现「最近访问」且包含刚访问的页面
    await page.locator('.top-nav-item[data-phase="dashboard"]').click();
    await expect(page.locator('.sidebar-quick', { hasText: '最近访问' })).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dste-recent-pages-v1') || '[]'));
    expect(stored.length).toBeGreaterThan(0);
    expect(stored[0]).not.toBe('dashboard');
  });

  test('星标收藏后出现「收藏」分组并持久化', async ({ page }) => {
    const item = page.locator('.sidebar-item[data-page="sp/strategy-map"]').first();
    await item.hover();
    await item.locator('.sidebar-fav').click();

    // 出现收藏分组与收藏态样式
    await expect(page.locator('.sidebar-quick', { hasText: '收藏' })).toBeVisible();
    await expect(page.locator('.sidebar-item.favorited[data-page="sp/strategy-map"]').first()).toBeVisible();

    // 刷新后仍在
    await page.reload();
    await page.waitForSelector('.sidebar');
    await expect(page.locator('.sidebar-quick', { hasText: '收藏' })).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dste-favorite-pages-v1') || '[]'));
    expect(stored).toContain('sp/strategy-map');
  });

  test('再次点击星标取消收藏', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('dste-favorite-pages-v1', JSON.stringify(['sp/strategy-map'])));
    await page.reload();
    await page.waitForSelector('.sidebar');
    await expect(page.locator('.sidebar-quick', { hasText: '收藏' })).toBeVisible();

    const item = page.locator('.sidebar-item[data-page="sp/strategy-map"]').first();
    await item.hover();
    await item.locator('.sidebar-fav').click();

    await expect(page.locator('.sidebar-quick', { hasText: '收藏' })).toHaveCount(0);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dste-favorite-pages-v1') || '[]'));
    expect(stored).not.toContain('sp/strategy-map');
  });

  test('点击星标不触发页面导航', async ({ page }) => {
    const urlBefore = page.url();
    const item = page.locator('.sidebar-item[data-page="sp/strategy-map"]').first();
    await item.hover();
    await item.locator('.sidebar-fav').click();
    await page.waitForTimeout(300);
    expect(page.url()).toBe(urlBefore);
  });
});
