import { test, expect } from '@playwright/test';

// 驾驶舱首页真实数据改造验证：
// - 重点工作进度表 / 重点工作完成率 ← OMP tasks（dste_omp_tasks_v1）
// - 战略地图概览 / 预警通知 / 欢迎卡预警徽章 ← OMP kpiInstances（dste_omp_kpi_instances_v1）
// - 经营分析会卡 ← dste_meetings
// - 无数据源指标保留硬编码并带「演示数据」标注

const DASHBOARD_URL = '/src/cockpit.html#dashboard';
const CYCLE_ID = 'cycle_2026_marketing';

function makeTask(overrides) {
  return {
    id: `omp_test_${Math.random().toString(36).slice(2, 8)}`,
    cycleId: CYCLE_ID,
    source: 'omp',
    name: '未命名任务',
    description: '',
    type: 'strategic',
    status: 'active',
    progress: 0,
    owner: '测试负责人',
    dept: '测试部',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    members: [],
    kpiAssociations: [],
    ...overrides,
  };
}

function makeKpi(overrides) {
  return {
    id: `kpi_test_${Math.random().toString(36).slice(2, 8)}`,
    cycleId: CYCLE_ID,
    indicatorId: 'ind_sales_d',
    period: '2026',
    targetValue: 100,
    actualValue: 80,
    achievementRate: 80,
    weight: 10,
    owner: '测试负责人',
    dept: '营销线',
    status: 'warning',
    bscDimension: 'financial',
    source: 'omp',
    ...overrides,
  };
}

// 注入种子数据后整页重载，确保 omp_load 的内存缓存（_ompApiCache）不残留旧数据
async function seedAndOpen(page, { tasks = [], kpis = [], meetings = [] }) {
  await page.goto('/src/cockpit.html');
  await page.evaluate(({ tasks, kpis, meetings }) => {
    localStorage.clear();
    localStorage.setItem('dste_api_base', '');
    localStorage.setItem('dste_omp_data_version', 'canvas-v18');
    localStorage.setItem('dste_omp_tasks_v1', JSON.stringify(tasks));
    localStorage.setItem('dste_omp_kpi_instances_v1', JSON.stringify(kpis));
    localStorage.setItem('dste_meetings', JSON.stringify(meetings));
  }, { tasks, kpis, meetings });
  await page.goto(DASHBOARD_URL);
  await page.reload();
  await page.waitForTimeout(500);
}

