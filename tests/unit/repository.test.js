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
  checkQuota: () => ({ ok: true, usedBytes: 0, message: 'Quota check passed' }),
  estimateSize: (data) => JSON.stringify(data).length * 2,
};

vi.mock('../../src/lib/utils.js', () => ({ Storage: mockStorage }));

const { Repository, createMeetingsRepository, createOmpRepository, createStrategyMapRepository } =
  await import('../../src/lib/repository.js');

describe('Repository', () => {
  beforeEach(() => {
    storageMap.clear();
  });

  it('reads and writes data', () => {
    const repo = new Repository('test', { schema: 'array' });
    expect(repo.get()).toEqual([]);

    repo.set([{ id: 1 }]);
    expect(repo.get()).toEqual([{ id: 1 }]);
    expect(storageMap.get('dste_test_version')).toBe(JSON.stringify(1));
  });

  it('returns default value for object schema', () => {
    const repo = new Repository('config', { schema: 'object' });
    expect(repo.get()).toEqual({});
  });

  it('supports custom default value', () => {
    const repo = new Repository('counter', { schema: 'object', defaultValue: { count: 0 } });
    expect(repo.get()).toEqual({ count: 0 });
  });

  it('migrates data through version chain', () => {
    const repo = new Repository('items', {
      schema: 'array',
      version: 3,
      migrators: {
        1: (data) => data.map(d => ({ ...d, v1: true })),
        2: (data) => data.map(d => ({ ...d, v2: true })),
        3: (data) => data.map(d => ({ ...d, v3: true })),
      },
    });
    storageMap.set('dste_items', JSON.stringify([{ id: 'a' }]));
    storageMap.set('dste_items_version', JSON.stringify(0));

    const result = repo.get();
    expect(result[0]).toMatchObject({ id: 'a', v1: true, v2: true, v3: true });
    expect(storageMap.get('dste_items_version')).toBe(JSON.stringify(3));
  });

  it('backs up before migration and can restore', () => {
    const repo = new Repository('items', {
      schema: 'array',
      version: 1,
      migrators: {
        1: (data) => data.map(d => ({ ...d, migrated: true })),
      },
    });
    storageMap.set('dste_items', JSON.stringify([{ id: 'a' }]));

    repo.get();
    const restored = repo.restore();
    expect(restored.success).toBe(true);
    expect(restored.data).toEqual([{ id: 'a' }]);
  });

  it('prunes old backups', () => {
    const repo = new Repository('items', { schema: 'array', version: 1 });
    repo.set([{ id: 1 }]);
    repo.backup(1);
    repo.set([{ id: 2 }]);
    repo.backup(1);
    repo.set([{ id: 3 }]);
    repo.backup(1);

    expect(repo.getHealth().backupCount).toBe(3);
    repo.pruneBackups(2);
    expect(repo.getHealth().backupCount).toBe(2);
  });

  it('getHealth reports quota and schema status', () => {
    const repo = new Repository('items', { schema: 'array', version: 2 });
    repo.set([{ id: 1 }]);
    const health = repo.getHealth();
    expect(health.ok).toBe(true);
    expect(health.namespace).toBe('items');
    expect(health.version).toBe(2);
    expect(health.schemaValid).toBe(true);
    expect(health.quota.ok).toBe(true);
  });

  it('factory functions create correctly configured repositories', () => {
    const meetings = createMeetingsRepository();
    expect(meetings.storageKey).toBe('dste_meetings');
    expect(meetings.options.version).toBe(3);

    const omp = createOmpRepository('tasks', 'dste_omp_tasks_v1');
    expect(omp.storageKey).toBe('dste_omp_tasks_v1');
    expect(omp.options.backupNamespace).toBe('omp');

    const sm = createStrategyMapRepository('maps', 'dste_sm_maps_v3');
    expect(sm.storageKey).toBe('dste_sm_maps_v3');
    expect(sm.options.backupNamespace).toBe('strategyMap');
  });
});
