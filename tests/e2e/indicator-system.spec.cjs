const { test, expect } = require('@playwright/test');

test('Indicator system page loads and shows indicators', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  
  await page.goto('/src/cockpit.html#bp/kpi');
  await page.waitForTimeout(2000);
  
  const body = await page.locator('body').innerHTML();
  
  expect(body).toContain('战略指标库');
  expect(body).toContain('指标分类');
  expect(body).toContain('销售额-D');
  expect(body).toContain('新建指标');
  expect(errors).toEqual([]);
});

test('Indicator category filter works', async ({ page }) => {
  await page.goto('/src/cockpit.html#bp/kpi');
  await page.waitForTimeout(2000);
  
  await page.locator('[data-action="ind-select-cat"][data-cat="财务"]').first().click();
  await page.waitForTimeout(500);
  
  const body = await page.locator('body').innerHTML();
  expect(body).toContain('销售额-D');
  expect(body).toContain('营销线贡献利润率');
});

test('Indicator detail panel shows on row click', async ({ page }) => {
  await page.goto('/src/cockpit.html#bp/kpi');
  await page.waitForTimeout(2000);

  // 等待指标表格渲染完成
  await page.waitForSelector('table tbody tr', { timeout: 10000 });

  // Click on first table row
  const row = page.locator('table tbody tr').first();
  await row.click();
  await page.waitForTimeout(500);
  
  const body = await page.locator('body').innerHTML();
  expect(body).toContain('指标详情');
  expect(body).toContain('计算公式');
});

test('New indicator modal opens', async ({ page }) => {
  await page.goto('/src/cockpit.html#bp/kpi');
  await page.waitForTimeout(2000);
  
  await page.locator('[data-action="ind-new"]').first().click();
  await page.waitForTimeout(500);
  
  const modal = await page.locator('.omp-modal').first();
  await expect(modal).toBeVisible();
  
  const modalText = await modal.innerHTML();
  expect(modalText).toContain('新建指标');
});

test('Search filter works', async ({ page }) => {
  await page.goto('/src/cockpit.html#bp/kpi');
  await page.waitForTimeout(2000);

  await page.locator('#ind-search').fill('销售额');
  await page.waitForTimeout(500);

  const body = await page.locator('body').innerHTML();
  expect(body).toContain('销售额-D');
});

test('New indicator modal uses org selector for responsible department', async ({ page }) => {
  await page.goto('/src/cockpit.html#bp/kpi');
  await page.waitForTimeout(2000);

  await page.locator('[data-action="ind-new"]').first().click();
  await page.waitForTimeout(500);

  const modal = await page.locator('.omp-modal').first();
  await expect(modal).toBeVisible();

  // 旧的 <select id="ind-dept"> 应已被替换
  await expect(page.locator('#ind-dept')).toHaveCount(0);
  // 新的组织选择器容器应存在
  await expect(page.locator('#ind-dept-selector')).toHaveCount(1);
  await expect(page.locator('#ind-dept-selector [data-org-selector="true"]')).toHaveCount(1);
});
