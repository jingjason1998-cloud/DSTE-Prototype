import { describe, it, expect, vi, beforeEach } from 'vitest';

const storageMap = new Map();

const mockStorage = {
  getString: (key) => storageMap.get(key) || '',
  set: (key, val) => { storageMap.set(key, JSON.stringify(val)); return true; },
  setString: (key, val) => { storageMap.set(key, val); return true; },
  get: (key, defaultValue) => {
    const raw = storageMap.get(key);
    if (raw === undefined || raw === '') return defaultValue;
    try { return JSON.parse(raw); }
    catch (e) { return defaultValue; }
  },
  remove: (key) => { storageMap.delete(key); return true; },
  getKeys: (prefix = '') => {
    const keys = [];
    for (const key of storageMap.keys()) {
      if (key.startsWith(prefix)) keys.push(key);
    }
    return keys;
  },
};

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let mockedMeetings = [];

vi.mock('../../src/lib/utils.js', () => ({ Storage: mockStorage, escapeHtml }));
vi.mock('../../src/meetings/data-store.js', () => ({
  getMeetings: () => mockedMeetings,
}));

// Provide browser globals before module evaluation
globalThis.window = {
  location: { hostname: 'localhost' },
};
globalThis.fetch = vi.fn();

const {
  getAiAgendaApiUrl,
  getOpenResolutions,
  getOmpKeyWorks,
  buildRecommendationContext,
  recommendAgenda,
  candidateToAgendaItem,
  getAgendaTypeLabel,
  getSourceTypeLabel,
} = await import('../../src/meetings/utils/agenda-recommender.js');

