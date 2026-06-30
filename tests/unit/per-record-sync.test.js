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

vi.mock('../../src/lib/utils.js', () => ({ Storage: mockStorage, showToast: vi.fn() }));

const {
  computeEntityDiff,
  mergeEntities,
  enqueuePerRecordSync,
} = await import('../../src/lib/per-record-sync.js');
const { SyncQueue } = await import('../../src/lib/sync-queue.js');

describe('per-record-sync', () => {
  beforeEach(() => {
    storageMap.clear();
  });

  describe('computeEntityDiff', () => {
    it('returns empty diff for identical arrays', () => {
      const a = [{ id: '1', name: 'A' }];
      const { created, updated, deleted } = computeEntityDiff(a, a);
      expect(created).toHaveLength(0);
      expect(updated).toHaveLength(0);
      expect(deleted).toHaveLength(0);
    });

    it('detects created records', () => {
      const oldArr = [];
      const newArr = [{ id: '1', name: 'A' }];
      const { created, updated, deleted } = computeEntityDiff(oldArr, newArr);
      expect(created).toEqual(newArr);
      expect(updated).toHaveLength(0);
      expect(deleted).toHaveLength(0);
    });

    it('detects deleted records', () => {
      const oldArr = [{ id: '1', name: 'A' }];
      const newArr = [];
      const { created, updated, deleted } = computeEntityDiff(oldArr, newArr);
      expect(created).toHaveLength(0);
      expect(updated).toHaveLength(0);
      expect(deleted).toEqual(oldArr);
    });

    it('detects updated records', () => {
      const oldArr = [{ id: '1', name: 'A' }];
      const newArr = [{ id: '1', name: 'B' }];
      const { created, updated, deleted } = computeEntityDiff(oldArr, newArr);
      expect(created).toHaveLength(0);
      expect(updated).toEqual(newArr);
      expect(deleted).toHaveLength(0);
    });

    it('handles mixed changes', () => {
      const oldArr = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }];
      const newArr = [{ id: '1', name: 'A1' }, { id: '3', name: 'C' }];
      const { created, updated, deleted } = computeEntityDiff(oldArr, newArr);
      expect(created).toEqual([{ id: '3', name: 'C' }]);
      expect(updated).toEqual([{ id: '1', name: 'A1' }]);
      expect(deleted).toEqual([{ id: '2', name: 'B' }]);
    });
  });

  describe('mergeEntities', () => {
    it('keeps remote when remote has higher version', () => {
      const local = [{ id: '1', name: 'A', version: 1, lastModified: 100 }];
      const remote = [{ id: '1', name: 'B', version: 2, lastModified: 50 }];
      const merged = mergeEntities(local, remote);
      expect(merged[0].name).toBe('B');
    });

    it('keeps local when same version but local is newer', () => {
      const local = [{ id: '1', name: 'A', version: 1, lastModified: 200 }];
      const remote = [{ id: '1', name: 'B', version: 1, lastModified: 100 }];
      const merged = mergeEntities(local, remote);
      expect(merged[0].name).toBe('A');
    });

    it('adds records only present remotely', () => {
      const local = [{ id: '1', name: 'A' }];
      const remote = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }];
      const merged = mergeEntities(local, remote);
      expect(merged).toHaveLength(2);
      expect(merged.find(i => i.id === '2').name).toBe('B');
    });
  });

  describe('enqueuePerRecordSync', () => {
    it('enqueues per-record PUTs and calls processQueue once', async () => {
      const queue = new SyncQueue();
      const executor = vi.fn().mockResolvedValue();
      const oldArr = [{ id: '1', name: 'A', version: 1 }];
      const newArr = [
        { id: '1', name: 'A1', version: 1, lastModified: 100 },
        { id: '2', name: 'B', lastModified: 100 },
      ];
      const diff = computeEntityDiff(oldArr, newArr);

      enqueuePerRecordSync('topics', diff, executor, queue);

      const items = queue.loadQueue();
      expect(items).toHaveLength(2);
      // enqueuePerRecordSync 先入队 created，再 updated
      expect(items[0].endpoint).toBe('/api/topics/2');
      expect(items[0].method).toBe('PUT');
      expect(items[1].endpoint).toBe('/api/topics/1');
      expect(items[1].payload.name).toBe('A1');

      // 批量入队后统一触发一次处理
      await new Promise(r => setTimeout(r, 10));
      await queue.processQueue(executor);
      expect(executor).toHaveBeenCalledTimes(2);
    });

    it('removes pending updates before DELETE', async () => {
      const queue = new SyncQueue();
      const executor = vi.fn().mockResolvedValue();
      const oldArr = [{ id: '1', name: 'A', version: 1 }];
      const newArr = [{ id: '1', name: 'A1', version: 1, lastModified: 100 }];
      const diff = computeEntityDiff(oldArr, newArr);

      // 先产生一个 pending PUT
      enqueuePerRecordSync('topics', diff, executor, queue);
      expect(queue.loadQueue()).toHaveLength(1);

      // 再删除同一条记录
      const deleteDiff = computeEntityDiff(newArr, []);
      enqueuePerRecordSync('topics', deleteDiff, executor, queue);

      const items = queue.loadQueue();
      expect(items).toHaveLength(1);
      expect(items[0].method).toBe('DELETE');
      expect(items[0].endpoint).toBe('/api/topics/1');
    });
  });
});
