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

  test('OMP 任务列表按当前周期过滤，年度计划源头任务派生为执行任务且不重复', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // 注入一个 OMP 本地任务和一个年度计划源头任务，验证派生与去重
    await page.goto('/src/cockpit.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('dste_api_base', '');
      localStorage.setItem('dste_omp_data_version', 'canvas-v18');
      const tasks = [];
      tasks.push({
        id: 'omp_local_task_1',
        cycleId: 'cycle_2026_marketing',
        source: 'omp',
        name: 'OMP本地任务',
        description: '',
        type: 'strategic',
        status: 'active',
        progress: 50,
        owner: '测试人',
        dept: '测试部',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        kpiAssociations: [],
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
        kpiAssociations: [],
      });
      localStorage.setItem('dste_omp_tasks_v1', JSON.stringify(tasks));
      window._ompState = window._ompState || {};
      window._ompState.activeTab = 'tasks';
    });
    await page.goto(OMP_URL);
    await page.waitForTimeout(1500);

    // 应显示 OMP 本地任务
    await expect(page.locator('.data-table tbody')).toContainText('OMP本地任务');

    // v0.6.12 起：年度计划源头任务会幂等派生为 OMP 执行任务（source='omp'），
    // 在执行列表中可见；源头行（source='annual_plan'）被过滤，同名任务应只出现一次（无重复行）。
    const derivedRows = page.locator('.data-table tbody tr', { hasText: '年度计划源头任务（不应显示）' });
    await expect(derivedRows).toHaveCount(1);

    expect(errors).toEqual([]);
  });

  test('重点工作管理支持列表与甘特图视图切换', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(OMP_URL);
    await page.waitForTimeout(1500);

    // 默认列表视图
    await expect(page.locator('.data-table tbody')).toBeVisible();

    // 切换到甘特图
    await page.locator('[data-action="omp-switch-task-view"][data-view="gantt"]').click();
    await page.waitForTimeout(500);

    // 甘特图视图应出现月份表头和任务条
    await expect(page.locator('#omp-tab-content')).toContainText('工作名称');
    await expect(page.locator('#omp-tab-content')).toContainText('4月');

    // 切回列表
    await page.locator('[data-action="omp-switch-task-view"][data-view="list"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.data-table tbody')).toBeVisible();

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
    await page.goto(OMP_URL);
    await page.waitForTimeout(1500);

    // 应显示「主KMS链接」来源标签
    await expect(page.locator('.data-table tbody')).toContainText('主KMS链接');
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

  test('年度计划发布同时生成派生任务和派生 KPI', async ({ page }) => {
    await acceptConfirms(page);

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
      const cleanedTasks = tasks.filter(t => !t.annualPlanTaskId);
      localStorage.setItem('dste_omp_tasks_v1', JSON.stringify(cleanedTasks));
      const kpis = JSON.parse(localStorage.getItem('dste_omp_kpi_instances_v1') || '[]');
      const cleanedKpis = kpis.filter(k => !(k.cycleId === 'cycle_2026_marketing' && k.source === 'omp'));
      localStorage.setItem('dste_omp_kpi_instances_v1', JSON.stringify(cleanedKpis));
    });
    await page.goto('/src/cockpit.html#bp/annual-plan');
    await page.waitForTimeout(1500);

    await page.locator('[data-action="ap-publish"]').click();
    await page.waitForTimeout(800);

    const { derivedTaskCount, derivedKpiCount } = await page.evaluate(() => {
      const tasks = JSON.parse(localStorage.getItem('dste_omp_tasks_v1') || '[]');
      const kpis = JSON.parse(localStorage.getItem('dste_omp_kpi_instances_v1') || '[]');
      return {
        derivedTaskCount: tasks.filter(t => t.cycleId === 'cycle_2026_marketing' && t.source === 'omp' && t.annualPlanTaskId).length,
        derivedKpiCount: kpis.filter(k => k.cycleId === 'cycle_2026_marketing' && k.source === 'omp' && k.annualPlanKpiId).length,
      };
    });

    expect(derivedTaskCount).toBeGreaterThan(0);
    expect(derivedKpiCount).toBeGreaterThan(0);
  });

  test.describe('人员配置台通讯录', () => {
    async function setupEmployeeDirectory(page) {
      await page.goto('/src/cockpit.html');
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const employees = [
          {
            id: 'E001',
            name: '张三',
            displayName: '张三',
            orgPath: '销售部 > 华东区',
            l1Org: '销售部',
            l1Team: '华东区',
            searchTokens: ['张三', 'e001', '销售部', '华东区'],
          },
          {
            id: 'E002',
            name: '李四',
            displayName: '李四',
            orgPath: '销售部 > 华南区',
            l1Org: '销售部',
            l1Team: '华南区',
            searchTokens: ['李四', 'e002', '销售部', '华南区'],
          },
          {
            id: 'E003',
            name: '王五',
            displayName: '王五',
            orgPath: '技术部 > 平台组',
            l1Org: '技术部',
            l1Team: '平台组',
            searchTokens: ['王五', 'e003', '技术部', '平台组'],
          },
        ];
        localStorage.setItem('dste_employees_v1', JSON.stringify(employees));
        localStorage.setItem('dste_org_units_v1', '{}');
      });
    }

    test('人员配置矩阵显示组织架构与选中部门人员', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await setupEmployeeDirectory(page);
      await page.goto(OMP_URL);
      await page.waitForTimeout(1500);

      // 切换到人员配置矩阵视图
      await page.locator('[data-action="omp-switch-task-view"][data-view="matrix"]').click();
      await page.waitForTimeout(500);

      const orgTree = page.locator('#omp-matrix-org-tree');
      const personList = page.locator('#omp-matrix-person-list');
      await expect(orgTree).toBeVisible();
      await expect(orgTree).toContainText('销售部');
      await expect(orgTree).toContainText('技术部');

      // 选中 销售部 查看张三
      await page.locator('[data-action="omp-staffing-select-org"]').filter({ hasText: '销售部' }).first().click();
      await page.waitForTimeout(300);
      await expect(personList).toContainText('张三');
      await expect(personList).not.toContainText('王五');

      // 选中 技术部 查看王五
      await page.locator('[data-action="omp-staffing-select-org"]').filter({ hasText: '技术部' }).first().click();
      await page.waitForTimeout(300);
      await expect(personList).toContainText('王五');
      await expect(personList).not.toContainText('张三');

      expect(errors).toEqual([]);
    });

    test('通讯录搜索支持姓名和工号', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await setupEmployeeDirectory(page);
      await page.goto(OMP_URL);
      await page.waitForTimeout(1500);

      await page.locator('[data-action="omp-switch-task-view"][data-view="matrix"]').click();
      await page.waitForTimeout(500);

      await page.locator('#omp-matrix-dir-search').fill('E001');
      await page.waitForTimeout(400);

      // 搜索结果直接展示在通讯录人员列表中
      const personList = page.locator('#omp-matrix-person-list');
      await expect(personList).toContainText('张三');
      await expect(personList).not.toContainText('李四');
      await expect(personList).not.toContainText('王五');

      expect(errors).toEqual([]);
    });

    test('通讯录搜索框在防抖重绘后保持焦点', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await setupEmployeeDirectory(page);
      await page.goto(OMP_URL);
      await page.waitForTimeout(1500);

      await page.locator('[data-action="omp-switch-task-view"][data-view="matrix"]').click();
      await page.waitForTimeout(500);

      const input = page.locator('#omp-matrix-dir-search');
      await input.click();

      for (const char of 'chen') {
        await input.press(char);
        // 超过防抖间隔，确保已触发重绘
        await page.waitForTimeout(400);
        const activeId = await page.evaluate(() => document.activeElement && document.activeElement.id);
        expect(activeId).toBe('omp-matrix-dir-search');
      }

      await expect(input).toHaveValue('chen');
      expect(errors).toEqual([]);
    });

    test('拖拽人员到矩阵成员单元格分配成员', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await setupEmployeeDirectory(page);
      // 注入一个无负责人的干净 OMP 任务
      await page.evaluate(() => {
        const tasks = JSON.parse(localStorage.getItem('dste_omp_tasks_v1') || '[]');
        tasks.push({
          id: 'omp_drag_test_task',
          cycleId: 'cycle_2026_marketing',
          source: 'omp',
          name: '拖拽分配测试任务',
          description: '',
          type: 'improvement',
          progress: 0,
          owner: '',
          members: [],
          dept: '测试部',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          kpiAssociations: [],
          budget: 0,
          actualCost: 0,
        });
        localStorage.setItem('dste_omp_tasks_v1', JSON.stringify(tasks));
      });
      await page.goto(OMP_URL);
      await page.waitForTimeout(1500);

      await page.locator('[data-action="omp-switch-task-view"][data-view="matrix"]').click();
      await page.waitForTimeout(500);

      // 选中 销售部 找到张三
      await page.locator('[data-action="omp-staffing-select-org"]').filter({ hasText: '销售部' }).first().click();
      await page.waitForTimeout(300);

      // 将张三从通讯录拖到矩阵成员单元格
      const personCard = page.locator('[data-drag="person"][data-person-ref="E001"]');
      const memberCell = page.locator('[data-drop="matrix-member"][data-task-id="omp_drag_test_task"]').first();
      await expect(personCard).toBeVisible();
      await expect(memberCell).toBeVisible();
      await personCard.dragTo(memberCell);
      await page.waitForTimeout(500);

      // 验证测试任务成员已更新
      const dragTaskMembers = await page.evaluate(() => {
        const tasks = JSON.parse(localStorage.getItem('dste_omp_tasks_v1') || '[]');
        const task = tasks.find(t => t.id === 'omp_drag_test_task');
        return task ? (task.members || []) : [];
      });
      expect(dragTaskMembers).toContain('E001');

      expect(errors).toEqual([]);
    });

    test('点击成员 chip 的 × 移除成员', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await setupEmployeeDirectory(page);
      // 注入一个已有成员的 OMP 任务
      await page.evaluate(() => {
        const tasks = JSON.parse(localStorage.getItem('dste_omp_tasks_v1') || '[]');
        tasks.push({
          id: 'omp_remove_test_task',
          cycleId: 'cycle_2026_marketing',
          source: 'omp',
          name: '移除成员测试任务',
          description: '',
          type: 'improvement',
          progress: 0,
          owner: '',
          members: ['E001'],
          dept: '测试部',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          kpiAssociations: [],
          budget: 0,
          actualCost: 0,
        });
        localStorage.setItem('dste_omp_tasks_v1', JSON.stringify(tasks));
      });
      await page.goto(OMP_URL);
      await page.waitForTimeout(1500);

      await page.locator('[data-action="omp-switch-task-view"][data-view="matrix"]').click();
      await page.waitForTimeout(500);

      // 点击成员 chip 上的 ×
      const removeBtn = page.locator('[data-drop="matrix-member"][data-task-id="omp_remove_test_task"] [data-action="omp-staffing-remove-member"]');
      await expect(removeBtn).toBeVisible();
      await removeBtn.click();
      await page.waitForTimeout(500);

      // 验证成员已移除
      const removeTaskMembers = await page.evaluate(() => {
        const tasks = JSON.parse(localStorage.getItem('dste_omp_tasks_v1') || '[]');
        const task = tasks.find(t => t.id === 'omp_remove_test_task');
        return task ? (task.members || []) : [];
      });
      expect(removeTaskMembers).not.toContain('E001');
      expect(removeTaskMembers.length).toBe(0);

      expect(errors).toEqual([]);
    });
  });

  test('重点工作变更触发 per-record 云端同步', async ({ page }) => {
    const putUrls = [];

    // Mock 云端 OMP tasks 为空，使 ompSyncFromApi 触发首次上传
    await page.route('/api/omp/tasks', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({ status: 200, body: JSON.stringify({ success: true, data: [] }) });
      } else {
        route.continue();
      }
    });
    await page.route(/\/api\/omp\/tasks\/[^/]+$/, route => {
      if (route.request().method() === 'PUT') {
        putUrls.push(route.request().url());
        route.fulfill({ status: 200, body: JSON.stringify({ success: true, data: {} }) });
      } else {
        route.continue();
      }
    });

    await page.goto('/src/cockpit.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('dste_omp_data_version', 'canvas-v18');
      localStorage.setItem('dste_omp_tasks_v1', JSON.stringify([
        {
          id: 'sync_test_task',
          cycleId: 'cycle_2026_marketing',
          source: 'omp',
          name: '云端同步测试任务',
          description: '',
          type: 'strategic',
          status: 'active',
          progress: 30,
          owner: '测试人',
          members: [],
          dept: '测试部',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          kpiAssociations: [],
          budget: 0,
          actualCost: 0,
          version: 1,
          lastModified: Date.now(),
        },
      ]));
      // 避免其它 OMP 实体的同步请求干扰
      localStorage.setItem('dste_omp_indicators_v1', '[]');
      localStorage.setItem('dste_omp_kpi_instances_v1', '[]');
      localStorage.setItem('dste_omp_milestones_v1', '[]');
      localStorage.setItem('dste_omp_progress_v1', '[]');
    });
    await page.goto(OMP_URL);
    await page.waitForTimeout(2000);

    // 验证发起了 /api/omp/tasks/sync_test_task 的 PUT
    expect(putUrls.some(url => url.includes('/api/omp/tasks/sync_test_task'))).toBe(true);
  });
});
