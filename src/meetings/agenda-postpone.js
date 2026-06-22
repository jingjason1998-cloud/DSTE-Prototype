/**
 * Agenda Postpone Module
 * 管理议程顺延：选择目标会议、确认顺延、状态维护。
 *
 * 所有对外函数均保留 window shim，以兼容现有 onclick 调用。
 */

import { getMeetings, findMeetingById, persistMeetings } from './data-store.js';

// 模块内部状态
let _postponeState = { meetingId: null, agendaIndex: null, selectedTargetId: null };

function openPostponeTargetSelector(meetingId, agendaIndex) {
  const m = findMeetingById(meetingId);
  if (!m) return;
  const agenda = m.agenda_items?.[agendaIndex];
  if (!agenda) return;
  _postponeState = { meetingId, agendaIndex, selectedTargetId: null };
  renderPostponeTargetList();
  const ov = document.getElementById('postpone-target-overlay');
  if (ov) ov.style.display = 'flex';
}

function closePostponeTargetSelector() {
  const ov = document.getElementById('postpone-target-overlay');
  if (ov) ov.style.display = 'none';
  _postponeState = { meetingId: null, agendaIndex: null, selectedTargetId: null };
}

function selectPostponeTarget(targetId) {
  _postponeState.selectedTargetId = targetId;
  renderPostponeTargetList();
  const btn = document.getElementById('postpone-target-confirm-btn');
  if (btn) btn.disabled = !targetId;
}

function renderPostponeTargetList() {
  const container = document.getElementById('postpone-target-list');
  if (!container) return;
  const { meetingId } = _postponeState;
  const list = getMeetings().filter(x => x.id !== meetingId).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  if (list.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px; font-size: 13px;">系统中没有其他会议可顺延</div>';
    return;
  }
  const selectedId = _postponeState.selectedTargetId;
  const SCENARIO_CONFIG = window.SCENARIO_CONFIG || {};
  container.innerHTML = list.map(t => {
    const isSelected = t.id === selectedId;
    return `
      <div onclick="selectPostponeTarget('${t.id}')" style="padding: 10px 12px; border-radius: 8px; border: 1px solid ${isSelected ? 'var(--warning)' : 'var(--border-light)'}; background: ${isSelected ? 'rgba(245,158,11,0.08)' : 'var(--bg-page)'}; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.15s;">
        <div>
          <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${t.title || '未命名会议'}</div>
          <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 2px;">${t.date || '日期待定'} · ${SCENARIO_CONFIG[t.scenario]?.label || t.scenario || '未分类'}</div>
        </div>
        ${isSelected ? '<span style="font-size: 12px; color: var(--warning); font-weight: 600;">✓</span>' : ''}
      </div>
    `;
  }).join('');
}

function confirmPostponeAgenda() {
  const { meetingId, agendaIndex, selectedTargetId } = _postponeState;
  if (!meetingId || selectedTargetId == null) return;
  postponeAgendaToMeeting(meetingId, agendaIndex, selectedTargetId);
  closePostponeTargetSelector();
}

function postponeAgendaToMeeting(currentMeetingId, agendaIndex, targetMeetingId) {
  const allMeetings = getMeetings();
  const current = allMeetings.find(x => x.id === currentMeetingId);
  const target = allMeetings.find(x => x.id === targetMeetingId);
  if (!current || !target) { showToast('会议不存在', 'error'); return; }
  const agenda = current.agenda_items?.[agendaIndex];
  if (!agenda) { showToast('议程不存在', 'error'); return; }
  if (agenda.status === 'postponed') { showToast('该议程已顺延', 'warning'); return; }

  const now = new Date().toISOString();
  const originalAgendaId = agenda.originalAgendaId || agenda.id;
  const postponedCount = (agenda.postponedCount || 0) + 1;

  // 复制到目标会议
  const newAgendaId = 'ag_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  const carriedAgenda = {
    ...JSON.parse(JSON.stringify(agenda)),
    id: newAgendaId,
    status: 'planned',
    originalAgendaId,
    postponedCount,
    carriedFromAgendaId: agenda.id,
    carriedFromMeetingId: currentMeetingId,
    postponedHistory: [...(agenda.postponedHistory || []), { meetingId: currentMeetingId, agendaId: agenda.id, date: now }]
  };
  if (!Array.isArray(target.agenda_items)) target.agenda_items = [];
  target.agenda_items.push(carriedAgenda);

  // 标记当前议程为已顺延
  agenda.status = 'postponed';
  if (!Array.isArray(agenda.postponedHistory)) agenda.postponedHistory = [];
  agenda.postponedHistory.push({ meetingId: targetMeetingId, agendaId: newAgendaId, date: now });

  // 持久化
  persistMeetings();

  showToast('议程已顺延到 ' + (target.title || '目标会议'), 'success');

  // 刷新相关视图
  if (window._currentDetailMeetingId === currentMeetingId) {
    window.openMeetingDetail(currentMeetingId);
  }
  if (window._currentDetailMeetingId === targetMeetingId) {
    window.openMeetingDetail(targetMeetingId);
  }
  if (window._meetingEditData?.id === targetMeetingId) {
    window.openMeetingEditor(targetMeetingId);
  }
  if (window._meetingEditData?.id === currentMeetingId) {
    const refreshed = findMeetingById(currentMeetingId);
    if (refreshed) {
      window._meetingEditData = JSON.parse(JSON.stringify(refreshed));
      if (typeof window.renderEditorForm === 'function') window.renderEditorForm();
    }
  }
}

// ---- window shim ----
window._postponeState = _postponeState;
window.openPostponeTargetSelector = openPostponeTargetSelector;
window.closePostponeTargetSelector = closePostponeTargetSelector;
window.selectPostponeTarget = selectPostponeTarget;
window.confirmPostponeAgenda = confirmPostponeAgenda;

export {
  openPostponeTargetSelector,
  closePostponeTargetSelector,
  selectPostponeTarget,
  confirmPostponeAgenda,
  renderPostponeTargetList,
  postponeAgendaToMeeting,
};