test.describe('驾驶舱首页 - 真实数据', () => {
  test('重点工作进度表展示真实 OMP 任务，完成率实时计算', async ({ page }) => {
    const tasks = [
      makeTask({ id: 'omp_dash_t1', name: '真实任务甲', owner: '甲经理', status: 'done', progress: 100, endDate: '2026-06-30' }),
      makeTask({ id: 'omp_dash_t2', name: '真实任务乙', owner: '乙总监', status: 'active', progress: 60, endDate: '2026-09-30' }),
      makeTask({ id: 'omp_dash_t3', name: '真实任务丙', owner: '丙经理', status: 'delayed', progress: 30, endDate: '2026-05-31' }),
    ];
    await seedAndOpen(page, { tasks });

    const content = page.locator('.page-content');
    // 表格展示真实任务
    await expect(content).toContainText('真实任务甲');
    await expect(content).toContainText('真实任务乙');
    await expect(content).toContainText('真实任务丙');
    await expect(content).toContainText('甲经理');
    // 不再展示旧硬编码任务
    await expect(content).not.toContainText('渠道拓展计划');
    // KPI 卡「重点工作完成率」实时计算：1/3 完成 → 33%，1 项延期
    const kpiCard = page.locator('.kpi-card', { hasText: '重点工作完成率' });
    await expect(kpiCard).toContainText('33%');
    await expect(kpiCard).toContainText('1/3 完成');
    await expect(kpiCard).toContainText('1 项延期');
  });

  test('无当前周期任务时重点工作表显示空态', async ({ page }) => {
    // 只塞其他周期的任务，当前周期过滤后为空（避免 omp_initData 空库补种子）
    const tasks = [makeTask({ id: 'omp_other_cycle', cycleId: 'cycle_1999_archive', name: '归档任务' })];
    await seedAndOpen(page, { tasks });

    const content = page.locator('.page-content');
    await expect(content).toContainText('暂无重点工作');
    await expect(content).not.toContainText('归档任务');
  });

  test('经营分析会卡展示真实会议：下次会议 + 最近已完成', async ({ page }) => {
    const meetings = [
      { id: 'm_done', title: '三月真实复盘会', date: '2026-03-15', status: 'completed', host: '张总' },
      { id: 'm_next', title: '年末真实规划会', date: '2099-12-01', status: 'planned', host: '李总' },
    ];
    await seedAndOpen(page, { meetings });

    const content = page.locator('.page-content');
    await expect(content).toContainText('下次会议');
    await expect(content).toContainText('年末真实规划会');
    await expect(content).toContainText('三月真实复盘会');
    // 不再展示旧硬编码会议
    await expect(content).not.toContainText('月度经营会');
    await expect(content).not.toContainText('Q1 季度战略会');
  });

  test('无会议数据时经营分析会卡显示空态', async ({ page }) => {
    await seedAndOpen(page, {});
    await expect(page.locator('.page-content')).toContainText('暂无会议');
  });

  test('预警通知与欢迎卡徽章来自真实 KPI 实例，BSC 维度真实聚合', async ({ page }) => {
    const kpis = [
      makeKpi({ id: 'kpi_warn', indicatorId: 'ind_sales_d', status: 'warning', achievementRate: 87.5, bscDimension: 'financial' }),
      makeKpi({ id: 'kpi_ok', indicatorId: 'ind_benchmark', status: 'achieved', achievementRate: 96, bscDimension: 'customer' }),
    ];
    await seedAndOpen(page, { kpis });

    const content = page.locator('.page-content');
    // 欢迎卡徽章：1 项预警（不再有硬编码「3 项预警」）
    await expect(content).toContainText('1 项预警');
    await expect(content).not.toContainText('3 项预警');
    // 预警通知卡展示真实预警（指标库种子指标名：销售额-D）
    await expect(content).toContainText('销售额-D');
    // 不再展示旧硬编码预警
    await expect(content).not.toContainText('客户满意度下降');
    await expect(content).not.toContainText('新产品推广滞后');
    // 战略地图概览按 BSC 维度聚合
    await expect(content).toContainText('财务维度');
    await expect(content).toContainText('客户维度');
    // 不再展示旧硬编码 BSC 文案
    await expect(content).not.toContainText('NPS > 70');
    await expect(content).not.toContainText('培训 100%');
  });

  test('无预警 KPI 时显示正常状态', async ({ page }) => {
    const kpis = [
      makeKpi({ id: 'kpi_ok1', status: 'achieved', achievementRate: 96, bscDimension: 'financial' }),
    ];
    await seedAndOpen(page, { kpis });

    const content = page.locator('.page-content');
    await expect(content).toContainText('经营正常');
    await expect(content).not.toContainText('项预警');
  });

  test('无数据源的演示指标保留并带「演示数据」标注', async ({ page }) => {
    await seedAndOpen(page, {});

    const content = page.locator('.page-content');
    // 演示指标保留
    await expect(content).toContainText('27.6%');
    await expect(content).toContainText('28.4%');
    await expect(content).toContainText('本季度剩余 45 天');
    await expect(content).toContainText('供应链成本上升');
    // 演示标注可见且覆盖多处（营收增长率 / NPS / 新产品收入占比 / 季度天数 / 供应链预警）
    const badges = page.locator('.demo-badge');
    await expect(badges.first()).toBeVisible();
    expect(await badges.count()).toBeGreaterThanOrEqual(5);
    await expect(content).toContainText('演示数据');
  });
});
