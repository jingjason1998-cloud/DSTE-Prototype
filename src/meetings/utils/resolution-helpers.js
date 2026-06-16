/**
 * 决议中心通用辅助函数
 * @module resolution-helpers
 *
 * 纯函数：决议状态流转、数据迁移、跨会议聚合同步
 * 不涉及 DOM 操作
 */

import { Storage } from '../../lib/utils.js';

/** 决议状态配置（精简为 3 个状态） */
export const RESOLUTION_STATUS_CONFIG = {
  pending: { label: '待审批', color: 'var(--warning)', badgeClass: 'status-warning' },
  approved: { label: '已通过', color: 'var(--primary)', badgeClass: 'status-info' },
  closed: { label: '已闭环', color: 'var(--success)', badgeClass: 'status-success' },
};

/** 本地存储键 */
export const RESOLUTIONS_STORE_KEY = 'dste_resolutions_v2';

/** 有效状态列表 */
export const RESOLUTION_STATUSES = Object.keys(RESOLUTION_STATUS_CONFIG);

/** 终结态 */
export const TERMINAL_STATUSES = new Set(['closed']);

/** 正常流转路径 */
export const RESOLUTION_TRANSITIONS = {
  pending: ['approved', 'closed'],
  approved: ['closed'],
  closed: [],
};

/**
 * 判断两个状态之间是否允许流转
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export function canTransitionResolutionStatus(from, to) {
  if (!from || !to) return false;
  if (from === to) return true;
  const allowed = RESOLUTION_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/**
 * 获取状态配置
 * @param {string} status
 * @returns {Object}
 */
export function getResolutionStatusConfig(status) {
  return RESOLUTION_STATUS_CONFIG[status] || RESOLUTION_STATUS_CONFIG.pending;
}

/**
 * 生成默认决议对象
 * @param {Object} overrides - 覆盖字段
 * @returns {Object}
 */
