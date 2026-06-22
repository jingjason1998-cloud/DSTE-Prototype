/**
 * Pending Actions Renderer
 * 待闭环行动抽屉：渲染列表和刷新标题。
 */

import { getMeetings } from '../data-store.js';

function renderPendingActionsList(meetingsData) {
  const getActionStatusConfig = window.getActionStatusConfig || ((status) => ({ color: 'var(--text-tertiary)', label: status }));
  const escapeHtml = window.escapeHtml || ((s) => s || '');
  const escapeJsString = window.escapeJsString || ((s) => String(s || '').replace(/'/g, "\\'").replace(/"/g, '\\"'));

  const items = (meetingsData || []).flatMap(m =>
    (m.actions || [])
      .map((a, actionIdx) => ({ ...a, meetingTitle: m.title, meetingId: m.id, meetingDate: m.date, actionIdx }))
      .filter(a => a.status === 'pending' || a.status === 'in_progress')
  );
  if (items.length === 0) {
    return '<div style="text-align: center; color: var(--text-tertiary); padding: 40px 0;">🎉 暂无待闭环行动</div>';
  }
  return items.map((a, i) => {
    const _daysLeft = a.deadline ? Math.ceil((new Date(a.deadline + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000) : null;
    let _timeTag = '';
    if (_daysLeft !== null) {
      if (_daysLeft < 0) _timeTag = `<span style="font-size: 11px; padding: 1px 6px; border-radius: 4px; background: var(--danger); color: #fff; font-weight: 500;">⚠️ 已逾期 ${Math.abs(_daysLeft)} 天</span>`;
      else if (_daysLeft === 0) _timeTag = `<span style="font-size: 11px; padding: 1px 6px; border-radius: 4px; background: var(--danger); color: #fff; font-weight: 500;">🔥 今天到期</span>`;
      else if (_daysLeft <= 3) _timeTag = `<span style="font-size: 11px; padding: 1px 6px; border-radius: 4px; background: rgba(245,34,45,0.12); color: var(--danger); font-weight: 500;">⏳ 剩余 ${_daysLeft} 天</span>`;
      else if (_daysLeft <= 7) _timeTag = `<span style="font-size: 11px; padding: 1px 6px; border-radius: 4px; background: rgba(245,158,11,0.12); color: var(--warning); font-weight: 500;">⏳ 剩余 ${_daysLeft} 天</span>`;
      else _timeTag = `<span style="font-size: 11px; padding: 1px 6px; border-radius: 4px; background: rgba(34,197,94,0.12); color: var(--success); font-weight: 500;">⏳ 剩余 ${_daysLeft} 天</span>`;
    }
    const _statusCfg = getActionStatusConfig(a.status);
    const _bgMix = `color-mix(in srgb, ${_statusCfg.color} 15%, transparent)`;
    return `
    <div data-pending-action="${i}" data-meeting-id="${a.meetingId}" data-action-idx="${a.actionIdx}" style="padding: 14px; background: var(--bg-page); border-radius: 8px; margin-bottom: 12px; border-left: 3px solid ${_statusCfg.color};">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
        <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${escapeHtml(a.meetingTitle)}</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          ${_timeTag}
          <select data-action-status="${i}" onchange="updatePendingActionStatus('${escapeJsString(a.meetingId)}', ${a.actionIdx}, this.value)" style="font-size: 11px; padding: 2px 8px; border-radius: 4px; border: 1px solid ${_statusCfg.color}; background: ${_bgMix}; color: ${_statusCfg.color}; cursor: pointer;">
            <option value="pending" ${a.status === 'pending' ? 'selected' : ''}>待办</option>
            <option value="in_progress" ${a.status === 'in_progress' ? 'selected' : ''}>进行中</option>
            <option value="completed" ${a.status === 'completed' ? 'selected' : ''}>已完成</option>
          </select>
        </div>
      </div>
      <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">${escapeHtml(a.content)}</div>
      <div style="display: flex; align-items: center; gap: 12px; font-size: 12px; color: var(--text-tertiary); margin-bottom: 8px;">
        <span>👤 ${escapeHtml(a.owner || '待定')}</span>
        <span>📅 ${a.deadline || '未设置'}</span>
      </div>
      <div id="action-note-display-${a.meetingId}-${a.actionIdx}" data-action-note="${i}" style="margin-top: 8px;">
        <div style="padding: 8px 10px; background: var(--bg-card); border-radius: 6px; font-size: 12px; color: var(--text-secondary);">${a.progressNote ? escapeHtml(a.progressNote) : '<span style="color: var(--text-tertiary);">暂无更新说明</span>'}</div>
        <div style="text-align: right; margin-top: 4px;">
          <button type="button" data-action-edit="${i}" onclick="openActionNoteEditor('${escapeJsString(a.meetingId)}', ${a.actionIdx})" style="font-size: 11px; padding: 2px 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); color: var(--text-secondary); cursor: pointer;">编辑</button>
        </div>
      </div>
      <div id="action-note-editor-${a.meetingId}-${a.actionIdx}" data-action-note-editor="${i}" style="display: none; margin-top: 8px;">
        <textarea id="action-note-input-${a.meetingId}-${a.actionIdx}" data-action-note-input="${i}" rows="2" placeholder="填写进度说明或闭环说明..." style="width: 100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-card); color: var(--text-primary); font-size: 12px; resize: vertical; box-sizing: border-box;">${escapeHtml(a.progressNote || '')}</textarea>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
          <button type="button" onclick="cancelActionNoteEdit('${escapeJsString(a.meetingId)}', ${a.actionIdx})" style="font-size: 11px; padding: 3px 10px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); color: var(--text-secondary); cursor: pointer;">取消</button>
          <button type="button" data-action-save="${i}" onclick="saveActionProgressNote('${escapeJsString(a.meetingId)}', ${a.actionIdx})" style="font-size: 11px; padding: 3px 10px; border: none; border-radius: 4px; background: var(--primary); color: #fff; cursor: pointer;">保存</button>
        </div>
      </div>
    </div>
  `;}).join('');
}

function refreshPendingActionsList() {
  const list = document.getElementById('pending-actions-list');
  const title = document.querySelector('#pending-actions-drawer h3');
  if (!list) return;
  const itemsHtml = renderPendingActionsList(getMeetings());
  list.innerHTML = itemsHtml;
  const freshItems = getMeetings().flatMap(m =>
    (m.actions || []).filter(a => a.status === 'pending' || a.status === 'in_progress')
  );
  if (title) title.textContent = '🔔 待闭环行动 (' + freshItems.length + ')';
}

// ---- window shim ----
window.renderPendingActionsList = renderPendingActionsList;
window.refreshPendingActionsList = refreshPendingActionsList;

export { renderPendingActionsList, refreshPendingActionsList };
