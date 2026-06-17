import { describe, it, expect } from 'vitest';
import { calculateAutoScore, getScoreColor, getScoreLabel } from '../../src/meetings/utils/scoring.js';

describe('calculateAutoScore (v2.0 three-stage model)', () => {
  const meetingDate = '2026-06-15';
  const sameDayEval = '2026-06-15T20:00:00Z';
  const nextDayEval = '2026-06-16T10:00:00Z';

  function makeMeeting(overrides = {}) {
    return {
      date: meetingDate,
      pipeline: {},
      agenda_items: [],
      decisions: [],
      actions: [],
      hasMinutes: false,
      minutesStatus: null,
      ...overrides,
    };
  }

  it('returns perfect score for fully prepared and completed meeting', () => {
    const meeting = makeMeeting({
      pipeline: { meetingHeld: true },
      host: '主持人',
      recorder: '记录人',
      agenda_items: [
        { type: 'goal_management', title: '目标回顾', duration: 30, owner: 'A', material_link: 'https://kms/1' },
        { type: 'budget_finance', title: '财务复盘', duration: 30, owner: 'B', material_link: 'https://kms/2' },
        { type: 'key_task_management', title: '重点工作', duration: 30, owner: 'C', material_link: 'https://kms/3' },
        { type: 'business_special', title: '业务专项', duration: 30, owner: 'D', material_link: 'https://kms/4' },
      ],
      hasMinutes: true,
      minutesStatus: 'final',
      decisions: [{}, {}, {}],
      actions: [{}, {}, {}],
    });

    const reviewScores = {
      'https://kms/1': { maxScore: 100 },
      'https://kms/2': { maxScore: 100 },
      'https://kms/3': { maxScore: 100 },
      'https://kms/4': { maxScore: 100 },
    };

    const result = calculateAutoScore(meeting, sameDayEval, reviewScores);

    expect(result.overallScore).toBe(100);
    expect(result.dimensions.before).toBeCloseTo(35, 1);
    expect(result.dimensions.during).toBeCloseTo(30, 1);
    expect(result.dimensions.after).toBeCloseTo(35, 1);
    expect(result.subScores.materialCompleteness).toBeCloseTo(7, 1);
    expect(result.subScores.agendaCoverage).toBeCloseTo(10.5, 1);
    expect(result.subScores.materialReviewScore).toBeCloseTo(17.5, 1);
    expect(result.subScores.effectiveDiscussion).toBeCloseTo(12, 1);
    expect(result.subScores.participation).toBeCloseTo(12, 1);
    expect(result.subScores.timeControl).toBeCloseTo(6, 1);
    expect(result.subScores.resolutionAndAction).toBe(30);
    expect(result.subScores.timeliness).toBe(5);
    expect(result.subScores.postponementDeduction).toBe(0);
    expect(result.feedback).toContain('材料充分');
    expect(result.feedback).toContain('讨论有效');
    expect(result.feedback).toContain('闭环到位');
    expect(result.auto).toBe(true);
  });

  it('returns zero and negative feedback for empty meeting', () => {
    const meeting = makeMeeting();
    const result = calculateAutoScore(meeting, nextDayEval);

    expect(result.overallScore).toBe(0);
    expect(result.dimensions.before).toBe(0);
    expect(result.dimensions.during).toBe(0);
    expect(result.dimensions.after).toBe(0);
    expect(result.feedback).toContain('数据不足');
    expect(result.feedback).toContain('时间失控');
    expect(result.feedback).toContain('缺乏跟进');
    expect(result.auto).toBe(true);
  });

  it('calculates before-stage sub-scores correctly', () => {
    const meeting = makeMeeting({
      agenda_items: [
        { type: 'goal_management', title: 'T1', duration: 20, owner: 'A', material_link: 'https://kms/1' },
        { type: 'budget_finance', title: 'T2', duration: 20, owner: 'B', material_link: '' },
      ],
    });
    const reviewScores = {
      'https://kms/1': { maxScore: 80 },
    };

    const result = calculateAutoScore(meeting, nextDayEval, reviewScores);

    // materialCompleteness: 1 of 2 agendas has material_link => 0.5 * 7 = 3.5
    expect(result.subScores.materialCompleteness).toBeCloseTo(3.5, 1);
    // agendaCoverage: 2 of 4 required types => 0.5 * 10.5 ≈ 5.3
    expect(result.subScores.agendaCoverage).toBeCloseTo(5.3, 1);
    // materialReviewScore: avg 80 => 0.8 * 17.5 = 14
    expect(result.subScores.materialReviewScore).toBeCloseTo(14, 1);
    expect(result.dimensions.before).toBeCloseTo(22.8, 1);
  });

  it('uses average review score when scores exist', () => {
    const meeting = makeMeeting({
      agenda_items: [
        { type: 'goal_management', title: 'T1', duration: 20, owner: 'A', material_link: 'https://kms/1' },
        { type: 'budget_finance', title: 'T2', duration: 20, owner: 'B', material_link: 'https://kms/2' },
      ],
    });
    const reviewScores = {
      'https://kms/1': { maxScore: 80 },
      'https://kms/2': { maxScore: 50 },
    };

    const result = calculateAutoScore(meeting, nextDayEval, reviewScores);

    // avg = (80 + 50) / 2 = 65 => 0.65 * 17.5 = 11.375 ≈ 11.4
    expect(result.subScores.materialReviewScore).toBeCloseTo(11.4, 1);
  });

  it('falls back to diagnostic pass rate when no material review scores exist', () => {
    const meeting = makeMeeting({
      agenda_items: [
        { type: 'goal_management', title: 'T1', duration: 20, owner: 'A', material_link: 'https://kms/1' },
        { type: 'budget_finance', title: 'T2', duration: 20, owner: 'B', material_link: 'https://kms/2' },
      ],
    });

    const result = calculateAutoScore(meeting, nextDayEval, {});

    // no scores => pass rate 0 => 0
    expect(result.subScores.materialReviewScore).toBe(0);
  });

  it('calculates during-stage with partial completion', () => {
    const meeting = makeMeeting({
      pipeline: { meetingHeld: true },
      host: '主持人',
      recorder: '记录人',
      agenda_items: [
        { type: 'goal_management', title: 'T1', duration: 120, owner: 'A', material_link: '' },
      ],
      hasMinutes: false,
    });

    const result = calculateAutoScore(meeting, nextDayEval);

    // effectiveDiscussion: held 6 + no minutes 0 + owner present 3 = 9
    expect(result.subScores.effectiveDiscussion).toBeCloseTo(9, 1);
    // participation: held 6 + unique participants 3 (host, recorder, owner) => 6 + 3*1.5 = 10.5
    expect(result.subScores.participation).toBeCloseTo(10.5, 1);
    // timeControl: held but duration 120 > 180? no, <=180 => 6
    expect(result.subScores.timeControl).toBeCloseTo(6, 1);
    expect(result.dimensions.during).toBeCloseTo(25.5, 1);
  });

  it('penalizes long meetings on time control', () => {
    const meeting = makeMeeting({
      pipeline: { meetingHeld: true },
      agenda_items: [
        { type: 'goal_management', title: 'T1', duration: 200, owner: 'A', material_link: '' },
      ],
    });

    const result = calculateAutoScore(meeting, nextDayEval);

    expect(result.subScores.timeControl).toBeCloseTo(3, 1);
  });

  it('caps resolution and action score at 30', () => {
    const meeting = makeMeeting({
      decisions: [{}, {}, {}, {}, {}],
      actions: [{}, {}, {}, {}, {}],
    });

    const result = calculateAutoScore(meeting, sameDayEval);

    expect(result.subScores.resolutionAndAction).toBe(30);
    expect(result.subScores.timeliness).toBe(5);
    expect(result.dimensions.after).toBe(35);
  });

  it('gives zero timeliness bonus when evaluated on a different day', () => {
    const meeting = makeMeeting({
      decisions: [{}],
      actions: [{}],
    });

    const result = calculateAutoScore(meeting, nextDayEval);

    expect(result.subScores.resolutionAndAction).toBe(10);
    expect(result.subScores.timeliness).toBe(0);
    expect(result.dimensions.after).toBe(10);
  });

  it('applies postponement deduction to overall score', () => {
    const meeting = makeMeeting({
      pipeline: { meetingHeld: true },
      host: '主持人',
      recorder: '记录人',
      agenda_items: [
        { type: 'goal_management', title: 'T1', duration: 30, owner: 'A', material_link: '' },
      ],
      hasMinutes: true,
      hasPostponedAgenda: true,
    });

    const result = calculateAutoScore(meeting, sameDayEval);

    expect(result.subScores.postponementDeduction).toBe(-5);
    // before ≈ 2.6, during = 28.5, after = 5, deduction -5 => overall ≈ 31
    expect(result.overallScore).toBeCloseTo(31, 0);
  });

  it('does not allow overall score below 0', () => {
    const meeting = makeMeeting({ hasPostponedAgenda: true });
    const result = calculateAutoScore(meeting, nextDayEval);
    expect(result.overallScore).toBe(0);
    expect(result.subScores.postponementDeduction).toBe(-5);
  });

  it('applies postponement deduction when an agenda status is postponed', () => {
    const meeting = makeMeeting({
      agenda_items: [
        { type: 'goal_management', title: 'T1', duration: 30, owner: 'A', status: 'postponed' },
      ],
    });

    const result = calculateAutoScore(meeting, nextDayEval);

    expect(result.subScores.postponementDeduction).toBe(-5);
    expect(result.overallScore).toBe(0);
  });

  it('applies postponement deduction only once for multiple postponed agendas', () => {
    const meeting = makeMeeting({
      agenda_items: [
        { type: 'goal_management', title: 'T1', duration: 30, status: 'postponed' },
        { type: 'budget_finance', title: 'T2', duration: 30, status: 'postponed' },
      ],
    });

    const result = calculateAutoScore(meeting, nextDayEval);

    expect(result.subScores.postponementDeduction).toBe(-5);
  });

  it('does not apply postponement deduction when no agenda is postponed', () => {
    const meeting = makeMeeting({
      agenda_items: [
        { type: 'goal_management', title: 'T1', duration: 30, status: 'planned' },
        { type: 'budget_finance', title: 'T2', duration: 30, status: 'completed' },
      ],
    });

    const result = calculateAutoScore(meeting, nextDayEval);

    expect(result.subScores.postponementDeduction).toBe(0);
  });
});

