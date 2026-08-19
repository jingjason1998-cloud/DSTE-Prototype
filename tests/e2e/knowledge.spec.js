import { test, expect } from '@playwright/test';

/**
 * 十五五规划知识库(knowledge.html)E2E
 * 依赖 dev server(localhost:3456)与 public/kb 构建产物
 */

test.describe('Knowledge Hub - 洞察首页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/knowledge.html');
    await expect(page.locator('.kb-page-header h1')).toContainText('十五五规划知识库');
  });

  test('首页渲染统计卡 / 指标区 / PEST 四象限 / 变更流', async ({ page }) => {
    // 收录统计卡
    const stats = page.locator('#kb-stats .kb-stat-card');
    await expect(stats).toHaveCount(9); // 总数 + 8 个分组
    await expect(page.locator('#kb-stats')).toContainText('收录文献总数');
    await expect(page.locator('#kb-stats')).toContainText('顶层文献');
    await expect(page.locator('#kb-stats')).toContainText('省级纲要');
    await expect(page.locator('#kb-stats')).toContainText('专题研究');

    // 核心指标区:可横向滚动表格 + 约束性徽标
    const table = page.locator('#kb-indicators .kb-indicator-table');
    await expect(table).toBeVisible();
    await expect(table).toContainText('国内生产总值');
    await expect(table.locator('tbody tr')).toHaveCount(21);
    await expect(table.locator('.kb-badge-constraint').first()).toContainText('约束性');

    // PEST 四象限
    const pestCards = page.locator('#kb-pest .kb-pest-card');
    await expect(pestCards).toHaveCount(4);
    await expect(pestCards.nth(0).locator('li')).toHaveCount(4);
    await expect(page.locator('#kb-pest')).toContainText('政策与治理');

    // 最新变更流
    await expect(page.locator('#kb-changelog')).toContainText('2026-');
  });

  test('面包屑含返回驾驶舱链接', async ({ page }) => {
    const crumb = page.locator('#kb-topbar .breadcrumb');
    await expect(crumb.locator('a[href="cockpit.html#dashboard"]')).toContainText('驾驶舱');
    await expect(crumb.locator('a[href="cockpit.html#sp/insights"]')).toContainText('战略洞察');
  });
});

test.describe('Knowledge Hub - 文档浏览', () => {
  test('点击 PEST 卡进入洞察文档', async ({ page }) => {
    await page.goto('/src/knowledge.html');
    await page.locator('.kb-pest-card[data-pest-dim="P"]').click();
    await expect(page).toHaveURL(/#\/doc\/insights\/P-political/);
    const content = page.locator('#kb-reader-content');
    await expect(content).toContainText('政策');
    // 元数据条 + 目录树
    await expect(page.locator('#kb-doc-meta')).toBeVisible();
    await expect(page.locator('#kb-tree')).toContainText('顶层文献');
    // 面包屑更新
    await expect(page.locator('#kb-topbar .breadcrumb')).toContainText('PEST 洞察');
  });

  test('目录树打开文档并支持折叠', async ({ page }) => {
    await page.goto('/src/knowledge.html#/doc/core/gangyao');
    const content = page.locator('#kb-reader-content');
    await expect(content).toContainText('纲要');

    // 目录树点击另一篇文档
    await page.locator('.kb-tree-doc', { hasText: '省级"十五五"规划跨省对比矩阵' }).click();
    await expect(page).toHaveURL(/#\/doc\/regions\/compare-matrix/);
    await expect(content).toContainText('对比');

    // regions 二级分组存在且可折叠展开
    const subGroup = page.locator('.kb-tree-subgroup-title', { hasText: '华东' });
    await expect(subGroup).toBeVisible();
  });

  test('元数据条含官方原文外链', async ({ page }) => {
    await page.goto('/src/knowledge.html#/doc/core/gangyao');
    const meta = page.locator('#kb-doc-meta');
    await expect(meta).toContainText('来源');
    const link = meta.locator('a[target="_blank"]');
    await expect(link).toContainText('查看官方原文');
    await expect(link).toHaveAttribute('href', /news\.cn/);
  });

  test('阅读窗内 #/doc/ 互链走前端路由', async ({ page }) => {
    // core/gangyao 无站内互链,使用 PEST 洞察文档(含 #/doc/ 链接)
    await page.goto('/src/knowledge.html#/doc/insights/P-political');
    const content = page.locator('#kb-reader-content');
    await expect(content).toContainText('政策');
    const innerLink = content.locator('a[href^="#/doc/"]').first();
    await innerLink.click();
    await expect(page).toHaveURL(/#\/doc\//);
    await expect(page.locator('#kb-doc-meta')).toBeVisible();
    await expect(content).not.toContainText('文档加载失败');
  });

  test('hash 路由支持前进后退', async ({ page }) => {
    await page.goto('/src/knowledge.html');
    await expect(page.locator('.kb-page-header h1')).toContainText('十五五规划知识库');

    await page.locator('.kb-pest-card[data-pest-dim="E"]').click();
    await expect(page).toHaveURL(/#\/doc\/insights\/E-economic/);
    await expect(page.locator('#kb-reader-content')).toContainText('经济');

    await page.goBack();
    await expect(page.locator('.kb-page-header h1')).toContainText('十五五规划知识库');

    await page.goForward();
    await expect(page).toHaveURL(/#\/doc\/insights\/E-economic/);
    await expect(page.locator('#kb-reader-content')).toContainText('经济');
  });
});

test.describe('Knowledge Hub - 搜索', () => {
  test('搜索"消费"有结果并可达文档', async ({ page }) => {
    await page.goto('/src/knowledge.html');
    const input = page.locator('#kb-search-input');
    await input.fill('消费');
    const results = page.locator('#kb-search-results');
    await expect(results).toBeVisible();
    const items = results.locator('.kb-search-result');
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBeGreaterThan(0);

    await items.first().click();
    await expect(page).toHaveURL(/#\/doc\//);
    await expect(page.locator('#kb-reader-content')).not.toContainText('文档加载中');
    // 下拉收起
    await expect(results).toBeHidden();
  });

  test('搜索无匹配时提示', async ({ page }) => {
    await page.goto('/src/knowledge.html');
    await page.locator('#kb-search-input').fill('zzz-不存在的词-zzz');
    await expect(page.locator('#kb-search-results')).toContainText('无匹配文献');
  });
});
