/**
 * DSTE Shell 核心逻辑
 * 渲染导航栏、侧边栏等共享 DOM 操作
 * 支持两种模式：
 * - SPA 模式（cockpit）：hash 链接 + onNavigate 回调
 * - 独立页面模式（external）：真实 HTML 文件链接，浏览器直接跳转
 */

import { TOP_NAV, SIDEBAR_CONFIG, PAGE_NAMES, PAGE_META, EXTERNAL_PAGES } from './config.js';
import { icon } from '../../assets/js/icons.js';

let globalAiDrawerModule = null;

async function toggleGlobalAiDrawer() {
  if (!globalAiDrawerModule) {
    globalAiDrawerModule = await import('../components/GlobalAiDrawer.js');
  }
  if (globalAiDrawerModule?.toggleGlobalAiDrawer) {
    globalAiDrawerModule.toggleGlobalAiDrawer();
  }
}

export { toggleGlobalAiDrawer };

/**
 * 渲染图标到元素中
 * @param {HTMLElement} el
 * @param {string} key - icon-mapping.js 中的 key
 * @param {number} size
 */
function renderIcon(el, key, size = 18) {
  el.innerHTML = icon(key, { size, ariaLabel: '' });
}

/* ===== 最近访问 / 收藏 ===== */

const RECENT_PAGES_KEY = 'dste-recent-pages-v1';
const FAVORITE_PAGES_KEY = 'dste-favorite-pages-v1';
const MAX_RECENT_PAGES = 5;
/** 不进最近访问的页面（首页类默认入口） */
const RECENT_EXCLUDE = new Set(['dashboard', 'ai']);

function readPageIdList(key) {
  try {
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function getRecentPages() {
  return readPageIdList(RECENT_PAGES_KEY);
}

export function getFavoritePages() {
  return readPageIdList(FAVORITE_PAGES_KEY);
}

/**
 * 记录一次页面访问（最新在前，去重，截断到 MAX_RECENT_PAGES）
 */
export function recordRecentPage(pageId) {
  if (!pageId || RECENT_EXCLUDE.has(pageId)) return;
  const list = [pageId, ...readPageIdList(RECENT_PAGES_KEY).filter((p) => p !== pageId)];
  localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(list.slice(0, MAX_RECENT_PAGES)));
}

/**
 * 切换收藏状态，返回切换后的收藏列表
 */
export function toggleFavoritePage(pageId) {
  const list = readPageIdList(FAVORITE_PAGES_KEY);
  const idx = list.indexOf(pageId);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(pageId);
  localStorage.setItem(FAVORITE_PAGES_KEY, JSON.stringify(list));
  return list;
}

/**
 * 获取顶部导航链接地址
 * @param {Object} item - TOP_NAV 项
 * @param {boolean} external - 是否为独立页面模式
 * @returns {string}
 */
function getTopNavHref(item, external) {
  if (!external) return '#' + item.defaultPage;
  return EXTERNAL_PAGES[item.defaultPage] || `cockpit.html#${item.defaultPage}`;
}

/**
 * 获取侧边栏链接地址
 * @param {string} pageId - 页面 ID
 * @param {boolean} external - 是否为独立页面模式
 * @returns {string}
 */
function getSidebarHref(pageId, external) {
  if (!external) return '#' + pageId;
  // eslint-disable-next-line security/detect-object-injection
  return EXTERNAL_PAGES[pageId] || `cockpit.html#${pageId}`;
}

/**
 * 渲染顶部导航栏
 * @param {string} activePhase - 当前激活的 phase
 * @param {Function} onNavigate - 导航回调函数（SPA 模式下生效）
 * @param {Object} options - 渲染选项
 * @param {boolean} options.external - 是否为独立页面模式（生成真实文件链接）
 */
export function renderTopNav(activePhase, onNavigate, options = {}) {
  const { external = false } = options;
  const container = document.getElementById('top-nav-links');
  if (!container) return;

  container.innerHTML = '';
  TOP_NAV.forEach(item => {
    const li = document.createElement('li');

    // 短标签与全称重复时只渲染一个（如 驾驶舱/驾驶舱 → 驾驶舱；AI/AI 助手 → AI 助手）
    const labelText = item.full && item.full.startsWith(item.label) ? item.full : item.label;
    const showFull = item.full && item.full !== item.label && !item.full.startsWith(item.label);
    const buildContent = () => {
      const frag = document.createDocumentFragment();
      const iconSpan = document.createElement('span');
      iconSpan.className = 'top-nav-icon';
      renderIcon(iconSpan, item.icon, 18);
      const labelSpan = document.createElement('span');
      labelSpan.textContent = labelText;
      frag.appendChild(iconSpan);
      frag.appendChild(labelSpan);
      if (showFull) {
        const fullSpan = document.createElement('span');
        fullSpan.className = 'nav-full-label';
        fullSpan.textContent = item.full;
        frag.appendChild(fullSpan);
      }
      return frag;
    };

    if (item.type === 'drawer') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'top-nav-item top-nav-drawer-toggle';
      btn.dataset.phase = item.id;
      btn.dataset.drawer = 'true';
      btn.appendChild(buildContent());
      li.appendChild(btn);
    } else {
      const a = document.createElement('a');
      a.href = getTopNavHref(item, external);
      a.dataset.phase = item.id;
      a.className = 'top-nav-item';
      a.appendChild(buildContent());
      li.appendChild(a);
    }

    container.appendChild(li);
  });

  // SPA 模式下绑定点击事件，阻止默认跳转并回调 navigate
  if (!external && typeof onNavigate === 'function') {
    container.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const phase = link.dataset.phase;
        const defaultPage = TOP_NAV.find(n => n.id === phase)?.defaultPage;
        if (defaultPage) {
          onNavigate(defaultPage);
        }
      });
    });
  }

  // 绑定 AI 抽屉开关（SPA 与独立页面都生效）
  const aiToggle = container.querySelector('[data-drawer="true"]');
  if (aiToggle) {
    aiToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleGlobalAiDrawer();
    });
  }

  updateTopNavActive(activePhase);
}

