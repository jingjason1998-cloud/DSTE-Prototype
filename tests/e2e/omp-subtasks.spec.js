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

async function seedTask(page, task) {
  await page.evaluate((t) => {
    const tasks = JSON.parse(localStorage.getItem('dste_omp_tasks_v1') || '[]');
    tasks.push(t);
    localStorage.setItem('dste_omp_tasks_v1', JSON.stringify(tasks));
  }, task);
}

test.describe('OMP 重点工作子任务', () => {
  test.beforeEach(async ({ page }) => {
    await acceptConfirms(page);
    await page.goto('/src/cockpit.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('dste_api_base', '');
      localStorage.setItem('dste_omp_data_version', 'canvas-v11');
      localStorage.setItem('dste_omp_tasks_v1', JSON.stringify([]));
      window._ompState = window._ompState || {};
      window._ompState.taskViewMode = 'list';
    });
  });

  test('创建子任务后出现在父任务详情标签中', async ({ page }) => {
    await seedTask(page, {
      id: 'task_parent_1',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '父任务',
      description: '',
      type: 'improvement',
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
    await page.goto(OMP_URL);
    await page.waitForTimeout(1200);

    await page.locator('[data-action="omp-edit-task"][data-id="task_parent_1"]').click();
    await page.waitForTimeout(300);

    // Switch to subtasks tab
    await page.locator('.omp-task-edit-tab:has-text("子任务")').click();
    await page.waitForTimeout(200);

    // Add subtask
    await page.locator('button:has-text("+ 添加子任务")').click();
    await page.waitForTimeout(200);
    await page.locator('.omp-subtask-row .omp-subtask-name').fill('子任务A');
    await page.locator('.omp-subtask-row .omp-subtask-owner').fill('负责人B');
    await page.locator('.omp-subtask-row .omp-subtask-progress').fill('50');
    await page.locator('.omp-subtask-row .omp-subtask-weight').fill('2');

    await page.locator('.omp-modal .btn-primary:has-text("保存")').click();
    await expect(page.locator('#omp-active-modal')).toHaveCount(0);

    // Verify subtask visible in view modal
    await page.locator('[data-action="omp-view-task"][data-id="task_parent_1"]').click();
    await page.waitForTimeout(300);
    await page.locator('.omp-task-view-tab:has-text("子任务")').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#omp-task-view-tab-content')).toContainText('子任务A');
    await expect(page.locator('#omp-task-view-tab-content')).toContainText('50%');
  });

  test('父任务进度按子任务权重自动聚合', async ({ page }) => {
    await seedTask(page, {
      id: 'task_parent_2',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '聚合测试',
      description: '',
      type: 'improvement',
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
      id: 'subtask_2_1',
      parentId: 'task_parent_2',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '子任务1',
      type: 'improvement',
      status: 'active',
      progress: 50,
      weight: 1,
      owner: '负责人B',
      dept: '测试部',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      relatedKpiIds: [],
      members: [],
    });
    await seedTask(page, {
      id: 'subtask_2_2',
      parentId: 'task_parent_2',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '子任务2',
      type: 'improvement',
      status: 'active',
      progress: 100,
      weight: 3,
      owner: '负责人C',
      dept: '测试部',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      relatedKpiIds: [],
      members: [],
    });

    await page.goto(OMP_URL);
    await page.waitForTimeout(1200);

    // Weighted average: (50*1 + 100*3) / 4 = 87.5 -> 88
    await expect(page.locator('text=聚合测试').locator('..').locator('..')).toContainText('88%');
  });

  test('子任务不单独出现在重点工作列表中', async ({ page }) => {
    await seedTask(page, {
      id: 'task_parent_5',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '列表过滤测试',
      description: '',
      type: 'improvement',
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
      id: 'subtask_5_1',
      parentId: 'task_parent_5',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '不应出现的子任务',
      type: 'improvement',
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
    await page.waitForTimeout(1200);

    // Parent should be visible
    await expect(page.locator('text=列表过滤测试').first()).toBeVisible();
    // Subtask should not appear as a top-level row
    await expect(page.locator('.data-table tbody')).not.toContainText('不应出现的子任务');
    // Total count should only count parent tasks
    await expect(page.locator('text=共 1 项工作')).toBeVisible();
  });

  test('删除父任务级联删除子任务', async ({ page }) => {
    await seedTask(page, {
      id: 'task_parent_3',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '将被删除',
      type: 'improvement',
      status: 'active',
      progress: 0,
      owner: '负责人A',
      dept: '测试部',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      relatedKpiIds: [],
      members: [],
    });
    await seedTask(page, {
      id: 'subtask_3_1',
      parentId: 'task_parent_3',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '子任务随删',
      type: 'improvement',
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
    await page.waitForTimeout(1200);

    await page.locator('[data-action="omp-delete-task"][data-id="task_parent_3"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('.data-table tbody')).not.toContainText('将被删除');
    await expect(page.locator('.data-table tbody')).not.toContainText('子任务随删');
  });

  test('人员配置矩阵中可展开父任务显示子任务行', async ({ page }) => {
    await seedTask(page, {
      id: 'task_parent_4',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '拖拽测试',
      type: 'improvement',
      status: 'active',
      progress: 0,
      owner: '负责人A',
      dept: '测试部',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      relatedKpiIds: [],
      members: [],
    });
    await seedTask(page, {
      id: 'subtask_4_1',
      parentId: 'task_parent_4',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '子拖拽',
      type: 'improvement',
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
    await page.waitForTimeout(1200);

    // Switch to matrix (new staffing) view
    await page.locator('[data-action="omp-switch-task-view"][data-view="matrix"]').click();
    await page.waitForTimeout(500);

    // Before expand, subtask row should not be visible
    await expect(page.locator('text=子拖拽')).not.toBeVisible();

    // Expand parent
    await page.locator('[data-action="omp-toggle-task-expand"][data-id="task_parent_4"]').click();
    await page.waitForTimeout(300);

    // Subtask row should be visible in matrix
    await expect(page.locator('text=子拖拽')).toBeVisible();
  });

  test('添加第二个子任务时仍可保存对第一个子任务的修改', async ({ page }) => {
    await seedTask(page, {
      id: 'task_parent_6',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '多子任务编辑测试',
      description: '',
      type: 'improvement',
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
    await page.goto(OMP_URL);
    await page.waitForTimeout(1200);

    // 第一次添加子任务 A
    await page.locator('[data-action="omp-edit-task"][data-id="task_parent_6"]').click();
    await page.waitForTimeout(300);
    await page.locator('.omp-task-edit-tab:has-text("子任务")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("+ 添加子任务")').click();
    await page.waitForTimeout(200);
    await page.locator('.omp-subtask-row .omp-subtask-name').fill('子任务A');
    await page.locator('.omp-subtask-row .omp-subtask-owner').fill('负责人B');
    await page.locator('.omp-modal .btn-primary:has-text("保存")').click();
    await page.waitForTimeout(500);

    // 第二次添加子任务 B，同时修改子任务 A
    await page.locator('[data-action="omp-edit-task"][data-id="task_parent_6"]').click();
    await page.waitForTimeout(300);
    await page.locator('.omp-task-edit-tab:has-text("子任务")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("+ 添加子任务")').click();
    await page.waitForTimeout(200);
    const rows = page.locator('.omp-subtask-row');
    await rows.nth(0).locator('.omp-subtask-name').fill('子任务A-已修改');
    await rows.nth(1).locator('.omp-subtask-name').fill('子任务B');
    await rows.nth(1).locator('.omp-subtask-owner').fill('负责人C');
    await page.locator('.omp-modal .btn-primary:has-text("保存")').click();
    await page.waitForTimeout(500);

    // 验证两个子任务都保存，且子任务 A 的修改未丢失
    await page.locator('[data-action="omp-view-task"][data-id="task_parent_6"]').click();
    await page.waitForTimeout(300);
    await page.locator('.omp-task-view-tab:has-text("子任务")').click();
    await page.waitForTimeout(200);
    const content = page.locator('#omp-task-view-tab-content');
    await expect(content).toContainText('子任务A-已修改');
    await expect(content).toContainText('子任务B');
  });

  test('新增子任务后支持上下排序且顺序持久化', async ({ page }) => {
    await seedTask(page, {
      id: 'task_parent_8',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '排序测试',
      description: '',
      type: 'improvement',
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
    await page.goto(OMP_URL);
    await page.waitForTimeout(1200);

    await page.locator('[data-action="omp-edit-task"][data-id="task_parent_8"]').click();
    await page.waitForTimeout(300);
    await page.locator('.omp-task-edit-tab:has-text("子任务")').click();
    await page.waitForTimeout(200);

    // 添加两个子任务
    await page.locator('button:has-text("+ 添加子任务")').click();
    await page.waitForTimeout(200);
    await page.locator('.omp-subtask-row .omp-subtask-name').fill('子任务A');
    await page.locator('.omp-subtask-row .omp-subtask-owner').fill('负责人B');

    await page.locator('button:has-text("+ 添加子任务")').click();
    await page.waitForTimeout(200);
    const rows = page.locator('.omp-subtask-row');
    await rows.nth(1).locator('.omp-subtask-name').fill('子任务B');
    await rows.nth(1).locator('.omp-subtask-owner').fill('负责人C');

    // 上移子任务B到第一位
    await rows.nth(1).locator('button[title="上移"]').click();
    await page.waitForTimeout(200);

    // 保存
    await page.locator('.omp-modal .btn-primary:has-text("保存")').click();
    await page.waitForTimeout(500);

    // 重新打开查看顺序
    await page.locator('[data-action="omp-view-task"][data-id="task_parent_8"]').click();
    await page.waitForTimeout(300);
    await page.locator('.omp-task-view-tab:has-text("子任务")').click();
    await page.waitForTimeout(200);
    const content = page.locator('#omp-task-view-tab-content');
    await expect(content).toContainText('1. 子任务B');
    await expect(content).toContainText('2. 子任务A');
  });

  test('子任务自动编号在增删移后即时更新', async ({ page }) => {
    await seedTask(page, {
      id: 'task_parent_9',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '编号测试',
      description: '',
      type: 'improvement',
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
    await page.goto(OMP_URL);
    await page.waitForTimeout(1200);

    await page.locator('[data-action="omp-edit-task"][data-id="task_parent_9"]').click();
    await page.waitForTimeout(300);
    await page.locator('.omp-task-edit-tab:has-text("子任务")').click();
    await page.waitForTimeout(200);

    // 添加三个子任务
    for (let i = 0; i < 3; i++) {
      await page.locator('button:has-text("+ 添加子任务")').click();
      await page.waitForTimeout(200);
      const rows = page.locator('.omp-subtask-row');
      await rows.nth(i).locator('.omp-subtask-name').fill(`子任务${String.fromCharCode(65 + i)}`);
      await rows.nth(i).locator('.omp-subtask-owner').fill(`负责人${String.fromCharCode(66 + i)}`);
    }

    const rows = page.locator('.omp-subtask-row');
    // 初始编号 1 2 3
    await expect(rows.nth(0).locator('.omp-subtask-number')).toHaveText('1.');
    await expect(rows.nth(1).locator('.omp-subtask-number')).toHaveText('2.');
    await expect(rows.nth(2).locator('.omp-subtask-number')).toHaveText('3.');

    // 上移第三个到第一位
    await rows.nth(2).locator('button[title="上移"]').click();
    await page.waitForTimeout(100);
    await rows.nth(1).locator('button[title="上移"]').click();
    await page.waitForTimeout(100);

    // 编号应更新为 1 2 3（按当前顺序：C A B）
    await expect(rows.nth(0).locator('.omp-subtask-number')).toHaveText('1.');
    await expect(rows.nth(1).locator('.omp-subtask-number')).toHaveText('2.');
    await expect(rows.nth(2).locator('.omp-subtask-number')).toHaveText('3.');

    // 删除第一个，编号更新
    await rows.nth(0).locator('button[title="删除"]').click();
    await page.waitForTimeout(200);
    const remaining = page.locator('.omp-subtask-row');
    await expect(remaining.nth(0).locator('.omp-subtask-number')).toHaveText('1.');
    await expect(remaining.nth(1).locator('.omp-subtask-number')).toHaveText('2.');
  });

  test('首行无上移按钮末行无下移按钮', async ({ page }) => {
    await seedTask(page, {
      id: 'task_parent_10',
      cycleId: 'cycle_2026_marketing',
      source: 'omp',
      name: '边界按钮测试',
      description: '',
      type: 'improvement',
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
    await page.goto(OMP_URL);
    await page.waitForTimeout(1200);

    await page.locator('[data-action="omp-edit-task"][data-id="task_parent_10"]').click();
    await page.waitForTimeout(300);
    await page.locator('.omp-task-edit-tab:has-text("子任务")').click();
    await page.waitForTimeout(200);

    for (let i = 0; i < 2; i++) {
      await page.locator('button:has-text("+ 添加子任务")').click();
      await page.waitForTimeout(200);
      const rows = page.locator('.omp-subtask-row');
      await rows.nth(i).locator('.omp-subtask-name').fill(`子任务${String.fromCharCode(65 + i)}`);
      await rows.nth(i).locator('.omp-subtask-owner').fill(`负责人${String.fromCharCode(66 + i)}`);
    }

    const rows = page.locator('.omp-subtask-row');
    await expect(rows.nth(0).locator('button[title="上移"]')).toBeHidden();
    await expect(rows.nth(0).locator('button[title="下移"]')).toBeVisible();
    await expect(rows.nth(1).locator('button[title="上移"]')).toBeVisible();
    await expect(rows.nth(1).locator('button[title="下移"]')).toBeHidden();
  });
});
