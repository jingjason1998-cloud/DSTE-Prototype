/**
 * 冲突解决器
 * 基于 lastModified 时间戳检测本地与远程数据冲突，提供用户决策 UI。
 */

import { showToast } from './utils.js';

/**
 * 比较本地与远程数据的新旧程度
 * @param {number|string} localModified
 * @param {number|string} remoteModified
 * @returns {'local'|'remote'|'equal'|'unknown'}
 */
export function compareTimestamp(localModified, remoteModified) {
  const local = Number(localModified);
  const remote = Number(remoteModified);
  if (Number.isNaN(local) || Number.isNaN(remote)) return 'unknown';
  if (local > remote) return 'local';
  if (remote > local) return 'remote';
  return 'equal';
}

/**
 * 检测数组数据是否存在冲突（基于每条记录的 lastModified）
 * @param {Array} localItems
 * @param {Array} remoteItems
 * @param {Function} getId 唯一标识函数，默认 item.id
 * @returns {Array<{local:*, remote:*, winner:'local'|'remote'|'conflict'}>}
 */
export function detectArrayConflicts(localItems, remoteItems, getId = (item) => item?.id) {
  const localMap = new Map(localItems.map(item => [getId(item), item]));
  const remoteMap = new Map(remoteItems.map(item => [getId(item), item]));
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

  const conflicts = [];
  for (const id of allIds) {
    const local = localMap.get(id);
    const remote = remoteMap.get(id);
    if (!local || !remote) {
      // 仅在一边存在，不算冲突，由调用方决定合并策略
      continue;
    }
    const winner = compareTimestamp(local.lastModified, remote.lastModified);
    if (winner === 'conflict' || winner === 'unknown') {
      conflicts.push({ id, local, remote, winner: 'conflict' });
    } else if (winner === 'remote') {
      conflicts.push({ id, local, remote, winner: 'remote' });
    }
    // winner === 'local' 或 'equal' 不视为冲突
  }
  return conflicts;
}

/**
 * 弹出冲突解决对话框，返回用户选择
 * @param {Array} conflicts 冲突项列表
 * @returns {Promise<'remote'|'local'|'merge'>}
 */
export function promptConflictResolution(conflicts) {
  return new Promise((resolve) => {
    if (!conflicts || conflicts.length === 0) {
      resolve('local');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'dste-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';

    const sample = conflicts[0];
    const panel = document.createElement('div');
    panel.className = 'dste-modal-panel';
    panel.style.cssText = 'background:var(--card-bg,#fff);color:var(--text-primary,#1f2937);padding:24px;border-radius:12px;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.2);';

    panel.innerHTML = `
      <h3 style="margin:0 0 12px 0;font-size:18px;">数据冲突</h3>
      <p style="margin:0 0 16px 0;color:var(--text-secondary,#6b7280);font-size:14px;">
        检测到 ${conflicts.length} 条数据在本地和云端都有更新。<br/>
        远程版本：${new Date(Number(sample.remote?.lastModified) || Date.now()).toLocaleString()}<br/>
        本地版本：${new Date(Number(sample.local?.lastModified) || Date.now()).toLocaleString()}
      </p>
      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button id="dste-conflict-local" style="padding:8px 16px;border:1px solid var(--border,#d1d5db);border-radius:6px;background:transparent;cursor:pointer;">保留本地</button>
        <button id="dste-conflict-remote" style="padding:8px 16px;border:none;border-radius:6px;background:var(--primary,#3b82f6);color:#fff;cursor:pointer;">使用云端</button>
      </div>
    `;

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const cleanup = (choice) => {
      overlay.remove();
      resolve(choice);
    };

    panel.querySelector('#dste-conflict-local').addEventListener('click', () => cleanup('local'));
    panel.querySelector('#dste-conflict-remote').addEventListener('click', () => cleanup('remote'));
  });
}

/**
 * 根据用户选择解决冲突
 * @param {Array} localItems
 * @param {Array} remoteItems
 * @param {'local'|'remote'|'merge'} strategy
 * @param {Function} getId
 * @returns {Array}
 */
export function resolveArrayConflict(localItems, remoteItems, strategy, getId = (item) => item?.id) {
  if (strategy === 'remote') return remoteItems;
  if (strategy === 'local') return localItems;

  // merge：以时间戳较新者为准；缺失项合并
  const localMap = new Map(localItems.map(item => [getId(item), item]));
  const remoteMap = new Map(remoteItems.map(item => [getId(item), item]));
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

  const merged = [];
  for (const id of allIds) {
    const local = localMap.get(id);
    const remote = remoteMap.get(id);
    if (!local) {
      merged.push(remote);
    } else if (!remote) {
      merged.push(local);
    } else {
      const winner = compareTimestamp(local.lastModified, remote.lastModified);
      merged.push(winner === 'local' ? local : remote);
    }
  }
  return merged;
}

/**
 * 为数据项自动补齐 lastModified（如果不存在）
 * @param {Array} items
 * @returns {Array}
 */
export function ensureLastModified(items) {
  const now = Date.now();
  items.forEach(item => {
    if (item && typeof item === 'object' && !item.lastModified) {
      item.lastModified = now;
    }
  });
  return items;
}
