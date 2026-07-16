/**
 * DSTE Shell 核心逻辑
 * 渲染导航栏、侧边栏等共享 DOM 操作
 * 支持两种模式：
 * - SPA 模式（cockpit）：hash 链接 + onNavigate 回调
 * - 独立页面模式（external）：真实 HTML 文件链接，浏览器直接跳转
 */

import { TOP_NAV, SIDEBAR_CONFIG, PAGE_NAMES, EXTERNAL_PAGES } from './config.js';
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

/**
 * 渲染图标到元素中
 * @param {HTMLElement} el
 * @param {string} key - icon-mapping.js 中的 key
 * @param {number} size
 */
function renderIcon(el, key, size = 18) {
  el.innerHTML = icon(key, { size, ariaLabel: '' });
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

    if (item.type === 'drawer') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'top-nav-item top-nav-drawer-toggle';
      btn.dataset.phase = item.id;
      btn.dataset.drawer = 'true';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'top-nav-icon';
      renderIcon(iconSpan, item.icon, 18);
      const labelSpan = document.createElement('span');
      labelSpan.textContent = item.label;
      const fullSpan = document.createElement('span');
      fullSpan.className = 'nav-full-label';
      fullSpan.textContent = item.full;

      btn.appendChild(iconSpan);
      btn.appendChild(labelSpan);
      btn.appendChild(fullSpan);
      li.appendChild(btn);
    } else {
      const a = document.createElement('a');
      a.href = getTopNavHref(item, external);
      a.dataset.phase = item.id;
      a.className = 'top-nav-item';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'top-nav-icon';
      renderIcon(iconSpan, item.icon, 18);
      const labelSpan = document.createElement('span');
      labelSpan.textContent = item.label;
      const fullSpan = document.createElement('span');
      fullSpan.className = 'nav-full-label';
      fullSpan.textContent = item.full;

      a.appendChild(iconSpan);
      a.appendChild(labelSpan);
      a.appendChild(fullSpan);
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

  container.innerHTML = '';
  config.forEach(item => {
    if (item.type === 'item') {
      const a = document.createElement('a');
      a.className = 'sidebar-item';
      a.dataset.page = item.id;
      a.href = getSidebarHref(item.id, external);
      // eslint-disable-next-line security/detect-object-injection
      if (external && EXTERNAL_PAGES[item.id]) {
        a.dataset.external = 'true';
      }
      const iconSpan = document.createElement('span');
      iconSpan.className = 'icon';
      renderIcon(iconSpan, item.icon, 18);
      const labelSpan = document.createElement('span');
      labelSpan.textContent = item.label;
      a.appendChild(iconSpan);
      a.appendChild(labelSpan);
      container.appendChild(a);
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
        const a = document.createElement('a');
        a.className = 'sidebar-item';
        a.dataset.page = sub.id;
        if (sub.reportId) a.dataset.reportId = sub.reportId;
        a.href = getSidebarHref(sub.id, external);
        // eslint-disable-next-line security/detect-object-injection
        if (external && EXTERNAL_PAGES[sub.id]) {
          a.dataset.external = 'true';
        }
        const iconSpan = document.createElement('span');
        iconSpan.className = 'icon';
        renderIcon(iconSpan, sub.icon, 18);
        const labelSpan = document.createElement('span');
        labelSpan.textContent = sub.label;
        a.appendChild(iconSpan);
        a.appendChild(labelSpan);
        group.appendChild(a);
      });
      container.appendChild(group);
    }
  });

  // SPA 模式下绑定点击事件
  if (!external && typeof onNavigate === 'function') {
    container.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const reportId = item.dataset.reportId;
        if (reportId) window._pendingReportId = reportId;
        onNavigate(item.dataset.page);
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
    item.classList.toggle('active', item.dataset.page === pageId);
  });
}

/**
 * 获取页面名称
 * @param {string} pageId
 * @returns {string}
 */
export function getPageName(pageId) {
  // eslint-disable-next-line security/detect-object-injection
  return PAGE_NAMES[pageId] || 'DSTE';
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
