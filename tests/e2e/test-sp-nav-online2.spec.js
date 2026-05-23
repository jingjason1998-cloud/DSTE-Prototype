import { test, expect } from '@playwright/test';

test('线上 SP 标签点击 - 详细诊断', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push({type: 'pageerror', msg: err.message, stack: err.stack}));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push({type: 'console', msg: msg.text()});
  });

  await page.goto('https://Dste.fineres.com/cockpit.html');
  await page.waitForTimeout(3000);

  console.log('Initial URL:', page.url());
  console.log('Initial errors:', errors);

  // 检查初始状态
  const initialSidebarHTML = await page.locator('#sidebar').innerHTML().catch(e => 'ERROR: ' + e.message);
  console.log('Initial sidebar HTML length:', initialSidebarHTML.length);

  // 点击 SP 标签
  const spLink = page.locator('.top-nav-item[data-phase="sp"]').first();
  await spLink.click();
  await page.waitForTimeout(3000);

  console.log('After click URL:', page.url());
  console.log('All errors:', errors);

  const sidebarHTML = await page.locator('#sidebar').innerHTML().catch(e => 'ERROR: ' + e.message);
  console.log('Sidebar HTML after click length:', sidebarHTML.length);
  console.log('Sidebar HTML preview:', sidebarHTML.substring(0, 500));

  const contentHTML = await page.locator('#page-content').innerHTML().catch(e => 'ERROR: ' + e.message);
  console.log('Content HTML preview:', contentHTML.substring(0, 500));
});
