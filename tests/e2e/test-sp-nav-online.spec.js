import { test, expect } from '@playwright/test';

test('线上 SP 标签点击', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('https://Dste.fineres.com/cockpit.html');
  await page.waitForTimeout(2000);

  const spLink = page.locator('.top-nav-item[data-phase="sp"]').first();
  await spLink.click();
  await page.waitForTimeout(2000);

  console.log('URL after click:', page.url());
  console.log('Errors:', errors);

  const sidebarItems = await page.locator('.sidebar-item').allTextContents();
  console.log('Sidebar items:', sidebarItems.slice(0, 10));
});
