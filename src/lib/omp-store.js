/**
 * OMP 共享数据层（组织绩效管理）
 * ============================================================
 * 本模块由 src/cockpit.html 内联脚本中的 OMP 数据层原样抽取而成，
 * 供 cockpit.html 与 bp.html（规划中，BP 模块独立页面）共用。
 * 纯搬家重构：行为、数据 key、函数签名均保持不变。
 *
 * 运行时依赖（由各页面在加载时设置，本模块经 window 访问）：
 * - window._dsteState       当前周期等全局状态（cockpit/bp 页面各自初始化）
 * - window._ompApiCache     OMP 实体内存缓存（API 同步后的最新数据）
 * - window.normalizePerson  人员归一化（页面侧 employee-directory 注入）
 */
import { createOmpRepository } from './repository.js';
import { createBackup, restoreFromBackup, cleanupOldBackups, getBackupKeys } from './migration-utils.js';
import {
  computeEntityDiff,
  enqueuePerRecordSync,
  createPerItemExecutor,
  ensureLastModified,
} from './per-record-sync.js';
import { getDefaultSyncQueue } from './sync-queue.js';
import { escapeHtml } from './utils.js';

// ===== 组织绩效管理模块 (OMP) 数据层 =====
const OMP_STORAGE = {
  indicators: 'dste_omp_indicators_v1',
  kpiInstances: 'dste_omp_kpi_instances_v1',
  tasks: 'dste_omp_tasks_v1',
  milestones: 'dste_omp_milestones_v1',
  progressRecords: 'dste_omp_progress_v1',
  cycles: 'dste_cycles_v1',
};

const ompRepos = {
  indicators: createOmpRepository('indicators', OMP_STORAGE.indicators),
  kpiInstances: createOmpRepository('kpiInstances', OMP_STORAGE.kpiInstances),
  tasks: createOmpRepository('tasks', OMP_STORAGE.tasks),
  milestones: createOmpRepository('milestones', OMP_STORAGE.milestones),
  progressRecords: createOmpRepository('progressRecords', OMP_STORAGE.progressRecords),
  cycles: createOmpRepository('cycles', OMP_STORAGE.cycles),
};

export function omp_getRepo(key) {
  return ompRepos[key] || null;
}

// ===== 分解维度配置 =====
export const DECOMPOSE_DIMENSIONS = {
  warzone: { label: '战区', items: ['北京大区', '上海大区', '华南大区', '浙闽大区', '苏皖大区', '西南大区', '华北大区', '华中大区', '西北大区', '东北大区'] },
  industry: { label: '行业', items: ['制造业', '金融业', '零售业', '医疗业', '教育业', '政府/公共事业', '互联网', '能源'] },
  product: { label: '产品', items: ['核心产品', '云服务', '数据分析', '咨询服务', '培训服务'] },
  dept: { label: '部门', items: ['销售部', '市场部', '产品部', '技术部', '客户成功部', '运营部', 'HR部', '财务部'] },
};

// ===== 考核层级配置 =====
export const ASSESSMENT_LEVELS = {
  'marketing-line': { label: '营销线级', short: '营销线', color: 'var(--kpi-level-0)' },
  'department':     { label: '部门级',   short: '部门',   color: 'var(--kpi-level-1)' },
  'team':           { label: '小组级',   short: '小组',   color: 'var(--kpi-level-2)' },
};

