/**
 * DSTE 全局命令面板（Cmd+K / Ctrl+K）
 *
 * 纯前端索引：页面索引进项来自 config.js 导航配置，记录索引直接读 localStorage。
 * 记录级跳转通过注入的 onOpenRecord 回调实现（cockpit 内 iframe postMessage，
 * 独立页 ?record= 参数，详见 cockpit.html 与各业务页面的 message listener）。
 *
 * 可测试性：scoreMatch / searchItems / buildPageIndex / buildRecordIndex 均为纯函数。
 */

import { SIDEBAR_CONFIG, TOP_NAV } from './config.js';

/* ===== 匹配打分 ===== */

/**
 * 对单条文本打分：完全相等 > 前缀 > 包含 > 连续子序列；不匹配返回 0。
 */
export function scoreMatch(query, text) {
  if (!query || !text) return 0;
  const q = String(query).trim().toLowerCase();
  const t = String(text).toLowerCase();
  if (!q) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  let i = 0;
  for (const ch of t) {
    if (ch === q[i]) i += 1;
    if (i === q.length) return 30;
  }
  return 0;
}

/**
 * 对 item（含 title/subtitle）打分，取两者最高分。
 */
export function scoreItem(query, item) {
  return Math.max(scoreMatch(query, item.title), scoreMatch(query, item.subtitle) - 10);
}

/**
 * 分组搜索：按 group 分组、组内按分数降序、每组截断 limitPerGroup 条。
 * 返回 [{ group, items: [...] }]，保持 group 首次出现顺序。
 */
export function searchItems(query, items, limitPerGroup = 5) {
  const q = String(query || '').trim();
  const groups = new Map();
  for (const item of items) {
    const score = q ? scoreItem(q, item) : 1;
    if (score <= 0) continue;
    if (!groups.has(item.group)) groups.set(item.group, []);
    groups.get(item.group).push({ ...item, score });
  }
  const result = [];
  for (const [group, list] of groups) {
    list.sort((a, b) => b.score - a.score);
    result.push({ group, items: list.slice(0, limitPerGroup) });
  }
  return result;
}

/* ===== 索引构建 ===== */

/**
 * 页面索引：SIDEBAR_CONFIG 全量条目（含分組子项），按 pageId 去重。
 * 报表中心子项共用 pageId 且依赖 reportId 区分，命令面板无法传 reportId，
 * 因此只保留每个 pageId 的第一个条目。
 */
export function buildPageIndex(sidebarConfig = SIDEBAR_CONFIG, topNav = TOP_NAV) {
  const phaseLabels = {};
  for (const p of topNav) phaseLabels[p.id] = p.label;

  const seen = new Set();
  const items = [];
  const push = (pageId, label, icon) => {
    if (!pageId || seen.has(pageId)) return;
    seen.add(pageId);
    // phase 以 pageId 前缀为准（快捷入口会把其他阶段的页面收进本阶段侧边栏）
    const phaseId = pageId.includes('/') ? pageId.split('/')[0] : pageId;
    items.push({
      kind: 'page',
      group: '页面',
      pageId,
      title: label,
      subtitle: phaseLabels[phaseId] || phaseId || '',
      icon: icon || '',
    });
  };

  for (const entries of Object.values(sidebarConfig)) {
    for (const entry of entries) {
      if (entry.type === 'item') {
        push(entry.id, entry.label, entry.icon);
      } else if (entry.type === 'group') {
        for (const sub of entry.items || []) {
          push(sub.id, sub.label, sub.icon);
        }
      }
    }
  }
  return items;
}

/**
 * 记录索引源。idField/titleField/subFields 描述每条记录如何变成可搜索项；
 * recordType/pageId/section 描述跳转方式（deepLink=false 时退化为页面跳转）。
 */
export const RECORD_SOURCES = [
  {
    type: 'meeting', group: '会议', storageKey: 'dste_meetings', pageId: 'exe/meetings',
    titleField: 'title', subFields: ['date', 'host'], deepLink: true,
  },
  {
    type: 'topic', group: '业务专题', storageKey: 'dste_business_topics_v2', pageId: 'exe/business-topics',
    titleField: 'name', subFields: ['owner', 'department'], deepLink: true,
  },
  {
    type: 'resolution', group: '决议', storageKey: 'dste_resolutions_v2', pageId: 'exe/meetings',
    titleField: 'content', subFields: ['owner', 'sourceMeetingTitle'], deepLink: true,
    // 决议无独立详情页：跳到来源会议的「决策」区块
    resolveTarget: (r) => ({ recordType: 'meeting', id: r.sourceMeetingId, section: 'decisions' }),
  },
  {
    type: 'requirement', group: '需求', storageKey: 'dste_requirements_v1', pageId: 'admin/requirement-pool',
    titleField: 'title', subFields: ['reqCode', 'reporter'], deepLink: true,
  },
  {
    type: 'strategy-topic', group: '战略专题', storageKey: 'dste_strategy_topics_v2', pageId: 'sp/strategy-topics',
    titleField: 'name', subFields: ['owner', 'year'], deepLink: false,
  },
  {
    type: 'employee', group: '人员', storageKey: 'dste_employees_v1', pageId: 'admin/employee-directory',
    titleField: 'name', subFields: ['englishName', 'orgPath'], deepLink: false,
  },
];

