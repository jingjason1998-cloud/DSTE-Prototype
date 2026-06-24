/**
 * 员工/组织架构目录
 * 提供统一的员工数据模型、组织架构构建、搜索与标准化能力。
 */

import { Repository } from './repository.js';
import { Storage } from './utils.js';

// ===================== 常量 =====================
export const EMPLOYEES_STORAGE_KEY = 'dste_employees_v1';
export const ORG_UNITS_STORAGE_KEY = 'dste_org_units_v1';
export const IMPORT_META_STORAGE_KEY = 'dste_employee_import_meta';

const DEFAULT_EMPLOYEES_REPO_OPTIONS = {
  storageKey: EMPLOYEES_STORAGE_KEY,
  schema: 'array',
  version: 1,
  backupNamespace: 'directory',
};

const DEFAULT_ORG_UNITS_REPO_OPTIONS = {
  storageKey: ORG_UNITS_STORAGE_KEY,
  schema: 'object',
  version: 1,
  backupNamespace: 'directory',
};

// ===================== Repository =====================
export function createEmployeesRepository(options = {}) {
  return new Repository('employees', { ...DEFAULT_EMPLOYEES_REPO_OPTIONS, ...options });
}

export function createOrgUnitsRepository(options = {}) {
  return new Repository('orgUnits', { ...DEFAULT_ORG_UNITS_REPO_OPTIONS, ...options });
}

const employeesRepo = createEmployeesRepository();
const orgUnitsRepo = createOrgUnitsRepository();

// ===================== 数据构建 =====================

/**
 * 从 Excel 行数据构建员工对象
 * @param {object} row
 * @returns {object}
 */
export function buildEmployeeFromRow(row) {
  const id = String(row['工号'] || '').trim();
  const name = String(row['姓名'] || '').trim();
  const englishName = String(row['英文名'] || '').trim();
  const wechatName = String(row['同学微信名'] || row['同学本人'] || '').trim();
  const orgPath = String(row['组织全称'] || '').trim();
  const ldap = String(row['ldap'] || '').trim();
  const orgChain = ldap.split(',').map(s => s.trim()).filter(Boolean);

  const displayName = name && englishName ? `${name} (${englishName})` : (name || englishName || wechatName || id);

  const emp = {
    id,
    name,
    englishName,
    displayName,
    wechatName,
    gender: String(row['性别'] || '').trim(),
    personnelType: String(row['人员类型_ssc'] || '').trim(),
    orgPath,
    l1Org: String(row['一级组织'] || '').trim(),
    l1Team: String(row['一级团队'] || '').trim(),
    l2Team: String(row['二级团队'] || '').trim(),
    l3Team: String(row['三级团队'] || '').trim(),
    l1Function: String(row['一级职能'] || '').trim(),
    l2Function: String(row['二级职能'] || '').trim(),
    orgId: orgChain[0] || String(row['组织ID'] || '').trim(),
    ldap,
    orgChain,
    managerName: String(row['直接负责人'] || '').trim(),
    managerEnglishName: String(row['直接负责人英文名'] || '').trim(),
    searchTokens: buildSearchTokens({ name, englishName, wechatName, orgPath, l1Team: row['一级团队'], l2Team: row['二级团队'], l3Team: row['三级团队'] }),
  };

  return emp;
}

function buildSearchTokens({ name, englishName, wechatName, orgPath, l1Team, l2Team, l3Team }) {
  const tokens = new Set();
  [name, englishName, wechatName, l1Team, l2Team, l3Team].forEach(v => {
    if (v) tokens.add(String(v).toLowerCase());
  });
  if (orgPath) {
    orgPath.split('-').forEach(p => tokens.add(p.trim().toLowerCase()));
  }
  return Array.from(tokens);
}

/**
 * 从 ldap 链解析组织名称
 * @param {string} orgId
 * @param {object} emp
 * @param {number} chainIdx 该 orgId 在 ldap 链中的索引（0=叶子）
 * @param {number} chainLength
 */
function resolveOrgName(orgId, emp, chainIdx, chainLength) {
  const idMap = {
    [String(emp['一级组织id'] || '').trim()]: emp['一级组织'],
    [String(emp['一级团队ID'] || '').trim()]: emp['一级团队'],
    [String(emp['二级团队ID'] || '').trim()]: emp['二级团队'],
    [String(emp['三级团队ID'] || '').trim()]: emp['三级团队'],
  };
  if (idMap[orgId]) return idMap[orgId];

  // 按 orgPath 分段回退
  const parts = (emp.orgPath || '').split('-').map(s => s.trim());
  const levelFromRoot = chainLength - 1 - chainIdx;
  if (parts[levelFromRoot]) return parts[levelFromRoot];

  return `组织-${orgId}`;
}