// ===== 按年度生成种子数据工厂 =====
export function omp_buildYearSeed(year) {
  const isLegacy2026 = year === 2026;
  const cycleId = `cycle_${year}_marketing`;
  const idPrefix = isLegacy2026 ? '' : `${year}_`;
  const phase = year < 2026 ? 'archived' : 'planning';
  const scale = year === 2026 ? 1.0 : (year < 2026 ? 0.9 : 1.1);
  const fmt = (n) => Math.round(n * scale);

  const cycle = { id: cycleId, year, name: `${year}年度 — 营销线`, phase, organization: '营销线', parentCycleId: null };

  // L0 root KPIs
  const kpiSalesD = { id: `${idPrefix}kpi_sales_d`, cycleId, indicatorId: 'ind_sales_d', period: String(year), targetValue: fmt(178623), challengeValue: fmt(214348), actualValue: fmt(171478), achievementRate: 96, weight: 10, owner: '陈总监', dept: '营销线', status: 'achieved', parentId: null, level: 0, assessmentLevel: 'marketing-line', bscDimension: 'financial', history: [92, 88, 94, 96], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };
  const kpiCollectionK = { id: `${idPrefix}kpi_collection_k`, cycleId, indicatorId: 'ind_collection_k', period: String(year), targetValue: fmt(130097), challengeValue: fmt(156116), actualValue: fmt(113835), achievementRate: 87.5, weight: 25, owner: '陈总监', dept: '营销线', status: 'warning', parentId: null, level: 0, assessmentLevel: 'marketing-line', bscDimension: 'financial', history: [95, 90, 85, 87.5], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };
  const kpiProfitMargin = { id: `${idPrefix}kpi_profit_margin`, cycleId, indicatorId: 'ind_profit_margin', period: String(year), targetValue: 33.72, challengeValue: 35.72, actualValue: 35.0, achievementRate: 85.7, weight: 5, owner: '张总监', dept: '营销线', status: 'warning', parentId: null, level: 0, assessmentLevel: 'marketing-line', bscDimension: 'financial', history: [90, 88, 87, 85.7], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };
  const kpiNewProduct = { id: `${idPrefix}kpi_new_product`, cycleId, indicatorId: 'ind_new_product', period: String(year), targetValue: fmt(27842), challengeValue: fmt(33410), actualValue: fmt(20882), achievementRate: 75, weight: 10, owner: '李经理', dept: '产品部', status: 'warning', parentId: null, level: 0, assessmentLevel: 'marketing-line', bscDimension: 'financial', history: [78, 75, 72, 75], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };
  const kpiBenchmark = { id: `${idPrefix}kpi_benchmark`, cycleId, indicatorId: 'ind_benchmark', period: String(year), targetValue: fmt(182), challengeValue: fmt(218), actualValue: fmt(175), achievementRate: 96, weight: 10, owner: '王总监', dept: '市场部', status: 'achieved', parentId: null, level: 0, assessmentLevel: 'marketing-line', bscDimension: 'customer', history: [98, 96, 95, 96], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };
  const kpiArr = { id: `${idPrefix}kpi_arr`, cycleId, indicatorId: 'ind_arr', period: String(year), targetValue: fmt(43009), challengeValue: fmt(51611), actualValue: fmt(38708), achievementRate: 90, weight: 10, owner: '赵经理', dept: '客户成功部', status: 'achieved', parentId: null, level: 0, assessmentLevel: 'marketing-line', bscDimension: 'customer', history: [88, 86, 89, 90], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };

  // L1 decomposition
  const kpiSalesDBj = { id: `${idPrefix}kpi_sales_d_bj`, cycleId, indicatorId: 'ind_sales_d', period: String(year), targetValue: fmt(33520), challengeValue: fmt(40224), actualValue: fmt(32179), achievementRate: 96, weight: 10, owner: '李经理', dept: '北京大区', status: 'achieved', parentId: kpiSalesD.id, level: 1, assessmentLevel: 'department', bscDimension: 'financial', history: [95, 93, 96, 96], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };
  const kpiSalesDSh = { id: `${idPrefix}kpi_sales_d_sh`, cycleId, indicatorId: 'ind_sales_d', period: String(year), targetValue: fmt(30268), challengeValue: fmt(36322), actualValue: fmt(29057), achievementRate: 96, weight: 10, owner: '王经理', dept: '上海大区', status: 'achieved', parentId: kpiSalesD.id, level: 1, assessmentLevel: 'department', bscDimension: 'financial', history: [96, 94, 95, 96], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };
  const kpiSalesDHd = { id: `${idPrefix}kpi_sales_d_hd`, cycleId, indicatorId: 'ind_sales_d', period: String(year), targetValue: fmt(22284), challengeValue: fmt(26741), actualValue: fmt(21393), achievementRate: 96, weight: 10, owner: '张经理', dept: '华南大区', status: 'achieved', parentId: kpiSalesD.id, level: 1, assessmentLevel: 'department', bscDimension: 'financial', history: [94, 92, 95, 96], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };
  const kpiSalesDZm = { id: `${idPrefix}kpi_sales_d_zm`, cycleId, indicatorId: 'ind_sales_d', period: String(year), targetValue: fmt(21250), challengeValue: fmt(25500), actualValue: fmt(20400), achievementRate: 96, weight: 10, owner: '刘经理', dept: '浙闽大区', status: 'achieved', parentId: kpiSalesD.id, level: 1, assessmentLevel: 'department', bscDimension: 'financial', history: [93, 95, 94, 96], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };

  const kpiCollectionKBj = { id: `${idPrefix}kpi_collection_k_bj`, cycleId, indicatorId: 'ind_collection_k', period: String(year), targetValue: fmt(23132), challengeValue: fmt(27758), actualValue: fmt(20241), achievementRate: 87.5, weight: 25, owner: '李经理', dept: '北京大区', status: 'warning', parentId: kpiCollectionK.id, level: 1, assessmentLevel: 'department', bscDimension: 'financial', history: [90, 88, 85, 87.5], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };
  const kpiCollectionKSh = { id: `${idPrefix}kpi_collection_k_sh`, cycleId, indicatorId: 'ind_collection_k', period: String(year), targetValue: fmt(21676), challengeValue: fmt(26011), actualValue: fmt(18967), achievementRate: 87.5, weight: 25, owner: '王经理', dept: '上海大区', status: 'warning', parentId: kpiCollectionK.id, level: 1, assessmentLevel: 'department', bscDimension: 'financial', history: [92, 90, 88, 87.5], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };
  const kpiCollectionKHd = { id: `${idPrefix}kpi_collection_k_hd`, cycleId, indicatorId: 'ind_collection_k', period: String(year), targetValue: fmt(16326), challengeValue: fmt(19591), actualValue: fmt(14285), achievementRate: 87.5, weight: 25, owner: '张经理', dept: '华南大区', status: 'warning', parentId: kpiCollectionK.id, level: 1, assessmentLevel: 'department', bscDimension: 'financial', history: [89, 87, 86, 87.5], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };

  const kpiNewProductJdy = { id: `${idPrefix}kpi_new_product_jdy`, cycleId, indicatorId: 'ind_jdy', period: String(year), targetValue: fmt(16142), challengeValue: fmt(19370), actualValue: fmt(12107), achievementRate: 75, weight: 10, owner: '李经理', dept: 'JDY产品线', status: 'warning', parentId: kpiNewProduct.id, level: 1, assessmentLevel: 'department', bscDimension: 'financial', history: [76, 74, 73, 75], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };
  const kpiNewProductFdl = { id: `${idPrefix}kpi_new_product_fdl`, cycleId, indicatorId: 'ind_fdl', period: String(year), targetValue: fmt(11700), challengeValue: fmt(14040), actualValue: fmt(8775), achievementRate: 75, weight: 10, owner: '李经理', dept: 'FDL产品线', status: 'warning', parentId: kpiNewProduct.id, level: 1, assessmentLevel: 'department', bscDimension: 'financial', history: [78, 76, 74, 75], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };

  const kpiBenchmarkBj = { id: `${idPrefix}kpi_benchmark_bj`, cycleId, indicatorId: 'ind_benchmark', period: String(year), targetValue: fmt(28), challengeValue: fmt(34), actualValue: fmt(27), achievementRate: 96, weight: 10, owner: '李经理', dept: '北京大区', status: 'achieved', parentId: kpiBenchmark.id, level: 1, assessmentLevel: 'department', bscDimension: 'customer', history: [97, 96, 95, 96], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };
  const kpiBenchmarkSh = { id: `${idPrefix}kpi_benchmark_sh`, cycleId, indicatorId: 'ind_benchmark', period: String(year), targetValue: fmt(20), challengeValue: fmt(24), actualValue: fmt(19), achievementRate: 96, weight: 10, owner: '王经理', dept: '上海大区', status: 'achieved', parentId: kpiBenchmark.id, level: 1, assessmentLevel: 'department', bscDimension: 'customer', history: [98, 97, 96, 96], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };
  const kpiBenchmarkHd = { id: `${idPrefix}kpi_benchmark_hd`, cycleId, indicatorId: 'ind_benchmark', period: String(year), targetValue: fmt(25), challengeValue: fmt(30), actualValue: fmt(24), achievementRate: 96, weight: 10, owner: '张经理', dept: '华南大区', status: 'achieved', parentId: kpiBenchmark.id, level: 1, assessmentLevel: 'department', bscDimension: 'customer', history: [96, 95, 97, 96], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };

  const kpiArrBj = { id: `${idPrefix}kpi_arr_bj`, cycleId, indicatorId: 'ind_arr', period: String(year), targetValue: fmt(7018), challengeValue: fmt(8422), actualValue: fmt(6316), achievementRate: 90, weight: 10, owner: '李经理', dept: '北京大区', status: 'achieved', parentId: kpiArr.id, level: 1, assessmentLevel: 'department', bscDimension: 'customer', history: [88, 87, 89, 90], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };
  const kpiArrSh = { id: `${idPrefix}kpi_arr_sh`, cycleId, indicatorId: 'ind_arr', period: String(year), targetValue: fmt(9035), challengeValue: fmt(10842), actualValue: fmt(8132), achievementRate: 90, weight: 10, owner: '王经理', dept: '上海大区', status: 'achieved', parentId: kpiArr.id, level: 1, assessmentLevel: 'department', bscDimension: 'customer', history: [89, 88, 90, 90], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };
  const kpiArrHd = { id: `${idPrefix}kpi_arr_hd`, cycleId, indicatorId: 'ind_arr', period: String(year), targetValue: fmt(6671), challengeValue: fmt(8005), actualValue: fmt(6004), achievementRate: 90, weight: 10, owner: '张经理', dept: '华南大区', status: 'achieved', parentId: kpiArr.id, level: 1, assessmentLevel: 'department', bscDimension: 'customer', history: [90, 89, 88, 90], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };

  // L2 decomposition
  const kpiJdyBj = { id: `${idPrefix}kpi_jdy_bj`, cycleId, indicatorId: 'ind_jdy', period: String(year), targetValue: fmt(2100), challengeValue: fmt(2520), actualValue: fmt(1575), achievementRate: 75, weight: 10, owner: '李经理', dept: '北京大区', status: 'warning', parentId: kpiNewProductJdy.id, level: 2, assessmentLevel: 'team', bscDimension: 'financial', history: [74, 76, 75, 75], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };
  const kpiJdySh = { id: `${idPrefix}kpi_jdy_sh`, cycleId, indicatorId: 'ind_jdy', period: String(year), targetValue: fmt(1650), challengeValue: fmt(1980), actualValue: fmt(1238), achievementRate: 75, weight: 10, owner: '王经理', dept: '上海大区', status: 'warning', parentId: kpiNewProductJdy.id, level: 2, assessmentLevel: 'team', bscDimension: 'financial', history: [76, 74, 75, 75], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };
  const kpiFdlBj = { id: `${idPrefix}kpi_fdl_bj`, cycleId, indicatorId: 'ind_fdl', period: String(year), targetValue: fmt(1600), challengeValue: fmt(1920), actualValue: fmt(1200), achievementRate: 75, weight: 10, owner: '李经理', dept: '北京大区', status: 'warning', parentId: kpiNewProductFdl.id, level: 2, assessmentLevel: 'team', bscDimension: 'financial', history: [75, 76, 74, 75], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };
  const kpiFdlSh = { id: `${idPrefix}kpi_fdl_sh`, cycleId, indicatorId: 'ind_fdl', period: String(year), targetValue: fmt(1700), challengeValue: fmt(2040), actualValue: fmt(1275), achievementRate: 75, weight: 10, owner: '王经理', dept: '上海大区', status: 'warning', parentId: kpiNewProductFdl.id, level: 2, assessmentLevel: 'team', bscDimension: 'financial', history: [74, 75, 76, 75], source: 'annual_plan', annualPlanKpiId: null, x: null, y: null, width: 170, height: 100 };

  const annualPlanKpis = [
    kpiSalesD, kpiCollectionK, kpiProfitMargin, kpiNewProduct, kpiBenchmark, kpiArr,
    kpiSalesDBj, kpiSalesDSh, kpiSalesDHd, kpiSalesDZm,
    kpiCollectionKBj, kpiCollectionKSh, kpiCollectionKHd,
    kpiNewProductJdy, kpiNewProductFdl,
    kpiBenchmarkBj, kpiBenchmarkSh, kpiBenchmarkHd,
    kpiArrBj, kpiArrSh, kpiArrHd,
    kpiJdyBj, kpiJdySh, kpiFdlBj, kpiFdlSh
  ];
  const derivedOmpKpis = annualPlanKpis.map(ak => ({
    ...ak,
    id: omp_deriveKpiIdFromAnnualPlan(ak.id),
    source: 'omp',
    annualPlanKpiId: ak.id,
    parentId: ak.parentId ? omp_deriveKpiIdFromAnnualPlan(ak.parentId) : null,
    actualValue: 0,
    achievementRate: 0,
    status: 'planning',
    history: [],
    x: null,
    y: null,
  }));
  const kpis = [...annualPlanKpis, ...derivedOmpKpis];

  const annualPlanTasks = [
    { id: `${idPrefix}task_1`, cycleId, source: 'annual_plan', seq: 1, name: '大客户经营能力提升', bscDimension: 'customer', kmsUrl: 'https://kms.fineres.com/pages/viewpage.action?pageId=1376824175', owner: '陈总监', status: 'active', description: '提升大客户经营能力，建立深度合作关系', type: 'strategic', progress: 65, dept: '销售部', startDate: `${year}-01-01`, endDate: `${year}-12-31`, kpiAssociations: [], budget: 500, actualCost: 200 },
    { id: `${idPrefix}task_2`, cycleId, source: 'annual_plan', seq: 2, name: '垂直细分客户运营', bscDimension: 'customer', kmsUrl: '#', owner: '王总监', status: 'active', description: '按行业/区域细分客户群体，差异化运营', type: 'strategic', progress: 45, dept: '市场部', startDate: `${year}-02-01`, endDate: `${year}-10-31`, kpiAssociations: [], budget: 300, actualCost: 120 },
    { id: `${idPrefix}task_3`, cycleId, source: 'annual_plan', seq: 3, name: '新产品推广（简道云&FDL）项目', bscDimension: 'customer', kmsUrl: '#', owner: '李经理', status: 'planning', description: '新产品线市场推广和销售赋能', type: 'strategic', progress: 20, dept: '产品部', startDate: `${year}-03-01`, endDate: `${year}-09-30`, kpiAssociations: [], budget: 400, actualCost: 50 },
    { id: `${idPrefix}task_4`, cycleId, source: 'annual_plan', seq: 4, name: '业务破圈（财务&供应链&一号位）项目', bscDimension: 'customer', kmsUrl: '#', owner: '张总监', status: 'planning', description: '打破业务壁垒，实现跨部门协同', type: 'improvement', progress: 15, dept: '运营部', startDate: `${year}-04-01`, endDate: `${year}-12-31`, kpiAssociations: [], budget: 250, actualCost: 30 },
    { id: `${idPrefix}task_5`, cycleId, source: 'annual_plan', seq: 5, name: '数据治理：（优先业务破圈数据治理）', bscDimension: 'customer', kmsUrl: '#', owner: '赵经理', status: 'planning', description: '建立数据标准，提升数据质量', type: 'capability', progress: 10, dept: '数据部', startDate: `${year}-05-01`, endDate: `${year}-11-30`, kpiAssociations: [], budget: 180, actualCost: 20 },
    { id: `${idPrefix}task_6`, cycleId, source: 'annual_plan', seq: 6, name: 'MTL流程项目', bscDimension: 'process', kmsUrl: '#', owner: '刘经理', status: 'active', description: '市场到线索流程优化，提升获客效率', type: 'improvement', progress: 55, dept: '流程部', startDate: `${year}-01-01`, endDate: `${year}-08-31`, kpiAssociations: [], budget: 200, actualCost: 100 },
  ];
  // 同步生成 OMP 执行任务（source='omp'），使 OMP 工作台初始化即有数据并携带来源
  const derivedOmpTasks = annualPlanTasks.map(at => ({
    id: `omp_${at.id}`,
    cycleId: at.cycleId,
    source: 'omp',
    annualPlanTaskId: at.id,
    seq: at.seq,
    name: at.name,
    bscDimension: at.bscDimension,
    kmsUrl: at.kmsUrl,
    annualTarget: at.annualTarget || '',
    spLink: at.spLink || '',
    biDashboard: at.biDashboard || '',
    owner: at.owner,
    members: Array.isArray(at.members) ? [...at.members] : [],
    status: 'planning',
    description: at.description,
    type: at.type,
    progress: 0,
    dept: at.dept,
    startDate: at.startDate,
    endDate: at.endDate,
    kpiAssociations: Array.isArray(at.kpiAssociations) ? at.kpiAssociations.map(a => ({ ...a })) : [],
    budget: at.budget,
    actualCost: 0,
  }));
  const tasks = [...annualPlanTasks, ...derivedOmpTasks];

  // 里程碑/进度记录关联到 OMP 执行任务（omp_ 前缀），与年度计划侧任务解耦
  const ompTaskId = (n) => `omp_${idPrefix}task_${n}`;
  const milestones = [
    { id: `${idPrefix}ms_1`, taskId: ompTaskId(1), name: '渠道调研完成', planDate: `${year}-04-15`, actualDate: `${year}-04-10`, status: 'completed' },
    { id: `${idPrefix}ms_2`, taskId: ompTaskId(1), name: '合作伙伴签约', planDate: `${year}-05-30`, actualDate: `${year}-05-28`, status: 'completed' },
    { id: `${idPrefix}ms_3`, taskId: ompTaskId(1), name: '首批渠道培训', planDate: `${year}-06-30`, actualDate: null, status: 'pending' },
    { id: `${idPrefix}ms_4`, taskId: ompTaskId(1), name: '渠道业绩达标', planDate: `${year}-08-31`, actualDate: null, status: 'pending' },
    { id: `${idPrefix}ms_5`, taskId: ompTaskId(2), name: '需求评审', planDate: `${year}-03-15`, actualDate: `${year}-03-15`, status: 'completed' },
    { id: `${idPrefix}ms_6`, taskId: ompTaskId(2), name: '系统开发', planDate: `${year}-06-30`, actualDate: null, status: 'pending' },
    { id: `${idPrefix}ms_7`, taskId: ompTaskId(2), name: '上线验收', planDate: `${year}-09-15`, actualDate: null, status: 'pending' },
    { id: `${idPrefix}ms_8`, taskId: ompTaskId(3), name: '现状诊断', planDate: `${year}-02-28`, actualDate: `${year}-02-28`, status: 'completed' },
    { id: `${idPrefix}ms_9`, taskId: ompTaskId(3), name: '方案设计', planDate: `${year}-04-15`, actualDate: null, status: 'delayed' },
    { id: `${idPrefix}ms_10`, taskId: ompTaskId(3), name: '实施切换', planDate: `${year}-06-15`, actualDate: null, status: 'pending' },
    { id: `${idPrefix}ms_11`, taskId: ompTaskId(4), name: '体系设计', planDate: `${year}-05-31`, actualDate: `${year}-05-30`, status: 'completed' },
    { id: `${idPrefix}ms_12`, taskId: ompTaskId(4), name: '工具选型', planDate: `${year}-07-31`, actualDate: null, status: 'pending' },
    { id: `${idPrefix}ms_13`, taskId: ompTaskId(5), name: '客户清单确认', planDate: `${year}-04-10`, actualDate: `${year}-04-08`, status: 'completed' },
    { id: `${idPrefix}ms_14`, taskId: ompTaskId(5), name: '攻坚方案制定', planDate: `${year}-04-30`, actualDate: `${year}-04-28`, status: 'completed' },
    { id: `${idPrefix}ms_15`, taskId: ompTaskId(5), name: '中期复盘', planDate: `${year}-06-15`, actualDate: null, status: 'pending' },
    { id: `${idPrefix}ms_16`, taskId: ompTaskId(6), name: '培训需求调研', planDate: `${year}-03-15`, actualDate: `${year}-03-14`, status: 'completed' },
    { id: `${idPrefix}ms_17`, taskId: ompTaskId(6), name: '课程开发', planDate: `${year}-05-31`, actualDate: null, status: 'pending' },
    { id: `${idPrefix}ms_18`, taskId: ompTaskId(6), name: '全员培训', planDate: `${year}-07-31`, actualDate: null, status: 'pending' },
  ];

  const progressRecords = [
    { id: `${idPrefix}rec_1`, taskId: ompTaskId(1), date: `${year}-04-30`, progress: 40, content: '完成渠道调研，签约5家合作伙伴', problems: '部分地区准入门槛较高', reporter: '李经理' },
    { id: `${idPrefix}rec_2`, taskId: ompTaskId(1), date: `${year}-05-31`, progress: 70, content: '合作伙伴培训完成，开始产生首单', problems: '', reporter: '李经理' },
    { id: `${idPrefix}rec_3`, taskId: ompTaskId(2), date: `${year}-04-30`, progress: 35, content: '完成UI设计和核心模块开发', problems: '第三方接口对接延迟', reporter: '王总监' },
    { id: `${idPrefix}rec_4`, taskId: ompTaskId(3), date: `${year}-03-31`, progress: 30, content: '完成现状诊断和问题清单', problems: '部分供应商配合度不高', reporter: '张总监' },
  ];

  return { cycle, kpis, tasks, milestones, progressRecords };
}

