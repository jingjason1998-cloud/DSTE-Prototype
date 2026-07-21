import { describe, it, expect } from 'vitest';
import {
  resolvePeriod,
  periodMatches,
  normalizeTheater,
  getKpiStatus,
  filterWarzoneKpis,
  compareTheaterKpi,
  rankBottomNByIndicator,
  applyThresholdFilters,
  evaluateRule,
  generateMeetingId,
  buildMeetingFromTemplate,
  executeRule,
  shouldRunScheduled,
  DEFAULT_WARZONES,
} from '../../src/pages/rule-engine/rule-engine-engine.js';

const INDICATORS = [
  { id: 'ind_sales_d', name: '销售额-D', unit: '万元' },
  { id: 'ind_profit', name: '利润', unit: '万元' },
];

function kpi(overrides = {}) {
  return {
    id: `kpi_${Math.random().toString(36).slice(2, 8)}`,
    indicatorId: 'ind_sales_d',
    period: '2026-06',
    dept: '北京大区',
    actualValue: 100,
    targetValue: 100,
    achievementRate: 100,
    ...overrides,
  };
}

function makeRule(overrides = {}) {
  return {
    id: 'rule_lg_001',
    name: '测试规则',
    enabled: true,
    version: '1.0.0',
    triggerMode: 'manual',
    schedule: { periodType: 'month', periodOffset: -1, dayOfMonth: 5, time: '09:00' },
    criteria: {
      indicatorIds: ['ind_sales_d'],
      rankingScope: 'warzone',
      rankingBottomN: 1,
      minAchievementRate: '',
      requireLaggingStatus: false,
    },
    action: {
      createMeeting: true,
      autoSave: false,
      meetingTemplate: {
        titleTemplate: '{theater} {period} {indicatorName} 业绩承诺会',
        level: 'L3',
        scenario: 'lagging_region',
        defaultHost: '',
        defaultRecorder: '',
        location: '待确认',
        agendaItems: [
          { type: 'budget_finance', title: '业绩差距根因分析', duration: 40, owner: '' },
        ],
      },
      notify: true,
      notifyWebhookId: '',
      notifyMentionAll: false,
    },
    ...overrides,
  };
}

