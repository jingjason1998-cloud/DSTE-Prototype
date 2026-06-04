import { test, expect } from '@playwright/test';

/**
 * 线上环境验证测试
 * 验证升级后业务专题管理功能正常
 */

const PROD_URL = 'https://Dste.fineres.com/src/business-topics.html';

test.describe('线上环境验证 - DSTE v0.4.2', () => {

  test('首页可访问且无 loadIssues 错误', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(PROD_URL, { timeout: 30000 });
    await page.waitForTimeout(3000);

    const criticalErrors = errors.filter(e =>
      e.includes('loadIssues') ||
      e.includes('loadAllIssues') ||
      e.includes('escapeHtml')
    );

    expect(criticalErrors).toEqual([]);
    expect(await page.title()).not.toBe('');
  });

  test('业务专题页面可正常加载', async ({ page }) => {
    await page.goto(PROD_URL, { timeout: 30000 });
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').textContent();

    // 验证页面没有致命错误
    expect(bodyText).not.toContain('loadIssues is not defined');
    expect(bodyText).not.toContain('escapeHtml is not defined');
    expect(bodyText).not.toContain('ReferenceError');
  });

});
