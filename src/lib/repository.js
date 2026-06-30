/**
 * 存储抽象层（Repository）
 * 为 localStorage 数据提供统一的版本控制、迁移、备份、恢复与健康检查。
 */

import { Storage } from './utils.js';
import {
  createBackup,
  restoreFromBackup,
  cleanupOldBackups,
  migrateWithBackup,
  validateData,
} from './migration-utils.js';

const DEFAULT_OPTIONS = {
  schema: 'array',        // 'array' | 'object'
  version: 1,
  defaultValue: null,     // 如果提供，优先作为缺省值
  maxBackups: 5,
  migrators: {},
};

export class Repository {
  /**
   * @param {string} namespace 命名空间，用于备份键
   * @param {object} options
   * @param {string} options.storageKey localStorage 数据键，默认 dste_{namespace}
   * @param {string} options.versionKey localStorage 版本键，默认 {storageKey}_version
   * @param {number|string} options.version 当前数据版本
   * @param {'array'|'object'} options.schema 数据形态
   * @param {*} options.defaultValue 缺省值（未提供时按 schema 生成 [] 或 {}）
   * @param {object} options.migrators 版本迁移函数 { [version]: (data) => data }
   * @param {number} options.maxBackups 保留备份数量
   */
  constructor(namespace, options = {}) {
    if (!namespace) throw new Error('Repository namespace is required');
    this.namespace = namespace;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.storageKey = this.options.storageKey || `dste_${namespace}`;
    this.versionKey = this.options.versionKey || `${this.storageKey}_version`;
  }

  _getDefaultValue() {
    if (this.options.defaultValue !== null) return this.options.defaultValue;
    return this.options.schema === 'array' ? [] : {};
  }

  /**
   * 读取数据（不触发迁移）
   * @returns {*}
   */
  getRaw() {
    const raw = Storage.getString(this.storageKey);
    if (!raw) return this._getDefaultValue();
    try {
      const parsed = JSON.parse(raw);
      const validation = validateData(parsed, this.options.schema);
      if (!validation.valid) {
        console.warn(`[Repository:${this.namespace}] schema validation failed:`, validation.error);
        return this._getDefaultValue();
      }
      return parsed;
    } catch (e) {
      console.warn(`[Repository:${this.namespace}] parse failed:`, e.message);
      return this._getDefaultValue();
    }
  }

  /**
   * 读取数据并在需要时迁移
   * @returns {*}
   */
  get() {
    const data = this.getRaw();
    const storedVersion = Storage.get(this.versionKey, 0);
    if (storedVersion !== this.options.version) {
      return this.migrate(data, storedVersion);
    }
    return data;
  }

  /**
   * 写入数据并更新版本键
   * @param {*} data
   * @returns {boolean}
   */
  set(data) {
    const validation = validateData(data, this.options.schema);
    if (!validation.valid) {
      console.error(`[Repository:${this.namespace}] invalid data shape:`, validation.error);
      return false;
    }
    const ok = Storage.set(this.storageKey, data);
    if (ok) {
      Storage.set(this.versionKey, this.options.version);
    }
    return ok;
  }

  /**
   * 迁移数据到当前版本
   * @param {*} data
   * @param {number|string} fromVersion
   * @returns {*}
   */
  migrate(data, fromVersion) {
    if (fromVersion === this.options.version) return data;

    const hasMigrators = Object.keys(this.options.migrators).length > 0;
    if (!hasMigrators) {
      // 无迁移器：仅更新版本号，保留原数据
      Storage.set(this.versionKey, this.options.version);
      return data;
    }

    const result = migrateWithBackup(
      this.options.backupNamespace || this.namespace,
      data,
      fromVersion,
      this.options.version,
      this.options.migrators
    );

    if (result.success) {
      this.set(result.data);
      cleanupOldBackups(this.options.backupNamespace || this.namespace, this.options.maxBackups);
      return result.data;
    }

    console.error(`[Repository:${this.namespace}] migration failed:`, result.error);
    // 迁移失败仍保留原数据，不静默丢失
    return data;
  }

  /**
   * 创建当前数据备份
   * @param {number|string} [version]
   * @returns {{success:boolean, key?:string, error?:string}}
   */
  backup(version) {
    const data = this.getRaw();
    const storedVersion = Storage.get(this.versionKey, 0);
    return createBackup(
      this.options.backupNamespace || this.namespace,
      data,
      String(version ?? storedVersion)
    );
  }

  /**
   * 从最近备份恢复并写入
   * @returns {{success:boolean, data?:*, key?:string, error?:string}}
   */
  restore() {
    const result = restoreFromBackup(this.options.backupNamespace || this.namespace);
    if (result.success) {
      this.set(result.data);
    }
    return result;
  }

  /**
   * 清理旧备份
   * @param {number} [maxCount]
   * @returns {number}
   */
  pruneBackups(maxCount) {
    return cleanupOldBackups(
      this.options.backupNamespace || this.namespace,
      maxCount ?? this.options.maxBackups
    );
  }

  /**
   * 健康检查：配额、版本、结构、备份数量
   * @returns {{ok:boolean, namespace:string, version:number|string, storedVersion:number|string, quota:{ok:boolean}, schemaValid:boolean, backupCount:number, error?:string}}
   */
  getHealth() {
    const data = this.getRaw();
    const storedVersion = Storage.get(this.versionKey, 0);
    const quota = Storage.checkQuota();
    const schemaValid = validateData(data, this.options.schema).valid;
    const backupCount = this._countBackups();

    const ok = quota.ok && schemaValid;
    return {
      ok,
      namespace: this.namespace,
      version: this.options.version,
      storedVersion,
      quota,
      schemaValid,
      backupCount,
      error: ok ? undefined : (quota.ok ? 'Schema validation failed' : quota.message),
    };
  }

  _countBackups() {
    const prefix = 'dste_backup_';
    const all = Storage.getKeys(prefix);
    return all.filter(key => {
      const parts = key.slice(prefix.length).split('__');
      return parts[0] === (this.options.backupNamespace || this.namespace);
    }).length;
  }
}

/**
 * 便捷工厂：会议数据 Repository
 */
export function createMeetingsRepository(options = {}) {
  return new Repository('meetings', {
    storageKey: 'dste_meetings',
    schema: 'array',
    version: 3,
    ...options,
  });
}

/**
 * 便捷工厂：OMP 实体 Repository
 */
export function createOmpRepository(entity, storageKey) {
  return new Repository(`omp/${entity}`, {
    storageKey,
    schema: 'array',
    version: 'canvas-v11',
    backupNamespace: 'omp',
  });
}

/**
 * 便捷工厂：战略地图 Repository
 */
export function createStrategyMapRepository(
  namespace,
  storageKey,
  schema = 'array',
  version = 3,
  migrators = {}
) {
  return new Repository(namespace, {
    storageKey,
    schema,
    version,
    backupNamespace: 'strategyMap',
    migrators,
  });
}
