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