describe('agenda-recommender', () => {
  beforeEach(() => {
    storageMap.clear();
    mockedMeetings = [];
    fetch.mockReset();
  });

  describe('getAiAgendaApiUrl', () => {
    it('returns reviewer proxy url when meetingReviewerProxyUrl is set', () => {
      window.location.hostname = 'localhost';
      storageMap.set('meetingReviewerProxyUrl', 'http://localhost:9999/');
      expect(getAiAgendaApiUrl()).toBe('http://localhost:9999/api/ai/agenda');
    });

    it('returns dste_api_base when set', () => {
      window.location.hostname = 'localhost';
      storageMap.set('dste_api_base', 'http://localhost:8787/');
      expect(getAiAgendaApiUrl()).toBe('http://localhost:8787/api/ai/agenda');
    });

    it('returns production worker by default', () => {
      window.location.hostname = 'localhost';
      expect(getAiAgendaApiUrl()).toBe('https://dste-api.jasonxspace.workers.dev/api/ai/agenda');
    });

    it('returns production worker on non-localhost', () => {
      window.location.hostname = 'dste.fineres.com';
      expect(getAiAgendaApiUrl()).toBe('https://dste-api.jasonxspace.workers.dev/api/ai/agenda');
    });
  });

  describe('getOpenResolutions', () => {
    it('returns only non-closed resolutions', () => {
      storageMap.set('dste_resolutions_v2', JSON.stringify({
        resolutions: [
          { id: 'R1', content: 'Open one', status: 'pending' },
          { id: 'R2', content: 'Closed one', status: 'closed' },
        ],
      }));
      const result = getOpenResolutions();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('R1');
    });

    it('returns empty array when storage missing', () => {
      expect(getOpenResolutions()).toEqual([]);
    });
  });

  describe('getOmpKeyWorks', () => {
    it('returns active tasks with mapped fields', () => {
      storageMap.set('dste_omp_tasks_v1', JSON.stringify([
        { id: 'T1', title: 'Key work 1', status: 'in_progress', deadline: '2026-06-30', riskLevel: 'high', owner: '运营部' },
        { id: 'T2', title: 'Completed', status: 'completed' },
        { id: 'T3', title: 'Cancelled', status: 'cancelled' },
      ]));
      const result = getOmpKeyWorks();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Key work 1');
      expect(result[0].riskLevel).toBe('high');
    });
  });

  describe('buildRecommendationContext', () => {
    it('includes historical agendas from same scenario excluding current meeting', () => {
      mockedMeetings = [
        { id: 'M1', title: 'May HQ', date: '2026-05-15', scenario: 'hq_routine', agenda_items: [{ title: '财务复盘', type: 'budget_finance', duration: 30, owner: '财务部' }] },
        { id: 'M2', title: 'Apr HQ', date: '2026-04-15', scenario: 'hq_routine', agenda_items: [{ title: 'KPI 分析', type: 'goal_management', duration: 25, owner: '运营部' }] },
        { id: 'M3', title: 'Other', date: '2026-05-20', scenario: 'region_routine', agenda_items: [{ title: '区域分析', type: 'business_special', duration: 20, owner: '战区' }] },
      ];
      const meeting = { id: 'M4', title: 'Jun HQ', scenario: 'hq_routine', date: '2026-06-15', agenda_items: [] };
      const ctx = buildRecommendationContext(meeting);
      expect(ctx.historicalAgendas).toHaveLength(2);
      expect(ctx.historicalAgendas[0].title).toBe('财务复盘');
    });

    it('excludes historical agendas similar to existing agenda titles', () => {
      mockedMeetings = [
        { id: 'M1', title: 'May HQ', date: '2026-05-15', scenario: 'hq_routine', agenda_items: [{ title: '财务复盘', type: 'budget_finance', duration: 30, owner: '财务部' }] },
      ];
      const meeting = {
        id: 'M2',
        title: 'Jun HQ',
        scenario: 'hq_routine',
        date: '2026-06-15',
        agenda_items: [{ title: '财务复盘', type: 'budget_finance', duration: 30 }],
      };
      const ctx = buildRecommendationContext(meeting);
      expect(ctx.historicalAgendas).toHaveLength(0);
    });

    it('includes postponed agendas from current meeting', () => {
      const meeting = {
        id: 'M1',
        title: 'Jun HQ',
        scenario: 'hq_routine',
        date: '2026-06-15',
        agenda_items: [
          { id: 'A1', title: '延迟议题', status: 'postponed', postponedCount: 2, type: 'business_special' },
          { id: 'A2', title: '正常议题', status: 'planned', type: 'goal_management' },
        ],
      };
      const ctx = buildRecommendationContext(meeting);
      expect(ctx.postponedAgendas).toHaveLength(1);
      expect(ctx.postponedAgendas[0].title).toBe('延迟议题');
    });

    it('includes open actions across meetings', () => {
      mockedMeetings = [
        { id: 'M1', title: 'May', date: '2026-05-15', scenario: 'hq_routine', actions: [
          { id: 'ACT1', content: '完成回款目标', owner: '李经理', deadline: '2026-06-20', status: 'in_progress' },
          { id: 'ACT2', content: '已完成任务', owner: '王', deadline: '2026-06-20', status: 'completed' },
        ]},
      ];
      const meeting = { id: 'M2', title: 'Jun', scenario: 'hq_routine', date: '2026-06-15', agenda_items: [] };
      const ctx = buildRecommendationContext(meeting);
      expect(ctx.openActions).toHaveLength(1);
      expect(ctx.openActions[0].content).toBe('完成回款目标');
    });

    it('includes theme when provided', () => {
      const meeting = { id: 'M1', title: 'Jun', scenario: 'hq_routine', date: '2026-06-15', agenda_items: [] };
      const ctx = buildRecommendationContext(meeting, { theme: '降本增效' });
      expect(ctx.theme).toBe('降本增效');
    });

    it('escapes HTML in context strings', () => {
      mockedMeetings = [
        { id: 'M1', title: 'May', date: '2026-05-15', scenario: 'hq_routine', agenda_items: [{ title: '<script>alert(1)</script>', type: 'other', duration: 10, owner: 'a<b' }] },
      ];
      const meeting = { id: 'M2', title: 'Jun', scenario: 'hq_routine', date: '2026-06-15', agenda_items: [] };
      const ctx = buildRecommendationContext(meeting);
      expect(ctx.historicalAgendas[0].title).toContain('&lt;');
      expect(ctx.historicalAgendas[0].title).not.toContain('<script>');
    });
  });

  describe('recommendAgenda', () => {
    it('uses production worker by default', async () => {
      window.location.hostname = 'localhost';
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, candidates: [{ id: 'c1', title: 'Test', type: 'other', duration: 20 }] }),
      });
      const result = await recommendAgenda({ title: 'Test' });
      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://dste-api.jasonxspace.workers.dev/api/ai/agenda',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('uses dste_api_base when configured', async () => {
      window.location.hostname = 'localhost';
      storageMap.set('dste_api_base', 'http://localhost:8787');
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, candidates: [{ id: 'c1', title: 'Test', type: 'other', duration: 20 }] }),
      });
      const result = await recommendAgenda({ title: 'Test Meeting', scenario: 'hq_routine', agenda_items: [] });
      expect(result.success).toBe(true);
      expect(result.candidates).toHaveLength(1);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/ai/agenda',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('uses reviewer proxy url when configured', async () => {
      window.location.hostname = 'localhost';
      storageMap.set('meetingReviewerProxyUrl', 'http://localhost:9999');
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, candidates: [{ id: 'c1', title: 'Test', type: 'other', duration: 20 }] }),
      });
      const result = await recommendAgenda({ title: 'Test Meeting', scenario: 'hq_routine', agenda_items: [] });
      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:9999/api/ai/agenda',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('returns error on fetch failure', async () => {
      window.location.hostname = 'localhost';
      fetch.mockRejectedValueOnce(new Error('Network error'));
      const result = await recommendAgenda({ title: 'Test' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('returns timeout error on abort', async () => {
      window.location.hostname = 'localhost';
      const err = new Error('timeout');
      err.name = 'AbortError';
      fetch.mockRejectedValueOnce(err);
      const result = await recommendAgenda({ title: 'Test' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('超时');
    });
  });

  describe('candidateToAgendaItem', () => {
    it('maps candidate to standard agenda item', () => {
      const candidate = {
        id: 'c1',
        title: 'Test topic',
        type: 'key_task_management',
        duration: 25,
        owner: '张总',
        sourceType: 'open_action',
        sourceId: 'ACT1',
      };
      const item = candidateToAgendaItem(candidate);
      expect(item.title).toBe('Test topic');
      expect(item.type).toBe('key_task_management');
      expect(item.duration).toBe(25);
      expect(item.owner).toBe('张总');
      expect(item.status).toBe('planned');
      expect(item.postponedCount).toBe(0);
    });

    it('clamps invalid duration', () => {
      expect(candidateToAgendaItem({ title: 'A', duration: 0 }).duration).toBe(5);
      expect(candidateToAgendaItem({ title: 'A', duration: 999 }).duration).toBe(120);
      expect(candidateToAgendaItem({ title: 'A', duration: 'bad' }).duration).toBe(20);
    });

    it('defaults unknown type to other', () => {
      const item = candidateToAgendaItem({ title: 'A', type: 'unknown' });
      expect(item.type).toBe('other');
    });
  });

  describe('label helpers', () => {
    it('returns Chinese labels', () => {
      expect(getAgendaTypeLabel('budget_finance')).toBe('预算财务');
      expect(getSourceTypeLabel('postponed_agenda')).toBe('顺延议程');
      expect(getAgendaTypeLabel('unknown')).toBe('其他');
      expect(getSourceTypeLabel('unknown')).toBe('AI 推荐');
    });
  });
});
