/**
 * 需求管理中心 — 数据层
 * 使用 Repository 封装 localStorage，提供 CRUD、mock 数据、编号生成
 */

import { Storage } from '../../lib/utils.js';
import { Repository } from '../../lib/repository.js';

export const STORAGE_KEY = 'dste_requirements_v1';

export const REQUIREMENT_TYPES = {
  FEATURE: '功能需求',
  OPTIMIZATION: '优化改进',
  BUG: '缺陷修复',
  TECH_DEBT: '技术债',
  COMPETITOR: '竞品对标',
  SECURITY: '安全合规',
  OTHER: '其他'
};

export const REQUIREMENT_SOURCES = {
  USER_FEEDBACK: '用户反馈',
  INTERNAL_USER: '内部用户',
  PRODUCT_PLAN: '产品规划',
  TECH_TEAM: '技术团队',
  COMPETITOR: '竞品分析',
  VERSION_AUDIT: '版本审计',
  DATA_DRIVEN: '数据驱动',
  OTHER: '其他'
};

export const REQUIREMENT_STATUS = {
  COLLECTED: '已收集',
  ANALYZING: '分析中',
  PLANNED: '已规划',
  DEVELOPING: '开发中',
  PENDING_RELEASE: '待发布',
  RELEASED: '已发布',
  VERIFIED: '已验证',
  CLOSED: '已关闭',
  REJECTED: '已拒绝',
  SUSPENDED: '已挂起'
};

export const DSTE_MODULES = {
  dashboard: '驾驶舱',
  sp: '战略制定 (SP)',
  bp: '战略解码 (BP)',
  exe: '战略执行 (Execute)',
  rev: '战略评估 (Review)',
  ai: 'AI 战略助手',
  admin: '系统管理'
};

export const STATUS_TRANSITIONS = {
  COLLECTED: ['ANALYZING'],
  ANALYZING: ['PLANNED', 'REJECTED', 'SUSPENDED'],
  PLANNED: ['DEVELOPING'],
  DEVELOPING: ['PENDING_RELEASE'],
  PENDING_RELEASE: ['RELEASED'],
  RELEASED: ['VERIFIED'],
  VERIFIED: ['CLOSED'],
  REJECTED: ['COLLECTED'],
  SUSPENDED: ['COLLECTED']
};

const repo = new Repository('requirements', {
  storageKey: STORAGE_KEY,
  schema: 'array',
  version: 1
});

let _cache = null;

export function loadRequirements() {
  if (_cache) return [..._cache];
  _cache = repo.get();
  if (!_cache.length) {
    _cache = getMockRequirements();
    repo.set(_cache);
  }
  return [..._cache];
}

export function saveRequirements(data) {
  _cache = data;
  const ok = repo.set(data);
  if (!ok) {
    throw new Error('保存需求数据失败，可能是存储空间不足');
  }
}

export function getRequirementById(id) {
  return loadRequirements().find(r => r.id === id) || null;
}

