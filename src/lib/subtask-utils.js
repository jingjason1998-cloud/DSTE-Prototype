/**
 * 重点工作子任务工具函数
 * 纯函数，便于单元测试；不依赖 DOM 或全局状态。
 */

export function isSubtask(task) {
  return !!task && !!task.parentId;
}

export function getSubtasks(tasks, parentId) {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .filter(t => t && t.parentId === parentId)
    .sort((a, b) => (a.seq || 0) - (b.seq || 0));
}

export function hasSubtasks(tasks, parentId) {
  if (!Array.isArray(tasks)) return false;
  return tasks.some(t => t && t.parentId === parentId);
}

export function generateSubtaskId() {
  return 'subtask_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

/**
 * 按子任务权重加权平均计算父任务进度
 * @param {object[]} tasks - 全部任务数组
 * @param {string} parentId - 父任务 ID
 * @returns {number|null} 新的进度值；无需更新时返回 null
 */
export function calculateParentProgress(tasks, parentId) {
  if (!Array.isArray(tasks)) return null;
  const subs = tasks.filter(t => t && t.parentId === parentId);
  if (subs.length === 0) return null;
  const totalWeight = subs.reduce((s, t) => s + (Number(t.weight) || 1), 0);
  if (totalWeight <= 0) return null;
  const weighted = subs.reduce((s, t) => s + (Number(t.progress) || 0) * (Number(t.weight) || 1), 0);
  return Math.round(weighted / totalWeight);
}

/**
 * 在任务数组上执行父任务进度聚合
 * @param {object[]} tasks - 全部任务数组（会被修改）
 * @param {string} parentId - 父任务 ID
 * @returns {boolean} 是否发生了修改
 */
export function recalculateParentProgress(tasks, parentId) {
  const parent = tasks.find(t => t && t.id === parentId);
  if (!parent || parent.progressOverridden) return false;
  const newProgress = calculateParentProgress(tasks, parentId);
  if (newProgress === null) return false;
  if (parent.progress !== newProgress) {
    parent.progress = newProgress;
    return true;
  }
  return false;
}

/**
 * 构建级联删除的 ID 集合（父任务 + 所有子任务）
 * @param {object[]} tasks - 全部任务数组
 * @param {string} parentId - 父任务 ID
 * @returns {Set<string>}
 */
export function collectCascadeDeleteIds(tasks, parentId) {
  const ids = new Set([parentId]);
  if (!Array.isArray(tasks)) return ids;
  tasks.forEach(t => {
    if (t && t.parentId === parentId) ids.add(t.id);
  });
  return ids;
}

/**
 * 验证子任务对象是否符合基本约束
 * @param {object} subtask
 * @param {string} expectedParentId
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateSubtask(subtask, expectedParentId) {
  const errors = [];
  if (!subtask) {
    errors.push('子任务对象为空');
    return { valid: false, errors };
  }
  if (subtask.parentId !== expectedParentId) errors.push('parentId 不匹配');
  if (subtask.source !== 'omp') errors.push('子任务 source 必须是 omp');
  if (subtask.annualPlanTaskId) errors.push('子任务不能有 annualPlanTaskId');
  if (!subtask.name) errors.push('子任务名称必填');
  if (!subtask.owner) errors.push('子任务负责人必填');
  return { valid: errors.length === 0, errors };
}
