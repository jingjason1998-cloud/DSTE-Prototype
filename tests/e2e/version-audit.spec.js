import { test, expect } from '@playwright/test';

/**
 * 版本审计看板端到端测试
 * 覆盖：页面加载、API 响应、对比表格渲染、刷新/复制按钮
 */

test.describe('版本审计看板', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/cockpit.html#dashboard/version-audit');
    // 等待 SPA 路由渲染完成
    await page.waitForTimeout(1500);
  });

  test('页面标题正确', async ({ page }) => {
    await expect(page.locator('.page-title')).toContainText('版本审计');
  });

  test('生产环境状态卡片显示', async ({ page }) => {
    const statusCard = page.locator('.card', { hasText: '生产环境状态' });
    await expect(statusCard).toBeVisible();
  });

  test('三环境对比表格存在', async ({ page }) => {
    const table = page.locator('table');
    await expect(table).toBeVisible();
    // 表头包含本地/Git/生产三列
    await expect(table).toContainText('本地');
    await expect(table).toContainText('Git');
    await expect(table).toContainText('生产');
  });

  test('版本号对比行显示', async ({ page }) => {
    const table = page.locator('table');
    await expect(table).toContainText('前端版本');
  });

  test('刷新按钮可用', async ({ page }) => {
    const refreshBtn = page.locator('[data-action="version-audit-refresh"]');
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    // 刷新后页面应保持正常
    await expect(page.locator('.page-title')).toContainText('版本审计');
  });

  test('复制报告按钮可用', async ({ page }) => {
    const copyBtn = page.locator('[data-action="version-audit-copy"]');
    await expect(copyBtn).toBeVisible();
  });

  test('部署检查清单存在', async ({ page }) => {
    const checklist = page.locator('.card', { hasText: '部署检查清单' });
    await expect(checklist).toBeVisible();
    await expect(checklist).toContainText('前端文件已构建');
    await expect(checklist).toContainText('Git tag 已推送');
  });
});
