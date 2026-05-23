import { test, expect } from '@playwright/test';

test('线上 SP 标签修复验证', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('https://Dste.fineres.com/cockpit.html');
  await page.waitForTimeout(3000);

  console.log('Errors after load:', errors);
  expect(errors).toHaveLength(0);

  // 检查初始 sidebar 是否有内容
  const sidebarItems = await page.locator('.sidebar-item').allTextContents();
  console.log('Initial sidebar:', sidebarItems.slice(0, 5));
  expect(sidebarItems.length).toBeGreaterThan(0);

  // 点击 SP 标签
  const spLink = page.locator('.top-nav-item[data-phase="sp"]').first();
  await spLink.click();
  await page.waitForTimeout(2000);

  console.log('URL after click:', page.url());
  expect(page.url()).toContain('#sp/strategy-map');

  // 检查 SP 侧边栏内容
  const spSidebarItems = await page.locator('.sidebar-item').allTextContents();
  console.log('SP sidebar:', spSidebarItems);
  expect(spSidebarItems.some(t => t.includes('战略地图'))).toBeTruthy();

  // 检查内容区域有 SP 相关内容
  const contentText = await page.locator('#page-content').textContent();
  console.log('Content preview:', contentText.substring(0, 100));
  expect(contentText).toContain('战略地图');
});
