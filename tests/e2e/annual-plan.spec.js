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
    await expect(page.locator('#ap-add-unit')).toBeVisible();

    // 部门字段在默认「营销线级」下隐藏，切换到「部门级」后应显示
    await page.locator('#ap-add-assessment-level').selectOption('department');
    await page.waitForTimeout(200);
    await expect(page.locator('#ap-add-dept')).toBeVisible();

    await page.locator('[data-modal-action="modal-cancel-add-kpi"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('.omp-modal')).not.toBeVisible();
  });

  test('添加 KPI 部门归属可从人员目录团队树选择', async ({ page }) => {
    const orgUnits = {
      'org:国内营销与服务线': { id: 'org:国内营销与服务线', name: '国内营销与服务线', level: 0, parentId: null, path: '国内营销与服务线', employeeCount: 2, children: ['org:国内营销与服务线/华东大区'] },
      'org:国内营销与服务线/华东大区': { id: 'org:国内营销与服务线/华东大区', name: '华东大区', level: 1, parentId: 'org:国内营销与服务线', path: '国内营销与服务线 > 华东大区', employeeCount: 2, children: ['org:国内营销与服务线/华东大区/销售组'] },
      'org:国内营销与服务线/华东大区/销售组': { id: 'org:国内营销与服务线/华东大区/销售组', name: '销售组', level: 2, parentId: 'org:国内营销与服务线/华东大区', path: '国内营销与服务线 > 华东大区 > 销售组', employeeCount: 2, children: [] },
    };
    const employees = [
      { id: '10001', name: '张三', englishName: 'Zhang.San', displayName: '张三 (Zhang.San)', orgPath: '国内营销与服务线 > 华东大区 > 销售组', l1Org: '国内营销与服务线', l1Team: '华东大区', l2Team: '销售组', l3Team: '', orgId: '100101', ldap: '100101,10010,1001,100', orgChain: ['100101', '10010', '1001', '100'], searchTokens: ['张三', 'zhang.san', '国内营销与服务线', '华东大区', '销售组'] },
    ];
    await page.evaluate(({ employees, orgUnits }) => {
      localStorage.setItem('dste_employees_v1', JSON.stringify(employees));
      localStorage.setItem('dste_employees_v1_version', JSON.stringify(1));
      localStorage.setItem('dste_org_units_v1', JSON.stringify(orgUnits));
      localStorage.setItem('dste_org_units_v1_version', JSON.stringify(1));
      localStorage.setItem('dste_employee_import_meta', JSON.stringify({ importedAt: new Date().toISOString(), count: employees.length, fileName: 'test.xlsx' }));
    }, { employees, orgUnits });
    await page.reload();
    await page.waitForTimeout(1000);

    await page.locator('[data-action="ap-add-kpi"]').click();
    await page.waitForTimeout(300);
    await page.locator('#ap-add-indicator').selectOption('ind_opportunity');
    await page.locator('#ap-add-target').fill('1000');

    await page.locator('#ap-add-assessment-level').selectOption('department');
    await page.waitForTimeout(200);

    // 组织选择器应展示团队树（默认折叠，需逐级展开）
    await expect(page.locator('#ap-add-dept')).toContainText('国内营销与服务线');
    await page.locator('#ap-add-dept .org-selector-header').click();
    await page.waitForTimeout(200);
    await page.locator('#ap-add-dept .org-node[data-org-id="org:国内营销与服务线"] .org-toggle').click();
    await page.waitForTimeout(200);
    await page.locator('#ap-add-dept .org-node[data-org-id="org:国内营销与服务线/华东大区"] .org-toggle').click();
    await page.waitForTimeout(200);
    await page.locator('#ap-add-dept .org-node[data-org-id="org:国内营销与服务线/华东大区/销售组"] .org-name').click();
    await page.waitForTimeout(200);

    await page.locator('[data-modal-action="modal-save-add-kpi"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('.omp-modal')).not.toBeVisible();

    // 验证新 KPI 的 dept 已保存为选中的团队名称
    const savedKpis = await page.evaluate(() => JSON.parse(localStorage.getItem('dste_omp_kpi_instances_v1') || '[]'));
    const newKpi = savedKpis.find(k => k.indicatorId === 'ind_opportunity' && k.targetValue === 1000);
    expect(newKpi).toBeTruthy();
    expect(newKpi.dept).toBe('销售组');
    expect(newKpi.assessmentLevel).toBe('department');
  });

  test('新增、编辑、删除重点工作', async ({ page }) => {
    await acceptConfirms(page);

    await page.locator('[data-action="ap-add-keytask"]').click();
    await page.waitForTimeout(300);
    await page.locator('#ap-kt-name').fill('E2E测试重点工作');
    await page.locator('#ap-kt-seq').fill('99');
    await page.locator('#ap-kt-annual-target').fill('E2E年度目标');
    await page.locator('#ap-kt-sp-link').fill('https://sp.example.com');
    await page.locator('#ap-kt-bi-dashboard').fill('https://bi.example.com');
    await page.locator('[data-modal-action="modal-save-keytask"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#ap-tab-content')).toContainText('E2E测试重点工作');

    // 编辑并校验三个新字段已保存
    const editBtn = page.locator('[data-action="ap-edit-keytask"]').last();
    await editBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#ap-kt-annual-target')).toHaveValue('E2E年度目标');
    await expect(page.locator('#ap-kt-sp-link')).toHaveValue('https://sp.example.com');
    await expect(page.locator('#ap-kt-bi-dashboard')).toHaveValue('https://bi.example.com');
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

  test('发布到执行后为年度计划重点工作生成 OMP 执行任务', async ({ page }) => {
    await acceptConfirms(page);

    // 重置为 planning 阶段并清理可能已存在的 omp 派生任务
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
    // 使用 reload 确保页面重新读取清理后的 localStorage，避免软导航导致 DOM 还是旧状态
    await page.reload();
    await page.waitForTimeout(1500);

    // 年度计划重点工作应显示「未发布」
    const firstTaskRow = page.locator('#ap-tab-content table').nth(1).locator('tbody tr').first();
    await expect(firstTaskRow).toContainText('未发布');

    // 发布到执行
    await page.locator('[data-action="ap-publish"]').click();
    await page.waitForTimeout(1500);

    // 验证 localStorage 中生成了 omp 派生任务
    const derivedCount = await page.evaluate(() => {
      const tasks = JSON.parse(localStorage.getItem('dste_omp_tasks_v1') || '[]');
      return tasks.filter(t => t.cycleId === 'cycle_2026_marketing' && t.source === 'omp' && t.annualPlanTaskId).length;
    });
    expect(derivedCount).toBeGreaterThan(0);

    // 年度计划重点工作应显示「已发布」
    await expect(firstTaskRow).toContainText('已发布');
  });

  test('发布到执行幂等：重复发布不生成重复 OMP 任务', async ({ page }) => {
    await acceptConfirms(page);

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
    await page.goto(COCKPIT_URL);
    await page.waitForTimeout(1500);

    // 第一次发布
    await page.locator('[data-action="ap-publish"]').click();
    await page.waitForTimeout(800);

    const firstCount = await page.evaluate(() => {
      const tasks = JSON.parse(localStorage.getItem('dste_omp_tasks_v1') || '[]');
      return tasks.filter(t => t.cycleId === 'cycle_2026_marketing' && t.source === 'omp' && t.annualPlanTaskId).length;
    });

    // 将周期改回 planning 再次发布
    await page.evaluate(() => {
      const cycles = JSON.parse(localStorage.getItem('dste_cycles_v1') || '[]');
      const idx = cycles.findIndex(c => c.id === 'cycle_2026_marketing');
      if (idx > -1) cycles[idx].phase = 'planning';
      localStorage.setItem('dste_cycles_v1', JSON.stringify(cycles));
    });
    await page.goto(COCKPIT_URL);
    await page.waitForTimeout(1500);

    // 第二次发布
    await page.locator('[data-action="ap-publish"]').click();
    await page.waitForTimeout(800);

    const secondCount = await page.evaluate(() => {
      const tasks = JSON.parse(localStorage.getItem('dste_omp_tasks_v1') || '[]');
      return tasks.filter(t => t.cycleId === 'cycle_2026_marketing' && t.source === 'omp' && t.annualPlanTaskId).length;
    });

    expect(secondCount).toBe(firstCount);
  });

  test('发布到执行后为年度计划 KPI 生成 OMP 执行 KPI', async ({ page }) => {
    await acceptConfirms(page);

    // 重置为 planning 阶段并清理可能已存在的 omp 派生 KPI
    await page.evaluate(() => {
      localStorage.setItem('dste_cycles_v1', JSON.stringify([{
        id: 'cycle_2026_marketing',
        year: 2026,
        name: '2026年度营销线组织绩效',
        phase: 'planning',
        organization: '营销线',
        parentCycleId: null
      }]));
      const kpis = JSON.parse(localStorage.getItem('dste_omp_kpi_instances_v1') || '[]');
      const cleaned = kpis.filter(k => !(k.cycleId === 'cycle_2026_marketing' && k.source === 'omp'));
      localStorage.setItem('dste_omp_kpi_instances_v1', JSON.stringify(cleaned));
    });
    await page.reload();
    await page.waitForTimeout(1500);

    // 年度计划 KPI 应显示「未发布」
    const firstKpiRow = page.locator('#ap-tab-content table').first().locator('tbody tr').first();
    await expect(firstKpiRow).toContainText('未发布');

    // 发布到执行
    await page.locator('[data-action="ap-publish"]').click();
    await page.waitForTimeout(1500);

    // 验证 localStorage 中生成了 omp 派生 KPI
    const derivedCount = await page.evaluate(() => {
      const kpis = JSON.parse(localStorage.getItem('dste_omp_kpi_instances_v1') || '[]');
      return kpis.filter(k => k.cycleId === 'cycle_2026_marketing' && k.source === 'omp' && k.annualPlanKpiId).length;
    });
    expect(derivedCount).toBeGreaterThan(0);

    // 年度计划 KPI 应显示「已发布」
    await expect(firstKpiRow).toContainText('已发布');
  });

  test('发布到执行幂等：重复发布不生成重复 OMP KPI', async ({ page }) => {
    await acceptConfirms(page);

    await page.evaluate(() => {
      localStorage.setItem('dste_cycles_v1', JSON.stringify([{
        id: 'cycle_2026_marketing',
        year: 2026,
        name: '2026年度营销线组织绩效',
        phase: 'planning',
        organization: '营销线',
        parentCycleId: null
      }]));
      const kpis = JSON.parse(localStorage.getItem('dste_omp_kpi_instances_v1') || '[]');
      const cleaned = kpis.filter(k => !(k.cycleId === 'cycle_2026_marketing' && k.source === 'omp'));
      localStorage.setItem('dste_omp_kpi_instances_v1', JSON.stringify(cleaned));
    });
    await page.goto(COCKPIT_URL);
    await page.waitForTimeout(1500);

    // 第一次发布
    await page.locator('[data-action="ap-publish"]').click();
    await page.waitForTimeout(800);

    const firstCount = await page.evaluate(() => {
      const kpis = JSON.parse(localStorage.getItem('dste_omp_kpi_instances_v1') || '[]');
      return kpis.filter(k => k.cycleId === 'cycle_2026_marketing' && k.source === 'omp' && k.annualPlanKpiId).length;
    });

    // 将周期改回 planning 再次发布
    await page.evaluate(() => {
      const cycles = JSON.parse(localStorage.getItem('dste_cycles_v1') || '[]');
      const idx = cycles.findIndex(c => c.id === 'cycle_2026_marketing');
      if (idx > -1) cycles[idx].phase = 'planning';
      localStorage.setItem('dste_cycles_v1', JSON.stringify(cycles));
    });
    await page.goto(COCKPIT_URL);
    await page.waitForTimeout(1500);

    // 第二次发布
    await page.locator('[data-action="ap-publish"]').click();
    await page.waitForTimeout(800);

    const secondCount = await page.evaluate(() => {
      const kpis = JSON.parse(localStorage.getItem('dste_omp_kpi_instances_v1') || '[]');
      return kpis.filter(k => k.cycleId === 'cycle_2026_marketing' && k.source === 'omp' && k.annualPlanKpiId).length;
    });

    expect(secondCount).toBe(firstCount);
  });

  test('新增 KPI 携带 source: annual_plan', async ({ page }) => {
    await page.locator('[data-action="ap-add-kpi"]').click();
    await page.waitForTimeout(300);

    await page.locator('#ap-add-indicator').selectOption('ind_opportunity');
    await page.locator('#ap-add-target').fill('1000');
    await page.locator('#ap-add-owner').fill('E2E测试');
    await page.locator('[data-modal-action="modal-save-add-kpi"]').click();
    await page.waitForTimeout(800);
    await expect(page.locator('.omp-modal')).not.toBeVisible();

    const newKpi = await page.evaluate(() => {
      const kpis = JSON.parse(localStorage.getItem('dste_omp_kpi_instances_v1') || '[]');
      return kpis.find(k => k.indicatorId === 'ind_opportunity' && k.cycleId === 'cycle_2026_marketing' && k.parentId === null);
    });
    expect(newKpi).toBeTruthy();
    expect(newKpi.source).toBe('annual_plan');
    expect(newKpi.annualPlanKpiId).toBeNull();
  });

  test('部门级 KPI 在分解视图中按归属显示目标值', async ({ page }) => {
    await page.locator('[data-action="ap-add-kpi"]').click();
    await page.waitForTimeout(300);

    await page.locator('#ap-add-indicator').selectOption('ind_conversion');
    await page.locator('#ap-add-assessment-level').selectOption('department');
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const hidden = document.getElementById('ap-add-dept-hidden');
      if (hidden) hidden.value = '销售部';
    });
    await page.locator('#ap-add-target').fill('50');
    await page.locator('[data-modal-action="modal-save-add-kpi"]').click();
    await page.waitForTimeout(500);

    await page.locator('[data-action="ap-switch-tab"][data-tab="decomposition"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-action="ap-switch-decompose-dim"][data-dim="dept"]').click();
    await page.waitForTimeout(500);

    // 合同转化率行应显示在销售部列
    await expect(page.locator('#ap-tab-content')).toContainText('合同转化率');
    const cellText = await page.evaluate(() => {
      const rows = document.querySelectorAll('#ap-tab-content table tbody tr');
      for (const row of rows) {
        if (row.textContent.includes('合同转化率')) {
          const cells = row.querySelectorAll('td');
          return cells[2]?.textContent?.trim(); // 销售部列
        }
      }
      return null;
    });
    expect(cellText).toBe('50');
  });
});
