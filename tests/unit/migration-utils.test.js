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
  getBackupKey,
  parseBackupKey,
  createBackup,
  restoreFromBackup,
  cleanupOldBackups,
  getBackupKeys,
  validateData,
  attemptMigration,
  migrateWithBackup,
  listBackupMeta,
} = await import('../../src/lib/migration-utils.js');

describe('migration-utils', () => {
  beforeEach(() => {
    storageMap.clear();
  });

  describe('backup keys', () => {
    it('getBackupKey returns a prefixed key with namespace, version and timestamp', () => {
      const key = getBackupKey('meetings', 2);
      expect(key.startsWith('dste_backup_meetings__2__')).toBe(true);
    });

    it('parseBackupKey extracts namespace, version and timestamp', () => {
      const key = getBackupKey('omp/foo', 'canvas-v11');
      const meta = parseBackupKey(key);
      expect(meta.namespace).toBe('omp/foo');
      expect(meta.version).toBe('canvas-v11');
      expect(meta.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });

    it('parseBackupKey returns null for non-backup keys', () => {
      expect(parseBackupKey('dste_meetings')).toBeNull();
      expect(parseBackupKey('')).toBeNull();
    });
  });

  describe('createBackup / restoreFromBackup', () => {
    it('creates a backup and restores it', () => {
      const data = [{ id: 'm1' }, { id: 'm2' }];
      const created = createBackup('meetings', data, 2);
      expect(created.success).toBe(true);

      const restored = restoreFromBackup('meetings');
      expect(restored.success).toBe(true);
      expect(restored.data).toEqual(data);
    });

    it('returns error when restoring non-existing namespace', () => {
      const restored = restoreFromBackup('missing');
      expect(restored.success).toBe(false);
    });

    it('keeps multiple backups ordered by timestamp desc', () => {
      createBackup('meetings', { v: 1 }, 1);
      createBackup('meetings', { v: 2 }, 2);
      createBackup('meetings', { v: 3 }, 3);
      const keys = getBackupKeys('meetings');
      expect(keys.length).toBe(3);
      const restored = restoreFromBackup('meetings');
      expect(restored.data).toEqual({ v: 3 });
    });

    it('cleanupOldBackups removes oldest backups beyond maxCount', () => {
      createBackup('meetings', { v: 1 }, 1);
      createBackup('meetings', { v: 2 }, 2);
      createBackup('meetings', { v: 3 }, 3);
      const removed = cleanupOldBackups('meetings', 2);
      expect(removed).toBe(1);
      expect(getBackupKeys('meetings').length).toBe(2);
      const restored = restoreFromBackup('meetings');
      expect(restored.data).toEqual({ v: 3 });
    });
  });

  describe('validateData', () => {
    it('validates arrays', () => {
      expect(validateData([], 'array').valid).toBe(true);
      expect(validateData({}, 'array').valid).toBe(false);
      expect(validateData(null, 'array').valid).toBe(false);
    });

    it('validates objects', () => {
      expect(validateData({}, 'object').valid).toBe(true);
      expect(validateData([], 'object').valid).toBe(false);
      expect(validateData(null, 'object').valid).toBe(false);
    });
  });

  describe('attemptMigration', () => {
    it('runs migrators in order until target version', () => {
      const result = attemptMigration({ value: 0 }, 0, 3, {
        1: (d) => ({ ...d, value: d.value + 1 }),
        2: (d) => ({ ...d, value: d.value + 10 }),
        3: (d) => ({ ...d, value: d.value + 100 }),
      });
      expect(result.success).toBe(true);
      expect(result.data.value).toBe(111);
    });

    it('returns error when migrator is missing', () => {
      const result = attemptMigration({}, 0, 2, { 1: (d) => d });
      expect(result.success).toBe(false);
    });

    it('returns error when migrator throws', () => {
      const result = attemptMigration({}, 0, 1, {
        1: () => { throw new Error('boom'); },
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('boom');
    });

    it('supports string versions', () => {
      const result = attemptMigration('a', '1', '3', {
        2: (d) => d + 'b',
        3: (d) => d + 'c',
      });
      expect(result.success).toBe(true);
      expect(result.data).toBe('abc');
    });
  });

  describe('migrateWithBackup', () => {
    it('backs up before migrating and returns backup key on failure', () => {
      const result = migrateWithBackup('meetings', { value: 0 }, 0, 1, {
        1: () => { throw new Error('migration failed'); },
      });
      expect(result.success).toBe(false);
      expect(result.backupKey).toBeDefined();
      const restored = restoreFromBackup('meetings');
      expect(restored.success).toBe(true);
      expect(restored.data).toEqual({ value: 0 });
    });

    it('returns migrated data on success', () => {
      const result = migrateWithBackup('meetings', { value: 0 }, 0, 1, {
        1: (d) => ({ ...d, value: 1 }),
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 1 });
    });
  });

  describe('listBackupMeta', () => {
    it('lists backup metadata without reading data bodies', () => {
      createBackup('meetings', { big: true }, 1);
      createBackup('omp', { big: true }, 2);
      const all = listBackupMeta();
      expect(all.length).toBe(2);
      const meetings = listBackupMeta('meetings');
      expect(meetings.length).toBe(1);
      expect(meetings[0].namespace).toBe('meetings');
    });
  });
});
