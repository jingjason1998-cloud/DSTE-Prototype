/**
 * Meeting Evaluation Form Renderer
 * 会议评估弹窗：渲染评分表单、更新滑块、保存评估。
 */

import { calculateAutoScore } from '../utils/scoring.js';
import { findMeetingById, persistMeetings } from '../data-store.js';

function renderEvalForm() {
  const data = window._evalFormData;
  if (!data) return;
  const getScoreColor = window.getScoreColor || (() => 'var(--text-primary)');
  const getScoreLabel = window.getScoreLabel || (() => '');
  const EVAL_DIMENSIONS = window.EVAL_DIMENSIONS || [];
  const EVAL_TAGS = window.EVAL_TAGS || [];

  const score = typeof data.overallScore === 'number' ? data.overallScore : 0;
  const overallColor = getScoreColor(score);
  const overallLabel = getScoreLabel(score);
  const autoBadge = data.auto ? '<span style="padding: 1px 6px; border-radius: 4px; font-size: 10px; background: var(--primary-light); color: var(--primary); margin-left: 6px;">AI 推荐</span>' : '';
  document.getElementById('eval-overall-display').innerHTML = `<span style="font-size: 32px; font-weight: 700; color: ${overallColor};">${score}</span><span style="font-size: 12px; color: var(--text-secondary); margin-left: 6px;">${overallLabel}</span>${autoBadge}`;
  const dimsHtml = EVAL_DIMENSIONS.map(dim => {
    const val = data.dimensions[dim.key] || 0;
    const pct = Math.round((val / dim.max) * 100);
    const color = getScoreColor(pct);
    return `
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div>
            <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${dim.label}</span>
            <span style="font-size: 11px; color: var(--text-tertiary); margin-left: 6px;">${dim.desc}</span>
          </div>
          <span style="font-size: 14px; font-weight: 700; color: ${color}; min-width: 40px; text-align: right;">${val} / ${dim.max}</span>
        </div>
        <input type="range" min="0" max="${dim.max}" value="${val}" oninput="updateEvalSlider('${dim.key}', this.value)"
          style="width: 100%; accent-color: ${color}; cursor: pointer;" />
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-tertiary); margin-top: 2px;">
          <span>0</span><span>${dim.max}</span>
        </div>
      </div>`;
  }).join('');
  const sub = data.subScores || {};
  const hasSubScores = Object.keys(sub).length > 0;
  const subScoresHtml = hasSubScores ? `
    <div style="margin-top: 4px; padding: 10px 12px; background: var(--bg-page); border-radius: 6px; margin-bottom: 14px;">
      <div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 8px;">子项得分（自动计算，仅供参考）</div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 12px; font-size: 11px; color: var(--text-secondary);">
        <div>材料完整：<span style="color: var(--text-primary); font-weight: 500;">${sub.materialCompleteness ?? 0}</span>/7</div>
        <div>议程覆盖：<span style="color: var(--text-primary); font-weight: 500;">${sub.agendaCoverage ?? 0}</span>/10.5</div>
        <div>材料评分：<span style="color: var(--text-primary); font-weight: 500;">${sub.materialReviewScore ?? 0}</span>/17.5</div>
        <div>有效讨论：<span style="color: var(--text-primary); font-weight: 500;">${sub.effectiveDiscussion ?? 0}</span>/12</div>
        <div>参与度：<span style="color: var(--text-primary); font-weight: 500;">${sub.participation ?? 0}</span>/12</div>
        <div>时间控制：<span style="color: var(--text-primary); font-weight: 500;">${sub.timeControl ?? 0}</span>/6</div>
        <div>决议&待办：<span style="color: var(--text-primary); font-weight: 500;">${sub.resolutionAndAction ?? 0}</span>/30</div>
        <div>评分及时性：<span style="color: var(--text-primary); font-weight: 500;">${sub.timeliness ?? 0}</span>/5</div>
      </div>
      ${(data.postponementDeduction || 0) < 0 ? `<div style="margin-top: 6px; color: var(--danger); font-size: 11px;">议程顺延扣分：${data.postponementDeduction} 分</div>` : ''}
    </div>
  ` : '';
  document.getElementById('eval-dimensions').innerHTML = dimsHtml + subScoresHtml;
  const tagsHtml = EVAL_TAGS.map(tag => {
    const active = data.feedback.includes(tag);
    return `<button type="button" onclick="toggleEvalTag('${tag}')"
      style="padding: 4px 10px; border-radius: 12px; font-size: 12px; cursor: pointer; border: 1px solid ${active ? 'var(--primary)' : 'var(--border-light)'}; background: ${active ? 'var(--primary-light)' : 'var(--bg-page)'}; color: ${active ? 'var(--primary)' : 'var(--text-secondary)'}; transition: all 0.15s;">${tag}</button>`;
  }).join('');
  document.getElementById('eval-tags').innerHTML = tagsHtml;
  document.getElementById('eval-comment').value = data.comment || '';
}

function updateEvalSlider(dim, val) {
  if (!window._evalFormData) return;
  window._evalFormData.dimensions[dim] = parseInt(val);
  const dims = window._evalFormData.dimensions;
  const deduction = window._evalFormData.postponementDeduction || 0;
  window._evalFormData.overallScore = Math.max(0, Math.min(100, Math.round((dims.before || 0) + (dims.during || 0) + (dims.after || 0) + deduction)));
  window._evalFormData.auto = false;
  renderEvalForm();
}

function toggleEvalTag(tag) {
  if (!window._evalFormData) return;
  const fb = window._evalFormData.feedback;
  const idx = fb.indexOf(tag);
  if (idx > -1) fb.splice(idx, 1); else fb.push(tag);
  window._evalFormData.auto = false;
  renderEvalForm();
}

function saveMeetingEvaluation() {
  if (!window._evalMeetingId || !window._evalFormData) return;
  const m = findMeetingById(window._evalMeetingId);
  if (!m) return;
  const data = window._evalFormData;
  const getReviewScores = window.getReviewScores || (() => ({}));
  const autoNow = calculateAutoScore(m, new Date().toISOString(), getReviewScores());
  m.effectiveness = {
    overallScore: data.overallScore,
    dimensions: { ...data.dimensions },
    subScores: { ...autoNow.subScores },
    feedback: data.feedback.slice(),
    comment: (document.getElementById('eval-comment')?.value || '').trim(),
    auto: false,
    evaluatedAt: new Date().toISOString()
  };
  const orig = findMeetingById(window._evalMeetingId);
  if (orig) orig.effectiveness = JSON.parse(JSON.stringify(m.effectiveness));
  persistMeetings();
  if (typeof window.closeMeetingEvalModal === 'function') window.closeMeetingEvalModal();
  if (window._currentDetailMeetingId === window._evalMeetingId && typeof window.renderMeetingDetail === 'function') {
    window.renderMeetingDetail(m);
  }
  showToast('评估已保存', 'success');
}

// ---- window shim ----
window.renderEvalForm = renderEvalForm;
window.updateEvalSlider = updateEvalSlider;
window.toggleEvalTag = toggleEvalTag;
window.saveMeetingEvaluation = saveMeetingEvaluation;

export { renderEvalForm, updateEvalSlider, toggleEvalTag, saveMeetingEvaluation };
