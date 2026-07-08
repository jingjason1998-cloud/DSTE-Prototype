/**
 * 经营分析会通用辅助函数
 * @module helpers
 *
 * 纯工具函数，不涉及业务逻辑、DOM 操作或状态管理
 */

import { icon } from '../../../assets/js/icons.js';

/**
 * 根据材料链接获取审核评分
 * @param {string|null} url - 材料链接 URL
 * @param {Storage|null} [storage=globalThis.localStorage] - 存储对象（用于测试注入）
 * @returns {number|null} 历史最高审核得分，无记录时返回 null
 */
export function getMaterialScore(url, storage = globalThis.localStorage) {
  if (!url) return null;
  try {
    const raw = storage?.getItem('dste_review_scores') || '{}';
    const map = JSON.parse(raw);
    return map[url]?.maxScore || null;
  } catch (e) {
    return null;
  }
}

/**
 * 根据分数获取 CSS 颜色变量
 * @param {number|null|undefined} score - 分数（0-100）
 * @returns {string} CSS 颜色变量名
 */
export function getScoreColor(score) {
  if (score === null || score === undefined) return 'var(--text-tertiary)';
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--warning)';
  return 'var(--danger)';
}

/**
 * 根据分数获取等级标签
 * @param {number|null|undefined} score - 分数（0-100）
 * @returns {string} 等级标签文本
 */
export function getScoreLabel(score) {
  if (score === null || score === undefined) return '未评估';
  if (score >= 90) return '卓越';
  if (score >= 80) return '良好';
  if (score >= 60) return '合格';
  return '待改进';
}

/**
 * 从本地存储读取报表资产注册表
 * @param {Storage|null} [storage=globalThis.localStorage] - 存储对象
 * @returns {Object.<string, Object>} 报表 ID 到报表元数据的映射
 */
