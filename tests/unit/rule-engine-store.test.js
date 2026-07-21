import { describe, it, expect, beforeEach, vi } from 'vitest';

const storageMap = new Map();

const mockStorage = {
  getString: (key) => storageMap.get(key) || '',
  setString: (key, val) => { storageMap.set(key, val); return true; },
  set: (key, val) => { storageMap.set(key, JSON.stringify(val)); return true; },
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

let store;

describe('rule-engine-store', () => {
  beforeEach(async () => {
    storageMap.clear();
    store = await import('../../src/pages/rule-engine/rule-engine-store.js');
  });

  it('loads empty rules by default', () => {
    expect(store.loadRules()).toEqual([]);
  });

  it('adds and loads a rule', () => {
    const rule = { id: 'rule_1', name: 'Test Rule' };
    store.addRule(rule);
    const rules = store.loadRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('rule_1');
  });

  it('updates a rule', () => {
    store.addRule({ id: 'rule_1', name: 'Old' });
    const updated = store.updateRule('rule_1', { name: 'New' });
    expect(updated.name).toBe('New');
    expect(store.findRuleById('rule_1').name).toBe('New');
  });

  it('returns null when updating non-existent rule', () => {
    expect(store.updateRule('missing', { name: 'X' })).toBeNull();
  });

  it('deletes a rule', () => {
    store.addRule({ id: 'rule_1', name: 'A' });
    store.addRule({ id: 'rule_2', name: 'B' });
    store.deleteRule('rule_1');
    expect(store.loadRules().map(r => r.id)).toEqual(['rule_2']);
  });

  it('toggles rule enabled state', () => {
    store.addRule({ id: 'rule_1', enabled: true });
    const updated = store.toggleRuleEnabled('rule_1');
    expect(updated.enabled).toBe(false);
    expect(store.findRuleById('rule_1').enabled).toBe(false);
  });

  it('appends execution logs and truncates to 100', () => {
    for (let i = 0; i < 105; i++) {
      store.appendExecutionLog({ id: `log_${i}` });
    }
    const logs = store.loadExecutionLogs();
    expect(logs).toHaveLength(100);
    expect(logs[0].id).toBe('log_104');
  });

  it('records scheduled runs', () => {
    store.recordScheduledRun('rule_1', '2026-06');
    expect(store.hasScheduledRun('rule_1', '2026-06')).toBe(true);
    expect(store.hasScheduledRun('rule_1', '2026-05')).toBe(false);
  });

  it('exports and imports rules', () => {
    store.addRule({ id: 'rule_1' });
    store.appendExecutionLog({ id: 'log_1' });
    store.recordScheduledRun('rule_1', '2026-06');

    const exported = store.exportRules();
    storageMap.clear();

    store.importRules(exported);
    expect(store.loadRules()).toHaveLength(1);
    expect(store.loadExecutionLogs()).toHaveLength(1);
    expect(store.hasScheduledRun('rule_1', '2026-06')).toBe(true);
  });
});
