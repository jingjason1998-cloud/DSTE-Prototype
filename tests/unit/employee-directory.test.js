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
  buildEmployeeFromRow,
  buildOrgHierarchy,
  searchEmployees,
  normalizePerson,
  renderPerson,
  personMatches,
  saveEmployeeDirectory,
  getEmployees,
  getOrgUnits,
  getEmployeeById,
  hasEmployeeData,
} = await import('../../src/lib/employee-directory.js');

describe('employee-directory', () => {
  beforeEach(() => {
    storageMap.clear();
  });

  describe('buildEmployeeFromRow', () => {
    it('builds employee from Excel row', () => {
      const row = {
        '工号': '66041525',
        '姓名': '朱泓霖',
        '英文名': 'Harlan.Zhu',
        '同学微信名': 'Harlan.Zhu-朱泓霖',
        '性别': '男',
        '人员类型_ssc': '正式',
        '组织全称': '国内营销与服务线-苏皖大区-销售组-苏皖销售七组',
        '一级组织': '国内营销与服务线',
        '一级团队': '苏皖大区',
        '二级团队': '销售组',
        '三级团队': '苏皖销售七组',
        'ldap': '101248,100320,100045,100006,100001',
        '直接负责人': 'Chenxinyang-陈心洋',
      };
      const emp = buildEmployeeFromRow(row);
      expect(emp.id).toBe('66041525');
      expect(emp.name).toBe('朱泓霖');
      expect(emp.displayName).toBe('朱泓霖 (Harlan.Zhu)');
      expect(emp.orgChain).toEqual(['101248', '100320', '100045', '100006', '100001']);
      expect(emp.orgId).toBe('101248');
      expect(emp.searchTokens).toContain('朱泓霖');
      expect(emp.searchTokens).toContain('harlan.zhu');
      expect(emp.searchTokens).toContain('苏皖销售七组');
    });
  });

  describe('buildOrgHierarchy', () => {
    it('builds hierarchy from ldap chains', () => {
      const employees = [
        {
          id: '1', name: 'A', orgPath: '线-大区-组1', orgChain: ['101', '100', '10'],
          ldap: '101,100,10',
          '一级组织id': '10', '一级组织': '线',
          '一级团队ID': '100', '一级团队': '大区',
          '二级团队ID': '101', '二级团队': '组1',
          '三级团队ID': '', '三级团队': '',
        },
        {
          id: '2', name: 'B', orgPath: '线-大区-组2', orgChain: ['102', '100', '10'],
          ldap: '102,100,10',
          '一级组织id': '10', '一级组织': '线',
          '一级团队ID': '100', '一级团队': '大区',
          '二级团队ID': '102', '二级团队': '组2',
          '三级团队ID': '', '三级团队': '',
        },
      ];
      const { orgUnits, roots } = buildOrgHierarchy(employees);
      expect(roots).toContain('10');
      expect(orgUnits['10'].name).toBe('线');
      expect(orgUnits['10'].level).toBe(0);
      expect(orgUnits['100'].parentId).toBe('10');
      expect(orgUnits['100'].children).toEqual(['101', '102']);
      expect(orgUnits['101'].employeeCount).toBe(1);
      expect(orgUnits['10'].employeeCount).toBe(2);
    });
  });

  describe('searchEmployees', () => {
    it('finds employees by name or org', () => {
      saveEmployeeDirectory([
        buildEmployeeFromRow({
          '工号': '1', '姓名': '张三', '英文名': 'Zhang.San', '组织全称': '线-大区-A组',
          '一级组织': '线', '一级团队': '大区', '二级团队': 'A组', '三级团队': '',
          'ldap': '1,2,3', '直接负责人': '',
        }),
        buildEmployeeFromRow({
          '工号': '2', '姓名': '李四', '英文名': 'Li.Si', '组织全称': '线-大区-B组',
          '一级组织': '线', '一级团队': '大区', '二级团队': 'B组', '三级团队': '',
          'ldap': '4,2,3', '直接负责人': '',
        }),
      ], { fileName: 'test.xlsx' });

      const byName = searchEmployees('张三');
      expect(byName.length).toBeGreaterThan(0);
      expect(byName[0].id).toBe('1');

      const byOrg = searchEmployees('B组');
      expect(byOrg.some(e => e.id === '2')).toBe(true);
    });
  });

  describe('normalizePerson', () => {
    it('normalizes legacy string to PersonRef', () => {
      saveEmployeeDirectory([
        buildEmployeeFromRow({
          '工号': '1', '姓名': '张三', '英文名': 'Zhang.San', '组织全称': '线-大区-A组',
          '一级组织': '线', '一级团队': '大区', '二级团队': 'A组', '三级团队': '',
          'ldap': '1,2,3', '直接负责人': '',
        }),
      ], { fileName: 'test.xlsx' });

      const ref = normalizePerson('张三');
      expect(ref.id).toBe('1');
      expect(ref.name).toBe('张三');
    });

    it('marks unknown string as legacy', () => {
      const ref = normalizePerson('不存在的人');
      expect(ref._legacy).toBe(true);
      expect(ref.name).toBe('不存在的人');
    });
  });

  describe('renderPerson', () => {
    it('renders PersonRef and legacy string', () => {
      expect(renderPerson({ id: '1', name: '张三', displayName: '张三 (Zhang)' })).toBe('张三 (Zhang)');
      expect(renderPerson('李四')).toBe('李四');
      expect(renderPerson(null)).toBe('待定');
      expect(renderPerson({ _stale: true, name: '王五' })).toBe('王五 (已离职)');
    });
  });

  describe('personMatches', () => {
    it('matches string owner', () => {
      expect(personMatches('张三', '张三')).toBe(true);
      expect(personMatches('张三', '李四')).toBe(false);
    });

    it('matches PersonRef by id or name', () => {
      expect(personMatches({ id: '1', name: '张三' }, '1')).toBe(true);
      expect(personMatches({ id: '1', name: '张三' }, '张三')).toBe(true);
      expect(personMatches({ id: '1', name: '张三' }, '李四')).toBe(false);
    });

    it('returns false for null or empty target', () => {
      expect(personMatches('张三', '')).toBe(false);
      expect(personMatches(null, '张三')).toBe(false);
    });
  });

  describe('saveEmployeeDirectory', () => {
    it('persists employees and org units', () => {
      const result = saveEmployeeDirectory([
        buildEmployeeFromRow({
          '工号': '1', '姓名': '张三', '英文名': 'Zhang', '组织全称': '线-大区-A组',
          '一级组织': '线', '一级团队': '大区', '二级团队': 'A组', '三级团队': '',
          'ldap': '1,2,3', '直接负责人': '',
        }),
      ], { fileName: 'test.xlsx' });

      expect(result.success).toBe(true);
      expect(hasEmployeeData()).toBe(true);
      expect(getEmployees().length).toBe(1);
      expect(getEmployeeById('1').name).toBe('张三');
      expect(Object.keys(getOrgUnits()).length).toBeGreaterThan(0);
    });
  });
});