// ---- 年度计划重点工作 → OMP 执行任务派生工具函数 ----

/**
 * 根据年度计划重点工作 ID 生成对应的 OMP 执行任务 ID。
 * 规则：'omp_' + annualPlanTaskId；若本身已是 omp_ 前缀则直接返回。
 */
export function omp_deriveTaskIdFromAnnualPlan(annualPlanTaskId) {
  if (!annualPlanTaskId) return null;
  if (String(annualPlanTaskId).startsWith('omp_')) return annualPlanTaskId;
  return 'omp_' + annualPlanTaskId;
}

/**
 * 将当前周期的年度计划重点工作同步为 OMP 执行任务（幂等）。
 * 只处理没有 annualPlanTaskId 的源头任务（即年度计划侧任务）。
 */
export function omp_syncAnnualPlanTasksToExecution(cycleId) {
  const tasks = omp_load('tasks');
  const annualTasks = tasks.filter(t => t.cycleId === cycleId && t.source !== 'omp' && !t.annualPlanTaskId);
  let changed = false;
  const currentCycle = getCurrentCycle();
  const defaultYear = currentCycle ? currentCycle.year : new Date().getFullYear();

  annualTasks.forEach(at => {
    if (at.status === 'closed') return;
    // 标记年度计划源头任务，避免在 OMP 重点工作列表中显示重复行
    if (at.source !== 'annual_plan') { at.source = 'annual_plan'; changed = true; }
    const ompId = omp_deriveTaskIdFromAnnualPlan(at.id);
    const existing = tasks.find(t => t.id === ompId || t.annualPlanTaskId === at.id);
    if (existing) {
      // 若年度计划源头负责人变更，同步到 OMP 派生任务
      if (existing.owner !== at.owner) {
        existing.owner = at.owner || '';
        changed = true;
      }
    } else {
      tasks.push({
        id: ompId,
        cycleId: at.cycleId,
        source: 'omp',
        annualPlanTaskId: at.id,
        seq: typeof at.seq === 'number' ? at.seq : 0,
        name: at.name || '',
        bscDimension: at.bscDimension || 'customer',
        kmsUrl: at.kmsUrl || '#',
        owner: at.owner || '',
        members: Array.isArray(at.members) ? [...at.members] : [],
        status: 'planning',
        description: at.description || '',
        type: at.type || 'strategic',
        progress: 0,
        dept: at.dept || '',
        startDate: at.startDate || `${defaultYear}-01-01`,
        endDate: at.endDate || `${defaultYear}-12-31`,
        kpiAssociations: Array.isArray(at.kpiAssociations)
          ? at.kpiAssociations.map(a => ({ ...a, relationType: a.relationType === 'primary' ? 'primary' : 'supporting' }))
          : [],
        budget: typeof at.budget === 'number' ? at.budget : 0,
        actualCost: 0,
      });
      changed = true;
    }
  });

  if (changed) {
    omp_save('tasks', tasks);
  }
  return changed;
}

