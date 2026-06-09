const { test, expect } = require('@playwright/test');

test('OMP Dashboard tab renders without error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  
  await page.goto('http://localhost:4173/src/cockpit.html#exe/tasks');
  await page.waitForTimeout(2000);
  
  const tab = page.locator('button[data-tab="dashboard"]').first();
  await expect(tab).toBeVisible();
  await tab.click();
  await page.waitForTimeout(1000);
  
  const content = await page.locator('#omp-tab-content').innerHTML();
  expect(content).toContain('omp-stat-card');
  expect(content).toContain('KPI 达成热力图');
  expect(content).toContain('预警清单');
  expect(errors).toEqual([]);
});
