import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---- shared mocks ----
const storageMap = new Map();
const mockStorage = {
  getString: (key) => storageMap.get(key) || '',
  set: (key, val) => { storageMap.set(key, val); },
  get: (key, defaultValue) => {
    const raw = storageMap.get(key);
    if (raw === undefined || raw === '') return defaultValue;
    try { return JSON.parse(raw); }
    catch (e) { return defaultValue; }
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
};
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
      expect(storageMap.get('dste_meetings')).toEqual(meetings);
      expect(mockSyncResolutionsToStore).toHaveBeenCalledWith(meetings);
    });

    it('persists to remote API when API_BASE is set', async () => {
      storageMap.set('dste_api_base', 'http://localhost:8787');
      fetch.mockResolvedValueOnce({ status: 200 });

      const meetings = [{ id: 'm1', title: 'M1', decisions: [], actions: [] }];
      setMeetings(meetings);

      // flush async
      await new Promise(r => setTimeout(r, 0));
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0][0]).toBe('http://localhost:8787/api/meetings');
    });
  });

  describe('addMeeting', () => {
    it('appends meeting and persists', () => {
      window._meetingsData = [{ id: 'm1', title: 'M1' }];
      const added = { id: 'm2', title: 'M2' };

      addMeeting(added);

      expect(getMeetings().length).toBe(2);
      expect(getMeetings()[1]).toBe(added);
      expect(storageMap.get('dste_meetings').length).toBe(2);
    });
  });

  describe('updateMeeting', () => {
    it('updates meeting at index and persists', () => {
      window._meetingsData = [{ id: 'm1', title: 'M1' }, { id: 'm2', title: 'M2' }];
      const updated = { id: 'm2', title: 'M2 Updated' };

      const result = updateMeeting(1, updated);

      expect(result).toBe(updated);
      expect(getMeetings()[1]).toBe(updated);
      expect(storageMap.get('dste_meetings')[1].title).toBe('M2 Updated');
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
      expect(storageMap.get('dste_meetings').map(m => m.id)).toEqual(['m1', 'm3']);
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

      expect(storageMap.get('dste_meetings')).toBe(meetings);
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
      expect(storageMap.get('dste_meetings')).toEqual(remote);
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
