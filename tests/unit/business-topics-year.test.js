import { describe, it, expect } from 'vitest';
import { getTopicYears, getAllYearsFromTopics } from '../../src/pages/business-topics/year-utils.js';

describe('business-topics year-utils', () => {
  describe('getTopicYears', () => {
    it('extracts year from topic.year field', () => {
      const years = getTopicYears({ year: '2024' });
      expect(Array.from(years)).toContain('2024');
    });

    it('extracts years from startDate and endDate', () => {
      const years = getTopicYears({
        startDate: '2024-03-01',
        endDate: '2024-12-31',
      });
      expect(Array.from(years)).toEqual(['2024']);
    });

    it('fills years across startDate/endDate range', () => {
      const years = getTopicYears({
        startDate: '2024-09-01',
        endDate: '2025-03-31',
      });
      expect(Array.from(years).sort()).toEqual(['2024', '2025']);
    });

    it('handles numeric year field', () => {
      const years = getTopicYears({ year: 2024, startDate: '2024-01-01' });
      expect(Array.from(years)).toContain('2024');
    });

    it('returns empty set when no year info is available', () => {
      const years = getTopicYears({});
      expect(years.size).toBe(0);
    });

    it('merges year, startDate and endDate together', () => {
      const years = getTopicYears({
        year: '2026',
        startDate: '2024-01-01',
        endDate: '2025-12-31',
      });
      expect(Array.from(years).sort()).toEqual(['2024', '2025', '2026']);
    });
  });

  describe('getAllYearsFromTopics', () => {
    it('returns unique years sorted descending', () => {
      const topics = [
        { year: '2024' },
        { year: '2026' },
        { year: '2025' },
      ];
      expect(getAllYearsFromTopics(topics)).toEqual(['2026', '2025', '2024']);
    });

    it('includes years inferred from startDate/endDate when year field is missing', () => {
      const topics = [
        { year: '2026' },
        { startDate: '2024-03-01', endDate: '2024-12-31' },
      ];
      expect(getAllYearsFromTopics(topics)).toEqual(['2026', '2024']);
    });

    it('returns empty array for empty input', () => {
      expect(getAllYearsFromTopics([])).toEqual([]);
      expect(getAllYearsFromTopics(null)).toEqual([]);
      expect(getAllYearsFromTopics(undefined)).toEqual([]);
    });
  });
});
