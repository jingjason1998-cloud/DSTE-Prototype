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

    // 内嵌报表模式下显示紧凑顶栏，不再渲染 .page-title
    await expect(page.locator('.report-center-compact-title')).toContainText('国内营销线利润表（新）');
    // 页面应显示报表标题/返回按钮或 iframe 占位
    await expect(page.locator('.page-content')).toContainText('国内营销线利润表（新）');
  });

  test('点击营销线组织绩效IOC平台在 iframe 中加载', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    await page.waitForTimeout(500);

    await page.locator('.sidebar-item[data-report-id="fr-ioc-platform"]').click();
    await page.waitForTimeout(1000);

    // 内嵌报表模式下显示紧凑顶栏
    await expect(page.locator('.report-center-compact-title')).toContainText('营销线组织绩效IOC平台');
    await expect(page.locator('.page-content')).toContainText('营销线组织绩效IOC平台');
    await expect(page.locator('.page-content iframe')).toBeVisible();
  });

  test('点击营销线人才能力分布在 iframe 中以 embed 模式加载', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/src/cockpit.html');
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    await page.waitForTimeout(500);

    // 侧边栏直达项
    const item = page.locator('.sidebar-item[data-report-id="fr-capability-map"]');
    await expect(item).toBeVisible();
    await expect(item).toContainText('营销线人才能力分布');
    await item.click();
    await page.waitForTimeout(1000);

    // iframe 以 ?embed=1 加载本地页面
    const iframe = page.locator('#report-center-iframe');
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute('src', /capability-map\.html\?embed=1/);

    // 页面内容渲染（主标题 + 战区数据）
    const frame = iframe.contentFrame();
    await expect(frame.locator('.main-title')).toContainText('人才能力分布');
    await expect(frame.locator('body')).toContainText('华南');

    expect(errors).toEqual([]);
  });

  test('capability-map 页面独立加载', async ({ page }) => {
    await page.goto('/src/capability-map.html');
    await expect(page).toHaveTitle(/2026年营销线人才能力分布/);
    await expect(page.locator('.main-title')).toContainText('人才能力分布');
    // embed 参数应标记到 <html data-embed>
    await page.goto('/src/capability-map.html?embed=1');
    await expect(page.locator('html')).toHaveAttribute('data-embed', 'true');
  });
});
