/**
 * 数据迁移与备份工具
 * 提供版本链迁移、统一备份键管理、数据校验与备份清理。
 */

import { Storage } from './utils.js';

const BACKUP_KEY_PREFIX = 'dste_backup_';
const BACKUP_TIMESTAMP_SEPARATOR = '__';
const BACKUP_VERSION_KEY = 'dste_backup_versions';
const DEFAULT_MAX_BACKUPS = 5;

let backupSequence = 0;

/**
 * 构造备份键名
 * @param {string} namespace 数据命名空间，如 'meetings' / 'omp' / 'strategyMap'
 * @param {string} [version] 备份时数据版本，默认 'unknown'
 * @returns {string}
 */
export function getBackupKey(namespace, version = 'unknown') {
  backupSequence += 1;
  const ts = new Date().toISOString();
  return `${BACKUP_KEY_PREFIX}${namespace}${BACKUP_TIMESTAMP_SEPARATOR}${version}${BACKUP_TIMESTAMP_SEPARATOR}${ts}_${backupSequence}`;
}

/**
 * 解析备份键名
 * @param {string} key
 * @returns {{namespace:string, version:string, timestamp:string}|null}
 */
export function parseBackupKey(key) {
  if (!key || !key.startsWith(BACKUP_KEY_PREFIX)) return null;
  const parts = key.slice(BACKUP_KEY_PREFIX.length).split(BACKUP_TIMESTAMP_SEPARATOR);
  if (parts.length < 3) return null;
  const rawTimestamp = parts.pop();
  const version = parts.pop();
  const namespace = parts.join(BACKUP_TIMESTAMP_SEPARATOR);
  return { namespace, version, timestamp: rawTimestamp };
}

/**
 * 列出某个命名空间的所有备份键（按时间从新到旧排序）
 * @param {string} namespace
 * @returns {string[]}
 */
export function getBackupKeys(namespace) {
  const all = Storage.getKeys(BACKUP_KEY_PREFIX);
  return all
    .map(key => ({ key, meta: parseBackupKey(key) }))
    .filter(item => item.meta && item.meta.namespace === namespace)
    .sort((a, b) => b.meta.timestamp.localeCompare(a.meta.timestamp))
    .map(item => item.key);
}

/**
 * 创建备份
 * @param {string} namespace
 * @param {*} data
 * @param {string} [version]
 * @returns {{success:boolean, key?:string, error?:string}}
 */
export function createBackup(namespace, data, version = 'unknown') {
  if (!namespace) return { success: false, error: 'namespace is required' };
  const key = getBackupKey(namespace, version);
  const payload = {
    namespace,
    version,
    exportedAt: new Date().toISOString(),
    data,
  };
  const ok = Storage.set(key, payload);
  if (!ok) {
    return { success: false, error: 'localStorage write failed (quota exceeded?)' };
  }
  // 记录备份版本历史
  const versions = Storage.get(BACKUP_VERSION_KEY, {});
  if (!versions[namespace]) versions[namespace] = [];
  versions[namespace].unshift({ key, version, timestamp: payload.exportedAt });
  Storage.set(BACKUP_VERSION_KEY, versions);
  return { success: true, key };
}

/**
 * 从最近的备份恢复
 * @param {string} namespace
 * @returns {{success:boolean, data?:*, key?:string, error?:string}}
 */
export function restoreFromBackup(namespace) {
  const keys = getBackupKeys(namespace);
  if (keys.length === 0) {
    return { success: false, error: `No backup found for ${namespace}` };
  }
  const key = keys[0];
  const payload = Storage.get(key, null);
  if (!payload || payload.data === undefined) {
    return { success: false, error: `Backup ${key} is corrupted` };
  }
  return { success: true, data: payload.data, key };
}

/**
 * 清理旧备份，仅保留最近 maxCount 份
 * @param {string} namespace
 * @param {number} [maxCount=5]
 * @returns {number} 删除数量
 */
