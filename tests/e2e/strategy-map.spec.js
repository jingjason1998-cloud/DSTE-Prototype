import { test, expect } from '@playwright/test';

const BASE_URL = '/src/strategy-map.html';

async function seedDefaultData(page) {
  // 不注入任何 localStorage，让 strategy-map-data.js 的 ensureVersion()
  // 自动 resetToDefaults()，生成完整的默认地图、目标、连线数据。
  // 这样可避免因只注入 map config 而缺少 objectives/links 导致页面空白。
}

test.describe('Strategy Map', () => {
  test.beforeEach(async ({ page }) => {
    await seedDefaultData(page);
    await page.goto(BASE_URL, { timeout: 60000 });
    await page.waitForSelector('.dim-header.fin', { timeout: 30000 });
  });

  test('page loads with four dimensions', async ({ page }) => {
    await expect(page.locator('.dim-header.fin')).toContainText('财务维度');
    await expect(page.locator('.dim-header.cus')).toContainText('客户维度');
    await expect(page.locator('.dim-header.int')).toContainText('内部流程维度');
    await expect(page.locator('.dim-header.lea')).toContainText('学习与成长维度');
  });

  test('objective cards are rendered', async ({ page }) => {
    const cards = page.locator('.obj-card').filter({ visible: true });
    await expect(cards).toHaveCount(14);
  });

  test('year filter changes card display', async ({ page }) => {
    await page.locator('.annual-btn[data-year="2026"]').click();
    await expect(page.locator('.annual-btn.active')).toHaveAttribute('data-year', '2026');
    await expect(page.locator('.ms-box').filter({ visible: true })).toHaveCount(14);
    await expect(page.locator('.ms-box-year').first()).toContainText('2026年目标');
  });

  test('dimension filter highlights one dimension', async ({ page }) => {
    await page.locator('[data-action="filter-dim"][data-dim="fin"]').click();
    await page.waitForTimeout(200);

    const nonFinCards = page.locator('.obj-card:not(.dim-fin)');
    const firstNonFin = nonFinCards.first();
    await expect(firstNonFin).toHaveCSS('opacity', '0.25');

    // 再次点击取消筛选
    await page.locator('[data-action="filter-dim"][data-dim="fin"]').click();
    await page.waitForTimeout(200);
    await expect(firstNonFin).not.toHaveCSS('opacity', '0.25');
  });

  test('detail panel opens on card click', async ({ page }) => {
    await page.locator('.obj-card').first().click();
    await expect(page.locator('#detailPanel')).toHaveClass(/open/);
    await expect(page.locator('#detailContent')).toContainText('年度里程碑');
  });

  test('drill down expands secondary objectives', async ({ page }) => {
    // 默认只显示 14 张一级指标卡片
    await expect(page.locator('.obj-card').filter({ visible: true })).toHaveCount(14);

    // 点击「销售规模复合增长25%」的下钻按钮
    const card = page.locator('.obj-card:has-text("销售规模复合增长25%")');
    await card.locator('[data-action="toggle-children"]').click();

    // 展开后应显示 2 张二级指标卡片：行业销售额、新产品销售额
    await expect(page.locator('.obj-card').filter({ visible: true })).toHaveCount(16);
    await expect(page.locator('.obj-card:has-text("行业销售额")')).toBeVisible();
    await expect(page.locator('.obj-card:has-text("新产品销售额")')).toBeVisible();

    // 再次点击收起
    await card.locator('[data-action="toggle-children"]').click();
    await expect(page.locator('.obj-card').filter({ visible: true })).toHaveCount(14);
    await expect(page.locator('.obj-card:has-text("行业销售额")')).not.toBeVisible();
  });

  test('SVG links are drawn', async ({ page }) => {
    const paths = page.locator('.link-path');
    await expect(paths).toHaveCount(13);
  });

  test('link tooltip appears on hover', async ({ page }) => {
    const path = page.locator('.link-path').first();
    await page.waitForTimeout(500);
    await path.evaluate(el => {
      const rect = el.getBoundingClientRect();
      const event = new MouseEvent('mouseenter', {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        bubbles: true
      });
      el.dispatchEvent(event);
    });
    await expect(page.locator('#linkTooltip')).toHaveClass(/show/);
    await expect(page.locator('#linkTooltip')).not.toBeEmpty();
  });

  test('causal chain highlight on link click', async ({ page }) => {
    const path = page.locator('.link-path').first();
    await page.waitForTimeout(500);
    await path.evaluate(el => {
      const rect = el.getBoundingClientRect();
      const event = new MouseEvent('click', {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        bubbles: true
      });
      el.dispatchEvent(event);
    });
    await page.waitForTimeout(200);

    const highlighted = page.locator('.obj-card.chain-highlight');
    const count = await highlighted.count();
    expect(count).toBeGreaterThan(0);

    // 点击画布背景清除高亮
    await page.locator('#canvas').click();
    await page.waitForTimeout(200);
    await expect(page.locator('.obj-card.chain-highlight')).toHaveCount(0);
  });

  test('URL params restore view state', async ({ page }) => {
    await seedDefaultData(page);
    await page.goto(`${BASE_URL}?year=2026&dim=cus`, { timeout: 60000 });
    await page.waitForSelector('.dim-header.fin', { timeout: 30000 });

    await expect(page.locator('.annual-btn.active')).toHaveAttribute('data-year', '2026');
    const nonCusCards = page.locator('.obj-card:not(.dim-cus)');
    await expect(nonCusCards.first()).toHaveCSS('opacity', '0.25');
  });

  test('CRUD: create and delete objective', async ({ page }) => {
    // 切换到编辑模式
    await page.locator('[data-action="set-mode"][data-mode="edit"]').click();
    await expect(page.locator('[data-action="set-mode"][data-mode="edit"]')).toHaveClass(/active/);

    await page.locator('[data-action="new-obj"]').click();
    await page.locator('#modalObjName').fill('测试战略目标');
    await page.locator('input[name="modalDim"][value="fin"]').check();
    await page.locator('#modalObjOwner').fill('测试负责人');
    await page.locator('#ms2025Target').fill('10%');
    await page.locator('#ms2026Target').fill('20%');
    await page.locator('#ms2027Target').fill('30%');

    page.on('dialog', dialog => dialog.accept());

    await page.locator('button:has-text("保存")').last().click();
    await expect(page.locator('.toast.success')).toContainText('目标已创建');
    await expect(page.locator('.obj-card:has-text("测试战略目标")')).toBeVisible();

    // 删除（通过 JS dispatchEvent 触发卡片点击，避免 SVG 连线遮挡）
    const testCard = page.locator('.obj-card:has-text("测试战略目标")');
    await testCard.evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await expect(page.locator('#detailPanel')).toHaveClass(/open/);
    await page.locator('[data-action="edit-obj"]').click();
    await page.locator('button:has-text("删除")').click();
    await expect(page.locator('.toast.success')).toContainText('目标已删除');
    await expect(page.locator('.obj-card:has-text("测试战略目标")')).not.toBeVisible();
  });

  test('export produces downloadable JSON', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-action="export-map"]').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/战略地图.*\.json/);
  });

  test('view mode hides edit controls', async ({ page }) => {
    // 默认查看模式：新建目标按钮不可见
    await expect(page.locator('[data-action="new-obj"]')).not.toBeVisible();
    // 地图配置按钮不可见
    await expect(page.locator('#mapConfigBtn')).not.toBeVisible();
    // 详情面板没有编辑按钮
    await page.locator('.obj-card').first().click();
    await expect(page.locator('#detailPanel')).toHaveClass(/open/);
    await expect(page.locator('[data-action="edit-obj"]')).not.toBeVisible();
  });

  test('edit mode shows edit controls and allows creating objective', async ({ page }) => {
    await page.locator('[data-action="set-mode"][data-mode="edit"]').click();
    await expect(page.locator('[data-action="set-mode"][data-mode="edit"]')).toHaveClass(/active/);
    await expect(page.locator('[data-action="new-obj"]')).toBeVisible();
    await expect(page.locator('#mapConfigBtn')).toBeVisible();

    // 详情面板应显示编辑按钮
    await page.locator('.obj-card').first().click();
    await expect(page.locator('#detailPanel')).toHaveClass(/open/);
    await expect(page.locator('[data-action="edit-obj"]')).toBeVisible();
  });

  test('switching back to view mode hides edit controls', async ({ page }) => {
    await page.locator('[data-action="set-mode"][data-mode="edit"]').click();
    await expect(page.locator('[data-action="new-obj"]')).toBeVisible();

    await page.locator('[data-action="set-mode"][data-mode="view"]').click();
    await expect(page.locator('[data-action="set-mode"][data-mode="view"]')).toHaveClass(/active/);
    await expect(page.locator('[data-action="new-obj"]')).not.toBeVisible();
  });

  test('map selector is rendered', async ({ page }) => {
    const select = page.locator('#mapSelect');
    await expect(select).toBeVisible();
    await expect(select).toContainText('营销线 SP823(25~27) 战略地图');
  });
});