describe('getScoreColor', () => {
  it('returns success color for scores >= 90', () => {
    expect(getScoreColor(90)).toBe('var(--success)');
    expect(getScoreColor(100)).toBe('var(--success)');
  });

  it('returns primary color for scores 75-89', () => {
    expect(getScoreColor(75)).toBe('var(--primary)');
    expect(getScoreColor(89)).toBe('var(--primary)');
  });

  it('returns warning color for scores 60-74', () => {
    expect(getScoreColor(60)).toBe('var(--warning)');
    expect(getScoreColor(74)).toBe('var(--warning)');
  });

  it('returns danger color for scores < 60', () => {
    expect(getScoreColor(59)).toBe('var(--danger)');
    expect(getScoreColor(0)).toBe('var(--danger)');
  });
});

describe('getScoreLabel', () => {
  it('returns 优秀 for scores >= 90', () => {
    expect(getScoreLabel(90)).toBe('优秀');
    expect(getScoreLabel(100)).toBe('优秀');
  });

  it('returns 良好 for scores 75-89', () => {
    expect(getScoreLabel(75)).toBe('良好');
    expect(getScoreLabel(89)).toBe('良好');
  });

  it('returns 及格 for scores 60-74', () => {
    expect(getScoreLabel(60)).toBe('及格');
    expect(getScoreLabel(74)).toBe('及格');
  });

  it('returns 待改进 for scores < 60', () => {
    expect(getScoreLabel(59)).toBe('待改进');
    expect(getScoreLabel(0)).toBe('待改进');
  });
});
