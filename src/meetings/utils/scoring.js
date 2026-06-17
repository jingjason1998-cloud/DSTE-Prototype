/**
 * 会议效果评估 - 自动评分算法（v2.0 三段式模型）
 * @module scoring
 *
 * 基于会议数据自动计算三阶段评分：
 * - 会前（35 分）：会议材料完整、议程覆盖原则、会议材料评分
 * - 会中（30 分）：每个议程有效讨论、参会人员参与度、会议时间控制
 * - 会后（35 分）：有效决议&待办、会议评分及时性
 * - 会议级扣分：议程顺延 -5 分
 */

const REQUIRED_AGENDA_TYPES = [
  'goal_management',
  'budget_finance',
  'key_task_management',
  'business_special',
];

function round1(value) {
  return Math.round(value * 10) / 10;
}

/**
 * 根据会议数据计算 AI 推荐评分
 * @param {Object} meeting - 会议对象
 * @param {string} [evalAtISO] - 评估时间 ISO 字符串，用于计算评分及时性
 * @param {Object} [reviewScores] - 材料评分映射 { url: { maxScore: number } }
 * @returns {Object} 评分结果
 * @returns {number} returns.overallScore - 综合评分（0-100）
 * @returns {Object} returns.dimensions - 三阶段评分
 * @returns {number} returns.dimensions.before - 会前（0-35）
 * @returns {number} returns.dimensions.during - 会中（0-30）
 * @returns {number} returns.dimensions.after - 会后（0-35）
 * @returns {Object} returns.subScores - 九子项得分
 * @returns {string[]} returns.feedback - 系统反馈标签
 * @returns {boolean} returns.auto - 是否为系统自动推荐
 */
export function calculateAutoScore(meeting, evalAtISO, reviewScores = {}) {
  const agendaItems = meeting.agenda_items || [];
  const decisions = meeting.decisions || [];
  const actions = meeting.actions || [];
  const pipeline = meeting.pipeline || {};
  const meetingHeld = !!pipeline.meetingHeld;
  const hasMinutes = !!meeting.hasMinutes;

  // ═══════════════════════════════════════════════════════════════
  // 会前 35 分
  // ═══════════════════════════════════════════════════════════════

  const totalAgenda = Math.max(1, agendaItems.length);
  const completeAgendaCount = agendaItems.filter(
    (a) =>
      a &&
      (a.material_link || '').trim() &&
      (a.title || '').trim() &&
      (a.duration || 0) > 0
  ).length;
  const materialCompleteness = round1((completeAgendaCount / totalAgenda) * 7);

  const presentTypes = new Set(agendaItems.map((a) => a.type).filter(Boolean));
  const requiredHitCount = REQUIRED_AGENDA_TYPES.filter((t) => presentTypes.has(t)).length;
  const agendaCoverage = round1((requiredHitCount / REQUIRED_AGENDA_TYPES.length) * 10.5);

  const materialReviewScore = round1(computeMaterialReviewScore(agendaItems, reviewScores));

  const before = materialCompleteness + agendaCoverage + materialReviewScore;

  // ═══════════════════════════════════════════════════════════════
  // 会中 30 分
  // ═══════════════════════════════════════════════════════════════

  let effectiveDiscussion = 0;
  let participation = 0;
  let timeControl = 0;

  if (meetingHeld) {
    effectiveDiscussion += 6;
    if (hasMinutes) effectiveDiscussion += 3;
    const allAgendasHaveOwner =
      agendaItems.length > 0 && agendaItems.every((a) => (a.owner || '').trim());
    if (allAgendasHaveOwner) effectiveDiscussion += 3;

    participation += 6;
    const uniqueParticipants = new Set();
    if ((meeting.host || '').trim()) uniqueParticipants.add(meeting.host.trim());
    if ((meeting.recorder || '').trim()) uniqueParticipants.add(meeting.recorder.trim());
    agendaItems.forEach((a) => {
      if ((a.owner || '').trim()) uniqueParticipants.add(a.owner.trim());
    });
    const participantAdd = Math.min(6, uniqueParticipants.size * 1.5);
    participation += participantAdd;

    const plannedMinutes = agendaItems.reduce((s, a) => s + (a.duration || 0), 0);
    timeControl = plannedMinutes > 0 && plannedMinutes <= 180 ? 6 : 3;
  }

  effectiveDiscussion = round1(effectiveDiscussion);
  participation = round1(participation);
  timeControl = round1(timeControl);
  const during = effectiveDiscussion + participation + timeControl;

  // ═══════════════════════════════════════════════════════════════
  // 会后 35 分
  // ═══════════════════════════════════════════════════════════════

  const resolutionAndAction = round1(Math.min(30, (decisions.length + actions.length) * 5));
  const timeliness = isSameDay(meeting.date, evalAtISO) ? 5 : 0;
  const after = resolutionAndAction + timeliness;

  // ═══════════════════════════════════════════════════════════════
  // 会议级扣分
  // ═══════════════════════════════════════════════════════════════

  // 议程顺延扣分：任一 agenda 状态为 postponed 即扣 5 分；同时兼容旧数据的 hasPostponedAgenda 字段
  const hasPostponedAgenda =
    (meeting.agenda_items || []).some((a) => a && a.status === 'postponed') ||
    !!meeting.hasPostponedAgenda;
  const postponementDeduction = hasPostponedAgenda ? -5 : 0;

  // ═══════════════════════════════════════════════════════════════
  // 汇总
  // ═══════════════════════════════════════════════════════════════

  const rawOverall = before + during + after + postponementDeduction;
  const overallScore = Math.max(0, Math.min(100, Math.round(rawOverall)));

  const feedback = generateFeedback(before, during, after);

  return {
    overallScore,
    dimensions: {
      before,
      during,
      after,
    },
    subScores: {
      materialCompleteness,
      agendaCoverage,
      materialReviewScore,
      effectiveDiscussion,
      participation,
      timeControl,
      resolutionAndAction,
      timeliness,
      postponementDeduction,
    },
    feedback,
    auto: true,
  };
}

