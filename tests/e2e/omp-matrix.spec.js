import { test, expect } from '@playwright/test';

const OMP_URL = '/src/cockpit.html#exe/tasks';

async function seedTask(page, task) {
  await page.evaluate((t) => {
    const tasks = JSON.parse(localStorage.getItem('dste_omp_tasks_v1') || '[]');
    tasks.push(t);
    localStorage.setItem('dste_omp_tasks_v1', JSON.stringify(tasks));
  }, task);
}

async function seedEmployee(page, employee) {
  await page.evaluate((emp) => {
    const employees = JSON.parse(localStorage.getItem('dste_employees_v1') || '[]');
    employees.push(emp);
    localStorage.setItem('dste_employees_v1', JSON.stringify(employees));
  }, employee);
}

test.describe('OMP 资源配置矩阵', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(OMP_URL);
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('dste_api_base', '');
      localStorage.setItem('dste_omp_data_version', 'canvas-v11');
      localStorage.setItem('dste_omp_tasks_v1', JSON.stringify([]));
      localStorage.setItem('dste_employees_v1', JSON.stringify([]));
    });
    await page.goto(OMP_URL);
    await page.waitForTimeout(1000);
    // Switch to matrix view via button
    await page.locator('[data-action="omp-switch-task-view"][data-view="matrix"]').click();
    await page.waitForTimeout(500);
  });

  test('矩阵视图渲染任务行和负责人/成员/进度列', async ({ page }) => {
    await seedTask(page, {
      id: 'matrix_parent_1',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '矩阵测试父任务',
      description: '',
      type: 'improvement',
      priority: 'P0',
      status: 'active',
      progress: 30,
      owner: '负责人A',
      dept: '测试部',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      relatedKpiIds: [],
      budget: 0,
      actualCost: 0,
      members: ['成员B'],
    });
    await page.goto(OMP_URL);
    await page.waitForTimeout(1000);
    await page.locator('[data-action="omp-switch-task-view"][data-view="matrix"]').click();
    await page.waitForTimeout(500);

    // Verify column headers
    await expect(page.locator('th:has-text("工作名称")')).toBeVisible();
    await expect(page.locator('th:has-text("负责人")')).toBeVisible();
    await expect(page.locator('th:has-text("成员")')).toBeVisible();
    await expect(page.locator('th:has-text("进度")')).toBeVisible();

    // Verify task row content
    await expect(page.locator('text=矩阵测试父任务')).toBeVisible();
    await expect(page.locator('text=负责人A')).toBeVisible();
    await expect(page.locator('text=成员B')).toBeVisible();
    await expect(page.locator('text=30%')).toBeVisible();
  });

  test('从左侧人员列表拖拽人员到矩阵成员单元格', async ({ page }) => {
    await seedTask(page, {
      id: 'matrix_parent_2',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '拖拽矩阵任务',
      description: '',
      type: 'improvement',
      priority: 'P0',
      status: 'active',
      progress: 0,
      owner: '负责人A',
      dept: '测试部',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      relatedKpiIds: [],
      budget: 0,
      actualCost: 0,
      members: [],
    });
    await seedEmployee(page, {
      id: 'E001',
      name: '张三',
      displayName: '张三',
      orgPath: '测试部 > 一组',
      l1Org: '测试部',
      l1Team: '一组',
    });

    await page.goto(OMP_URL);
    await page.waitForTimeout(1000);
    await page.locator('[data-action="omp-switch-task-view"][data-view="matrix"]').click();
    await page.waitForTimeout(500);

    // Drag person from left list to matrix member cell
    const personRow = page.locator('[data-drag="person"][data-person-ref="E001"]');
    const memberCell = page.locator('[data-drop="matrix-member"][data-task-id="matrix_parent_2"]').first();

    await personRow.dragTo(memberCell);
    await page.waitForTimeout(500);

    // Verify member appears in cell
    await expect(memberCell).toContainText('张三');
  });

  test('点击成员 chip 的 × 可从矩阵中移除成员', async ({ page }) => {
    await seedTask(page, {
      id: 'matrix_parent_3',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '移除矩阵成员',
      description: '',
      type: 'improvement',
      priority: 'P0',
      status: 'active',
      progress: 0,
      owner: '负责人A',
      dept: '测试部',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      relatedKpiIds: [],
      budget: 0,
      actualCost: 0,
      members: ['待移除成员'],
    });

    await page.goto(OMP_URL);
    await page.waitForTimeout(1000);
    await page.locator('[data-action="omp-switch-task-view"][data-view="matrix"]').click();
    await page.waitForTimeout(500);

    const memberCell = page.locator('[data-drop="matrix-member"][data-task-id="matrix_parent_3"]').first();
    await expect(memberCell).toContainText('待移除成员');

    await memberCell.locator('[data-action="omp-staffing-remove-member"]').click();
    await page.waitForTimeout(500);

    await expect(memberCell).not.toContainText('待移除成员');
  });

  test('矩阵视图不显示子任务作为独立行', async ({ page }) => {
    await seedTask(page, {
      id: 'matrix_parent_4',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '矩阵父任务',
      description: '',
      type: 'improvement',
      priority: 'P0',
      status: 'active',
      progress: 0,
      owner: '负责人A',
      dept: '测试部',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      relatedKpiIds: [],
      budget: 0,
      actualCost: 0,
      members: [],
    });
    await seedTask(page, {
      id: 'matrix_subtask_4',
      parentId: 'matrix_parent_4',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '不应独立显示的子任务',
      type: 'improvement',
      priority: 'P1',
      status: 'active',
      progress: 0,
      weight: 1,
      owner: '负责人B',
      dept: '测试部',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      relatedKpiIds: [],
      members: [],
    });

    await page.goto(OMP_URL);
    await page.waitForTimeout(1000);
    await page.locator('[data-action="omp-switch-task-view"][data-view="matrix"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('text=矩阵父任务')).toBeVisible();
    await expect(page.locator('text=不应独立显示的子任务')).not.toBeVisible();
  });
});
