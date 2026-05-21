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

  container.innerHTML = TOP_NAV.map(item => `
    <li><a href="#${item.defaultPage}" data-phase="${item.id}" class="top-nav-item">
      <span>${item.icon}</span>
      <span>${item.label}</span>
      <span class="nav-full-label">${item.full}</span>
    </a></li>
  `).join('');

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

  const config = SIDEBAR_CONFIG[phase] || [];

  if (phase === 'ai') {
    container.classList.add('collapsed');
    return;
  }
  container.classList.remove('collapsed');

  let html = '';
  config.forEach(item => {
    if (item.type === 'item') {
      html += `<a class="sidebar-item" data-page="${item.id}" href="#${item.id}">
        <span class="icon">${item.icon}</span><span>${item.label}</span>
      </a>`;
    } else if (item.type === 'quick') {
      html += `<div class="sidebar-quick">${item.label}</div>`;
    } else if (item.type === 'group') {
      html += `<div class="sidebar-group">
        <div class="sidebar-group-title">${item.title}</div>
        ${item.items.map(sub => `
          <a class="sidebar-item" data-page="${sub.id}" href="#${sub.id}">
            <span class="icon">${sub.icon}</span><span>${sub.label}</span>
          </a>
        `).join('')}
      </div>`;
    }
  });
  container.innerHTML = html;

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
