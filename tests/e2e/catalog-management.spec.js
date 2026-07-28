import { test, expect } from '@playwright/test';

const COCKPIT_URL = '/src/cockpit.html#admin/catalog-management';
const TASKS_URL = '/src/cockpit.html#exe/tasks';

test.describe('目录管理', () => {
  test.beforeEach(async ({ page }) => {
    // 自动处理 prompt / confirm / alert 对话框
    let promptCount = 0;
    page.on('dialog', async dialog => {
      if (dialog.type() === 'prompt') {
        promptCount++;
        const name = promptCount === 1 ? '根目录' : '子目录';
        await dialog.accept(name);
      } else if (dialog.type() === 'confirm') {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
  });

  test('目录管理页加载并支持创建根目录', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(COCKPIT_URL);
    await page.waitForSelector('.page-title', { timeout: 30000 });
    await expect(page.locator('.page-title')).toContainText('目录管理');

    // 创建根目录
    await page.locator('[data-action="catalog-add-root"]').click();
    await page.waitForTimeout(300);

    const row = page.locator('.catalog-row').filter({ hasText: '根目录' });
    await expect(row).toHaveCount(1);

    expect(errors).toEqual([]);
  });

  test('可创建子目录并重命名', async ({ page }) => {
    await page.goto(COCKPIT_URL);
    await page.waitForSelector('.page-title', { timeout: 30000 });

    // 创建根目录
    await page.locator('[data-action="catalog-add-root"]').click();
    await page.waitForTimeout(300);

    // 创建子目录（会自动展开）
    await page.locator('[data-action="catalog-add-child"]').first().click();
    await page.waitForTimeout(300);

    const childRow = page.locator('.catalog-row').filter({ hasText: '子目录' });
    await expect(childRow).toHaveCount(1);

    // 重命名子目录
    await childRow.locator('[data-action="catalog-rename"]').click();
    await page.waitForTimeout(200);
    const input = page.locator('.catalog-name-input');
    await input.fill('重命名目录');
    await input.press('Enter');
    await page.waitForTimeout(300);

    await expect(page.locator('.catalog-row').filter({ hasText: '重命名目录' })).toHaveCount(1);
  });

  test('有子目录的目录无法删除', async ({ page }) => {
    await page.goto(COCKPIT_URL);
    await page.waitForSelector('.page-title', { timeout: 30000 });

    // 创建根目录和子目录
    await page.locator('[data-action="catalog-add-root"]').click();
    await page.waitForTimeout(300);
    await page.locator('[data-action="catalog-add-child"]').first().click();
    await page.waitForTimeout(300);

    // 尝试删除根目录（confirm 已自动接受）
    await page.locator('[data-action="catalog-delete"]').first().click();
    await page.waitForTimeout(300);

    // 根目录仍然存在
    await expect(page.locator('.catalog-row').filter({ hasText: '根目录' }).first()).toBeVisible();
  });

  test('重点工作可选择目录并阻止目录删除', async ({ page }) => {
    await page.goto(COCKPIT_URL);
    await page.waitForSelector('.page-title', { timeout: 30000 });

    // 创建目录
    await page.locator('[data-action="catalog-add-root"]').click();
    await page.waitForTimeout(300);

    // 切换到重点工作列表
    await page.goto(TASKS_URL);
    await page.waitForSelector('[data-action="omp-new-task"]', { timeout: 30000 });

    // 新建任务
    await page.locator('[data-action="omp-new-task"]').click();
    await page.waitForTimeout(300);

    // 填写表单
    await page.locator('#omp-task-name').fill('目录测试任务');
    await page.locator('#omp-task-owner').fill('测试负责人');
    await page.locator('#omp-task-dept').fill('测试部');
    await page.locator('#omp-task-end').fill('2026-12-31');

    // 选择目录
    await page.locator('[onclick*="omp_pickTaskCatalog"]').click();
    await page.waitForSelector('#catalogPickerModal.open', { timeout: 5000 });
    await page.waitForTimeout(300);
    const pickerRow = page.locator('#catalogPickerModal .catalog-row').first();
    await expect(pickerRow).toHaveCount(1);
    await pickerRow.click();
    await page.waitForTimeout(300);

    // 保存任务
    await page.locator('#omp-active-modal .btn-primary').click();
    await page.waitForTimeout(500);

    // 返回目录管理页
    await page.goto(COCKPIT_URL);
    await page.waitForSelector('.page-title', { timeout: 30000 });

    // 尝试删除被引用的目录
    await page.locator('[data-action="catalog-delete"]').first().click();
    await page.waitForTimeout(300);

    // 目录仍然存在
    await expect(page.locator('.catalog-row').filter({ hasText: '根目录' }).first()).toBeVisible();
  });
});
