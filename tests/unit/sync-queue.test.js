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

const { SyncQueue, getDefaultSyncQueue } = await import('../../src/lib/sync-queue.js');

describe('SyncQueue', () => {
  beforeEach(() => {
    storageMap.clear();
  });

  it('enqueues an operation and processes it', async () => {
    const queue = new SyncQueue();
    const executor = vi.fn().mockResolvedValue();

    const result = queue.enqueue({ endpoint: '/api/meetings', payload: [{ id: 1 }] });
    expect(result.success).toBe(true);

    // enqueue triggers processQueue asynchronously; wait
    await new Promise(r => setTimeout(r, 10));
    await queue.processQueue(executor);

    expect(executor).toHaveBeenCalledTimes(1);
    expect(queue.getStatus().total).toBe(0);
  });

  it('retries failed operations with exponential backoff', async () => {
    const queue = new SyncQueue({ retryDelays: [10, 20, 40] });
    const executor = vi.fn().mockRejectedValue(new Error('network'));

    queue.enqueue({ endpoint: '/api/meetings', payload: [] });
    await new Promise(r => setTimeout(r, 10));
    await queue.processQueue(executor);

    const status = queue.getStatus();
    expect(status.pending).toBe(1);
    expect(status.failed).toBe(0); // not yet max retries

    const item = queue.loadQueue()[0];
    expect(item.retryCount).toBe(1);
    expect(item.nextRetry).toBeGreaterThan(Date.now());
  });

  it('marks item as failed after max retries', async () => {
    const queue = new SyncQueue({ retryDelays: [1, 1, 1, 1, 1], maxRetries: 2 });
    const executor = vi.fn().mockRejectedValue(new Error('network'));

    queue.enqueue({ endpoint: '/api/meetings', payload: [] });
    await new Promise(r => setTimeout(r, 10));

    // First attempt
    await queue.processQueue(executor);
    let item = queue.loadQueue()[0];
    expect(item.retryCount).toBe(1);

    // Wait for next retry
    await new Promise(r => setTimeout(r, 20));
    await queue.processQueue(executor);
    item = queue.loadQueue()[0];
    expect(item.retryCount).toBe(2);
    expect(item.status).toBe('failed');
  });

  it('merges consecutive pending operations to same endpoint', () => {
    const queue = new SyncQueue();
    queue.enqueue({ endpoint: '/api/meetings', payload: [1] });
    queue.enqueue({ endpoint: '/api/meetings', payload: [2] });
    expect(queue.getStatus().total).toBe(1);
    expect(queue.loadQueue()[0].payload).toEqual([2]);
  });

  it('caps queue size', () => {
    const queue = new SyncQueue({ maxSize: 2 });
    queue.enqueue({ endpoint: '/api/a', payload: [] });
    queue.enqueue({ endpoint: '/api/b', payload: [] });
    const result = queue.enqueue({ endpoint: '/api/c', payload: [] });
    expect(result.success).toBe(false);
  });

  it('returns default singleton instance', () => {
    const q1 = getDefaultSyncQueue();
    const q2 = getDefaultSyncQueue();
    expect(q1).toBe(q2);
  });
});
