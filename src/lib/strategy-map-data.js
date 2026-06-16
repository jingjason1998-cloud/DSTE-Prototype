import { Storage } from './utils.js';

/**
 * 战略地图数据层
 * 负责地图配置、目标、因果链的持久化与版本迁移
 */

// ========== 常量 ==========
export const STORAGE_VERSION = '3';

const STORAGE_KEYS = {
  version: 'dste_strategy_data_version',
  maps: 'dste_sm_maps_v3',
  currentMapId: 'dste_sm_current_v3',
  objectives: (mapId) => `dste_sm_obj_${mapId}_v3`,
  links: (mapId) => `dste_sm_links_${mapId}_v3`,
  // 旧版本兼容
  legacyMaps: 'dste_strategy_maps_v1',
  legacyObjectives: 'dste_strategy_objectives_v1',
  legacyLinks: 'dste_strategy_links_v1',
  legacyVersion: 'dste_strategy_data_version',
};

export const DIM_CONFIG = {
  fin: { key: 'fin', name: '财务维度', icon: '💰', color: '#1677FF', desc: '股东价值最大化' },
  cus: { key: 'cus', name: '客户维度', icon: '🤝', color: '#52C41A', desc: '客户价值主张' },
  int: { key: 'int', name: '内部流程维度', icon: '⚙️', color: '#FAAD14', desc: '运营卓越' },
  lea: { key: 'lea', name: '学习与成长维度', icon: '📚', color: '#722ED1', desc: '组织能力建设' },
};

export const DIM_ORDER = { lea: 0, int: 1, cus: 2, fin: 3 };

export const LINK_TYPES = {
  drives: { label: '驱动', desc: '直接驱动达成' },
  influences: { label: '影响', desc: '对目标产生影响' },
  supports: { label: '支撑', desc: '提供支撑作用' },
};

export function statusText(s) {
  const map = { on_track: '正常', at_risk: '风险', not_started: '未开始', achieved: '已达成', in_progress: '进行中' };
  return map[s] || s;
}

// 战略地图状态配置（用于列表页徽章）
export const MAP_STATUS_CONFIG = {
  draft: { label: '草稿', badgeClass: 'status-default', dot: '#9ca3af', color: '#6b7280' },
  review: { label: '审批中', badgeClass: 'status-warning', dot: '#f59e0b', color: '#d97706' },
  approved: { label: '已发布', badgeClass: 'status-success', dot: '#22c55e', color: '#16a34a' },
  archived: { label: '已归档', badgeClass: 'status-archived', dot: '#94a3b8', color: '#64748b' },
};

export function mapStatusText(s) {
  return MAP_STATUS_CONFIG[s]?.label || s;
}

// ========== 内置默认地图：营销线 SP823(25~27) ==========
export const DEFAULT_MAP_ID = 'yx_2025_2027';

const DEFAULT_MAPS = [
  {
    id: DEFAULT_MAP_ID,
    name: '营销线 SP823(25~27) 战略地图',
    dept: 'yx',
    deptName: '营销线',
    cycle: { startYear: 2025, endYear: 2027 },
    description: '营销线2025-2027三年业务战略规划（Marks战略宣贯）',
    status: 'approved',
    version: 1,
    versionLabel: 'v1.0 初始版',
    createdBy: '系统',
    updatedBy: '系统',
    approvedBy: '系统',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    approvedAt: '2025-01-01T00:00:00Z',
    source: 'https://kms.fineres.com/pages/viewpage.action?pageId=1340311504',
    presentation: { url: '', fileName: '', fileData: '' }
  }
];

