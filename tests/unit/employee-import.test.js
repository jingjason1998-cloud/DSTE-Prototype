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

vi.mock('../../src/lib/utils.js', () => ({ Storage: mockStorage, showToast: () => {}, escapeHtml: (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }));

const {
  rowsToObjects,
  validateEmployeeRow,
  buildImportSummary,
  executeImport,
} = await import('../../src/lib/employee-import.js');

describe('employee-import', () => {
  beforeEach(() => {
    storageMap.clear();
  });

  describe('rowsToObjects', () => {
    it('converts header row + data rows to objects', () => {
      const rows = [
        ['工号', '姓名', '组织全称', 'ldap'],
        ['1', '张三', '线-大区-A组', '1,2,3'],
      ];
      const objects = rowsToObjects(rows);
      expect(objects).toEqual([{ '工号': '1', '姓名': '张三', '组织全称': '线-大区-A组', 'ldap': '1,2,3' }]);
    });
  });

  describe('validateEmployeeRow', () => {
    it('passes valid row', () => {
      const row = { '工号': '1', '姓名': '张三', '组织全称': '线-大区-A组', 'ldap': '1,2,3' };
      const result = validateEmployeeRow(row, 0);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails when required fields missing', () => {
      const row = { '工号': '', '姓名': '', '组织全称': '', 'ldap': '' };
      const result = validateEmployeeRow(row, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('warns on invalid ldap format', () => {
      const row = { '工号': '1', '姓名': '张三', '组织全称': '线-大区-A组', 'ldap': 'abc' };
      const result = validateEmployeeRow(row, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('ldap'))).toBe(true);
    });
  });

  describe('buildImportSummary', () => {
    it('counts valid and invalid rows', () => {
      const results = [
        validateEmployeeRow({ '工号': '1', '姓名': '张三', '组织全称': '线-大区-A组', 'ldap': '1,2,3' }, 0),
        validateEmployeeRow({ '工号': '', '姓名': '李四', '组织全称': '线-大区-B组', 'ldap': '4,5,6' }, 1),
      ];
      const summary = buildImportSummary(results);
      expect(summary.total).toBe(2);
      expect(summary.valid).toBe(1);
      expect(summary.invalid).toBe(1);
      expect(summary.employees.length).toBe(1);
    });

    it('detects duplicate employee ids', () => {
      const results = [
        validateEmployeeRow({ '工号': '1', '姓名': '张三', '组织全称': '线-大区-A组', 'ldap': '1,2,3' }, 0),
        validateEmployeeRow({ '工号': '1', '姓名': '李四', '组织全称': '线-大区-B组', 'ldap': '4,5,6' }, 1),
      ];
      const summary = buildImportSummary(results);
      expect(summary.errors.some(e => e.includes('重复'))).toBe(true);
    });
  });

  describe('executeImport', () => {
    it('saves valid employees and builds org units', async () => {
      const employees = [
        { id: '1', name: '张三', orgPath: '线-大区-A组', orgChain: ['1', '2', '3'], ldap: '1,2,3', searchTokens: [] },
        { id: '2', name: '李四', orgPath: '线-大区-B组', orgChain: ['4', '2', '3'], ldap: '4,2,3', searchTokens: [] },
      ];
      const result = executeImport(employees, { fileName: 'test.xlsx' });
      expect(result.success).toBe(true);

      const { getEmployees, getOrgUnits } = await import('../../src/lib/employee-directory.js');
      expect(getEmployees().length).toBe(2);
      expect(Object.keys(getOrgUnits()).length).toBeGreaterThan(0);
    });
  });
});
