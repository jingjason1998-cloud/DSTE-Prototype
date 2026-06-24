import { test, expect } from '@playwright/test';

const KPI_URL = '/src/cockpit.html#exe/kpi';

test.describe('OMP KPI 管理页面', () => {
  test('KPI 管理子页面渲染且无脚本错误', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/src/cockpit.html#exe/kpi');
    await page.waitForTimeout(2000);

    // 页面标题与面包屑
    await expect(page.locator('.page-title')).toContainText('KPI管理');
    await expect(page.locator('.breadcrumb')).toContainText('组织绩效管理');
    await expect(page.locator('.breadcrumb')).toContainText('KPI管理');

    // KPI 列表/树内容区域
    const contentArea = page.locator('.page-content');
    await page.locator('[data-action="omp-toggle-view"][data-view="list"]').click();
    await page.waitForTimeout(500);
    await expect(contentArea).toContainText('指标名称');

    // 列表/树视图切换按钮
    await expect(page.locator('[data-action="omp-toggle-view"]')).toHaveCount(2);

    expect(errors).toEqual([]);
  });

  test('KPI 列表只显示派生 KPI，不显示年度计划源头 KPI', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/src/cockpit.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('dste_api_base', '');
      localStorage.setItem('dste_omp_data_version', 'canvas-v12');
      const kpis = [];
      kpis.push({
        id: 'annual_kpi_should_hide',
        cycleId: 'cycle_2026_marketing',
        source: 'annual_plan',
        indicatorId: 'ind_opportunity',
        period: '2026',
        targetValue: 100,
        challengeValue: 120,
        actualValue: 0,
        achievementRate: 0,
        weight: 10,
        owner: '测试人',
        dept: '测试部',
        status: 'active',
        parentId: null,
        level: 0,
        assessmentLevel: 'marketing-line',
        bscDimension: 'process',
        history: [],
        x: null, y: null, width: 170, height: 100,
      });
      kpis.push({
        id: 'omp_kpi_should_show',
        cycleId: 'cycle_2026_marketing',
        source: 'omp',
        annualPlanKpiId: 'annual_kpi_should_hide',
        indicatorId: 'ind_opportunity',
        period: '2026',
        targetValue: 100,
        challengeValue: 120,
        actualValue: 50,
        achievementRate: 50,
        weight: 10,
        owner: '测试人',
        dept: '测试部',
        status: 'lagging',
        parentId: null,
        level: 0,
        assessmentLevel: 'marketing-line',
        bscDimension: 'process',
        history: [],
        x: null, y: null, width: 170, height: 100,
      });
      localStorage.setItem('dste_omp_kpi_instances_v1', JSON.stringify(kpis));
    });
    await page.goto(KPI_URL);
    await page.waitForTimeout(1500);

    // 切换到列表视图
    await page.locator('[data-action="omp-toggle-view"][data-view="list"]').click();
    await page.waitForTimeout(500);

    // 应显示 OMP 派生 KPI
    await expect(page.locator('.data-table tbody')).toContainText('有效商机数');

    // 不应显示年度计划源头 KPI（实际值 0 不应在列表中作为独立行出现）
    // 通过行数判断：只有 1 条 OMP 派生 KPI
    await expect.poll(async () => await page.locator('.data-table tbody tr').count()).toBe(1);

    expect(errors).toEqual([]);
  });

  test('派生 KPI 显示年度计划来源标签', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/src/cockpit.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('dste_api_base', '');
      localStorage.setItem('dste_omp_data_version', 'canvas-v12');
      const kpis = [{
        id: 'omp_kpi_with_source',
        cycleId: 'cycle_2026_marketing',
        source: 'omp',
        annualPlanKpiId: 'some_annual_kpi',
        indicatorId: 'ind_opportunity',
        period: '2026',
        targetValue: 100,
        challengeValue: 120,
        actualValue: 50,
        achievementRate: 50,
        weight: 10,
        owner: '测试人',
        dept: '测试部',
        status: 'lagging',
        parentId: null,
        level: 0,
        assessmentLevel: 'marketing-line',
        bscDimension: 'process',
        history: [],
        x: null, y: null, width: 170, height: 100,
      }];
      localStorage.setItem('dste_omp_kpi_instances_v1', JSON.stringify(kpis));
    });
    await page.goto(KPI_URL);
    await page.waitForTimeout(1500);

    // 切换到列表视图
    await page.locator('[data-action="omp-toggle-view"][data-view="list"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('.data-table tbody')).toContainText('年度计划');

    expect(errors).toEqual([]);
  });

  test('派生 KPI 详情显示来源链接', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/src/cockpit.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('dste_api_base', '');
      localStorage.setItem('dste_omp_data_version', 'canvas-v12');
      const kpis = [{
        id: 'omp_kpi_detail_test',
        cycleId: 'cycle_2026_marketing',
        source: 'omp',
        annualPlanKpiId: 'some_annual_kpi',
        indicatorId: 'ind_opportunity',
        period: '2026',
        targetValue: 100,
        challengeValue: 120,
        actualValue: 50,
        achievementRate: 50,
        weight: 10,
        owner: '测试人',
        dept: '测试部',
        status: 'lagging',
        parentId: null,
        level: 0,
        assessmentLevel: 'marketing-line',
        bscDimension: 'process',
        history: [],
        x: null, y: null, width: 170, height: 100,
      }];
      localStorage.setItem('dste_omp_kpi_instances_v1', JSON.stringify(kpis));
    });
    await page.goto(KPI_URL);
    await page.waitForTimeout(1500);

    // 切换到列表视图
    await page.locator('[data-action="omp-toggle-view"][data-view="list"]').click();
    await page.waitForTimeout(500);

    await page.locator('[data-action="omp-view-kpi"]').first().click();
    await page.waitForTimeout(300);

    await expect(page.locator('.omp-modal')).toContainText('年度计划');
    await expect(page.locator('.omp-modal')).toContainText('查看源头');

    expect(errors).toEqual([]);
  });

  test('编辑派生 KPI 时计划字段被锁定且只更新执行字段', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/src/cockpit.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('dste_api_base', '');
      localStorage.setItem('dste_omp_data_version', 'canvas-v12');
      const kpis = [{
        id: 'omp_kpi_edit_test',
        cycleId: 'cycle_2026_marketing',
        source: 'omp',
        annualPlanKpiId: 'some_annual_kpi',
        indicatorId: 'ind_opportunity',
        period: '2026',
        targetValue: 100,
        challengeValue: 120,
        actualValue: 50,
        achievementRate: 50,
        weight: 10,
        owner: '测试人',
        dept: '测试部',
        status: 'lagging',
        parentId: null,
        level: 0,
        assessmentLevel: 'marketing-line',
        bscDimension: 'process',
        history: [],
        x: null, y: null, width: 170, height: 100,
      }];
      localStorage.setItem('dste_omp_kpi_instances_v1', JSON.stringify(kpis));
    });
    await page.goto(KPI_URL);
    await page.waitForTimeout(1500);

    // 切换到列表视图
    await page.locator('[data-action="omp-toggle-view"][data-view="list"]').click();
    await page.waitForTimeout(500);

    await page.locator('[data-action="omp-edit-kpi"]').first().click();
    await page.waitForTimeout(300);

    // 计划字段应被禁用
    await expect(page.locator('#omp-kpi-target')).toBeDisabled();
    await expect(page.locator('#omp-kpi-challenge')).toBeDisabled();
    await expect(page.locator('#omp-kpi-weight')).toBeDisabled();
    await expect(page.locator('#omp-kpi-assessment-level')).toBeDisabled();

    // 显示年度计划来源
    await expect(page.locator('.omp-modal')).toContainText('年度计划');

    // 修改实际值并保存
    await page.locator('#omp-kpi-actual').fill('80');
    await page.locator('.omp-modal .btn-primary').filter({ hasText: '保存' }).click();
    await page.waitForTimeout(800);

    const savedKpi = await page.evaluate(() => {
      const kpis = JSON.parse(localStorage.getItem('dste_omp_kpi_instances_v1') || '[]');
      return kpis.find(k => k.id === 'omp_kpi_edit_test');
    });
    expect(savedKpi.actualValue).toBe(80);
    expect(savedKpi.targetValue).toBe(100);
    expect(savedKpi.challengeValue).toBe(120);
    expect(savedKpi.weight).toBe(10);
    expect(savedKpi.achievementRate).toBe(80);
    expect(savedKpi.assessmentLevel).toBe('marketing-line');

    expect(errors).toEqual([]);
  });
});
