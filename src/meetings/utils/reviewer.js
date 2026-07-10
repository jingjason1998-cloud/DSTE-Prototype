import { Storage } from '../../lib/utils.js';
import { Repository } from '../../lib/repository.js';
import { getDefaultSyncQueue } from '../../lib/sync-queue.js';
import { getApiBase } from '../../lib/per-record-sync.js';

/**
 * 会议材料评审 API 封装
 * @module reviewer
 *
 * 纯函数：封装对 reviewer 后端（localhost:8766 或反向代理）的 API 调用
 * 不涉及 DOM 操作
 */

export const reviewScoresRepo = new Repository('reviewer/scores', {
  storageKey: 'dste_review_scores',
  schema: 'object',
  version: 1,
  defaultValue: {},
  backupNamespace: 'reviewer',
});

const REVIEW_SCORES_ENDPOINT = '/api/review-scores';
const reviewScoresSyncQueue = getDefaultSyncQueue();

function createReviewScoresExecutor() {
  return async (operation) => {
    const apiBase = getApiBase();
    const token = Storage.getString('dste-token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(apiBase + REVIEW_SCORES_ENDPOINT, {
      method: operation.method || 'POST',
      headers,
      body: JSON.stringify(operation.payload),
    });
    if (resp.status === 401) {
      console.warn('[reviewer] review scores save returned 401');
      return;
    }
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
  };
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  reviewScoresSyncQueue.bindAutoProcess(createReviewScoresExecutor());
}

function syncReviewScoresToCloud(map) {
  reviewScoresSyncQueue.enqueue({
    endpoint: REVIEW_SCORES_ENDPOINT,
    method: 'POST',
    payload: map,
    executor: createReviewScoresExecutor(),
  });
}

export function persistReviewScores(map) {
  reviewScoresRepo.set(map);
  syncReviewScoresToCloud(map);
}

