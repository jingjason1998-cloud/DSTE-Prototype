import { test, expect } from '@playwright/test';

const COCKPIT_URL = '/src/cockpit.html#bp/annual-plan';

async function acceptConfirms(page) {
  page.on('dialog', async dialog => {
    if (dialog.type() === 'confirm') {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });
}

test.describe('年度经营计划', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('dste_api_base', '');
    });
    await page.goto(COCKPIT_URL);
    await page.waitForTimeout(1500);
  });

  test('页面加载并显示总览 Tab', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await expect(page.locator('.page-title')).toContainText('年度经营计划');
    await expect(page.locator('#ap-tab-content')).toContainText('KPI指标');
    await expect(page.locator('#ap-tab-content')).toContainText('年度重点工作');
    expect(errors).toEqual([]);
  });

  test('Tab 切换：总览 ↔ 分解视图', async ({ page }) => {
    await page.locator('[data-action="ap-switch-tab"][data-tab="decomposition"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#ap-tab-content')).toContainText('考核指标');

    await page.locator('[data-action="ap-switch-tab"][data-tab="overview"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#ap-tab-content')).toContainText('KPI指标');
  });

  test('KPI 编辑面板打开、修改并保存', async ({ page }) => {
    const kpiRow = page.locator('#ap-tab-content table').first().locator('tbody tr').first();
    await expect(kpiRow).toBeVisible();
    await kpiRow.click();
    await page.waitForTimeout(300);

    await expect(page.locator('.ap-edit-panel')).toBeVisible();
    await page.locator('#ap-edit-target').fill('200000');
    await page.locator('[data-action="ap-save-kpi"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#ap-tab-content')).toContainText('200,000');
  });

  test('添加 KPI 弹窗包含责任人/部门/单位字段', async ({ page }) => {
    await page.locator('[data-action="ap-add-kpi"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('.omp-modal')).toBeVisible();
    await expect(page.locator('#ap-add-owner')).toBeVisible();
    await expect(page.locator('#ap-add-dept')).toBeVisible();
    await expect(page.locator('#ap-add-unit')).toBeVisible();

    await page.locator('[data-modal-action="modal-cancel-add-kpi"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('.omp-modal')).not.toBeVisible();
  });

  test('新增、编辑、删除重点工作', async ({ page }) => {
    await acceptConfirms(page);

    await page.locator('[data-action="ap-add-keytask"]').click();
    await page.waitForTimeout(300);
    await page.locator('#ap-kt-name').fill('E2E测试重点工作');
    await page.locator('#ap-kt-seq').fill('99');
    await page.locator('[data-modal-action="modal-save-keytask"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#ap-tab-content')).toContainText('E2E测试重点工作');

    // 编辑
    const editBtn = page.locator('[data-action="ap-edit-keytask"]').last();
    await editBtn.click();
    await page.waitForTimeout(300);
    await page.locator('#ap-kt-name').fill('E2E测试重点工作-已改');
    await page.locator('[data-modal-action="modal-save-keytask"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#ap-tab-content')).toContainText('E2E测试重点工作-已改');

    // 删除
    await page.locator('[data-action="ap-edit-keytask"]').last().click();
    await page.waitForTimeout(300);
    await page.locator('[data-modal-action="modal-delete-keytask"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#ap-tab-content')).not.toContainText('E2E测试重点工作-已改');
  });

  test('分解视图按实际父级 KPI 动态渲染', async ({ page }) => {
    await page.locator('[data-action="ap-switch-tab"][data-tab="decomposition"]').click();
    await page.waitForTimeout(500);

    const rows = page.locator('#ap-tab-content table tbody tr');
    await expect.poll(async () => await rows.count()).toBeGreaterThan(0);
    await expect(page.locator('#ap-tab-content')).toContainText('合计');
  });

  test('分解 KPI 保存成功', async ({ page }) => {
    await acceptConfirms(page);
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.locator('[data-action="ap-decompose"]').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.omp-modal')).toBeVisible();

    // 10 个战区目标值相加等于父级目标 178623
    const targets = [18000, 18000, 18000, 18000, 18000, 18000, 18000, 18000, 18000, 16623];
    for (let i = 0; i < targets.length; i++) {
      await page.locator(`#ap-decomp-target-${i}`).fill(String(targets[i]));
    }
    await page.locator('[data-modal-action="modal-save-decompose"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('.omp-modal')).not.toBeVisible();
    expect(errors).toEqual([]);

    // 验证分解视图中的合计等于父级目标
    await page.locator('[data-action="ap-switch-tab"][data-tab="decomposition"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#ap-tab-content')).toContainText('178,623');
  });

  test('重复分解同一 KPI 不会生成重复子节点', async ({ page }) => {
    await acceptConfirms(page);

    const decomposeAndSave = async (targets) => {
      await page.locator('[data-action="ap-decompose"]').first().click();
      await page.waitForTimeout(300);
      for (let i = 0; i < targets.length; i++) {
        await page.locator(`#ap-decomp-target-${i}`).fill(String(targets[i]));
      }
      await page.locator('[data-modal-action="modal-save-decompose"]').click();
      await page.waitForTimeout(500);
    };

    const firstTargets = [18000, 18000, 18000, 18000, 18000, 18000, 18000, 18000, 18000, 16623];
    await decomposeAndSave(firstTargets);

    const childCountFirst = await page.evaluate(() => {
      const raw = localStorage.getItem('dste_omp_kpi_instances_v1') || '[]';
      return JSON.parse(raw).filter(k => k.parentId === 'kpi_sales_d' && k.decomposeBy === 'warzone').length;
    });

    const secondTargets = [17000, 17000, 17000, 17000, 17000, 17000, 17000, 17000, 17000, 25623];
    await decomposeAndSave(secondTargets);

    const childCountSecond = await page.evaluate(() => {
      const raw = localStorage.getItem('dste_omp_kpi_instances_v1') || '[]';
      return JSON.parse(raw).filter(k => k.parentId === 'kpi_sales_d' && k.decomposeBy === 'warzone').length;
    });

    expect(childCountFirst).toBe(10);
    expect(childCountSecond).toBe(10);
  });

  test('分解目标之和不等于父目标时仍可保存并给出提醒', async ({ page }) => {
    await acceptConfirms(page);

    await page.locator('[data-action="ap-decompose"]').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.omp-modal')).toBeVisible();

    // 只改一个值，导致合计不等于父目标
    await page.locator('#ap-decomp-target-0').fill('99999');
    await page.locator('[data-modal-action="modal-save-decompose"]').click();
    await page.waitForTimeout(500);

    // 弹窗应关闭，保存成功，但给出提醒
    await expect(page.locator('.omp-modal')).not.toBeVisible();

    // 切换到分解视图验证保存的值
    await page.locator('[data-action="ap-switch-tab"][data-tab="decomposition"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#ap-tab-content')).toContainText('99,999');
  });
  test('发布到执行切换阶段标签', async ({ page }) => {
    await acceptConfirms(page);

    // 确保当前是 planning
    await page.evaluate(() => {
      const raw = localStorage.getItem('dste_cycles_v1') || '[]';
      const cycles = JSON.parse(raw);
      const idx = cycles.findIndex(c => c.id === 'cycle_2026_marketing');
      if (idx > -1) cycles[idx].phase = 'planning';
      localStorage.setItem('dste_cycles_v1', JSON.stringify(cycles));
    });
    await page.goto(COCKPIT_URL);
    await page.waitForTimeout(1500);

    await expect(page.locator('.page-header')).toContainText('阶段: 规划中');
    await page.locator('[data-action="ap-publish"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.page-header')).toContainText('阶段: 执行中');
  });
});
