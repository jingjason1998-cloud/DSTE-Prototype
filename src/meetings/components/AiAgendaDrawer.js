/**
 * AI 议程推荐面板组件
 * 以左右并列方式嵌入会议编辑器，支持输入主题、生成候选、勾选采纳。
 *
 * 依赖全局：
 * - window._meetingEditData
 * - window.renderAgendaList
 * - window.showToast
 */

import {
  recommendAgenda,
  candidateToAgendaItem,
  getAgendaTypeLabel,
  getSourceTypeLabel,
} from '../utils/agenda-recommender.js';
import { icon } from '../../../assets/js/icons.js';
import { escapeHtml } from '../../lib/utils.js';

let _candidates = [];
let _selectedIds = new Set();
let _isLoading = false;
let _theme = '';
let _error = '';

function getSafeShowToast() {
  return typeof window !== 'undefined' && typeof window.showToast === 'function'
    ? window.showToast
    : (msg, type = 'info') => console.log(`[toast:${type}]`, msg);
}

function getMeetingEditData() {
  if (typeof window !== 'undefined' && window._meetingEditData) {
    return window._meetingEditData;
  }
  // 从会议详情页打开 AI 助手时，允许基于当前查看的会议生成推荐
  const detailId = typeof window !== 'undefined' ? window._currentDetailMeetingId : null;
  if (detailId && typeof window !== 'undefined' && typeof window.findMeetingById === 'function') {
    const m = window.findMeetingById(detailId);
    if (m) return JSON.parse(JSON.stringify(m));
  }
  return null;
}

function getRenderAgendaList() {
  return typeof window !== 'undefined' && typeof window.renderAgendaList === 'function'
    ? window.renderAgendaList
    : null;
}

function initAiAgendaState() {
  const meeting = getMeetingEditData();
  _theme = meeting?.theme || '';
  _candidates = [];
  _selectedIds.clear();
  _error = '';
  _isLoading = false;
}

function setAiAgendaTheme(value) {
  _theme = (value || '').trim();
}

function updateThemeFromInput() {
  const input = document.getElementById('ai-agenda-theme-input');
  if (input) _theme = (input.value || '').trim();
}

async function generateAiAgendaCandidates() {
  updateThemeFromInput();
  const meeting = getMeetingEditData();
  if (!meeting) {
    getSafeShowToast()('编辑数据丢失，请重新打开编辑器', 'error');
    return;
  }

  _isLoading = true;
  _error = '';
  _candidates = [];
  _selectedIds.clear();
  renderAiAgendaPanel();

  const result = await recommendAgenda(meeting, { theme: _theme });

  _isLoading = false;
  if (!result.success) {
    _error = result.error || '推荐失败，请稍后重试';
    renderAiAgendaPanel();
    return;
  }

  _candidates = Array.isArray(result.candidates) ? result.candidates : [];
  // 自动预选高置信度候选（>= 0.85）
  _candidates.forEach(c => {
    if ((c.confidence || 0) >= 0.85) _selectedIds.add(c.id);
  });
  renderAiAgendaPanel();
}

function toggleCandidateSelection(id) {
  if (_selectedIds.has(id)) {
    _selectedIds.delete(id);
  } else {
    _selectedIds.add(id);
  }
  updateFooterCount();
}

function selectAllCandidates() {
  if (_selectedIds.size === _candidates.length && _candidates.length > 0) {
    _selectedIds.clear();
  } else {
    _candidates.forEach(c => _selectedIds.add(c.id));
  }
  renderAiAgendaPanel();
}

function isEditorOpen() {
  const overlay = document.getElementById('meeting-editor-overlay');
  if (overlay && overlay.style.display !== 'none') return true;
  // 页面编辑器模式通过 hash 判断
  if (typeof window !== 'undefined' && window.location && window.location.hash === '#exe/meetings/edit') return true;
  // 会议列表内联编辑器模式（data-edit-meeting 触发的全页编辑）
  if (typeof window !== 'undefined' && window._meetingEditData && document.getElementById('edit-meeting-id')) return true;
  return false;
}

