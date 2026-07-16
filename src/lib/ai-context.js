/**
 * DSTE AI 业务上下文构造器
 *
 * 从本地存储中读取业务数据，构造标准 AIContext，让 AI 的回答基于真实企业上下文。
 */

import { Storage } from './utils.js';

// ========== 页面级 AI 上下文提供者注册表 ==========

const aiContextProviders = new Map();

/**
 * 注册某个页面的 AI 上下文提供者
 * @param {string} pageId - 页面 ID，如 'sp/strategy-topics'
 * @param {Object} provider
 * @param {string} provider.name - 页面名称
 * @param {Function} provider.getContext - 返回该页上下文对象
 * @param {Function} [provider.getSuggestions] - 返回该页快捷问题数组
 */
export function registerAiContextProvider(pageId, provider) {
  if (!pageId || typeof provider?.getContext !== 'function') {
    console.warn('[AI Context] Invalid provider for pageId:', pageId);
    return;
  }
  aiContextProviders.set(pageId, {
    name: provider.name || pageId,
    getContext: provider.getContext,
    getSuggestions: typeof provider.getSuggestions === 'function' ? provider.getSuggestions : () => [],
  });
}

/**
 * 获取某个页面的 AI 上下文提供者
 * @param {string} pageId
 * @returns {Object|null}
 */
export function getAiContextProvider(pageId) {
  return aiContextProviders.get(pageId) || null;
}

/**
 * 列出所有已注册的 AI 上下文提供者
 * @returns {Array<{pageId:string,name:string}>}
 */
export function listAiContextProviders() {
  return Array.from(aiContextProviders.entries()).map(([pageId, p]) => ({ pageId, name: p.name }));
}

/**
 * 构建当前页面的上下文摘要文本
 * @param {string} pageId
 * @param {Object} [options]
 */
export function buildPageContext(pageId, options = {}) {
  const provider = getAiContextProvider(pageId);
  if (!provider) {
    const globalCtx = gatherBusinessContext(options);
    return {
      pageId,
      pageName: '全局视图',
      context: globalCtx,
      text: formatContextForAI(globalCtx),
      suggestions: [],
    };
  }

  const ctx = provider.getContext(options);
  return {
    pageId,
    pageName: provider.name,
    context: ctx,
    text: typeof ctx === 'string' ? ctx : formatContextForAI(ctx),
    suggestions: provider.getSuggestions(),
  };
}

/**
 * 构建系统提示词
 */
export function buildSystemPrompt() {
  return `你是 DSTE（战略管理执行）平台的 AI 战略助手，名字叫「DSTE 智脑」。

你的职责：
- 帮助高管、BP/SP 负责人、会议组织者理解经营数据、发现问题、生成报告草稿。
- 回答必须基于用户提供的业务上下文，不确定时明确说明。
- 所有结论尽量给出数据来源（如「来源：OMP KPI #KPI-1024」、「来源：6 月经营分析会」）。
- 使用中文回答，语言简洁、专业。
- 涉及创建、修改、删除、审批等写入操作时，只生成草稿并提示用户确认，不要擅自执行。
- 如果用户问题超出当前上下文，可以调用 searchKms 工具查询企业知识库。

输出规范：
- 支持 Markdown 格式（列表、表格、加粗）。
- 数据来源用括号标注在结论后。
- 如果处于 mock 模式，请明确提示用户。`;
}

/**
 * 收集业务上下文
 * @param {Object} options
 * @param {number} options.maxMeetings 最多取多少条会议
 * @param {number} options.maxTasks 最多取多少条重点工作
 * @param {number} options.maxKpis 最多取多少条 KPI
 * @param {number} options.maxTopics 最多取多少条专题
 * @param {number} options.maxResolutions 最多取多少条决议
 */