const DEFAULT_OBJECTIVES = [
  // 财务维度
  { id: 'so_fin_001', name: '销售规模复合增长25%', desc: '以24年为基线，复合25%增长率，2027年销售规模达26亿', dim: 'fin', level: 'primary',
    milestones: { 2025: { target: '13亿', actual: null, status: 'not_started', focusLevel: 'primary' }, 2026: { target: '17亿', actual: null, status: 'not_started', focusLevel: 'primary' }, 2027: { target: '26亿', actual: null, status: 'not_started', focusLevel: 'primary' } }, owner: '营销总裁', kpiRef: null, taskRef: null },
  { id: 'so_fin_002', name: '回款达标', desc: '年度回款目标达成，保障现金流健康', dim: 'fin', level: 'primary',
    milestones: { 2025: { target: '回款率≥90%', actual: null, status: 'not_started', focusLevel: 'primary' }, 2026: { target: '回款率≥92%', actual: null, status: 'not_started', focusLevel: 'primary' }, 2027: { target: '回款率≥95%', actual: null, status: 'not_started', focusLevel: 'primary' } }, owner: '财务总监', kpiRef: null, taskRef: null },
  { id: 'so_fin_003', name: '贡献利润提升', desc: '贡献利润率提升，E/R优化，实现健康可持续的盈利增长', dim: 'fin', level: 'primary',
    milestones: { 2025: { target: '贡献利润率基线+2pp', actual: null, status: 'not_started', focusLevel: 'primary' }, 2026: { target: '贡献利润率基线+4pp', actual: null, status: 'not_started', focusLevel: 'primary' }, 2027: { target: '贡献利润率基线+6pp', actual: null, status: 'not_started', focusLevel: 'secondary' } }, owner: '财务总监', kpiRef: null, taskRef: null },
  { id: 'so_fin_004', name: 'ARR占比提升', desc: '年度可持续性收入占比持续提升，重点提高新签ARR合同金额及年费制产品金额', dim: 'fin', level: 'primary',
    milestones: { 2025: { target: 'ARR占比基线+5pp', actual: null, status: 'not_started', focusLevel: 'primary' }, 2026: { target: 'ARR占比基线+10pp', actual: null, status: 'not_started', focusLevel: 'primary' }, 2027: { target: 'ARR占比XX%以上', actual: null, status: 'not_started', focusLevel: 'secondary' } }, owner: '营销本部', kpiRef: null, taskRef: null },
  { id: 'so_fin_005', name: '行业销售额', desc: '8组20个体系客户的行业细分销售额', dim: 'fin', level: 'secondary', parentId: 'so_fin_001',
    milestones: { 2025: { target: '占销售额30%', actual: null, status: 'not_started', focusLevel: 'secondary' }, 2026: { target: '占销售额35%', actual: null, status: 'not_started', focusLevel: 'secondary' }, 2027: { target: '占销售额40%', actual: null, status: 'not_started', focusLevel: 'secondary' } }, owner: '垂直客群部', kpiRef: null, taskRef: null },
  { id: 'so_fin_006', name: '新产品销售额', desc: 'Fine+、简道云独享版、FDL等新产品线销售额', dim: 'fin', level: 'secondary', parentId: 'so_fin_001',
    milestones: { 2025: { target: '占销售额15%', actual: null, status: 'not_started', focusLevel: 'secondary' }, 2026: { target: '占销售额20%', actual: null, status: 'not_started', focusLevel: 'secondary' }, 2027: { target: '占销售额25%', actual: null, status: 'not_started', focusLevel: 'secondary' } }, owner: '产品营销部', kpiRef: null, taskRef: null },

  // 客户维度
  { id: 'so_cus_001', name: '大客户拓展与经营', desc: '持续深耕大客户，以选定大客户为目标战场，实现规模增长，拉动大盘增长率', dim: 'cus', level: 'primary',
    milestones: { 2025: { target: '铁三角覆盖50%', actual: null, status: 'not_started', focusLevel: 'primary' }, 2026: { target: '铁三角覆盖80%', actual: null, status: 'not_started', focusLevel: 'primary' }, 2027: { target: '大客户能力体系化', actual: null, status: 'not_started', focusLevel: 'primary' } }, owner: '大客户部', kpiRef: null, taskRef: null },
  { id: 'so_cus_002', name: '垂直客群运营', desc: '8组20个体系客户运营，6个一级行业、17个二级行业、98个三级行业，新增汽车/半导体/鞋服', dim: 'cus', level: 'primary',
    milestones: { 2025: { target: '20个体系客户', actual: null, status: 'not_started', focusLevel: 'primary' }, 2026: { target: '客群运营能力复制', actual: null, status: 'not_started', focusLevel: 'primary' }, 2027: { target: '高于平均增长率', actual: null, status: 'not_started', focusLevel: 'secondary' } }, owner: '垂直客群部', kpiRef: null, taskRef: null },
  { id: 'so_cus_003', name: '业务破圈行动', desc: '从IT成本到业务价值转型，从BI工具到数据伙伴转变，使用范围更广、场景更深、层级更高', dim: 'cus', level: 'primary',
    milestones: { 2025: { target: '财务/供应链域突破', actual: null, status: 'not_started', focusLevel: 'secondary' }, 2026: { target: '数据治理/人才服务覆盖', actual: null, status: 'not_started', focusLevel: 'secondary' }, 2027: { target: '应用复用/一号位项目', actual: null, status: 'not_started', focusLevel: 'secondary' } }, owner: '业务创新部', kpiRef: null, taskRef: null },

  // 内部流程维度
  { id: 'so_int_001', name: '作战单元强绩效考核', desc: '战区承接高业绩增长指标，发挥主官及团队主观能动性，对本部增长策略做市场化选择配合', dim: 'int', level: 'primary',
    milestones: { 2025: { target: '绩效考核体系落地', actual: null, status: 'not_started', focusLevel: 'primary' }, 2026: { target: '战区自主经营能力', actual: null, status: 'not_started', focusLevel: 'primary' }, 2027: { target: '市场化协作成熟', actual: null, status: 'not_started', focusLevel: 'primary' } }, owner: '战区管理部', kpiRef: null, taskRef: null },
  { id: 'so_int_002', name: '铁三角实践与复制', desc: '大客户盘点、铁三角实践、经验沉淀积累与传播，涌现大客户能力强的人才', dim: 'int', level: 'primary',
    milestones: { 2025: { target: '标杆战区试点', actual: null, status: 'not_started', focusLevel: 'primary' }, 2026: { target: '训战体系建立', actual: null, status: 'not_started', focusLevel: 'secondary' }, 2027: { target: '全战区覆盖', actual: null, status: 'not_started', focusLevel: 'secondary' } }, owner: '客户成功部', kpiRef: null, taskRef: null },
  { id: 'so_int_003', name: '特战队客群运营', desc: '类似烟草特战队模式，项目型与职能型组织结合，统筹市场洞察、标杆培育、跨区域活动', dim: 'int', level: 'primary',
    milestones: { 2025: { target: '3个特战队组建', actual: null, status: 'not_started', focusLevel: 'primary' }, 2026: { target: '8组体系客户运营', actual: null, status: 'not_started', focusLevel: 'primary' }, 2027: { target: '运营方法论沉淀', actual: null, status: 'not_started', focusLevel: 'secondary' } }, owner: '客群运营部', kpiRef: null, taskRef: null },
  { id: 'so_int_004', name: '差异化激励方案', desc: '利用外部激励（产品线与公司）+ 内部激励资源，制定合理差异化激励，提高一线积极性', dim: 'int', level: 'primary',
    milestones: { 2025: { target: '激励方案设计', actual: null, status: 'not_started', focusLevel: 'secondary' }, 2026: { target: '激励效果评估优化', actual: null, status: 'not_started', focusLevel: 'secondary' }, 2027: { target: '激励体系成熟', actual: null, status: 'not_started', focusLevel: 'secondary' } }, owner: '薪酬绩效部', kpiRef: null, taskRef: null },

  // 学习成长维度
  { id: 'so_lea_001', name: '组织干部人才建设', desc: '到2027年新增HC上限446人，新增干部上限63个（按1:7官民比），组织能力持续提升', dim: 'lea', level: 'primary',
    milestones: { 2025: { target: 'HC+150, 干部+20', actual: null, status: 'not_started', focusLevel: 'primary' }, 2026: { target: 'HC+300, 干部+42', actual: null, status: 'not_started', focusLevel: 'primary' }, 2027: { target: 'HC+446, 干部+63', actual: null, status: 'not_started', focusLevel: 'secondary' } }, owner: 'HRBP', kpiRef: null, taskRef: null },
  { id: 'so_lea_002', name: '大客户能力训战', desc: '大客户能力训战、解决方案能力训战、大客户PM训战、预算引导、客户关系提升', dim: 'lea', level: 'primary',
    milestones: { 2025: { target: '训战体系搭建', actual: null, status: 'not_started', focusLevel: 'primary' }, 2026: { target: '覆盖核心骨干', actual: null, status: 'not_started', focusLevel: 'primary' }, 2027: { target: '人才梯队成熟', actual: null, status: 'not_started', focusLevel: 'secondary' } }, owner: '培训部', kpiRef: null, taskRef: null },
  { id: 'so_lea_003', name: '数字人才业务渗透', desc: '数字人才业务渗透，让客户真正产品用起来、用得好，支撑业务价值转型', dim: 'lea', level: 'primary',
    milestones: { 2025: { target: '数字人才服务启动', actual: null, status: 'not_started', focusLevel: 'secondary' }, 2026: { target: '业务场景渗透', actual: null, status: 'not_started', focusLevel: 'secondary' }, 2027: { target: '数据伙伴定位', actual: null, status: 'not_started', focusLevel: 'secondary' } }, owner: '数字人才部', kpiRef: null, taskRef: null },
];

