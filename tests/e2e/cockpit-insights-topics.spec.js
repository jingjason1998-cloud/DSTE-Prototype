import { test, expect } from '@playwright/test';

/**
 * 战略洞察与专题（cockpit.html#sp/insights-topics）年份筛选回归测试
 * 修复前：重复的 loadTopics 声明导致默认专题数据无法加载，且年度筛选默认锁定当前年，
 *         2025 年已闭环专题不展示。
 */

const INSIGHTS_TOPICS_URL = '/src/cockpit.html#sp/insights-topics';

test.describe('战略洞察与专题 - 年份筛选', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(INSIGHTS_TOPICS_URL);
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
    await expect(page.locator('#panel-topics')).toContainText('共 14 个专题');

    // 2025 年专题分组及具体专题可见
    await expect(page.locator('#panel-topics')).toContainText('2025年专题');
    await expect(page.locator('#panel-topics')).toContainText('帆软大客户拓展工作的三年业务规划');
    await expect(page.locator('#panel-topics')).toContainText('人才梯队与组织能力升级');
  });

  test('切换年份筛选仅展示对应年份专题', async ({ page }) => {
    const yearSelector = page.locator('#year-selector');
    // 元素初始可能不在可见 tab 内，直接通过 JS 触发 change
    await yearSelector.evaluate((el, value) => {
      el.value = value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, '2025');
    await page.waitForTimeout(500);

    await expect(yearSelector).toHaveValue('2025');
    // 切换后只应看到 2025 年分组
    const yearHeadings = await page.locator('#panel-topics h3').allTextContents();
    expect(yearHeadings).toEqual(['2025年专题']);
  });

});
