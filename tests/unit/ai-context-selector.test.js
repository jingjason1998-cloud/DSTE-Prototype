import { describe, it, expect } from 'vitest';
import { selectContextForQuestion } from '../../src/lib/ai-context-selector.js';

describe('selectContextForQuestion', () => {
  const context = {
    summary: { meetingCount: 5, taskCount: 10, kpiCount: 3, topicCount: 2, resolutionCount: 4, employeeCount: 20 },
    kpis: [{ id: 'k1', name: '销售额', target: 100, actual: 80, completionRate: 80, status: 'behind', source: 'OMP' }],
    tasks: [{ id: 't1', title: '降本增效', owner: '李四', progress: 50, riskLevel: 'high', deadline: '2026-09-01' }],
    meetings: [{ id: 'm1', title: 'Q2 经营分析会', date: '2026-07-15', status: 'completed', agendaCount: 5, actionCount: 3, resolutionCount: 2 }],
    resolutions: [{ id: 'r1', title: '关闭低效产线', status: 'open', owner: '王五' }],
    topics: [{ id: 'tp1', title: '海外市场拓展', owner: '赵六', status: 'execution' }],
  };

  it('always includes summary', () => {
    const text = selectContextForQuestion('anything', context);
    expect(text).toContain('数据总览');
  });

  it('selects KPI section for KPI questions', () => {
    const text = selectContextForQuestion('销售额完成率如何', context);
    expect(text).toContain('销售额');
  });

  it('selects task section for task questions', () => {
    const text = selectContextForQuestion('降本增效进度', context);
    expect(text).toContain('降本增效');
  });

  it('selects meeting section for meeting questions', () => {
    const text = selectContextForQuestion('Q2 经营分析会', context);
    expect(text).toContain('Q2 经营分析会');
  });

  it('respects maxChars', () => {
    const text = selectContextForQuestion('综合情况', context, { maxChars: 200 });
    expect(text.length).toBeLessThanOrEqual(220);
  });

  it('handles empty context gracefully', () => {
    const text = selectContextForQuestion('hello', null);
    expect(text).toBe('');
  });
});