export function getReportAssets(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem('dste_report_assets') || '{}';
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

/**
 * 保存报表资产注册表到本地存储
 * @param {Object.<string, Object>} assets - 报表资产映射
 * @param {Storage|null} [storage=globalThis.localStorage] - 存储对象
 */
export function saveReportAssets(assets, storage = globalThis.localStorage) {
  try {
    storage?.setItem('dste_report_assets', JSON.stringify(assets));
  } catch (e) {
    // ignore storage errors
  }
}

/**
 * 计算会议会前准备度
 * @param {Object} meeting - 会议对象
 * @param {Object.<string, Object>} [reportAssets={}] - 报表资产注册表
 * @param {Object.<string, Object>} [reviewScores={}] - 材料审核评分映射（url -> { maxScore }）
 * @returns {Object} 准备度结果
 */
/** 议程状态配置 */
export const AGENDA_STATUS_CONFIG = {
  planned: { label: '未开始', color: 'var(--text-tertiary)' },
  completed: { label: '已完成', color: 'var(--success)' },
  postponed: { label: '已顺延', color: 'var(--warning)' }
};

/**
 * 获取议程状态徽章 HTML
 * @param {string} status
 * @returns {string}
 */
export function getAgendaStatusBadge(status) {
  const cfg = AGENDA_STATUS_CONFIG[status] || AGENDA_STATUS_CONFIG.planned;
  return `<span style="padding: 1px 6px; border-radius: 4px; font-size: 10px; background: ${cfg.color}18; color: ${cfg.color}; border: 1px solid ${cfg.color}33;">${cfg.label}</span>`;
}

/**
 * 计算议程完成情况
 * @param {Object} m
 * @returns {{total: number, completed: number, postponed: number}}
 */
export function computeAgendaCompletion(m) {
  const items = m.agenda_items || [];
  const total = items.length;
  const completed = items.filter(a => a && a.status === 'completed').length;
  const postponed = items.filter(a => a && a.status === 'postponed').length;
  return { total, completed, postponed };
}

/**
 * 格式化议程来源提示
 * @param {Object} agenda
 * @param {Object[]} meetings
 * @returns {string}
 */
export function formatAgendaSourceHint(agenda, meetings) {
  if (!agenda || !agenda.carriedFromMeetingId) return '';
  const source = (meetings || []).find(x => x.id === agenda.carriedFromMeetingId);
  const title = source ? (source.title || '上游会议') : '上游会议';
  return `${icon('arrowUp', {size: 14})} 来自 ${title}，已顺延 ${agenda.postponedCount || 0} 次`;
}

/**
 * 获取议程顺延警告文本
 * @param {Object} agenda
 * @returns {string|null}
 */
export function getAgendaPostponeWarning(agenda) {
  if (!agenda || typeof agenda.postponedCount !== 'number') return null;
  if (agenda.postponedCount >= 3) return `${icon('warning', {size: 14})} 已顺延 3 次`;
  if (agenda.postponedCount >= 2) return '已顺延 2 次';
  return null;
}

/** 行动项状态配置 */
export const ACTION_STATUS_CONFIG = {
  pending: { label: '待办', color: 'var(--warning)' },
  in_progress: { label: '进行中', color: 'var(--primary)' },
  completed: { label: '已完成', color: 'var(--success)' },
};

/**
 * 获取行动项状态配置
 * @param {string} status
 * @returns {Object}
 */
export function getActionStatusConfig(status) {
  return ACTION_STATUS_CONFIG[status] || ACTION_STATUS_CONFIG.pending;
}

/**
 * 计算截止日期距离今天的天数
 * @param {string} deadline - YYYY-MM-DD 格式日期
 * @returns {number|null} 正数表示剩余天数，0 表示今天到期，负数表示已逾期，null 表示无截止日期或无效日期
 */
export function getDaysLeft(deadline) {
  if (!deadline) return null;
  try {
    const daysLeft = Math.ceil((new Date(deadline + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000);
    return Number.isNaN(daysLeft) ? null : daysLeft;
  } catch (e) {
    return null;
  }
}

export function computeMeetingReadiness(meeting, reportAssets = {}, reviewScores = {}) {
  const checks = [];

  // 1. 会前报告
  const hasPreReport = Boolean(meeting.pre_report_id?.trim());
  checks.push({
    key: 'pre_report',
    label: '会前报告',
    passed: hasPreReport,
    optional: false,
    detail: hasPreReport ? '已关联' : '未关联会前报告',
  });

  // 2. 议题报表与材料诊断
  const items = meeting.agenda_items || [];
  items.forEach((item, idx) => {
    const title = item.title || `议程${idx + 1}`;

    if (item.data_views && item.data_views.length > 0) {
      const missing = item.data_views.filter(id => !reportAssets[id]);
      const passed = missing.length === 0;
      checks.push({
        key: `topic_report_${idx}`,
        label: `议题报表：${title}`,
        passed,
        optional: false,
        detail: passed
          ? `${item.data_views.length}/${item.data_views.length} 报表已注册`
          : `${missing.length} 个报表未注册`,
      });
    }

    if (item.material_link?.trim()) {
      const info = reviewScores[item.material_link.trim()];
      const score = info?.maxScore ?? null;
      const passed = score !== null && score >= 60;
      checks.push({
        key: `material_${idx}`,
        label: `材料诊断：${title}`,
        passed,
        optional: false,
        detail: score === null ? '未诊断' : `${score}分`,
      });
    }
  });

  // 3. 参会确认（占位，不参与 allPassed）
  checks.push({
    key: 'attendees',
    label: '参会确认',
    passed: false,
    optional: true,
    detail: '待实现',
  });

  const requiredChecks = checks.filter(c => !c.optional);
  const totalCount = requiredChecks.length;
  const passedCount = requiredChecks.filter(c => c.passed).length;
  const allPassed = totalCount > 0 && passedCount === totalCount;
  const percentage = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 100;

  let status = 'pending';
  if (allPassed) status = 'ready';
  else if (percentage >= 60) status = 'in_progress';

  return {
    percentage,
    passedCount,
    totalCount,
    allPassed,
    status,
    checks,
  };
}

/**
 * 计算议程时间槽
 * @param {Object} meeting - 会议对象
 * @returns {{start: string, end: string}[]}
 */
export function computeAgendaTimeSlots(meeting) {
  const items = meeting?.agenda_items || [];
  const start = meeting?.startTime || '09:00';
  const [baseH, baseM] = start.split(':').map(Number);
  let cursor = (baseH || 0) * 60 + (baseM || 0);
  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return items.map((a) => {
    const duration = parseInt(a?.duration) || 0;
    const s = cursor;
    const e = cursor + duration;
    cursor = e;
    return { start: fmt(s), end: fmt(e) };
  });
}
