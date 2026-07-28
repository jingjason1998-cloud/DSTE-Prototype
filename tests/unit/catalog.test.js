import { describe, it, expect, beforeEach, vi } from 'vitest';

const storageMap = new Map();
const mockStorage = {
  getString: (key) => storageMap.get(key) || '',
  set: (key, val) => { storageMap.set(key, JSON.stringify(val)); return true; },
  setString: (key, val) => { storageMap.set(key, val); return true; },
  get: (key, defaultValue) => {
    const raw = storageMap.get(key);
    if (raw === undefined || raw === '') return defaultValue;
    try { return JSON.parse(raw); }
    catch (e) { return defaultValue; }
  },
  remove: (key) => { storageMap.delete(key); return true; },
  getKeys: (prefix = '') => {
    const keys = [];
    for (const key of storageMap.keys()) {
      if (key.startsWith(prefix)) keys.push(key);
    }
    return keys;
  },
  checkQuota: () => ({ ok: true }),
};

vi.mock('../../src/lib/utils.js', () => ({ Storage: mockStorage }));
vi.mock('../../src/lib/sync-queue.js', () => ({
  getDefaultSyncQueue: () => ({
    bindAutoProcess: () => {},
    enqueue: () => {},
    processQueue: () => {},
    removePendingForResource: () => {},
  }),
}));

const {
  CATALOG_SCOPES,
  createCatalogNode,
  buildCatalogTree,
  getCatalogPath,
  getCatalogNode,
  updateCatalogNode,
  deleteCatalogNode,
  reorderCatalogNode,
  countCatalogRefs,
  registerRefCounter,
  loadCatalogs,
  saveCatalogs,
  getCatalogRepo,
} = await import('../../src/lib/catalog.js');

