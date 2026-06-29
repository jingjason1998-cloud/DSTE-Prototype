/**
 * @file requirement-pool.spec.js
 * 需求管理中心 E2E 测试
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3456/src/requirement-pool.html';

test.describe('需求管理中心', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // 等待页面渲染完成
    await page.waitForSelector('#req-page-container', { timeout: 10000 });
  });

  test('页面标题和基础结构正确', async ({ page }) => {
    await expect(page).toHaveTitle(/需求管理中心/);
    await expect(page.locator('.req-page-title')).toContainText('需求管理中心');
    await expect(page.locator('.req-table')).toBeVisible();
  });

  test('顶部导航和侧边栏样式正确加载', async ({ page }) => {
    const topNavLinks = page.locator('.top-nav-links');
    await expect(topNavLinks).toBeVisible();
    const display = await topNavLinks.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe('flex');

    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();
  });

  test('看板状态管道显示正常', async ({ page }) => {
    await expect(page.locator('.req-pipeline')).toBeVisible();
    await expect(page.locator('.req-pipeline-node')).toHaveCount(8);
    await expect(page.locator('.req-pipeline-node').first()).toContainText('已收集');
    await expect(page.locator('.req-pipeline-node').last()).toContainText('已关闭');
  });

  test('点击状态管道节点可筛选对应状态', async ({ page }) => {
    await page.click('.req-pipeline-node[data-value="ANALYZING"]');
    await expect(page.locator('#req-filter-status')).toHaveValue('ANALYZING');
    // 表格中所有行应为 ANALYZING 状态
    const statusBadges = page.locator('.req-status-badge');
    const count = await statusBadges.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(statusBadges.nth(i)).toContainText('分析中');
    }
  });

  test('筛选栏存在且可交互', async ({ page }) => {
    await expect(page.locator('#req-filter-keyword')).toBeVisible();
    await expect(page.locator('#req-filter-status')).toBeVisible();
    await expect(page.locator('#req-filter-type')).toBeVisible();
    await expect(page.locator('#req-filter-priority')).toBeVisible();
  });

  test('新建需求弹窗可打开和关闭', async ({ page }) => {
    await page.click('[data-req-action="new-requirement"]');
    await expect(page.locator('#req-form-modal')).toBeVisible();
    await expect(page.locator('#req-form-heading')).toContainText('新建需求');
    await page.click('[data-req-action="close-form-modal"]');
    await expect(page.locator('#req-form-modal')).toBeHidden();
  });

  test('可创建新需求并显示在列表中', async ({ page }) => {
    const title = `E2E 测试需求 ${Date.now()}`;

    await page.click('[data-req-action="new-requirement"]');
    await page.fill('input[name="title"]', title);
    await page.fill('textarea[name="description"]', '当前战略地图画布缩放卡顿，影响高管汇报体验，需要优化渲染性能。');
    await page.selectOption('select[name="source"]', 'USER_FEEDBACK');

    // AI 分析
    await page.click('[data-req-action="ai-analyze"]');
    await expect(page.locator('#req-ai-summary')).toContainText('AI 分析结论');

    // 提交
    await page.click('#req-form button[type="submit"]');

    await expect(page.locator('#req-form-modal')).toBeHidden();
    await expect(page.locator('.req-table')).toContainText(title);
  });

  test('AI 分析可基于标题和描述填充建议字段', async ({ page }) => {
    await page.click('[data-req-action="new-requirement"]');
    await page.fill('input[name="title"]', '修复经营分析会决议保存失败的问题');
    await page.fill('textarea[name="description"]', '用户在编辑会议决议后点击保存，偶尔出现数据丢失，需要修复。');

    await page.click('[data-req-action="ai-analyze"]');
    await expect(page.locator('#req-ai-summary')).toContainText('AI 分析结论');

    const typeValue = await page.locator('#req-form-type').inputValue();
    expect(typeValue).toBe('BUG');

    const priorityValue = await page.locator('#req-form-priority').inputValue();
    expect(priorityValue).toBe('P0');

    const problem = await page.locator('#req-form-problem').inputValue();
    expect(problem.length).toBeGreaterThan(0);

    const value = await page.locator('#req-form-value').inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test('未填写标题时 AI 分析给出提示', async ({ page }) => {
    await page.click('[data-req-action="new-requirement"]');
    await page.click('[data-req-action="ai-analyze"]');
    await expect(page.locator('#dste-toast-container')).toContainText('请先填写需求标题');
  });

  test('可查看需求详情', async ({ page }) => {
    // 点击第一条需求的查看按钮
    await page.click('.req-title-cell:first-child');
    await expect(page.locator('#req-detail-modal')).toBeVisible();
    await expect(page.locator('.req-detail-title')).toBeVisible();
    await page.click('[data-req-action="close-detail-modal"]');
    await expect(page.locator('#req-detail-modal')).toBeHidden();
  });

  test('关键词筛选生效', async ({ page }) => {
    await page.fill('#req-filter-keyword', 'REQ-2026-001');
    await page.waitForTimeout(400);
    const rows = page.locator('.req-table tbody tr');
    await expect(rows).toHaveCount(1);
  });

  test('Tab 切换生效', async ({ page }) => {
    await page.click('[data-req-action="switch-tab"][data-tab="mine"]');
    await expect(page.locator('.req-tab.active')).toContainText('我的需求');
  });

  test('重置筛选生效', async ({ page }) => {
    await page.selectOption('#req-filter-status', 'ANALYZING');
    await page.waitForTimeout(200);
    await page.click('[data-req-action="reset-filters"]');
    await expect(page.locator('#req-filter-status')).toHaveValue('all');
  });
});
