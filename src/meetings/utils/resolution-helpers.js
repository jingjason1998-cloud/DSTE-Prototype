/**
 * 决议中心通用辅助函数
 * @module resolution-helpers
 *
 * 纯函数：决议状态流转、数据迁移、跨会议聚合同步
 * 不涉及 DOM 操作
 */

import { Storage, escapeHtml } from '../../lib/utils.js';

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

/**
 * 格式化 ISO 时间为本地可读字符串
 * @param {string} iso
 * @returns {string}
 */
export function formatResolutionTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch (e) { return iso; }
}

/**
 * 过滤决议列表
 * @param {Object[]} resolutions
 * @param {string} filter - 'all' 或状态 key
 * @param {string} search - 小写搜索关键字
 * @returns {Object[]}
 */
export function filterResolutions(resolutions, filter, search) {
  let list = Array.isArray(resolutions) ? resolutions : [];
  if (filter && filter !== 'all') {
    list = list.filter(d => d.status === filter);
  }
  if (search) {
    const kw = search.toLowerCase();
    list = list.filter(d =>
      (d.content || '').toLowerCase().includes(kw) ||
      (d.owner || '').toLowerCase().includes(kw) ||
      (d.sourceMeetingTitle || '').toLowerCase().includes(kw)
    );
  }
  return list;
}

/**
 * 渲染单个决议卡片 HTML
 * @param {Object} d
 * @param {Object} [actionsMap]
 * @returns {string}
 */
export function renderResolutionCard(d, actionsMap = {}) {
  const cfg = getResolutionStatusConfig(d.status);
  const transitions = RESOLUTION_TRANSITIONS[d.status] || [];
  const statusOptions = [d.status, ...transitions]
    .map(s => `<option value="${s}">${getResolutionStatusConfig(s).label}</option>`)
    .join('');
  const statusSelector = transitions.length > 0
    ? `<select id="res-status-${d.id}" onchange="advanceResolution('${d.id}')" style="font-size: 11px; padding: 2px 8px; border-radius: 4px; border: 1px solid ${cfg.color}; background: ${cfg.color}15; color: ${cfg.color}; cursor: pointer; white-space: nowrap; appearance: none; -webkit-appearance: none; padding-right: 18px; background-image: url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22${encodeURIComponent(cfg.color)}%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 4px center;">${statusOptions}</select>`
    : `<span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: ${cfg.color}15; color: ${cfg.color}; white-space: nowrap;">${cfg.label}</span>`;
  const hasLogs = Array.isArray(d.approvalLogs) && d.approvalLogs.length > 0;
  const logsHtml = hasLogs ? `
    <details style="margin-top: 10px;">
      <summary style="font-size: 12px; color: var(--text-secondary); cursor: pointer;">审批日志 (${d.approvalLogs.length})</summary>
      <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 8px;">
        ${d.approvalLogs.map(log => `
          <div style="font-size: 11px; color: var(--text-tertiary); padding: 8px; background: var(--bg-page); border-radius: 4px; border-left: 2px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: var(--text-secondary); font-weight: 500;">${log.action}</span>
              <span>${formatResolutionTime(log.time)}</span>
            </div>
            <div>${escapeHtml(log.user || '当前用户')}${log.comment ? '：' + escapeHtml(log.comment) : ''}</div>
          </div>
        `).join('')}
      </div>
    </details>
  ` : '';
  const progress = d.status === 'approved' && typeof d.progress === 'number' ? `
    <div style="margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-tertiary); margin-bottom: 4px;">
        <span>执行进度</span><span>${d.progress}%</span>
      </div>
      <div style="height: 6px; background: var(--border-light); border-radius: 3px; overflow: hidden;">
        <div style="height: 100%; width: ${d.progress}%; background: var(--primary); border-radius: 3px;"></div>
      </div>
    </div>
  ` : '';
  return `
    <div style="padding: 14px; background: var(--bg-page); border-radius: 8px; margin-bottom: 12px; border-left: 3px solid ${cfg.color};">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 8px;">
        <span style="font-size: 13px; font-weight: 600; color: var(--text-primary); flex: 1;">${escapeHtml(d.content || '')}</span>
        ${statusSelector}
      </div>
      <div style="display: flex; align-items: center; gap: 12px; font-size: 12px; color: var(--text-tertiary); flex-wrap: wrap; margin-bottom: 8px;">
        <span>📅 ${d.deadline || '未设置'}</span>
        <span>👤 ${escapeHtml(d.owner || '待定')}</span>
        ${d.sourceMeetingId ? `<span style="cursor: pointer; color: var(--primary);" onclick="gotoSourceMeeting('${d.sourceMeetingId}')">📋 ${escapeHtml(d.sourceMeetingTitle || '')}</span>` : ''}
        ${d.kmsUrl ? `<a href="${escapeHtml(d.kmsUrl)}" target="_blank" style="color: var(--primary); text-decoration: none;">🔗 KMS</a>` : ''}
      </div>
      ${progress}
      ${logsHtml}
    </div>
  `;
}

/**
 * 渲染决议抽屉完整列表 HTML
 * @param {Object[]} meetings
 * @param {string} filter
 * @param {string} search
 * @returns {string}
 */
export function renderResolutionsList(meetings, filter, search) {
  const actionsMap = {};
  (meetings || []).forEach(m => {
    (m.actions || []).forEach(a => { if (a && a.id) actionsMap[a.id] = a; });
  });
  const allItems = [];
  (meetings || []).forEach(m => {
    (m.decisions || []).forEach(d => {
      const normalized = normalizeResolution(d, m);
      normalized.progress = computeResolutionProgress(normalized, actionsMap);
      allItems.push(normalized);
    });
  });

  const filtered = filterResolutions(allItems, filter, search);
  const stats = computeResolutionStats(allItems);
  const filterButtons = [
    { key: 'all', label: '全部' },
    ...RESOLUTION_STATUSES.map(s => ({ key: s, label: getResolutionStatusConfig(s).label }))
  ];
  const filterPills = filterButtons.map(f => {
    const active = filter === f.key;
    return `<button type="button" onclick="filterDecisions('${f.key}')" style="padding: 4px 10px; font-size: 12px; border: 1px solid ${active ? 'var(--primary)' : 'var(--border-color)'}; border-radius: 4px; background: ${active ? 'var(--primary-light)' : 'var(--bg-page)'}; color: ${active ? 'var(--primary)' : 'var(--text-secondary)'}; cursor: pointer; white-space: nowrap;">${f.label}</button>`;
  }).join('');

  const cards = filtered.map(d => renderResolutionCard(d, actionsMap)).join('');

  return `
    <div style="margin-bottom: 12px;">
      <div style="display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap;">
        ${filterPills}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-secondary); padding: 8px; background: var(--bg-card); border-radius: 6px; border: 1px solid var(--border-light);">
        <span>共 ${stats.total} 项</span>
        <span>已闭环 ${stats.closedCount} 项 (${stats.closureRate}%)</span>
        <span style="color: ${stats.overdueCount > 0 ? 'var(--danger)' : 'var(--text-secondary)'}">逾期 ${stats.overdueCount} 项</span>
      </div>
    </div>
    ${filtered.length === 0 ? '<div style="text-align: center; color: var(--text-tertiary); padding: 40px 0;">🔍 未找到匹配决议</div>' : cards}
  `;
}
