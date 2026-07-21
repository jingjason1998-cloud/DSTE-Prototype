import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('top nav has 6 phases', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    const navLinks = page.locator('.top-nav-links li');
    await expect(navLinks).toHaveCount(6);
    await expect(page.locator('.top-nav-links')).toContainText('驾驶舱');
    await expect(page.locator('.top-nav-links')).toContainText('SP');
    await expect(page.locator('.top-nav-links')).toContainText('BP');
    await expect(page.locator('.top-nav-links')).toContainText('执行');
    await expect(page.locator('.top-nav-links')).toContainText('评估');
    await expect(page.locator('.top-nav-links')).toContainText('AI');
  });

  test('sidebar renders for dashboard phase', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    const sidebar = page.locator('#sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toContainText('驾驶舱概览');
    await expect(sidebar).toContainText('战略地图');
    await expect(sidebar).toContainText('KPI 看板');
  });

  test('clicking SP nav updates sidebar', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('.top-nav-item[data-phase="sp"]').click();
    await expect(page.locator('#sidebar')).toContainText('战略制定');
    await expect(page.locator('#sidebar')).toContainText('战略地图');
    await expect(page.locator('#sidebar')).toContainText('战略洞察');
    await expect(page.locator('#sidebar')).toContainText('战略专题管理');
  });

  test('EXE phase sidebar shows 组织绩效管理 group with sub pages', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    const sidebar = page.locator('#sidebar');
    await expect(sidebar).toContainText('组织绩效管理');
    await expect(sidebar).toContainText('KPI管理');
    await expect(sidebar).toContainText('重点工作管理');
    await expect(sidebar).toContainText('经营分析报表中心');
  });

  test('EXE phase sidebar group can be collapsed/expanded', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    const group = page.locator('.sidebar-group').filter({ hasText: '组织绩效管理' }).first();
    const title = group.locator('.sidebar-group-title');
    await expect(title).toBeVisible();

    // 默认展开，子项可见
    await expect(group.locator('.sidebar-item[data-page="exe/kpi"]')).toBeVisible();

    // 点击标题折叠
    await title.click();
    await page.waitForTimeout(200);
    await expect(group.locator('.sidebar-item[data-page="exe/kpi"]')).not.toBeVisible();
    expect((await title.innerHTML()).includes('<svg')).toBe(true);

    // 再次点击展开
    await title.click();
    await page.waitForTimeout(200);
    await expect(group.locator('.sidebar-item[data-page="exe/kpi"]')).toBeVisible();
    expect((await title.innerHTML()).includes('<svg')).toBe(true);
  });

  test('navigate to key task management from sidebar', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    await page.locator('.sidebar-item[data-page="exe/tasks"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.page-title')).toContainText('重点工作管理');
    await expect(page.locator('.breadcrumb')).toContainText('组织绩效管理');
  });

  test('theme toggle works', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.locator('#theme-toggle').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('Page Content', () => {
  test('dashboard shows KPI cards', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await expect(page.locator('.page-content')).toContainText('营收增长率');
    await expect(page.locator('.page-content')).toContainText('客户满意度');
    await expect(page.locator('.page-content')).toContainText('重点工作完成率');
  });

  test('roadmap page accessible from sidebar', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('.sidebar-item[data-page="dashboard/roadmap"]').click();
    await expect(page.locator('.page-content')).toContainText('开发路线图');
    await expect(page.locator('.page-content')).toContainText('Road Map');
  });

  test('rule engine page accessible from sidebar', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('.sidebar-item[data-page="admin/rule-engine"]').click();
    await page.waitForURL(/rule-engine\.html/);
    await expect(page.locator('.re-page-title')).toContainText('规则引擎中心');
    await expect(page.locator('.re-rule-grid')).toBeVisible();
  });

  test('alert hub placeholder accessible from sidebar', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('.sidebar-item[data-page="admin/alert-hub"]').click();
    await expect(page.locator('.page-content')).toContainText('预警中心');
    await expect(page.locator('.page-content')).toContainText('预警事件');
  });

  test('requirement pool page accessible from sidebar', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('.sidebar-item[data-page="admin/requirement-pool"]').click();
    await page.waitForURL(/requirement-pool\.html/);
    await expect(page.locator('.req-page-title')).toContainText('需求管理中心');
    await expect(page.locator('.req-table')).toBeVisible();
  });
});

test.describe('External Pages', () => {
  test('reviewer page loads', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    await expect(page.locator('body')).toContainText('会议材料审核');
  });

  test('business-topics page loads', async ({ page }) => {
    await page.goto('/src/business-topics.html');
    await expect(page.locator('body')).toContainText('业务专题');
  });
});
