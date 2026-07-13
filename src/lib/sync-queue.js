/**
 * 离线同步队列
 * 本地变更先入队，再尽力同步到服务端；支持指数退避重试、失败保留与上限保护。
 */

import { Storage } from './utils.js';
import { showToast } from './utils.js';

const DEFAULT_OPTIONS = {
  queueKey: 'dste_sync_queue',
  maxRetries: 5,
  retryDelays: [1000, 5000, 15000, 60000, 300000], // ms
  maxSize: 100,
  warnThreshold: 50,
};

function generateId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function getResourceKey(endpoint) {
  // /api/{entity}/{id} -> {entity}/{id}；其它保持原 endpoint
  const parts = (endpoint || '').split('/').filter(Boolean);
  if (parts.length === 3 && parts[0] === 'api') {
    return `${parts[1]}/${parts[2]}`;
  }
  return endpoint;
}

export class SyncQueue {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this._processing = false;
    this._listenersBound = false;
    this._authToastShown = false;
  }

  loadQueue() {
    return Storage.get(this.options.queueKey, []) || [];
  }

  saveQueue(queue) {
    return Storage.set(this.options.queueKey, queue);
  }

  /**
   * 将操作加入同步队列
   * @param {object} operation
   * @param {string} operation.endpoint 例如 '/api/meetings'
   * @param {string} [operation.method='POST']
   * @param {*} operation.payload
   * @returns {{success:boolean, id?:string, error?:string}}
   */
  enqueue(operation, options = {}) {
    const { autoProcess = true } = options;
    const queue = this.loadQueue();
    if (queue.length >= this.options.maxSize) {
      showToast('同步队列已满，部分变更可能无法同步到服务端', 'error');
      return { success: false, error: 'Queue is full' };
    }
    if (queue.length >= this.options.warnThreshold) {
      showToast('同步队列积压较多，请检查网络连接', 'warning');
    }

    const item = {
      id: generateId(),
      endpoint: operation.endpoint,
      method: operation.method || 'POST',
      payload: operation.payload,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      nextRetry: null,
      error: null,
    };

    // 同一资源 + 方法可合并最近一条未开始处理的操作，减少重复推送
    // 资源键：单条端点 /api/{entity}/{id} 取 entity/id，集合端点取完整 endpoint
    const resourceKey = getResourceKey(item.endpoint);
    const lastIdx = queue.length - 1;
    if (
      lastIdx >= 0 &&
      getResourceKey(queue[lastIdx].endpoint) === resourceKey &&
      queue[lastIdx].method === item.method &&
      queue[lastIdx].status === 'pending' &&
      !queue[lastIdx].nextRetry
    ) {
      queue[lastIdx] = item;
    } else {
      queue.push(item);
    }

    this.saveQueue(queue);
    // 尝试立即处理
    if (autoProcess) {
      this.processQueue(operation.executor);
    }
    return { success: true, id: item.id };
  }

  /**
   * 处理队列中的待同步操作
   * @param {Function} executor 异步执行函数：async (operation) => { ... }
   * @returns {Promise<{processed:number, failed:number, remaining:number}>}
   */
  async processQueue(executor) {
    if (this._processing || !executor) return { processed: 0, failed: 0, remaining: 0 };
    this._processing = true;

    let queue = this.loadQueue();
    const now = Date.now();
    const pending = queue.filter(
      op => op.status === 'pending' && (!op.nextRetry || op.nextRetry <= now)
    );

    let processed = 0;
    let failed = 0;

    for (const op of pending) {
      try {
        await executor(op);
        op.status = 'completed';
        op.authPending = false;
        processed++;
        this._authToastShown = false; // 成功后重置，便于下次过期再提示
      } catch (e) {
        // 登录过期：不消耗重试次数、保持 pending，待重新登录后由
        // bindAutoProcess（可见性/在线）或 nextRetry 自动补传；只提示一次。
        if (e && e.authExpired) {
          op.error = e.message || 'auth expired';
          op.authPending = true;
          op.nextRetry = now + 60000; // 1 分钟后再试（届时若已重新登录则成功）
          if (!this._authToastShown) {
            showToast('登录已过期，数据未同步到云端。请重新登录，数据将自动补传。', 'error');
            this._authToastShown = true;
          }
          failed++;
          continue;
        }
        op.retryCount++;
        op.error = e.message || String(e);
        if (op.retryCount >= this.options.maxRetries) {
          op.status = 'failed';
          failed++;
          showToast(`同步失败：${op.endpoint}（已达最大重试次数）`, 'error');
        } else {
          op.nextRetry = now + this.options.retryDelays[op.retryCount - 1];
        }
      }
    }

    queue = queue.filter(op => op.status !== 'completed');
    this.saveQueue(queue);
    this._processing = false;

    return { processed, failed, remaining: queue.length };
  }

  /**
   * 绑定网络恢复与页面可见性事件，自动触发队列处理
   * @param {Function} executor
   */
  bindAutoProcess(executor) {
    if (this._listenersBound || typeof window === 'undefined') return;
    this._listenersBound = true;

    window.addEventListener('online', () => {
      showToast('网络已恢复，正在同步数据...', 'success');
      this.processQueue(executor);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.processQueue(executor);
      }
    });

    // 页面卸载前尝试 flush（不保证一定成功）
    window.addEventListener('beforeunload', () => {
      this.processQueue(executor);
    });
  }

  /**
   * 获取队列状态摘要
   * @returns {{total:number, pending:number, failed:number}}
   */
  getStatus() {
    const queue = this.loadQueue();
    return {
      total: queue.length,
      pending: queue.filter(op => op.status === 'pending').length,
      authPending: queue.filter(op => op.status === 'pending' && op.authPending).length,
      failed: queue.filter(op => op.status === 'failed').length,
    };
  }

  /**
   * 清除某个资源的所有 pending 操作（例如删除前清理该记录的待更新）
   * @param {string} resourceKey 例如 'meetings/20260520_42'
   * @returns {number} 清除的数量
   */
  removePendingForResource(resourceKey) {
    const queue = this.loadQueue();
    const remaining = [];
    let removed = 0;
    for (const op of queue) {
      if (op.status === 'pending' && getResourceKey(op.endpoint) === resourceKey) {
        removed++;
      } else {
        remaining.push(op);
      }
    }
    this.saveQueue(remaining);
    return removed;
  }

  /**
   * 清空失败项
   * @returns {number}
   */
  clearFailed() {
    const queue = this.loadQueue();
    const remaining = queue.filter(op => op.status !== 'failed');
    this.saveQueue(remaining);
    return queue.length - remaining.length;
  }

  /**
   * 将失败项重置为 pending 并重新触发处理（用于"重试同步"）。
   * 重置 retryCount 让其重新获得完整重试预算。
   * @param {Function} executor
   * @returns {number} 重置的数量
   */
  retryFailed(executor) {
    const queue = this.loadQueue();
    let n = 0;
    for (const op of queue) {
      if (op.status === 'failed') {
        op.status = 'pending';
        op.retryCount = 0;
        op.nextRetry = null;
        op.error = null;
        n++;
      }
    }
    this.saveQueue(queue);
    if (n > 0 && executor) this.processQueue(executor);
    return n;
  }

  /**
   * 重置队列（谨慎使用）
   */
  clear() {
    Storage.set(this.options.queueKey, []);
  }
}

let defaultQueue = null;

/**
 * 获取默认同步队列实例
 * @returns {SyncQueue}
 */
export function getDefaultSyncQueue() {
  if (!defaultQueue) {
    defaultQueue = new SyncQueue();
  }
  return defaultQueue;
}
