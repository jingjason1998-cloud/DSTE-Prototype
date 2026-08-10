/**
 * 问题相关的 AI 上下文选择器
 *
 * 解决「把所有业务上下文一次性塞进 system prompt」导致 token 浪费、
 * 模型注意力分散的问题。根据用户问题，只选择最相关的上下文节。
 */

const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '你', '他', '她', '它', '我们', '你们', '他们',
  '这', '那', '这些', '那些', '一个', '一些', '什么', '怎么', '为什么', '如何',
  '请', '把', '被', '让', '给', '向', '往', '从', '到', '为', '以', '及', '与',
  '和', '或', '但', '而', '如果', '因为', '所以', '虽然', '但是', '呢', '吗', '吧',
  '啊', '哦', '嗯', '了', '着', '过', '也', '就', '都', '很', '又', '还', '只',
  '会', '能', '要', '想', '应该', '可以', '需要', '可能', '应该', '得', '地',
]);

function tokenize(text) {
  if (!text) return [];
  const cleaned = String(text)
    .toLowerCase()
    .replace(/[^一-龥a-z0-9\s]/g, ' ');
  const tokens = cleaned.split(/\s+/).filter((t) => t.length >= 2);
  return [...new Set(tokens.filter((t) => !STOP_WORDS.has(t)))];
}

function sectionToText(key, value) {
  if (key === 'summary') {
    const s = value || {};
    return [
      '数据总览',
      `会议 ${s.meetingCount || 0} 条`,
      `重点工作 ${s.taskCount || 0} 项`,
      `KPI ${s.kpiCount || 0} 项`,
      `专题 ${s.topicCount || 0} 个`,
      `决议 ${s.resolutionCount || 0} 条`,
      `员工 ${s.employeeCount || 0} 人`,
    ].join(' ');
  }

  if (!Array.isArray(value) || value.length === 0) return '';

  return value
    .slice(0, 20)
    .map((item) => Object.entries(item)
      .filter(([k]) => !['id'].includes(k))
      .map(([k, v]) => `${k}:${v}`)
      .join(' '))
    .join('\n');
}

function scoreSection(questionTokens, sectionText) {
  if (!sectionText || questionTokens.length === 0) return 0;
  const sectionTokens = tokenize(sectionText);
  let score = 0;
  for (const qt of questionTokens) {
    // 完全匹配
    if (sectionTokens.includes(qt)) score += 1;
    // 子串匹配（适用于中文词组）
    else if (sectionText.toLowerCase().includes(qt)) score += 0.5;
  }
  return score;
}

/**
 * 根据问题从完整上下文中选择最相关的部分。
 * @param {string} question
 * @param {Object} fullContext
 * @param {number} [options.maxChars=4000]
 * @returns {string}
 */
export function selectContextForQuestion(question, fullContext, { maxChars = 4000 } = {}) {
  if (!fullContext || typeof fullContext !== 'object') return '';

  const questionTokens = tokenize(question);
  const sections = [
    { key: 'summary', value: fullContext.summary, priority: 100 },
    { key: 'kpis', value: fullContext.kpis, priority: 80 },
    { key: 'tasks', value: fullContext.tasks, priority: 80 },
    { key: 'meetings', value: fullContext.meetings, priority: 70 },
    { key: 'resolutions', value: fullContext.resolutions, priority: 70 },
    { key: 'topics', value: fullContext.topics, priority: 60 },
    { key: 'annualPlan', value: fullContext.annualPlan, priority: 50 },
    { key: 'milestones', value: fullContext.milestones, priority: 40 },
    { key: 'progressRecords', value: fullContext.progressRecords, priority: 40 },
    { key: 'reviewScores', value: fullContext.reviewScores, priority: 30 },
    { key: 'employees', value: fullContext.employees, priority: 20 },
  ];

  const scored = sections
    .map((sec) => {
      const text = sectionToText(sec.key, sec.value);
      return {
        ...sec,
        text,
        score: scoreSection(questionTokens, text) + sec.priority * 0.01,
      };
    })
    .filter((sec) => sec.text.length > 0)
    .sort((a, b) => b.score - a.score);

  const parts = [];
  let used = 0;

  // 必须包含 summary
  const summarySec = scored.find((s) => s.key === 'summary');
  if (summarySec) {
    parts.push(`## 数据总览\n${summarySec.text}`);
    used += parts[parts.length - 1].length;
  }

  for (const sec of scored) {
    if (sec.key === 'summary') continue;

    const header = `\n## ${sec.key}`;
    const content = `\n${sec.text}`;
    const total = header.length + content.length;

    if (used + total > maxChars) {
      // 如果还能放下摘要，截断到 maxChars
      const remaining = maxChars - used - header.length - 2;
      if (remaining >= 30) {
        parts.push(`${header}\n${sec.text.slice(0, remaining)}…[已截断]`);
      }
      break;
    }

    parts.push(`${header}${content}`);
    used += total;
  }

  return parts.join('\n');
}

export default { selectContextForQuestion };