export function gatherBusinessContext(options = {}) {
  const {
    maxMeetings = 10,
    maxTasks = 10,
    maxKpis = 10,
    maxTopics = 10,
    maxResolutions = 10,
  } = options;

  const meetings = getWindowOrStorage('_meetingsData', 'dste_meetings', []);
  const tasks = Storage.get('dste_omp_tasks_v1', []);
  const indicators = Storage.get('dste_omp_indicators_v1', []);
  const kpiInstances = Storage.get('dste_omp_kpi_instances_v1', []);
  const milestones = Storage.get('dste_omp_milestones_v1', []);
  const progressRecords = Storage.get('dste_omp_progress_v1', []);
  const topics = Storage.get('dste_topics_v2', []);
  const resolutionsRaw = Storage.get('dste_resolutions_v2', { resolutions: [] });
  const resolutions = Array.isArray(resolutionsRaw)
    ? resolutionsRaw
    : (resolutionsRaw.resolutions || []);
  const annualPlan = Storage.get('dste_annual_plan_v1', {});
  const employeeDirectory = Storage.get('dste_employee_directory', { employees: [], orgTree: [] });
  const reviewScores = Storage.get('dste_review_scores', {});

  return {
    summary: {
      meetingCount: Array.isArray(meetings) ? meetings.length : 0,
      taskCount: Array.isArray(tasks) ? tasks.length : 0,
      kpiCount: Array.isArray(kpiInstances) ? kpiInstances.length : (Array.isArray(indicators) ? indicators.length : 0),
      topicCount: Array.isArray(topics) ? topics.length : 0,
      resolutionCount: Array.isArray(resolutions) ? resolutions.length : 0,
      employeeCount: Array.isArray(employeeDirectory.employees) ? employeeDirectory.employees.length : 0,
    },
    meetings: summarizeMeetings(meetings, maxMeetings),
    tasks: summarizeTasks(tasks, maxTasks),
    kpis: summarizeKpis(kpiInstances, indicators, maxKpis),
    topics: summarizeTopics(topics, maxTopics),
    resolutions: summarizeResolutions(resolutions, maxResolutions),
    annualPlan: summarizeAnnualPlan(annualPlan),
    milestones: summarizeMilestones(milestones, 10),
    progressRecords: summarizeProgress(progressRecords, 10),
    reviewScores: summarizeReviewScores(reviewScores),
    employees: summarizeEmployees(employeeDirectory),
  };
}

/**
 * 返回上下文摘要，用于 AI 页面展示
 */
export function getContextSummary() {
  const ctx = gatherBusinessContext({
    maxMeetings: 0,
    maxTasks: 0,
    maxKpis: 0,
    maxTopics: 0,
    maxResolutions: 0,
  });
  const s = ctx.summary;
  const parts = [];
  if (s.meetingCount) parts.push(`${s.meetingCount} 条会议`);
  if (s.taskCount) parts.push(`${s.taskCount} 项重点工作`);
  if (s.kpiCount) parts.push(`${s.kpiCount} 项 KPI`);
  if (s.topicCount) parts.push(`${s.topicCount} 个专题`);
  if (s.resolutionCount) parts.push(`${s.resolutionCount} 条决议`);
  if (s.employeeCount) parts.push(`${s.employeeCount} 位员工`);
  return parts.length > 0 ? `已接入 ${parts.join('、')}` : '暂无业务数据';
}

/**
 * 将上下文格式化为 Kimi 可读的文本
 */
export function formatContextForAI(context) {
  const lines = [];

  lines.push('## 数据总览');
  lines.push(`- 会议：${context.summary.meetingCount} 条`);
  lines.push(`- 重点工作：${context.summary.taskCount} 项`);
  lines.push(`- KPI：${context.summary.kpiCount} 项`);
  lines.push(`- 专题：${context.summary.topicCount} 个`);
  lines.push(`- 决议：${context.summary.resolutionCount} 条`);
  lines.push(`- 员工：${context.summary.employeeCount} 人`);

  if (context.kpis?.length) {
    lines.push('\n## KPI 快照（最近/落后项）');
    context.kpis.forEach((k) => {
      lines.push(`- ${k.name}: 目标 ${k.target}, 实际 ${k.actual}, 完成率 ${k.completionRate}% (${k.status}) [来源: ${k.source}]`);
    });
  }

  if (context.tasks?.length) {
    lines.push('\n## 重点工作快照');
    context.tasks.forEach((t) => {
      lines.push(`- ${t.title}: 负责人 ${t.owner}, 进度 ${t.progress}%, 风险 ${t.riskLevel}, 截止 ${t.deadline} [来源: OMP]`);
    });
  }

  if (context.meetings?.length) {
    lines.push('\n## 最近会议');
    context.meetings.forEach((m) => {
      lines.push(`- ${m.title} (${m.date}): 状态 ${m.status}, 议程 ${m.agendaCount} 项, 行动项 ${m.actionCount} 项, 决议 ${m.resolutionCount} 条 [来源: 会议 ${m.id}]`);
    });
  }

  if (context.resolutions?.length) {
    lines.push('\n## 未闭环决议');
    context.resolutions.forEach((r) => {
      lines.push(`- ${r.title}: 状态 ${r.status}, 负责人 ${r.owner} [来源: 决议 ${r.id}]`);
    });
  }

  if (context.topics?.length) {
    lines.push('\n## 业务专题');
    context.topics.forEach((t) => {
      lines.push(`- ${t.title}: 负责人 ${t.owner}, 状态 ${t.status} [来源: 专题 ${t.id}]`);
    });
  }

  if (context.annualPlan?.goals?.length) {
    lines.push('\n## 年度经营计划');
    context.annualPlan.goals.forEach((g) => {
      lines.push(`- ${g.name}: 目标 ${g.target}, 完成率 ${g.completionRate}%`);
    });
  }

  return lines.join('\n');
}

