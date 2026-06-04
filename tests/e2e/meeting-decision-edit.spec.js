import { test, expect } from '@playwright/test';

test.describe('Meeting Decision Edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/meetings.html');
    await page.waitForLoadState('networkidle');
  });

  test('add, edit and save decisions in meeting editor', async ({ page }) => {
    // 点击第一个会议卡片的编辑按钮
    const editBtn = page.locator('[data-edit-meeting]').first();
    await editBtn.click();

    // 等待编辑页面渲染（SPA 路由，URL 不变，内容变化）
    await page.waitForSelector('#edit-title', { state: 'visible' });

    // 向下滚动确保决策区域可见
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 验证决议区域标题存在
    await expect(page.locator('text=决议').first()).toBeVisible();

    // 获取编辑前第一个会议的决策数量（用于后续对比）
    const beforeCount = await page.evaluate(() => {
      const raw = localStorage.getItem('dste_meetings');
      if (!raw) return 0;
      const meetings = JSON.parse(raw);
      return meetings[0]?.decisions?.length || 0;
    });

    // 点击"+ 添加决议"
    const addDecisionBtn = page.locator('button:has-text("+ 添加决议")').first();
    await addDecisionBtn.click();

    // 等待新决策输入框出现
    const decisionInputs = page.locator('#edit-decision-list input[placeholder="决议内容"]');
    await expect(decisionInputs.last()).toBeVisible();

    // 填写新决策内容
    const newContent = '测试决议_' + Date.now();
    await decisionInputs.last().fill(newContent);

    // 填写决策人
    const ownerInputs = page.locator('#edit-decision-list input[placeholder="决策人"]');
    await ownerInputs.last().fill('测试决策人');

    // 点击保存
    const saveBtn = page.locator('button:has-text("保存")').first();
    await saveBtn.click();

    // 等待页面返回列表
    await page.waitForSelector('.meeting-card', { state: 'visible' });

    // 验证 localStorage 中的数据包含新决策
    const savedDecisions = await page.evaluate(() => {
      const raw = localStorage.getItem('dste_meetings');
      if (!raw) return null;
      const meetings = JSON.parse(raw);
      const first = meetings[0];
      return first?.decisions || null;
    });

    expect(savedDecisions).not.toBeNull();
    expect(savedDecisions.length).toBeGreaterThanOrEqual(beforeCount + 1);
    const found = savedDecisions.some(d => d.content === newContent && d.owner === '测试决策人');
    expect(found).toBe(true);
  });

  test('no JavaScript errors when rendering decision list', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // 点击第一个会议卡片的编辑按钮
    const editBtn = page.locator('[data-edit-meeting]').first();
    await editBtn.click();

    // 等待编辑页面渲染
    await page.waitForSelector('#edit-title', { state: 'visible' });

    // 向下滚动
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 点击添加决议
    const addDecisionBtn = page.locator('button:has-text("+ 添加决议")').first();
    await addDecisionBtn.click();

    // 等待一下
    await page.waitForTimeout(300);

    expect(errors).toEqual([]);
  });
});
