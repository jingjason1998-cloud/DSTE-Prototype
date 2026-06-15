import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getReviewerScene,
  getReviewerProxyUrl,
  getMaterialReviewInfo,
  REVIEWER_SCENE_MAP,
} from '../../src/meetings/utils/reviewer.js';

// mock localStorage for Node test environment
const mockStorage = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key) => mockStorage[key] ?? null,
    setItem: (key, val) => { mockStorage[key] = val; },
    removeItem: (key) => { delete mockStorage[key]; },
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
    localStorage.setItem('dste_review_scores', JSON.stringify({
      'https://kms.example.com/page1': { maxScore: 82, lastReviewAt: 1718000000000 },
    }));
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
