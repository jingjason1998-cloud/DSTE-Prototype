/**
 * 会议效果评估 - 自动评分算法
 * @module scoring
 *
 * 基于会议数据自动计算四维度评分：
 * - 会前准备：材料准时率 + 预评审完成度
 * - 会议讨论：议程完整性、纪要完成度
 * - 决议质量：决议及时率、KMS关联率、审批通过率
 * - 执行落地：行动闭环率、追踪状态
 */

/**
 * 根据会议数据计算 AI 推荐评分
 * @param {Object} meeting - 会议对象
 * @param {Object} meeting.pipeline - 流程状态
 * @param {Object} meeting.metrics - 效率指标
 * @param {Array} meeting.decisions - 决议列表
 * @param {Array} meeting.actions - 行动项列表
 * @param {Array} meeting.agenda_items - 议程列表
 * @param {boolean} meeting.hasMinutes - 是否有纪要
 * @param {string} meeting.minutesStatus - 纪要状态
 * @returns {Object} 评分结果
 * @returns {number} returns.overallScore - 综合评分（0-100）
 * @returns {Object} returns.dimensions - 四维度评分
 * @returns {number} returns.dimensions.preparation - 会前准备（0-100）
 * @returns {number} returns.dimensions.discussion - 会议讨论（0-100）
 * @returns {number} returns.dimensions.decision - 决议质量（0-100）
 * @returns {number} returns.dimensions.execution - 执行落地（0-100）
 * @returns {string[]} returns.feedback - 系统反馈标签
 * @returns {boolean} returns.auto - 是否为系统自动推荐
 */
export function calculateAutoScore(meeting) {
  const p = meeting.pipeline || {};
  const m = meeting.metrics || {};
  const decisions = meeting.decisions || [];

  // 会前准备：材料准时率 * 0.8 + 预评审完成 20分
  const preparation = Math.min(100, Math.round(
    (m.materialTimeliness || 0) * 0.8 + (p.preReviewDone ? 20 : 0)
  ));

  // 会议讨论：基础60分 + 各项加成
  let discussion = 60;
  if (p.meetingHeld) discussion += 10;
  if ((meeting.agenda_items || []).length > 0) discussion += 10;
  if (meeting.hasMinutes) discussion += 10;
  if (meeting.minutesStatus === 'final') discussion += 10;

  // 决议质量：决议及时率 * 0.6 + KMS关联率 * 20 + 审批通过率 * 20
  const totalDecisions = decisions.length;
  const withKms = totalDecisions > 0 ? decisions.filter(d => d.kmsUrl).length / totalDecisions : 0;
  const approvedRate = totalDecisions > 0 ? decisions.filter(d => d.status === 'approved' || d.status === 'implemented').length / totalDecisions : 0;
  const decision = Math.min(100, Math.round(
    (m.resolutionTimeliness || 0) * 0.6 + withKms * 20 + approvedRate * 20
  ));

  // 执行落地：行动闭环率 * 0.8 + 追踪完成 20分
  const execution = Math.min(100, Math.round(
    (m.actionClosure || 0) * 0.8 + (p.actionsTracked ? 20 : 0)
  ));

  const overall = Math.round((preparation + discussion + decision + execution) / 4);

  // 生成系统反馈标签
  const autoFeedback = [];
  if (preparation >= 85) autoFeedback.push('材料充分');
  if (preparation < 60) autoFeedback.push('数据不足');
  if (discussion >= 85) autoFeedback.push('议程合理');
  if (discussion < 60) autoFeedback.push('时间失控');
  if (decision >= 85) autoFeedback.push('决议明确');
  if (decision < 60) autoFeedback.push('决议模糊');
  if (execution >= 85) autoFeedback.push('闭环到位');
  if (execution < 60) autoFeedback.push('缺乏跟进');

  return {
    overallScore: overall,
    dimensions: { preparation, discussion, decision, execution },
    feedback: autoFeedback,
    auto: true,
  };
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
