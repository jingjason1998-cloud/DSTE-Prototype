const { test, expect } = require('@playwright/test');

test('Indicator system page loads and shows indicators', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  
  await page.goto('/src/cockpit.html#bp/kpi');
  await page.waitForTimeout(2000);
  
  const body = await page.locator('body').innerHTML();
  
  expect(body).toContain('KPI 指标体系');
  expect(body).toContain('指标分类');
  expect(body).toContain('合同额');
  expect(body).toContain('新建指标');
  expect(errors).toEqual([]);
});

test('Indicator category filter works', async ({ page }) => {
  await page.goto('/src/cockpit.html#bp/kpi');
  await page.waitForTimeout(2000);
  
  await page.locator('[data-action="ind-select-cat"][data-cat="财务"]').first().click();
  await page.waitForTimeout(500);
  
  const body = await page.locator('body').innerHTML();
  expect(body).toContain('合同额');
  expect(body).toContain('毛利率');
});

test('Indicator detail panel shows on row click', async ({ page }) => {
  await page.goto('/src/cockpit.html#bp/kpi');
  await page.waitForTimeout(2000);
  
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
  
  await page.locator('#ind-search').fill('合同');
  await page.waitForTimeout(500);
  
  const body = await page.locator('body').innerHTML();
  expect(body).toContain('合同额');
});
