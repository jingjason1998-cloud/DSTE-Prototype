/**
 * DSTE Shell 核心逻辑
 * 渲染导航栏、侧边栏等共享 DOM 操作
 */

import { TOP_NAV, SIDEBAR_CONFIG, PAGE_NAMES } from './config.js';

/**
 * 渲染顶部导航栏
 * @param {string} activePhase - 当前激活的 phase
 * @param {Function} onNavigate - 导航回调函数
 */
export function renderTopNav(activePhase, onNavigate) {
  const container = document.getElementById('top-nav-links');
  if (!container) return;

  container.innerHTML = '';
  TOP_NAV.forEach(item => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${item.defaultPage}`;
    a.dataset.phase = item.id;
    a.className = 'top-nav-item';

    const iconSpan = document.createElement('span');
    iconSpan.textContent = item.icon;
    const labelSpan = document.createElement('span');
    labelSpan.textContent = item.label;
    const fullSpan = document.createElement('span');
    fullSpan.className = 'nav-full-label';
    fullSpan.textContent = item.full;

    a.appendChild(iconSpan);
    a.appendChild(labelSpan);
    a.appendChild(fullSpan);
    li.appendChild(a);
    container.appendChild(li);
  });

  container.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const phase = link.dataset.phase;
      const defaultPage = TOP_NAV.find(n => n.id === phase)?.defaultPage;
      if (onNavigate && defaultPage) {
        onNavigate(defaultPage);
      }
    });
  });

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
}

/**
 * 渲染侧边栏
 * @param {string} phase - 当前 phase
 * @param {string} activePage - 当前页面 ID
 * @param {Function} onNavigate - 导航回调函数
 */
export function renderSidebar(phase, activePage, onNavigate) {
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
      a.href = `#${item.id}`;
      const iconSpan = document.createElement('span');
      iconSpan.className = 'icon';
      iconSpan.textContent = item.icon;
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
      title.textContent = item.title;
      group.appendChild(title);
      item.items.forEach(sub => {
        const a = document.createElement('a');
        a.className = 'sidebar-item';
        a.dataset.page = sub.id;
        a.href = `#${sub.id}`;
        const iconSpan = document.createElement('span');
        iconSpan.className = 'icon';
        iconSpan.textContent = sub.icon;
        const labelSpan = document.createElement('span');
        labelSpan.textContent = sub.label;
        a.appendChild(iconSpan);
        a.appendChild(labelSpan);
        group.appendChild(a);
      });
      container.appendChild(group);
    }
  });

  // 绑定点击
  container.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      if (onNavigate) {
        onNavigate(item.dataset.page);
      }
    });
  });

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