// ---- 年度计划 KPI → OMP 执行 KPI 派生工具函数 ----

/**
 * 根据年度计划 KPI ID 生成对应的 OMP 执行 KPI ID。
 * 规则：'omp_' + annualPlanKpiId；若本身已是 omp_ 前缀则直接返回。
 */
export function omp_deriveKpiIdFromAnnualPlan(annualPlanKpiId) {
  if (!annualPlanKpiId) return null;
  if (String(annualPlanKpiId).startsWith('omp_')) return annualPlanKpiId;
  return 'omp_' + annualPlanKpiId;
}

/**
 * 将当前周期的年度计划 KPI 同步为 OMP 执行 KPI（幂等）。
 * 只处理 source !== 'omp' 且没有 annualPlanKpiId 的源头 KPI。
 */
export function omp_syncAnnualPlanKpisToExecution(cycleId) {
  const kpis = omp_load('kpiInstances');
  const annualKpis = kpis.filter(k => k.cycleId === cycleId && k.source !== 'omp' && !k.annualPlanKpiId);
  let changed = false;

  annualKpis.forEach(ak => {
    if (ak.status === 'closed') return;
    // 标记年度计划源头 KPI，避免在 OMP KPI 列表中显示重复行
    if (ak.source !== 'annual_plan') { ak.source = 'annual_plan'; changed = true; }
    const ompId = omp_deriveKpiIdFromAnnualPlan(ak.id);
    const existing = kpis.find(k => k.id === ompId || k.annualPlanKpiId === ak.id);
    if (!existing) {
      kpis.push({
        ...ak,
        id: ompId,
        source: 'omp',
        annualPlanKpiId: ak.id,
        parentId: ak.parentId ? omp_deriveKpiIdFromAnnualPlan(ak.parentId) : null,
        actualValue: 0,
        achievementRate: 0,
        status: 'planning',
        history: [],
        x: null,
        y: null,
      });
      changed = true;
    }
  });

  if (changed) {
    omp_save('kpiInstances', kpis);
  }
  return changed;
}

/**
 * 一次性迁移：将里程碑/进度记录从年度计划任务 ID 关联到 OMP 执行任务 ID。
 * 背景：OMP 工作台只展示 source='omp' 的任务，若 milestone/progressRecord.taskId
 *       仍指向 source='annual_plan' 的源头任务，详情页就看不到里程碑与进度记录。
 * 幂等：已指向 OMP 任务 ID 的记录不会被重复修改。
 */
export function omp_syncMilestonesAndRecordsToOmpTasks() {
  const tasksForMigration = omp_load('tasks');
  const annualPlanTaskIdToOmpId = new Map();
  tasksForMigration.forEach(t => {
    if (t.annualPlanTaskId) {
      annualPlanTaskIdToOmpId.set(t.annualPlanTaskId, t.id);
    }
  });
  function migrateTaskId(records) {
    let changed = false;
    const migrated = records.map(r => {
      const ompId = annualPlanTaskIdToOmpId.get(r.taskId);
      if (ompId && ompId !== r.taskId) {
        changed = true;
        return { ...r, taskId: ompId };
      }
      return r;
    });
    return { changed, migrated };
  }
  const existingMilestones = omp_load('milestones');
  const msMigration = migrateTaskId(existingMilestones);
  if (msMigration.changed) omp_save('milestones', msMigration.migrated);
  const existingRecords = omp_load('progressRecords');
  const recMigration = migrateTaskId(existingRecords);
  if (recMigration.changed) omp_save('progressRecords', recMigration.migrated);
  return msMigration.changed || recMigration.changed;
}

function migrateTaskKpiAssociations(tasks) {
  let changed = false;
  tasks.forEach(task => {
    if (Array.isArray(task.relatedKpiIds) && task.relatedKpiIds.length > 0) {
      const associations = task.relatedKpiIds.map(id => ({
        kpiInstanceId: id,
        relationType: 'supporting'
      }));
      if (associations.length === 1) {
        associations[0].relationType = 'primary';
      }
      task.kpiAssociations = associations;
      delete task.relatedKpiIds;
      changed = true;
    }
    if (!Array.isArray(task.kpiAssociations)) {
      task.kpiAssociations = [];
      changed = true;
    }
    // 最多保留一个主指标
    const primaryIdx = task.kpiAssociations.findIndex(a => a.relationType === 'primary');
    if (primaryIdx > -1) {
      task.kpiAssociations.forEach((a, idx) => {
        if (idx !== primaryIdx && a.relationType === 'primary') {
          a.relationType = 'supporting';
          changed = true;
        }
      });
    }
  });
  return changed;
}