/**
 * 更新顶部导航激活状态
 * @param {string} phase
 */
export function updateTopNavActive(phase) {
  document.querySelectorAll('.top-nav-item').forEach(link => {
    link.classList.toggle('active', link.dataset.phase === phase);
  });
  updateAiDrawerToggleActive();
}

/**
 * 根据抽屉开关状态高亮 AI 按钮
 */
export function updateAiDrawerToggleActive() {
  const toggle = document.querySelector('.top-nav-drawer-toggle[data-phase="ai"]');
  if (toggle) {
    toggle.classList.toggle('active', document.body.classList.contains('ai-drawer-open'));
  }
}

/**
 * 渲染侧边栏
 * @param {string} phase - 当前 phase
 * @param {string} activePage - 当前页面 ID
 * @param {Function} onNavigate - 导航回调函数（SPA 模式下生效）
 * @param {Object} options - 渲染选项
 * @param {boolean} options.external - 是否为独立页面模式（生成真实文件链接）
 */
export function renderSidebar(phase, activePage, onNavigate, options = {}) {
  const { external = false } = options;
  const container = document.getElementById('sidebar');
  if (!container) return;

  // eslint-disable-next-line security/detect-object-injection
  const config = SIDEBAR_CONFIG[phase] || [];

  if (phase === 'ai') {
    container.classList.add('collapsed');
    return;
  }
  container.classList.remove('collapsed');

  // 记录最近访问（renderSidebar 是 SPA/独立页唯一的侧边栏渲染入口）
  if (activePage) recordRecentPage(activePage);

  const favorites = getFavoritePages();
  const favoritesSet = new Set(favorites);

  // 创建侧边栏条目（含收藏星标）
  // asQuick=true 时使用 sidebar-quick-entry 类：快捷分组与常规配置允许同一 pageId 并存，
  // 避免 .sidebar-item[data-page] 选择器命中两个元素（E2E strict mode）
  const buildItem = (pageId, label, iconKey, reportId, asQuick = false) => {
    const a = document.createElement('a');
    a.className = asQuick ? 'sidebar-quick-entry' : 'sidebar-item';
    a.dataset.page = pageId;
    if (reportId) a.dataset.reportId = reportId;
    a.href = getSidebarHref(pageId, external);
    // eslint-disable-next-line security/detect-object-injection
    if (external && EXTERNAL_PAGES[pageId]) {
      a.dataset.external = 'true';
    }
    if (favoritesSet.has(pageId)) a.classList.add('favorited');
    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon';
    renderIcon(iconSpan, iconKey, 18);
    const labelSpan = document.createElement('span');
    labelSpan.className = 'sidebar-label';
    labelSpan.textContent = label;
    a.title = label;
    a.appendChild(iconSpan);
    a.appendChild(labelSpan);
    const fav = document.createElement('span');
    fav.className = 'sidebar-fav';
    fav.dataset.favId = pageId;
    fav.title = favoritesSet.has(pageId) ? '取消收藏' : '收藏';
    renderIcon(fav, 'star', 14);
    a.appendChild(fav);
    return a;
  };

  // 渲染「收藏」「最近访问」快捷分组（空则不渲染）
  const renderQuickGroup = (label, pageIds) => {
    const valid = pageIds.filter((id) => PAGE_META[id]);
    if (!valid.length) return;
    const div = document.createElement('div');
    div.className = 'sidebar-quick';
    div.textContent = label;
    container.appendChild(div);
    valid.forEach((id) => {
      // eslint-disable-next-line security/detect-object-injection
      const meta = PAGE_META[id];
      container.appendChild(buildItem(id, meta.title, meta.icon, undefined, true));
    });
  };

  container.innerHTML = '';
  renderQuickGroup('收藏', favorites);
  renderQuickGroup('最近访问', getRecentPages());

  config.forEach(item => {
    if (item.type === 'item') {
      container.appendChild(buildItem(item.id, item.label, item.icon));
    } else if (item.type === 'quick') {
      const div = document.createElement('div');
      div.className = 'sidebar-quick';
      div.textContent = item.label;
      container.appendChild(div);
    } else if (item.type === 'group') {
      const group = document.createElement('div');
      group.className = 'sidebar-group';
      const title = document.createElement('div');
      title.className = 'sidebar-group-title';
      title.style.cursor = 'pointer';
      title.style.display = 'flex';
      title.style.alignItems = 'center';
      title.style.justifyContent = 'space-between';
      title.style.userSelect = 'none';
      const groupKey = `sidebar_group_${phase}_${item.title}`;
      const isCollapsed = localStorage.getItem(groupKey) === 'collapsed';
      if (isCollapsed) group.classList.add('collapsed');
      const groupIcon = item.icon ? `<span class="icon sidebar-group-icon">${icon(item.icon, { size: 14 })}</span>` : '';
      title.innerHTML = `<span style="display:flex;align-items:center;">${groupIcon}<span>${item.title}</span></span><span class="sidebar-group-toggle">${isCollapsed ? icon('caretRight', {size: 12}) : icon('caretDown', {size: 12})}</span>`;
      title.addEventListener('click', () => {
        group.classList.toggle('collapsed');
        const collapsed = group.classList.contains('collapsed');
        title.querySelector('.sidebar-group-toggle').innerHTML = collapsed ? icon('caretRight', {size: 12}) : icon('caretDown', {size: 12});
        localStorage.setItem(groupKey, collapsed ? 'collapsed' : 'expanded');
      });
      group.appendChild(title);
      item.items.forEach(sub => {
        group.appendChild(buildItem(sub.id, sub.label, sub.icon, sub.reportId));
      });
      container.appendChild(group);
    }
  });

  // 收藏星标：点击切换收藏并重渲染，不触发导航
  container.querySelectorAll('.sidebar-fav').forEach((fav) => {
    fav.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFavoritePage(fav.dataset.favId);
      renderSidebar(phase, activePage, onNavigate, options);
    });
  });

  // SPA 模式下绑定点击事件
  if (!external && typeof onNavigate === 'function') {
    container.querySelectorAll('.sidebar-item, .sidebar-quick-entry').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const reportId = item.dataset.reportId;
        if (reportId) window._pendingReportId = reportId;
        const openInNewTab = options.onOpenInNewTab;
        if ((e.ctrlKey || e.metaKey || e.button === 1) && typeof openInNewTab === 'function') {
          openInNewTab(item.dataset.page);
        } else {
          onNavigate(item.dataset.page);
        }
      });
    });
  }

  updateSidebarActive(activePage);
}

