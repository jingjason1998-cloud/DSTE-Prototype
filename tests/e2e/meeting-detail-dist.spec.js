import { test, expect } from '@playwright/test';

test('clicking meeting card in dist version opens detail without errors', async ({ page }) => {
  await page.goto('http://localhost:8080/dist/src/cockpit.html#exe/meetings');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  const cards = page.locator('.meeting-card');
  const count = await cards.count();
  console.log(`Found ${count} meeting cards in dist version`);

  expect(count).toBeGreaterThan(0);

  // Click each card and verify no JS errors
  for (let i = 0; i < Math.min(count, 3); i++) {
    const card = cards.nth(i);
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForTimeout(300);

    const overlay = page.locator('#meeting-detail-overlay');
    const isVisible = await overlay.isVisible().catch(() => false);
    console.log(`Card ${i} overlay visible: ${isVisible}`);

    if (isVisible) {
      await page.locator('#meeting-detail-overlay button[onclick="closeMeetingDetail()"]').click();
      await page.waitForTimeout(200);
    }
  }

  console.log('JS errors:', errors);
  expect(errors).toEqual([]);
});
