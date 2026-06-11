import { describe, it, expect, beforeEach } from 'vitest';
import { getMaterialScore, getScoreColor, getScoreLabel } from '../../src/meetings/utils/helpers.js';

describe('getScoreColor', () => {
  it('returns success for scores >= 80', () => {
    expect(getScoreColor(80)).toBe('var(--success)');
    expect(getScoreColor(100)).toBe('var(--success)');
  });

  it('returns warning for scores 60-79', () => {
    expect(getScoreColor(60)).toBe('var(--warning)');
    expect(getScoreColor(79)).toBe('var(--warning)');
  });

  it('returns danger for scores < 60', () => {
    expect(getScoreColor(59)).toBe('var(--danger)');
    expect(getScoreColor(0)).toBe('var(--danger)');
  });

  it('returns tertiary for null/undefined', () => {
    expect(getScoreColor(null)).toBe('var(--text-tertiary)');
    expect(getScoreColor(undefined)).toBe('var(--text-tertiary)');
  });
});

describe('getScoreLabel', () => {
  it('returns 卓越 for scores >= 90', () => {
    expect(getScoreLabel(90)).toBe('卓越');
    expect(getScoreLabel(100)).toBe('卓越');
  });

  it('returns 良好 for scores 80-89', () => {
    expect(getScoreLabel(80)).toBe('良好');
    expect(getScoreLabel(89)).toBe('良好');
  });

  it('returns 合格 for scores 60-79', () => {
    expect(getScoreLabel(60)).toBe('合格');
    expect(getScoreLabel(79)).toBe('合格');
  });

  it('returns 待改进 for scores < 60', () => {
    expect(getScoreLabel(59)).toBe('待改进');
    expect(getScoreLabel(0)).toBe('待改进');
  });

  it('returns 未评估 for null/undefined', () => {
    expect(getScoreLabel(null)).toBe('未评估');
    expect(getScoreLabel(undefined)).toBe('未评估');
  });
});

describe('getMaterialScore', () => {
  const createMockStorage = (data) => ({
    getItem: (key) => (key === 'dste_review_scores' ? JSON.stringify(data) : null),
  });
  const emptyStorage = { getItem: () => null };

  it('returns null for empty url', () => {
    expect(getMaterialScore('', emptyStorage)).toBeNull();
    expect(getMaterialScore(null, emptyStorage)).toBeNull();
    expect(getMaterialScore(undefined, emptyStorage)).toBeNull();
  });

  it('returns null when no review scores in storage', () => {
    expect(getMaterialScore('https://example.com/doc', emptyStorage)).toBeNull();
  });

  it('returns score when url exists in storage', () => {
    const storage = createMockStorage({
      'https://example.com/doc1': { maxScore: 85 },
      'https://example.com/doc2': { maxScore: 92 },
    });

    expect(getMaterialScore('https://example.com/doc1', storage)).toBe(85);
    expect(getMaterialScore('https://example.com/doc2', storage)).toBe(92);
  });

  it('returns null for unknown url', () => {
    const storage = createMockStorage({ 'https://example.com/doc1': { maxScore: 85 } });

    expect(getMaterialScore('https://example.com/unknown', storage)).toBeNull();
  });

  it('returns null when storage data is corrupted', () => {
    const badStorage = { getItem: () => 'invalid-json' };
    expect(getMaterialScore('https://example.com/doc', badStorage)).toBeNull();
  });

  it('uses default global localStorage when storage not provided', () => {
    // Should not throw even when global localStorage is undefined in Node
    expect(() => getMaterialScore('https://example.com/doc')).not.toThrow();
  });
});
