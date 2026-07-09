import { describe, it, expect } from 'vitest';
import {
  getNextTopicSeq,
  renumberTopicsSeq,
  sortTopicsBySeq,
  isNaturalSeqOrder,
} from '../../src/pages/business-topics/seq-utils.js';

describe('business-topics seq-utils helpers', () => {
  describe('getNextTopicSeq', () => {
    it('returns 1 for empty array', () => {
      expect(getNextTopicSeq([])).toBe(1);
      expect(getNextTopicSeq(null)).toBe(1);
      expect(getNextTopicSeq(undefined)).toBe(1);
    });

    it('returns max seq + 1', () => {
      const topics = [{ id: 'a', seq: 3 }, { id: 'b', seq: 1 }, { id: 'c', seq: 2 }];
      expect(getNextTopicSeq(topics)).toBe(4);
    });

    it('treats missing seq as 0', () => {
      const topics = [{ id: 'a' }, { id: 'b', seq: 5 }];
      expect(getNextTopicSeq(topics)).toBe(6);
    });
  });

  describe('sortTopicsBySeq', () => {
    it('sorts by seq ascending then id', () => {
      const topics = [
        { id: 'z', seq: 1 },
        { id: 'a', seq: 3 },
        { id: 'm', seq: 2 },
      ];
      const result = sortTopicsBySeq(topics);
      expect(result.map(t => t.id)).toEqual(['z', 'm', 'a']);
    });

    it('treats missing seq as 0', () => {
      const topics = [
        { id: 'a', seq: 2 },
        { id: 'b' },
      ];
      const result = sortTopicsBySeq(topics);
      expect(result.map(t => t.id)).toEqual(['b', 'a']);
    });
  });

  describe('renumberTopicsSeq', () => {
    it('assigns contiguous seq starting from 1 in current order', () => {
      const topics = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
      const result = renumberTopicsSeq(topics);
      expect(result.map(t => t.seq)).toEqual([1, 2, 3]);
      expect(result[0].id).toBe('a');
    });

    it('does not reorder items', () => {
      const topics = [
        { id: 'a', seq: 5 },
        { id: 'b', seq: 1 },
        { id: 'c', seq: 10 },
      ];
      const result = renumberTopicsSeq(topics);
      expect(result.map(t => ({ id: t.id, seq: t.seq }))).toEqual([
        { id: 'a', seq: 1 },
        { id: 'b', seq: 2 },
        { id: 'c', seq: 3 },
      ]);
    });

    it('returns non-array input unchanged', () => {
      expect(renumberTopicsSeq(null)).toBe(null);
      expect(renumberTopicsSeq(undefined)).toBe(undefined);
    });
  });
});

describe('business-topics seq-utils natural order', () => {
  describe('isNaturalSeqOrder', () => {
    it('returns true only for seq asc', () => {
      expect(isNaturalSeqOrder({ field: 'seq', direction: 'asc' })).toBe(true);
    });

    it('returns false for other fields or directions', () => {
      expect(isNaturalSeqOrder({ field: 'seq', direction: 'desc' })).toBe(false);
      expect(isNaturalSeqOrder({ field: 'priority', direction: 'asc' })).toBe(false);
      expect(isNaturalSeqOrder({ field: 'priority', direction: 'desc' })).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isNaturalSeqOrder(null)).toBe(false);
      expect(isNaturalSeqOrder(undefined)).toBe(false);
    });
  });
});

describe('business-topics seq-utils move simulation', () => {
  it('swapping seq values of adjacent items moves them visually when sorted', () => {
    const topics = [
      { id: 'a', seq: 1 },
      { id: 'b', seq: 2 },
      { id: 'c', seq: 3 },
    ];
    // move 'a' down by swapping seq with 'b'
    const tempSeq = topics[0].seq;
    topics[0].seq = topics[1].seq;
    topics[1].seq = tempSeq;
    // sort by seq to simulate renderTable
    topics.sort((a, b) => a.seq - b.seq);
    expect(topics.map(t => ({ id: t.id, seq: t.seq }))).toEqual([
      { id: 'b', seq: 1 },
      { id: 'a', seq: 2 },
      { id: 'c', seq: 3 },
    ]);
  });

  it('keeps contiguous seq after deleting a middle item', () => {
    const topics = [
      { id: 'a', seq: 1 },
      { id: 'b', seq: 2 },
      { id: 'c', seq: 3 },
    ].filter(t => t.id !== 'b');
    renumberTopicsSeq(topics);
    expect(topics.map(t => ({ id: t.id, seq: t.seq }))).toEqual([
      { id: 'a', seq: 1 },
      { id: 'c', seq: 2 },
    ]);
  });
});
