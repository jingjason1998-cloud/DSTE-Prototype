import { test, expect } from '@playwright/test';

const OMP_URL = '/src/cockpit.html#exe/tasks';
const CYCLE_ID = 'cycle_2026_marketing';
const TASK_ID = 'mp_task';

async function seedMonthly(page) {
  await page.goto('/src/cockpit.html');
  await page.evaluate(({ cycleId, taskId }) => {
    localStorage.clear();
    localStorage.setItem('dste_api_base', '');
    localStorage.setItem('dste_omp_data_version', 'canvas-v18');
    localStorage.setItem('dste_cycles_v1', JSON.stringify([
      {
        id: cycleId,
        year: 2026,
        name: '2026年度营销线组织绩效',
        phase: 'execution',
        organization: '营销线',
        parentCycleId: null,
      },
    ]));
    localStorage.setItem('dste_omp_tasks_v1', JSON.stringify([
      {
        id: taskId,
        cycleId,
        source: 'omp',
        name: '月度进展测试任务',
        description: '',
        type: 'strategic',
        status: 'active',
        progress: 20,
        owner: '测试人',
        members: [],
        dept: '测试部',
        startDate: '2026-04-01',
        endDate: '2026-12-31',
        kpiAssociations: [],
        budget: 0,
        actualCost: 0,
        version: 1,
        lastModified: Date.now(),
      },
    ]));
    // 其它 OMP 实体置空，避免干扰
    localStorage.setItem('dste_omp_indicators_v1', '[]');
    localStorage.setItem('dste_omp_kpi_instances_v1', '[]');
    localStorage.setItem('dste_omp_milestones_v1', '[]');
    localStorage.setItem('dste_omp_progress_v1', '[]');
    window._ompState = window._ompState || {};
    window._ompState.activeTab = 'tasks';
  }, { cycleId: CYCLE_ID, taskId: TASK_ID });
  await page.goto(OMP_URL);
  await page.waitForTimeout(1500);
}

async function switchToMonthly(page) {
  await page.locator('[data-action="omp-switch-task-view"][data-view="monthly"]').click();
  await page.waitForTimeout(500);
}