describe('catalog.js', () => {
  const scope = CATALOG_SCOPES.OMP_TASKS;

  beforeEach(() => {
    storageMap.clear();
    // 给 repo 一个干净状态
    getCatalogRepo().set([]);
  });

  describe('createCatalogNode', () => {
    it('creates a root node with increasing seq', () => {
      const a = createCatalogNode(scope, null, 'A');
      saveCatalogs([a]);
      const b = createCatalogNode(scope, null, 'B');
      expect(b.seq).toBe(1);
    });

    it('creates child node with independent seq per parent', () => {
      const parent = createCatalogNode(scope, null, 'Parent');
      saveCatalogs([parent]);
      const child = createCatalogNode(scope, parent.id, 'Child');
      saveCatalogs([parent, child]);
      const child2 = createCatalogNode(scope, parent.id, 'Child2');
      expect(child2.seq).toBe(1);
    });
  });

  describe('buildCatalogTree', () => {
    it('builds nested tree', () => {
      const a = createCatalogNode(scope, null, 'A');
      const b = createCatalogNode(scope, a.id, 'B');
      const c = createCatalogNode(scope, b.id, 'C');
      const d = createCatalogNode(scope, null, 'D');
      saveCatalogs([a, b, c, d]);

      const { roots, nodesById } = buildCatalogTree(scope);
      expect(roots.length).toBe(2);
      expect(roots.map(r => r.id)).toContain(a.id);
      expect(roots.map(r => r.id)).toContain(d.id);
      expect(nodesById.get(a.id).children.length).toBe(1);
      expect(nodesById.get(a.id).children[0].id).toBe(b.id);
      expect(nodesById.get(b.id).children[0].id).toBe(c.id);
    });
  });

  describe('getCatalogPath', () => {
    it('returns full path joined by slash', () => {
      const a = createCatalogNode(scope, null, 'A');
      const b = createCatalogNode(scope, a.id, 'B');
      const c = createCatalogNode(scope, b.id, 'C');
      saveCatalogs([a, b, c]);

      expect(getCatalogPath(scope, c.id)).toBe('A / B / C');
      expect(getCatalogPath(scope, b.id)).toBe('A / B');
      expect(getCatalogPath(scope, 'missing')).toBe('');
    });
  });

  describe('updateCatalogNode', () => {
    it('updates name and bumps version', () => {
      const a = createCatalogNode(scope, null, 'A');
      saveCatalogs([a]);
      const updated = updateCatalogNode(a.id, { name: 'A2' });
      expect(updated.name).toBe('A2');
      expect(updated.version).toBe(2);
      expect(updated.scope).toBe(scope);
      expect(getCatalogNode(scope, a.id).name).toBe('A2');
    });
  });

  describe('deleteCatalogNode', () => {
    it('deletes leaf node', () => {
      const a = createCatalogNode(scope, null, 'A');
      saveCatalogs([a]);
      const result = deleteCatalogNode(a.id, scope);
      expect(result.success).toBe(true);
      expect(loadCatalogs(scope).length).toBe(0);
    });

    it('blocks deletion when node has children', () => {
      const a = createCatalogNode(scope, null, 'A');
      const b = createCatalogNode(scope, a.id, 'B');
      saveCatalogs([a, b]);
      const result = deleteCatalogNode(a.id, scope);
      expect(result.success).toBe(false);
      expect(result.blockedBy).toBe('children');
    });

    it('blocks deletion when node has refs', () => {
      const a = createCatalogNode(scope, null, 'A');
      saveCatalogs([a]);
      registerRefCounter(scope, () => 3);
      const result = deleteCatalogNode(a.id, scope);
      expect(result.success).toBe(false);
      expect(result.blockedBy).toBe('refs');
      expect(result.refCount).toBe(3);
      // clean up counter
      registerRefCounter(scope, () => 0);
    });
  });

  describe('reorderCatalogNode', () => {
    it('rejects dropping onto self', () => {
      const a = createCatalogNode(scope, null, 'A');
      saveCatalogs([a]);
      const result = reorderCatalogNode(a.id, a.id, 'before');
      expect(result.success).toBe(false);
    });

    it('moves before target within same parent', () => {
      const a = createCatalogNode(scope, null, 'A');
      const b = createCatalogNode(scope, null, 'B');
      const c = createCatalogNode(scope, null, 'C');
      saveCatalogs([a, b, c]);

      const result = reorderCatalogNode(c.id, a.id, 'before');
      expect(result.success).toBe(true);
      const nodes = loadCatalogs(scope);
      const byId = new Map(nodes.map(n => [n.id, n]));
      expect(byId.get(a.id).seq).toBe(1);
      expect(byId.get(b.id).seq).toBe(2);
      expect(byId.get(c.id).seq).toBe(0);
    });

    it('moves after target within same parent', () => {
      const a = createCatalogNode(scope, null, 'A');
      const b = createCatalogNode(scope, null, 'B');
      const c = createCatalogNode(scope, null, 'C');
      saveCatalogs([a, b, c]);

      const result = reorderCatalogNode(a.id, b.id, 'after');
      expect(result.success).toBe(true);
      const nodes = loadCatalogs(scope);
      const byId = new Map(nodes.map(n => [n.id, n]));
      expect(byId.get(a.id).seq).toBe(2);
      expect(byId.get(b.id).seq).toBe(0);
      expect(byId.get(c.id).seq).toBe(1);
    });

    it('moves into target as child', () => {
      const a = createCatalogNode(scope, null, 'A');
      const b = createCatalogNode(scope, null, 'B');
      saveCatalogs([a, b]);

      const result = reorderCatalogNode(b.id, a.id, 'child');
      expect(result.success).toBe(true);
      const nodes = loadCatalogs(scope);
      const byId = new Map(nodes.map(n => [n.id, n]));
      expect(byId.get(b.id).parentId).toBe(a.id);
      expect(byId.get(b.id).seq).toBe(0);
    });

    it('rejects moving into own descendant', () => {
      const a = createCatalogNode(scope, null, 'A');
      const b = createCatalogNode(scope, a.id, 'B');
      const c = createCatalogNode(scope, b.id, 'C');
      saveCatalogs([a, b, c]);

      const result = reorderCatalogNode(a.id, c.id, 'child');
      expect(result.success).toBe(false);
    });
  });

  describe('countCatalogRefs', () => {
    it('returns 0 without counter', () => {
      expect(countCatalogRefs('cat_1', 'unknown-scope')).toBe(0);
    });

    it('returns counter value', () => {
      registerRefCounter(scope, (id) => (id === 'cat_1' ? 5 : 0));
      expect(countCatalogRefs('cat_1', scope)).toBe(5);
      expect(countCatalogRefs('cat_2', scope)).toBe(0);
      registerRefCounter(scope, () => 0);
    });
  });
});
