/**
 * 经营分析会通用辅助函数
 * @module helpers
 *
 * 纯工具函数，不涉及业务逻辑、DOM 操作或状态管理
 */

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