test.describe('OMP 重点工作月度关键进展', () => {

  test('月度进展视图显示 4~12 月与 H1/年终总结列，不显示 1~3 月', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await seedMonthly(page);
    await switchToMonthly(page);

    const content = page.locator('#omp-tab-content');
    await expect(content).toContainText('重点工作月度关键进展');

    // 4~12 月表头均存在
    for (const label of ['4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']) {
      await expect(content).toContainText(label);
    }
    // H1/年终总结列存在
    await expect(content).toContainText('H1 总结');
    await expect(content).toContainText('年终总结');

    // 不应出现 1~3 月表头（用精确表头单元格匹配，避免误伤）
    await expect(content.locator('.omp-month-cell[data-month$="-01"]')).toHaveCount(0);
    await expect(content.locator('.omp-month-cell[data-month$="-02"]')).toHaveCount(0);
    await expect(content.locator('.omp-month-cell[data-month$="-03"]')).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test('录入月度关键进展后写入 progressRecords 并联动任务进度', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await seedMonthly(page);
    await switchToMonthly(page);

    // 点击 2026-05 的单元格
    const cell = page.locator(`[data-action="omp-edit-monthly-progress"][data-task-id="${TASK_ID}"][data-month="2026-05"]`);
    await expect(cell).toBeVisible();
    await cell.click();
    await page.waitForTimeout(300);

    const modal = page.locator('.omp-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('月度进展测试任务');
    await expect(modal).toContainText('2026年5月');

    await page.locator('#omp-monthly-progress').fill('65');
    await page.locator('#omp-monthly-content').fill('五月完成渠道签约');
    await page.locator('#omp-monthly-problems').fill('部分地区准入门槛高');
    await page.locator('#omp-monthly-next-plan').fill('六月启动培训');
    await page.locator('#omp-monthly-reporter').fill('测试人');

    await modal.getByRole('button', { name: '保存' }).click();
    await page.waitForTimeout(800);

    // 单元格显示进度与内容，并因存在问题显示红点
    await expect(cell).toContainText('65%');
    await expect(cell).toContainText('五月完成渠道签约');

    // localStorage 校验：一条 month=2026-05 的记录
    const records = await page.evaluate(() => JSON.parse(localStorage.getItem('dste_omp_progress_v1') || '[]'));
    const may = records.filter(r => r.taskId === TASK_ID && r.month === '2026-05');
    expect(may.length).toBe(1);
    expect(may[0].progress).toBe(65);
    expect(may[0].content).toBe('五月完成渠道签约');
    expect(may[0].nextPlan).toBe('六月启动培训');

    // 任务总进度被联动更新为 65
    const tasks = await page.evaluate(() => JSON.parse(localStorage.getItem('dste_omp_tasks_v1') || '[]'));
    const task = tasks.find(t => t.id === TASK_ID);
    expect(task.progress).toBe(65);

    expect(errors).toEqual([]);
  });

  test('月份筛选只显示所选月份列，且始终保留 H1/年终总结列', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await seedMonthly(page);
    await switchToMonthly(page);

    // 默认全部月份：9 个月列 + H1 + 年终 = 11 个单元格（单任务）
    const content = page.locator('#omp-tab-content');
    await expect(page.locator(`.omp-month-cell[data-task-id="${TASK_ID}"]`)).toHaveCount(11);

    // 筛选 7 月
    await page.locator('#omp-monthly-filter').selectOption('2026-07');
    await page.waitForTimeout(500);

    // 只剩 7 月(1) + H1(1) + 年终(1) = 3 个单元格
    await expect(page.locator(`.omp-month-cell[data-task-id="${TASK_ID}"]`)).toHaveCount(3);
    await expect(page.locator(`.omp-month-cell[data-task-id="${TASK_ID}"][data-month="2026-07"]`)).toHaveCount(1);
    await expect(page.locator(`.omp-month-cell[data-task-id="${TASK_ID}"][data-month="H1"]`)).toHaveCount(1);
    await expect(page.locator(`.omp-month-cell[data-task-id="${TASK_ID}"][data-month="YEAR"]`)).toHaveCount(1);
    // 其它月份不显示
    await expect(page.locator(`.omp-month-cell[data-task-id="${TASK_ID}"][data-month="2026-05"]`)).toHaveCount(0);

    // 切回全部
    await page.locator('#omp-monthly-filter').selectOption('all');
    await page.waitForTimeout(500);
    await expect(page.locator(`.omp-month-cell[data-task-id="${TASK_ID}"]`)).toHaveCount(11);

    expect(errors).toEqual([]);
  });

  test('录入 H1 总结，存储 month=H1 且不影响逐月任务进度聚合', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await seedMonthly(page);
    await switchToMonthly(page);

    const h1Cell = page.locator(`[data-action="omp-edit-monthly-progress"][data-task-id="${TASK_ID}"][data-month="H1"]`);
    await expect(h1Cell).toBeVisible();
    await h1Cell.click();
    await page.waitForTimeout(300);

    const modal = page.locator('.omp-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('上半年 (H1)');
    await expect(modal).toContainText('总结');
    // 总结弹窗不显示「下月计划」字段
    await expect(page.locator('#omp-monthly-next-plan')).toHaveCount(0);
    // 日期字段隐藏（summary 用 hidden input）
    await expect(page.locator('#omp-monthly-date')).toBeHidden();

    await page.locator('#omp-monthly-content').fill('上半年达成阶段性目标');
    await modal.getByRole('button', { name: '保存' }).click();
    await page.waitForTimeout(800);

    const records = await page.evaluate(() => JSON.parse(localStorage.getItem('dste_omp_progress_v1') || '[]'));
    const h1 = records.filter(r => r.taskId === TASK_ID && r.month === 'H1');
    expect(h1.length).toBe(1);
    expect(h1[0].content).toBe('上半年达成阶段性目标');
    expect(h1[0].date).toBe('2026-09-30');

    // H1 总结不参与逐月聚合：任务进度保持初始 20，不被总结覆盖
    const tasks = await page.evaluate(() => JSON.parse(localStorage.getItem('dste_omp_tasks_v1') || '[]'));
    const task = tasks.find(t => t.id === TASK_ID);
    expect(task.progress).toBe(20);

    expect(errors).toEqual([]);
  });
});
