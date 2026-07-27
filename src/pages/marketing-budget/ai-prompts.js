/**
 * 营销线预算执行监控 — AI prompt 构造器
 */

const PACE = 7 / 12;

function fmtNum(v, digits = 1) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return Number(v).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtPct(v, digits = 1) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return (v * 100).toFixed(digits) + '%';
}

export function buildGlobalPrompt(data, tasks, topics, linkages) {
  const rows = data.rows || [];
  const kpiRows = [5, 25, 27, 144, 145, 146];
  const kpis = kpiRows.map(rowId => {
    const r = rows.find(x => x.row === rowId);
    return r ? { name: r.name, ytd: r.ytd, budget: r.budget, rate: r.rate, lyYtd: r.lyYtd, yoy: r.yoy, isRatio: r.isRatio } : null;
  }).filter(Boolean);

  const behindRows = rows.filter(r => r.rate !== null && r.rate !== undefined && r.rate < PACE && !r.isRatio);

  const linkedTaskCount = Object.values(linkages).reduce((sum, l) => sum + (l.taskIds?.length || 0) + (l.subtaskIds?.length || 0), 0);
  const linkedTopicCount = Object.values(linkages).reduce((sum, l) => sum + (l.topicIds?.length || 0), 0);

  const avgTaskProgress = tasks.length
    ? Math.round(tasks.reduce((s, t) => s + (t.progress || 0), 0) / tasks.length)
    : 0;
  const avgTopicProgress = topics.length
    ? Math.round(topics.reduce((s, t) => s + (t.progress || 0), 0) / topics.length)
    : 0;

  return `你是 DSTE（战略管理执行）平台的 AI 战略助手。请基于以下营销线预算执行数据与关联重点工作/业务专题进展，生成一段经营分析解读。

## 当前时间进度
${fmtPct(PACE)}（7/12）

## 核心 KPI 完成情况（单位：${data.unit}）
${kpis.map(k => `- ${k.name}：累计实际 ${k.isRatio ? fmtPct(k.ytd) : fmtNum(k.ytd)}，预算 ${k.isRatio ? fmtPct(k.budget) : fmtNum(k.budget)}，完成率 ${fmtPct(k.rate)}，同比 ${k.yoy > 0 ? '+' : ''}${k.isRatio ? fmtPct(k.yoy) : fmtNum(k.yoy)}`).join('\n')}

## 落后时间进度的科目
${behindRows.length ? behindRows.map(r => `- ${r.name}：完成率 ${fmtPct(r.rate)}，累计实际 ${fmtNum(r.ytd)}，预算 ${fmtNum(r.budget)}`).join('\n') : '无'}

## 已关联重点工作/专题
- 已关联重点工作/子任务：${linkedTaskCount} 项，平均进度 ${avgTaskProgress}%
- 已关联业务专题：${linkedTopicCount} 个，平均进度 ${avgTopicProgress}%

## 输出要求
1. 执行总览（3 句话以内）。
2. 风险预警：列出落后科目及金额缺口。
3. 关联行动项进展：重点工作/专题是否跟得上预算节奏。
4. 建议动作：3-5 条可落地的建议。

请使用中文，财经管理口吻，语言简洁专业。`;
}

export function buildRowPrompt(row, data, linkedTasks, linkedSubtasks, linkedTopics) {
  const behind = row.rate !== null && row.rate !== undefined && row.rate < PACE && !row.isRatio;

  const taskSummary = linkedTasks.length
    ? linkedTasks.map(t => `- ${t.name}（负责人：${t.owner || '—'}，进度 ${t.progress || 0}%，状态：${t.status || '—'}）`).join('\n')
    : '无';

  const subtaskSummary = linkedSubtasks.length
    ? linkedSubtasks.map(s => `- ${s.name}（所属：${s.taskName}，负责人：${s.owner || '—'}，进度 ${s.progress || 0}%）`).join('\n')
    : '无';

  const topicSummary = linkedTopics.length
    ? linkedTopics.map(t => `- ${t.name}（负责人：${t.owner || '—'}，进度 ${t.progress || 0}%，优先级 ${t.priority || '—'}）`).join('\n')
    : '无';

  return `你是 DSTE 战略管理执行平台的 AI 战略助手。请针对以下预算科目进行执行解读。

## 科目信息
- 科目名称：${row.name}
- 当月实际：${row.cur !== null ? fmtNum(row.cur) : '—'} ${data.unit}
- 累计实际：${row.ytd !== null ? fmtNum(row.ytd) : '—'} ${data.unit}
- 年度预算：${row.budget !== null ? fmtNum(row.budget) : '—'} ${data.unit}
- 预算完成率：${fmtPct(row.rate)}
- 上年同期：${row.lyYtd !== null ? fmtNum(row.lyYtd) : '—'} ${data.unit}
- 同比变动：${row.yoy !== null ? (row.yoy > 0 ? '+' : '') + fmtNum(row.yoy) : '—'} ${data.unit}
- 时间进度基准：${fmtPct(PACE)}
- 是否落后时间进度：${behind ? '是' : '否'}

## 关联重点工作
${taskSummary}

## 关联子任务
${subtaskSummary}

## 关联业务专题
${topicSummary}

## 输出要求
1. 科目执行总览（2-3 句话）。
2. 风险/异常点。
3. 关联重点工作/专题进展是否匹配。
4. 建议动作（2-3 条）。

请使用中文，财经管理口吻，简洁专业。`;
}