function buildOrgPath(chain, startIdx, orgUnits) {
  const names = [];
  for (let i = startIdx; i < chain.length; i++) {
    const unit = orgUnits.get(chain[i]);
    names.push(unit ? unit.name : chain[i]);
  }
  return names.join(' > ');
}

/**
 * 根据员工列表构建组织架构
 * @param {Array} employees
 * @returns {{orgUnits: object, roots: string[]}}
 */
export function buildOrgHierarchy(employees) {
  const orgUnits = new Map();

  // 第一步：创建所有组织单元
  employees.forEach(emp => {
    const chain = emp.orgChain || [];
    chain.forEach((orgId, idx) => {
      if (orgUnits.has(orgId)) return;
      const name = resolveOrgName(orgId, emp, idx, chain.length);
      orgUnits.set(orgId, {
        id: orgId,
        name,
        level: chain.length - 1 - idx,
        parentId: idx < chain.length - 1 ? chain[idx + 1] : null,
        path: '', // 第二步填充
        employeeCount: 0,
        children: [],
      });
    });
  });

  // 第二步：建立父子关系并生成 path
  const roots = [];
  orgUnits.forEach((unit, id) => {
    if (unit.parentId && orgUnits.has(unit.parentId)) {
      const parent = orgUnits.get(unit.parentId);
      if (!parent.children.includes(id)) parent.children.push(id);
    } else {
      roots.push(id);
    }
    unit.path = buildOrgPath([id, ...getAncestorIds(id, orgUnits)], 0, orgUnits);
  });

  // 第三步：统计人数（叶子及所有祖先）
  employees.forEach(emp => {
    const chain = emp.orgChain || [];
    chain.forEach(orgId => {
      const unit = orgUnits.get(orgId);
      if (unit) unit.employeeCount++;
    });
  });

  return {
    orgUnits: Object.fromEntries(orgUnits),
    roots,
  };
}

function getAncestorIds(orgId, orgUnits) {
  const ids = [];
  let current = orgUnits.get(orgId);
  while (current && current.parentId) {
    ids.push(current.parentId);
    current = orgUnits.get(current.parentId);
  }
  return ids;
}

// ===================== 搜索索引 =====================

/**
 * 构建员工搜索索引（按姓名、英文名、部门前缀）
 * @param {Array} employees
 * @returns {object}
 */
export function buildEmployeeIndex(employees) {
  const index = {
    byId: {},
    byToken: {},
  };

  employees.forEach(emp => {
    index.byId[emp.id] = emp;
    (emp.searchTokens || []).forEach(token => {
      if (!index.byToken[token]) index.byToken[token] = [];
      if (!index.byToken[token].includes(emp.id)) index.byToken[token].push(emp.id);
    });
  });

  return index;
}

// ===================== 读取接口 =====================

export function getEmployees() {
  return employeesRepo.getRaw() || [];
}

export function getOrgUnits() {
  return orgUnitsRepo.getRaw() || {};
}

export function getOrgTree() {
  const orgUnits = getOrgUnits();
  const roots = Object.values(orgUnits).filter(u => !u.parentId).map(u => u.id);
  return { orgUnits, roots };
}

export function getEmployeeById(id) {
  if (!id) return null;
  return getEmployees().find(emp => emp.id === String(id));
}

export function getEmployeeByName(name) {
  if (!name) return null;
  const target = String(name).trim().toLowerCase();
  return getEmployees().find(emp =>
    emp.name === name ||
    (emp.displayName || '').toLowerCase() === target ||
    (emp.englishName || '').toLowerCase() === target
  ) || null;
}

/**
 * 模糊搜索员工
 * @param {string} query
 * @param {number} limit
 * @returns {Array}
 */
export function searchEmployees(query, limit = 20) {
  if (!query || typeof query !== 'string') return [];
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const index = buildEmployeeIndex(getEmployees());
  const scored = new Map();

  // 按 token 前缀匹配
  Object.entries(index.byToken).forEach(([token, ids]) => {
    if (token.includes(q) || q.includes(token)) {
      ids.forEach(id => {
        const emp = index.byId[id];
        if (!emp) return;
        const score = token.startsWith(q) ? 2 : 1;
        scored.set(id, (scored.get(id) || 0) + score);
      });
    }
  });

  // 额外奖励：姓名/英文名直接前缀匹配
  getEmployees().forEach(emp => {
    const name = (emp.name || '').toLowerCase();
    const enName = (emp.englishName || '').toLowerCase();
    if (name.startsWith(q) || enName.startsWith(q)) {
      scored.set(emp.id, (scored.get(emp.id) || 0) + 3);
    }
  });

  return Array.from(scored.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => index.byId[id])
    .filter(Boolean);
}