function applySelectedCandidates() {
  const meeting = getMeetingEditData();
  if (!meeting) {
    getSafeShowToast()('编辑数据丢失，请重新打开编辑器', 'error');
    return;
  }
  if (_selectedIds.size === 0) {
    getSafeShowToast()('请至少选择一个候选议题', 'warning');
    return;
  }

  const selected = _candidates.filter(c => _selectedIds.has(c.id));
  const newItems = selected.map(candidateToAgendaItem);
  const added = newItems.length;

  // 清空已采纳的候选，避免重复添加
  _candidates = _candidates.filter(c => !_selectedIds.has(c.id));
  _selectedIds.clear();

  if (isEditorOpen()) {
    if (!meeting.agenda_items) meeting.agenda_items = [];
    for (const item of newItems) meeting.agenda_items.push(item);
    const renderFn = getRenderAgendaList();
    if (renderFn) renderFn();
    getSafeShowToast()(`已采纳 ${added} 个议程项`, 'success');
  } else {
    // 在会议详情页中采纳时，暂存并自动打开编辑器
    if (!window._pendingAgendaAdoptions) window._pendingAgendaAdoptions = new Map();
    const existing = window._pendingAgendaAdoptions.get(meeting.id) || [];
    window._pendingAgendaAdoptions.set(meeting.id, existing.concat(newItems));
    getSafeShowToast()(`已暂存 ${added} 个议程项，正在打开编辑器...`, 'info');
    if (typeof window.openMeetingEditor === 'function') {
      window.openMeetingEditor(meeting.id);
    } else {
      getSafeShowToast()('无法自动打开编辑器，请手动点击编辑按钮', 'warning');
    }
  }
  renderAiAgendaPanel();
}

function flushPendingAgendaAdoptions(meeting) {
  if (!meeting || !window._pendingAgendaAdoptions) return;
  const pending = window._pendingAgendaAdoptions.get(meeting.id);
  if (!pending || pending.length === 0) return;
  if (!meeting.agenda_items) meeting.agenda_items = [];
  for (const item of pending) {
    meeting.agenda_items.push(item);
  }
  window._pendingAgendaAdoptions.delete(meeting.id);
  getSafeShowToast()(`已自动应用 ${pending.length} 个暂存议程项`, 'success');
}

function getActiveAiAgendaPanel() {
  // 同时支持覆盖编辑器和页面编辑器：找到当前可见的 panel
  const panels = document.querySelectorAll('.ai-agenda-panel');
  if (panels.length === 0) return null;
  for (const panel of panels) {
    // 检查 panel 本身或祖先编辑器是否可见
    let el = panel;
    let visible = true;
    while (el && el !== document.body) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') {
        visible = false;
        break;
      }
      el = el.parentElement;
    }
    if (visible) return panel;
  }
  // 都不可见时返回第一个（兜底）
  return panels[0];
}

function renderAiAgendaContent() {
  const meeting = getMeetingEditData();
  const meetingTitle = meeting ? escapeHtml(meeting.title || '当前会议') : '当前会议';

  return `
    <div id="ai-agenda-panel-header" style="padding: 14px 16px; border-bottom: 1px solid var(--border-color); background: var(--bg-page); flex-shrink: 0;">
      <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${icon('robot', {size: 14})} AI 推荐议程</div>
      <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 2px;">候选挑选，人工确认后采纳</div>
    </div>
    <div id="ai-agenda-panel-body" style="padding: 14px 16px; flex: 1; overflow-y: auto; min-height: 0;">
      ${renderPanelBody(meetingTitle)}
    </div>
    <div id="ai-agenda-panel-footer" style="padding: 12px 16px; border-top: 1px solid var(--border-color); background: var(--bg-page); display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-shrink: 0;">
      ${renderPanelFooter()}
    </div>
  `;
}

function renderAiAgendaPanel() {
  // 优先渲染到传统并列 panel；若不存在则渲染到会议 AI 助手抽屉
  const panel = getActiveAiAgendaPanel();
  if (panel) {
    panel.innerHTML = renderAiAgendaContent();
    return;
  }
  renderAiAgendaInto('meeting-ai-agenda-content');
}

