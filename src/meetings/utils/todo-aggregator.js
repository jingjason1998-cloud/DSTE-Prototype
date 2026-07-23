/**
 * 经营分析会全局待办聚合器
 * @module todo-aggregator
 *
 * 纯函数：从会议模块现有数据派生统一待办列表，不维护独立状态。
 */

import { getDaysLeft } from './helpers.js';

/** 默认场景配置（仅用于判断 pipelineEnabled） */
const DEFAULT_SCENARIO_CONFIG = {
  union_quarterly: { pipelineEnabled: false },
  hq_routine: { pipelineEnabled: false },
  region_routine: { pipelineEnabled: true },
  lagging_region: { pipelineEnabled: true },
  lagging_vertical: { pipelineEnabled: true },
};

/** 默认一报一会流程步骤 */
const DEFAULT_PIPELINE_STEPS = [
  { key: 'reportGenerated', label: '报告生成' },
  { key: 'preReviewDone', label: '会前评审' },
  { key: 'meetingHeld', label: '会议召开' },
  { key: 'minutesDrafted', label: '纪要起草' },
  { key: 'minutesApproved', label: '纪要定稿' },
  { key: 'actionsTracked', label: '行动追踪' },
];

/** 待办类型配置 */
export const TODO_TYPE_CONFIG = {
  report: { label: '经营分析报告', icon: 'fileText', color: 'var(--danger)' },
  preReview: { label: '会前评审', icon: 'eye', color: 'var(--warning)' },
  minutes: { label: '会议纪要', icon: 'fileText', color: 'var(--warning)' },
  decision: { label: '决议确认', icon: 'clipboardText', color: 'var(--warning)' },
  action: { label: '行动项跟进', icon: 'check', color: 'var(--primary)' },
  effectiveness: { label: '会议评估', icon: 'star', color: 'var(--warning)' },
  pipeline: { label: '流程推进', icon: 'chartBar', color: 'var(--primary)' },
};

/** 优先级常量 */
export const TODO_PRIORITY = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

/**
 * 根据剩余天数计算优先级
 * @param {number|null} daysLeft
 * @returns {number}
 */
export function getTodoPriority(daysLeft) {
  if (daysLeft === null || daysLeft === undefined) return TODO_PRIORITY.MEDIUM;
  if (daysLeft < 0) return TODO_PRIORITY.CRITICAL;
  if (daysLeft === 0) return TODO_PRIORITY.CRITICAL;
  if (daysLeft <= 3) return TODO_PRIORITY.HIGH;
  if (daysLeft <= 7) return TODO_PRIORITY.MEDIUM;
  return TODO_PRIORITY.LOW;
}

/**
 * 格式化到期文案
 * @param {number|null} daysLeft
 * @returns {string}
 */
export function formatDueText(daysLeft) {
  if (daysLeft === null || daysLeft === undefined) return '无截止日期';
  if (daysLeft < 0) return `逾期 ${Math.abs(daysLeft)} 天`;
  if (daysLeft === 0) return '今天到期';
  return `剩余 ${daysLeft} 天`;
}

/**
 * 计算会议日期距离今天的天数
 * @param {string} meetingDate - YYYY-MM-DD
 * @returns {number|null}
 */
