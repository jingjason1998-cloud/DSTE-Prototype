import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getReviewerScene,
  getReviewerProxyUrl,
  getMaterialReviewInfo,
  reviewMaterial,
  getBatchReviewResults,
  persistReviewScores,
  reviewScoresRepo,
} from '../../src/meetings/utils/reviewer.js';

// mock localStorage for Node test environment
const mockStorage = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key) => mockStorage[key] ?? null,
    setItem: (key, val) => { mockStorage[key] = val; },
    removeItem: (key) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  },
  writable: true,
  configurable: true,
});

describe('getReviewerScene', () => {
  it('maps lagging_region to lagging-region-review', () => {
    expect(getReviewerScene('lagging_region')).toBe('lagging-region-review');
  });

  it('maps lagging_vertical to vertical-segment-review', () => {
    expect(getReviewerScene('lagging_vertical')).toBe('vertical-segment-review');
  });

  it('defaults to general-topic-review for unknown scenarios', () => {
    expect(getReviewerScene('union_quarterly')).toBe('general-topic-review');
    expect(getReviewerScene('hq_routine')).toBe('general-topic-review');
    expect(getReviewerScene('region_routine')).toBe('general-topic-review');
    expect(getReviewerScene('unknown')).toBe('general-topic-review');
  });
});

describe('getReviewerProxyUrl', () => {
  beforeEach(() => {
    localStorage.removeItem('meetingReviewerProxyUrl');
  });

  it('returns custom url from localStorage if set', () => {
    localStorage.setItem('meetingReviewerProxyUrl', 'http://custom:9999');
    expect(getReviewerProxyUrl()).toBe('http://custom:9999');
  });
});

describe('getMaterialReviewInfo', () => {
  beforeEach(() => {
    reviewScoresRepo.set({
      'https://kms.example.com/page1': { maxScore: 82, lastReviewAt: 1718000000000 },
    });
  });

  it('returns score info for reviewed material', () => {
    const info = getMaterialReviewInfo('https://kms.example.com/page1');
    expect(info.score).toBe(82);
    expect(info.lastReviewAt).toBe(1718000000000);
    expect(info.dimensionScores).toEqual({});
    expect(info.issues).toEqual([]);
  });

  it('returns null for unreviewed material', () => {
    expect(getMaterialReviewInfo('https://kms.example.com/unknown')).toBeNull();
  });

  it('returns null for empty url', () => {
    expect(getMaterialReviewInfo('')).toBeNull();
  });
});

describe('reviewMaterial', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('stores review score via Repository on success', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            success: true,
            total_score: 85,
            dimension_scores: { 完整性: 30 },
            issues: ['issue1'],
            report: 'test report',
          }),
      })
    );

    const result = await reviewMaterial('https://kms.example.com/page1', 'general-topic-review');
    expect(result.success).toBe(true);
    expect(result.score).toBe(85);

    const info = getMaterialReviewInfo('https://kms.example.com/page1');
    expect(info.score).toBe(85);
    expect(info.dimensionScores).toEqual({ 完整性: 30 });
    expect(info.issues).toEqual(['issue1']);
    expect(info.report).toBe('test report');
  });

  it('does not lower existing max score', async () => {
    reviewScoresRepo.set({
      'https://kms.example.com/page1': { maxScore: 90, lastReviewAt: 1000 },
    });

    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            success: true,
            total_score: 80,
          }),
      })
    );

    await reviewMaterial('https://kms.example.com/page1', 'general-topic-review');
    const info = getMaterialReviewInfo('https://kms.example.com/page1');
    expect(info.score).toBe(90);
  });
});

describe('getBatchReviewResults', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('updates review scores from batch results', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            success: true,
            results: [
              { url: 'https://kms.example.com/a', status: 'completed', total_score: 70 },
              { url: 'https://kms.example.com/b', status: 'completed', total_score: 88 },
              { url: 'https://kms.example.com/c', status: 'failed' },
            ],
          }),
      })
    );

    const result = await getBatchReviewResults(123);
    expect(result.success).toBe(true);

    expect(getMaterialReviewInfo('https://kms.example.com/a').score).toBe(70);
    expect(getMaterialReviewInfo('https://kms.example.com/b').score).toBe(88);
    expect(getMaterialReviewInfo('https://kms.example.com/c')).toBeNull();
  });
});

describe('persistReviewScores', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves the map to the repository', () => {
    const map = {
      'https://kms.example.com/page1': { maxScore: 77, lastReviewAt: 1000 },
      'https://kms.example.com/page2': { maxScore: 91, lastReviewAt: 2000 },
    };
    persistReviewScores(map);
    const stored = reviewScoresRepo.get();
    expect(stored['https://kms.example.com/page1'].maxScore).toBe(77);
    expect(stored['https://kms.example.com/page2'].maxScore).toBe(91);
  });

  it('round-trips through getMaterialReviewInfo', () => {
    persistReviewScores({
      'https://kms.example.com/x': { maxScore: 66, lastReviewAt: 1234, issues: ['a'] },
    });
    const info = getMaterialReviewInfo('https://kms.example.com/x');
    expect(info.score).toBe(66);
    expect(info.issues).toEqual(['a']);
  });
});
