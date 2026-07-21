/**
 * 员工/组织架构目录
 * 提供统一的员工数据模型、组织架构构建、搜索与标准化能力。
 */

import { Repository } from './repository.js';
import { Storage } from './utils.js';
import { getDefaultSyncQueue } from './sync-queue.js';
import { ensureLastModified } from './conflict-resolver.js';
import {
  computeEntityDiff,
  mergeEntities,
  enqueuePerRecordSync,
  createPerItemExecutor,
  apiLoadArray,
} from './per-record-sync.js';

// ===================== 常量 =====================
export const EMPLOYEES_STORAGE_KEY = 'dste_employees_v1';
export const ORG_UNITS_STORAGE_KEY = 'dste_org_units_v1';
export const IMPORT_META_STORAGE_KEY = 'dste_employee_import_meta';

const DEFAULT_EMPLOYEES_REPO_OPTIONS = {
  storageKey: EMPLOYEES_STORAGE_KEY,
  schema: 'array',
  version: 2,
  backupNamespace: 'directory',
  migrators: {
    2: (employees) => {
      employees.forEach(emp => {
        if (emp && typeof emp === 'object' && !emp.lastModified) {
          emp.lastModified = Date.now();
        }
      });
      return employees;
    },
  },
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

// ===================== 云端同步基础设施 =====================

function getApiBase() {
  const host = (typeof window !== 'undefined' && window.location.hostname) || '';
  if (host === 'localhost' || host === '127.0.0.1' || host === 'dste.jasonxspace.cc') {
    return Storage.getString('dste_api_base') || '';
  }
  return ''; // 生产环境走同域 /api/ 代理
}

const syncQueue = getDefaultSyncQueue();
const perItemExecutor = createPerItemExecutor();

function createBulkExecutor(endpoint) {
  return async (operation) => {
    const apiBase = getApiBase();
    const token = Storage.getString('dste-token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(apiBase + endpoint, {
      method: operation.method || 'POST',
      headers,
      body: JSON.stringify(operation.payload),
    });
    if (resp.status === 401) {
      // 登录过期：抛出而非静默 return，避免变更被队列误判完成后丢弃。
      const err = new Error('登录已过期，人员/组织数据未能同步到云端');
      err.authExpired = true;
      throw err;
    }
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
  };
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  syncQueue.bindAutoProcess(perItemExecutor);
  syncQueue.bindAutoProcess(createBulkExecutor('/api/org-units'));
  syncQueue.bindAutoProcess(createBulkExecutor('/api/employee-import-meta'));
}

function _apiSaveBulk(endpoint, payload) {
  syncQueue.enqueue({
    endpoint,
    method: 'POST',
    payload,
    executor: createBulkExecutor(endpoint),
  });
}

function _apiSaveOrgUnits(orgUnits) {
  _apiSaveBulk('/api/org-units', orgUnits);
}

function _apiSaveImportMeta(meta) {
  _apiSaveBulk('/api/employee-import-meta', meta);
}

async function _apiLoad(endpoint) {
  const apiBase = getApiBase();
  const token = Storage.getString('dste-token');
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  try {
    const resp = await fetch(apiBase + endpoint, { headers });
    if (resp.status === 401) {
      console.warn(`[employee-directory] API load returned 401 for ${endpoint}`);
      return { ok: false, data: null, status: 401 };
    }
    const json = await resp.json();
    if (json.success && json.data !== undefined) return { ok: true, data: json.data };
    return { ok: true, data: null };
  } catch (e) {
    console.warn(`[employee-directory] API load failed for ${endpoint}:`, e.message);
    return { ok: false, data: null, error: e.message };
  }
}

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
  const ldap = String(row['ldap'] || '').trim();
  const orgChain = ldap.split(',').map(s => s.trim()).filter(Boolean);

  const l1Org = String(row['一级组织'] || '').trim();
  const l1Team = String(row['一级团队'] || '').trim();
  const l2Team = String(row['二级团队'] || '').trim();
  const l3Team = String(row['三级团队'] || '').trim();
  const teamPath = [l1Org, l1Team, l2Team, l3Team].filter(Boolean);
  // 优先使用团队字段拼接组织路径；没有团队字段时回退到组织全称
  const orgPath = teamPath.length > 0 ? teamPath.join(' > ') : String(row['组织全称'] || '').trim();

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
    l1Org,
    l1Team,
    l2Team,
    l3Team,
    l1Function: String(row['一级职能'] || '').trim(),
    l2Function: String(row['二级职能'] || '').trim(),
    orgId: orgChain[0] || String(row['组织ID'] || '').trim(),
    ldap,
    orgChain,
    managerName: String(row['直接负责人'] || '').trim(),
    managerEnglishName: String(row['直接负责人英文名'] || '').trim(),
    searchTokens: buildSearchTokens({ name, englishName, wechatName, orgPath, l1Team, l2Team, l3Team }),
  };

  return emp;
}