export function omp_initData() {
  // 版本号检测：代码更新时尝试非破坏性迁移与备份
  const DATA_VERSION = 'canvas-v18'; // 重点工作接入 per-record 云端同步，补齐 version 字段
  const storedVersion = DSTE.Storage.getString('dste_omp_data_version');
  if (storedVersion !== DATA_VERSION) {
    // 1) 备份整个 OMP 数据快照（保留最近 5 份）
    const ompSnapshot = {};
    const entitiesToBackup = [
      'indicators', 'kpiInstances', 'tasks', 'milestones', 'progressRecords',
    ];
    entitiesToBackup.forEach(key => {
      const repo = omp_getRepo(key);
      const data = repo ? repo.getRaw() : null;
      if (data && Array.isArray(data) && data.length > 0) {
        ompSnapshot[OMP_STORAGE[key]] = data;
      }
    });
    const cyclesRaw = DSTE.Storage.getString('dste_cycles_v1');
    if (cyclesRaw) {
      try { ompSnapshot['dste_cycles_v1'] = JSON.parse(cyclesRaw); } catch (e) {}
    }
    if (Object.keys(ompSnapshot).length > 0) {
      createBackup('omp', ompSnapshot, storedVersion || 'unknown');
    }
    cleanupOldBackups('omp', 5);

    // 2) 清理旧版累积的扁平备份键，避免无限占用 quota
    const legacyBackupKeys = DSTE.Storage.getKeys('dste_omp_backup_before_');
    legacyBackupKeys.forEach(key => DSTE.Storage.remove(key));

    // 3) 更新版本号，但不删除现有数据；后续仅对缺失实体补默认数据
    DSTE.Storage.setString('dste_omp_data_version', DATA_VERSION);
    console.log('[OMP] OMP data version migrated to:', DATA_VERSION);

    // 4) 补齐 lastModified（per-record 同步依赖）
    entitiesToBackup.forEach(key => {
      const items = omp_load(key);
      if (Array.isArray(items) && items.length > 0) {
        let changed = false;
        items.forEach(item => {
          if (item && typeof item === 'object' && !item.lastModified) {
            item.lastModified = Date.now();
            changed = true;
          }
        });
        if (changed) {
          const repo = omp_getRepo(key);
          if (repo) repo.set(items);
          window._ompApiCache[key] = items;
        }
      }
    });

    // 5) 将 owner 字符串规范化为 PersonRef
    if (window.normalizePerson) {
      const kpis = omp_load('kpiInstances');
      let kpisChanged = false;
      kpis.forEach(k => {
        const normalized = window.normalizePerson(k.owner);
        if (normalized && normalized !== k.owner) { k.owner = normalized; kpisChanged = true; }
      });
      if (kpisChanged) omp_save('kpiInstances', kpis);
      const tasks = omp_load('tasks');
      let tasksChanged = false;
      tasks.forEach(t => {
        const normalized = window.normalizePerson(t.owner);
        if (normalized && normalized !== t.owner) { t.owner = normalized; tasksChanged = true; }
        // 6) 为老任务补齐 members 字段，并把 legacy/stale 对象解析为字符串/PersonRef
        if (!Array.isArray(t.members)) { t.members = []; tasksChanged = true; }
        if (Array.isArray(t.members)) {
          t.members = t.members.map(m => {
            if (!m) return m;
            // 保持字符串工号不变，避免破坏 matrix 拖拽/移除的 data-person-ref 匹配
            if (typeof m === 'string' || typeof m === 'number') return m;
            // 仅对象类型尝试标准化
            const normalizedMember = window.normalizePerson(m);
            return normalizedMember !== null ? normalizedMember : m;
          });
          tasksChanged = true;
        }
      });
      if (tasksChanged) omp_save('tasks', tasks);

      // 7) 为老任务补齐 source 字段：
      //    - 若存在某个任务以其 id 作为 annualPlanTaskId，则它是年度计划源头任务
      //    - 若自身有 annualPlanTaskId，则是 OMP 派生任务
      //    - id 以 omp_ 开头的是 OMP 派生任务；以 cycle_ 开头的是年度计划源头任务
      //    - 其余视为 OMP 手动创建任务
      const tasks2 = omp_load('tasks');
      let sourceChanged = false;
      tasks2.forEach(t => {
        if (!t.source) {
          if (t.annualPlanTaskId || String(t.id).startsWith('omp_')) {
            t.source = 'omp';
          } else if (tasks2.some(other => other.annualPlanTaskId === t.id) || String(t.id).startsWith('cycle_')) {
            t.source = 'annual_plan';
          } else {
            t.source = 'omp';
          }
          sourceChanged = true;
        }
      });
      if (sourceChanged) omp_save('tasks', tasks2);

      // 8) 为老 KPI 补齐 source 字段（规则与任务类似）
      const kpis2 = omp_load('kpiInstances');
      let kpiSourceChanged = false;
      kpis2.forEach(k => {
        if (!k.source) {
          if (k.annualPlanKpiId || String(k.id).startsWith('omp_')) {
            k.source = 'omp';
          } else if (kpis2.some(other => other.annualPlanKpiId === k.id) || String(k.id).startsWith('cycle_')) {
            k.source = 'annual_plan';
          } else {
            k.source = 'omp';
          }
          kpiSourceChanged = true;
        }
      });
      if (kpiSourceChanged) omp_save('kpiInstances', kpis2);

      // 9) 重点工作关联 KPI 模型升级：relatedKpiIds → kpiAssociations
      const tasks3 = omp_load('tasks');
      if (migrateTaskKpiAssociations(tasks3)) {
        omp_save('tasks', tasks3);
      }

      // 10) 为重点工作补齐 version 字段，支持 per-record 云端同步的冲突判断
      const tasks4 = omp_load('tasks');
      let versionChanged = false;
      tasks4.forEach(t => {
        if (t && typeof t === 'object' && t.version === undefined) {
          t.version = 1;
          versionChanged = true;
        }
      });
      if (versionChanged) {
        const repo = omp_getRepo('tasks');
        if (repo) repo.set(tasks4);
        window._ompApiCache['tasks'] = tasks4;
        console.log('[OMP] Backfilled version field for tasks');
      }
    }
  }
  if (!omp_getRepo('indicators').getRaw().length) {
    const indicators = [
      // === 结果指标 (result) ===
      { id: 'ind_sales_d', code: 'IND_001', name: '销售额-D', description: '当期签订合同总金额（营销线）', formula: 'SUM(合同金额)', unit: '万元', frequency: 'quarterly', category: '财务', subCategory: '收入类', dataSource: '帆软数仓', responsibleDept: '营销线', isPositive: true, status: 'active', createdAt: '2025-01-15', indicatorType: 'result', dataType: 'currency' },
      { id: 'ind_collection_k', code: 'IND_002', name: '回款额-K', description: '当期实际回款金额（营销线）', formula: 'SUM(回款金额)', unit: '万元', frequency: 'quarterly', category: '财务', subCategory: '收入类', dataSource: '帆软数仓', responsibleDept: '营销线', isPositive: true, status: 'active', createdAt: '2025-01-15', indicatorType: 'result', dataType: 'currency' },
      { id: 'ind_profit_margin', code: 'IND_003', name: '营销线贡献利润率', description: '营销线利润贡献比例（减去人力成本及结算分摊）', formula: '(营收-成本-人力-分摊)/营收*100', unit: '%', frequency: 'quarterly', category: '财务', subCategory: '利润类', dataSource: '帆软数仓', responsibleDept: '营销线', isPositive: true, status: 'active', createdAt: '2025-01-15', indicatorType: 'result', dataType: 'percentage' },
      { id: 'ind_new_product', code: 'IND_004', name: '新产品销售额-D', description: '新产品线销售收入（JDY&FDL）', formula: 'SUM(新产品合同金额)', unit: '万元', frequency: 'quarterly', category: '财务', subCategory: '创新收入', dataSource: '帆软数仓', responsibleDept: '产品部', isPositive: true, status: 'active', createdAt: '2025-01-15', indicatorType: 'result', dataType: 'currency' },
      { id: 'ind_benchmark', code: 'IND_005', name: '市场标杆得分', description: '市场认知与品牌影响力综合评分', formula: 'AVG(各维度评分)', unit: '分', frequency: 'quarterly', category: '客户', subCategory: '市场认知', dataSource: '帆软数仓', responsibleDept: '市场部', isPositive: true, status: 'active', createdAt: '2025-01-15', indicatorType: 'result', dataType: 'score' },
      { id: 'ind_arr', code: 'IND_006', name: '年度经常性收入（ARR）', description: 'SaaS订阅收入年化金额', formula: 'SUM(MRR)*12', unit: '万元', frequency: 'quarterly', category: '客户', subCategory: '订阅收入', dataSource: '帆软数仓', responsibleDept: '客户成功部', isPositive: true, status: 'active', createdAt: '2025-01-15', indicatorType: 'result', dataType: 'currency' },
      { id: 'ind_jdy', code: 'IND_007', name: 'JDY销售额', description: '简道云产品线销售收入', formula: 'SUM(JDY合同金额)', unit: '万元', frequency: 'quarterly', category: '财务', subCategory: '新产品', dataSource: '帆软数仓', responsibleDept: '产品部', isPositive: true, status: 'active', createdAt: '2025-01-15', indicatorType: 'result', dataType: 'currency' },
      { id: 'ind_fdl', code: 'IND_008', name: 'FDL销售额', description: 'FDL产品线销售收入', formula: 'SUM(FDL合同金额)', unit: '万元', frequency: 'quarterly', category: '财务', subCategory: '新产品', dataSource: '帆软数仓', responsibleDept: '产品部', isPositive: true, status: 'active', createdAt: '2025-01-15', indicatorType: 'result', dataType: 'currency' },
      // === 过程指标 (process) ===
      { id: 'ind_opportunity', code: 'IND_009', name: '有效商机数', description: '当期有效商机数量（已确认需求且预算到位）', formula: 'COUNT(有效商机)', unit: '个', frequency: 'monthly', category: '流程', subCategory: '运营效率', dataSource: '帆软数仓', responsibleDept: '营销线', isPositive: true, status: 'active', createdAt: '2025-01-15', indicatorType: 'process', dataType: 'count' },
      { id: 'ind_visit', code: 'IND_010', name: '客户拜访次数', description: '当期实际拜访客户次数', formula: 'COUNT(拜访记录)', unit: '次', frequency: 'monthly', category: '流程', subCategory: '运营效率', dataSource: '帆软数仓', responsibleDept: '营销线', isPositive: true, status: 'active', createdAt: '2025-01-15', indicatorType: 'process', dataType: 'count' },
      { id: 'ind_conversion', code: 'IND_011', name: '合同转化率', description: '商机转化为合同的比例', formula: '成交合同数/商机总数*100', unit: '%', frequency: 'quarterly', category: '流程', subCategory: '运营效率', dataSource: '帆软数仓', responsibleDept: '营销线', isPositive: true, status: 'active', createdAt: '2025-01-15', indicatorType: 'process', dataType: 'percentage' },
    ];
    omp_getRepo('indicators').set(indicators);
  }
  if (!omp_getRepo('cycles').getRaw().length) {
    omp_save('cycles', [2025, 2026, 2027].map(year => omp_buildYearSeed(year).cycle));
  }
  if (!omp_getRepo('kpiInstances').getRaw().length) {
    const allKpis = [];
    [2025, 2026, 2027].forEach(year => {
      allKpis.push(...omp_buildYearSeed(year).kpis);
    });
    omp_getRepo('kpiInstances').set(allKpis);
  }
  if (!omp_getRepo('tasks').getRaw().length) {
    const allTasks = [];
    [2025, 2026, 2027].forEach(year => {
      allTasks.push(...omp_buildYearSeed(year).tasks);
    });
    omp_getRepo('tasks').set(allTasks);
  }
  if (!omp_getRepo('milestones').getRaw().length) {
    const allMilestones = [];
    [2025, 2026, 2027].forEach(year => {
      allMilestones.push(...omp_buildYearSeed(year).milestones);
    });
    omp_getRepo('milestones').set(allMilestones);
  }
  if (!omp_getRepo('progressRecords').getRaw().length) {
    const allRecords = [];
    [2025, 2026, 2027].forEach(year => {
      allRecords.push(...omp_buildYearSeed(year).progressRecords);
    });
    omp_getRepo('progressRecords').set(allRecords);
  }
  // 一次性迁移：为没有 assessmentLevel 的旧 KPI 补全考核层级
  const existingKpis = omp_load('kpiInstances');
  let migratedAny = false;
  const migratedKpis = existingKpis.map(k => {
    if (k.assessmentLevel) return k;
    migratedAny = true;
    if (k.level === 0) return { ...k, assessmentLevel: 'marketing-line' };
    if (k.level === 1) return { ...k, assessmentLevel: 'department' };
    return { ...k, assessmentLevel: 'team' };
  });
  if (migratedAny) omp_save('kpiInstances', migratedKpis);

  // 一次性迁移：为没有 source 的旧 KPI 补全来源标记（年度经营计划侧为源头）
  const existingKpisForSource = omp_load('kpiInstances');
  let sourceMigratedAny = false;
  const sourceMigratedKpis = existingKpisForSource.map(k => {
    if (k.source) return k;
    sourceMigratedAny = true;
    return { ...k, source: 'annual_plan', annualPlanKpiId: null };
  });
  if (sourceMigratedAny) omp_save('kpiInstances', sourceMigratedKpis);

  // 一次性迁移：将里程碑/进度记录关联到 OMP 执行任务
  omp_syncMilestonesAndRecordsToOmpTasks();

  // 一次性迁移/修复：同步所有 OMP 派生任务的负责人与年度计划源头保持一致
  const tasksForOwnerSync = omp_load('tasks');
  let ownerSyncChanged = false;
  tasksForOwnerSync.forEach(t => {
    if (t.source === 'omp' && t.annualPlanTaskId) {
      const sourceTask = tasksForOwnerSync.find(st => st.id === t.annualPlanTaskId);
      if (sourceTask && sourceTask.owner !== t.owner) {
        t.owner = sourceTask.owner;
        ownerSyncChanged = true;
      }
    }
  });
  if (ownerSyncChanged) omp_save('tasks', tasksForOwnerSync);

  // 暴露恢复入口，便于事故排查
  window._ompRestoreFromBackup = function() {
    const keys = getBackupKeys('omp');
    if (keys.length === 0) {
      DSTE.showToast('未找到 OMP 备份', 'warning');
      return;
    }
    const result = restoreFromBackup('omp');
    if (!result.success) {
      DSTE.showToast('恢复失败：' + result.error, 'error');
      return;
    }
    if (!result.data || typeof result.data !== 'object') {
      DSTE.showToast('备份格式异常', 'error');
      return;
    }
    Object.entries(result.data).forEach(([key, value]) => {
      DSTE.Storage.set(key, value);
    });
    DSTE.showToast(`已恢复 OMP 备份 (${result.key})，请刷新页面`, 'success');
  };
}

