import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from '../../src/lib/fetch-retry.js';

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns ok response immediately', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, status: 200 });
    const resp = await fetchWithRetry('/test', {});
    expect(resp.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 502 and succeeds', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 502 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    const promise = fetchWithRetry('/test', {}, { retries: 1, retryDelay: 10 });
    await vi.runAllTimersAsync();
    const resp = await promise;
    expect(resp.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry 401', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 401 });
    const resp = await fetchWithRetry('/test', {}, { retries: 2 });
    expect(resp.status).toBe(401);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('does not call fetch when signal already aborted', async () => {
    const controller = new AbortController();
    controller.abort('user');
    global.fetch = vi.fn();
    await expect(fetchWithRetry('/test', { signal: controller.signal }, { retries: 2 })).rejects.toThrow('user');
    expect(global.fetch).toHaveBeenCalledTimes(0);
  });

  it('retries network TypeError', async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new TypeError('Network error'))
      .mockResolvedValueOnce({ ok: true, status: 200 });
    const promise = fetchWithRetry('/test', {}, { retries: 1, retryDelay: 10 });
    await vi.runAllTimersAsync();
    const resp = await promise;
    expect(resp.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