export function createDefaultResolution(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: generateResolutionId(),
    content: '',
    owner: '',
    deadline: '',
    status: 'pending',
    sourceMeetingId: '',
    sourceTopicId: '',
    sourceMeetingTitle: '',
    decider: '',
    approvalLogs: [],
    actions: [],
    progress: 0,
    closedAt: null,
    kmsUrl: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function generateResolutionId() {
  return `D${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

/**
 * 旧决议状态迁移到新的精简状态体系
 * @param {string} oldStatus
 * @returns {string}
 */
export function migrateResolutionStatus(oldStatus) {
  switch (oldStatus) {
    case 'pending':
    case 'pending_approval':
    case 'draft':
      return 'pending';
    case 'approved':
    case 'executing':
      return 'approved';
    case 'closed':
    case 'archived':
    case 'rejected':
    case 'vetoed':
    case 'aborted':
    case 'implemented':
      return 'closed';
    default:
      return 'pending';
  }
}

/**
 * 规范化单条决议数据
 * @param {Object} d
 * @param {Object} meeting
 * @returns {Object}
 */
export function normalizeResolution(d, meeting = {}) {
  if (!d || typeof d !== 'object') return createDefaultResolution();
  const actionIds = Array.isArray(d.actions) ? d.actions : [];
  const status = RESOLUTION_STATUSES.includes(d.status)
    ? d.status
    : migrateResolutionStatus(d.status);
  const now = new Date().toISOString();
  return {
    id: d.id || generateResolutionId(),
    content: d.content || '',
    owner: d.owner || '',
    deadline: d.deadline || '',
    status,
    sourceMeetingId: d.sourceMeetingId || meeting.id || '',
    sourceTopicId: d.sourceTopicId || '',
    sourceMeetingTitle: d.sourceMeetingTitle || meeting.title || '',
    decider: d.decider || '',
    approvalLogs: Array.isArray(d.approvalLogs) ? d.approvalLogs : [],
    actions: actionIds,
    progress: typeof d.progress === 'number' ? d.progress : 0,
    closedAt: d.closedAt || null,
    kmsUrl: d.kmsUrl || '',
    createdAt: d.createdAt || now,
    updatedAt: d.updatedAt || now,
  };
}

/**
 * 迁移整个 meetings 数组中的决议数据
 * @param {Object[]} meetings
 * @returns {Object[]}
 */
export function migrateDecisionData(meetings) {
  if (!Array.isArray(meetings)) return [];
  return meetings.map(m => {
    if (!m || !Array.isArray(m.decisions)) return m;
    m.decisions = m.decisions.map(d => normalizeResolution(d, m));
    return m;
  });
}

/**
 * 计算决议执行进度（根据关联行动项）
 * @param {Object} decision
 * @param {Object.<string, Object>} actionsMap - action id -> action 对象
 * @returns {number} 0-100
 */
export function computeResolutionProgress(decision, actionsMap = {}) {
  if (!decision || !Array.isArray(decision.actions) || decision.actions.length === 0) {
    if (decision && decision.status === 'closed') return 100;
    return 0;
  }
  const actions = decision.actions
    .map(id => actionsMap[id])
    .filter(Boolean);
  if (actions.length === 0) return 0;
  const total = actions.reduce((sum, a) => sum + (a.progress || 0), 0);
  return Math.round(total / actions.length);
}

/**
 * 从 meetings 数组提取所有决议，生成以 id 为 key 的聚合视图
 * @param {Object[]} meetings
 * @returns {Object.<string, Object>}
 */
export function buildResolutionsMap(meetings) {
  if (!Array.isArray(meetings)) return {};
  const actionsMap = {};
  meetings.forEach(m => {
    (m.actions || []).forEach(a => {
      if (a && a.id) actionsMap[a.id] = a;
    });
  });

  const map = {};
  meetings.forEach(m => {
    (m.decisions || []).forEach(d => {
      const normalized = normalizeResolution(d, m);
      normalized.progress = computeResolutionProgress(normalized, actionsMap);
      map[normalized.id] = normalized;
    });
  });
  return map;
}

/**
 * 从本地存储读取决议聚合视图
 * @returns {Object.<string, Object>}
 */
export function getResolutionsFromStore() {
  try {
    return Storage.get(RESOLUTIONS_STORE_KEY, {});
  } catch (e) {
    return {};
  }
}

/**
 * 保存决议聚合视图到本地存储
 * @param {Object.<string, Object>} map
 */
export function saveResolutionsToStore(map) {
  try {
    Storage.set(RESOLUTIONS_STORE_KEY, map || {});
  } catch (e) {
    console.warn('saveResolutionsToStore failed:', e);
  }
}

/**
 * 同步 meetings 中的决议到聚合存储
 * @param {Object[]} meetings
 */
export function syncResolutionsToStore(meetings) {
  const map = buildResolutionsMap(meetings);
  saveResolutionsToStore(map);
  return map;
}

/**
 * 获取决议列表（数组形式）
 * @param {Object.<string, Object>} [map]
 * @returns {Object[]}
 */
export function getResolutionList(map) {
  const data = map || getResolutionsFromStore();
  return Object.values(data);
}

/**
 * 统计决议中心 Dashboard 数据
 * @param {Object[]} resolutions
 * @returns {Object}
 */
export function computeResolutionStats(resolutions) {
  const list = Array.isArray(resolutions) ? resolutions : [];
  const total = list.length;
  const statusCounts = {};
  RESOLUTION_STATUSES.forEach(s => { statusCounts[s] = 0; });
  list.forEach(r => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });
  const closedCount = statusCounts.closed;
  const closureRate = total > 0 ? Math.round((closedCount / total) * 100) : 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueCount = list.filter(r => {
    if (!r.deadline || r.status === 'closed') return false;
    const d = new Date(r.deadline);
    return d < today;
  }).length;
  return {
    total,
    statusCounts,
    closedCount,
    closureRate,
    overdueCount,
  };
}

/**
 * 添加审批记录
 * @param {Object} decision
 * @param {string} action - pending | approved | closed
 * @param {string} user
 * @param {string} comment
 */
export function addApprovalLog(decision, action, user, comment = '') {
  if (!decision) return;
  if (!Array.isArray(decision.approvalLogs)) decision.approvalLogs = [];
  decision.approvalLogs.push({
    id: `al_${Date.now()}`,
    action,
    user: user || '当前用户',
    comment: comment || '',
    time: new Date().toISOString(),
  });
  decision.updatedAt = new Date().toISOString();
}

/**
 * 推进决议状态
 * @param {Object} decision
 * @param {string} newStatus
 * @param {string} user
 * @param {string} comment
 * @returns {{success: boolean, error?: string}}
 */
export function advanceResolutionStatus(decision, newStatus, user, comment = '') {
  if (!decision) return { success: false, error: '决议不存在' };
  if (!RESOLUTION_STATUSES.includes(newStatus)) {
    return { success: false, error: '无效状态' };
  }
  if (!canTransitionResolutionStatus(decision.status, newStatus)) {
    return { success: false, error: `不允许从 ${decision.status} 流转到 ${newStatus}` };
  }
  const now = new Date().toISOString();
  decision.status = newStatus;
  decision.updatedAt = now;
  if (newStatus === 'closed') decision.closedAt = now;
  addApprovalLog(decision, newStatus, user, comment);
  return { success: true };
}
