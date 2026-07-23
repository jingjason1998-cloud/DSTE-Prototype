/**
 * 全局待办面板渲染器
 * @module todo-panel
 *
 * 负责经营分析会右侧“待办提醒”面板的渲染、刷新、筛选与分组。
 */

import { icon } from '../../../assets/js/icons.js';
import { getMeetings } from '../data-store.js';
import {
  buildGlobalTodos,
  filterTodos,
  groupTodosByType,
  groupTodosByUrgency,
  TODO_PRIORITY,
  TODO_TYPE_CONFIG,
} from '../utils/todo-aggregator.js';

const FILTER_TABS = [
  { key: 'all', label: '全部' },
  { key: 'critical', label: '紧急' },
  { key: 'today', label: '今日' },
  { key: 'week', label: '近 7 天' },
];

const GROUP_TABS = [
  { key: 'none', label: '列表' },
  { key: 'type', label: '按类型' },
  { key: 'urgency', label: '按紧急' },
];

function escapeHtml(s) {
  return window.escapeHtml ? window.escapeHtml(s) : String(s || '');
}

function escapeJsString(s) {
  return window.escapeJsString
    ? window.escapeJsString(s)
    : String(s || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function renderTodoToolbar(realCount, currentFilter, currentGroup, allTodos, currentType) {
  const realTodos = (allTodos || []).filter(t => t.type !== 'empty');
  const typeCounts = {};
  realTodos.forEach(t => { typeCounts[t.type] = (typeCounts[t.type] || 0) + 1; });
  const presentTypes = Object.keys(TODO_TYPE_CONFIG).filter(k => typeCounts[k]);

  const pillStyle = (active) => `padding: 3px 8px; font-size: 11px; border-radius: 4px; border: 1px solid ${active ? 'var(--primary)' : 'var(--border-color)'}; background: ${active ? 'var(--primary)' : 'var(--bg-card)'}; color: ${active ? '#fff' : 'var(--text-secondary)'}; cursor: pointer; transition: all 0.2s;`;

  return `
    <div style="margin-bottom: 12px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-size: 12px; color: var(--text-secondary);">共 ${realCount} 项待办</span>
      </div>
      <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
        ${FILTER_TABS.map(t => `
          <button type="button" data-todo-filter="${t.key}" onclick="switchTodoFilter('${t.key}')"
            style="${pillStyle(currentFilter === t.key)}">
            ${t.label}
          </button>
        `).join('')}
      </div>
      <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
        ${GROUP_TABS.map(t => `
          <button type="button" data-todo-group="${t.key}" onclick="switchTodoGroup('${t.key}')"
            style="${pillStyle(currentGroup === t.key)}">
            ${t.label}
          </button>
        `).join('')}
      </div>
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button type="button" data-todo-type="all" onclick="switchTodoType('all')"
          style="${pillStyle(currentType === 'all')}">
          全部类型
        </button>
        ${presentTypes.map(k => `
          <button type="button" data-todo-type="${k}" onclick="switchTodoType('${k}')"
            style="${pillStyle(currentType === k)}">
            ${TODO_TYPE_CONFIG[k].label} (${typeCounts[k]})
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderTodoItem(t) {
  if (t.type === 'empty') {
    return `
      <div class="todo-item todo-item-empty" style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 0; color: var(--success); text-align: center;">
        <span style="display: inline-flex;">${icon(t.icon, { size: 24 })}</span>
        <span style="font-size: 13px;">${escapeHtml(t.text)}</span>
      </div>
    `;
  }

  const subIndexParam = t.subIndex !== null ? t.subIndex : 'null';
  const sectionParam = t.section || '';
  const typeLabel = TODO_TYPE_CONFIG[t.type]?.label || '';

  return `
    <div class="todo-item"
         data-todo-id="${escapeHtml(t.id)}"
         data-todo-type="${escapeHtml(t.type)}"
         data-todo-section="${escapeHtml(sectionParam)}"
         data-todo-priority="${t.priority}"
         onclick="window.openTodoMeeting('${escapeJsString(t.meetingId)}', '${escapeJsString(sectionParam)}', ${subIndexParam})"
         style="display: flex; gap: 8px; padding: 10px 0; border-bottom: 1px solid var(--border-light); cursor: pointer;"
         onmouseover="this.style.background='var(--bg-page)'"
         onmouseout="this.style.background=''"
         role="button"
         aria-label="${escapeHtml(t.text)}"
         title="${escapeHtml(t.section === 'actions' ? '在行动项抽屉中处理' : '跳转会议详情处理')}">
      <span style="color: ${t.color}; display: inline-flex; flex-shrink: 0; margin-top: 1px;">${icon(t.icon, { size: 14 })}</span>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 12px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;">
          ${escapeHtml(t.text)}
        </div>
        <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${typeLabel ? `<span style="display: inline-block; padding: 0 4px; margin-right: 4px; border-radius: 3px; font-size: 10px; line-height: 16px; color: ${t.color}; background: var(--bg-page); border: 1px solid var(--border-light); vertical-align: 1px;">${escapeHtml(typeLabel)}</span>` : ''}${escapeHtml(t.meetingTitle)}${t.dueText ? ` · ${escapeHtml(t.dueText)}` : ''}
        </div>
      </div>
      <span style="color: var(--primary); display: inline-flex; flex-shrink: 0; align-self: center;">${icon('caretRight', {size: 12})}</span>
    </div>
  `;
}

function renderTodoItems(todos, groupBy) {
  if (groupBy === 'none') {
    return `
      <div class="todo-list">
        ${todos.map(renderTodoItem).join('')}
      </div>
    `;
  }

  if (groupBy === 'type') {
    const groups = groupTodosByType(todos);
    return groups.map(g => `
      <div class="todo-group" style="margin-bottom: 12px;">
        <div style="font-size: 11px; color: var(--text-tertiary); padding: 6px 0; border-bottom: 1px solid var(--border-light);">${escapeHtml(g.label)} (${g.items.length})</div>
        <div class="todo-list">${g.items.map(renderTodoItem).join('')}</div>
      </div>
    `).join('');
  }

  if (groupBy === 'urgency') {
    const groups = groupTodosByUrgency(todos);
    return groups.map(g => `
      <div class="todo-group" style="margin-bottom: 12px;">
        <div style="font-size: 11px; color: var(--text-tertiary); padding: 6px 0; border-bottom: 1px solid var(--border-light);">${escapeHtml(g.label)} (${g.items.length})</div>
        <div class="todo-list">${g.items.map(renderTodoItem).join('')}</div>
      </div>
    `).join('');
  }

  return `<div class="todo-list">${todos.map(renderTodoItem).join('')}</div>`;
}

function renderTodoPanel(meetings, options = {}) {
  const filter = options.filter || window._todoFilter || 'all';
  const groupBy = options.groupBy || window._todoGroup || 'none';
  const type = options.type || window._todoType || 'all';

  const allTodos = buildGlobalTodos(meetings, {
    scenarioConfig: window.SCENARIO_CONFIG,
    pipelineSteps: window.PIPELINE_STEPS,
  });

  const isEmptyState = allTodos.length === 1 && allTodos[0].type === 'empty';
  const realCount = isEmptyState ? 0 : allTodos.length;

  if (isEmptyState) {
    return renderTodoToolbar(0, filter, groupBy, allTodos, 'all') + renderTodoItems(allTodos, 'none');
  }

  const filteredTodos = filterTodos(allTodos, filter)
    .filter(t => type === 'all' || t.type === type);

  return renderTodoToolbar(realCount, filter, groupBy, allTodos, type) + renderTodoItems(filteredTodos, groupBy);
}

function refreshTodoPanel() {
  const panel = document.getElementById('global-todo-panel');
  if (!panel) return;
  const meetings = getMeetings();
  panel.innerHTML = renderTodoPanel(meetings);
}

function switchTodoFilter(filter) {
  if (!FILTER_TABS.some(t => t.key === filter)) return;
  window._todoFilter = filter;
  refreshTodoPanel();
}

function switchTodoGroup(group) {
  if (!GROUP_TABS.some(t => t.key === group)) return;
  window._todoGroup = group;
  refreshTodoPanel();
}

function switchTodoType(type) {
  if (type !== 'all' && !TODO_TYPE_CONFIG[type]) return;
  // 再次点击当前类型则取消筛选
  window._todoType = (window._todoType === type) ? 'all' : type;
  refreshTodoPanel();
}

// ---- window shim ----
window.renderTodoPanel = renderTodoPanel;
window.refreshTodoPanel = refreshTodoPanel;
window.switchTodoFilter = switchTodoFilter;
window.switchTodoGroup = switchTodoGroup;
window.switchTodoType = switchTodoType;

export { renderTodoPanel, refreshTodoPanel, switchTodoFilter, switchTodoGroup, switchTodoType };