function buildSearchTokens({ name, englishName, wechatName, orgPath, l1Team, l2Team, l3Team }) {
  const tokens = new Set();
  [name, englishName, wechatName, l1Team, l2Team, l3Team].forEach(v => {
    if (v) tokens.add(String(v).toLowerCase());
  });
  if (orgPath) {
    orgPath.split(/[- >]+/).forEach(p => tokens.add(p.trim().toLowerCase()));
  }
  return Array.from(tokens);
}

/**
 * 根据团队路径生成稳定的组织单元 ID
 * @param {string[]} pathParts
 * @returns {string}
 */
function makeOrgId(pathParts) {
  return `org:${pathParts.join('/')}`;
}

/**
 * 根据员工列表构建组织架构
 * 以「一级组织 → 一级团队 → 二级团队 → 三级团队」为层级，保留多级结构。
 * @param {Array} employees
 * @returns {{orgUnits: object, roots: string[]}}
 */
export function buildOrgHierarchy(employees) {
  const orgUnits = new Map();

  employees.forEach(emp => {
    const pathParts = [emp.l1Org, emp.l1Team, emp.l2Team, emp.l3Team].filter(Boolean);
    if (pathParts.length === 0) return;

    // 创建路径上每一级组织单元
    let parentId = null;
    for (let i = 0; i < pathParts.length; i++) {
      const nodePath = pathParts.slice(0, i + 1);
      const id = makeOrgId(nodePath);
      const name = pathParts[i];

      if (!orgUnits.has(id)) {
        orgUnits.set(id, {
          id,
          name,
          level: i,
          parentId,
          path: nodePath.join(' > '),
          employeeCount: 0,
          children: [],
        });

        if (parentId && orgUnits.has(parentId)) {
          const parent = orgUnits.get(parentId);
          if (!parent.children.includes(id)) parent.children.push(id);
        }
      }

      parentId = id;
    }

    // 统计人数：路径上所有节点均 +1
    for (let i = 0; i < pathParts.length; i++) {
      const id = makeOrgId(pathParts.slice(0, i + 1));
      const unit = orgUnits.get(id);
      if (unit) unit.employeeCount++;
    }
  });

  const roots = [];
  orgUnits.forEach((unit) => {
    if (!unit.parentId) roots.push(unit.id);
  });

  // 按组织名称排序，保证战区/子团队顺序稳定
  const getOrgName = (id) => (orgUnits.has(id) ? orgUnits.get(id).name : id);
  roots.sort((a, b) => getOrgName(a).localeCompare(getOrgName(b), 'zh-CN'));
  orgUnits.forEach((unit) => {
    unit.children.sort((a, b) => getOrgName(a).localeCompare(getOrgName(b), 'zh-CN'));
  });

  return {
    orgUnits: Object.fromEntries(orgUnits),
    roots,
  };
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
  const raw = orgUnitsRepo.getRaw() || {};
  // 兼容旧格式：旧数据是平铺的 org 对象 map；新格式是 { lastModified, data }
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.data && typeof raw.data === 'object') {
    return raw.data;
  }
  return raw;
}

export function getOrgUnitsWrapper() {
  const raw = orgUnitsRepo.getRaw() || {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.data && typeof raw.data === 'object') {
    return raw;
  }
  return { lastModified: 0, data: raw };
}