const DEFAULT_LINKS = [
  { from: 'so_lea_001', to: 'so_int_001', type: 'drives' },
  { from: 'so_lea_002', to: 'so_int_002', type: 'drives' },
  { from: 'so_lea_003', to: 'so_int_003', type: 'drives' },
  { from: 'so_int_001', to: 'so_cus_001', type: 'drives' },
  { from: 'so_int_002', to: 'so_cus_001', type: 'drives' },
  { from: 'so_int_003', to: 'so_cus_002', type: 'drives' },
  { from: 'so_int_004', to: 'so_cus_003', type: 'supports' },
  { from: 'so_cus_001', to: 'so_fin_001', type: 'drives' },
  { from: 'so_cus_002', to: 'so_fin_001', type: 'influences' },
  { from: 'so_cus_003', to: 'so_fin_002', type: 'drives' },
  { from: 'so_int_001', to: 'so_fin_003', type: 'drives' },
  { from: 'so_fin_003', to: 'so_fin_001', type: 'supports' },
  { from: 'so_fin_002', to: 'so_fin_001', type: 'supports' },
];

// ========== 工具函数 ==========
function safeJsonParse(str, fallback) {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch (e) {
    console.warn('[StrategyMapData] parse error, fallback used', e);
    return fallback;
  }
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function normalizePresentation(value) {
  if (!value) return { url: '', fileName: '', fileData: '' };
  if (typeof value === 'string') return { url: value, fileName: '', fileData: '' };
  return {
    url: value.url || '',
    fileName: value.fileName || '',
    fileData: value.fileData || ''
  };
}

function generateMapId(dept, startYear, endYear) {
  return `${dept}_${startYear}_${endYear}`;
}

// ========== 版本迁移 ==========
function migrateFromLegacy() {
  try {
    const legacyMaps = Storage.getString(STORAGE_KEYS.legacyMaps);
    const legacyObjs = Storage.getString(STORAGE_KEYS.legacyObjectives);
    const legacyLinks = Storage.getString(STORAGE_KEYS.legacyLinks);

    if (!legacyObjs && !legacyLinks && !legacyMaps) return false;

    const mapId = 'legacy_yx_2025_2027';
    const mapConfig = legacyMaps
      ? safeJsonParse(legacyMaps, null)?.[0] || DEFAULT_MAPS[0]
      : { ...DEFAULT_MAPS[0], id: mapId, name: '营销线 SP823(25~27) 战略地图（已迁移）' };

    const objectives = legacyObjs ? safeJsonParse(legacyObjs, []) : [];
    const links = legacyLinks ? safeJsonParse(legacyLinks, []) : [];

    // 写入新存储
    Storage.set(STORAGE_KEYS.maps, [{ ...mapConfig, id: mapId }]);
    Storage.setString(STORAGE_KEYS.currentMapId, mapId);
    Storage.set(STORAGE_KEYS.objectives(mapId), objectives);
    Storage.set(STORAGE_KEYS.links(mapId), links);

    // 清理旧存储
    Storage.remove(STORAGE_KEYS.legacyMaps);
    Storage.remove(STORAGE_KEYS.legacyObjectives);
    Storage.remove(STORAGE_KEYS.legacyLinks);

    console.log('[StrategyMapData] Migrated legacy data to', mapId);
    return true;
  } catch (e) {
    console.error('[StrategyMapData] Migration failed', e);
    return false;
  }
}

function ensureVersion() {
  const storedVersion = Storage.getString(STORAGE_KEYS.version);
  if (storedVersion !== STORAGE_VERSION) {
    // 版本不一致时，先尝试迁移旧数据
    const migrated = migrateFromLegacy();
    if (!migrated) {
      // 无旧数据可迁移，重置为默认
      resetToDefaults();
    }
    Storage.setString(STORAGE_KEYS.version, STORAGE_VERSION);
  }
}

function resetToDefaults() {
  Storage.set(STORAGE_KEYS.maps, DEFAULT_MAPS);
  Storage.setString(STORAGE_KEYS.currentMapId, DEFAULT_MAP_ID);
  Storage.set(STORAGE_KEYS.objectives(DEFAULT_MAP_ID), DEFAULT_OBJECTIVES);
  Storage.set(STORAGE_KEYS.links(DEFAULT_MAP_ID), DEFAULT_LINKS);
}

// ========== MapConfigStore ==========
export const MapConfigStore = {
  getAll() {
    ensureVersion();
    return safeJsonParse(Storage.getString(STORAGE_KEYS.maps), deepClone(DEFAULT_MAPS));
  },

  get(id) {
    return this.getAll().find(m => m.id === id) || null;
  },

  create(config) {
    const maps = this.getAll();
    const dept = (config.dept || 'default').trim().toLowerCase();
    const startYear = Number(config.cycle?.startYear) || new Date().getFullYear();
    const endYear = Number(config.cycle?.endYear) || (startYear + 2);
    if (endYear < startYear) {
      throw new Error('结束年不能早于起始年');
    }

    let baseId = generateMapId(dept, startYear, endYear);
    let id = baseId;
    let suffix = 1;
    while (maps.some(m => m.id === id)) {
      suffix += 1;
      id = `${baseId}_${suffix}`;
    }

    const now = new Date().toISOString();
    const currentUser = '当前用户'; // 后续可接入用户系统
    const payload = {
      id,
      name: (config.name || '未命名战略地图').trim(),
      dept,
      deptName: (config.deptName || config.dept || '未指定部门').trim(),
      cycle: { startYear, endYear },
      description: (config.description || '').trim(),
      status: 'draft',
      version: 1,
      versionLabel: config.versionLabel || 'v1.0 初始版',
      createdBy: currentUser,
      updatedBy: currentUser,
      createdAt: now,
      updatedAt: now,
      source: config.source || '',
      presentation: normalizePresentation(config.presentation)
    };

    maps.push(payload);
    Storage.set(STORAGE_KEYS.maps, maps);
    // 初始化空目标与链接
    Storage.set(STORAGE_KEYS.objectives(id), []);
    Storage.set(STORAGE_KEYS.links(id), []);
    return payload;
  },

  save(config) {
    if (!config.id) throw new Error('地图 ID 不能为空');
    const name = (config.name || '').trim();
    if (!name) throw new Error('地图名称不能为空');
    const startYear = Number(config.cycle?.startYear);
    const endYear = Number(config.cycle?.endYear);
    if (Number.isNaN(startYear) || Number.isNaN(endYear) || endYear < startYear) {
      throw new Error('规划周期不合法');
    }

    const maps = this.getAll();
    const idx = maps.findIndex(m => m.id === config.id);
    const now = new Date().toISOString();
    const currentUser = '当前用户'; // 后续可接入用户系统

    // 若状态变为 approved 且之前不是 approved，记录 approvedBy / approvedAt
    const oldStatus = idx >= 0 ? maps[idx].status : null;
    const isPublishing = config.status === 'approved' && oldStatus !== 'approved';

    const payload = {
      ...config,
      name,
      dept: (config.dept || 'default').trim().toLowerCase(),
      deptName: (config.deptName || config.dept || '未指定部门').trim(),
      cycle: { startYear, endYear },
      description: (config.description || '').trim(),
      updatedBy: currentUser,
      updatedAt: now,
    };
    if (isPublishing) {
      payload.approvedBy = currentUser;
      payload.approvedAt = now;
    }

    if (idx >= 0) {
      maps[idx] = { ...maps[idx], ...payload, id: config.id };
    } else {
      payload.createdAt = payload.createdAt || now;
      payload.createdBy = payload.createdBy || currentUser;
      maps.push(payload);
    }
    Storage.set(STORAGE_KEYS.maps, maps);
    return maps[idx >= 0 ? idx : maps.length - 1];
  },

  delete(id) {
    if (id === DEFAULT_MAP_ID) return false; // 保护默认地图
    let maps = this.getAll().filter(m => m.id !== id);
    if (maps.length === this.getAll().length) return false; // 未找到

    Storage.set(STORAGE_KEYS.maps, maps);
    Storage.remove(STORAGE_KEYS.objectives(id));
    Storage.remove(STORAGE_KEYS.links(id));

    // 若删除的是当前选中地图，切换到剩余地图的第一个或默认地图
    const currentId = this.getCurrentId();
    if (currentId === id) {
      const fallback = maps[0]?.id || DEFAULT_MAP_ID;
      this.setCurrentId(fallback);
    }
    return true;
  },

  getCurrentId() {
    ensureVersion();
    return Storage.getString(STORAGE_KEYS.currentMapId) || DEFAULT_MAP_ID;
  },

  setCurrentId(id) {
    Storage.setString(STORAGE_KEYS.currentMapId, id);
  },

  buildId(dept, startYear, endYear) {
    return generateMapId(dept, startYear, endYear);
  },

  statusConfig() {
    return MAP_STATUS_CONFIG;
  }
};

// ========== ObjectiveStore ==========
export const ObjectiveStore = {
  load(mapId) {
    ensureVersion();
    const data = Storage.getString(STORAGE_KEYS.objectives(mapId));
    // 无显式保存时返回空数组；默认地图的数据由 ensureVersion 显式初始化
    return data ? safeJsonParse(data, []) : [];
  },

  save(mapId, objectives) {
    Storage.set(STORAGE_KEYS.objectives(mapId), objectives);
  },

  getDefaults() {
    return deepClone(DEFAULT_OBJECTIVES);
  },

  create(mapId, objective) {
    const objectives = this.load(mapId);
    objectives.push(objective);
    this.save(mapId, objectives);
    return objectives;
  },

  update(mapId, id, updates) {
    const objectives = this.load(mapId);
    const idx = objectives.findIndex(o => o.id === id);
    if (idx >= 0) {
      objectives[idx] = { ...objectives[idx], ...updates, id };
      this.save(mapId, objectives);
    }
    return objectives;
  },

  delete(mapId, id) {
    const objectives = this.load(mapId).filter(o => o.id !== id);
    this.save(mapId, objectives);
    return objectives;
  }
};

// ========== 工具函数：成环检测 ==========
export function hasCycle(links, candidateLink = null) {
  const allLinks = candidateLink ? [...links, candidateLink] : links;
  const adj = new Map();
  allLinks.forEach(l => {
    if (!adj.has(l.from)) adj.set(l.from, []);
    adj.get(l.from).push(l.to);
  });

  const visited = new Set();
  const stack = new Set();

  function dfs(node) {
    if (stack.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    stack.add(node);
    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      if (dfs(neighbor)) return true;
    }
    stack.delete(node);
    return false;
  }

  for (const node of adj.keys()) {
    if (dfs(node)) return true;
  }
  return false;
}

// ========== LinkStore ==========
export const LinkStore = {
  load(mapId) {
    ensureVersion();
    const data = Storage.getString(STORAGE_KEYS.links(mapId));
    // 无显式保存时返回空数组；默认地图的链接由 ensureVersion 显式初始化
    return data ? safeJsonParse(data, []) : [];
  },

  save(mapId, links) {
    Storage.set(STORAGE_KEYS.links(mapId), links);
  },

  getDefaults() {
    return deepClone(DEFAULT_LINKS);
  },

  hasLink(mapId, from, to) {
    return this.load(mapId).some(l => l.from === from && l.to === to);
  },

  create(mapId, { from, to, type }) {
    if (from === to) throw new Error('不能连接自身');
    const links = this.load(mapId);
    if (links.some(l => l.from === from && l.to === to)) throw new Error('因果链已存在');
    if (hasCycle(links, { from, to, type: type || 'drives' })) throw new Error('不能创建循环依赖');
    links.push({ from, to, type: type || 'drives' });
    this.save(mapId, links);
    return links;
  },

  update(mapId, from, to, updates) {
    const links = this.load(mapId);
    const idx = links.findIndex(l => l.from === from && l.to === to);
    if (idx < 0) throw new Error('因果链不存在');
    const newLink = { ...links[idx], ...updates };
    // 如果端点变化，需避免与已有链接重复
    const newFrom = newLink.from ?? from;
    const newTo = newLink.to ?? to;
    if (newFrom === newTo) throw new Error('不能连接自身');
    const duplicate = links.some((l, i) => i !== idx && l.from === newFrom && l.to === newTo);
    if (duplicate) throw new Error('因果链已存在');
    // 端点或类型变化后重新检查成环
    const others = links.filter((_, i) => i !== idx);
    if (hasCycle(others, newLink)) throw new Error('修改后会产生循环依赖');
    links[idx] = newLink;
    this.save(mapId, links);
    return links;
  },

  delete(mapId, from, to) {
    const links = this.load(mapId).filter(l => !(l.from === from && l.to === to));
    this.save(mapId, links);
    return links;
  },

  deleteByObjective(mapId, objId) {
    const links = this.load(mapId).filter(l => l.from !== objId && l.to !== objId);
    this.save(mapId, links);
    return links;
  }
};

// ========== 导出/聚合 ==========
export function exportMapData(mapId, objectives, links) {
  const map = MapConfigStore.get(mapId);
  return {
    map,
    objectives,
    links,
    exportedAt: new Date().toISOString(),
    version: STORAGE_VERSION
  };
}

// 暴露默认数据，便于测试与初始化
export { DEFAULT_MAPS, DEFAULT_OBJECTIVES, DEFAULT_LINKS };
