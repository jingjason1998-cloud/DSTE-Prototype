import { describe, it, expect } from 'vitest';
import {
  buildGlobalTodos,
  filterTodos,
  groupTodosByType,
  groupTodosByUrgency,
  getTodoPriority,
  formatDueText,
  TODO_PRIORITY,
} from '../../src/meetings/utils/todo-aggregator.js';

function createMeeting(overrides = {}) {
  return {
    id: 'm1',
    title: '测试会议',
    date: '2026-12-31',
    status: 'planned',
    scenario: 'hq_routine',
    pipeline: {
      reportGenerated: false,
      preReviewDone: false,
      meetingHeld: false,
      minutesDrafted: false,
      minutesApproved: false,
      actionsTracked: false,
    },
    hasMinutes: false,
    actions: [],
    decisions: [],
    agenda_items: [],
    effectiveness: null,
    ...overrides,
  };
}

const scenarioConfig = {
  union_quarterly: { pipelineEnabled: false },
  hq_routine: { pipelineEnabled: false },
  region_routine: { pipelineEnabled: true },
  lagging_region: { pipelineEnabled: true },
  lagging_vertical: { pipelineEnabled: true },
};

describe('buildGlobalTodos', () => {
  it('returns empty state when no meetings', () => {
    const todos = buildGlobalTodos([]);
    expect(todos).toHaveLength(1);
    expect(todos[0].type).toBe('empty');
    expect(todos[0].text).toBe('当前暂无待办事项');
  });

  it('generates report todo for planned meeting without report', () => {
    const meetings = [createMeeting({ status: 'planned', title: '本部月会' })];
    const todos = buildGlobalTodos(meetings, { scenarioConfig });
    const reportTodo = todos.find(t => t.type === 'report');
    expect(reportTodo).toBeDefined();
    expect(reportTodo.text).toContain('本部月会');
    expect(reportTodo.text).toContain('待生成经营分析报告');
    expect(reportTodo.section).toBe('prep');
  });

  it('does not generate report todo when reportGenerated is true', () => {
    const meetings = [createMeeting({
      status: 'planned',
      pipeline: { reportGenerated: true, preReviewDone: false, meetingHeld: false, minutesDrafted: false, minutesApproved: false, actionsTracked: false },
    })];
    const todos = buildGlobalTodos(meetings, { scenarioConfig });
    expect(todos.find(t => t.type === 'report')).toBeUndefined();
  });

  it('generates preReview todo for in_progress meeting without review', () => {
    const meetings = [createMeeting({ status: 'in_progress', title: '准备中会议' })];
    const todos = buildGlobalTodos(meetings, { scenarioConfig });
    const preReviewTodo = todos.find(t => t.type === 'preReview');
    expect(preReviewTodo).toBeDefined();
    expect(preReviewTodo.text).toContain('待会前评审');
    expect(preReviewTodo.section).toBe('prep');
  });

  it('generates minutes todo when meeting held but no minutes', () => {
    const meetings = [createMeeting({
      status: 'completed',
      pipeline: { reportGenerated: true, preReviewDone: true, meetingHeld: true, minutesDrafted: false, minutesApproved: false, actionsTracked: false },
    })];
    const todos = buildGlobalTodos(meetings, { scenarioConfig });
    const minutesTodo = todos.find(t => t.type === 'minutes');
    expect(minutesTodo).toBeDefined();
    expect(minutesTodo.text).toContain('待生成纪要');
    expect(minutesTodo.section).toBe('minutes');
  });

  it('generates action todo for pending/in_progress actions', () => {
    const meetings = [createMeeting({
      status: 'in_progress',
      actions: [
        { content: '行动A', status: 'pending', deadline: '2026-12-31' },
        { content: '行动B', status: 'in_progress', deadline: '2026-12-31' },
        { content: '行动C', status: 'completed', deadline: '2026-12-31' },
      ],
    })];
    const todos = buildGlobalTodos(meetings, { scenarioConfig });
    const actionTodos = todos.filter(t => t.type === 'action');
    expect(actionTodos).toHaveLength(2);
    expect(actionTodos[0].subIndex).toBe(0);
    expect(actionTodos[1].subIndex).toBe(1);
  });

  it('generates decision todo for pending decisions', () => {
    const meetings = [createMeeting({
      status: 'in_progress',
      decisions: [
        { content: '决议A', status: 'pending', deadline: '2026-12-31' },
        { content: '决议B', status: 'approved', deadline: '2026-12-31' },
      ],
    })];
    const todos = buildGlobalTodos(meetings, { scenarioConfig });
    const decisionTodos = todos.filter(t => t.type === 'decision');
    expect(decisionTodos).toHaveLength(1);
    expect(decisionTodos[0].text).toContain('决议A');
  });

  it('does not track agenda material todos (category removed)', () => {
    const meetings = [createMeeting({
      status: 'planned',
      agenda_items: [
        { title: '议程1', material_link: '', reviewStatus: 'pending' },
        { title: '议程2', material_link: 'http://x', reviewStatus: 'reviewed' },
        { title: '议程3', material_link: 'http://y', reviewStatus: 'pending' },
      ],
    })];
    const todos = buildGlobalTodos(meetings, { scenarioConfig });
    expect(todos.find(t => t.type === 'agendaMaterial')).toBeUndefined();
    expect(todos.find(t => (t.text || '').includes('材料'))).toBeUndefined();
  });

  it('generates effectiveness todo for completed meeting without effectiveness', () => {
    const meetings = [createMeeting({ status: 'completed' })];
    const todos = buildGlobalTodos(meetings, { scenarioConfig });
    const effectivenessTodo = todos.find(t => t.type === 'effectiveness');
    expect(effectivenessTodo).toBeDefined();
    expect(effectivenessTodo.text).toContain('待会议效果评估');
  });

  it('does not generate effectiveness todo when effectiveness exists', () => {
    const meetings = [createMeeting({
      status: 'completed',
      effectiveness: { overallScore: 85 },
    })];
    const todos = buildGlobalTodos(meetings, { scenarioConfig });
    expect(todos.find(t => t.type === 'effectiveness')).toBeUndefined();
  });

  it('generates pipeline todo for pipeline-enabled scenario', () => {
    const meetings = [createMeeting({
      status: 'in_progress',
      scenario: 'region_routine',
      pipeline: { reportGenerated: false, preReviewDone: false, meetingHeld: false, minutesDrafted: false, minutesApproved: false, actionsTracked: false },
    })];
    const todos = buildGlobalTodos(meetings, { scenarioConfig });
    const pipelineTodo = todos.find(t => t.type === 'pipeline');
    expect(pipelineTodo).toBeDefined();
    expect(pipelineTodo.text).toContain('报告生成');
  });

  it('does not generate pipeline todo when all steps done', () => {
    const meetings = [createMeeting({
      status: 'in_progress',
      scenario: 'region_routine',
      pipeline: { reportGenerated: true, preReviewDone: true, meetingHeld: true, minutesDrafted: true, minutesApproved: true, actionsTracked: true },
    })];
    const todos = buildGlobalTodos(meetings, { scenarioConfig });
    expect(todos.find(t => t.type === 'pipeline')).toBeUndefined();
  });

  it('excludes cancelled meetings', () => {
    const meetings = [createMeeting({ status: 'cancelled' })];
    const todos = buildGlobalTodos(meetings, { scenarioConfig });
    expect(todos).toHaveLength(1);
    expect(todos[0].type).toBe('empty');
  });

  it('sorts by priority descending then date ascending', () => {
    const meetings = [
      createMeeting({
        id: 'm1',
        status: 'in_progress',
        title: 'A',
        actions: [{ content: '逾期行动', status: 'pending', deadline: '2026-01-01' }],
      }),
      createMeeting({
        id: 'm2',
        status: 'in_progress',
        title: 'B',
        actions: [{ content: '远期行动', status: 'pending', deadline: '2026-12-31' }],
      }),
    ];
    const todos = buildGlobalTodos(meetings, { scenarioConfig });
    const actionTodos = todos.filter(t => t.type === 'action');
    expect(actionTodos[0].text).toContain('逾期行动');
    expect(actionTodos[1].text).toContain('远期行动');
  });
});