// ========== 内部数据读取与摘要 ==========

function getWindowOrStorage(windowKey, storageKey, defaultValue) {
  if (typeof window !== 'undefined' && window[windowKey] !== undefined) {
    return window[windowKey];
  }
  return Storage.get(storageKey, defaultValue);
}

function summarizeMeetings(meetings, max) {
  if (!Array.isArray(meetings)) return [];
  return meetings
    .slice()
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, max)
    .map((m) => ({
      id: m.id,
      title: m.title || '未命名会议',
      date: m.date || '',
      scenario: m.scenario || '',
      status: m.status || '',
      agendaCount: Array.isArray(m.agenda_items) ? m.agenda_items.length : 0,
      actionCount: Array.isArray(m.actions) ? m.actions.length : 0,
      resolutionCount: Array.isArray(m.decisions) ? m.decisions.length : 0,
    }));
}

function summarizeTasks(tasks, max) {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .slice()
    .sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      return (riskOrder[a.riskLevel] || 2) - (riskOrder[b.riskLevel] || 2);
    })
    .slice(0, max)
    .map((t) => ({
      id: t.id,
      title: t.title || t.name || '未命名工作',
      owner: t.owner || t.department || '',
      progress: t.progress || 0,
      riskLevel: t.riskLevel || t.risk || '',
      deadline: t.deadline || '',
      status: t.status || '',
    }));
}

function summarizeKpis(kpiInstances, indicators, max) {
  const source = Array.isArray(kpiInstances) && kpiInstances.length > 0
    ? kpiInstances
    : (Array.isArray(indicators) ? indicators : []);
  if (!Array.isArray(source)) return [];

  return source.slice(0, max).map((k) => {
    const target = Number(k.target ?? k.targetValue ?? 0);
    const actual = Number(k.actual ?? k.actualValue ?? 0);
    const completionRate = target > 0 ? Math.round((actual / target) * 100) : 0;
    let status = 'normal';
    if (completionRate < 80) status = 'behind';
    else if (completionRate >= 100) status = 'achieved';

    return {
      id: k.id,
      name: k.name || k.title || '未命名指标',
      target,
      actual,
      completionRate,
      status,
      source: kpiInstances.length > 0 ? 'OMP KPI' : '战略指标库',
    };
  });
}

function summarizeTopics(topics, max) {
  if (!Array.isArray(topics)) return [];
  return topics.slice(0, max).map((t) => ({
    id: t.id,
    title: t.title || '未命名专题',
    owner: t.owner || '',
    status: t.status || '',
    priority: t.priority || '',
  }));
}

function summarizeResolutions(resolutions, max) {
  if (!Array.isArray(resolutions)) return [];
  return resolutions
    .filter((r) => r.status !== 'closed')
    .slice(0, max)
    .map((r) => ({
      id: r.id,
      title: r.title || r.content || '未命名决议',
      status: r.status || '',
      owner: r.owner || '',
      deadline: r.deadline || '',
    }));
}

function summarizeAnnualPlan(plan) {
  if (!plan || typeof plan !== 'object') return {};
  return {
    year: plan.year || '',
    goals: Array.isArray(plan.goals) ? plan.goals.slice(0, 10) : [],
    summary: plan.summary || '',
  };
}

function summarizeMilestones(milestones, max) {
  if (!Array.isArray(milestones)) return [];
  return milestones.slice(0, max).map((m) => ({
    id: m.id,
    title: m.title || '',
    dueDate: m.dueDate || m.deadline || '',
    status: m.status || '',
  }));
}

function summarizeProgress(progress, max) {
  if (!Array.isArray(progress)) return [];
  return progress.slice(0, max).map((p) => ({
    id: p.id,
    date: p.date || '',
    content: p.content || '',
    progress: p.progress || 0,
  }));
}

function summarizeReviewScores(scores) {
  if (!scores || typeof scores !== 'object') return {};
  const urls = Object.keys(scores);
  return {
    reviewedUrlCount: urls.length,
    averageScore: urls.length
      ? Math.round(urls.reduce((sum, u) => sum + (scores[u]?.maxScore || 0), 0) / urls.length)
      : 0,
  };
}

function summarizeEmployees(directory) {
  if (!directory || typeof directory !== 'object') return { count: 0, departments: [] };
  const employees = Array.isArray(directory.employees) ? directory.employees : [];
  const departments = new Set(employees.map((e) => e.department).filter(Boolean));
  return {
    count: employees.length,
    departments: Array.from(departments).slice(0, 20),
  };
}