// ===== OMP 数据层：本地存储 + 后端 API 双写（per-record）=====
window._ompApiCache = {};

export const ompSyncQueue = getDefaultSyncQueue();
export const ompPerItemExecutor = createPerItemExecutor();
if (typeof window !== 'undefined') {
  ompSyncQueue.bindAutoProcess(ompPerItemExecutor);

  // 清理历史上因后端无 per-record 接口而失败的 omp/tasks 同步项
  // 避免页面加载/切回时继续弹出「已达最大重试次数」红条
  const queue = ompSyncQueue.loadQueue();
  const cleanupRegex = /^\/api\/omp\/tasks\//;
  const hasStaleFailed = queue.some(op => op.status === 'failed' && cleanupRegex.test(op.endpoint));
  if (hasStaleFailed) {
    const cleaned = queue.filter(op => !(op.status === 'failed' && cleanupRegex.test(op.endpoint)));
    ompSyncQueue.saveQueue(cleaned);
    console.log('[OMP] Cleaned up stale failed per-record task sync items');
  }
}

const OMP_API_ENTITY_NAMES = {
  indicators: 'omp/indicators',
  kpiInstances: 'omp/kpiInstances',
  tasks: 'omp/tasks',
  milestones: 'omp/milestones',
  progressRecords: 'omp/progressRecords',
  cycles: 'omp/cycles',
};

function omp_getApiEntityName(key) {
  return OMP_API_ENTITY_NAMES[key] || key;
}

export function omp_load(key) {
  // 优先从内存缓存读取（API 同步后的最新数据）
  if (window._ompApiCache[key]) return window._ompApiCache[key];
  // Fallback 到 Repository（本地存储）
  const repo = omp_getRepo(key);
  if (repo) return repo.get();
  try { return DSTE.Storage.get(OMP_STORAGE[key], []); } catch(e) { return []; }
}

