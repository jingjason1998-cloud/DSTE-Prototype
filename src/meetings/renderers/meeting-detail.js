/**
 * Meeting Detail Renderer
 * 会议详情浮层渲染。
 */

import { getScoreColor, getScoreLabel } from '../utils/scoring.js';
import {
  computeMeetingReadiness,
  getMaterialScore,
  getAgendaStatusBadge,
  computeAgendaCompletion,
  formatAgendaSourceHint,
  getAgendaPostponeWarning,
} from '../utils/helpers.js';

const SCENARIO_CONFIG = () => window.SCENARIO_CONFIG || {};
const STATUS_CONFIG = () => window.STATUS_CONFIG || {};
const PIPELINE_STEPS = () => window.PIPELINE_STEPS || [];
const AGENDA_TYPE_COLORS = () => window.AGENDA_TYPE_COLORS || {};
const AGENDA_TYPE_LABELS = () => window.AGENDA_TYPE_LABELS || {};
const meetings = () => window.meetings || [];
const escapeHtml = (s) => (window.escapeHtml ? window.escapeHtml(s) : String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'));

function renderDetailHeader(m, sc, st) {
  return `
    <span style="font-size: 18px; font-weight: 700; color: var(--text-primary);">${m.title}</span>
    <span style="padding: 1px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; background: ${sc.color || 'var(--text-tertiary)'}18; color: ${sc.color || 'var(--text-tertiary)'};">${sc.icon || '📋'} ${sc.label || m.scenario}</span>
    <span class="status-badge ${st.badgeClass}">${st.label}</span>
  `;
}

function renderPipelineSummary(m) {
  if (!m.pipeline) return '';
  const steps = PIPELINE_STEPS();
  const done = steps.filter((s) => m.pipeline[s.key]).length;
  return `<div style="display: flex; align-items: center; gap: 6px; padding: 8px 0; border-bottom: 1px dashed var(--border-light);">
    <span style="font-size: 12px; color: var(--text-secondary); min-width: 48px; flex-shrink: 0;">📊 流程</span>
    <div style="display: flex; align-items: center; gap: 6px; flex: 1;">
      <div style="flex: 1; height: 4px; background: var(--border-light); border-radius: 2px; overflow: hidden;">
        <div style="width: ${Math.round((done / steps.length) * 100)}%; height: 100%; background: ${done === steps.length ? 'var(--success)' : 'var(--primary)'}; border-radius: 2px;"></div>
      </div>
      <span style="font-size: 11px; color: var(--text-secondary);">${done}/${steps.length}</span>
    </div>
  </div>`;
}

function renderInfoPanel(m, st) {
  const pipelineSummary = renderPipelineSummary(m);
  const readiness = computeMeetingReadiness(m);
  const readinessColor = readiness.status === 'ready' ? 'var(--success)' : readiness.status === 'in_progress' ? 'var(--warning)' : 'var(--danger)';
  const readinessLabel = readiness.status === 'ready' ? '已就绪' : readiness.status === 'in_progress' ? '准备中' : '未开始';
  const evalHtml = m.effectiveness
    ? `<span style="font-size: 12px; font-weight: 600; color: ${getScoreColor(m.effectiveness.overallScore)};">${m.effectiveness.overallScore} · ${getScoreLabel(m.effectiveness.overallScore)}${m.effectiveness.auto ? '（系统）' : ''}</span>`
    : '<span style="font-size: 12px; color: var(--text-tertiary);">未评估</span>';

  const rows = [
    ['📅', '日期', m.date],
    ['📍', '地点', m.location || '待确认'],
    ['👤', '主持人', m.host || '待定'],
    ['📝', '记录人', m.recorder || '待定'],
    ['🏢', '层级', m.level],
    ['📊', '状态', `<span class="status-badge ${st.badgeClass}">${st.label}</span>`],
    ['🔗', 'KMS', m.meeting_link
      ? `<a href="${m.meeting_link}" target="_blank" style="color: var(--primary); text-decoration: underline; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; max-width: 140px;">${m.meeting_link.replace(/^https?:\/\//, '')}</a>`
      : '<span style="font-size: 12px; color: var(--text-tertiary);">未设置</span>'],
    ['📋', '会前准备', `<span style="font-size: 12px; font-weight: 600; color: ${readinessColor};">${readiness.percentage}% · ${readinessLabel}</span>`],
    ['⭐', '评估', evalHtml],
  ];

  const bottomButton = m.status === 'completed'
    ? `<div style="padding: 10px 0 4px; text-align: center;">
        <button type="button" onclick="window.openMeetingEvalModal('${m.id}')" style="padding: 6px 14px; font-size: 12px; border: 1px solid var(--warning); border-radius: 6px; background: rgba(245,158,11,0.08); color: var(--warning); cursor: pointer; font-weight: 500; width: 100%;">${m.effectiveness ? '⭐ 重新评估' : '⭐ 评估会议'}</button>
      </div>`
    : `<div style="padding: 10px 0 4px; text-align: center;">
        <button type="button" onclick="window.openMeetingPreparation('${m.id}')" style="padding: 6px 14px; font-size: 12px; border: 1px solid var(--primary); border-radius: 6px; background: var(--primary-light); color: var(--primary); cursor: pointer; font-weight: 500; width: 100%;">📋 会前准备</button>
      </div>`;

  return `
    <div style="background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-light); padding: 12px; height: fit-content;">
      ${rows.map(([icon, label, value]) => `
        <div style="display: flex; align-items: baseline; gap: 6px; padding: 5px 0; border-bottom: 1px dashed var(--border-light);">
          <span style="font-size: 11px; color: var(--text-secondary); min-width: 40px; flex-shrink: 0;">${icon} ${label}</span>
          <span style="font-size: 12px; color: var(--text-primary); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${value}</span>
        </div>
      `).join('')}
      ${pipelineSummary}
      ${bottomButton}
    </div>
  `;
}

function renderPipelineSteps(m) {
  if (!m.pipeline || !['region_routine', 'lagging_region', 'lagging_vertical'].includes(m.scenario)) return '';
  const steps = PIPELINE_STEPS();
  const total = steps.length;
  const doneCount = steps.filter((s) => m.pipeline[s.key]).length;
  const currentIdx = steps.findIndex((s) => !m.pipeline[s.key]);

  return `
    <div style="padding: 12px 16px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-light);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <span style="font-size: 13px; font-weight: 600;">📊 一报一会流程</span>
        <span style="font-size: 11px; color: ${doneCount === total ? 'var(--success)' : 'var(--primary)'}; font-weight: 600;">${doneCount}/${total}</span>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; position: relative; padding: 0 2px;">
        <div style="position: absolute; top: 8px; left: 16px; right: 16px; height: 2px; background: var(--border-light); border-radius: 1px; z-index: 0;"></div>
        ${steps.map((step, i) => {
          const isDone = m.pipeline[step.key];
          const isCurrent = i === currentIdx;
          return `
            <div onclick="window.togglePipelineStep('${m.id}', '${step.key}')" title="点击切换状态"
              style="display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; position: relative; z-index: 1; flex: 1; max-width: 60px;">
              <span style="width: 16px; height: 16px; border-radius: 50%; background: ${isDone ? 'var(--success)' : isCurrent ? 'var(--primary)' : '#fff'}; color: ${isDone ? '#fff' : isCurrent ? '#fff' : 'var(--text-tertiary)'}; display: flex; align-items: center; justify-content: center; font-size: 9px; border: 2px solid ${isDone ? 'var(--success)' : isCurrent ? 'var(--primary)' : 'var(--border-light)'};">${isDone ? '✓' : step.icon}</span>
              <span style="font-size: 10px; color: ${isDone ? 'var(--success)' : isCurrent ? 'var(--primary)' : 'var(--text-secondary)'}; font-weight: ${isCurrent ? '600' : '400'}; text-align: center; line-height: 1.2;">${step.label}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderAgendaItem(m, a, i) {
  const warning = getAgendaPostponeWarning(a);
  const sourceHint = formatAgendaSourceHint(a, meetings());
  const materialScore = getMaterialScore(a.material_link);
  const materialBadge = materialScore === null
    ? ''
    : `<span style="font-size: 10px; font-weight: 600; color: ${getScoreColor(materialScore)};">⭐ ${materialScore}分</span>`;

  return `
    <div style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-page); border-radius: 8px; border-left: 3px solid ${AGENDA_TYPE_COLORS()[a.type] || 'var(--text-secondary)'};">
      <div style="display: flex; flex-direction: column; align-items: center; min-width: 52px;">
        <span style="font-size: 11px; font-weight: 600; color: var(--text-primary);">${a.start_time || '09:00'}</span>
        <span style="font-size: 10px; color: var(--text-secondary);">~</span>
        <span style="font-size: 11px; font-weight: 600; color: var(--text-primary);">${a.end_time || '09:30'}</span>
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; flex-wrap: wrap;">
          <span style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${a.title}</span>
          <span style="padding: 1px 6px; border-radius: 4px; font-size: 10px; background: var(--bg-page); border: 1px solid var(--border-light); color: var(--text-secondary);">${AGENDA_TYPE_LABELS()[a.type] || '其他'}</span>
          ${getAgendaStatusBadge(a.status)}
          ${warning ? `<span style="padding: 1px 6px; border-radius: 4px; font-size: 10px; background: rgba(245,34,45,0.08); color: var(--danger); border: 1px solid rgba(245,34,45,0.2); font-weight: 600;">${warning}</span>` : ''}
          ${materialBadge}
        </div>
        <div style="display: flex; gap: 12px; font-size: 11px; color: var(--text-secondary); flex-wrap: wrap;">
          ${a.speaker ? `<span>👤 ${a.speaker}</span>` : ''}
          ${a.material_link ? `<span>📎 <a href="${a.material_link}" target="_blank" style="color: var(--primary);">材料</a></span>` : ''}
          ${a.purpose ? `<span>🎯 ${a.purpose}</span>` : ''}
          <span style="color: var(--primary);">${a.duration}分钟</span>
          ${sourceHint ? `<span style="color: var(--warning);">${sourceHint}</span>` : ''}
        </div>
      </div>
      <button type="button" onclick="event.stopPropagation(); window.pushAgenda('${m.id}', ${i})" style="padding: 2px 8px; font-size: 11px; border: 1px solid var(--primary); border-radius: 4px; background: var(--primary-light); color: var(--primary); cursor: pointer; flex-shrink: 0; white-space: nowrap;">📢 推送</button>
    </div>
  `;
}

function renderAgendaSection(m) {
  const items = m.agenda_items || [];
  const agendaTotalMinutes = items.reduce((s, a) => s + (a.duration || 0), 0);
  const agendaCompletion = computeAgendaCompletion(m);
  const postponedHint = agendaCompletion.postponed > 0 ? `（顺延 ${agendaCompletion.postponed}）` : '';

  return `
    <div style="background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-light); padding: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div>
          <span style="font-size: 15px; font-weight: 700;">📋 会议议程</span>
          <span style="font-size: 12px; color: var(--text-secondary); margin-left: 8px;">共 ${agendaCompletion.total} 项 · ${agendaTotalMinutes} 分钟</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button type="button" onclick="event.stopPropagation(); window.pushAgendaMeeting('${m.id}')" style="padding: 4px 10px; font-size: 11px; border: 1px solid var(--primary); border-radius: 4px; background: var(--primary-light); color: var(--primary); cursor: pointer;">📢 推送议程</button>
          <span style="font-size: 12px; color: var(--text-secondary);">已完成 ${agendaCompletion.completed} / ${agendaCompletion.total}${postponedHint}</span>
          <svg width="28" height="28" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill="none" stroke="var(--border-light)" stroke-width="3"/><circle cx="18" cy="18" r="15" fill="none" stroke="var(--primary)" stroke-width="3" stroke-dasharray="0 94"/></svg>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 4px;">
        ${items.length === 0
          ? '<div style="text-align: center; color: var(--text-secondary); padding: 16px; font-size: 13px;">暂无议程</div>'
          : items.map((a, i) => renderAgendaItem(m, a, i)).join('')}
      </div>
    </div>
  `;
}

function renderMinutesSection(m) {
  return `
    <div style="background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-light); overflow: hidden;">
      <div onclick="window.toggleDetailSection('detail-minutes')" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; cursor: pointer; user-select: none;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 14px; font-weight: 600;">📄 纪要</span>
          ${m.minutesStatus ? `<span style="padding: 1px 6px; border-radius: 4px; font-size: 10px; background: ${m.minutesStatus === 'final' ? 'var(--success-light)' : 'var(--warning-light)'}; color: ${m.minutesStatus === 'final' ? 'var(--success)' : 'var(--warning)'};">${m.minutesStatus === 'final' ? '已定稿' : '起草中'}</span>` : ''}
        </div>
        <span id="detail-minutes-toggle" style="font-size: 12px; color: var(--text-tertiary); transition: transform 0.2s;">▼</span>
      </div>
      <div id="detail-minutes" style="padding: 0 16px 12px;">
        ${m.minutes_content
          ? `<div style="font-size: 13px; color: var(--text-primary); line-height: 1.7; white-space: pre-wrap; background: var(--bg-page); border-radius: 6px; padding: 12px;">${escapeHtml(m.minutes_content)}</div>`
          : '<div style="text-align: center; color: var(--text-secondary); padding: 12px; font-size: 13px;">暂无纪要</div>'}
      </div>
    </div>
  `;
}

function renderActionItem(m, a, idx, arr) {
  const sourceAgenda = (m.agenda_items || []).find((x) => x.id && x.id === a.sourceAgendaId);
  const sourceDecision = (m.decisions || []).find((x) => x.id && x.id === a.sourceDecisionId);
  const sourceTags = [];
  if (sourceAgenda) sourceTags.push(`📋 ${escapeHtml((sourceAgenda.title || '议题').slice(0, 16))}`);
  if (sourceDecision) sourceTags.push(`📋 ${escapeHtml((sourceDecision.content || '决议').slice(0, 16))}`);

  const progressRow = a.progressNote || sourceTags.length
    ? `<div style="margin-top: 4px; font-size: 11px; color: var(--text-tertiary); padding-left: 24px; display: flex; gap: 10px; flex-wrap: wrap;">
        ${a.progressNote ? `<span>📝 ${escapeHtml(a.progressNote)}</span>` : ''}
        ${sourceTags.map((t) => `<span>${t}</span>`).join('')}
      </div>`
    : '';

  return `
    <div style="padding: 8px 0; ${idx < arr.length - 1 ? 'border-bottom: 1px solid var(--border-light);' : ''}">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 12px; color: var(--text-tertiary); flex-shrink: 0; width: 20px;">${idx + 1}.</span>
        <span style="font-size: 14px; flex-shrink: 0;">${a.status === 'completed' || a.status === 'implemented' ? '✅' : a.status === 'in_progress' ? '⏳' : '⏸️'}</span>
        <span style="flex: 1; font-size: 13px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(a.content || '')}</span>
        <span style="font-size: 11px; color: var(--text-secondary); flex-shrink: 0;">${escapeHtml(a.owner || '待定')} · ${escapeHtml(a.deadline || '未定')}</span>
        <button type="button" onclick="event.stopPropagation(); window.pushTodoReminder('${m.id}', ${idx})" style="padding: 2px 8px; font-size: 11px; border: 1px solid var(--primary); border-radius: 4px; background: var(--primary-light); color: var(--primary); cursor: pointer; flex-shrink: 0;">⏰ 提醒</button>
      </div>
      ${progressRow}
    </div>
  `;
}

function renderActionsSection(m) {
  const actionCount = (m.actions || []).length;
  const actions = m.actions || [];

  return `
    <div style="background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-light); overflow: hidden;">
      <div onclick="window.toggleDetailSection('detail-actions')" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; cursor: pointer; user-select: none;">
        <span style="font-size: 14px; font-weight: 600;">✅ 行动项${actionCount > 0 ? '（' + actionCount + '项）' : ''}</span>
        <span id="detail-actions-toggle" style="font-size: 12px; color: var(--text-tertiary); transition: transform 0.2s;">▼</span>
      </div>
      <div id="detail-actions" style="padding: 0 16px 12px;">
        ${actionCount === 0
          ? '<div style="text-align: center; color: var(--text-secondary); padding: 12px; font-size: 13px;">暂无行动项</div>'
          : `<div style="display: flex; flex-direction: column;">${actions.map((a, idx, arr) => renderActionItem(m, a, idx, arr)).join('')}</div>`}
      </div>
    </div>
  `;
}

function renderDecisionItem(m, d, idx, arr) {
  return `
    <div style="display: flex; align-items: center; gap: 10px; padding: 8px 0; ${idx < arr.length - 1 ? 'border-bottom: 1px solid var(--border-light);' : ''}">
      <span style="font-size: 12px; color: var(--text-tertiary); flex-shrink: 0; width: 20px;">${idx + 1}.</span>
      <span style="font-size: 14px; flex-shrink: 0;">${d.status === 'approved' || d.status === 'implemented' ? '✅' : '⏳'}</span>
      <span style="flex: 1; font-size: 13px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${d.content}</span>
      ${d.kmsUrl ? `<a href="${d.kmsUrl}" target="_blank" onclick="event.stopPropagation()" title="打开 KMS 文档" style="font-size: 12px; color: var(--primary); text-decoration: none; flex-shrink: 0; padding: 2px 6px; border: 1px solid var(--primary-light); border-radius: 4px; background: var(--primary-light);">🔗 KMS</a>` : ''}
      <span style="font-size: 11px; color: var(--text-secondary); flex-shrink: 0;">${d.owner || d.decider || '待定'} · ${d.deadline || d.decision_date || '未定'}</span>
      <button type="button" onclick="event.stopPropagation(); window.pushResolution('${m.id}', ${idx})" style="padding: 2px 8px; font-size: 11px; border: 1px solid var(--success); border-radius: 4px; background: rgba(34,197,94,0.08); color: var(--success); cursor: pointer; flex-shrink: 0;">📢 推送</button>
    </div>
  `;
}

function renderDecisionsSection(m) {
  const decisionCount = (m.decisions || []).length;
  const decisions = m.decisions || [];

  return `
    <div style="background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-light); overflow: hidden;">
      <div onclick="window.toggleDetailSection('detail-decisions')" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; cursor: pointer; user-select: none;">
        <span style="font-size: 14px; font-weight: 600;">📋 决议${decisionCount > 0 ? '（' + decisionCount + '项）' : ''}</span>
        <span id="detail-decisions-toggle" style="font-size: 12px; color: var(--text-tertiary); transition: transform 0.2s;">▼</span>
      </div>
      <div id="detail-decisions" style="padding: 0 16px 12px;">
        ${decisionCount === 0
          ? '<div style="text-align: center; color: var(--text-secondary); padding: 12px; font-size: 13px;">暂无决议</div>'
          : `<div style="display: flex; flex-direction: column;">${decisions.map((d, idx, arr) => renderDecisionItem(m, d, idx, arr)).join('')}</div>`}
      </div>
    </div>
  `;
}

function renderEvalDimension(d, m) {
  const v = m.effectiveness.dimensions[d.key] || 0;
  const pct = Math.round((v / d.max) * 100);
  const c = getScoreColor(pct);
  return `<div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
      <span style="font-size: 11px; color: var(--text-secondary);">${d.label}</span>
      <span style="font-size: 11px; font-weight: 600; color: ${c};">${v}</span>
    </div>
    <div style="width: 100%; height: 4px; background: var(--border-light); border-radius: 2px; overflow: hidden;">
      <div style="width: ${pct}%; height: 100%; background: ${c}; border-radius: 2px; transition: width 0.3s;"></div>
    </div>
  </div>`;
}

function renderEvalSection(m) {
  if (!m.effectiveness) return '';
  const score = m.effectiveness.overallScore;
  const feedback = m.effectiveness.feedback || [];

  return `
    <div style="background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-light); overflow: hidden;">
      <div onclick="window.toggleDetailSection('detail-eval')" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; cursor: pointer; user-select: none;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 14px; font-weight: 600;">⭐ 评估</span>
          <span style="font-size: 12px; font-weight: 600; color: ${getScoreColor(score)};">${score} · ${getScoreLabel(score)}</span>
        </div>
        <span id="detail-eval-toggle" style="font-size: 12px; color: var(--text-tertiary); transition: transform 0.2s;">▼</span>
      </div>
      <div id="detail-eval" style="padding: 0 16px 12px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <span style="font-size: 28px; font-weight: 700; color: ${getScoreColor(score)};">${score}</span>
          <div>
            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${getScoreLabel(score)}</div>
            <div style="font-size: 11px; color: var(--text-tertiary);">综合评分</div>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px;">
          ${[
            { key: 'before', label: '会前', max: 35 },
            { key: 'during', label: '会中', max: 30 },
            { key: 'after', label: '会后', max: 35 },
          ].map((d) => renderEvalDimension(d, m)).join('')}
        </div>
        ${feedback.length ? `<div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">${feedback.map((f) => `<span style="padding: 2px 8px; border-radius: 10px; font-size: 11px; background: var(--primary-light); color: var(--primary); border: 1px solid var(--primary-light);">${f}</span>`).join('')}</div>` : ''}
        ${m.effectiveness.comment ? `<div style="padding: 8px 10px; background: var(--bg-page); border-radius: 6px; border-left: 3px solid var(--primary-light); font-size: 12px; color: var(--text-primary); line-height: 1.5;">${escapeHtml(m.effectiveness.comment)}</div>` : ''}
      </div>
    </div>
  `;
}

function renderChainCard(meeting, direction, missing = false) {
  if (!meeting) {
    const label = missing
      ? (direction === 'upstream' ? '⬆️ 上游未找到' : '⬇️ 下游未找到')
      : (direction === 'upstream' ? '⬆️ 无上游' : '⬇️ 无下游');
    const color = missing ? 'var(--text-secondary)' : 'var(--text-tertiary)';
    return `<div style="flex: 1; padding: 10px; background: var(--bg-page); border-radius: 8px; text-align: center; font-size: 12px; color: ${color};">${label}</div>`;
  }
  return `<div onclick="window.openMeetingDetail('${meeting.id}')" style="flex: 1; padding: 10px; background: var(--bg-page); border-radius: 8px; cursor: pointer; border: 1px solid var(--border-light); text-align: center; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border-light)'">
    <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 4px;">${direction === 'upstream' ? '⬆️ 上游' : '⬇️ 下游'}</div>
    <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${meeting.title}</div>
    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${meeting.date}</div>
  </div>`;
}

function renderChainSection(m) {
  const allMeetings = meetings();
  const upstream = m.upstreamMeeting ? allMeetings.find((x) => x.id === m.upstreamMeeting) : null;
  const downstream = m.downstreamMeeting ? allMeetings.find((x) => x.id === m.downstreamMeeting) : null;

  return `
    <div style="background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-light); overflow: hidden;">
      <div onclick="window.toggleDetailSection('detail-chain')" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; cursor: pointer; user-select: none;">
        <span style="font-size: 14px; font-weight: 600;">🔗 会议链</span>
        <span id="detail-chain-toggle" style="font-size: 12px; color: var(--text-tertiary); transition: transform 0.2s;">▼</span>
      </div>
      <div id="detail-chain" style="padding: 0 16px 12px;">
        <div style="display: flex; align-items: stretch; gap: 8px;">
          ${renderChainCard(upstream, 'upstream', !!m.upstreamMeeting && !upstream)}
          <div style="flex: 1; padding: 10px; background: var(--primary-light); border-radius: 8px; border: 1.5px solid var(--primary); text-align: center;">
            <div style="font-size: 10px; color: var(--primary); margin-bottom: 4px;">📍 当前</div>
            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.title}</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${m.date}</div>
          </div>
          ${renderChainCard(downstream, 'downstream', !!m.downstreamMeeting && !downstream)}
        </div>
      </div>
    </div>
  `;
}

function renderMeetingDetail(m) {
  const sc = SCENARIO_CONFIG()[m.scenario] || {};
  const st = STATUS_CONFIG()[m.status] || {};
  const content = document.getElementById('meeting-detail-content');
  const headerLeft = document.getElementById('meeting-detail-header-left');
  if (!content || !headerLeft) return;

  headerLeft.innerHTML = renderDetailHeader(m, sc, st);

  content.innerHTML = `
    <div style="display: grid; grid-template-columns: 260px 1fr; gap: 20px;">
      ${renderInfoPanel(m, st)}
      <div style="min-width: 0; display: flex; flex-direction: column; gap: 12px;">
        ${renderPipelineSteps(m)}
        ${renderAgendaSection(m)}
        ${renderMinutesSection(m)}
        ${renderDecisionsSection(m)}
        ${renderActionsSection(m)}
        ${renderEvalSection(m)}
        ${renderChainSection(m)}
      </div>
    </div>
  `;
}

// ---- window shim ----
window.renderMeetingDetail = renderMeetingDetail;

export {
  renderMeetingDetail,
  renderDetailHeader,
  renderInfoPanel,
  renderPipelineSteps,
  renderAgendaSection,
  renderMinutesSection,
  renderActionsSection,
  renderDecisionsSection,
  renderEvalSection,
  renderChainSection,
};