/**
 * 更新侧边栏激活状态
 * @param {string} pageId
 */
export function updateSidebarActive(pageId) {
  document.querySelectorAll('.sidebar-item').forEach(item => {
    const itemPage = item.dataset.page;
    const reportId = item.dataset.reportId;
    let active = itemPage === pageId;

    // 报表中心多个子项共用同一个 pageId，需要按 reportId 区分高亮
    if (active && pageId === 'exe/report-center') {
      const activeReport = window._reportCenterActiveReport || '';
      if (reportId) {
        active = reportId === activeReport;
      } else {
        active = !activeReport;
      }
    }

    item.classList.toggle('active', active);
  });
}

/**
 * 获取页面元数据
 * @param {string} pageId
 * @returns {Object}
 */
export function getPageMeta(pageId) {
  // eslint-disable-next-line security/detect-object-injection
  return PAGE_META[pageId] || { title: PAGE_NAMES[pageId] || pageId, icon: 'file', phase: getPhaseFromPage(pageId) };
}

/**
 * 获取页面名称
 * @param {string} pageId
 * @returns {string}
 */
export function getPageName(pageId) {
  // eslint-disable-next-line security/detect-object-injection
  return PAGE_META[pageId]?.title || PAGE_NAMES[pageId] || 'DSTE';
}

/**
 * 更新页面标题
 * @param {string} pageId
 */
export function updateTitle(pageId) {
  document.title = getPageName(pageId) + ' - DSTE 战略管理平台';
}

/**
 * 根据页面 ID 确定所属 phase
 * @param {string} pageId
 * @returns {string}
 */
export function getPhaseFromPage(pageId) {
  return TOP_NAV.find(n => pageId === n.id || pageId.startsWith(n.id + '/'))?.id || 'dashboard';
}