function getMeetingDaysLeft(meetingDate) {
  if (!meetingDate) return null;
  try {
    const daysLeft = Math.ceil((new Date(meetingDate + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000);
    return Number.isNaN(daysLeft) ? null : daysLeft;
  } catch (e) {
    return null;
  }
}

function makeTodoId(meetingId, type, subIndex) {
  return `${meetingId}::${type}${subIndex !== undefined && subIndex !== null ? `::${subIndex}` : ''}`;
}

function createTodo({ type, text, meetingId, meetingTitle, meetingDate, deadline, section, subIndex, priority }) {
  const cfg = TODO_TYPE_CONFIG[type] || TODO_TYPE_CONFIG.action;
  const daysLeft = deadline ? getDaysLeft(deadline) : null;
  const effectivePriority = priority !== undefined ? priority : getTodoPriority(daysLeft);
  return {
    id: makeTodoId(meetingId, type, subIndex),
    type,
    icon: cfg.icon,
    color: cfg.color,
    text,
    meetingId,
    meetingTitle: meetingTitle || '',
    meetingDate: meetingDate || '',
    deadline: deadline || null,
    priority: effectivePriority,
    section,
    subIndex: subIndex !== undefined ? subIndex : null,
    dueText: formatDueText(daysLeft),
  };
}

/**
 * 从全部会议数据构建全局待办列表
 * @param {Object[]} meetings
 * @param {Object} options
 * @param {Object} options.scenarioConfig - 场景配置，用于判断 pipelineEnabled
 * @param {Object[]} options.pipelineSteps - 流程步骤配置
 * @param {Date} options.now - 当前时间（测试用）
 * @returns {Object[]}
 */
export function buildGlobalTodos(meetings, options = {}) {
  const {
    scenarioConfig = DEFAULT_SCENARIO_CONFIG,
    pipelineSteps = DEFAULT_PIPELINE_STEPS,
  } = options;

  const todoItems = [];

  (meetings || []).forEach((m) => {
    if (!m || m.status === 'cancelled') return;

    const pipeline = m.pipeline || {};
    const meetingDaysLeft = getMeetingDaysLeft(m.date);

    // 1. 待生成经营分析报告
    if (m.status === 'planned' && !pipeline.reportGenerated) {
      todoItems.push(createTodo({
        type: 'report',
        text: `${m.title} 待生成经营分析报告`,
        meetingId: m.id,
        meetingTitle: m.title,
        meetingDate: m.date,
        deadline: m.date,
        section: 'prep',
        priority: meetingDaysLeft !== null && meetingDaysLeft <= 3 ? TODO_PRIORITY.HIGH : TODO_PRIORITY.MEDIUM,
      }));
    }

    // 2. 待会前评审
    if (m.status === 'in_progress' && !pipeline.preReviewDone) {
      todoItems.push(createTodo({
        type: 'preReview',
        text: `${m.title} 待会前评审`,
        meetingId: m.id,
        meetingTitle: m.title,
        meetingDate: m.date,
        section: 'prep',
        priority: TODO_PRIORITY.MEDIUM,
      }));
    }

    // 3. 待生成纪要
    if (pipeline.meetingHeld && !m.hasMinutes) {
      todoItems.push(createTodo({
        type: 'minutes',
        text: `${m.title} 待生成纪要`,
        meetingId: m.id,
        meetingTitle: m.title,
        meetingDate: m.date,
        section: 'minutes',
        priority: m.status === 'completed' ? TODO_PRIORITY.HIGH : TODO_PRIORITY.MEDIUM,
      }));
    }

    // 4. 待确认决议
    (m.decisions || []).forEach((d, idx) => {
      if (d.status === 'pending') {
        const daysLeft = getDaysLeft(d.deadline);
        todoItems.push(createTodo({
          type: 'decision',
          text: `${d.content || '决议'} 待确认`,
          meetingId: m.id,
          meetingTitle: m.title,
          meetingDate: m.date,
          deadline: d.deadline,
          section: 'decisions',
          subIndex: idx,
          priority: getTodoPriority(daysLeft),
        }));
      }
    });

    // 5. 待跟进行动项
    (m.actions || []).forEach((a, idx) => {
      if (a.status === 'pending' || a.status === 'in_progress') {
        const daysLeft = getDaysLeft(a.deadline);
        todoItems.push(createTodo({
          type: 'action',
          text: `${a.content || '行动项'} 待跟进`,
          meetingId: m.id,
          meetingTitle: m.title,
          meetingDate: m.date,
          deadline: a.deadline,
          section: 'actions',
          subIndex: idx,
          priority: getTodoPriority(daysLeft),
        }));
      }
    });

    // 6. 待会议效果评估
    if (m.status === 'completed' && !m.effectiveness) {
      todoItems.push(createTodo({
        type: 'effectiveness',
        text: `${m.title} 待会议效果评估`,
        meetingId: m.id,
        meetingTitle: m.title,
        meetingDate: m.date,
        section: 'eval',
        priority: TODO_PRIORITY.LOW,
      }));
    }

    // 7. 一报一会流程待推进
    const scenario = scenarioConfig[m.scenario];
    if (scenario?.pipelineEnabled) {
      const firstUndone = pipelineSteps.find(step => !pipeline[step.key]);
      if (firstUndone) {
        todoItems.push(createTodo({
          type: 'pipeline',
          text: `${m.title} 待推进：${firstUndone.label}`,
          meetingId: m.id,
          meetingTitle: m.title,
          meetingDate: m.date,
          section: 'pipeline',
          priority: TODO_PRIORITY.MEDIUM,
        }));
      }
    }
  });

  // 排序：priority 降序 → deadline 升序（null 排后）→ meetingDate 升序
  todoItems.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;

    const deadlineA = a.deadline ? new Date(a.deadline) : null;
    const deadlineB = b.deadline ? new Date(b.deadline) : null;
    if (deadlineA && deadlineB) return deadlineA - deadlineB;
    if (deadlineA && !deadlineB) return -1;
    if (!deadlineA && deadlineB) return 1;

    return (a.meetingDate || '').localeCompare(b.meetingDate || '');
  });

  if (todoItems.length === 0) {
    todoItems.push({
      id: 'empty',
      type: 'empty',
      icon: 'check',
      color: 'var(--success)',
      text: '当前暂无待办事项',
      meetingId: null,
      meetingTitle: '',
      meetingDate: '',
      deadline: null,
      priority: TODO_PRIORITY.NONE,
      section: null,
      subIndex: null,
      dueText: '',
    });
  }

  return todoItems;
}

