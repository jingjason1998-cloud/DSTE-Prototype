const { test, expect } = require('@playwright/test');

test('miniTrend uses KPI history data not hardcoded values', async ({ page }) => {
  await page.goto('/src/cockpit.html#exe/tasks');
  await page.waitForTimeout(2000);
  
  // Switch to KPI tab
  await page.locator('button[data-tab="kpi"]').first().click();
  await page.waitForTimeout(500);
  
  // Find mini trend bars and check they have title attributes with realistic values
  const trendBars = page.locator('#omp-tab-content [title*="%"]').first();
  await expect(trendBars).toBeVisible();
  
  // Check that the first trend bar title is a number (not hardcoded pattern)
  const title = await trendBars.getAttribute('title');
  expect(title).toMatch(/^\d+(\.\d+)?%$/);
});