/**
 * 计算会议材料评分子项
 * @param {Array} agendaItems - 议程列表
 * @param {Object} reviewScores - 材料评分映射
 * @returns {number} 0-17.5
 */
function computeMaterialReviewScore(agendaItems, reviewScores) {
  const scoredItems = [];
  const passItems = [];

  agendaItems.forEach((a) => {
    const url = (a.material_link || '').trim();
    if (!url) return;

    const info = reviewScores[url];
    if (info && typeof info.maxScore === 'number') {
      scoredItems.push(info.maxScore);
      passItems.push(info.maxScore >= 60 ? 1 : 0);
    } else {
      passItems.push(0);
    }
  });

  if (scoredItems.length > 0) {
    const avg = scoredItems.reduce((s, v) => s + v, 0) / scoredItems.length;
    return (avg / 100) * 17.5;
  }

  // 无评分时，按材料诊断通过率折算
  if (passItems.length > 0) {
    const passRate = passItems.reduce((s, v) => s + v, 0) / passItems.length;
    return passRate * 17.5;
  }

  return 0;
}

/**
 * 判断两个日期是否为同一天
 * @param {string} meetingDate - 会议日期，如 '2026-06-15'
 * @param {string} [evalAtISO] - 评估时间 ISO 字符串
 * @returns {boolean}
 */
function isSameDay(meetingDate, evalAtISO) {
  if (!meetingDate || !evalAtISO) return false;
  const evalDay = evalAtISO.slice(0, 10);
  return meetingDate.slice(0, 10) === evalDay;
}

/**
 * 生成系统反馈标签
 * @param {number} before - 会前得分
 * @param {number} during - 会中得分
 * @param {number} after - 会后得分
 * @returns {string[]}
 */
function generateFeedback(before, during, after) {
  const tags = [];
  if (before >= 30) tags.push('材料充分');
  if (during >= 25) tags.push('讨论有效');
  if (after >= 30) tags.push('闭环到位');
  if (before < 21) tags.push('数据不足');
  if (during < 18) tags.push('时间失控');
  if (after < 21) tags.push('缺乏跟进');
  return tags;
}

/**
 * 根据分数获取颜色
 * @param {number} score - 分数（0-100）
 * @returns {string} CSS 颜色值
 */
export function getScoreColor(score) {
  if (score >= 90) return 'var(--success)';
  if (score >= 75) return 'var(--primary)';
  if (score >= 60) return 'var(--warning)';
  return 'var(--danger)';
}

/**
 * 根据分数获取标签
 * @param {number} score - 分数（0-100）
 * @returns {string} 等级标签
 */
export function getScoreLabel(score) {
  if (score >= 90) return '优秀';
  if (score >= 75) return '良好';
  if (score >= 60) return '及格';
  return '待改进';
}
