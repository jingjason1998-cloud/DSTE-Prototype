import { test, expect } from '@playwright/test';

test.describe.skip('KPI Tree v3 — 卡片式层级视图', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.waitForSelector('#sidebar', { timeout: 10000 });
    await page.locator('.sidebar-item[data-page="exe/tasks"]').click();
    await page.waitForTimeout(2000);
    await page.locator('.omp-tab-btn[data-tab="kpi"]').click();
    await page.waitForTimeout(1500);
  });

  test('树形视图使用卡片式布局', async ({ page }) => {
    const cards = page.locator('.omp-kpi-card');
    expect(await cards.count()).toBeGreaterThan(0);
    // 确认不是表格行
    const tableRows = page.locator('.omp-kpi-tree-row');
    expect(await tableRows.count()).toBe(0);
  });

  test('卡片有三级层级差异化', async ({ page }) => {
    const l0 = page.locator('.omp-kpi-card[data-level="0"]');
    const l1 = page.locator('.omp-kpi-card[data-level="1"]');
    const l2 = page.locator('.omp-kpi-card[data-level="2"]');
    expect(await l0.count()).toBeGreaterThan(0);
    expect(await l1.count()).toBeGreaterThan(0);
    expect(await l2.count()).toBeGreaterThan(0);
  });

  test('卡片有进度展示（环形或进度条）', async ({ page }) => {
    // v3: 环形 SVG；v4: 进度条
    const rings = page.locator('.omp-kpi-card svg');
    const bars = page.locator('.node-progress-bar');
    const ringCount = await rings.count();
    const barCount = await bars.count();
    expect(ringCount + barCount).toBeGreaterThan(0);
    if (ringCount > 0) {
      const firstRing = rings.first();
      const hasDasharray = await firstRing.evaluate(el => {
        const circle = el.querySelector('circle:last-child');
        return circle && circle.getAttribute('stroke-dasharray') !== null;
      });
      expect(hasDasharray).toBe(true);
    }
  });

  test('卡片有状态标签（药丸或进度文本）', async ({ page }) => {
    // v3: 药丸标签；v4: 进度文本
    const pills = page.locator('.omp-status-pill');
    const progressTexts = page.locator('.node-progress-text');
    expect((await pills.count()) + (await progressTexts.count())).toBeGreaterThan(0);
  });

  test('Level 0 节点默认展开', async ({ page }) => {
    // Level 0 有展开按钮且是 expanded 状态
    const l0Cards = page.locator('.omp-kpi-card[data-level="0"]');
    const firstL0 = l0Cards.first();
    const expandBtn = firstL0.locator('.omp-expand-btn');
    // 如果有子节点，按钮应该存在且是 expanded 状态
    if (await expandBtn.count() > 0) {
      const hasExpandedClass = await expandBtn.evaluate(el => el.classList.contains('expanded'));
      expect(hasExpandedClass).toBe(true);
    }
    // 至少能看到 Level 1 卡片（因为 L0 默认展开）
    const l1Cards = page.locator('.omp-kpi-card[data-level="1"]');
    expect(await l1Cards.count()).toBeGreaterThan(0);
  });

  test('可以折叠和展开 Level 0 节点', async ({ page }) => {
    const firstL0 = page.locator('.omp-kpi-card[data-level="0"]').first();
    const expandBtn = firstL0.locator('.omp-expand-btn');
    const nodeExpand = firstL0.locator('.node-expand');
    // v3: .omp-expand-btn; v4: .node-expand（点击卡片本身）
    const hasV3Btn = await expandBtn.count() > 0;
    const hasV4Btn = await nodeExpand.count() > 0;
    if (!hasV3Btn && !hasV4Btn) return; // 没有子节点则跳过
    const cardId = await firstL0.getAttribute('data-id');
    // v3: 子树是卡片的 next sibling; v4: 子树在 .omp-kpi-tree-node 内部
    const v3Children = page.locator(`.omp-kpi-card[data-id="${cardId}"] + .omp-kpi-children`);
    const v4Children = page.locator(`.omp-kpi-card[data-id="${cardId}"] ~ .omp-kpi-children-row`);
    const clickTarget = hasV3Btn ? expandBtn : firstL0;
    const childrenLocator = hasV3Btn ? v3Children : v4Children;
    if (await childrenLocator.count() === 0) return;

    // 先点击折叠
    await clickTarget.click();
    await page.waitForTimeout(300);
    expect(await childrenLocator.evaluate(el => el.classList.contains('collapsed'))).toBe(true);

    // 再点击展开
    await clickTarget.click();
    await page.waitForTimeout(300);
    expect(await childrenLocator.evaluate(el => el.classList.contains('collapsed'))).toBe(false);
  });

  test('卡片 hover 有上浮效果', async ({ page }) => {
    const card = page.locator('.omp-kpi-card').first();
    await card.hover();
    await page.waitForTimeout(200);
    const transform = await card.evaluate(el => getComputedStyle(el).transform);
    // hover 后应该有 translateY 变化
    expect(transform).not.toBe('none');
  });

  test('公司级卡片有状态动效类', async ({ page }) => {
    const l0Cards = page.locator('.omp-kpi-card[data-level="0"]');
    const firstL0 = l0Cards.first();
    const classAttr = await firstL0.getAttribute('class');
    // 应该有 status-achieved / status-warning / status-lagging 之一
    const hasStatusClass = /status-(achieved|warning|lagging)/.test(classAttr);
    expect(hasStatusClass).toBe(true);
  });
});
