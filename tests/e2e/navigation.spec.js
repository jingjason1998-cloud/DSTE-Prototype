import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('top nav has 6 phases', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    const navLinks = page.locator('.top-nav-links li');
    await expect(navLinks).toHaveCount(6);
    await expect(page.locator('.top-nav-links')).toContainText('驾驶舱');
    await expect(page.locator('.top-nav-links')).toContainText('SP');
    await expect(page.locator('.top-nav-links')).toContainText('BP');
    await expect(page.locator('.top-nav-links')).toContainText('执行');
    await expect(page.locator('.top-nav-links')).toContainText('评估');
    await expect(page.locator('.top-nav-links')).toContainText('AI');
  });

  test('sidebar renders for dashboard phase', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    const sidebar = page.locator('#sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toContainText('驾驶舱概览');
    await expect(sidebar).toContainText('战略地图');
    await expect(sidebar).toContainText('KPI 看板');
  });

  test('clicking SP nav updates sidebar', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('.top-nav-item[data-phase="sp"]').click();
    await expect(page.locator('#sidebar')).toContainText('战略制定');
    await expect(page.locator('#sidebar')).toContainText('战略地图');
    await expect(page.locator('#sidebar')).toContainText('市场洞察');
  });

  test('theme toggle works', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.locator('#theme-toggle').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('Page Content', () => {
  test('dashboard shows KPI cards', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await expect(page.locator('.page-content')).toContainText('营收增长率');
    await expect(page.locator('.page-content')).toContainText('客户满意度');
    await expect(page.locator('.page-content')).toContainText('重点工作完成率');
  });

  test('roadmap page accessible from sidebar', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('.sidebar-item[data-page="dashboard/roadmap"]').click();
    await expect(page.locator('.page-content')).toContainText('开发路线图');
    await expect(page.locator('.page-content')).toContainText('Road Map');
  });
});

test.describe('External Pages', () => {
  test('reviewer page loads', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    await expect(page.locator('body')).toContainText('会议材料审核');
  });

  test('business-topics page loads', async ({ page }) => {
    await page.goto('/src/business-topics.html');
    await expect(page.locator('body')).toContainText('业务专题');
  });
});