export function hasEmployeeData() {
  return getEmployees().length > 0;
}

// ===================== 写入接口 =====================

/**
 * 保存员工目录和组织架构
 * @param {Array} employees
 * @param {object} meta
 * @returns {{success: boolean, error?: string}}
 */
export function saveEmployeeDirectory(employees, meta = {}) {
  try {
    const { orgUnits } = buildOrgHierarchy(employees);
    const empOk = employeesRepo.set(employees);
    const orgOk = orgUnitsRepo.set(orgUnits);
    if (!empOk || !orgOk) {
      return { success: false, error: 'localStorage 写入失败，可能超出配额' };
    }
    Storage.set(IMPORT_META_STORAGE_KEY, {
      importedAt: new Date().toISOString(),
      count: employees.length,
      ...meta,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 清空目录
 */
export function clearEmployeeDirectory() {
  employeesRepo.set([]);
  orgUnitsRepo.set({});
  Storage.remove(IMPORT_META_STORAGE_KEY);
}

/**
 * 获取导入元信息
 */
export function getImportMeta() {
  return Storage.get(IMPORT_META_STORAGE_KEY, null);
}

// ===================== PersonRef 兼容层 =====================

/**
 * 标准化人员引用（支持新对象、旧字符串、空值）
 * @param {*} value
 * @returns {object|null}
 */
export function normalizePerson(value) {
  if (!value) return null;

  if (typeof value === 'object' && value.id) {
    const emp = getEmployeeById(value.id);
    if (emp) {
      return {
        id: emp.id,
        name: emp.name,
        displayName: emp.displayName,
        orgPath: emp.orgPath,
      };
    }
    return { ...value, _stale: true };
  }

  if (typeof value === 'string') {
    const emp = getEmployeeByName(value) || fuzzyFindEmployeeByDisplayName(value);
    if (emp) {
      return {
        id: emp.id,
        name: emp.name,
        displayName: emp.displayName,
        orgPath: emp.orgPath,
      };
    }
    return { _legacy: true, name: value };
  }

  return null;
}

function fuzzyFindEmployeeByDisplayName(displayName) {
  if (!displayName) return null;
  const target = String(displayName).toLowerCase();
  return getEmployees().find(emp => {
    if (!emp.displayName) return false;
    return emp.displayName.toLowerCase() === target;
  }) || null;
}

/**
 * 渲染人员引用为展示字符串
 * @param {*} personRef
 * @returns {string}
 */
export function renderPerson(personRef) {
  if (!personRef) return '待定';
  if (typeof personRef === 'string') return personRef;
  if (personRef._legacy) return personRef.name;
  if (personRef._stale) return `${personRef.name || '未知'} (已离职)`;
  return personRef.displayName || personRef.name || '未知';
}

/**
 * 渲染人员引用为带组织路径的展示字符串
 * @param {*} personRef
 * @returns {string}
 */
export function renderPersonWithOrg(personRef) {
  const base = renderPerson(personRef);
  if (typeof personRef === 'object' && personRef.orgPath) {
    return `${base} · ${personRef.orgPath}`;
  }
  return base;
}

// ===================== 匹配辅助 =====================

/**
 * 判断人员引用是否匹配目标字符串（兼容字符串、PersonRef 对象、legacy/freeText）
 * @param {*} personRef
 * @param {string} target
 * @returns {boolean}
 */
export function personMatches(personRef, target) {
  if (!personRef || !target) return false;
  const targetStr = String(target).trim();
  if (typeof personRef === 'string') return personRef === targetStr;
  if (personRef.id && String(personRef.id) === targetStr) return true;
  if (personRef.name && String(personRef.name).trim() === targetStr) return true;
  return false;
}

// ===================== 重新关联（后续阶段扩展）====================

/**
 * 重新解析现有实体中的人员引用
 * 注：第一阶段仅提供函数签名，具体模块集成在后续阶段实现
 */
export function rebuildPersonRefs() {
  // TODO: 第二阶段接入会议、业务专题、OMP、战略地图后扩展
  console.log('[employee-directory] rebuildPersonRefs called');
}