export async function loadRemoteReviewScores() {
  try {
    const apiBase = getApiBase();
    const token = Storage.getString('dste-token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const resp = await fetch(apiBase + REVIEW_SCORES_ENDPOINT, { headers });
    if (resp.status === 401) {
      console.warn('[reviewer] review scores load returned 401');
      return false;
    }
    const json = await resp.json();
    if (!json.success || !json.data || typeof json.data !== 'object') return false;

    const remote = json.data;
    const local = reviewScoresRepo.get() || {};
    const merged = { ...remote };
    for (const [url, localEntry] of Object.entries(local)) {
      const remoteEntry = remote[url];
      if (!remoteEntry) {
        merged[url] = localEntry;
      } else {
        const localScore = localEntry?.maxScore || 0;
        const remoteScore = remoteEntry?.maxScore || 0;
        const localTime = localEntry?.lastModified || localEntry?.lastReviewAt || 0;
        const remoteTime = remoteEntry?.lastModified || remoteEntry?.lastReviewAt || 0;
        if (localScore > remoteScore || (localScore === remoteScore && localTime > remoteTime)) {
          merged[url] = localEntry;
        }
      }
    }
    reviewScoresRepo.set(merged);
    return true;
  } catch (e) {
    console.warn('[reviewer] load remote review scores failed:', e.message);
    return false;
  }
}

// 供 reviewer.html 内联脚本使用（该页面非 ES module）
if (typeof window !== 'undefined') {
  window.DSTE = window.DSTE || {};
  window.DSTE.reviewScoresRepo = reviewScoresRepo;
  window.DSTE.persistReviewScores = persistReviewScores;
}

/** 会议场景 → 评审场景映射 */
export const REVIEWER_SCENE_MAP = {
  lagging_region: 'lagging-region-review',
  lagging_vertical: 'vertical-segment-review',
};

/**
 * 根据会议场景获取对应的评审场景 ID
 * @param {string} scenario - 会议场景（如 'union_quarterly'）
 * @returns {string} 评审场景 ID
 */
export function getReviewerScene(scenario) {
  return REVIEWER_SCENE_MAP[scenario] || 'general-topic-review';
}

/**
 * 获取 reviewer 代理地址
 * @returns {string}
 */
export function getReviewerProxyUrl() {
  const custom = typeof localStorage !== 'undefined' ? Storage.getString('meetingReviewerProxyUrl') : null;
  if (custom) return custom;
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:8766';
  return '';
}

/**
 * 单条材料评审
 * @param {string} url - 材料链接
 * @param {string} sceneId - 评审场景 ID
 * @returns {Promise<{success: boolean, score?: number, data?: Object, error?: string}>}
 */
export async function reviewMaterial(url, sceneId) {
  const proxyUrl = getReviewerProxyUrl();
  try {
    const resp = await fetch(proxyUrl + '/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, scene: sceneId }),
    });
    const data = await resp.json();
    if (data.success) {
      // 同步更新 dste_review_scores，与 reviewer 前端保持一致
      const map = reviewScoresRepo.get();
      const current = map[url];
      if (!current || (data.total_score || 0) > current.maxScore) {
        map[url] = {
          maxScore: data.total_score || 0,
          lastReviewAt: Date.now(),
          dimensionScores: data.dimension_scores || {},
          issues: (data.issues || []).slice(0, 5),
          report: data.report || '',
        };
        persistReviewScores(map);
      }
      return { success: true, score: data.total_score, data };
    }
    return { success: false, error: data.error || '评审失败' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 创建批量评审任务
 * @param {string[]} urls - 材料链接列表
 * @param {string} sceneId - 评审场景 ID
 * @returns {Promise<{success: boolean, taskId?: number, error?: string}>}
 */
export async function createBatchReview(urls, sceneId) {
  const proxyUrl = getReviewerProxyUrl();
  try {
    const resp = await fetch(proxyUrl + '/api/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls, scene_id: sceneId }),
    });
    const data = await resp.json();
    if (data.success) return { success: true, taskId: data.task_id };
    return { success: false, error: data.error || '创建批量任务失败' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 查询批量评审任务进度
 * @param {number} taskId
 * @returns {Promise<{success: boolean, status?: string, total?: number, completed?: number, failed?: number, error?: string}>}
 */
export async function getBatchReviewProgress(taskId) {
  const proxyUrl = getReviewerProxyUrl();
  try {
    const resp = await fetch(proxyUrl + '/api/batch/' + taskId);
    const data = await resp.json();
    if (data.success) {
      return {
        success: true,
        status: data.status,
        total: data.total,
        completed: data.completed,
        failed: data.failed,
      };
    }
    return { success: false, error: data.error || '查询失败' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 获取批量评审结果
 * @param {number} taskId
 * @returns {Promise<{success: boolean, results?: Array, error?: string}>}
 */
export async function getBatchReviewResults(taskId) {
  const proxyUrl = getReviewerProxyUrl();
  try {
    const resp = await fetch(proxyUrl + '/api/batch/' + taskId + '/results');
    const data = await resp.json();
    if (data.success) {
      // 同步更新 dste_review_scores
      const map = reviewScoresRepo.get();
      for (const r of data.results || []) {
        if (r.status === 'completed' && r.total_score != null) {
          const current = map[r.url];
          if (!current || r.total_score > current.maxScore) {
            map[r.url] = { maxScore: r.total_score, lastReviewAt: Date.now() };
          }
        }
      }
      persistReviewScores(map);
      return { success: true, results: data.results };
    }
    return { success: false, error: data.error || '获取结果失败' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 获取材料评分（从 本地存储 读取）
 * @param {string} url
 * @returns {{score: number, lastReviewAt: number} | null}
 */
export function getMaterialReviewInfo(url) {
  if (!url) return null;
  try {
    const map = reviewScoresRepo.get();
    const entry = map[url];
    if (!entry) return null;
    return {
      score: entry.maxScore,
      lastReviewAt: entry.lastReviewAt,
      dimensionScores: entry.dimensionScores || {},
      issues: entry.issues || [],
      report: entry.report || '',
    };
  } catch (e) {
    return null;
  }
}