export function createRequirement(data) {
  const requirements = loadRequirements();
  const now = new Date().toISOString();
  const reqCode = generateReqCode(requirements);
  const requirement = {
    id: `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    reqCode,
    title: data.title || '',
    description: data.description || '',
    type: data.type || 'OTHER',
    source: data.source || 'OTHER',
    priority: data.priority || 'P3',
    status: 'COLLECTED',
    affectedModules: Array.isArray(data.affectedModules) ? data.affectedModules : [],
    targetVersion: data.targetVersion || '',
    roadmapPhase: data.roadmapPhase || '',
    productOwner: data.productOwner || '',
    techOwner: data.techOwner || '',
    reporter: data.reporter || getCurrentUser(),
    reporterDept: data.reporterDept || '',
    problem: data.problem || '',
    value: data.value || '',
    acceptanceCriteria: data.acceptanceCriteria || '',
    businessValue: data.businessValue || null,
    technicalEffort: data.technicalEffort || null,
    urgency: data.urgency || null,
    devTaskLink: data.devTaskLink || '',
    releaseNote: data.releaseNote || '',
    verifiedBy: '',
    verifiedAt: null,
    attachments: [],
    reviews: [],
    createdBy: getCurrentUser(),
    createdAt: now,
    updatedAt: now,
    closedAt: null
  };
  requirements.unshift(requirement);
  saveRequirements(requirements);
  return requirement;
}

export function updateRequirement(id, data) {
  const requirements = loadRequirements();
  const idx = requirements.findIndex(r => r.id === id);
  if (idx === -1) return null;

  requirements[idx] = {
    ...requirements[idx],
    ...data,
    affectedModules: Array.isArray(data.affectedModules)
      ? data.affectedModules
      : requirements[idx].affectedModules,
    updatedAt: new Date().toISOString()
  };
  saveRequirements(requirements);
  return requirements[idx];
}

export function deleteRequirement(id) {
  const requirements = loadRequirements();
  const filtered = requirements.filter(r => r.id !== id);
  if (filtered.length === requirements.length) return false;
  saveRequirements(filtered);
  return true;
}

export function addReview(id, action, comment, reviewer = getCurrentUser()) {
  const requirements = loadRequirements();
  const req = requirements.find(r => r.id === id);
  if (!req) return null;

  req.reviews = req.reviews || [];
  req.reviews.unshift({
    reviewer,
    action,
    comment: comment || '',
    createdAt: new Date().toISOString()
  });
  req.updatedAt = new Date().toISOString();
  saveRequirements(requirements);
  return req;
}

export function transitionStatus(id, newStatus, comment = '') {
  const req = getRequirementById(id);
  if (!req) return null;

  const allowed = STATUS_TRANSITIONS[req.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`状态流转非法：${REQUIREMENT_STATUS[req.status]} → ${REQUIREMENT_STATUS[newStatus]}`);
  }

  const now = new Date().toISOString();
  const updates = { status: newStatus, updatedAt: now };
  if (newStatus === 'CLOSED') {
    updates.closedAt = now;
  }

  const updated = updateRequirement(id, updates);
  addReview(id, newStatus, comment);
  return updated;
}

export function generateReqCode(requirements) {
  const year = new Date().getFullYear();
  const prefix = `REQ-${year}-`;
  const existing = requirements
    .map(r => r.reqCode)
    .filter(code => code && code.startsWith(prefix))
    .map(code => parseInt(code.slice(prefix.length), 10) || 0);
  const max = existing.length ? Math.max(...existing) : 0;
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export function getCurrentUser() {
  return sessionStorage.getItem('dste-user')
    || (typeof DSTE !== 'undefined' ? DSTE.Storage.getString('dste-user') : null)
    || '产品管理员';
}

export function getMockRequirements() {
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();

  return [
    {
      id: 'req_sample_001',
      reqCode: 'REQ-2026-001',
      title: '优化战略地图画布缩放交互',
      description: '当前战略地图画布在节点较多时缩放卡顿，需要优化渲染性能。',
      type: 'OPTIMIZATION',
      source: 'USER_FEEDBACK',
      priority: 'P1',
      status: 'ANALYZING',
      affectedModules: ['sp'],
      targetVersion: '',
      roadmapPhase: 'Q3-体验优化',
      productOwner: '产品经理小王',
      techOwner: '前端负责人',
      reporter: '张总',
      reporterDept: '战略运营部',
      problem: '画布缩放时帧率低，影响高管查看体验',
      value: '提升战略地图使用体验，支撑高管汇报场景',
      acceptanceCriteria: '画布缩放流畅度达到 60fps，100 个节点无卡顿',
      businessValue: 4,
      technicalEffort: 3,
      urgency: 3,
      devTaskLink: '',
      releaseNote: '',
      verifiedBy: '',
      verifiedAt: null,
      attachments: [],
      reviews: [{
        reviewer: '产品经理小王',
        action: 'ANALYZING',
        comment: '已确认问题，准备安排技术评估',
        createdAt: yesterday
      }],
      createdBy: '张总',
      createdAt: lastWeek,
      updatedAt: yesterday,
      closedAt: null
    },
    {
      id: 'req_sample_002',
      reqCode: 'REQ-2026-002',
      title: '年度经营计划支持批量导入 KPI',
      description: '支持从 Excel 批量导入 KPI 指标到年度经营计划。',
      type: 'FEATURE',
      source: 'INTERNAL_USER',
      priority: 'P0',
      status: 'PLANNED',
      affectedModules: ['bp'],
      targetVersion: 'v0.6.0',
      roadmapPhase: 'Q3-BP增强',
      productOwner: '产品经理小李',
      techOwner: '后端负责人',
      reporter: '陈总监',
      reporterDept: '财务部',
      problem: '手工录入 KPI 效率低，容易出错',
      value: '大幅提升年度经营计划编制效率',
      acceptanceCriteria: '支持 500 行以内 Excel 批量导入，错误行可导出',
      businessValue: 5,
      technicalEffort: 3,
      urgency: 4,
      devTaskLink: '',
      releaseNote: '',
      verifiedBy: '',
      verifiedAt: null,
      attachments: [],
      reviews: [{
        reviewer: '产品经理小李',
        action: 'PLANNED',
        comment: '已排入 v0.6.0',
        createdAt: yesterday
      }],
      createdBy: '陈总监',
      createdAt: lastWeek,
      updatedAt: yesterday,
      closedAt: null
    },
    {
      id: 'req_sample_003',
      reqCode: 'REQ-2026-003',
      title: '修复经营分析会材料审核评分不显示问题',
      description: ' reviewer.html 中某些场景下审核评分列显示为空。',
      type: 'BUG',
      source: 'VERSION_AUDIT',
      priority: 'P0',
      status: 'DEVELOPING',
      affectedModules: ['exe', 'admin'],
      targetVersion: 'v0.5.6',
      roadmapPhase: 'Q2-稳定性',
      productOwner: '产品经理小王',
      techOwner: '前端负责人',
      reporter: '测试工程师',
      reporterDept: '质量部',
      problem: '审核评分在某些报告格式下解析失败',
      value: '保证会议材料审核功能可用性',
      acceptanceCriteria: '覆盖 markdown 表格、HTML 标签包裹、纯文本列表三种格式',
      businessValue: 5,
      technicalEffort: 2,
      urgency: 5,
      devTaskLink: '',
      releaseNote: '',
      verifiedBy: '',
      verifiedAt: null,
      attachments: [],
      reviews: [{
        reviewer: '产品经理小王',
        action: 'DEVELOPING',
        comment: '已分配给前端负责人修复',
        createdAt: now
      }],
      createdBy: '测试工程师',
      createdAt: yesterday,
      updatedAt: now,
      closedAt: null
    },
    {
      id: 'req_sample_004',
      reqCode: 'REQ-2026-004',
      title: 'AI 战略助手支持自然语言查询 RoadMap',
      description: '用户可以通过 AI 助手询问 RoadMap 进展。',
      type: 'FEATURE',
      source: 'PRODUCT_PLAN',
      priority: 'P2',
      status: 'COLLECTED',
      affectedModules: ['ai', 'dashboard'],
      targetVersion: '',
      roadmapPhase: '',
      productOwner: '',
      techOwner: '',
      reporter: '产品总监',
      reporterDept: '产品部',
      problem: '高管无法快速了解 RoadMap 整体进展',
      value: '提升 AI 助手价值，支撑管理层问询',
      acceptanceCriteria: 'AI 能准确回答 RoadMap 各阶段状态和阻塞点',
      businessValue: 3,
      technicalEffort: null,
      urgency: 2,
      devTaskLink: '',
      releaseNote: '',
      verifiedBy: '',
      verifiedAt: null,
      attachments: [],
      reviews: [],
      createdBy: '产品总监',
      createdAt: now,
      updatedAt: now,
      closedAt: null
    }
  ];
}

export function clearCache() {
  _cache = null;
}
