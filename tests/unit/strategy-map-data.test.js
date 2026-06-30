import { describe, it, expect, beforeEach } from 'vitest';
import { hasCycle, LinkStore, MapConfigStore } from '../../src/lib/strategy-map-data.js';

// Mock localStorage
const storage = {};
globalThis.localStorage = {
  getItem: (key) => (key in storage ? storage[key] : null),
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(key => delete storage[key]); }
};

describe('hasCycle', () => {
  it('returns false for empty links', () => {
    expect(hasCycle([])).toBe(false);
  });

  it('returns false for acyclic graph', () => {
    const links = [
      { from: 'a', to: 'b', type: 'drives' },
      { from: 'b', to: 'c', type: 'drives' }
    ];
    expect(hasCycle(links)).toBe(false);
  });

  it('returns true for simple cycle', () => {
    const links = [
      { from: 'a', to: 'b', type: 'drives' },
      { from: 'b', to: 'c', type: 'drives' }
    ];
    expect(hasCycle(links, { from: 'c', to: 'a', type: 'drives' })).toBe(true);
  });

  it('returns true for self-loop candidate', () => {
    expect(hasCycle([], { from: 'a', to: 'a', type: 'drives' })).toBe(true);
  });

  it('returns false when candidate does not close cycle', () => {
    const links = [
      { from: 'a', to: 'b', type: 'drives' },
      { from: 'b', to: 'c', type: 'drives' }
    ];
    expect(hasCycle(links, { from: 'a', to: 'c', type: 'drives' })).toBe(false);
  });
});

describe('LinkStore', () => {
  const mapId = 'test_map';

  beforeEach(() => {
    // 清空 localStorage
    globalThis.localStorage.clear();
  });

  it('creates a new link', () => {
    const links = LinkStore.create(mapId, { from: 'a', to: 'b', type: 'drives' });
    expect(links).toHaveLength(1);
    expect(links[0].from).toBe('a');
    expect(links[0].to).toBe('b');
    expect(links[0].type).toBe('drives');
    expect(links[0].id).toBe('a__b');
    expect(typeof links[0].lastModified).toBe('number');
  });

  it('rejects self-link', () => {
    expect(() => LinkStore.create(mapId, { from: 'a', to: 'a', type: 'drives' }))
      .toThrow('不能连接自身');
  });

  it('rejects duplicate link', () => {
    LinkStore.create(mapId, { from: 'a', to: 'b', type: 'drives' });
    expect(() => LinkStore.create(mapId, { from: 'a', to: 'b', type: 'influences' }))
      .toThrow('因果链已存在');
  });

  it('rejects link that creates cycle', () => {
    LinkStore.create(mapId, { from: 'a', to: 'b', type: 'drives' });
    LinkStore.create(mapId, { from: 'b', to: 'c', type: 'drives' });
    expect(() => LinkStore.create(mapId, { from: 'c', to: 'a', type: 'drives' }))
      .toThrow('不能创建循环依赖');
  });

  it('updates link type', () => {
    LinkStore.create(mapId, { from: 'a', to: 'b', type: 'drives' });
    const links = LinkStore.update(mapId, 'a', 'b', { type: 'supports' });
    expect(links[0].type).toBe('supports');
  });

  it('rejects update that creates cycle', () => {
    LinkStore.create(mapId, { from: 'a', to: 'b', type: 'drives' });
    LinkStore.create(mapId, { from: 'b', to: 'c', type: 'drives' });
    // a->b, b->c exist; trying to change a->b to c->b would create c->b->c cycle
    expect(() => LinkStore.update(mapId, 'a', 'b', { from: 'c', to: 'b' }))
      .toThrow('修改后会产生循环依赖');
  });

  it('deletes a link', () => {
    LinkStore.create(mapId, { from: 'a', to: 'b', type: 'drives' });
    const links = LinkStore.delete(mapId, 'a', 'b');
    expect(links).toHaveLength(0);
  });

  it('checks link existence', () => {
    LinkStore.create(mapId, { from: 'a', to: 'b', type: 'drives' });
    expect(LinkStore.hasLink(mapId, 'a', 'b')).toBe(true);
    expect(LinkStore.hasLink(mapId, 'b', 'a')).toBe(false);
  });
});

describe('MapConfigStore', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('seeds default maps on first access', () => {
    const maps = MapConfigStore.getAll();
    expect(maps.length).toBeGreaterThan(0);
    expect(maps[0].id).toBe('yx_2025_2027');
    expect(storage['dste_sm_maps_v3_version']).toBeDefined();
  });

  it('does not re-seed if data already exists', () => {
    MapConfigStore.getAll(); // seed
    const maps = MapConfigStore.getAll();
    expect(maps.length).toBe(1);
  });

  it('persists a created map', () => {
    MapConfigStore.getAll(); // seed
    const created = MapConfigStore.create({
      name: '测试地图',
      dept: 'test',
      deptName: '测试部门',
      cycle: { startYear: 2027, endYear: 2029 },
      status: 'draft',
    });
    expect(created.id).toBeDefined();

    const loaded = MapConfigStore.get(created.id);
    expect(loaded).not.toBeNull();
    expect(loaded.name).toBe('测试地图');
  });
});
