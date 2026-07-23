/**
 * DSTE Shell 注入器
 * 为独立 HTML 页面注入统一顶部导航与侧边栏
 *
 * 设计约束：
 * - 零依赖（除项目自身的 shell.js / config.js 外，不引入第三方库）
 * - 嵌入模式 (?embed=1) 下直接返回，不渲染 shell
 * - 兼容 prefers-reduced-motion（不添加额外动画类）
 * - 主题设置由页面内联脚本提前完成，本模块仅做兜底
 */

import { renderTopNav, renderSidebar, getPageName, getPhaseFromPage } from './shell.js';
import { EXTERNAL_PAGES, PAGE_NAMES } from './config.js';
import { hydrateIcons } from '../../assets/js/icons.js';

(function initShell() {
  'use strict';

  // 嵌入模式：不注入 shell，由父页面控制；但保留与父窗口的通信桥
  if (new URLSearchParams(location.search).get('embed') === '1') {
    setupEmbedBridge();
    return;
  }

  // 兜底主题同步（页面内联脚本通常已设置）
  try {
    const storedTheme = (typeof DSTE !== 'undefined' && DSTE.Storage)
      ? DSTE.Storage.getString('dste-theme')
      : null;
    if (storedTheme) {
      document.documentElement.setAttribute('data-theme', storedTheme);
    }
  } catch (e) {
    // 忽略存储读取异常，避免阻塞 shell 渲染
  }

  // 根据当前页面文件名反查 pageId
  const fileName = location.pathname.split('/').pop() || '';
  let pageId = 'dashboard';
  for (const [id, file] of Object.entries(EXTERNAL_PAGES)) {
    if (file === fileName) {
      pageId = id;
      break;
    }
  }

  const phase = getPhaseFromPage(pageId);

  // 暴露当前页面 ID，供全局 AI 抽屉识别
  window.__dsteCurrentPageId = pageId;

  // 渲染统一导航（外部页面模式：生成真实文件链接）
  renderTopNav(phase, null, { external: true });
  renderSidebar(phase, pageId, null, { external: true });

  // 同步页面标题
  // eslint-disable-next-line security/detect-object-injection
  document.title = (PAGE_NAMES[pageId] || getPageName(pageId)) + ' - DSTE 战略管理平台';

  // 移动端汉堡菜单与侧边栏遮罩绑定 + 静态图标 hydration
  function bindShell() {
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (menuToggle && sidebar && overlay) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
      });
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
      });
      sidebar.addEventListener('click', (e) => {
        if (e.target.closest('.sidebar-item')) {
          sidebar.classList.remove('open');
          overlay.classList.remove('open');
        }
      });
    }
    hydrateIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindShell);
  } else {
    bindShell();
  }

  /**
   * 嵌入模式下建立与父窗口的通信桥
   * - 拦截内部页面链接，通知父窗口在工作区打开新标签
   */
  function setupEmbedBridge() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || link.target === '_blank') {
        return;
      }

      // 将 href 映射回 pageId
      const targetFile = href.split('?')[0].split('/').pop() || '';
      let targetPageId = null;
      for (const [id, file] of Object.entries(EXTERNAL_PAGES)) {
        if (file === targetFile) {
          targetPageId = id;
          break;
        }
      }

      if (targetPageId) {
        e.preventDefault();
        window.parent.postMessage({ type: 'dste-navigate', pageId: targetPageId }, window.location.origin);
      }
    });
  }
})();
