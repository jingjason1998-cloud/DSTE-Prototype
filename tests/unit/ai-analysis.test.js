import { describe, it, expect, beforeEach } from 'vitest';

// Mock localStorage before importing modules that use Storage
const storage = {};
globalThis.localStorage = {
  getItem: (key) => (key in storage ? storage[key] : null),
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(key => delete storage[key]); }
};

const { loadCachedReport, saveCachedReport } = await import('../../src/pages/business-topics/ai-analysis.js');

describe('AI report cache Repository', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('returns null for missing cache', () => {
    expect(loadCachedReport('ST', 'abc123')).toBeNull();
  });

  it('save and load round-trip', () => {
    const report = { summary: 'test', findings: [], schemaVersion: 2 };
    saveCachedReport('ST', 'abc123', report);
    const loaded = loadCachedReport('ST', 'abc123');
    expect(loaded).toEqual(report);
  });

  it('returns null for checksum mismatch', () => {
    const report = { summary: 'test', findings: [], schemaVersion: 2 };
    saveCachedReport('ST', 'abc123', report);
    expect(loadCachedReport('ST', 'xyz789')).toBeNull();
  });

  it('invalidates old schema version', () => {
    // Simulate old cache without schemaVersion in report
    const oldCache = { checksum: 'abc123', report: { summary: 'old' }, cachedAt: '2024-01-01' };
    storage['dste_ai_reports_v1_ST'] = JSON.stringify(oldCache);
    expect(loadCachedReport('ST', 'abc123')).toBeNull();
  });

  it('writes version key via Repository', () => {
    const report = { summary: 'test', findings: [], schemaVersion: 2 };
    saveCachedReport('AT', 'chk1', report);
    expect(storage['dste_ai_reports_v1_AT_version']).toBe('1');
  });
});
