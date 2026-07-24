import { test, expect } from '@playwright/test';

/**
 * 外部页面 embed 模式测试
 * 验证 ?embed=1 参数正确隐藏导航栏和侧边栏
 */

const EXTERNAL_PAGES = [
  { name: '人员与组织管理', path: '/src/employee-directory.html', title: '人员与组织管理' },
  { name: '片联ST议题跟踪表', path: '/src/st-issue-tracking.html', title: '片联ST议题跟踪表' },
  { name: '片联AT议题跟踪表', path: '/src/at-issue-tracking.html', title: '片联AT议题跟踪表' },
];

for (const pageConfig of EXTERNAL_PAGES) {
  test.describe(`${pageConfig.name} embed 模式`, () => {
    test('默认模式显示顶部导航', async ({ page }) => {
      await page.goto(pageConfig.path);
      await page.waitForTimeout(1000);
      await expect(page.locator('.top-nav')).toBeVisible();
    });

    test('默认模式显示侧边栏', async ({ page }) => {
      await page.goto(pageConfig.path);
      await page.waitForTimeout(1000);
      await expect(page.locator('.sidebar')).toBeVisible();
    });

    test('embed=1 隐藏顶部导航', async ({ page }) => {
      await page.goto(`${pageConfig.path}?embed=1`);
      await page.waitForTimeout(1000);
      await expect(page.locator('.top-nav')).toBeHidden();
    });

    test('embed=1 隐藏侧边栏', async ({ page }) => {
      await page.goto(`${pageConfig.path}?embed=1`);
      await page.waitForTimeout(1000);
      await expect(page.locator('.sidebar')).toBeHidden();
    });

    test('embed=1 内容区占满全宽', async ({ page }) => {
      await page.goto(`${pageConfig.path}?embed=1`);
      await page.waitForTimeout(1000);
      const contentArea = page.locator('.content-area');
      const box = await contentArea.boundingBox();
      expect(box.width).toBeGreaterThan(1000);
    });

    test('embed=1 页面标题可见', async ({ page }) => {
      await page.goto(`${pageConfig.path}?embed=1`);
      await page.waitForTimeout(1000);
      await expect(page.locator('h1').filter({ hasText: pageConfig.title })).toBeVisible();
    });
  });
}