export function omp_save(key, data) {
  // 1. 更新内存缓存
  window._ompApiCache[key] = data;
  // 2. 保存到 Repository（本地存储 fallback，保证离线可用）
  const repo = omp_getRepo(key);
  if (repo) {
    const oldData = repo.getRaw();
    ensureLastModified(data);
    const ok = repo.set(data);
    if (!ok) console.warn('[OMP] local save failed');

    // 3. per-record 单条同步
    const entityName = omp_getApiEntityName(key);
    if (entityName.startsWith('omp/')) {
      const { created, updated, deleted } = computeEntityDiff(oldData, data);
      enqueuePerRecordSync(entityName, { created, updated, deleted }, ompPerItemExecutor, ompSyncQueue);
    }
  } else {
    try { DSTE.Storage.set(OMP_STORAGE[key], data); } catch(e) { console.warn('[OMP] local save failed:', e); }
  }
}
// 暴露给外部模块（如战略指标库）
window.omp_load = omp_load;
window.omp_save = omp_save;
window.omp_initData = omp_initData;

export function omp_getIndicatorName(indicatorId) {
  const ind = omp_load('indicators').find(i => i.id === indicatorId);
  return ind ? ind.name : '未知指标';
}
export function omp_getKpiByInstanceId(kpiInstanceId) {
  return (omp_load('kpiInstances') || []).find(k => k.id === kpiInstanceId);
}
export function omp_getIndicatorNameByKpiInstanceId(kpiInstanceId) {
  const kpi = omp_getKpiByInstanceId(kpiInstanceId);
  if (!kpi) return '指标已失效';
  return omp_getIndicatorName(kpi.indicatorId);
}
export function omp_getKpiAssociations(task) {
  return Array.isArray(task?.kpiAssociations) ? task.kpiAssociations : [];
}
export function omp_getPrimaryKpiAssociation(task) {
  return omp_getKpiAssociations(task).find(a => a.relationType === 'primary');
}
export function omp_getSupportingKpiAssociations(task) {
  return omp_getKpiAssociations(task).filter(a => a.relationType === 'supporting');
}
export function omp_getKpiAssociationDisplayName(association) {
  if (!association) return '';
  return omp_getIndicatorNameByKpiInstanceId(association.kpiInstanceId);
}
export function omp_renderKpiAssociationFields(task, prefix, options) {
  const { primaryId, supportingIds, taskDept, primaryDisabled, cycleId } = options;
  const primaryAssociation = primaryId ? { kpiInstanceId: primaryId, relationType: 'primary' } : null;
  const supportingAssociations = (supportingIds || []).map(id => ({ kpiInstanceId: id, relationType: 'supporting' }));
  const associations = primaryAssociation ? [primaryAssociation, ...supportingAssociations] : [...supportingAssociations];
  return `
    <div class="grid-full-width">
      <input type="hidden" id="${prefix}-kpi-associations-data" value="${escapeHtml(JSON.stringify(associations))}" data-task-dept="${escapeHtml(taskDept || '')}" data-cycle-id="${escapeHtml(cycleId || '')}">
      <label class="form-label">主指标（单选，非必填）</label>
      <div id="${prefix}-primary-kpi-container" class="position-relative">
        <input type="text" id="${prefix}-primary-kpi-search"
          ${primaryDisabled ? 'disabled' : ''}
          placeholder="${primaryDisabled ? '主指标由年度经营计划同步' : '输入指标名称 / KPI 负责人 / 部门进行搜索'}"
          oninput="window.omp_handleKpiSearch('${prefix}', 'primary')"
          onfocus="window.omp_handleKpiSearch('${prefix}', 'primary')"
          style="width:100%;padding:8px 12px;border:1px solid var(--border-color);border-radius:6px;background:${primaryDisabled ? 'var(--bg-page)' : 'var(--bg-card)'};color:var(--text-primary);font-size:13px;">
        <div id="${prefix}-primary-kpi-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:240px;overflow-y:auto;background:var(--bg-card);border:1px solid var(--border-color);border-radius:6px;z-index:100;margin-top:4px;box-shadow:0 4px 12px rgba(0,0,0,0.1);"></div>
      </div>
      <div id="${prefix}-primary-kpi-selected" style="margin-top:8px;">
        ${primaryAssociation ? omp_renderKpiSelectedTag(primaryAssociation, prefix, 'primary', primaryDisabled) : ''}
      </div>
      ${primaryDisabled ? '<div style="font-size:12px;color:var(--text-tertiary);margin-top:4px;">ℹ️ 主指标由年度经营计划同步，如需修改请前往「年度经营计划」页面</div>' : ''}
    </div>
    <div class="grid-full-width">
      <label class="form-label">相关指标（多选）</label>
      <div id="${prefix}-supporting-kpi-container" class="position-relative">
        <input type="text" id="${prefix}-supporting-kpi-search"
          placeholder="输入指标名称 / KPI 负责人 / 部门进行搜索"
          oninput="window.omp_handleKpiSearch('${prefix}', 'supporting')"
          onfocus="window.omp_handleKpiSearch('${prefix}', 'supporting')"
          class="form-input-compact">
        <div id="${prefix}-supporting-kpi-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:240px;overflow-y:auto;background:var(--bg-card);border:1px solid var(--border-color);border-radius:6px;z-index:100;margin-top:4px;box-shadow:0 4px 12px rgba(0,0,0,0.1);"></div>
      </div>
      <div id="${prefix}-supporting-kpi-selected" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;">
        ${supportingAssociations.map(a => omp_renderKpiSelectedTag(a, prefix, 'supporting', false)).join('')}
      </div>
    </div>
    <div id="${prefix}-kpi-dept-warning" style="grid-column:1 / -1;display:none;font-size:12px;color:var(--warning);padding:8px 12px;background:var(--warning-bg);border-radius:6px;">
      所选 KPI 归属部门与任务部门不同，请确认关联合理性。
    </div>`;
}
export function omp_renderKpiSelectedTag(association, prefix, type, disabled) {
  const name = omp_getKpiAssociationDisplayName(association);
  const kpi = omp_getKpiByInstanceId(association.kpiInstanceId);
  const dept = kpi?.dept || '-';
  return `
    <span class="omp-kpi-tag" data-kpi-id="${association.kpiInstanceId}" style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--border-color);border-radius:16px;background:var(--bg-page);font-size:13px;color:var(--text-primary);">
      <span>${escapeHtml(name)} (${escapeHtml(dept)})</span>
      ${disabled ? '' : `<button type="button" onclick="window.omp_removeKpiAssociation('${prefix}', '${type}', '${association.kpiInstanceId}')" style="background:none;border:none;cursor:pointer;color:var(--text-tertiary);font-size:14px;line-height:1;padding:0;">×</button>`}
    </span>`;
}
export function omp_searchKpis(query, cycleId, excludeIds, taskDept) {
  const kpis = (omp_load('kpiInstances') || []).filter(k => k.cycleId === cycleId);
  const q = query.toLowerCase();
  const excludeSet = new Set(excludeIds || []);
  const matched = kpis.filter(k => !excludeSet.has(k.id)).filter(k => {
    const ind = omp_getIndicatorName(k.indicatorId) || '';
    const ownerStr = typeof k.owner === 'string' ? k.owner : (k.owner?.displayName || k.owner?.name || '');
    return ind.toLowerCase().includes(q) ||
           (k.dept || '').toLowerCase().includes(q) ||
           ownerStr.toLowerCase().includes(q);
  });
  matched.sort((a, b) => {
    if (taskDept) {
      const aSameDept = a.dept === taskDept ? 1 : 0;
      const bSameDept = b.dept === taskDept ? 1 : 0;
      if (aSameDept !== bSameDept) return bSameDept - aSameDept;
    }
    const aName = omp_getIndicatorName(a.indicatorId) || '';
    const bName = omp_getIndicatorName(b.indicatorId) || '';
    return aName.localeCompare(bName);
  });
  return matched.slice(0, 10);
}
window.omp_handleKpiSearch = function(prefix, type) {
  const input = document.getElementById(`${prefix}-${type}-kpi-search`);
  if (!input) return;
  const timerKey = `_ompKpiSearchTimer_${prefix}_${type}`;
  if (window[timerKey]) { clearTimeout(window[timerKey]); }
  window[timerKey] = setTimeout(() => {
    window[timerKey] = null;
    const dropdown = document.getElementById(`${prefix}-${type}-kpi-dropdown`);
    if (!dropdown) return;
    const query = input.value.trim();
    document.querySelectorAll('[id$="-kpi-dropdown"]').forEach(el => { if (el.id !== dropdown.id) el.style.display = 'none'; });
    if (!query) { dropdown.style.display = 'none'; return; }
    const dataInput = document.getElementById(`${prefix}-kpi-associations-data`);
    const cycleId = dataInput?.dataset?.cycleId || '';
    const taskDept = dataInput?.dataset?.taskDept || '';
    let associations = [];
    try { associations = JSON.parse(dataInput?.value || '[]'); } catch (e) { associations = []; }
    const selectedIds = associations.map(a => a.kpiInstanceId);
    if (type === 'supporting') {
      const primary = associations.find(a => a.relationType === 'primary');
      if (primary) selectedIds.push(primary.kpiInstanceId);
    }
    const results = omp_searchKpis(query, cycleId, selectedIds, taskDept);
    if (results.length === 0) {
      dropdown.innerHTML = `<div style="padding:10px 12px;font-size:13px;color:var(--text-tertiary);">未找到相关 KPI，请尝试其他关键词</div>`;
    } else {
      dropdown.innerHTML = results.map(k => `
        <div onmousedown="event.preventDefault();" onclick="window.omp_selectKpi('${prefix}', '${type}', '${k.id}')" style="padding:10px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border-light);">
          <div style="font-weight:500;">${escapeHtml(omp_getIndicatorName(k.indicatorId))}</div>
          <div class="text-xs-tertiary">${escapeHtml(k.dept || '-')} · ${escapeHtml(typeof k.owner === 'string' ? k.owner : (k.owner?.displayName || k.owner?.name || '-'))}</div>
        </div>`).join('');
    }
    dropdown.style.display = 'block';
  }, 200);
};
window.omp_selectKpi = function(prefix, type, kpiInstanceId) {
  const dataInput = document.getElementById(`${prefix}-kpi-associations-data`);
  let associations = [];
  try { associations = JSON.parse(dataInput?.value || '[]'); } catch (e) { associations = []; }
  if (type === 'primary') {
    const idx = associations.findIndex(a => a.relationType === 'primary');
    if (idx > -1) associations.splice(idx, 1);
    associations.unshift({ kpiInstanceId, relationType: 'primary' });
  } else {
    if (!associations.some(a => a.kpiInstanceId === kpiInstanceId)) {
      associations.push({ kpiInstanceId, relationType: 'supporting' });
    }
  }
  if (dataInput) dataInput.value = JSON.stringify(associations);
  const searchInput = document.getElementById(`${prefix}-${type}-kpi-search`);
  const dropdown = document.getElementById(`${prefix}-${type}-kpi-dropdown`);
  if (searchInput) searchInput.value = '';
  if (dropdown) dropdown.style.display = 'none';
  window.omp_refreshKpiAssociationUI(prefix);
};
window.omp_removeKpiAssociation = function(prefix, type, kpiInstanceId) {
  const dataInput = document.getElementById(`${prefix}-kpi-associations-data`);
  let associations = [];
  try { associations = JSON.parse(dataInput?.value || '[]'); } catch (e) { associations = []; }
  associations = associations.filter(a => !(a.kpiInstanceId === kpiInstanceId && (type === 'primary' ? a.relationType === 'primary' : a.relationType === 'supporting')));
  if (dataInput) dataInput.value = JSON.stringify(associations);
  window.omp_refreshKpiAssociationUI(prefix);
};
window.omp_refreshKpiAssociationUI = function(prefix) {
  const dataInput = document.getElementById(`${prefix}-kpi-associations-data`);
  let associations = [];
  try { associations = JSON.parse(dataInput?.value || '[]'); } catch (e) { associations = []; }
  const primary = associations.find(a => a.relationType === 'primary');
  const supporting = associations.filter(a => a.relationType === 'supporting');
  const primaryContainer = document.getElementById(`${prefix}-primary-kpi-selected`);
  const supportingContainer = document.getElementById(`${prefix}-supporting-kpi-selected`);
  const primarySearch = document.getElementById(`${prefix}-primary-kpi-search`);
  if (primaryContainer) {
    const primaryDisabled = primarySearch?.disabled || false;
    primaryContainer.innerHTML = primary ? omp_renderKpiSelectedTag(primary, prefix, 'primary', primaryDisabled) : '';
  }
  if (supportingContainer) {
    supportingContainer.innerHTML = supporting.map(a => omp_renderKpiSelectedTag(a, prefix, 'supporting', false)).join('');
  }
  window.omp_updateKpiDeptWarning(prefix);
};
window.omp_updateKpiDeptWarning = function(prefix) {
  const dataInput = document.getElementById(`${prefix}-kpi-associations-data`);
  let associations = [];
  try { associations = JSON.parse(dataInput?.value || '[]'); } catch (e) { associations = []; }
  const warning = document.getElementById(`${prefix}-kpi-dept-warning`);
  if (!warning) return;
  let taskDept = dataInput?.dataset?.taskDept || '';
  if (prefix === 'omp-task') {
    taskDept = document.getElementById('omp-task-dept')?.value?.trim() || taskDept;
  }
  let hasCrossDept = false;
  associations.forEach(a => {
    const kpi = omp_getKpiByInstanceId(a.kpiInstanceId);
    if (kpi && taskDept && kpi.dept !== taskDept) hasCrossDept = true;
  });
  warning.style.display = hasCrossDept ? 'block' : 'none';
};
window.omp_initKpiSearchFields = function(prefix, taskDept) {
  if (!window._ompKpiDropdownCloseBound) {
    document.addEventListener('click', function(e) {
      document.querySelectorAll('[id$="-kpi-dropdown"]').forEach(el => {
        const container = el.closest('[id$="-kpi-container"]');
        if (container && !container.contains(e.target)) el.style.display = 'none';
      });
    });
    window._ompKpiDropdownCloseBound = true;
  }
  const dataInput = document.getElementById(`${prefix}-kpi-associations-data`);
  if (dataInput && taskDept) dataInput.dataset.taskDept = taskDept;
  window.omp_updateKpiDeptWarning(prefix);
};
export function omp_collectKpiAssociationsFromForm(prefix, existingAssociations, isDerived) {
  const dataInput = document.getElementById(`${prefix}-kpi-associations-data`);
  let associations = [];
  try { associations = JSON.parse(dataInput?.value || '[]'); } catch (e) { associations = []; }
  if (isDerived) {
    const existingPrimary = (existingAssociations || []).find(a => a.relationType === 'primary');
    const finalAssociations = [];
    if (existingPrimary) finalAssociations.push({ ...existingPrimary });
    associations.filter(a => a.relationType !== 'primary').forEach(a => {
      if (!finalAssociations.some(f => f.kpiInstanceId === a.kpiInstanceId)) finalAssociations.push({ ...a });
    });
    return finalAssociations;
  }
  return associations;
}

