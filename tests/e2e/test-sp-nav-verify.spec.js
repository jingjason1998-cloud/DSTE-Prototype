import { test, expect } from '@playwright/test';

test('线上 SP 标签修复验证', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('/src/cockpit.html');
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

  // SP 战略地图入口为 strategy-map-list.html（列表页）
  console.log('URL after click:', page.url());
  expect(page.url()).toContain('strategy-map-list.html');

  // 检查 SP 侧边栏内容（在独立页面中）
  const spSidebarItems = await page.locator('.sidebar-item').allTextContents();
  console.log('SP sidebar:', spSidebarItems);
  expect(spSidebarItems.some(t => t.includes('战略地图'))).toBeTruthy();

  // 检查内容区域有 SP 相关内容
  const contentText = await page.locator('body').textContent();
  console.log('Content preview:', contentText.substring(0, 100));
  expect(contentText).toContain('战略地图');
});