export function cleanupOldBackups(namespace, maxCount = DEFAULT_MAX_BACKUPS) {
  const keys = getBackupKeys(namespace);
  const toRemove = keys.slice(maxCount);
  toRemove.forEach(key => Storage.remove(key));
  // 同步版本历史
  const versions = Storage.get(BACKUP_VERSION_KEY, {});
  if (versions[namespace]) {
    versions[namespace] = versions[namespace].filter(v => !toRemove.includes(v.key));
    Storage.set(BACKUP_VERSION_KEY, versions);
  }
  return toRemove.length;
}

/**
 * 通用数据校验：要求为对象/数组且非 null
 * @param {*} data
 * @param {'object'|'array'} [shape]
 * @returns {{valid:boolean, error?:string}}
 */
export function validateData(data, shape = 'object') {
  if (data === null || data === undefined) {
    return { valid: false, error: 'Data is null or undefined' };
  }
  if (shape === 'array' && !Array.isArray(data)) {
    return { valid: false, error: 'Data is not an array' };
  }
  if (shape === 'object' && (typeof data !== 'object' || Array.isArray(data))) {
    return { valid: false, error: 'Data is not an object' };
  }
  return { valid: true };
}

/**
 * 按版本链迁移数据
 * @param {*} data
 * @param {number|string} fromVersion 当前数据版本，0 表示无版本
 * @param {number|string} toVersion 目标版本
 * @param {Object.<number|string, Function>} migrators 版本 -> (data) => data
 * @returns {{success:boolean, data?:*, error?:string}}
 */
export function attemptMigration(data, fromVersion, toVersion, migrators) {
  const validation = validateData(migrators, 'object');
  if (!validation.valid) {
    return { success: false, error: 'Invalid migrators' };
  }

  const normalize = v => String(v);
  let current = data;
  let currentVersion = fromVersion;

  // 构造版本链，支持 number 与 string 混用
  const versions = Object.keys(migrators)
    .map(v => ({ raw: v, num: Number(v) }))
    .filter(v => !Number.isNaN(v.num))
    .sort((a, b) => a.num - b.num)
    .map(v => v.raw);

  const targetNum = Number(toVersion);
  const currentNum = Number(fromVersion);
  if (Number.isNaN(targetNum) || Number.isNaN(currentNum)) {
    return { success: false, error: 'Version must be numeric or numeric-string' };
  }

  for (const version of versions) {
    const vNum = Number(version);
    if (vNum <= currentNum) continue;
    if (vNum > targetNum) break;
    const fn = migrators[version];
    if (typeof fn !== 'function') {
      return { success: false, error: `Missing migrator for version ${version}` };
    }
    try {
      current = fn(current);
      currentVersion = version;
    } catch (e) {
      return { success: false, error: `Migration to ${version} failed: ${e.message}` };
    }
  }

  if (normalize(currentVersion) !== normalize(toVersion)) {
    return { success: false, error: `Could not reach target version ${toVersion} from ${fromVersion}` };
  }

  return { success: true, data: current };
}

/**
 * 智能迁移：先备份，再尝试迁移，失败时返回备份信息
 * @param {string} namespace
 * @param {*} data
 * @param {number|string} fromVersion
 * @param {number|string} toVersion
 * @param {Object} migrators
 * @returns {{success:boolean, data?:*, backupKey?:string, error?:string}}
 */
export function migrateWithBackup(namespace, data, fromVersion, toVersion, migrators) {
  const backup = createBackup(namespace, data, String(fromVersion));
  if (!backup.success) {
    return { success: false, error: `Backup failed before migration: ${backup.error}` };
  }
  cleanupOldBackups(namespace, DEFAULT_MAX_BACKUPS);
  const result = attemptMigration(data, fromVersion, toVersion, migrators);
  if (!result.success) {
    return { success: false, error: result.error, backupKey: backup.key };
  }
  return { success: true, data: result.data, backupKey: backup.key };
}

/**
 * 读取某命名空间下所有备份的元信息（不读取大数据体）
 * @param {string} [namespace]
 * @returns {Array<{key:string, namespace:string, version:string, timestamp:string}>}
 */
export function listBackupMeta(namespace) {
  const all = Storage.getKeys(BACKUP_KEY_PREFIX);
  return all
    .map(key => ({ key, meta: parseBackupKey(key) }))
    .filter(item => item.meta && (!namespace || item.meta.namespace === namespace))
    .map(item => ({ key: item.key, ...item.meta }))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
