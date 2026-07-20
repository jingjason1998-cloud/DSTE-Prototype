/**
 * 轻量 SWR（stale-while-revalidate）封装
 * 优先读取本地缓存立即渲染，后台按 TTL 刷新远程数据。
 * 复用 src/lib/utils.js 中的 Storage 工具。
 */

import { Storage } from './utils.js';

/**
 * @param {Object} options
 * @param {string} options.key - 缓存命名空间标识
 * @param {() => any} options.loadLocal - 读取本地数据
 * @param {(data: any) => void} options.save - 保存合并后的数据
 * @param {() => Promise<any>} options.fetchRemote - 获取远程数据
 * @param {(local: any, remote: any) => any} [options.merge] - 合并策略
 * @param {number} [options.ttl=5*60*1000] - 刷新间隔（毫秒）
 * @returns {(force?: boolean) => Promise<{updated: boolean, data?: any}>}
 */
export function createSwrSync({ key, loadLocal, save, fetchRemote, merge, ttl = 5 * 60 * 1000 }) {
  const tsKey = `dste_swr_${key}_at`;

  return async function sync(force = false) {
    const now = Date.now();
    const last = Number(Storage.getString(tsKey, '0')) || 0;

    if (!force && now - last < ttl) {
      return { updated: false };
    }

    const remote = await fetchRemote();
    if (!remote) {
      return { updated: false };
    }

    const local = loadLocal();
    const merged = merge ? merge(local, remote) : remote;
    const changed = JSON.stringify(merged) !== JSON.stringify(local);

    if (changed) {
      save(merged);
    }
    Storage.setString(tsKey, String(now));

    return { updated: changed, data: merged };
  };
}
