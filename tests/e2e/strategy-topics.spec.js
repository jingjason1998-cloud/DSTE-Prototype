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

test.describe('战略专题管理 - 搜索与筛选', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(STRATEGY_TOPICS_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(1500);
  });

  test('搜索框可按名称过滤专题', async ({ page }) => {
    const searchInput = page.locator('#strategy-topic-search');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('海外');
    await searchInput.blur();
    await page.waitForTimeout(500);

    await expect(page.locator('#strategy-topics-container')).toContainText('海外市场拓展战略研究');
    await expect(page.locator('#strategy-topics-container')).not.toContainText('核心产品技术路线规划');
  });

  test('状态筛选仅展示选中阶段专题', async ({ page }) => {
    const statusSelect = page.locator('select[onchange*="siSetFilter(\'status\'"]').first();
    await statusSelect.evaluate((el) => {
      Array.from(el.options).forEach(o => { o.selected = o.value === 'closed'; });
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(500);

    const rows = page.locator('#strategy-topics-content tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText('已闭环');
    }
  });

  test('表头排序可切换升降序', async ({ page }) => {
    const nameHeader = page.locator('th:has-text("专题名称")').first();
    await nameHeader.click();
    await page.waitForTimeout(300);

    // 第一次点击后应显示升序或降序指示器
    const text = await nameHeader.textContent();
    expect(text).toMatch(/专题名称 [↑↓⇅]/);
  });

  test('导出按钮可下载 JSON 备份', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button:has-text("导出")').click()
    ]);
    const suggestedFilename = download.suggestedFilename();
    expect(suggestedFilename).toMatch(/strategy-topics-export-.*\.json/);
  });

  test('详情页可打开 AI 质量分析面板', async ({ page }) => {
    await page.locator('.view-topic-btn').first().click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("AI 质量分析")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#topic-ai-quality-panel')).toContainText('综合质量评分');
    await expect(page.locator('#topic-ai-quality-panel')).toContainText(/[0-9]{1,3}/);
  });

  test('下一年深化弹窗可使用 AI 生成研究目标', async ({ page }) => {
    // 找到一个执行中或已闭环且无下一年深化的专题
    const rows = page.locator('#strategy-topics-content tbody tr');
    const count = await rows.count();
    let opened = false;
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const statusText = await row.locator('td').nth(5).textContent().catch(() => '');
      if (statusText.includes('执行阶段') || statusText.includes('已闭环')) {
        const hasNext = await row.locator('td').first().textContent().then(t => t.includes('已深化')).catch(() => false);
        if (!hasNext) {
          await row.locator('.view-topic-btn').click();
          await page.waitForTimeout(300);
          const deepenBtn = page.locator('button:has-text("继续深化")');
          if (await deepenBtn.count() > 0) {
            await deepenBtn.click();
            await page.waitForTimeout(300);
            opened = true;
            break;
          } else {
            await page.locator('#topic-detail-overlay button:has-text("关闭")').click();
          }
        }
      }
    }
    test.skip(!opened, '未找到可深化的专题');

    await page.locator('button:has-text("AI 生成研究目标")').click();
    await page.waitForTimeout(300);
    const value = await page.locator('#edit-topic-researchObjectives').inputValue();
    expect(value.length).toBeGreaterThan(20);
  });

});
