/**
 * Decisions Drawer Component
 * 决议中心抽屉：打开/关闭、过滤、搜索、状态流转。
 *
 * 渲染逻辑复用 src/meetings/utils/resolution-helpers.js 中的纯函数。
 * 所有对外函数均保留 window shim，以兼容现有 onclick 调用。
 */

import { getMeetings, persistMeetings } from '../data-store.js';
import {
  normalizeResolution,
  computeResolutionProgress,
  syncResolutionsToStore,
  advanceResolutionStatus,
  renderResolutionsList,
} from '../utils/resolution-helpers.js';

let _decisionsFilter = 'all';
let _decisionsSearch = '';
let _decisionsMonth = '';

function openDecisionsDrawer() {
  const overlay = document.getElementById('decisions-overlay');
  const drawer = document.getElementById('decisions-drawer');
  if (overlay) overlay.style.display = 'block';
  if (drawer) drawer.style.display = 'flex';
  _decisionsFilter = 'all';
  _decisionsSearch = '';
  _decisionsMonth = '';
  renderDecisionsList();
}

function closeDecisionsDrawer() {
  const overlay = document.getElementById('decisions-overlay');
  const drawer = document.getElementById('decisions-drawer');
  if (overlay) overlay.style.display = 'none';
  if (drawer) drawer.style.display = 'none';
}

function filterDecisions(status) {
  _decisionsFilter = status;
  renderDecisionsList();
}

function searchDecisions(keyword) {
  _decisionsSearch = (keyword || '').trim().toLowerCase();
  renderDecisionsList();
}

function filterDecisionsByMonth(month) {
  _decisionsMonth = month || '';
  renderDecisionsList();
}

function renderDecisionsList() {
  const container = document.getElementById('decisions-list');
  if (!container) return;
  container.innerHTML = renderResolutionsList(getMeetings(), _decisionsFilter, _decisionsSearch, _decisionsMonth);
}

function advanceResolution(id) {
  const select = document.getElementById('res-status-' + id);
  if (!select) return;
  const newStatus = select.value;
  const meetings = getMeetings();
  let target = null;
  let meeting = null;
  for (const m of meetings) {
    const d = (m.decisions || []).find(x => x.id === id);
    if (d) { target = d; meeting = m; break; }
  }
  if (!target) { showToast('决议不存在', 'error'); return; }
  const result = advanceResolutionStatus(target, newStatus);
  if (!result.success) { showToast(result.error || '流转失败', 'error'); return; }
  if (meeting) {
    persistMeetings();
    syncResolutionsToStore(meetings);
  }
  showToast('状态已更新', 'success');
  renderDecisionsList();
}

function gotoSourceMeeting(id) {
  if (!id) return;
  closeDecisionsDrawer();
  if (typeof window.openMeetingDetail === 'function') {
    window.openMeetingDetail(id);
  }
}

// ---- window shim ----
window._decisionsFilter = _decisionsFilter;
window._decisionsSearch = _decisionsSearch;
window._decisionsMonth = _decisionsMonth;
window.openDecisionsDrawer = openDecisionsDrawer;
window.closeDecisionsDrawer = closeDecisionsDrawer;
window.filterDecisions = filterDecisions;
window.filterDecisionsByMonth = filterDecisionsByMonth;
window.searchDecisions = searchDecisions;
window.advanceResolution = advanceResolution;
window.gotoSourceMeeting = gotoSourceMeeting;

export {
  openDecisionsDrawer,
  closeDecisionsDrawer,
  filterDecisions,
  filterDecisionsByMonth,
  searchDecisions,
  renderDecisionsList,
  advanceResolution,
  gotoSourceMeeting,
};
