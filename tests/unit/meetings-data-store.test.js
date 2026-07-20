import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---- shared mocks ----
const storageMap = new Map();
const stored = (key) => {
  const raw = storageMap.get(key);
  if (raw === undefined || raw === '') return undefined;
  try { return JSON.parse(raw); }
  catch (e) { return raw; }
};
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

const mockSyncResolutionsToStore = vi.fn();

vi.mock('../../src/lib/utils.js', () => ({ Storage: mockStorage }));
vi.mock('../../src/meetings/utils/resolution-helpers.js', () => ({
  normalizeResolution: (d, m) => ({ ...d, sourceMeetingId: m?.id, sourceMeetingTitle: m?.title }),
  syncResolutionsToStore: (...args) => mockSyncResolutionsToStore(...args),
}));

// Provide browser globals before data-store module is evaluated
globalThis.window = {
  location: { hostname: 'localhost' },
  _meetingsData: undefined,
  addEventListener: vi.fn(),
};
globalThis.document = { addEventListener: vi.fn() };
globalThis.fetch = vi.fn();

const {
  initDataStore,
  getMeetings,
  findMeetingById,
  setMeetings,
  addMeeting,
  updateMeeting,
  deleteMeetingByIndex,
  persistMeetings,
  loadRemoteMeetings,
  migrateMeetingsData,
  getMockMeetings,
} = await import('../../src/meetings/data-store.js');

