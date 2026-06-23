/**
 * 备份管理器
 * 提供全量导出/导入、破坏性操作前自动备份、命名空间级备份管理。
 */

import { Storage } from './utils.js';
import {
  createBackup as createMigrationBackup,
  restoreFromBackup as restoreMigrationBackup,
  cleanupOldBackups,
  getBackupKeys,
  listBackupMeta,
} from './migration-utils.js';

// 不允许导出/导入的敏感键
const EXCLUDED_KEYS = ['dste-token', 'dste-user', 'dste_api_base'];

/**
 * 导出所有 DSTE 数据（排除敏感键）
 * @returns {{success:boolean, payload?:object, error?:string}}
 */
export function exportAll() {
  try {
    const keys = Storage.getKeys('dste_');
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'DSTE',
      data: {},
    };
    keys.forEach(key => {
      if (EXCLUDED_KEYS.includes(key)) return;
      try {
        payload.data[key] = Storage.get(key);
      } catch (e) {
        console.warn(`[BackupManager] skipped ${key}:`, e.message);
      }
    });
    return { success: true, payload };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 生成可下载的 JSON 文件内容
 * @returns {Blob}
 */
export function exportAsBlob() {
  const result = exportAll();
  if (!result.success) throw new Error(result.error);
  return new Blob([JSON.stringify(result.payload, null, 2)], { type: 'application/json' });
}

/**
 * 触发浏览器下载备份文件
 * @param {string} [filename]
 */
export function downloadBackup(filename) {
  const blob = exportAsBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `dste-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 验证导入包结构
 * @param {*} json
 * @returns {{valid:boolean, error?:string}}
 */
function validateImportPayload(json) {
  if (!json || typeof json !== 'object') {
    return { valid: false, error: 'Backup must be an object' };
  }
  if (!json.data || typeof json.data !== 'object') {
    return { valid: false, error: 'Backup must contain a data object' };
  }
  if (json.app !== 'DSTE' && !json.exportedAt) {
    return { valid: false, error: 'Unrecognized backup format' };
  }
  return { valid: true };
}

/**
 * 导入备份数据
 * @param {object} json 备份包
 * @param {object} [options]
 * @param {'overwrite'|'merge'} [options.mode='overwrite'] overwrite 覆盖同名键，merge 仅写入当前不存在的键
 * @param {boolean} [options.autoBackup=true] 导入前是否自动备份当前数据
 * @returns {{success:boolean, imported:string[], skipped:string[], error?:string}}
 */
export function importAll(json, options = {}) {
  const { mode = 'overwrite', autoBackup = true } = options;
  const validation = validateImportPayload(json);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  if (autoBackup) {
    const backup = exportAll();
    if (backup.success) {
      createMigrationBackup('before-import', backup.payload, 'auto');
    }
  }

  const imported = [];
  const skipped = [];
  const entries = Object.entries(json.data).filter(([key]) => !EXCLUDED_KEYS.includes(key));

  for (const [key, value] of entries) {
    if (mode === 'merge' && Storage.getString(key) !== '') {
      skipped.push(key);
      continue;
    }
    const ok = Storage.set(key, value);
    if (ok) {
      imported.push(key);
    } else {
      skipped.push(key);
    }
  }

  return { success: true, imported, skipped };
}

/**
 * 从 File 对象读取并导入备份
 * @param {File} file
 * @param {object} [options]
 * @returns {Promise<{success:boolean, imported:string[], skipped:string[], error?:string}>}
 */
export function importFromFile(file, options = {}) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        resolve(importAll(json, options));
      } catch (err) {
        resolve({ success: false, error: `Parse failed: ${err.message}` });
      }
    };
    reader.onerror = () => resolve({ success: false, error: 'File read failed' });
    reader.readAsText(file);
  });
}

/**
 * 破坏性操作前自动备份指定命名空间
 * @param {string} namespace
 * @param {*} data
 * @param {string} [version]
 * @returns {{success:boolean, key?:string, error?:string}}
 */
export function autoBackup(namespace, data, version = 'unknown') {
  return createMigrationBackup(namespace, data, version);
}

/**
 * 恢复指定命名空间到最近备份
 * @param {string} namespace
 * @returns {{success:boolean, data?:*, key?:string, error?:string}}
 */
export function restoreLatest(namespace) {
  return restoreMigrationBackup(namespace);
}

/**
 * 清理指定命名空间的旧备份
 * @param {string} namespace
 * @param {number} [maxCount=5]
 * @returns {number}
 */
export function pruneBackups(namespace, maxCount = 5) {
  return cleanupOldBackups(namespace, maxCount);
}

/**
 * 列出所有备份元信息
 * @param {string} [namespace]
 * @returns {Array<{key:string, namespace:string, version:string, timestamp:string}>}
 */
export function listBackups(namespace) {
  return listBackupMeta(namespace);
}

/**
 * 获取某命名空间最近的备份键
 * @param {string} namespace
 * @returns {string|null}
 */
export function getLatestBackupKey(namespace) {
  const keys = getBackupKeys(namespace);
  return keys.length > 0 ? keys[0] : null;
}