function renderAiAgendaInto(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = renderAiAgendaContent();
}

function renderPanelBody(meetingTitle) {
  let html = `
    <div style="margin-bottom: 12px;">
      <label style="display: block; font-size: 11px; color: var(--text-tertiary); margin-bottom: 5px;">本次会议主题 / 聚焦领域（可选）</label>
      <input type="text" id="ai-agenda-theme-input" value="${escapeHtml(_theme)}" placeholder="例如：降本增效、华东区回款、Q2 复盘"
        style="width: 100%; padding: 7px 9px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 12px; background: var(--bg-page); color: var(--text-primary); box-sizing: border-box;"
        oninput="setAiAgendaTheme(this.value)" />
    </div>
    <div style="margin-bottom: 14px;">
      <button type="button" onclick="generateAiAgendaCandidates()" ${ _isLoading ? 'disabled' : '' }
        style="width: 100%; padding: 7px 10px; font-size: 12px; border: none; border-radius: 6px; background: var(--primary); color: #fff; cursor: pointer; font-weight: 500; opacity: ${ _isLoading ? '0.7' : '1' };">
        ${_isLoading ? `${icon('hourglass', {size: 14})} AI 分析中...` : `${icon('robot', {size: 14})} 生成候选议程`}
      </button>
    </div>
    ${_isLoading ? renderLoading() : ''}
    ${_error ? renderError(_error) : ''}
    ${!_isLoading && _candidates.length === 0 && !_error ? renderEmptyState(meetingTitle) : ''}
    ${!_isLoading && _candidates.length > 0 ? renderCandidatesList() : ''}
  `;
  return html;
}

function renderPanelFooter() {
  const allSelected = _candidates.length > 0 && _selectedIds.size === _candidates.length;
  return `
    <button type="button" onclick="selectAllCandidates()" ${ _candidates.length === 0 ? 'disabled' : '' }
      style="padding: 6px 12px; font-size: 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-card); color: var(--text-secondary); cursor: pointer; opacity: ${ _candidates.length === 0 ? '0.6' : '1' };">
      ${allSelected ? '取消全选' : '全选'}
    </button>
    <button type="button" onclick="applySelectedCandidates()" ${ _selectedIds.size === 0 ? 'disabled' : '' }
      style="padding: 6px 12px; font-size: 12px; border: none; border-radius: 6px; background: var(--primary); color: #fff; cursor: pointer; font-weight: 500; opacity: ${ _selectedIds.size === 0 ? '0.6' : '1' };">
      采纳选中 (${_selectedIds.size})
    </button>
  `;
}

function renderLoading() {
  return `
    <div style="text-align: center; padding: 30px 0;">
      <span class="dste-ai-thinking">AI 正在分析会议上下文...</span>
      <div style="margin-top: 10px;"><span class="dste-ai-dots"><span></span><span></span><span></span></span></div>
    </div>
  `;
}

function renderError(message) {
  return `
    <div style="padding: 12px; background: rgba(245,34,45,0.06); border: 1px solid rgba(245,34,45,0.2); border-radius: 8px; color: var(--danger); font-size: 12px; margin-bottom: 10px;">
      <div>${icon('x', {size: 14})} ${escapeHtml(message)}</div>
      <button type="button" onclick="generateAiAgendaCandidates()" style="margin-top: 8px; padding: 4px 10px; font-size: 11px; border: 1px solid var(--danger); border-radius: 4px; background: transparent; color: var(--danger); cursor: pointer;">重试</button>
    </div>
  `;
}

function renderEmptyState(meetingTitle) {
  return `
    <div style="text-align: center; padding: 30px 0; color: var(--text-tertiary);">
      <div style="font-size: 28px; margin-bottom: 6px;">${icon('fileText', {size: 14})}</div>
      <div style="font-size: 12px;">点击上方按钮，为「${escapeHtml(meetingTitle)}」生成候选议程。</div>
    </div>
  `;
}

function renderCandidatesList() {
  return `
    <div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 8px;">
      共 ${_candidates.length} 个候选，已选 ${_selectedIds.size} 个
    </div>
    <div id="ai-agenda-candidates-list" style="max-height: 420px; overflow-y: auto;">
      ${_candidates.map(c => renderCandidateCard(c)).join('')}
    </div>
  `;
}

