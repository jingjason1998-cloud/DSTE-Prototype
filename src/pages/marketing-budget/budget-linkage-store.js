/**
 * 营销线预算执行监控 — 预算科目与 OMP 重点工作/子任务、业务专题的关联存储
 *
 * 数据模型：
 * localStorage key: dste_budget_linkages_v1
 * {
 *   [rowId: string]: {
 *     taskIds: string[],      // OMP 重点工作/年度重点工作 ID
 *     subtaskIds: string[],   // OMP 子任务 ID（parentId 非空）
 *     topicIds: string[]      // 业务专题 ID
 *   }
 * }
 */

import { Storage } from '../../lib/utils.js';

const LS_KEY = 'dste_budget_linkages_v1';

// 预置 seed 关联数据：演示差旅费、销售额、贡献利润等科目与重点工作/专题的关联
function seedLinkages() {
  return {
    '5': {
      taskIds: ['task_1'],
      subtaskIds: ['subtask_1716200000000_123'],
      topicIds: ['bt_1716100000002']
    },
    '28': {
      taskIds: ['task_2'],
      subtaskIds: [],
      topicIds: ['bt_1716100000003', 'bt_1716100000004']
    },
    '144': {
      taskIds: ['task_3'],
      subtaskIds: [],
      topicIds: ['bt_1716100000001']
    }
  };
}

export function loadLinkages() {
  try {
    const raw = Storage.get(LS_KEY, null);
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  } catch (e) {
    console.warn('[BudgetLinkage] load failed', e);
  }
  return seedLinkages();
}

export function saveLinkages(linkages) {
  try {
    Storage.set(LS_KEY, linkages);
  } catch (e) {
    console.warn('[BudgetLinkage] save failed', e);
  }
}

export function ensureRowLink(linkages, rowId) {
  const key = String(rowId);
  if (!linkages[key]) {
    linkages[key] = { taskIds: [], subtaskIds: [], topicIds: [] };
  }
  return linkages[key];
}

export function addTaskLink(linkages, rowId, taskId) {
  const link = ensureRowLink(linkages, rowId);
  if (!link.taskIds.includes(taskId)) link.taskIds.push(taskId);
}

export function removeTaskLink(linkages, rowId, taskId) {
  const link = ensureRowLink(linkages, rowId);
  link.taskIds = link.taskIds.filter(id => id !== taskId);
}

export function addSubtaskLink(linkages, rowId, subtaskId) {
  const link = ensureRowLink(linkages, rowId);
  if (!link.subtaskIds.includes(subtaskId)) link.subtaskIds.push(subtaskId);
}

export function removeSubtaskLink(linkages, rowId, subtaskId) {
  const link = ensureRowLink(linkages, rowId);
  link.subtaskIds = link.subtaskIds.filter(id => id !== subtaskId);
}

export function addTopicLink(linkages, rowId, topicId) {
  const link = ensureRowLink(linkages, rowId);
  if (!link.topicIds.includes(topicId)) link.topicIds.push(topicId);
}

export function removeTopicLink(linkages, rowId, topicId) {
  const link = ensureRowLink(linkages, rowId);
  link.topicIds = link.topicIds.filter(id => id !== topicId);
}

export function getLinkCount(linkages, rowId) {
  const link = linkages[String(rowId)];
  if (!link) return 0;
  return (link.taskIds?.length || 0) + (link.subtaskIds?.length || 0) + (link.topicIds?.length || 0);
}
