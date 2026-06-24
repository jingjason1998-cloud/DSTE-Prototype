import { test, expect } from '@playwright/test';

const REPORT_CENTER_URL = '/src/cockpit.html#exe/report-center';

test.describe('经营分析报表中心导航', () => {
  test('EXE 侧边栏显示可折叠的经营分析报表中心分组', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/src/cockpit.html');
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    await page.waitForTimeout(500);

    const group = page.locator('.sidebar-group').filter({ hasText: '经营分析报表中心' }).first();
    await expect(group).toBeVisible();

    // 默认展开：子项可见
    await expect(group.locator('.sidebar-item').filter({ hasText: '报表首页' })).toBeVisible();
    await expect(group.locator('.sidebar-item[data-report-id="fr-001"]')).toBeVisible();
    await expect(group.locator('.sidebar-item[data-report-id="fr-002"]')).toBeVisible();
    await expect(group.locator('.sidebar-item[data-report-id="fr-ioc-platform"]')).toBeVisible();
    await expect(group.locator('.sidebar-item').filter({ hasText: '营销线组织绩效IOC平台' })).toBeVisible();

    // 点击标题折叠
    await group.locator('.sidebar-group-title').click();
    await page.waitForTimeout(200);
    await expect(group.locator('.sidebar-item').filter({ hasText: '报表首页' })).not.toBeVisible();

    // 再次点击展开
    await group.locator('.sidebar-group-title').click();
    await page.waitForTimeout(200);
    await expect(group.locator('.sidebar-item').filter({ hasText: '报表首页' })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('点击报表首页进入经营分析报表中心欢迎页', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/src/cockpit.html');
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    await page.waitForTimeout(500);

    await page.locator('.sidebar-item').filter({ hasText: '报表首页' }).click();
    await page.waitForTimeout(800);

    await expect(page.locator('.page-title')).toContainText('经营分析报表中心');
    await expect(page.locator('.page-content')).toContainText('经营分析报表中心');

    expect(errors).toEqual([]);
  });

  test('点击子报表项进入报表中心并打开对应报表', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    await page.waitForTimeout(500);

    // 点击「国内营销线利润表（新）」
    await page.locator('.sidebar-item[data-report-id="fr-002"]').click();
    await page.waitForTimeout(1000);

    await expect(page.locator('.page-title')).toContainText('经营分析报表中心');
    // 页面应显示报表标题/返回按钮或 iframe 占位
    await expect(page.locator('.page-content')).toContainText('国内营销线利润表（新）');
  });

  test('点击营销线组织绩效IOC平台在 iframe 中加载', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    await page.waitForTimeout(500);

    await page.locator('.sidebar-item[data-report-id="fr-ioc-platform"]').click();
    await page.waitForTimeout(1000);

    await expect(page.locator('.page-title')).toContainText('经营分析报表中心');
    await expect(page.locator('.page-content')).toContainText('营销线组织绩效IOC平台');
    await expect(page.locator('.page-content iframe')).toBeVisible();
  });
});