function renderCandidateCard(candidate) {
  const id = escapeHtml(candidate.id);
  const title = escapeHtml(candidate.title);
  const typeLabel = escapeHtml(getAgendaTypeLabel(candidate.type));
  const sourceLabel = escapeHtml(getSourceTypeLabel(candidate.sourceType));
  const owner = escapeHtml(candidate.owner || '待定');
  const reason = escapeHtml(candidate.reason || '');
  const duration = Number(candidate.duration) || 20;
  const checked = _selectedIds.has(candidate.id) ? 'checked' : '';
  const confidence = Math.round((Number(candidate.confidence) || 0) * 100);

  return `
    <div class="ai-agenda-candidate" style="border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; margin-bottom: 8px; background: var(--bg-page);">
      <div style="display: flex; align-items: flex-start; gap: 8px;">
        <input type="checkbox" id="ai-cb-${id}" data-candidate-id="${id}" ${checked} onchange="toggleCandidateSelection('${id}')" style="margin-top: 2px; cursor: pointer;">
        <div style="flex: 1; min-width: 0;">
          <label for="ai-cb-${id}" style="display: block; font-weight: 600; font-size: 12px; color: var(--text-primary); cursor: pointer; margin-bottom: 3px;">${title}</label>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; font-size: 10px; color: var(--text-secondary); margin-bottom: 4px;">
            <span style="padding: 1px 5px; border-radius: 3px; background: var(--primary-light); color: var(--primary);">${typeLabel}</span>
            <span style="padding: 1px 5px; border-radius: 3px; background: var(--bg-card); border: 1px solid var(--border-light);">${icon('timer', {size: 12})} ${duration} 分钟</span>
            <span style="padding: 1px 5px; border-radius: 3px; background: var(--bg-card); border: 1px solid var(--border-light);">${icon('userPlain', {size: 14})} ${owner}</span>
            <span style="padding: 1px 5px; border-radius: 3px; background: rgba(34,197,94,0.08); color: var(--success);">置信度 ${confidence}%</span>
          </div>
          ${reason ? `<div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 3px;">${icon('lightbulb', {size: 14})} ${reason}</div>` : ''}
          <div style="font-size: 10px; color: var(--text-tertiary);">来源：${sourceLabel}</div>
        </div>
      </div>
    </div>
  `;
}

function updateFooterCount() {
  const footer = document.getElementById('ai-agenda-panel-footer');
  if (footer) footer.innerHTML = renderPanelFooter();
}

// ---- 抽屉兼容（保留但默认不使用）----
function openAiAgendaDrawer() {
  initAiAgendaState();
  renderAiAgendaPanel();
}

function closeAiAgendaDrawer() {
  // 并列模式下无需关闭
}

function refreshAiAgendaState() {
  initAiAgendaState();
  renderAiAgendaPanel();
}

// ---- window shim ----
window.setAiAgendaTheme = setAiAgendaTheme;
window.generateAiAgendaCandidates = generateAiAgendaCandidates;
window.toggleCandidateSelection = toggleCandidateSelection;
window.selectAllCandidates = selectAllCandidates;
window.applySelectedCandidates = applySelectedCandidates;
window.renderAiAgendaPanel = renderAiAgendaPanel;
window.renderAiAgendaInto = renderAiAgendaInto;
window.flushPendingAgendaAdoptions = flushPendingAgendaAdoptions;
window.openAiAgendaDrawer = openAiAgendaDrawer;
window.closeAiAgendaDrawer = closeAiAgendaDrawer;
window.refreshAiAgendaState = refreshAiAgendaState;

export {
  setAiAgendaTheme,
  generateAiAgendaCandidates,
  toggleCandidateSelection,
  selectAllCandidates,
  applySelectedCandidates,
  renderAiAgendaPanel,
  renderAiAgendaInto,
  flushPendingAgendaAdoptions,
  openAiAgendaDrawer,
  closeAiAgendaDrawer,
};
