import { test, expect } from '@playwright/test';

const BASE_URL = '/src/strategy-map-list.html';

function getTestStorageState() {
  return {
    'dste_strategy_data_version': '3',
    'dste_sm_maps_v3': JSON.stringify([
      {
        id: 'yx_2025_2027',
        name: '营销线 SP823(25~27) 战略地图',
        dept: 'yx',
        deptName: '营销线',
        cycle: { startYear: 2025, endYear: 2027 },
        description: '营销线2025-2027三年业务战略规划',
        status: 'approved',
        version: 1,
        versionLabel: 'v1.0 初始版',
        createdBy: '系统',
        updatedBy: '系统',
        approvedBy: '系统',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-06-10T08:00:00Z',
        approvedAt: '2025-01-01T00:00:00Z',
        source: ''
      },
      {
        id: 'rd_2026_2028',
        name: '研发线 2026-2028 战略地图',
        dept: 'rd',
        deptName: '研发线',
        cycle: { startYear: 2026, endYear: 2028 },
        description: '研发线中长期技术战略规划',
        status: 'draft',
        version: 1,
        versionLabel: 'v0.1 草案',
        createdBy: '张经理',
        updatedBy: '张经理',
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-12T10:00:00Z',
        source: ''
      }
    ]),
    'dste_sm_current_v3': 'yx_2025_2027',
    'dste_sm_obj_yx_2025_2027_v3': JSON.stringify([
      { id: 'so_fin_001', name: '测试财务目标', dim: 'fin', level: 'primary', milestones: { 2025: { target: '10%', status: 'not_started', focusLevel: 'primary' } }, owner: '测试', kpiRef: null, taskRef: null },
      { id: 'so_cus_001', name: '测试客户目标', dim: 'cus', level: 'primary', milestones: { 2025: { target: '20', status: 'not_started', focusLevel: 'primary' } }, owner: '测试', kpiRef: null, taskRef: null }
    ]),
    'dste_sm_links_yx_2025_2027_v3': JSON.stringify([]),
    'dste_sm_obj_rd_2026_2028_v3': JSON.stringify([]),
    'dste_sm_links_rd_2026_2028_v3': JSON.stringify([]),
  };
}

async function seedDefaultData(page) {
  await page.addInitScript((state) => {
    // 清空 DSTE 战略地图相关存储，避免测试间状态串扰
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('dste_sm_')) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    Object.entries(state).forEach(([k, v]) => {
      try { localStorage.setItem(k, v); } catch (e) { void e; }
    });
  }, getTestStorageState());
}

