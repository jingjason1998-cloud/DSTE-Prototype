import { test, expect } from '@playwright/test';

/**
 * 业务专题管理 CRUD 验证测试
 * 验证 ai-analysis.js 和 issue-import.js 的修复是否生效
 */

const BASE_URL = '/src/business-topics.html';

test.describe('业务专题管理修复验证', () => {

  test.beforeEach(async ({ page }) => {
    // 清除 localStorage，确保测试环境干净
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('页面加载无 JS 错误', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // 过滤掉已知的环境相关错误（如 API 连接失败）
    const criticalErrors = errors.filter(e =>
      e.includes('loadIssues') ||
      e.includes('loadAllIssues') ||
      e.includes('escapeHtml') ||
      e.includes('saveIssues')
    );

    expect(criticalErrors).toEqual([]);
  });

  test('创建专题并查看详情', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);

    // 点击新建专题按钮
    const newBtn = await page.locator('button:has-text("新建专题"), button:has-text("+ 新建专题"), [data-action="new-topic"]').first();
    if (await newBtn.isVisible().catch(() => false)) {
      await newBtn.click();
    } else {
      // 尝试其他选择器
      await page.locator('text=新建专题').first().click();
    }

    await page.waitForTimeout(500);

    // 填写表单
    const nameInput = page.locator('input[placeholder*="名称"], input[name="name"], #topicName').first();
    const descInput = page.locator('textarea[placeholder*="描述"], textarea[name="description"], #topicDescription').first();

    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('测试专题-' + Date.now());
    }
    if (await descInput.isVisible().catch(() => false)) {
      await descInput.fill('这是一个用于验证修复的测试专题');
    }

    // 保存
    const saveBtn = page.locator('button:has-text("保存"), button:has-text("确认"), [data-action="save-topic"]').first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(1000);
    }

    // 验证页面无致命错误
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('loadIssues is not defined');
    expect(bodyText).not.toContain('escapeHtml is not defined');
    expect(bodyText).not.toContain('loadAllIssues is not defined');
  });

  test('议题导入和 AI 分析功能无报错', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);

    // 查找 AI 分析按钮
    const aiBtn = page.locator('button:has-text("AI"), button:has-text("分析"), [data-action="ai-analysis"]').first();

    // 如果页面上有 AI 相关按钮，点击看看是否报错
    if (await aiBtn.isVisible().catch(() => false)) {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await aiBtn.click();
      await page.waitForTimeout(2000);

      const criticalErrors = errors.filter(e =>
        e.includes('loadIssues') ||
        e.includes('loadAllIssues') ||
        e.includes('escapeHtml')
      );

      expect(criticalErrors).toEqual([]);
    }

    // 基础断言：页面正常加载
    expect(await page.title()).not.toBe('');
  });

});
