import { describe, it, expect } from 'vitest';
import { validateAgendaCandidates, validateObject } from '../../api-worker/schema-validator.js';

describe('validateAgendaCandidates', () => {
  it('validates a complete candidate', () => {
    const result = validateAgendaCandidates({
      candidates: [{
        id: 'c1',
        title: 'Q1 复盘',
        type: 'goal_management',
        sourceType: 'theme',
        duration: 30,
        confidence: 0.9,
        owner: '张三',
        reason: '重要',
      }],
    });
    expect(result.valid).toBe(true);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].title).toBe('Q1 复盘');
  });

  it('rejects missing candidates array', () => {
    const result = validateAgendaCandidates({});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('candidates');
  });

  it('rejects invalid type', () => {
    const result = validateAgendaCandidates({
      candidates: [{ title: 'x', type: 'unknown', sourceType: 'theme', duration: 30, confidence: 0.5 }],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('type');
  });

  it('rejects out-of-range duration', () => {
    const result = validateAgendaCandidates({
      candidates: [{ title: 'x', type: 'other', sourceType: 'theme', duration: 200, confidence: 0.5 }],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('duration');
  });

  it('rejects out-of-range confidence', () => {
    const result = validateAgendaCandidates({
      candidates: [{ title: 'x', type: 'other', sourceType: 'theme', duration: 30, confidence: 1.5 }],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('confidence');
  });
});

describe('validateObject', () => {
  it('validates required fields', () => {
    const result = validateObject({ a: 'x', b: 1 }, { a: 'string', b: 'number' });
    expect(result.valid).toBe(true);
  });

  it('reports missing and wrong-type fields', () => {
    const result = validateObject({ a: 1 }, { a: 'string', b: 'number' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('a');
    expect(result.error).toContain('b');
  });
});
