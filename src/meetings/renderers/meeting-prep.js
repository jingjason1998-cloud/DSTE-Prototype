/**
 * Meeting Preparation Renderer
 * 会前准备浮层：打开/关闭、渲染检查清单、标记会前评审完成。
 */

import { computeMeetingReadiness } from '../utils/helpers.js';
import { findMeetingById, persistMeetings } from '../data-store.js';

function openMeetingPreparation(meetingId) {
  const m = findMeetingById(meetingId);
  if (!m) return;
  window._prepMeetingId = meetingId;
  renderMeetingPreparation(m);
  const ov = document.getElementById('meeting-preparation-overlay');
  if (ov) ov.style.display = 'flex';
}

function closeMeetingPreparation() {
  const ov = document.getElementById('meeting-preparation-overlay');
  if (ov) ov.style.display = 'none';
  window._prepMeetingId = null;
}

function renderMeetingPreparation(m) {
  const content = document.getElementById('meeting-preparation-content');
  const header = document.getElementById('meeting-preparation-header-title');
  const markBtn = document.getElementById('preparation-mark-done-btn');
  if (!content) return;
  if (header) header.textContent = `📋 会前准备 · ${m.title || '未命名会议'}`;

  const readiness = computeMeetingReadiness(m);
  const statusColor = readiness.status === 'ready' ? 'var(--success)' : readiness.status === 'in_progress' ? 'var(--warning)' : 'var(--danger)';
  const statusLabel = readiness.status === 'ready' ? '已就绪' : readiness.status === 'in_progress' ? '准备中' : '未开始';

  const checkRows = readiness.checks.map(c => {
    const icon = c.passed ? '✅' : c.optional ? '⏸️' : '❌';
    const color = c.passed ? 'var(--success)' : c.optional ? 'var(--text-tertiary)' : 'var(--danger)';
    const badge = c.passed
      ? '<span class="status-badge status-success">已通过</span>'
      : c.optional
        ? '<span class="status-badge status-default">待实现</span>'
        : '<span class="status-badge status-danger">待完成</span>';
    return `
      <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-light);">
        <span style="font-size: 16px; width: 24px; text-align: center;">${icon}</span>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${c.label}</span>
            ${badge}
          </div>
          <div style="font-size: 11px; color: ${color}; margin-top: 2px;">${c.detail}</div>
        </div>
        ${!c.passed && !c.optional ? `<button type="button" onclick="openEditMeeting('${m.id}')" style="padding: 3px 10px; font-size: 11px; border: 1px solid var(--primary); border-radius: 4px; background: var(--primary-light); color: var(--primary); cursor: pointer; white-space: nowrap;">去编辑</button>` : ''}
      </div>
    `;
  }).join('');

  content.innerHTML = `
    <div style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
        <div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">准备度</div>
          <div style="display: flex; align-items: baseline; gap: 8px;">
            <span style="font-size: 36px; font-weight: 700; color: ${statusColor};">${readiness.percentage}%</span>
            <span style="font-size: 13px; font-weight: 500; color: ${statusColor};">${statusLabel}</span>
          </div>
        </div>
        <div style="font-size: 12px; color: var(--text-secondary);">${readiness.passedCount}/${readiness.totalCount} 项已完成</div>
      </div>
      <div style="width: 100%; height: 6px; background: var(--bg-page); border-radius: 3px; overflow: hidden;">
        <div style="width: ${readiness.percentage}%; height: 100%; background: ${statusColor}; border-radius: 3px; transition: width 0.3s ease;"></div>
      </div>
    </div>
    <div style="background: var(--bg-page); border-radius: 8px; padding: 0 12px; margin-bottom: 16px;">
      ${checkRows || '<div style="padding: 16px; text-align: center; color: var(--text-secondary); font-size: 13px;">暂无检查项</div>'}
    </div>
    <div style="display: flex; align-items: center; gap: 8px; padding: 12px; background: var(--primary-light); border-radius: 8px; font-size: 12px; color: var(--primary);">
      <span>💡</span>
      <span>所有检查项通过后，可一键标记「会前评审完成」。未达到 100% 时标记将弹出确认提示。</span>
    </div>
  `;

  if (markBtn) {
    markBtn.textContent = m.pipeline?.preReviewDone ? '取消会前评审完成' : '标记会前评审完成';
    markBtn.style.borderColor = readiness.allPassed ? 'var(--success)' : 'var(--warning)';
    markBtn.style.background = readiness.allPassed ? 'rgba(34,197,94,0.08)' : 'rgba(250,173,20,0.08)';
    markBtn.style.color = readiness.allPassed ? 'var(--success)' : 'var(--warning)';
  }
}

function togglePipelineStepFromPreparation() {
  const meetingId = window._prepMeetingId;
  if (!meetingId) return;
  const m = findMeetingById(meetingId);
  if (!m) return;
  const readiness = computeMeetingReadiness(m);
  if (!m.pipeline) m.pipeline = {};
  const currentDone = !!m.pipeline.preReviewDone;
  if (!currentDone && !readiness.allPassed) {
    const unpassed = readiness.checks.filter(c => !c.optional && !c.passed).map(c => `· ${c.label}: ${c.detail}`).join('\n');
    if (!confirm(`准备度尚未达到 100%，以下检查项未完成：\n${unpassed}\n\n仍要标记会前评审完成吗？`)) return;
  }
  m.pipeline.preReviewDone = !currentDone;
  const orig = findMeetingById(meetingId);
  if (orig && orig.pipeline) orig.pipeline.preReviewDone = m.pipeline.preReviewDone;
  persistMeetings();
  renderMeetingPreparation(m);
  const pageContent = document.getElementById('page-content');
  if (pageContent && typeof window.renderMeetings === 'function') {
    pageContent.innerHTML = window.renderMeetings();
    if (typeof window.bindPageEvents === 'function') window.bindPageEvents(pageContent);
  }
  if (window._currentDetailMeetingId === meetingId && typeof window.renderMeetingDetail === 'function') {
    window.renderMeetingDetail(m);
  }
  showToast(m.pipeline.preReviewDone ? '已标记会前评审完成' : '已取消会前评审完成', 'success');
}

// ---- window shim ----
window.openMeetingPreparation = openMeetingPreparation;
window.closeMeetingPreparation = closeMeetingPreparation;
window.togglePipelineStepFromPreparation = togglePipelineStepFromPreparation;

export { openMeetingPreparation, closeMeetingPreparation, renderMeetingPreparation, togglePipelineStepFromPreparation };
