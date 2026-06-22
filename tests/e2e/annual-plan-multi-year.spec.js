import { test, expect } from '@playwright/test';

const COCKPIT_URL = '/src/cockpit.html#bp/annual-plan';

test.describe('年度经营计划 - 多年度切换', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('dste_api_base', '');
    });
    await page.goto(COCKPIT_URL);
    await page.waitForTimeout(1500);
  });

  test('周期选择器包含 2025/2026/2027 三个选项', async ({ page }) => {
    const options = await page.locator('#global-cycle-select option').allTextContents();
    expect(options).toContain('2025年度 — 营销线');
    expect(options).toContain('2026年度 — 营销线');
    expect(options).toContain('2027年度 — 营销线');
  });

  test('默认显示 2026 年度数据', async ({ page }) => {
    const selected = await page.locator('#global-cycle-select').inputValue();
    expect(selected).toBe('cycle_2026_marketing');
    await expect(page.locator('#ap-tab-content')).toContainText('178,623');
  });

  test('切换到 2025 年度显示该年度 KPI 数据', async ({ page }) => {
    await page.locator('#global-cycle-select').selectOption('cycle_2025_marketing');
    await page.waitForTimeout(800);

    const selected = await page.locator('#global-cycle-select').inputValue();
    expect(selected).toBe('cycle_2025_marketing');

    // 2025 年销售额-D 目标 = 178623 * 0.9 = 160761
    await expect(page.locator('#ap-tab-content')).toContainText('160,761');
    // 不应显示 2026 年的 178,623
    await expect(page.locator('#ap-tab-content')).not.toContainText('178,623');
  });

  test('切换到 2027 年度显示该年度 KPI 数据', async ({ page }) => {
    await page.locator('#global-cycle-select').selectOption('cycle_2027_marketing');
    await page.waitForTimeout(800);

    const selected = await page.locator('#global-cycle-select').inputValue();
    expect(selected).toBe('cycle_2027_marketing');

    // 2027 年销售额-D 目标 = 178623 * 1.1 = 196486
    await expect(page.locator('#ap-tab-content')).toContainText('196,485');
  });

  test('年度间重点工作相互隔离', async ({ page }) => {
    // 2026 默认有 6 条重点工作
    await expect(page.locator('[data-action="ap-edit-keytask"]')).toHaveCount(6);

    // 切换到 2025
    await page.locator('#global-cycle-select').selectOption('cycle_2025_marketing');
    await page.waitForTimeout(800);
    await expect(page.locator('[data-action="ap-edit-keytask"]')).toHaveCount(6);

    // 切换到 2027
    await page.locator('#global-cycle-select').selectOption('cycle_2027_marketing');
    await page.waitForTimeout(800);
    await expect(page.locator('[data-action="ap-edit-keytask"]')).toHaveCount(6);
  });

  test('切换回 2026 年度数据保持不变', async ({ page }) => {
    await page.locator('#global-cycle-select').selectOption('cycle_2025_marketing');
    await page.waitForTimeout(800);
    await page.locator('#global-cycle-select').selectOption('cycle_2026_marketing');
    await page.waitForTimeout(800);

    await expect(page.locator('#ap-tab-content')).toContainText('178,623');
  });

  test('在 2027 年度添加重点工作后切换年份不串扰', async ({ page }) => {
    page.on('dialog', async dialog => {
      if (dialog.type() === 'confirm') await dialog.accept();
      else await dialog.dismiss();
    });

    await page.locator('#global-cycle-select').selectOption('cycle_2027_marketing');
    await page.waitForTimeout(800);

    await page.locator('[data-action="ap-add-keytask"]').click();
    await page.waitForTimeout(300);
    await page.locator('#ap-kt-name').fill('2027专属测试重点工作');
    await page.locator('#ap-kt-seq').fill('99');
    await page.locator('[data-modal-action="modal-save-keytask"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#ap-tab-content')).toContainText('2027专属测试重点工作');

    // 切换到 2026，不应看到 2027 新增的重点工作
    await page.locator('#global-cycle-select').selectOption('cycle_2026_marketing');
    await page.waitForTimeout(800);
    await expect(page.locator('#ap-tab-content')).not.toContainText('2027专属测试重点工作');
  });
});
