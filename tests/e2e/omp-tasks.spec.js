import { test, expect } from '@playwright/test';

const OMP_URL = '/src/cockpit.html#exe/tasks';

async function acceptConfirms(page) {
  page.on('dialog', async dialog => {
    if (dialog.type() === 'confirm') {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });
}

test.describe('OMP 重点工作管理', () => {

  test('OMP 任务列表按当前周期过滤，且不显示年度计划源头任务', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // 注入一个 OMP 本地任务和一个年度计划源头任务，验证过滤
    await page.goto('/src/cockpit.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('dste_api_base', '');
      localStorage.setItem('dste_omp_data_version', 'canvas-v11');
      const tasks = [];
      tasks.push({
        id: 'omp_local_task_1',
        cycleId: 'cycle_2026_marketing',
        source: 'omp',
        name: 'OMP本地任务',
        description: '',
        type: 'strategic',
        priority: 'P0',
        status: 'active',
        progress: 50,
        owner: '测试人',
        dept: '测试部',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        relatedKpiIds: [],
        budget: 100,
        actualCost: 0,
      });
      tasks.push({
        id: 'annual_task_should_hide',
        cycleId: 'cycle_2026_marketing',
        source: 'annual_plan',
        name: '年度计划源头任务（不应显示）',
        seq: 99,
        bscDimension: 'customer',
        owner: '测试人',
        status: 'planning',
        progress: 0,
        relatedKpiIds: [],
      });
      localStorage.setItem('dste_omp_tasks_v1', JSON.stringify(tasks));
      window._ompState = window._ompState || {};
      window._ompState.activeTab = 'tasks';
    });
    await page.goto(OMP_URL);
    await page.waitForTimeout(1500);

    // 应显示 OMP 本地任务
    await expect(page.locator('.data-table tbody')).toContainText('OMP本地任务');

    // 不应显示年度计划源头任务
    await expect(page.locator('.data-table tbody')).not.toContainText('年度计划源头任务（不应显示）');

    expect(errors).toEqual([]);
  });

  test('年度计划发布后，OMP 显示带来源标签的派生任务', async ({ page }) => {
    await acceptConfirms(page);

    // 先跳转到年度计划并发布
    await page.goto('/src/cockpit.html#bp/annual-plan');
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      localStorage.setItem('dste_cycles_v1', JSON.stringify([{
        id: 'cycle_2026_marketing',
        year: 2026,
        name: '2026年度营销线组织绩效',
        phase: 'planning',
        organization: '营销线',
        parentCycleId: null
      }]));
      const tasks = JSON.parse(localStorage.getItem('dste_omp_tasks_v1') || '[]');
      const cleaned = tasks.filter(t => !t.annualPlanTaskId);
      localStorage.setItem('dste_omp_tasks_v1', JSON.stringify(cleaned));
    });
    await page.goto('/src/cockpit.html#bp/annual-plan');
    await page.waitForTimeout(1500);

    await page.locator('[data-action="ap-publish"]').click();
    await page.waitForTimeout(800);

    // 回到 OMP 列表
    await page.goto('/src/cockpit.html');
    await page.evaluate(() => {
      window._ompState = window._ompState || {};
      window._ompState.activeTab = 'tasks';
    });
    await page.goto(OMP_URL);
    await page.waitForTimeout(1500);

    // 应显示「年度计划」来源标签
    await expect(page.locator('.data-table tbody')).toContainText('年度计划');
  });

  test('OMP 任务详情显示年度计划来源链接', async ({ page }) => {
    await acceptConfirms(page);

    // 先发布年度计划
    await page.goto('/src/cockpit.html#bp/annual-plan');
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      localStorage.setItem('dste_cycles_v1', JSON.stringify([{
        id: 'cycle_2026_marketing',
        year: 2026,
        name: '2026年度营销线组织绩效',
        phase: 'planning',
        organization: '营销线',
        parentCycleId: null
      }]));
      const tasks = JSON.parse(localStorage.getItem('dste_omp_tasks_v1') || '[]');
      const cleaned = tasks.filter(t => !t.annualPlanTaskId);
      localStorage.setItem('dste_omp_tasks_v1', JSON.stringify(cleaned));
    });
    await page.goto('/src/cockpit.html#bp/annual-plan');
    await page.waitForTimeout(1500);

    await page.locator('[data-action="ap-publish"]').click();
    await page.waitForTimeout(800);

    // 回到 OMP 并查看详情
    await page.goto('/src/cockpit.html');
    await page.evaluate(() => {
      window._ompState = window._ompState || {};
      window._ompState.activeTab = 'tasks';
    });
    await page.goto(OMP_URL);
    await page.waitForTimeout(1500);

    const viewBtn = page.locator('[data-action="omp-view-task"]').first();
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();
    await page.waitForTimeout(300);

    await expect(page.locator('.omp-modal')).toContainText('年度经营计划');
    await expect(page.locator('.omp-modal')).toContainText('查看源头');
  });
});
