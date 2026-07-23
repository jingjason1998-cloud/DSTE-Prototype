/**
 * DSTE 持久化多标签工作区
 * 标签状态写入 localStorage，刷新后恢复；支持跨阶段并行打开。
 */

const STORAGE_KEY = 'dste-workspace-tabs-v1';

/**
 * @typedef {Object} WorkspaceTab
 * @property {string} id
 * @property {string} pageId
 * @property {string} phase
 * @property {string} title
 * @property {string} [icon]
 * @property {boolean} [pinned]
 * @property {number} createdAt
 */

/**
 * @typedef {Object} WorkspaceState
 * @property {number} version
 * @property {string} activeTabId
 * @property {WorkspaceTab[]} tabs
 * @property {number} nextCounter
 */

function getDefaultState() {
  return {
    version: 1,
    activeTabId: 'tab-1',
    tabs: [{ id: 'tab-1', pageId: 'dashboard', phase: 'dashboard', title: '驾驶舱', icon: 'dashboard', pinned: true, createdAt: Date.now() }],
    nextCounter: 2
  };
}

/**
 * 从 localStorage 加载标签状态
 * @returns {WorkspaceState}
 */
export function loadWorkspaceTabs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
      return getDefaultState();
    }
    if (!Array.isArray(parsed.tabs) || parsed.tabs.length === 0) {
      return getDefaultState();
    }
    return {
      version: 1,
      activeTabId: parsed.activeTabId || parsed.tabs[0]?.id,
      tabs: parsed.tabs,
      nextCounter: parsed.nextCounter || parsed.tabs.length + 1
    };
  } catch (e) {
    console.warn('[workspace-tabs] load failed:', e);
    return getDefaultState();
  }
}

/**
 * 保存标签状态到 localStorage
 * @param {WorkspaceState} state
 */
export function saveWorkspaceTabs(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: 1 }));
  } catch (e) {
    console.warn('[workspace-tabs] save failed:', e);
  }
}

/**
 * 创建新标签
 * @param {WorkspaceState} state
 * @param {Object} pageMeta
 * @param {string} pageMeta.pageId
 * @param {string} pageMeta.phase
 * @param {string} pageMeta.title
 * @param {string} [pageMeta.icon]
 * @returns {{state: WorkspaceState, tab: WorkspaceTab}}
 */
export function createTab(state, { pageId, phase, title, icon }) {
  const newTab = {
    id: 'tab-' + state.nextCounter,
    pageId,
    phase,
    title: title || '未命名',
    icon: icon || 'file',
    pinned: false,
    createdAt: Date.now()
  };
  const newState = {
    ...state,
    tabs: [...state.tabs, newTab],
    activeTabId: newTab.id,
    nextCounter: state.nextCounter + 1
  };
  saveWorkspaceTabs(newState);
  return { state: newState, tab: newTab };
}

/**
 * 切换活动标签
 * @param {WorkspaceState} state
 * @param {string} tabId
 * @returns {WorkspaceState}
 */
export function switchTab(state, tabId) {
  const tab = state.tabs.find(t => t.id === tabId);
  if (!tab) return state;
  const newState = { ...state, activeTabId: tabId };
  saveWorkspaceTabs(newState);
  return newState;
}

/**
 * 关闭标签
 * @param {WorkspaceState} state
 * @param {string} tabId
 * @returns {{state: WorkspaceState, nextActiveTabId: string | null}}
 */
export function closeTab(state, tabId) {
  const idx = state.tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return { state, nextActiveTabId: null };

  // pinned 标签不能关闭
  if (state.tabs[idx].pinned) return { state, nextActiveTabId: null };

  const newTabs = [...state.tabs];
  newTabs.splice(idx, 1);

  // 至少保留一个标签
  if (newTabs.length === 0) {
    const fallback = getDefaultState().tabs[0];
    newTabs.push(fallback);
  }

  let nextActiveTabId = state.activeTabId;
  if (state.activeTabId === tabId) {
    nextActiveTabId = newTabs[Math.max(0, idx - 1)]?.id || newTabs[0]?.id;
  }

  const newState = { ...state, tabs: newTabs, activeTabId: nextActiveTabId };
  saveWorkspaceTabs(newState);
  return { state: newState, nextActiveTabId };
}

