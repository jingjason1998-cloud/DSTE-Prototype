/**
 * 目录管理数据层
 * 提供树形目录的 CRUD、排序、引用计数和云端同步能力。
 */

import { Repository } from './repository.js';
import {
  computeEntityDiff,
  enqueuePerRecordSync,
  apiLoadArray,
  ensureLastModified,
  createPerItemExecutor,
} from './per-record-sync.js';
import { getDefaultSyncQueue } from './sync-queue.js';
import { Storage } from './utils.js';

const CATALOG_STORAGE_KEY = 'dste_catalogs_v1';

const catalogRepo = new Repository('catalogs', {
  storageKey: CATALOG_STORAGE_KEY,
  schema: 'array',
  version: 1,
  backupNamespace: 'catalogs',
});

const catalogSyncQueue = getDefaultSyncQueue();
const catalogExecutor = createPerItemExecutor();

if (typeof window !== 'undefined') {
  catalogSyncQueue.bindAutoProcess(catalogExecutor);
}

const refCounters = new Map();

export const CATALOG_SCOPES = {
  OMP_TASKS: 'omp-tasks',
};

export function registerRefCounter(scope, getterFn) {
  if (typeof getterFn !== 'function') {
    throw new Error('registerRefCounter requires a getter function');
  }
  refCounters.set(scope, getterFn);
}