test.describe('Strategy Map List', () => {
  test.beforeEach(async ({ page }) => {
    await seedDefaultData(page);
    await page.goto(BASE_URL, { timeout: 60000 });
    await page.waitForSelector('.sm-list-grid', { timeout: 30000 });
  });

  test('renders list with map cards', async ({ page }) => {
    const cards = page.locator('.sm-map-card');
    await expect(cards).toHaveCount(2);
    // 默认按更新时间倒序，研发线地图更新于 2026-06-12，排在首位
    await expect(cards.first()).toContainText('研发线 2026-2028 战略地图');
    await expect(cards.last()).toContainText('营销线 SP823(25~27) 战略地图');
  });

  test('displays status badges', async ({ page }) => {
    await expect(page.locator('.status-badge:has-text("已发布")')).toBeVisible();
    await expect(page.locator('.status-badge:has-text("草稿")')).toBeVisible();
  });

  test('shows dimension counts', async ({ page }) => {
    // 研发线地图为空，检查营销线地图（排序后位于第二）
    const yxCard = page.locator('.sm-map-card').filter({ hasText: '营销线 SP823(25~27) 战略地图' });
    await expect(yxCard).toContainText('财务(1)');
    await expect(yxCard).toContainText('客户(1)');
    await expect(yxCard).toContainText('内部(0)');
    await expect(yxCard).toContainText('学习(0)');
  });

  test('search filters by name', async ({ page }) => {
    await page.locator('#searchInput').fill('研发线');
    await expect(page.locator('.sm-map-card')).toHaveCount(1);
    await expect(page.locator('.sm-map-card')).toContainText('研发线 2026-2028 战略地图');
  });

  test('search filters by description', async ({ page }) => {
    await page.locator('#searchInput').fill('中长期技术');
    await expect(page.locator('.sm-map-card')).toHaveCount(1);
    await expect(page.locator('.sm-map-card')).toContainText('研发线 2026-2028 战略地图');
  });

  test('status filter works', async ({ page }) => {
    await page.selectOption('#filterStatus', 'draft');
    await expect(page.locator('.sm-map-card')).toHaveCount(1);
    await expect(page.locator('.sm-map-card')).toContainText('研发线 2026-2028 战略地图');
  });

  test('cycle filter works', async ({ page }) => {
    await page.selectOption('#filterCycle', '2026-2028');
    await expect(page.locator('.sm-map-card')).toHaveCount(1);
    await expect(page.locator('.sm-map-card')).toContainText('研发线 2026-2028 战略地图');
  });

  test('creates a new strategy map', async ({ page }) => {
    await page.locator('[data-action="new-map"]').first().click();
    await page.locator('#mapModalName').fill('测试新建地图');
    await page.locator('#mapModalDept').fill('test');
    await page.locator('#mapModalDeptName').fill('测试部门');
    await page.locator('#mapModalStartYear').fill('2027');
    await page.locator('#mapModalEndYear').fill('2029');
    await page.locator('#mapModalStatus').selectOption('draft');
    await page.locator('#mapModalSource').fill('https://kms.example.com/page/123');
    await page.locator('#mapModalPresentationUrl').fill('https://ppt.example.com/slide/456');
    await page.locator('#mapModalDesc').fill('这是一个测试地图');

    await page.locator('[data-action="save-map"]').click();

    await expect(page.locator('.sm-map-card:has-text("测试新建地图")')).toBeVisible();
    await expect(page.locator('.sm-map-card:has-text("测试新建地图")')).toContainText('测试部门');
    await expect(page.locator('.sm-map-card:has-text("测试新建地图")')).toContainText('2027-2029');
    await expect(page.locator('.sm-map-card:has-text("测试新建地图")')).toContainText('KMS 链接');
    await expect(page.locator('.sm-map-card:has-text("测试新建地图")')).toContainText('宣贯 PPT');
  });

  test('edits an existing map', async ({ page }) => {
    const yxCard = page.locator('.sm-map-card').filter({ hasText: '营销线 SP823(25~27) 战略地图' });
    await yxCard.locator('[data-action="edit-map"]').click();
    await page.locator('#mapModalName').fill('营销线地图（已修改）');
    await page.locator('#mapModalStatus').selectOption('review');

    await page.locator('[data-action="save-map"]').click();

    await expect(page.locator('.sm-map-card:has-text("营销线地图（已修改）")')).toBeVisible();
    await expect(page.locator('.status-badge:has-text("审批中")')).toBeVisible();
  });

  test('deletes a map with cascade cleanup', async ({ page }) => {
    // 删除研发线地图（排序后位于首位）
    const rdCard = page.locator('.sm-map-card').filter({ hasText: '研发线 2026-2028 战略地图' });
    await rdCard.locator('[data-action="delete-map"]').click();

    await expect(page.locator('#deleteModal')).toBeVisible();
    await expect(page.locator('#deleteMapName')).toContainText('研发线 2026-2028 战略地图');

    await page.locator('[data-action="confirm-delete"]').click();

    await expect(page.locator('.sm-map-card')).toHaveCount(1);
    await expect(page.locator('.sm-map-card:has-text("研发线")')).not.toBeVisible();
  });

  test('view map navigates to detail page', async ({ page }) => {
    await page.locator('[data-action="view-map"]').first().click();
    await page.waitForURL(/strategy-map\.html\?id=/, { timeout: 30000 });
    await expect(page.locator('.dim-header.fin')).toBeVisible();
  });

  test('empty state appears when no maps match filter', async ({ page }) => {
    await page.locator('#searchInput').fill('不存在的关键词');
    await expect(page.locator('#emptyState')).toBeVisible();
    await expect(page.locator('#emptyState')).toContainText('暂无战略地图');
  });

  test('default map cannot be deleted', async ({ page }) => {
    const yxCard = page.locator('.sm-map-card').filter({ hasText: '营销线 SP823(25~27) 战略地图' });
    const deleteBtn = yxCard.locator('[data-action="delete-map"]');
    await expect(deleteBtn).toBeDisabled();
  });
});
