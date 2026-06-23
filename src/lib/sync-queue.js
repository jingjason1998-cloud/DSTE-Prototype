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

export class SyncQueue {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this._processing = false;
    this._listenersBound = false;
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
  enqueue(operation) {
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

    // 同一 endpoint + POST 可合并最近一条未开始处理的操作，减少重复推送
    const lastIdx = queue.length - 1;
    if (
      lastIdx >= 0 &&
      queue[lastIdx].endpoint === item.endpoint &&
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
    this.processQueue(operation.executor);
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
        processed++;
      } catch (e) {
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
      failed: queue.filter(op => op.status === 'failed').length,
    };
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