export function getCurrentCycle() {
  try {
    const cycles = JSON.parse(DSTE.Storage.getString('dste_cycles_v1') || '[]');
    const found = cycles.find(c => c.id === window._dsteState.currentCycleId);
    if (found) return found;
    // Safe fallback: derive year from currentCycleId or use current calendar year
    const match = String(window._dsteState.currentCycleId || '').match(/cycle_(\d{4})_/);
    const year = match ? parseInt(match[1], 10) : new Date().getFullYear();
    return { id: window._dsteState.currentCycleId, year, name: `${year}年度 — 营销线`, phase: 'planning', organization: '营销线', parentCycleId: null };
  } catch(e) {
    const year = new Date().getFullYear();
    return { id: window._dsteState.currentCycleId, year, name: `${year}年度 — 营销线`, phase: 'planning', organization: '营销线', parentCycleId: null };
  }
}

// ===== OMP: 弹窗函数 =====
export function omp_openModal(title, content, wide) {
  const existing = document.getElementById('omp-active-modal');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'omp-modal-overlay';
  overlay.id = 'omp-active-modal';
  overlay.innerHTML = `
    <div class="omp-modal ${wide ? 'omp-modal-wide' : ''}">
      <div class="modal-header">
        <h3 style="margin:0;font-size:17px;">${escapeHtml(title)}</h3>
        <button data-modal-action="modal-close" class="btn-icon-lg">×</button>
      </div>
      <div class="p-6">${content}</div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}
window.omp_openModal = omp_openModal;
