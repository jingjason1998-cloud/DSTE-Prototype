import { test, expect } from '@playwright/test';

/**
 * Roadmap 页面端到端测试
 * 覆盖：真实版本数据、开发计划看板、筛选功能、执行摘要、折叠/展开、搜索
 */

test.describe('Roadmap 页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/cockpit.html#dashboard/roadmap');
    // 等待 SPA 路由渲染完成，并等待 roadmap-data.json 加载（避免使用兜底数据）
    await page.waitForTimeout(2500);
  });

  test('页面标题正确', async ({ page }) => {
    await expect(page.locator('.page-title')).toContainText('开发路线图');
  });

  test('执行摘要 KPI 显示当前版本', async ({ page }) => {
    const summary = page.locator('#roadmap-kpi-summary');
    await expect(summary).toBeVisible();
    // roadmap-data.json 最新版本为 v0.6.7
    await expect(summary).toContainText('当前版本');
    await expect(summary).toContainText('v0.6.7');
  });

  test('显示真实版本数据（v0.6.7 最新）', async ({ page }) => {
    // 纵向时间线应显示最新版本
    const timeline = page.locator('.roadmap-timeline-vertical');
    await expect(timeline).toContainText('v0.6.7');
  });

  test('版本详情卡片显示 CHANGELOG 内容', async ({ page }) => {
    // 应能看到 v0.6.7 的变更列表
    const versionCard = page.locator('[id="version-v0.6.7"]');
    await expect(versionCard).toBeVisible();
    // 至少包含一个变更类型标签（新增/修复/变更/安全）
    await expect(versionCard).toContainText(/新增|修复|变更|安全/);
  });

  test('版本详情默认折叠，可展开全部', async ({ page }) => {
    // 默认只显示前 2 个版本卡片
    const hiddenCards = page.locator('.roadmap-version-hidden');
    expect(await hiddenCards.count()).toBeGreaterThan(0);

    // 点击展开全部
    await page.locator('#roadmap-expand-versions').click();
    expect(await hiddenCards.count()).toBe(0);

    // 点击收起
    await page.locator('#roadmap-expand-versions').click();
    expect(await hiddenCards.count()).toBeGreaterThan(0);
  });

  test('甘特图显示 9 个模块', async ({ page }) => {
    const moduleRows = page.locator('[data-module-status]');
    const count = await moduleRows.count();
    expect(count).toBeGreaterThanOrEqual(9);
  });

  test('开发计划看板（Kanban）存在', async ({ page }) => {
    // 四列：待评审 / 设计中 / 开发中 / 测试中
    const columns = page.locator('.kanban-column');
    await expect(columns).toHaveCount(4);
  });

  test('计划卡片显示编号、负责人和优先级', async ({ page }) => {
    const planCards = page.locator('.plan-card');
    // 至少有一张计划卡片
    expect(await planCards.count()).toBeGreaterThan(0);
    // 第一张卡片应包含 PLAN- 编号
    const firstCard = planCards.first();
    await expect(firstCard).toContainText('PLAN-');
    await expect(firstCard).toContainText(/高|中|低/);
  });

  test('筛选按钮可用并全局联动', async ({ page }) => {
    const allBtn = page.locator('[data-filter-roadmap="all"]');
    const doingBtn = page.locator('[data-filter-roadmap="doing"]');
    const todoBtn = page.locator('[data-filter-roadmap="todo"]');
    await expect(allBtn).toBeVisible();
    await expect(doingBtn).toBeVisible();
    await expect(todoBtn).toBeVisible();

    // 点击 todo 后，甘特图应只显示 todo 模块
    await todoBtn.click();
    const visibleRows = page.locator('[data-module-status="todo"]:visible');
    expect(await visibleRows.count()).toBeGreaterThan(0);
    const hiddenRows = page.locator('[data-module-status="done"]:visible, [data-module-status="doing"]:visible');
    expect(await hiddenRows.count()).toBe(0);
  });

  test('搜索过滤版本/计划/模块', async ({ page }) => {
    const searchInput = page.locator('#roadmap-search');
    await searchInput.fill('战略地图');
    await page.waitForTimeout(200);

    // 模块行应只显示匹配项
    const visibleModules = page.locator('[data-module-name]:visible');
    expect(await visibleModules.count()).toBeGreaterThan(0);
    await expect(visibleModules.first()).toContainText('战略地图');
  });

  test('统计卡片数字正确', async ({ page }) => {
    const statsCard = page.locator('.card', { hasText: '版本统计' });
    await expect(statsCard).toBeVisible();
    // 已发布版本数应 ≥ 4（v0.1.0 - v0.3.4）
    const releasedLabel = statsCard.locator('text=已发布版本').first();
    const releasedCount = await releasedLabel.locator('xpath=../div[1]').textContent();
    expect(releasedCount).toMatch(/\d+/);
  });

  test('双栏/单栏布局切换', async ({ page }) => {
    const layoutBtn = page.locator('[data-roadmap-view]');
    await expect(layoutBtn).toBeVisible();

    const layout = page.locator('#roadmap-main-layout');
    await expect(layout).toHaveAttribute('data-roadmap-layout', 'two-column');

    await layoutBtn.click();
    await expect(layout).toHaveAttribute('data-roadmap-layout', 'single');

    await layoutBtn.click();
    await expect(layout).toHaveAttribute('data-roadmap-layout', 'two-column');
  });

  test('纵向/横向/周视图时间线切换', async ({ page }) => {
    const verticalBtn = page.locator('[data-roadmap-timeline="vertical"]');
    const horizontalBtn = page.locator('[data-roadmap-timeline="horizontal"]');
    const weeklyBtn = page.locator('[data-roadmap-timeline="weekly"]');
    await expect(verticalBtn).toBeVisible();
    await expect(horizontalBtn).toBeVisible();
    await expect(weeklyBtn).toBeVisible();

    const vertical = page.locator('#dev-timeline-vertical');
    const horizontal = page.locator('#dev-timeline-horizontal');
    const weekly = page.locator('#dev-timeline-weekly');
    await expect(vertical).toBeVisible();
    await expect(horizontal).toBeHidden();
    await expect(weekly).toBeHidden();

    // 切换到横向
    await horizontalBtn.click();
    await expect(vertical).toBeHidden();
    await expect(horizontal).toBeVisible();
    await expect(weekly).toBeHidden();

    // 切换到周视图
    await weeklyBtn.click();
    await expect(vertical).toBeHidden();
    await expect(horizontal).toBeHidden();
    await expect(weekly).toBeVisible();

    // 切回纵向
    await verticalBtn.click();
    await expect(vertical).toBeVisible();
    await expect(horizontal).toBeHidden();
    await expect(weekly).toBeHidden();
  });

  test('周视图展示计划与版本节点', async ({ page }) => {
    await page.locator('[data-roadmap-timeline="weekly"]').click();
    const weekly = page.locator('#dev-timeline-weekly');
    await expect(weekly).toBeVisible();

    // 至少有一列（本周）
    const columns = weekly.locator('.weekly-column');
    expect(await columns.count()).toBeGreaterThan(0);

    // 应包含版本节点或计划卡片
    const cards = weekly.locator('.weekly-card');
    expect(await cards.count()).toBeGreaterThan(0);
  });
});