/**
 * 从 storage（默认 window.localStorage）读取各模块记录，生成可搜索项。
 * 单条源数据解析失败时跳过该源，不影响其他源。
 */
export function buildRecordIndex(storage, sources = RECORD_SOURCES) {
  const store = storage || (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store) return [];
  const items = [];
  for (const src of sources) {
    let records;
    try {
      const raw = store.getItem(src.storageKey);
      if (!raw) continue;
      records = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!Array.isArray(records)) continue;
    for (const rec of records) {
      const title = rec && rec[src.titleField];
      if (!title) continue;
      const subtitle = (src.subFields || [])
        .map((f) => rec[f])
        .filter(Boolean)
        .join(' · ');
      const target = src.resolveTarget
        ? src.resolveTarget(rec)
        : { recordType: src.type, id: rec.id, section: undefined };
      if (src.deepLink && !target.id) continue;
      items.push({
        kind: src.deepLink ? 'record' : 'page',
        group: src.group,
        pageId: src.pageId,
        recordType: target.recordType,
        recordId: target.id,
        section: target.section,
        title: String(title),
        subtitle,
      });
    }
  }
  return items;
}

/* ===== UI ===== */

const PALETTE_ID = 'dste-command-palette';

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * 初始化命令面板。
 * @param {Object} handlers
 * @param {(pageId: string) => void} handlers.onOpenPage 页面跳转
 * @param {(target: {pageId, recordType, id, section}) => void} handlers.onOpenRecord 记录跳转
 * @returns {{ open: Function, close: Function, toggle: Function }}
 */
export function initCommandPalette({ onOpenPage, onOpenRecord } = {}) {
  let overlay = null;
  let input = null;
  let listEl = null;
  let flatResults = [];
  let activeIndex = 0;

  function buildIndex() {
    return [...buildPageIndex(), ...buildRecordIndex()];
  }

  function render() {
    const q = input.value;
    const grouped = searchItems(q, buildIndex());
    flatResults = [];
    let html = '';
    for (const g of grouped) {
      html += `<div class="cmdk-group-label">${escapeHtml(g.group)}</div>`;
      for (const item of g.items) {
        const idx = flatResults.length;
        flatResults.push(item);
        html += `
          <div class="cmdk-item" data-idx="${idx}">
            <span class="cmdk-item-title">${escapeHtml(item.title)}</span>
            <span class="cmdk-item-sub">${escapeHtml(item.subtitle || '')}</span>
          </div>`;
      }
    }
    if (!flatResults.length) {
      html = '<div class="cmdk-empty">无匹配结果</div>';
    }
    listEl.innerHTML = html;
    activeIndex = 0;
    updateActive();
  }

  function updateActive() {
    listEl.querySelectorAll('.cmdk-item').forEach((el) => {
      el.classList.toggle('active', Number(el.dataset.idx) === activeIndex);
    });
    const activeEl = listEl.querySelector(`.cmdk-item[data-idx="${activeIndex}"]`);
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
  }

  function execute(item) {
    close();
    if (!item) return;
    if (item.kind === 'record' && typeof onOpenRecord === 'function') {
      onOpenRecord({ pageId: item.pageId, recordType: item.recordType, id: item.recordId, section: item.section });
    } else if (typeof onOpenPage === 'function') {
      onOpenPage(item.pageId);
    }
  }

  function ensureDom() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = PALETTE_ID;
    overlay.className = 'cmdk-overlay';
    overlay.innerHTML = `
      <div class="cmdk-panel" role="dialog" aria-label="全局搜索">
        <div class="cmdk-input-row">
          <input class="cmdk-input" type="text" placeholder="搜索页面、会议、专题、决议、需求、人员…" />
          <kbd class="cmdk-kbd">ESC</kbd>
        </div>
        <div class="cmdk-list"></div>
        <div class="cmdk-footer">
          <span><kbd class="cmdk-kbd">↑↓</kbd> 选择</span>
          <span><kbd class="cmdk-kbd">↵</kbd> 打开</span>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    input = overlay.querySelector('.cmdk-input');
    listEl = overlay.querySelector('.cmdk-list');

    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) close();
    });
    input.addEventListener('input', render);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, flatResults.length - 1);
        updateActive();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActive();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        execute(flatResults[activeIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    });
    listEl.addEventListener('click', (e) => {
      const el = e.target.closest('.cmdk-item');
      if (el) execute(flatResults[Number(el.dataset.idx)]);
    });
  }

  function open() {
    ensureDom();
    overlay.classList.add('open');
    input.value = '';
    render();
    setTimeout(() => input.focus(), 0);
  }

  function close() {
    if (overlay) overlay.classList.remove('open');
  }

  function toggle() {
    if (overlay && overlay.classList.contains('open')) close();
    else open();
  }

  // 全局快捷键：Cmd+K / Ctrl+K
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggle();
    }
  });

  return { open, close, toggle };
}