/**
 * 在当前活动标签中切换页面
 * @param {WorkspaceState} state
 * @param {Object} pageMeta
 * @param {string} pageMeta.pageId
 * @param {string} pageMeta.phase
 * @param {string} pageMeta.title
 * @param {string} [pageMeta.icon]
 * @returns {WorkspaceState}
 */
export function updateActiveTabPage(state, { pageId, phase, title, icon }) {
  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  if (!activeTab) return state;

  const newTabs = state.tabs.map(t =>
    t.id === state.activeTabId
      ? { ...t, pageId, phase, title: title || t.title, icon: icon || t.icon }
      : t
  );
  const newState = { ...state, tabs: newTabs };
  saveWorkspaceTabs(newState);
  return newState;
}

/**
 * 打开或激活指定页面的标签
 * @param {WorkspaceState} state
 * @param {Object} pageMeta
 * @returns {{state: WorkspaceState, isNew: boolean}}
 */
export function openOrActivateTab(state, pageMeta) {
  const existing = state.tabs.find(t => t.pageId === pageMeta.pageId);
  if (existing) {
    const newState = { ...state, activeTabId: existing.id };
    saveWorkspaceTabs(newState);
    return { state: newState, isNew: false };
  }
  const { state: newState } = createTab(state, pageMeta);
  return { state: newState, isNew: true };
}

/**
 * 设置标签 pinned 状态
 * @param {WorkspaceState} state
 * @param {string} tabId
 * @param {boolean} pinned
 * @returns {WorkspaceState}
 */
export function setTabPinned(state, tabId, pinned) {
  const newTabs = state.tabs.map(t => t.id === tabId ? { ...t, pinned: !!pinned } : t);
  const newState = { ...state, tabs: newTabs };
  saveWorkspaceTabs(newState);
  return newState;
}

/**
 * 拖拽重排标签
 * @param {WorkspaceState} state
 * @param {number} fromIndex
 * @param {number} toIndex
 * @returns {WorkspaceState}
 */
export function reorderTabs(state, fromIndex, toIndex) {
  if (fromIndex === toIndex) return state;
  const tabs = [...state.tabs];
  const [moved] = tabs.splice(fromIndex, 1);
  tabs.splice(toIndex, 0, moved);
  const newState = { ...state, tabs };
  saveWorkspaceTabs(newState);
  return newState;
}

/**
 * 清空所有非 pinned 标签并回到 dashboard
 * @param {WorkspaceState} state
 * @returns {WorkspaceState}
 */
export function closeAllUnpinnedTabs(state) {
  const pinned = state.tabs.filter(t => t.pinned);
  const dashboardTab = getDefaultState().tabs[0];
  const hasDashboard = pinned.some(t => t.pageId === 'dashboard');
  const newTabs = hasDashboard ? pinned : [dashboardTab, ...pinned];
  const newState = { ...state, tabs: newTabs, activeTabId: dashboardTab.id };
  saveWorkspaceTabs(newState);
  return newState;
}

/**
 * 根据 pageId 获取推荐标题与图标
 * @param {string} pageId
 * @param {Function} getPageMetaFn - 通常为 shell.js 中的 getPageMeta
 * @returns {{pageId: string, phase: string, title: string, icon: string}}
 */
export function resolvePageMeta(pageId, getPageMetaFn) {
  const meta = getPageMetaFn(pageId);
  return {
    pageId,
    phase: meta.phase || 'dashboard',
    title: meta.title || '未命名',
    icon: meta.icon || 'file'
  };
}