describe('rule-engine-engine', () => {
  describe('resolvePeriod', () => {
    it('resolves month with offset -1', () => {
      const schedule = { periodType: 'month', periodOffset: -1 };
      const base = '2026-06';
      expect(resolvePeriod(schedule, base)).toBe('2026-05');
    });

    it('resolves month with offset 0', () => {
      const schedule = { periodType: 'month', periodOffset: 0 };
      const base = '2026-06';
      expect(resolvePeriod(schedule, base)).toBe('2026-06');
    });

    it('resolves quarter with offset', () => {
      const schedule = { periodType: 'quarter', periodOffset: -1 };
      const base = '2026-06';
      expect(resolvePeriod(schedule, base)).toBe('2026-Q1');
    });

    it('resolves year with offset', () => {
      const schedule = { periodType: 'year', periodOffset: -1 };
      const base = '2026-06';
      expect(resolvePeriod(schedule, base)).toBe('2025');
    });

    it('falls back to current month when base is invalid', () => {
      const schedule = { periodType: 'month', periodOffset: 0 };
      const result = resolvePeriod(schedule, 'invalid');
      // Invalid base falls through to current date; avoid asserting exact month
      expect(result).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('periodMatches', () => {
    it('matches identical periods', () => {
      expect(periodMatches('2026-06', '2026-06')).toBe(true);
    });

    it('trims whitespace', () => {
      expect(periodMatches(' 2026-06 ', '2026-06')).toBe(true);
    });

    it('rejects different periods', () => {
      expect(periodMatches('2026-06', '2026-07')).toBe(false);
    });
  });

  describe('normalizeTheater', () => {
    it('normalizes Chinese theater names', () => {
      expect(normalizeTheater('北京大区')).toBe('北京');
      expect(normalizeTheater('东北 大区')).toBe('东北');
      expect(normalizeTheater('华南（广州）大区')).toBe('华南');
    });
  });

  describe('getKpiStatus', () => {
    it('returns achieved when rate >= 100', () => {
      expect(getKpiStatus(100, 100)).toBe('achieved');
      expect(getKpiStatus(105, 100)).toBe('achieved');
    });

    it('returns warning when rate between 80 and 100', () => {
      expect(getKpiStatus(85, 100)).toBe('warning');
    });

    it('returns lagging when rate < 80', () => {
      expect(getKpiStatus(79, 100)).toBe('lagging');
    });
  });

  describe('filterWarzoneKpis', () => {
    it('filters by indicator, period, warzone and actual value', () => {
      const kpis = [
        kpi({ indicatorId: 'ind_sales_d', period: '2026-06', dept: '北京大区', actualValue: 80 }),
        kpi({ indicatorId: 'ind_profit', period: '2026-06', dept: '北京大区', actualValue: 80 }),
        kpi({ indicatorId: 'ind_sales_d', period: '2026-05', dept: '北京大区', actualValue: 80 }),
        kpi({ indicatorId: 'ind_sales_d', period: '2026-06', dept: '未知大区', actualValue: 80 }),
        kpi({ indicatorId: 'ind_sales_d', period: '2026-06', dept: '上海大区', actualValue: null }),
      ];
      const rule = makeRule();
      const result = filterWarzoneKpis(kpis, rule, '2026-06', DEFAULT_WARZONES);
      expect(result).toHaveLength(1);
      expect(result[0].dept).toBe('北京大区');
    });
  });

  describe('compareTheaterKpi', () => {
    it('sorts by achievement rate ascending', () => {
      const a = kpi({ achievementRate: 50 });
      const b = kpi({ achievementRate: 80 });
      expect(compareTheaterKpi(a, b)).toBeLessThan(0);
    });

    it('falls back to actual/target ratio', () => {
      const a = kpi({ achievementRate: 80, actualValue: 80, targetValue: 100 });
      const b = kpi({ achievementRate: 80, actualValue: 70, targetValue: 100 });
      expect(compareTheaterKpi(a, b)).toBeGreaterThan(0);
    });
  });

  describe('rankBottomNByIndicator', () => {
    it('returns bottom N by indicator', () => {
      const kpis = [
        kpi({ dept: '北京大区', achievementRate: 90 }),
        kpi({ dept: '上海大区', achievementRate: 80 }),
        kpi({ dept: '华南大区', achievementRate: 70 }),
        kpi({ dept: '东北大区', achievementRate: 60 }),
      ];
      const result = rankBottomNByIndicator(kpis, 2);
      expect(result.get('ind_sales_d')).toHaveLength(2);
      expect(result.get('ind_sales_d')[0].dept).toBe('东北大区');
      expect(result.get('ind_sales_d')[1].dept).toBe('华南大区');
    });
  });

  describe('applyThresholdFilters', () => {
    it('filters by min achievement rate', () => {
      const results = [
        { achievementRate: 70 },
        { achievementRate: 85 },
      ];
      expect(applyThresholdFilters(results, { minAchievementRate: 80 })).toHaveLength(1);
    });

    it('filters by lagging status', () => {
      const results = [
        { achievementRate: 70, actualValue: 70 },
        { achievementRate: 85, actualValue: 85 },
      ];
      expect(applyThresholdFilters(results, { requireLaggingStatus: true })).toHaveLength(1);
    });
  });

  describe('evaluateRule', () => {
    it('returns bottom N results per indicator', () => {
      const rule = makeRule({
        schedule: { periodType: 'month', periodOffset: 0, dayOfMonth: 5, time: '09:00' },
        criteria: {
          indicatorIds: ['ind_sales_d'],
          rankingBottomN: 1,
        },
      });
      const context = {
        kpiInstances: [
          kpi({ dept: '北京大区', achievementRate: 90, actualValue: 90, targetValue: 100 }),
          kpi({ dept: '上海大区', achievementRate: 60, actualValue: 60, targetValue: 100 }),
        ],
        indicators: INDICATORS,
        warzones: DEFAULT_WARZONES,
        basePeriod: '2026-06',
      };
      const results = evaluateRule(rule, context);
      expect(results).toHaveLength(1);
      expect(results[0].theater).toBe('上海大区');
      expect(results[0].rank).toBe(1);
    });

    it('returns empty when no matching KPIs', () => {
      const rule = makeRule();
      const context = { kpiInstances: [], indicators: INDICATORS, warzones: DEFAULT_WARZONES };
      expect(evaluateRule(rule, context)).toEqual([]);
    });
  });

  describe('generateMeetingId', () => {
    it('generates deterministic id', () => {
      const result = {
        period: '2026-06',
        indicatorId: 'ind_sales_d',
        theater: '东北大区',
      };
      const id1 = generateMeetingId(result, 'rule_lg_001');
      const id2 = generateMeetingId(result, 'rule_lg_001');
      expect(id1).toBe(id2);
      expect(id1).toMatch(/^lg_202606_indsalesd_东北_rulelg001$/);
    });
  });

  describe('buildMeetingFromTemplate', () => {
    it('builds meeting from result and rule', () => {
      const rule = makeRule();
      const result = {
        indicatorId: 'ind_sales_d',
        indicatorName: '销售额-D',
        theater: '东北大区',
        rank: 1,
        achievementRate: 60,
        actualValue: 60,
        targetValue: 100,
        period: '2026-06',
      };
      const meeting = buildMeetingFromTemplate(result, rule);
      expect(meeting.title).toBe('东北大区 2026-06 销售额-D 业绩承诺会');
      expect(meeting.scenario).toBe('lagging_region');
      expect(meeting.level).toBe('L3');
      expect(meeting.agenda_items).toHaveLength(1);
      expect(meeting._ruleGenerated).toBeDefined();
    });
  });

  describe('executeRule', () => {
    it('returns execution result with meetings', () => {
      const rule = makeRule();
      const context = {
        kpiInstances: [
          kpi({ dept: '北京大区', achievementRate: 90, actualValue: 90, targetValue: 100 }),
          kpi({ dept: '上海大区', achievementRate: 60, actualValue: 60, targetValue: 100 }),
        ],
        indicators: INDICATORS,
        warzones: DEFAULT_WARZONES,
      };
      const execution = executeRule(rule, context, { findById: () => null, findByMetadata: () => null });
      expect(execution.results).toHaveLength(1);
      expect(execution.results[0].status).toBe('draft');
      expect(execution.results[0].meeting).toBeDefined();
    });

    it('marks duplicate when meeting exists', () => {
      const rule = makeRule();
      const context = {
        kpiInstances: [
          kpi({ dept: '上海大区', achievementRate: 60, actualValue: 60, targetValue: 100 }),
        ],
        indicators: INDICATORS,
        warzones: DEFAULT_WARZONES,
      };
      const existing = { id: 'lg_202406_indsalesd_上海_rulelg001' };
      const execution = executeRule(rule, context, {
        findById: () => existing,
        findByMetadata: () => null,
      });
      expect(execution.results[0].status).toBe('skipped_duplicate');
    });
  });

  describe('shouldRunScheduled', () => {
    it('returns true when day reached and not run this period', () => {
      const rule = makeRule({ triggerMode: 'scheduled', schedule: { dayOfMonth: 5 } });
      const now = new Date('2026-06-10T10:00:00');
      expect(shouldRunScheduled(rule, now, {})).toBe(true);
    });

    it('returns false when rule disabled', () => {
      const rule = makeRule({ enabled: false, triggerMode: 'scheduled' });
      const now = new Date('2026-06-10T10:00:00');
      expect(shouldRunScheduled(rule, now, {})).toBe(false);
    });

    it('returns false when already run this period', () => {
      const rule = makeRule({ triggerMode: 'scheduled', schedule: { periodType: 'month', periodOffset: -1, dayOfMonth: 5 } });
      const now = new Date('2026-06-10T10:00:00');
      expect(shouldRunScheduled(rule, now, { 'rule_lg_001': '2026-05' })).toBe(false);
    });
  });
});
