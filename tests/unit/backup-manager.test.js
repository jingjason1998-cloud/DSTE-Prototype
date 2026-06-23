import { describe, it, expect, beforeEach, vi } from 'vitest';

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

vi.mock('../../src/lib/utils.js', () => ({ Storage: mockStorage }));

const {
  exportAll,
  importAll,
  autoBackup,
  restoreLatest,
  listBackups,
} = await import('../../src/lib/backup-manager.js');

describe('backup-manager', () => {
  beforeEach(() => {
    storageMap.clear();
  });

  describe('exportAll', () => {
    it('exports all dste_ keys except sensitive ones', () => {
      storageMap.set('dste_meetings', JSON.stringify([{ id: 'm1' }]));
      storageMap.set('dste_resolutions_v2', JSON.stringify({ r1: {} }));
      storageMap.set('dste-token', 'secret');
      storageMap.set('other_key', 'ignored');

      const result = exportAll();
      expect(result.success).toBe(true);
      expect(result.payload.data['dste_meetings']).toEqual([{ id: 'm1' }]);
      expect(result.payload.data['dste_resolutions_v2']).toEqual({ r1: {} });
      expect(result.payload.data['dste-token']).toBeUndefined();
      expect(result.payload.data['other_key']).toBeUndefined();
      expect(result.payload.app).toBe('DSTE');
      expect(result.payload.exportedAt).toBeDefined();
    });
  });

  describe('importAll', () => {
    it('imports data in overwrite mode', () => {
      const json = {
        app: 'DSTE',
        exportedAt: new Date().toISOString(),
        data: {
          'dste_meetings': [{ id: 'm2' }],
          'dste_new_key': 'value',
        },
      };
      const result = importAll(json, { mode: 'overwrite' });
      expect(result.success).toBe(true);
      expect(result.imported).toContain('dste_meetings');
      expect(result.imported).toContain('dste_new_key');
      expect(mockStorage.get('dste_meetings')).toEqual([{ id: 'm2' }]);
    });

    it('skips existing keys in merge mode', () => {
      storageMap.set('dste_meetings', JSON.stringify([{ id: 'm1' }]));
      const json = {
        app: 'DSTE',
        exportedAt: new Date().toISOString(),
        data: {
          'dste_meetings': [{ id: 'm2' }],
          'dste_new_key': 'value',
        },
      };
      const result = importAll(json, { mode: 'merge' });
      expect(result.success).toBe(true);
      expect(result.skipped).toContain('dste_meetings');
      expect(result.imported).toContain('dste_new_key');
      expect(mockStorage.get('dste_meetings')).toEqual([{ id: 'm1' }]);
    });

    it('rejects invalid payload', () => {
      expect(importAll(null).success).toBe(false);
      expect(importAll({}).success).toBe(false);
      expect(importAll({ data: {} }).success).toBe(false);
    });

    it('auto-backs up before import when option enabled', () => {
      storageMap.set('dste_meetings', JSON.stringify([{ id: 'm1' }]));
      const json = {
        app: 'DSTE',
        exportedAt: new Date().toISOString(),
        data: { 'dste_meetings': [{ id: 'm2' }] },
      };
      const result = importAll(json, { mode: 'overwrite', autoBackup: true });
      expect(result.success).toBe(true);
      const backups = listBackups('before-import');
      expect(backups.length).toBeGreaterThan(0);
    });
  });

  describe('autoBackup / restoreLatest', () => {
    it('autoBackup creates a backup for namespace', () => {
      const result = autoBackup('meetings', [{ id: 'm1' }], 2);
      expect(result.success).toBe(true);
      const restored = restoreLatest('meetings');
      expect(restored.success).toBe(true);
      expect(restored.data).toEqual([{ id: 'm1' }]);
    });
  });
});
