import { describe, it, expect, beforeEach } from 'vitest';
import {
  getReportAssets,
  saveReportAssets,
  computeMeetingReadiness,
} from '../../src/meetings/utils/helpers.js';

const mockStorage = (data = {}) => ({
  getItem: (key) => (key in data ? data[key] : null),
  setItem: (key, val) => { data[key] = val; },
});

describe('getReportAssets', () => {
  it('returns empty object when no assets stored', () => {
    expect(getReportAssets(mockStorage())).toEqual({});
  });

  it('returns parsed assets map', () => {
    const storage = mockStorage({
      dste_report_assets: JSON.stringify({
        ra_001: { id: 'ra_001', name: '销售看板', url: 'https://fr.example.com/1' },
      }),
    });
    expect(getReportAssets(storage)).toEqual({
      ra_001: { id: 'ra_001', name: '销售看板', url: 'https://fr.example.com/1' },
    });
  });

  it('returns empty object for corrupted storage', () => {
    const storage = mockStorage({ dste_report_assets: 'invalid-json' });
    expect(getReportAssets(storage)).toEqual({});
  });
});

describe('saveReportAssets', () => {
  it('saves assets to storage', () => {
    const storage = mockStorage();
    saveReportAssets({ ra_002: { id: 'ra_002' } }, storage);
    expect(JSON.parse(storage.getItem('dste_report_assets'))).toEqual({
      ra_002: { id: 'ra_002' },
    });
  });

  it('does not throw when storage is null', () => {
    expect(() => saveReportAssets({})).not.toThrow();
  });
});

describe('computeMeetingReadiness', () => {
  it('returns ready when all required checks pass', () => {
    const meeting = {
      pre_report_id: 'ar_001',
      agenda_items: [
        {
          title: '销售达成分析',
          data_views: ['ra_001'],
          material_link: 'https://kms.example.com/doc1',
        },
      ],
    };
    const reportAssets = {
      ra_001: { id: 'ra_001', name: '销售看板' },
    };
    const reviewScores = {
      'https://kms.example.com/doc1': { maxScore: 85 },
    };

    const result = computeMeetingReadiness(meeting, reportAssets, reviewScores);

    expect(result.percentage).toBe(100);
    expect(result.passedCount).toBe(3);
    expect(result.totalCount).toBe(3);
    expect(result.allPassed).toBe(true);
    expect(result.status).toBe('ready');
  });

  it('returns pending when no required data exists', () => {
    const meeting = {
      agenda_items: [],
    };

    const result = computeMeetingReadiness(meeting);

    expect(result.percentage).toBe(0); // pre_report failed
    expect(result.passedCount).toBe(0);
    expect(result.totalCount).toBe(1);
    expect(result.allPassed).toBe(false);
    expect(result.status).toBe('pending');
  });

  it('detects missing report asset', () => {
    const meeting = {
      pre_report_id: 'ar_001',
      agenda_items: [
        { title: '分析', data_views: ['ra_missing'] },
      ],
    };

    const result = computeMeetingReadiness(meeting, {}, {});

    const reportCheck = result.checks.find(c => c.key === 'topic_report_0');
    expect(reportCheck.passed).toBe(false);
    expect(reportCheck.detail).toBe('1 个报表未注册');
    expect(result.allPassed).toBe(false);
  });

  it('detects unreviewed material', () => {
    const meeting = {
      pre_report_id: 'ar_001',
      agenda_items: [
        { title: '分析', material_link: 'https://kms.example.com/doc1' },
      ],
    };

    const result = computeMeetingReadiness(meeting);

    const materialCheck = result.checks.find(c => c.key === 'material_0');
    expect(materialCheck.passed).toBe(false);
    expect(materialCheck.detail).toBe('未诊断');
  });

  it('detects material score below passing threshold', () => {
    const meeting = {
      pre_report_id: 'ar_001',
      agenda_items: [
        { title: '分析', material_link: 'https://kms.example.com/doc1' },
      ],
    };
    const reviewScores = {
      'https://kms.example.com/doc1': { maxScore: 55 },
    };

    const result = computeMeetingReadiness(meeting, {}, reviewScores);

    const materialCheck = result.checks.find(c => c.key === 'material_0');
    expect(materialCheck.passed).toBe(false);
    expect(materialCheck.detail).toBe('55分');
  });

  it('handles meeting with no agenda items', () => {
    const meeting = { pre_report_id: 'ar_001' };

    const result = computeMeetingReadiness(meeting);

    expect(result.percentage).toBe(100); // only required check is pre_report
    expect(result.passedCount).toBe(1);
    expect(result.totalCount).toBe(1);
    expect(result.allPassed).toBe(true);
    expect(result.status).toBe('ready');
  });

  it('marks in_progress when partial readiness', () => {
    const meeting = {
      pre_report_id: 'ar_001',
      agenda_items: [
        { title: '分析', data_views: ['ra_001'], material_link: 'https://kms.example.com/doc1' },
      ],
    };
    const reportAssets = { ra_001: { id: 'ra_001' } };
    // material not reviewed

    const result = computeMeetingReadiness(meeting, reportAssets, {});

    expect(result.percentage).toBe(67); // 2 passed / 3 required
    expect(result.passedCount).toBe(2);
    expect(result.totalCount).toBe(3);
    expect(result.status).toBe('in_progress');
  });

  it('skips checks for agenda items without data_views or material_link', () => {
    const meeting = {
      pre_report_id: 'ar_001',
      agenda_items: [{ title: '无关联' }],
    };

    const result = computeMeetingReadiness(meeting);

    expect(result.totalCount).toBe(1); // only pre_report is required
    expect(result.passedCount).toBe(1);
    expect(result.allPassed).toBe(true);
  });

  it('returns ready when only optional check fails and no required checks fail', () => {
    const meeting = {
      pre_report_id: 'ar_001',
      agenda_items: [{ title: '分析', material_link: 'https://kms.example.com/doc1' }],
    };
    const reviewScores = { 'https://kms.example.com/doc1': { maxScore: 90 } };

    const result = computeMeetingReadiness(meeting, {}, reviewScores);

    expect(result.percentage).toBe(100); // 2 required passed / 2 required
    expect(result.passedCount).toBe(2);
    expect(result.totalCount).toBe(2);
    expect(result.allPassed).toBe(true);
    expect(result.status).toBe('ready');
  });
});
