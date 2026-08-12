import { describe, it, expect, beforeEach } from 'vitest';

// node 环境下 stub localStorage 后再动态引入 shell.js
let store;
beforeEach(() => {
  store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

async function loadShell() {
  return import('../../src/lib/shell.js');
}

describe('recordRecentPage / getRecentPages', () => {
  it('最新访问排在最前', async () => {
    const { recordRecentPage, getRecentPages } = await loadShell();
    recordRecentPage('exe/meetings');
    recordRecentPage('exe/business-topics');
    expect(getRecentPages()).toEqual(['exe/business-topics', 'exe/meetings']);
  });

  it('重复访问去重并提前', async () => {
    const { recordRecentPage, getRecentPages } = await loadShell();
    recordRecentPage('exe/meetings');
    recordRecentPage('exe/business-topics');
    recordRecentPage('exe/meetings');
    expect(getRecentPages()).toEqual(['exe/meetings', 'exe/business-topics']);
  });

  it('最多保留 5 条', async () => {
    const { recordRecentPage, getRecentPages } = await loadShell();
    ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].forEach(recordRecentPage);
    expect(getRecentPages()).toEqual(['p6', 'p5', 'p4', 'p3', 'p2']);
  });

  it('dashboard / ai 不进最近访问', async () => {
    const { recordRecentPage, getRecentPages } = await loadShell();
    recordRecentPage('dashboard');
    recordRecentPage('ai');
    recordRecentPage('');
    expect(getRecentPages()).toEqual([]);
  });

  it('损坏数据按空列表处理', async () => {
    store.set('dste-recent-pages-v1', '{bad');
    const { getRecentPages } = await loadShell();
    expect(getRecentPages()).toEqual([]);
  });
});

describe('toggleFavoritePage / getFavoritePages', () => {
  it('收藏再取消', async () => {
    const { toggleFavoritePage, getFavoritePages } = await loadShell();
    toggleFavoritePage('exe/meetings');
    expect(getFavoritePages()).toEqual(['exe/meetings']);
    toggleFavoritePage('exe/meetings');
    expect(getFavoritePages()).toEqual([]);
  });

  it('多个收藏保持顺序', async () => {
    const { toggleFavoritePage, getFavoritePages } = await loadShell();
    toggleFavoritePage('exe/meetings');
    toggleFavoritePage('sp/strategy-map');
    expect(getFavoritePages()).toEqual(['exe/meetings', 'sp/strategy-map']);
  });
});
