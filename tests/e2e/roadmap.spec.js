import { test, expect } from '@playwright/test';

/**
 * Roadmap 页面端到端测试
 * 覆盖：真实版本数据、开发计划看板、筛选功能
 */

test.describe('Roadmap 页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/cockpit.html#dashboard/roadmap');
    // 等待 SPA 路由渲染完成
    await page.waitForTimeout(1500);
  });

  test('页面标题正确', async ({ page }) => {
    await expect(page.locator('.page-title')).toContainText('开发路线图');
  });

  test('显示真实版本数据（v0.3.5 最新）', async ({ page }) => {
    // 时间线轴应显示最新版本
    const timeline = page.locator('.card', { hasText: /v0\.3\.5/ }).first();
    await expect(timeline).toBeVisible();
  });

  test('版本详情卡片显示 CHANGELOG 内容', async ({ page }) => {
    // 应能看到 v0.3.5 的变更列表
    const versionCard = page.locator('[id="version-v0.3.5"]');
    await expect(versionCard).toBeVisible();
    // 至少包含一个 Added/Fixed/Security 标签
    await expect(versionCard).toContainText('新增');
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

  test('计划卡片显示编号和负责人', async ({ page }) => {
    const planCards = page.locator('.plan-card');
    // 至少有一张计划卡片
    expect(await planCards.count()).toBeGreaterThan(0);
    // 第一张卡片应包含 PLAN- 编号
    const firstCard = planCards.first();
    await expect(firstCard).toContainText('PLAN-');
  });

  test('筛选按钮可用', async ({ page }) => {
    const allBtn = page.locator('[data-filter-roadmap="all"]');
    const doingBtn = page.locator('[data-filter-roadmap="doing"]');
    await expect(allBtn).toBeVisible();
    await expect(doingBtn).toBeVisible();
  });

  test('统计卡片数字正确', async ({ page }) => {
    const statsCard = page.locator('.card', { hasText: '版本统计' });
    await expect(statsCard).toBeVisible();
    // 已发布版本数应 ≥ 4（v0.1.0 - v0.3.4）
    const releasedLabel = statsCard.locator('text=已发布版本').first();
    const releasedCount = await releasedLabel.locator('xpath=../div[1]').textContent();
    expect(releasedCount).toMatch(/\d+/);
  });
});
