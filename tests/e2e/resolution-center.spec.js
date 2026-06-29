import { test, expect } from '@playwright/test';

test.describe('Resolution Center Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/meetings.html');
    await page.waitForLoadState('networkidle');
  });

  test('opens drawer and shows 3-status filter pills', async ({ page }) => {
    // 点击 KPI 卡片「决议总数」打开抽屉
    const totalCard = page.locator('text=决议总数').first();
    await expect(totalCard).toBeVisible();
    await totalCard.click();

    // 验证抽屉标题
    await expect(page.locator('text=📋 决议中心').first()).toBeVisible();

    // 验证精简后的 3 状态筛选 pills 存在
    for (const label of ['全部', '待审批', '已通过', '已闭环']) {
      await expect(page.locator('#decisions-list button').filter({ hasText: label })).toBeVisible();
    }

    // 验证统计摘要存在
    await expect(page.locator('#decisions-list').filter({ hasText: /共 \d+ 项/ })).toBeVisible();
  });

  test('filters decisions by status', async ({ page }) => {
    await page.locator('text=决议总数').first().click();
    await expect(page.locator('#decisions-list')).toBeVisible();

    // 点击「已通过」筛选
    await page.locator('#decisions-list button').filter({ hasText: '已通过' }).click();

    // 等待列表重新渲染，验证只显示已通过决议
    const cards = page.locator('#decisions-list > div[style*="border-left: 3px solid"]');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i).locator('select[id^="res-status-"]')).toHaveValue('approved');
    }
  });

  test('advances resolution status from pending to approved', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // 先添加一个待审批的决议
    await page.locator('[data-edit-meeting]').first().click();
    await page.waitForSelector('#edit-title', { state: 'visible' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await page.locator('button:has-text("+ 添加决议")').first().click();
    const decisionInputs = page.locator('#edit-decision-list input[placeholder="决议内容"]');
    const testContent = '决议中心测试_' + Date.now();
    await decisionInputs.last().fill(testContent);

    // 保存
    await page.locator('button[onclick="saveMeeting()"]').click();
    await page.waitForSelector('.meeting-card', { state: 'visible' });

    // 打开决议中心抽屉
    await page.locator('text=决议总数').first().click();
    await expect(page.locator('text=📋 决议中心').first()).toBeVisible();

    // 找到刚添加的决议卡片（按内容搜索）
    const searchInput = page.locator('#decisions-search-input');
    await searchInput.fill(testContent);
    await page.waitForTimeout(300);

    // 验证卡片显示「待审批」
    const card = page.locator('#decisions-list').locator('div').filter({ hasText: testContent }).first();
    await expect(card).toBeVisible();
    const statusSelect = card.locator('select[id^="res-status-"]');
    await expect(statusSelect).toHaveValue('pending');

    // 执行状态流转：点击状态 select 切换到「已通过」
    await statusSelect.selectOption('approved');

    // 验证卡片状态变为「已通过」
    await expect(statusSelect).toHaveValue('approved');

    // 验证审批日志出现
    await card.locator('summary').filter({ hasText: /审批日志/ }).click();
    await expect(card.locator('text=approved')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