export function getOrgTree() {
  const orgUnits = getOrgUnits();
  const roots = Object.values(orgUnits).filter(u => !u.parentId).map(u => u.id);
  return { orgUnits, roots };
}

export function getEmployeeById(id) {
  if (!id) return null;
  const target = String(id);
  return getEmployees().find(emp => String(emp.id) === target) || null;
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
    const now = Date.now();
    const oldEmployees = employeesRepo.getRaw();
    ensureLastModified(employees);
    const { orgUnits } = buildOrgHierarchy(employees);
    const wrappedOrgUnits = { lastModified: now, data: orgUnits };
    const wrappedMeta = { lastModified: now, importedAt: new Date().toISOString(), count: employees.length, ...meta };

    const empOk = employeesRepo.set(employees);
    const orgOk = orgUnitsRepo.set(wrappedOrgUnits);
    if (!empOk || !orgOk) {
      return { success: false, error: 'localStorage 写入失败，可能超出配额' };
    }
    Storage.set(IMPORT_META_STORAGE_KEY, wrappedMeta);

    // 云端同步：employees 按 per-record 单条同步，orgUnits/importMeta 保持批量
    const { created, updated, deleted } = computeEntityDiff(oldEmployees, employees);
    enqueuePerRecordSync('employees', { created, updated, deleted }, perItemExecutor, syncQueue);
    _apiSaveOrgUnits(wrappedOrgUnits);
    _apiSaveImportMeta(wrappedMeta);

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 清空目录
 */
export function clearEmployeeDirectory() {
  const oldEmployees = employeesRepo.getRaw();
  employeesRepo.set([]);
  orgUnitsRepo.set({ lastModified: Date.now(), data: {} });
  Storage.remove(IMPORT_META_STORAGE_KEY);

  // employees 逐条删除，先清 pending 再发 DELETE
  for (const emp of oldEmployees) {
    syncQueue.removePendingForResource(`employees/${encodeURIComponent(emp.id)}`);
    syncQueue.enqueue({
      endpoint: `/api/employees/${encodeURIComponent(emp.id)}`,
      method: 'DELETE',
      executor: perItemExecutor,
    }, { autoProcess: false });
  }
  syncQueue.processQueue(perItemExecutor);

  _apiSaveOrgUnits({ lastModified: Date.now(), data: {} });
  _apiSaveImportMeta(null);
}

/**
 * 从云端加载并合并员工目录数据
 * @returns {Promise<{success: boolean, merged: boolean, error?: string}>}
 */
export async function loadRemoteEmployeeDirectory() {
  const [employeesResult, orgUnitsResult, metaResult] = await Promise.all([
    apiLoadArray('/api/employees').then(data => ({ ok: data !== null, data })),
    _apiLoad('/api/org-units'),
    _apiLoad('/api/employee-import-meta'),
  ]);

  // 如果所有请求都失败，视为离线
  if (!employeesResult.ok && !orgUnitsResult.ok && !metaResult.ok) {
    return { success: false, merged: false, error: 'offline' };
  }

  const remoteEmployees = employeesResult.data;
  const remoteOrgUnits = orgUnitsResult.data;
  const remoteMeta = metaResult.data;

  const localEmployees = employeesRepo.getRaw() || [];
  const localOrgUnitsWrapper = getOrgUnitsWrapper();
  const localMetaWrapper = getImportMetaWrapper();

  let mergedEmployees = localEmployees;
  let mergedOrgUnitsWrapper = localOrgUnitsWrapper;
  let mergedMetaWrapper = localMetaWrapper;
  let merged = false;

  // 员工数组：按 version + lastModified 逐条合并
  if (Array.isArray(remoteEmployees) && remoteEmployees.length > 0) {
    mergedEmployees = localEmployees.length === 0
      ? remoteEmployees
      : mergeEntities(ensureLastModified(localEmployees), ensureLastModified(remoteEmployees));
    merged = true;
  }

  // orgUnits：wrapper 级别比较 lastModified
  if (remoteOrgUnits && typeof remoteOrgUnits === 'object' && remoteOrgUnits.data && typeof remoteOrgUnits.data === 'object') {
    const remoteTs = Number(remoteOrgUnits.lastModified) || 0;
    const localTs = Number(localOrgUnitsWrapper.lastModified) || 0;
    if (remoteTs > localTs) {
      mergedOrgUnitsWrapper = remoteOrgUnits;
      merged = true;
    }
  }

  // importMeta：wrapper 级别比较 lastModified
  if (remoteMeta && typeof remoteMeta === 'object' && remoteMeta.lastModified) {
    const remoteTs = Number(remoteMeta.lastModified) || 0;
    const localTs = localMetaWrapper ? (Number(localMetaWrapper.lastModified) || 0) : 0;
    if (!localMetaWrapper || remoteTs > localTs) {
      mergedMetaWrapper = remoteMeta;
      merged = true;
    }
  }

  // 写回本地
  if (merged) {
    employeesRepo.set(mergedEmployees);
    orgUnitsRepo.set(mergedOrgUnitsWrapper);
    if (mergedMetaWrapper) {
      Storage.set(IMPORT_META_STORAGE_KEY, mergedMetaWrapper);
    }
  }

  // 若远程为空但本地有数据，尝试把本地推上去（首次从旧设备切换过来的情况）
  if (!remoteEmployees && localEmployees.length > 0) {
    const { created } = computeEntityDiff([], localEmployees);
    enqueuePerRecordSync('employees', { created, updated: [], deleted: [] }, perItemExecutor, syncQueue);
    _apiSaveOrgUnits(localOrgUnitsWrapper);
    if (localMetaWrapper) _apiSaveImportMeta(localMetaWrapper);
  }

  return { success: true, merged };
}

/**
 * 初始化员工目录：从云端拉取并合并
 */
export async function initEmployeeDirectory() {
  return loadRemoteEmployeeDirectory();
}

export function getImportMeta() {
  const raw = Storage.get(IMPORT_META_STORAGE_KEY, null);
  if (!raw) return null;
  // 兼容旧格式：旧数据是 { importedAt, count, fileName }；新格式带 lastModified
  if (typeof raw === 'object' && !raw.lastModified) {
    return { ...raw, lastModified: 0 };
  }
  return raw;
}

function getImportMetaWrapper() {
  const raw = Storage.get(IMPORT_META_STORAGE_KEY, null);
  if (!raw) return null;
  if (typeof raw === 'object' && !raw.lastModified) {
    return { ...raw, lastModified: 0 };
  }
  return raw;
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
    const trimmed = value.trim();
    if (!trimmed) return null;
    // 优先按工号查找（兼容成员拖拽后存的是 emp.id）
    const byId = getEmployeeById(trimmed);
    if (byId) {
      return {
        id: byId.id,
        name: byId.name,
        displayName: byId.displayName,
        orgPath: byId.orgPath,
      };
    }
    const emp = getEmployeeByName(trimmed) || fuzzyFindEmployeeByDisplayName(trimmed);
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

// ===================== 人员引用重建 =====================

/**
 * 标准化单个人员字段的结果描述
 * @param {*} value
 * @returns {{ value: *, changed: boolean, status: 'updated'|'stale'|'legacy'|'unchanged' }}
 */
function normalizePersonValue(value) {
  const normalized = normalizePerson(value);
  if (normalized === value) {
    return { value, changed: false, status: 'unchanged' };
  }
  // 原值为空时 normalizePerson 返回 null，保持原空值形态不变
  if (!value && normalized === null) {
    return { value, changed: false, status: 'unchanged' };
  }
  let status = 'updated';
  if (normalized && normalized._stale) status = 'stale';
  else if (normalized && normalized._legacy) status = 'legacy';
  return { value: normalized, changed: true, status };
}

/**
 * 把标准化结果写回对象字段
 * @param {Object} obj
 * @param {string} field
 * @returns {{ changed: boolean, status: 'updated'|'stale'|'legacy'|'unchanged' }}
 */
export function normalizePersonField(obj, field) {
  const result = normalizePersonValue(obj[field]);
  if (result.changed) {
    obj[field] = result.value;
  }
  return result;
}

function createRebuildTracker() {
  let scanned = 0;
  let updated = 0;
  let stale = 0;
  let legacy = 0;
  return {
    track(result) {
      scanned++;
      if (result.status === 'updated') updated++;
      else if (result.status === 'stale') stale++;
      else if (result.status === 'legacy') legacy++;
      return result.changed;
    },
    stats() {
      return { scanned, updated, stale, legacy };
    },
  };
}

const PERSON_REF_STORAGE_KEYS = {
  meetings: 'dste_meetings',
  businessTopics: 'dste_business_topics_v2',
  strategyMaps: 'dste_sm_maps_v3',
  strategyObjectives: (mapId) => `dste_sm_obj_${mapId}_v3`,
  ompKpiInstances: 'dste_omp_kpi_instances_v1',
  ompTasks: 'dste_omp_tasks_v1',
};

function _rebuildMeetingsPersonRefs() {
  const meetings = Storage.get(PERSON_REF_STORAGE_KEYS.meetings, []);
  if (!Array.isArray(meetings)) return { scanned: 0, updated: 0, stale: 0, legacy: 0, changed: false };

  const tracker = createRebuildTracker();
  let changed = false;

  meetings.forEach(m => {
    changed = tracker.track(normalizePersonField(m, 'host')) || changed;
    changed = tracker.track(normalizePersonField(m, 'recorder')) || changed;
    (m.agenda_items || []).forEach(item => {
      changed = tracker.track(normalizePersonField(item, 'owner')) || changed;
    });
    (m.actions || []).forEach(a => {
      changed = tracker.track(normalizePersonField(a, 'owner')) || changed;
    });
    (m.decisions || []).forEach(d => {
      changed = tracker.track(normalizePersonField(d, 'owner')) || changed;
      changed = tracker.track(normalizePersonField(d, 'decider')) || changed;
    });
  });

  if (changed) Storage.set(PERSON_REF_STORAGE_KEYS.meetings, meetings);
  return { ...tracker.stats(), changed };
}

function _rebuildTopicsPersonRefs() {
  const topics = Storage.get(PERSON_REF_STORAGE_KEYS.businessTopics, []);
  if (!Array.isArray(topics)) return { scanned: 0, updated: 0, stale: 0, legacy: 0, changed: false };

  const tracker = createRebuildTracker();
  let changed = false;

  topics.forEach(t => {
    changed = tracker.track(normalizePersonField(t, 'owner')) || changed;
  });

  if (changed) Storage.set(PERSON_REF_STORAGE_KEYS.businessTopics, topics);
  return { ...tracker.stats(), changed };
}

function _rebuildStrategyMapPersonRefs() {
  const maps = Storage.get(PERSON_REF_STORAGE_KEYS.strategyMaps, []);
  if (!Array.isArray(maps)) return { scanned: 0, updated: 0, stale: 0, legacy: 0, changed: false };

  const tracker = createRebuildTracker();
  let changed = false;

  maps.forEach(map => {
    if (!map || !map.id) return;
    const objectives = Storage.get(PERSON_REF_STORAGE_KEYS.strategyObjectives(map.id), []);
    if (!Array.isArray(objectives)) return;

    let objectivesChanged = false;
    objectives.forEach(o => {
      objectivesChanged = tracker.track(normalizePersonField(o, 'owner')) || objectivesChanged;
    });

    if (objectivesChanged) {
      Storage.set(PERSON_REF_STORAGE_KEYS.strategyObjectives(map.id), objectives);
      changed = true;
    }
  });

  return { ...tracker.stats(), changed };
}

function _rebuildOmpPersonRefs() {
  const tracker = createRebuildTracker();
  let changed = false;

  const kpiInstances = Storage.get(PERSON_REF_STORAGE_KEYS.ompKpiInstances, []);
  if (Array.isArray(kpiInstances)) {
    let kpiChanged = false;
    kpiInstances.forEach(k => {
      kpiChanged = tracker.track(normalizePersonField(k, 'owner')) || kpiChanged;
    });
    if (kpiChanged) {
      Storage.set(PERSON_REF_STORAGE_KEYS.ompKpiInstances, kpiInstances);
      changed = true;
    }
  }

  const tasks = Storage.get(PERSON_REF_STORAGE_KEYS.ompTasks, []);
  if (Array.isArray(tasks)) {
    let tasksChanged = false;
    tasks.forEach(t => {
      tasksChanged = tracker.track(normalizePersonField(t, 'owner')) || tasksChanged;
      (t.members || []).forEach((member, idx) => {
        const result = normalizePersonValue(member);
        if (result.changed) {
          t.members[idx] = result.value;
          tasksChanged = true;
        }
        tracker.track(result);
      });
    });
    if (tasksChanged) {
      Storage.set(PERSON_REF_STORAGE_KEYS.ompTasks, tasks);
      changed = true;
    }
  }

  return { ...tracker.stats(), changed };
}

const _personRefRebuilders = [];

/**
 * 注册自定义人员引用重建器（用于未来扩展模块）
 * @param {string} name
 * @param {Function} handler - 返回 { scanned, updated, stale, legacy, changed }
 */
export function registerPersonRefRebuilder(name, handler) {
  if (typeof handler !== 'function') {
    console.warn(`[employee-directory] Invalid rebuilder for ${name}`);
    return;
  }
  const idx = _personRefRebuilders.findIndex(r => r.name === name);
  if (idx >= 0) _personRefRebuilders.splice(idx, 1);
  _personRefRebuilders.push({ name, handler });
}

/**
 * 移除已注册的人员引用重建器
 * @param {string} name
 */
export function unregisterPersonRefRebuilder(name) {
  const idx = _personRefRebuilders.findIndex(r => r.name === name);
  if (idx >= 0) _personRefRebuilders.splice(idx, 1);
}

/**
 * 重新解析现有实体中的人员引用
 * 在人员目录重新导入后自动调用，也会扫描经营分析会、业务专题、战略地图、OMP。
 * @returns {Promise<{success: boolean, totalScanned: number, totalUpdated: number, totalStale: number, totalLegacy: number, modules: Array, errors: Array}>}
 */
export async function rebuildPersonRefs() {
  const result = {
    success: true,
    totalScanned: 0,
    totalUpdated: 0,
    totalStale: 0,
    totalLegacy: 0,
    modules: [],
    errors: [],
  };

  const builtIn = [
    ['meetings', _rebuildMeetingsPersonRefs],
    ['business-topics', _rebuildTopicsPersonRefs],
    ['strategy-map', _rebuildStrategyMapPersonRefs],
    ['omp', _rebuildOmpPersonRefs],
  ];

  const allRebuilders = [
    ...builtIn.map(([name, fn]) => ({ name, fn })),
    ..._personRefRebuilders.map(({ name, handler }) => ({ name, fn: handler })),
  ];

  if (allRebuilders.length === 0) {
    return result;
  }

  for (const { name, fn } of allRebuilders) {
    try {
      const m = await fn();
      result.modules.push({ name, scanned: m.scanned || 0, updated: m.updated || 0, stale: m.stale || 0, legacy: m.legacy || 0, changed: !!m.changed });
      result.totalScanned += m.scanned || 0;
      result.totalUpdated += m.updated || 0;
      result.totalStale += m.stale || 0;
      result.totalLegacy += m.legacy || 0;
    } catch (e) {
      console.error(`[employee-directory] Rebuild failed for ${name}:`, e);
      result.errors.push({ name, error: e.message });
    }
  }

  return result;
}

/**
 * 渲染人员引用为展示字符串
 * @param {*} personRef
 * @returns {string}
 */
export function renderPerson(personRef) {
  if (!personRef) return '待定';
  if (typeof personRef === 'string') {
    const trimmed = personRef.trim();
    if (!trimmed) return '待定';
    const emp = getEmployeeById(trimmed);
    if (emp) return emp.displayName || emp.name || trimmed;
    return personRef;
  }
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
