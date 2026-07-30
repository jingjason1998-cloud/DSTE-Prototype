import { test, expect } from '@playwright/test';

const BUDGET_PAGE_URL = '/src/marketing-budget.html';
const REPORT_CENTER_URL = '/src/cockpit.html#exe/report-center';

test.describe('Marketing Budget Execution Monitor', () => {
  test('standalone page loads with KPI cards and P&L table as default view', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(BUDGET_PAGE_URL);
    await page.waitForSelector('.budget-kpi-card', { timeout: 30000 });

    await expect(page.locator('.page-title')).toContainText('营销线预算执行监控表');
    await expect(page.locator('.budget-kpi-card')).toHaveCount(6);

    // 默认展示损益主表 tab
    await expect(page.locator('.budget-view-tab[data-view="table"]')).toHaveClass(/active/);
    const rowCount = await page.locator('#budget-tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);

    // 切到图表速览 tab，懒加载 4 张图表
    await page.locator('.budget-view-tab[data-view="charts"]').click();
    await expect(page.locator('.budget-view-tab[data-view="charts"]')).toHaveClass(/active/);
    await expect(page.locator('.budget-chart-box')).toHaveCount(4);
    await page.waitForSelector('#chart-waterfall canvas', { timeout: 10000 });

    // 切回损益主表，表格状态保留
    await page.locator('.budget-view-tab[data-view="table"]').click();
    await expect(page.locator('.budget-view-tab[data-view="table"]')).toHaveClass(/active/);
    await expect(page.locator('#budget-tbody tr').first()).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('row drawer opens and shows tabs', async ({ page }) => {
    await page.goto(BUDGET_PAGE_URL);
    await page.waitForSelector('#budget-tbody tr', { timeout: 30000 });

    // Click the first data row (skip header twisty)
    const firstRow = page.locator('#budget-tbody tr').first();
    await firstRow.click();

    await expect(page.locator('#budgetDrawer')).toBeVisible();
    await expect(page.locator('#drawerTitle')).not.toBeEmpty();
    await expect(page.locator('[data-dtab="summary"]')).toHaveClass(/active/);

    // Switch to tasks tab
    await page.locator('[data-dtab="tasks"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('[data-dtab="tasks"]')).toHaveClass(/active/);

    // Close drawer
    await page.locator('[data-action="close-drawer"]').click();
    await expect(page.locator('#budgetDrawer')).toBeHidden();
  });

  test('upload modal opens and closes', async ({ page }) => {
    await page.goto(BUDGET_PAGE_URL);
    await page.waitForSelector('.page-title', { timeout: 30000 });

    await page.locator('[data-action="open-upload"]').click();
    await expect(page.locator('#uploadModal')).toBeVisible();

    await page.locator('#uploadModal .modal-close').click();
    await expect(page.locator('#uploadModal')).toBeHidden();
  });

  test('expand/collapse toggles table rows', async ({ page }) => {
    await page.goto(BUDGET_PAGE_URL);
    await page.waitForSelector('#budget-tbody tr', { timeout: 30000 });

    const initialCount = await page.locator('#budget-tbody tr').count();
    await page.locator('[data-action="collapse-all"]').click();
    await page.waitForTimeout(300);
    const collapsedCount = await page.locator('#budget-tbody tr').count();

    expect(collapsedCount).toBeLessThanOrEqual(initialCount);

    await page.locator('[data-action="expand-all"]').click();
    await page.waitForTimeout(300);
    const expandedCount = await page.locator('#budget-tbody tr').count();
    expect(expandedCount).toBeGreaterThanOrEqual(collapsedCount);
  });

  test('embedded mode hides top nav and sidebar', async ({ page }) => {
    await page.goto(`${BUDGET_PAGE_URL}?embed=1`);
    await page.waitForSelector('.budget-workspace', { timeout: 30000 });

    const topNavDisplay = await page.evaluate(() => {
      const el = document.querySelector('.top-nav');
      return el ? getComputedStyle(el).display : 'not found';
    });
    const sidebarDisplay = await page.evaluate(() => {
      const el = document.querySelector('.sidebar');
      return el ? getComputedStyle(el).display : 'not found';
    });

    expect(topNavDisplay).toBe('none');
    expect(sidebarDisplay).toBe('none');
    // 内嵌模式下页内大标题被隐藏，由报表中心外层顶栏显示报表名
    await expect(page.locator('.page-title')).toBeHidden();
  });

  test('cockpit report center opens marketing budget in iframe without nested shell', async ({ page }) => {
    await page.goto('/src/cockpit.html#exe/report-center');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    // Switch to IOC平台 category via sidebar
    await page.locator('.sidebar-item').filter({ hasText: 'IOC平台' }).click();
    await page.waitForTimeout(500);

    // Click the marketing-budget report card's "在页面中查看" button
    await page.locator('button[onclick="openReport(\'fr-marketing-budget\')"]').evaluate(el => el.click());
    await page.waitForTimeout(1500);

    const iframe = page.locator('#report-center-iframe');
    await expect(iframe).toBeVisible();
    const src = await iframe.getAttribute('src');
    expect(src).toContain('marketing-budget.html');
    expect(src).toContain('embed=1');

    const budgetFrame = page.frames().find(f => f.url().includes('marketing-budget'));
    expect(budgetFrame).toBeDefined();
    // 内嵌模式下页内大标题由报表中心外层顶栏替代
    await expect(budgetFrame.locator('.page-title')).toBeHidden();

    const topNavDisplay = await budgetFrame.evaluate(() => {
      const el = document.querySelector('.top-nav');
      return el ? getComputedStyle(el).display : 'not found';
    });
    expect(topNavDisplay).toBe('none');

    // iframe 铺满 report-center-container（container 已按剩余视口高度填充）
    const layout = await page.evaluate(() => {
      const c = document.getElementById('report-center-container');
      const f = document.getElementById('report-center-iframe');
      return {
        containerStyleHeight: c?.style.height || '',
        containerHeight: c?.getBoundingClientRect().height || 0,
        iframeHeight: f?.getBoundingClientRect().height || 0,
      };
    });
    expect(layout.containerStyleHeight).not.toBe('');
    expect(Math.abs(layout.iframeHeight - layout.containerHeight)).toBeLessThan(4); // 2px tolerance for container borders
  });
});
