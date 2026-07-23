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

  // 新工作区标签系统：SP 战略地图在驾驶舱内通过 iframe 嵌入
  console.log('URL after click:', page.url());
  expect(page.url()).toContain('cockpit.html#sp/strategy-map');

  // iframe 应加载 strategy-map-list.html
  const iframe = page.locator('.workspace-iframe');
  await expect(iframe).toBeVisible();
  await expect(iframe).toHaveAttribute('src', /strategy-map-list\.html/);
  // 嵌入模式不渲染 sidebar，直接检查 iframe 正文内容
  const iframeBody = iframe.contentFrame().locator('body');
  await expect(iframeBody).toContainText('战略地图');
});