describe('getTodoPriority', () => {
  it('returns CRITICAL for overdue or today', () => {
    expect(getTodoPriority(-1)).toBe(TODO_PRIORITY.CRITICAL);
    expect(getTodoPriority(0)).toBe(TODO_PRIORITY.CRITICAL);
  });

  it('returns HIGH for within 3 days', () => {
    expect(getTodoPriority(1)).toBe(TODO_PRIORITY.HIGH);
    expect(getTodoPriority(3)).toBe(TODO_PRIORITY.HIGH);
  });

  it('returns MEDIUM for within 7 days', () => {
    expect(getTodoPriority(4)).toBe(TODO_PRIORITY.MEDIUM);
    expect(getTodoPriority(7)).toBe(TODO_PRIORITY.MEDIUM);
  });

  it('returns LOW for more than 7 days', () => {
    expect(getTodoPriority(8)).toBe(TODO_PRIORITY.LOW);
    expect(getTodoPriority(100)).toBe(TODO_PRIORITY.LOW);
  });

  it('returns MEDIUM for null', () => {
    expect(getTodoPriority(null)).toBe(TODO_PRIORITY.MEDIUM);
  });
});

describe('formatDueText', () => {
  it('formats overdue/today/future days', () => {
    expect(formatDueText(-2)).toBe('逾期 2 天');
    expect(formatDueText(0)).toBe('今天到期');
    expect(formatDueText(5)).toBe('剩余 5 天');
    expect(formatDueText(null)).toBe('无截止日期');
  });
});

describe('filterTodos', () => {
  const todos = [
    { type: 'action', priority: TODO_PRIORITY.CRITICAL, deadline: '2026-01-01' },
    { type: 'action', priority: TODO_PRIORITY.HIGH, deadline: new Date().toISOString().split('T')[0] },
    { type: 'action', priority: TODO_PRIORITY.MEDIUM, deadline: '2026-12-31' },
  ];

  it('returns all for all filter', () => {
    expect(filterTodos(todos, 'all')).toHaveLength(3);
  });

  it('filters critical/high', () => {
    expect(filterTodos(todos, 'critical')).toHaveLength(2);
  });

  it('filters today', () => {
    expect(filterTodos(todos, 'today')).toHaveLength(1);
  });

  it('filters week', () => {
    expect(filterTodos(todos, 'week')).toHaveLength(1);
  });
});

describe('groupTodosByType', () => {
  it('groups todos by type label', () => {
    const todos = [
      { type: 'report' },
      { type: 'report' },
      { type: 'action' },
    ];
    const groups = groupTodosByType(todos);
    expect(groups).toHaveLength(2);
    expect(groups.find(g => g.label === '经营分析报告').items).toHaveLength(2);
    expect(groups.find(g => g.label === '行动项跟进').items).toHaveLength(1);
  });
});

describe('groupTodosByUrgency', () => {
  it('groups todos by urgency label in order', () => {
    const todos = [
      { type: 'action', priority: TODO_PRIORITY.LOW },
      { type: 'action', priority: TODO_PRIORITY.CRITICAL },
      { type: 'action', priority: TODO_PRIORITY.MEDIUM },
    ];
    const groups = groupTodosByUrgency(todos);
    expect(groups.map(g => g.label)).toEqual(['紧急', '中', '低']);
  });
});
