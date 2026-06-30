/**
 * Per-record sync utilities
 * 从会议模块抽出的通用单条同步工具，供各业务模块复用。
 */

import { Storage } from './utils.js';
import { getDefaultSyncQueue } from './sync-queue.js';
import { ensureLastModified } from './conflict-resolver.js';

export function getApiBase() {
  const host = (typeof window !== 'undefined' && window.location?.hostname) || '';
  if (host === 'localhost' || host === '127.0.0.1') {
    return Storage.getString('dste_api_base') || '';
  }
  return 'https://dste-api.jasonxspace.workers.dev';
}

/**
 * 创建单条记录同步执行器。
 * 自动处理 auth、If-Match、401、非 2xx 错误抛出。
 */
export function createPerItemExecutor() {
  return async (operation) => {
    const apiBase = getApiBase();
    if (!apiBase) return;
    const token = Storage.getString('dste-token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (operation.version != null) {
      headers['If-Match'] = String(operation.version);
    }
    const resp = await fetch(apiBase + operation.endpoint, {
      method: operation.method || 'POST',
      headers,
      body: operation.payload ? JSON.stringify(operation.payload) : undefined,
    });
    if (resp.status === 401) {
      console.warn('API save returned 401');
      return;
    }
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
  };
}

/**
 * 比较两个数组，返回 created / updated / deleted。
 * @param {Array} oldArr
 * @param {Array} newArr
 * @param {Function} getId 默认 item => String(item.id)
 */
export function computeEntityDiff(oldArr, newArr, getId = (item) => String(item.id)) {
  const oldMap = new Map((oldArr || []).map(m => [getId(m), m]));
  const newMap = new Map((newArr || []).map(m => [getId(m), m]));
  const created = [];
  const updated = [];
  const deleted = [];

  for (const [id, item] of newMap) {
    if (!oldMap.has(id)) {
      created.push(item);
    } else if (JSON.stringify(oldMap.get(id)) !== JSON.stringify(item)) {
      updated.push(item);
    }
  }
  for (const id of oldMap.keys()) {
    if (!newMap.has(id)) {
      deleted.push(oldMap.get(id));
    }
  }
  return { created, updated, deleted };
}

/**
 * 合并本地与远程数组数据：version 优先，其次 lastModified。
 */
export function mergeEntities(local, remote, getId = (item) => String(item.id)) {
  const map = new Map((local || []).map(m => [getId(m), m]));
  for (const r of remote || []) {
    const id = getId(r);
    const l = map.get(id);
    if (!l) {
      map.set(id, r);
    } else if ((r.version || 0) > (l.version || 0)) {
      map.set(id, r);
    } else if ((r.version || 0) === (l.version || 0) && r.lastModified > l.lastModified) {
      map.set(id, r);
    }
  }
  return Array.from(map.values());
}

/**
 * 将 diff 结果批量入队为单条同步操作，然后统一触发 processQueue。
 * @param {string} entityName 例如 'topics'、'omp/tasks'
 * @param {{created:Array, updated:Array, deleted:Array}} diff
 * @param {Function} executor
 * @param {SyncQueue} syncQueue
 */
export function enqueuePerRecordSync(entityName, { created, updated, deleted }, executor, syncQueue) {
  for (const item of created) {
    syncQueue.enqueue({
      endpoint: `/api/${entityName}/${encodeURIComponent(item.id)}`,
      method: 'PUT',
      payload: item,
      executor,
    }, { autoProcess: false });
  }
  for (const item of updated) {
    syncQueue.enqueue({
      endpoint: `/api/${entityName}/${encodeURIComponent(item.id)}`,
      method: 'PUT',
      payload: item,
      version: item.version,
      executor,
    }, { autoProcess: false });
  }
  for (const item of deleted) {
    const resourceKey = `${entityName}/${encodeURIComponent(item.id)}`;
    syncQueue.removePendingForResource(resourceKey);
    syncQueue.enqueue({
      endpoint: `/api/${entityName}/${encodeURIComponent(item.id)}`,
      method: 'DELETE',
      version: item.version,
      executor,
    }, { autoProcess: false });
  }
  syncQueue.processQueue(executor);
}

/**
 * 通用 GET 远程数组接口。
 * @param {string} endpoint
 * @returns {Promise<Array|null>}
 */
export async function apiLoadArray(endpoint) {
  const apiBase = getApiBase();
  if (!apiBase) return null;
  try {
    const token = Storage.getString('dste-token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const resp = await fetch(apiBase + endpoint, { headers });
    if (resp.status === 401) {
      console.warn('API load returned 401');
      return null;
    }
    const json = await resp.json();
    if (json.success && json.data) return json.data;
  } catch (e) {
    console.warn('API load failed:', e.message);
  }
  return null;
}

// 为保持一致性，重新导出 ensureLastModified
export { ensureLastModified };

// 绑定默认队列的便捷函数：模块只需调用一次即可在页面生命周期内自动处理队列
export function bindDefaultAutoProcess() {
  if (typeof window !== 'undefined') {
    getDefaultSyncQueue().bindAutoProcess(createPerItemExecutor());
  }
}