/**
 * 按类型分组
 * @param {Object[]} todos
 * @returns {Object[]}
 */
export function groupTodosByType(todos) {
  const groups = {};
  todos.forEach((t) => {
    const label = TODO_TYPE_CONFIG[t.type]?.label || '其他';
    if (!groups[label]) groups[label] = [];
    groups[label].push(t);
  });
  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

/**
 * 按紧急度分组
 * @param {Object[]} todos
 * @returns {Object[]}
 */
export function groupTodosByUrgency(todos) {
  const labels = {
    [TODO_PRIORITY.CRITICAL]: '紧急',
    [TODO_PRIORITY.HIGH]: '高',
    [TODO_PRIORITY.MEDIUM]: '中',
    [TODO_PRIORITY.LOW]: '低',
    [TODO_PRIORITY.NONE]: '无',
  };
  const groups = {};
  todos.forEach((t) => {
    const label = labels[t.priority] || '其他';
    if (!groups[label]) groups[label] = [];
    groups[label].push(t);
  });
  const order = ['紧急', '高', '中', '低', '无'];
  return order
    .filter(label => groups[label])
    .map(label => ({ label, items: groups[label] }));
}

/**
 * 筛选待办
 * @param {Object[]} todos
 * @param {string} filter - 'all' | 'critical' | 'today' | 'week'
 * @returns {Object[]}
 */
export function filterTodos(todos, filter) {
  if (filter === 'all') return todos;
  if (filter === 'critical') return todos.filter(t => t.priority === TODO_PRIORITY.CRITICAL || t.priority === TODO_PRIORITY.HIGH);
  if (filter === 'today') return todos.filter(t => t.deadline && getDaysLeft(t.deadline) === 0);
  if (filter === 'week') return todos.filter(t => {
    if (!t.deadline) return false;
    const daysLeft = getDaysLeft(t.deadline);
    return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
  });
  return todos;
}
