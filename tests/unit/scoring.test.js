import { describe, it, expect } from 'vitest';
import { calculateAutoScore, getScoreColor, getScoreLabel } from '../../src/meetings/utils/scoring.js';

describe('calculateAutoScore', () => {
  it('returns perfect score for fully completed meeting', () => {
    const meeting = {
      pipeline: {
        reportGenerated: true,
        preReviewDone: true,
        meetingHeld: true,
        minutesDrafted: true,
        minutesApproved: true,
        actionsTracked: true,
      },
      metrics: {
        materialTimeliness: 100,
        resolutionTimeliness: 100,
        actionClosure: 100,
      },
      agenda_items: [{}, {}],
      decisions: [
        { status: 'approved', kmsUrl: 'https://kms.example.com/doc/1' },
        { status: 'implemented', kmsUrl: 'https://kms.example.com/doc/2' },
      ],
      hasMinutes: true,
      minutesStatus: 'final',
    };

    const result = calculateAutoScore(meeting);

    expect(result.overallScore).toBe(100);
    expect(result.dimensions.preparation).toBe(100);
    expect(result.dimensions.discussion).toBe(100);
    expect(result.dimensions.decision).toBe(100);
    expect(result.dimensions.execution).toBe(100);
    expect(result.feedback).toContain('材料充分');
    expect(result.feedback).toContain('议程合理');
    expect(result.feedback).toContain('决议明确');
    expect(result.feedback).toContain('闭环到位');
    expect(result.auto).toBe(true);
  });

  it('flags issues for incomplete meeting with no data', () => {
    const meeting = {
      pipeline: {},
      metrics: {},
      agenda_items: [],
      decisions: [],
      hasMinutes: false,
      minutesStatus: null,
    };

    const result = calculateAutoScore(meeting);

    expect(result.dimensions.preparation).toBeLessThan(60);
    expect(result.dimensions.discussion).toBe(60);
    expect(result.dimensions.decision).toBe(0);
    expect(result.dimensions.execution).toBeLessThan(60);
    expect(result.feedback).toContain('数据不足');
    expect(result.feedback).toContain('决议模糊');
    expect(result.feedback).toContain('缺乏跟进');
    expect(result.auto).toBe(true);
  });

  it('calculates preparation correctly based on material timeliness', () => {
    const meeting = {
      pipeline: { preReviewDone: false },
      metrics: { materialTimeliness: 80 },
      agenda_items: [],
      decisions: [],
      hasMinutes: false,
    };

    const result = calculateAutoScore(meeting);
    // 80 * 0.8 + 0 = 64
    expect(result.dimensions.preparation).toBe(64);
  });

  it('caps preparation at 100 even with high metrics', () => {
    const meeting = {
      pipeline: { preReviewDone: true },
      metrics: { materialTimeliness: 100 },
      agenda_items: [],
      decisions: [],
      hasMinutes: false,
    };

    const result = calculateAutoScore(meeting);
    // 100 * 0.8 + 20 = 100, capped at 100
    expect(result.dimensions.preparation).toBe(100);
  });

  it('calculates discussion with partial completion', () => {
    const meeting = {
      pipeline: { meetingHeld: true },
      metrics: {},
      agenda_items: [{}],
      decisions: [],
      hasMinutes: false,
    };

    const result = calculateAutoScore(meeting);
    // 60 + 10 (meetingHeld) + 10 (agenda) = 80
    expect(result.dimensions.discussion).toBe(80);
  });

  it('calculates decision quality with KMS and approval rates', () => {
    const meeting = {
      pipeline: {},
      metrics: { resolutionTimeliness: 80 },
      agenda_items: [],
      decisions: [
        { status: 'approved', kmsUrl: 'https://kms.example.com/doc/1' },
        { status: 'pending', kmsUrl: null },
      ],
      hasMinutes: false,
    };

    const result = calculateAutoScore(meeting);
    // KMS rate = 1/2 = 0.5, approved rate = 1/2 = 0.5
    // 80 * 0.6 + 0.5 * 20 + 0.5 * 20 = 48 + 10 + 10 = 68
    expect(result.dimensions.decision).toBe(68);
  });

  it('returns 0 for decision when no decisions exist', () => {
    const meeting = {
      pipeline: {},
      metrics: {},
      agenda_items: [],
      decisions: [],
      hasMinutes: false,
    };

    const result = calculateAutoScore(meeting);
    expect(result.dimensions.decision).toBe(0);
  });

  it('calculates execution with action closure rate', () => {
    const meeting = {
      pipeline: { actionsTracked: false },
      metrics: { actionClosure: 75 },
      agenda_items: [],
      decisions: [],
      hasMinutes: false,
    };

    const result = calculateAutoScore(meeting);
    // 75 * 0.8 + 0 = 60
    expect(result.dimensions.execution).toBe(60);
  });

  it('caps execution at 100', () => {
    const meeting = {
      pipeline: { actionsTracked: true },
      metrics: { actionClosure: 100 },
      agenda_items: [],
      decisions: [],
      hasMinutes: false,
    };

    const result = calculateAutoScore(meeting);
    // 100 * 0.8 + 20 = 100, capped at 100
    expect(result.dimensions.execution).toBe(100);
  });
});

describe('getScoreColor', () => {
  it('returns success color for scores >= 90', () => {
    expect(getScoreColor(90)).toBe('var(--success)');
    expect(getScoreColor(100)).toBe('var(--success)');
  });

  it('returns primary color for scores 75-89', () => {
    expect(getScoreColor(75)).toBe('var(--primary)');
    expect(getScoreColor(80)).toBe('var(--primary)');
  });

  it('returns warning color for scores 60-74', () => {
    expect(getScoreColor(60)).toBe('var(--warning)');
    expect(getScoreColor(70)).toBe('var(--warning)');
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
