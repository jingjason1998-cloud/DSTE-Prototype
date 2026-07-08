import { test, expect } from '@playwright/test';

/**
 * 战略专题管理（cockpit.html#sp/strategy-topics）年份筛选回归测试
 * v1.2 页面拆分后，战略洞察与战略专题管理分为两个独立页面。
 */

const STRATEGY_TOPICS_URL = '/src/cockpit.html#sp/strategy-topics';

test.describe('战略专题管理 - 年份筛选', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(STRATEGY_TOPICS_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(1500);
  });

  test('默认展示全部年份及 2025 年已闭环专题', async ({ page }) => {
    const yearSelector = page.locator('#year-selector');
    await expect(yearSelector).toHaveValue('all');

    const options = await yearSelector.evaluate(el =>
      Array.from(el.options).map(o => ({ value: o.value, text: o.text }))
    );
    expect(options.some(o => o.value === '2025')).toBe(true);
    expect(options.some(o => o.value === 'all')).toBe(true);

    // 共 14 个默认专题（含 2025 年历史专题）
    await expect(page.locator('#strategy-topics-container')).toContainText('共 14 个专题');

    // 2025 年专题分组及具体专题可见
    await expect(page.locator('#strategy-topics-container')).toContainText('2025年专题');
    await expect(page.locator('#strategy-topics-container')).toContainText('帆软大客户拓展工作的三年业务规划');
    await expect(page.locator('#strategy-topics-container')).toContainText('人才梯队与组织能力升级');
  });

  test('切换年份筛选仅展示对应年份专题', async ({ page }) => {
    const yearSelector = page.locator('#year-selector');
    await yearSelector.evaluate((el, value) => {
      el.value = value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, '2025');
    await page.waitForTimeout(500);

    await expect(yearSelector).toHaveValue('2025');
    // 切换后只应看到 2025 年分组
    const yearHeadings = await page.locator('#strategy-topics-content h3').allTextContents();
    expect(yearHeadings).toEqual(['2025年专题']);
  });

  test('支持切换到甘特图视图', async ({ page }) => {
    await page.locator('button:has-text("甘特图")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.gantt-bar').first()).toBeVisible();
  });

});
