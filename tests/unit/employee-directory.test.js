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
  clearEmployeeDirectory,
  getEmployees,
  getOrgUnits,
  getEmployeeById,
  hasEmployeeData,
  rebuildPersonRefs,
  registerPersonRefRebuilder,
  unregisterPersonRefRebuilder,
  normalizePersonField,
  loadRemoteEmployeeDirectory,
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
      expect(emp.orgPath).toBe('国内营销与服务线 > 苏皖大区 > 销售组 > 苏皖销售七组');
      expect(emp.searchTokens).toContain('朱泓霖');
      expect(emp.searchTokens).toContain('harlan.zhu');
      expect(emp.searchTokens).toContain('苏皖销售七组');
    });
  });

  describe('buildOrgHierarchy', () => {
    it('builds hierarchy from team fields', () => {
      const employees = [
        {
          id: '1', name: 'A', orgPath: '线 > 大区 > 组1', orgChain: ['101', '100', '10'],
          ldap: '101,100,10',
          l1Org: '线', l1Team: '大区', l2Team: '组1', l3Team: '',
        },
        {
          id: '2', name: 'B', orgPath: '线 > 大区 > 组2', orgChain: ['102', '100', '10'],
          ldap: '102,100,10',
          l1Org: '线', l1Team: '大区', l2Team: '组2', l3Team: '',
        },
      ];
      const { orgUnits, roots } = buildOrgHierarchy(employees);
      expect(roots).toEqual(['org:线']);
      expect(orgUnits['org:线'].name).toBe('线');
      expect(orgUnits['org:线'].level).toBe(0);
      expect(orgUnits['org:线'].employeeCount).toBe(2);
      expect(orgUnits['org:线'].children).toEqual(['org:线/大区']);
      expect(orgUnits['org:线/大区'].parentId).toBe('org:线');
      expect(orgUnits['org:线/大区'].children).toEqual(['org:线/大区/组1', 'org:线/大区/组2']);
      expect(orgUnits['org:线/大区/组1'].employeeCount).toBe(1);
      expect(orgUnits['org:线/大区/组2'].employeeCount).toBe(1);
    });

    it('sorts roots and children by org name', () => {
      const employees = [
        {
          id: '1', name: 'A', orgPath: 'B线 > 组2', orgChain: ['2', '1'],
          ldap: '2,1', l1Org: 'B线', l1Team: '组2', l2Team: '', l3Team: '',
        },
        {
          id: '2', name: 'B', orgPath: 'A线 > 组1', orgChain: ['3', '4'],
          ldap: '3,4', l1Org: 'A线', l1Team: '组1', l2Team: '', l3Team: '',
        },
      ];
      const { orgUnits, roots } = buildOrgHierarchy(employees);
      expect(roots).toEqual(['org:A线', 'org:B线']);
      expect(orgUnits['org:A线'].children).toEqual(['org:A线/组1']);
      expect(orgUnits['org:B线'].children).toEqual(['org:B线/组2']);
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

    it('resolves string employee id to PersonRef', () => {
      saveEmployeeDirectory([
        buildEmployeeFromRow({
          '工号': '66041525', '姓名': '张三', '英文名': 'Zhang.San', '组织全称': '线-大区-A组',
          '一级组织': '线', '一级团队': '大区', '二级团队': 'A组', '三级团队': '',
          'ldap': '1,2,3', '直接负责人': '',
        }),
      ], { fileName: 'test.xlsx' });

      const ref = normalizePerson('66041525');
      expect(ref.id).toBe('66041525');
      expect(ref.name).toBe('张三');
    });

    it('resolves numeric employee id to PersonRef when stored as number', () => {
      saveEmployeeDirectory([
        {
          id: 57968473,
          name: '李四',
          displayName: '李四 (Li.Si)',
          orgPath: '线 > 大区',
          orgChain: [],
          ldap: '',
          searchTokens: [],
        },
      ], { fileName: 'test.xlsx' });

      expect(getEmployeeById('57968473').name).toBe('李四');
      expect(renderPerson('57968473')).toBe('李四 (Li.Si)');
      const ref = normalizePerson('57968473');
      expect(ref.name).toBe('李四');
    });

    it('resolves legacy object with id-like name', () => {
      saveEmployeeDirectory([
        {
          id: 57968473,
          name: '李四',
          displayName: '李四 (Li.Si)',
          orgPath: '线 > 大区',
          orgChain: [],
          ldap: '',
          searchTokens: [],
        },
      ], { fileName: 'test.xlsx' });

      expect(renderPerson({ _legacy: true, name: '57968473' })).toBe('李四 (Li.Si)');
      expect(renderPerson({ _stale: true, name: '57968473' })).toBe('李四 (Li.Si)');
      expect(renderPerson(57968473)).toBe('李四 (Li.Si)');
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

  describe('normalizePersonField', () => {
    it('updates field to PersonRef when employee exists', () => {
      saveEmployeeDirectory([
        buildEmployeeFromRow({
          '工号': '1', '姓名': '张三', '英文名': 'Zhang', '组织全称': '线-大区-A组',
          'ldap': '1', '直接负责人': '',
        }),
      ]);
      const obj = { owner: '张三' };
      const result = normalizePersonField(obj, 'owner');
      expect(result.changed).toBe(true);
      expect(result.status).toBe('updated');
      expect(obj.owner).toMatchObject({ id: '1', name: '张三' });
    });

    it('marks unknown string as legacy', () => {
      saveEmployeeDirectory([
        buildEmployeeFromRow({
          '工号': '1', '姓名': '张三', '组织全称': '线-大区-A组',
          'ldap': '1', '直接负责人': '',
        }),
      ]);
      const obj = { owner: '不存在的人' };
      const result = normalizePersonField(obj, 'owner');
      expect(result.changed).toBe(true);
      expect(result.status).toBe('legacy');
      expect(obj.owner).toMatchObject({ _legacy: true, name: '不存在的人' });
    });

    it('leaves empty values unchanged', () => {
      const obj = { owner: undefined };
      const result = normalizePersonField(obj, 'owner');
      expect(result.changed).toBe(false);
      expect(obj.owner).toBeUndefined();
    });
  });

  describe('rebuildPersonRefs', () => {
    beforeEach(() => {
      storageMap.clear();
    });

    it('returns empty result when no data exists', async () => {
      const result = await rebuildPersonRefs();
      expect(result.success).toBe(true);
      expect(result.totalScanned).toBe(0);
      expect(result.modules).toHaveLength(4);
      expect(result.modules.every(m => m.scanned === 0)).toBe(true);
    });

    it('rebuilds meetings person refs', async () => {
      saveEmployeeDirectory([
        buildEmployeeFromRow({
          '工号': '1', '姓名': '张三', '英文名': 'Zhang', '组织全称': '线-大区-A组',
          'ldap': '1', '直接负责人': '',
        }),
        buildEmployeeFromRow({
          '工号': '2', '姓名': '李四', '英文名': 'Li', '组织全称': '线-大区-B组',
          'ldap': '2', '直接负责人': '',
        }),
      ]);

      storageMap.set('dste_meetings', JSON.stringify([
        {
          id: 'm1', title: 'M1', host: '张三', recorder: '李四',
          agenda_items: [{ title: 'A1', owner: '张三' }],
          actions: [{ content: 'AC1', owner: '李四' }],
          decisions: [{ content: 'D1', owner: '张三', decider: '未知' }],
        },
      ]));

      const result = await rebuildPersonRefs();
      const meetingsModule = result.modules.find(m => m.name === 'meetings');
      expect(meetingsModule.scanned).toBe(6);
      expect(meetingsModule.updated).toBe(5);
      expect(meetingsModule.legacy).toBe(1);

      const meetings = JSON.parse(storageMap.get('dste_meetings'));
      expect(meetings[0].host).toMatchObject({ id: '1', name: '张三' });
      expect(meetings[0].recorder).toMatchObject({ id: '2', name: '李四' });
      expect(meetings[0].actions[0].owner).toMatchObject({ id: '2', name: '李四' });
      expect(meetings[0].decisions[0].decider).toMatchObject({ _legacy: true, name: '未知' });
    });

    it('rebuilds business-topics person refs', async () => {
      saveEmployeeDirectory([
        buildEmployeeFromRow({
          '工号': '1', '姓名': '张三', '组织全称': '线-大区-A组',
          'ldap': '1', '直接负责人': '',
        }),
      ]);

      storageMap.set('dste_business_topics_v2', JSON.stringify([
        { id: 't1', name: 'T1', owner: '张三' },
        { id: 't2', name: 'T2', owner: ' nobody ' },
      ]));

      const result = await rebuildPersonRefs();
      const topicsModule = result.modules.find(m => m.name === 'business-topics');
      expect(topicsModule.scanned).toBe(2);
      expect(topicsModule.updated).toBe(1);
      expect(topicsModule.legacy).toBe(1);

      const topics = JSON.parse(storageMap.get('dste_business_topics_v2'));
      expect(topics[0].owner).toMatchObject({ id: '1', name: '张三' });
      expect(topics[1].owner).toMatchObject({ _legacy: true, name: ' nobody ' });
    });

    it('rebuilds strategy-map person refs', async () => {
      saveEmployeeDirectory([
        buildEmployeeFromRow({
          '工号': '1', '姓名': '张三', '组织全称': '线-大区-A组',
          'ldap': '1', '直接负责人': '',
        }),
      ]);

      storageMap.set('dste_sm_maps_v3', JSON.stringify([{ id: 'map1', name: 'Map1' }]));
      storageMap.set('dste_sm_obj_map1_v3', JSON.stringify([
        { id: 'o1', name: 'O1', owner: '张三' },
        { id: 'o2', name: 'O2', owner: '不存在' },
      ]));

      const result = await rebuildPersonRefs();
      const smModule = result.modules.find(m => m.name === 'strategy-map');
      expect(smModule.scanned).toBe(2);
      expect(smModule.updated).toBe(1);
      expect(smModule.legacy).toBe(1);

      const objectives = JSON.parse(storageMap.get('dste_sm_obj_map1_v3'));
      expect(objectives[0].owner).toMatchObject({ id: '1', name: '张三' });
      expect(objectives[1].owner).toMatchObject({ _legacy: true, name: '不存在' });
    });

    it('rebuilds OMP person refs including members array', async () => {
      saveEmployeeDirectory([
        buildEmployeeFromRow({
          '工号': '1', '姓名': '张三', '组织全称': '线-大区-A组',
          'ldap': '1', '直接负责人': '',
        }),
        buildEmployeeFromRow({
          '工号': '2', '姓名': '李四', '组织全称': '线-大区-B组',
          'ldap': '2', '直接负责人': '',
        }),
      ]);

      storageMap.set('dste_omp_kpi_instances_v1', JSON.stringify([
        { id: 'k1', owner: '张三' },
      ]));
      storageMap.set('dste_omp_tasks_v1', JSON.stringify([
        { id: 'task1', owner: '李四', members: ['张三', ' nobody '] },
      ]));

      const result = await rebuildPersonRefs();
      const ompModule = result.modules.find(m => m.name === 'omp');
      expect(ompModule.scanned).toBe(4);
      expect(ompModule.updated).toBe(3);
      expect(ompModule.legacy).toBe(1);

      const kpis = JSON.parse(storageMap.get('dste_omp_kpi_instances_v1'));
      expect(kpis[0].owner).toMatchObject({ id: '1', name: '张三' });

      const tasks = JSON.parse(storageMap.get('dste_omp_tasks_v1'));
      expect(tasks[0].owner).toMatchObject({ id: '2', name: '李四' });
      expect(tasks[0].members[0]).toMatchObject({ id: '1', name: '张三' });
      expect(tasks[0].members[1]).toMatchObject({ _legacy: true, name: ' nobody ' });
    });

    it('calls registered rebuilders and aggregates stats', async () => {
      registerPersonRefRebuilder('custom-module', () => ({ scanned: 5, updated: 2, stale: 1, legacy: 0, changed: true }));
      const result = await rebuildPersonRefs();
      const customModule = result.modules.find(m => m.name === 'custom-module');
      expect(customModule).toBeDefined();
      expect(customModule.scanned).toBe(5);
      expect(customModule.updated).toBe(2);
      expect(result.totalScanned).toBeGreaterThanOrEqual(5);
      unregisterPersonRefRebuilder('custom-module');
    });

    it('replaces duplicate rebuilder registrations', async () => {
      registerPersonRefRebuilder('dup', () => ({ scanned: 1, updated: 0, stale: 0, legacy: 0, changed: false }));
      registerPersonRefRebuilder('dup', () => ({ scanned: 2, updated: 1, stale: 0, legacy: 0, changed: true }));
      const result = await rebuildPersonRefs();
      const dupModule = result.modules.find(m => m.name === 'dup');
      expect(dupModule.scanned).toBe(2);
      unregisterPersonRefRebuilder('dup');
    });

    it('handles rebuilder errors gracefully', async () => {
      registerPersonRefRebuilder('failing-module', () => { throw new Error('boom'); });
      const result = await rebuildPersonRefs();
      expect(result.success).toBe(true);
      expect(result.errors.some(e => e.name === 'failing-module' && e.error === 'boom')).toBe(true);
      unregisterPersonRefRebuilder('failing-module');
    });
  });

  describe('cloud sync', () => {
    beforeEach(() => {
      storageMap.clear();
      vi.stubGlobal('fetch', undefined);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    function makeEmployee(id, name) {
      return buildEmployeeFromRow({
        '工号': id, '姓名': name, '英文名': `E${id}`, '组织全称': '线-大区-A组',
        '一级组织': '线', '一级团队': '大区', '二级团队': 'A组', '三级团队': '',
        'ldap': `${id},2,3`, '直接负责人': '',
      });
    }

    it('stamps lastModified on employees when saving', () => {
      const before = Date.now();
      saveEmployeeDirectory([makeEmployee('1', '张三')]);
      const emps = getEmployees();
      expect(emps[0].lastModified).toBeGreaterThanOrEqual(before);
      expect(emps[0].lastModified).toBeLessThanOrEqual(Date.now());
    });

    it('wraps orgUnits with lastModified when saving', () => {
      saveEmployeeDirectory([makeEmployee('1', '张三')]);
      const raw = JSON.parse(storageMap.get('dste_org_units_v1'));
      expect(raw.lastModified).toBeGreaterThan(0);
      expect(Object.keys(raw.data).length).toBeGreaterThan(0);
    });

    it('enqueues API save via syncQueue on save', () => {
      saveEmployeeDirectory([makeEmployee('1', '张三')], { fileName: 'test.xlsx' });
      const queueRaw = storageMap.get('dste_sync_queue');
      expect(queueRaw).toBeDefined();
      const queue = JSON.parse(queueRaw);
      const endpoints = queue.map(q => q.endpoint);
      expect(endpoints).toContain('/api/employees/1');
      expect(endpoints).toContain('/api/org-units');
      expect(endpoints).toContain('/api/employee-import-meta');
    });

    it('merges remote employees when remote is newer', async () => {
      const localEmp = makeEmployee('1', '张三');
      localEmp.lastModified = 1000;
      saveEmployeeDirectory([localEmp]);

      const remoteEmp = makeEmployee('2', '李四');
      remoteEmp.lastModified = 2000;

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ success: true, data: [remoteEmp] }),
      }));

      const result = await loadRemoteEmployeeDirectory();
      expect(result.success).toBe(true);
      expect(result.merged).toBe(true);
      expect(getEmployees().some(e => e.id === '2')).toBe(true);
    });

    it('keeps local employees when local is newer', async () => {
      const localEmp = makeEmployee('1', '张三');
      localEmp.lastModified = 3000;
      saveEmployeeDirectory([localEmp]);

      const remoteEmp = { ...makeEmployee('1', '云端张三'), lastModified: 1000 };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ success: true, data: [remoteEmp] }),
      }));

      await loadRemoteEmployeeDirectory();
      expect(getEmployeeById('1').name).toBe('张三');
    });

    it('uses remote employees when local is empty', async () => {
      const remoteEmp = makeEmployee('1', '张三');
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ success: true, data: [remoteEmp] }),
      }));

      const result = await loadRemoteEmployeeDirectory();
      expect(result.merged).toBe(true);
      expect(getEmployees().length).toBe(1);
    });

    it('handles offline gracefully', async () => {
      saveEmployeeDirectory([makeEmployee('1', '张三')]);
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

      const result = await loadRemoteEmployeeDirectory();
      expect(result.success).toBe(false);
      expect(getEmployees().length).toBe(1);
    });

    it('pushes empty state to API on clear', () => {
      saveEmployeeDirectory([makeEmployee('1', '张三')]);
      storageMap.delete('dste_sync_queue');

      clearEmployeeDirectory();
      const queue = JSON.parse(storageMap.get('dste_sync_queue'));
      const employeesOp = queue.find(q => q.endpoint === '/api/employees/1');
      expect(employeesOp.method).toBe('DELETE');
    });

    it('reads legacy orgUnits without wrapper', () => {
      const legacyOrgUnits = { 'org:线': { id: 'org:线', name: '线', level: 0, employeeCount: 1, children: [] } };
      storageMap.set('dste_org_units_v1', JSON.stringify(legacyOrgUnits));
      expect(getOrgUnits()['org:线'].name).toBe('线');
    });

    it('migrates legacy orgUnits on save', () => {
      const legacyOrgUnits = { 'org:线': { id: 'org:线', name: '线', level: 0, employeeCount: 1, children: [] } };
      storageMap.set('dste_org_units_v1', JSON.stringify(legacyOrgUnits));
      saveEmployeeDirectory([makeEmployee('1', '张三')]);
      const raw = JSON.parse(storageMap.get('dste_org_units_v1'));
      expect(raw.data).toBeDefined();
      expect(raw.lastModified).toBeGreaterThan(0);
    });
  });
});