describe('meetings data-store', () => {
  beforeEach(() => {
    storageMap.clear();
    window._meetingsData = undefined;
    mockSyncResolutionsToStore.mockClear();
    fetch.mockReset();
  });

  describe('initDataStore', () => {
    it('returns existing window._meetingsData if present', () => {
      const existing = [{ id: '1', title: 'Existing' }];
      window._meetingsData = existing;
      expect(initDataStore()).toBe(existing);
    });

    it('loads meetings from localStorage', () => {
      const stored = [{ id: '2', title: 'Stored' }];
      storageMap.set('dste_meetings', JSON.stringify(stored));
      storageMap.set('dste_meetings_version', JSON.stringify(3));
      const result = initDataStore();
      expect(result).toEqual(stored);
      expect(window._meetingsData).toEqual(stored);
    });

    it('loads mock data on localhost when nothing is stored', () => {
      window.location.hostname = 'localhost';
      const result = initDataStore();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].isMock).toBe(true);
      expect(window._meetingsData).toBe(result);
    });

    it('returns empty array in production when nothing is stored', () => {
      window.location.hostname = 'dste.fineres.com';
      const result = initDataStore();
      expect(result).toEqual([]);
      expect(window._meetingsData).toEqual([]);
    });

    it('handles corrupted localStorage gracefully', () => {
      storageMap.set('dste_meetings', 'not-json');
      window.location.hostname = 'localhost';
      const result = initDataStore();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('restores from backup when localStorage is corrupted', () => {
      storageMap.set('dste_meetings', 'not-json');
      storageMap.set('dste_backup_meetings__2__2026-01-01T00:00:00.000Z', JSON.stringify({
        namespace: 'meetings',
        version: 2,
        exportedAt: '2026-01-01T00:00:00.000Z',
        data: [{ id: 'restored', title: 'Restored' }],
      }));
      window.location.hostname = 'localhost';
      const result = initDataStore();
      expect(result).toEqual([{ id: 'restored', title: 'Restored', pre_report_id: '', minutes_report_id: '' }]);
    });

    it('migrates from old version and stores version key', () => {
      storageMap.set('dste_meetings', JSON.stringify([{ id: 'old', title: 'Old' }]));
      storageMap.set('dste_meetings_version', 1);
      window.location.hostname = 'localhost';
      const result = initDataStore();
      expect(result).toEqual([{ id: 'old', title: 'Old', pre_report_id: '', minutes_report_id: '' }]);
      expect(stored('dste_meetings_version')).toBe(5);
    });

    it('v4 migrator normalizes person fields to PersonRef and chains to v5', () => {
      storageMap.set('dste_employees_v1', JSON.stringify([
        { id: '10001', name: '张三', displayName: '张三 (Zhang.San)', orgPath: '线-大区-组', searchTokens: ['张三', 'zhang.san'] },
      ]));
      storageMap.set('dste_employees_v1_version', JSON.stringify(1));
      storageMap.set('dste_meetings', JSON.stringify([{
        id: 'm1', title: 'M1', host: '张三', recorder: '李四',
        actions: [{ content: 'A1', owner: '张三' }],
        decisions: [{ content: 'D1', owner: '张三', decider: '李四' }],
        agenda_items: [{ title: 'G1', owner: '张三' }],
      }]));
      storageMap.set('dste_meetings_version', 3);
      window.location.hostname = 'localhost';
      const result = initDataStore();
      const m = result[0];
      expect(m.host).toMatchObject({ id: '10001', name: '张三' });
      expect(m.recorder).toMatchObject({ _legacy: true, name: '李四' });
      expect(m.actions[0].owner).toMatchObject({ id: '10001', name: '张三' });
      expect(m.decisions[0].owner).toMatchObject({ id: '10001', name: '张三' });
      expect(m.decisions[0].decider).toMatchObject({ _legacy: true, name: '李四' });
      expect(m.agenda_items[0].owner).toMatchObject({ id: '10001', name: '张三' });
      // v5 migrator adds review fields to agenda items
      expect(m.agenda_items[0].reviewStatus).toBe('pending');
      expect(m.agenda_items[0].reviewScore).toBe(0);
      expect(m.agenda_items[0].reviewReportUrl).toBe('');
      expect(m.agenda_items[0].lastReviewedAt).toBe('');
      expect(stored('dste_meetings_version')).toBe(5);
    });

    it('v5 migrator initializes material review fields on agenda items', () => {
      storageMap.set('dste_meetings', JSON.stringify([{
        id: 'm1', title: 'M1', agenda_items: [{ title: 'G1' }],
      }]));
      storageMap.set('dste_meetings_version', 4);
      window.location.hostname = 'localhost';
      const result = initDataStore();
      const a = result[0].agenda_items[0];
      expect(a.reviewStatus).toBe('pending');
      expect(a.reviewScore).toBe(0);
      expect(a.reviewReportUrl).toBe('');
      expect(a.lastReviewedAt).toBe('');
      expect(stored('dste_meetings_version')).toBe(5);
    });

    it('persists version key on persistMeetings', () => {
      window._meetingsData = [{ id: 'm1', title: 'M1', decisions: [], actions: [] }];
      persistMeetings();
      expect(stored('dste_meetings_version')).toBe(5);
    });
  });

  describe('getMeetings / findMeetingById', () => {
    beforeEach(() => {
      window._meetingsData = [
        { id: 'm1', title: 'M1' },
        { id: 'm2', title: 'M2' },
      ];
    });

    it('getMeetings returns current data', () => {
      expect(getMeetings()).toEqual(window._meetingsData);
    });

    it('findMeetingById returns matching meeting', () => {
      expect(findMeetingById('m2')).toEqual({ id: 'm2', title: 'M2' });
    });

    it('findMeetingById returns undefined when not found', () => {
      expect(findMeetingById('missing')).toBeUndefined();
    });
  });

  describe('setMeetings', () => {
    it('updates data, persists to storage and syncs resolutions', () => {
      const meetings = [{ id: 'm1', title: 'M1', decisions: [], actions: [] }];
      setMeetings(meetings);

      expect(getMeetings()).toBe(meetings);
      expect(stored('dste_meetings')).toEqual(meetings);
      expect(mockSyncResolutionsToStore).toHaveBeenCalledWith(meetings);
    });

    it('persists each meeting to remote API when API_BASE is set', async () => {
      storageMap.set('dste_api_base', 'http://localhost:8787');
      fetch.mockResolvedValueOnce({ status: 200 });

      const meetings = [{ id: 'm1', title: 'M1', decisions: [], actions: [] }];
      setMeetings(meetings);

      // flush async
      await new Promise(r => setTimeout(r, 0));
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0][0]).toBe('http://localhost:8787/api/meetings/m1');
      expect(fetch.mock.calls[0][1].method).toBe('PUT');
    });

    it('sends per-meeting PUT for multiple meetings', async () => {
      storageMap.set('dste_api_base', 'http://localhost:8787');
      fetch.mockResolvedValue({ status: 200 });

      const meetings = [
        { id: 'm1', title: 'M1', decisions: [], actions: [] },
        { id: 'm2', title: 'M2', decisions: [], actions: [] },
      ];
      setMeetings(meetings);

      await new Promise(r => setTimeout(r, 0));
      expect(fetch).toHaveBeenCalledTimes(2);
      const urls = fetch.mock.calls.map(c => c[0]).sort();
      expect(urls).toEqual([
        'http://localhost:8787/api/meetings/m1',
        'http://localhost:8787/api/meetings/m2',
      ]);
    });
  });

  describe('addMeeting', () => {
    it('appends meeting and persists', () => {
      window._meetingsData = [{ id: 'm1', title: 'M1' }];
      const added = { id: 'm2', title: 'M2' };

      addMeeting(added);

      expect(getMeetings().length).toBe(2);
      expect(getMeetings()[1]).toBe(added);
      expect(stored('dste_meetings').length).toBe(2);
    });
  });

  describe('updateMeeting', () => {
    it('updates meeting at index and persists', () => {
      window._meetingsData = [{ id: 'm1', title: 'M1' }, { id: 'm2', title: 'M2' }];
      const updated = { id: 'm2', title: 'M2 Updated' };

      const result = updateMeeting(1, updated);

      expect(result).toBe(updated);
      expect(getMeetings()[1]).toBe(updated);
      expect(stored('dste_meetings')[1].title).toBe('M2 Updated');
    });

    it('returns null for out of range index', () => {
      window._meetingsData = [{ id: 'm1' }];
      expect(updateMeeting(5, { id: 'x' })).toBeNull();
      expect(updateMeeting(-1, { id: 'x' })).toBeNull();
    });
  });

  describe('deleteMeetingByIndex', () => {
    it('removes meeting at index and persists', () => {
      window._meetingsData = [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }];

      const result = deleteMeetingByIndex(1);

      expect(result).toBe(true);
      expect(getMeetings().map(m => m.id)).toEqual(['m1', 'm3']);
      expect(stored('dste_meetings').map(m => m.id)).toEqual(['m1', 'm3']);
    });

    it('returns false for out of range index', () => {
      window._meetingsData = [{ id: 'm1' }];
      expect(deleteMeetingByIndex(5)).toBe(false);
      expect(deleteMeetingByIndex(-1)).toBe(false);
    });
  });

  describe('persistMeetings', () => {
    it('writes current data to storage and syncs resolutions', () => {
      const meetings = [{ id: 'm1', title: 'Persisted' }];
      window._meetingsData = meetings;

      persistMeetings();

      expect(stored('dste_meetings')).toEqual(meetings);
      expect(mockSyncResolutionsToStore).toHaveBeenCalledWith(meetings);
    });
  });

  describe('loadRemoteMeetings', () => {
    it('overrides local data when remote returns meetings', async () => {
      storageMap.set('dste_api_base', 'http://localhost:8787');
      const remote = [{ id: 'r1', title: 'Remote' }];
      fetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ success: true, data: remote }),
      });

      const result = await loadRemoteMeetings();

      expect(result).toBe(true);
      expect(getMeetings()).toEqual(remote);
      expect(stored('dste_meetings')).toEqual(remote);
    });

    it('returns false and keeps local data when remote has no data', async () => {
      storageMap.set('dste_api_base', 'http://localhost:8787');
      window._meetingsData = [{ id: 'local' }];
      fetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ success: true, data: [] }),
      });

      const result = await loadRemoteMeetings();

      expect(result).toBe(false);
      expect(getMeetings()).toEqual([{ id: 'local' }]);
    });

    it('returns false when remote fails', async () => {
      storageMap.set('dste_api_base', 'http://localhost:8787');
      window._meetingsData = [{ id: 'local' }];
      fetch.mockRejectedValueOnce(new Error('network error'));

      const result = await loadRemoteMeetings();

      expect(result).toBe(false);
      expect(getMeetings()).toEqual([{ id: 'local' }]);
    });
  });

  describe('per-meeting sync', () => {
    beforeEach(() => {
      storageMap.set('dste_api_base', 'http://localhost:8787');
      fetch.mockResolvedValue({ status: 200 });
    });

    it('only sends PUT for changed meeting on update', async () => {
      window._meetingsData = [
        { id: 'm1', title: 'M1', decisions: [], actions: [] },
        { id: 'm2', title: 'M2', decisions: [], actions: [] },
      ];
      persistMeetings();
      await new Promise(r => setTimeout(r, 0));
      fetch.mockClear();

      updateMeeting(1, { id: 'm2', title: 'M2 Updated', decisions: [], actions: [] });
      await new Promise(r => setTimeout(r, 0));

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0][0]).toBe('http://localhost:8787/api/meetings/m2');
    });

    it('sends DELETE when meeting is removed', async () => {
      window._meetingsData = [
        { id: 'm1', title: 'M1', decisions: [], actions: [] },
        { id: 'm2', title: 'M2', decisions: [], actions: [] },
      ];
      persistMeetings();
      await new Promise(r => setTimeout(r, 0));
      fetch.mockClear();

      deleteMeetingByIndex(0);
      await new Promise(r => setTimeout(r, 0));

      const deleteCalls = fetch.mock.calls.filter(c => c[1].method === 'DELETE');
      expect(deleteCalls.length).toBe(1);
      expect(deleteCalls[0][0]).toBe('http://localhost:8787/api/meetings/m1');
    });
  });

  describe('migrateMeetingsData', () => {
    it('fills missing agenda fields and returns false when no clean needed', () => {
      window._meetingsData = [{
        id: 'm1',
        agenda_items: [{ title: 'A1' }],
        decisions: [{ content: 'D1', status: 'pending' }],
        actions: [{ content: 'A1', owner: 'O1' }],
      }];

      const cleaned = migrateMeetingsData();

      const agenda = getMeetings()[0].agenda_items[0];
      expect(agenda.id).toBeTruthy();
      expect(agenda.status).toBe('planned');
      expect(agenda.data_views).toEqual([]);
      expect(cleaned).toBe(false);
    });

    it('cleans old effectiveness model and returns true', () => {
      window._meetingsData = [{
        id: 'm1',
        agenda_items: [],
        decisions: [],
        actions: [],
        effectiveness: { dimensions: { preparation: 80 } },
      }];

      const cleaned = migrateMeetingsData();

      expect(getMeetings()[0].effectiveness).toBeNull();
      expect(cleaned).toBe(true);
    });

    it('initializes reminder fields on actions', () => {
      window._meetingsData = [{
        id: 'm1',
        agenda_items: [],
        decisions: [],
        actions: [{ content: 'A1', owner: 'O1' }],
      }];

      migrateMeetingsData();

      const a = getMeetings()[0].actions[0];
      expect(a.reminderCount).toBe(0);
      expect(a.lastRemindedAt).toBeNull();
      expect(a.riskLevel).toBe('normal');
    });

    it('preserves progressNote and seeds progressLogs from existing note', () => {
      window._meetingsData = [{
        id: 'm1',
        agenda_items: [],
        decisions: [],
        actions: [{
          content: 'A1',
          owner: 'O1',
          progressNote: 'existing follow-up note',
          updatedAt: '2026-01-15T08:00:00.000Z',
        }],
      }];

      migrateMeetingsData();

      const a = getMeetings()[0].actions[0];
      expect(a.progressNote).toBe('existing follow-up note');
      expect(a.progressLogs).toEqual([{
        content: 'existing follow-up note',
        createdAt: '2026-01-15T08:00:00.000Z',
      }]);
    });

    it('preserves existing progressLogs', () => {
      window._meetingsData = [{
        id: 'm1',
        agenda_items: [],
        decisions: [],
        actions: [{
          content: 'A1',
          owner: 'O1',
          progressNote: 'latest note',
          progressLogs: [{ content: 'older note', createdAt: '2026-01-01T00:00:00.000Z' }],
        }],
      }];

      migrateMeetingsData();

      const a = getMeetings()[0].actions[0];
      expect(a.progressNote).toBe('latest note');
      expect(a.progressLogs).toEqual([{ content: 'older note', createdAt: '2026-01-01T00:00:00.000Z' }]);
    });

    it('normalizes empty placeholder actions and returns true', () => {
      window._meetingsData = [{
        id: 'm1',
        agenda_items: [],
        decisions: [],
        actions: [
          { content: '   ', owner: '' }, // empty placeholder
          { content: 'Real', owner: 'O1' },
        ],
      }];

      const cleaned = migrateMeetingsData();

      expect(getMeetings()[0].actions.length).toBe(1);
      expect(getMeetings()[0].actions[0].content).toBe('Real');
      expect(cleaned).toBe(true);
    });
  });

  describe('getMockMeetings', () => {
    it('returns an array of mock meetings', () => {
      const mocks = getMockMeetings();
      expect(Array.isArray(mocks)).toBe(true);
      expect(mocks.length).toBeGreaterThan(0);
      expect(mocks.every(m => m.isMock)).toBe(true);
    });
  });
});