function generateCatalogId() {
  return `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getCurrentUserId() {
  try {
    const userJson = Storage.getString('dste-user') || sessionStorage.getItem('dste-user');
    if (userJson) {
      const user = JSON.parse(userJson);
      return user.id || user.username || null;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export function getCatalogRepo() {
  return catalogRepo;
}

export function loadCatalogs(scope) {
  const all = catalogRepo.get() || [];
  if (!scope) return [...all];
  return all.filter(c => c.scope === scope).sort((a, b) => a.seq - b.seq);
}

export function saveCatalogs(catalogs) {
  const old = catalogRepo.getRaw();
  ensureLastModified(catalogs);
  catalogRepo.set(catalogs);
  const diff = computeEntityDiff(old, catalogs);
  enqueuePerRecordSync('catalogs', diff, catalogExecutor, catalogSyncQueue);
}

export function createCatalogNode(scope, parentId, name) {
  const all = catalogRepo.get() || [];
  const siblings = all.filter(c => c.scope === scope && c.parentId === (parentId || null));
  const maxSeq = siblings.reduce((max, c) => Math.max(max, c.seq || 0), -1);
  const now = Date.now();
  const userId = getCurrentUserId();
  return {
    id: generateCatalogId(),
    scope,
    parentId: parentId || null,
    name: (name || '').trim(),
    status: 'active',
    seq: maxSeq + 1,
    version: 1,
    lastModified: now,
    createdAt: now,
    createdBy: userId,
    updatedBy: userId,
  };
}

export function updateCatalogNode(id, patch) {
  const catalogs = catalogRepo.get() || [];
  const index = catalogs.findIndex(c => c.id === id);
  if (index < 0) return null;
  const now = Date.now();
  const userId = getCurrentUserId();
  const updated = {
    ...catalogs[index],
    ...patch,
    id, // 禁止修改 id
    scope: catalogs[index].scope, // 禁止修改 scope
    version: (catalogs[index].version || 0) + 1,
    lastModified: now,
    updatedBy: userId,
  };
  catalogs[index] = updated;
  saveCatalogs(catalogs);
  return updated;
}

export function deleteCatalogNode(id, scope) {
  const catalogs = catalogRepo.get() || [];
  const node = catalogs.find(c => c.id === id);
  if (!node) return { success: false, error: '目录不存在' };
  if (scope && node.scope !== scope) return { success: false, error: 'scope 不匹配' };

  const hasChildren = catalogs.some(c => c.parentId === id);
  if (hasChildren) {
    return { success: false, error: '请先删除子目录', blockedBy: 'children' };
  }

  const refCount = countCatalogRefs(id, node.scope);
  if (refCount > 0) {
    return { success: false, error: `目录已被 ${refCount} 个实体引用`, refCount, blockedBy: 'refs' };
  }

  const updated = catalogs.filter(c => c.id !== id);
  saveCatalogs(updated);
  return { success: true, data: node };
}

export function buildCatalogTree(scope) {
  const all = loadCatalogs(scope);
  const nodesById = new Map();
  const roots = [];
  all.forEach(node => {
    nodesById.set(node.id, { ...node, children: [] });
  });
  all.forEach(node => {
    const treeNode = nodesById.get(node.id);
    if (node.parentId && nodesById.has(node.parentId)) {
      nodesById.get(node.parentId).children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  });
  return { nodesById, roots };
}

export function getCatalogNode(scope, id) {
  if (!id) return null;
  return (catalogRepo.get() || []).find(c => c.scope === scope && c.id === id) || null;
}

export function getCatalogPath(scope, id) {
  const node = getCatalogNode(scope, id);
  if (!node) return '';
  const parts = [node.name];
  let current = node;
  const all = catalogRepo.get() || [];
  while (current.parentId) {
    const parent = all.find(c => c.scope === scope && c.id === current.parentId);
    if (!parent) break;
    parts.unshift(parent.name);
    current = parent;
  }
  return parts.join(' / ');
}

export function getCatalogName(scope, id) {
  const node = getCatalogNode(scope, id);
  return node ? node.name : '-';
}

export function reorderCatalogNode(nodeId, targetId, position) {
  if (nodeId === targetId) return { success: false, error: '不能拖拽到自身' };

  const catalogs = catalogRepo.get() || [];
  const sourceIndex = catalogs.findIndex(c => c.id === nodeId);
  const targetIndex = catalogs.findIndex(c => c.id === targetId);
  if (sourceIndex < 0) return { success: false, error: '源节点不存在' };
  if (targetIndex < 0) return { success: false, error: '目标节点不存在' };

  const source = catalogs[sourceIndex];
  const target = catalogs[targetIndex];

  if (source.scope !== target.scope) {
    return { success: false, error: '不能跨 scope 移动' };
  }

  // 禁止拖入自身后代（target 是 source 的后代）
  if (isDescendant(source.id, target.id, catalogs)) {
    return { success: false, error: '不能将父目录拖入其子目录' };
  }

  const scope = source.scope;
  let newParentId = source.parentId;
  let newSeq = source.seq;

  if (position === 'child') {
    newParentId = target.id;
    const children = catalogs.filter(c => c.parentId === target.id && c.id !== source.id);
    newSeq = children.reduce((max, c) => Math.max(max, c.seq || 0), -1) + 1;
  } else {
    newParentId = target.parentId;
    const siblings = catalogs.filter(c => c.parentId === newParentId && c.id !== source.id);
    const sortedSiblings = siblings.sort((a, b) => (a.seq || 0) - (b.seq || 0));
    const targetSeqInSiblings = sortedSiblings.findIndex(c => c.id === target.id);

    let tempSeq;
    if (position === 'before') {
      const prev = sortedSiblings[targetSeqInSiblings - 1];
      tempSeq = prev ? ((prev.seq || 0) + (target.seq || 0)) / 2 : (target.seq || 0) - 0.5;
    } else if (position === 'after') {
      const next = sortedSiblings[targetSeqInSiblings + 1];
      tempSeq = next ? ((target.seq || 0) + (next.seq || 0)) / 2 : (target.seq || 0) + 0.5;
    }

    // 重新对新的父节点下所有子节点排序并赋整数值
    const reordered = sortedSiblings
      .map(c => (c.id === source.id ? { ...source, seq: tempSeq, parentId: newParentId } : c));
    if (!sortedSiblings.some(c => c.id === source.id)) {
      reordered.push({ ...source, seq: tempSeq, parentId: newParentId });
    }

    reordered
      .sort((a, b) => (a.seq || 0) - (b.seq || 0))
      .forEach((c, idx) => {
        const cat = catalogs.find(x => x.id === c.id);
        if (cat) {
          cat.seq = idx;
          if (c.id === source.id) cat.parentId = newParentId;
        }
      });

    ensureLastModified(catalogs);
    saveCatalogs(catalogs);
    return { success: true };
  }

  // child 分支直接更新 source
  source.parentId = newParentId;
  source.seq = newSeq;
  source.version = (source.version || 0) + 1;
  source.lastModified = Date.now();
  source.updatedBy = getCurrentUserId();

  ensureLastModified(catalogs);
  saveCatalogs(catalogs);
  return { success: true };
}

function isDescendant(ancestorId, nodeId, catalogs) {
  const node = catalogs.find(c => c.id === nodeId);
  if (!node || !node.parentId) return false;
  if (node.parentId === ancestorId) return true;
  return isDescendant(ancestorId, node.parentId, catalogs);
}

export function countCatalogRefs(catalogId, scope) {
  if (!catalogId) return 0;
  const counter = refCounters.get(scope);
  if (typeof counter === 'function') {
    return counter(catalogId) || 0;
  }
  return 0;
}

export async function catalogSyncFromApi() {
  const remote = await apiLoadArray('/api/catalogs');
  if (!remote || remote.length === 0) return false;
  const local = catalogRepo.get() || [];
  const merged = local.length > 0
    ? mergeCatalogEntities(ensureLastModified(local), ensureLastModified(remote))
    : remote;
  catalogRepo.set(merged);
  return true;
}

function mergeCatalogEntities(local, remote) {
  const map = new Map((local || []).map(c => [c.id, c]));
  for (const r of remote || []) {
    const id = r.id;
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

// 默认注册 OMP 任务引用计数器：优先使用 cockpit.html 中的 omp_load，回退到 Storage
registerRefCounter(CATALOG_SCOPES.OMP_TASKS, (catalogId) => {
  if (typeof window === 'undefined') return 0;
  try {
    if (typeof window.omp_load === 'function') {
      return window.omp_load('tasks').filter(t => t.catalogId === catalogId).length;
    }
    if (window.DSTE && window.DSTE.Storage) {
      const tasks = window.DSTE.Storage.get('dste_omp_tasks_v1', []);
      return tasks.filter(t => t.catalogId === catalogId).length;
    }
  } catch (e) {
    // ignore
  }
  return 0;
});
