/**
 * 规则引擎中心 — 渲染层
 *
 * 纯函数：输入状态/数据，输出 HTML 字符串。
 * 不操作 DOM、不访问 localStorage。
 */

import { icon } from '../../../assets/js/icons.js';
import { TRIGGER_MODE, RESULT_STATUS } from './rule-engine-engine.js';

const TRIGGER_MODE_LABELS = {
  [TRIGGER_MODE.MANUAL]: '手动',
  [TRIGGER_MODE.SCHEDULED]: '定时',
  [TRIGGER_MODE.BOTH]: '手动 + 定时',
};

const RESULT_STATUS_LABELS = {
  [RESULT_STATUS.CREATED]: '已创建',
  [RESULT_STATUS.DRAFT]: '草稿待确认',
  [RESULT_STATUS.SKIPPED_DUPLICATE]: '已存在，跳过',
  [RESULT_STATUS.FAILED]: '失败',
};

const LOG_STATUS_COLORS = {
  success: 'var(--success)',
  partial: 'var(--warning)',
  failure: 'var(--danger)',
};

export function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

export function renderRuleListPage(state, rules, logs) {
  const stats = computeStats(rules, logs);
  return `
    ${renderBreadcrumb()}
    ${renderHeader()}
    ${renderTabs(state.activeTab)}
    ${state.activeTab === 'list' ? renderListView(state, rules, logs, stats) : ''}
    ${state.activeTab === 'form' ? renderRuleForm(state.editingRule, state.indicators) : ''}
    ${state.activeTab === 'history' ? renderHistoryView(state, logs) : ''}
    ${renderPreviewModal(state.previewData)}
    ${renderDeleteModal(state.deleteRuleId)}
  `;
}

function renderBreadcrumb() {
  return `
    <div class="re-breadcrumb">
      <a href="cockpit.html#dashboard">驾驶舱</a>
      <span class="re-breadcrumb-separator">/</span>
      <span>规则引擎中心</span>
    </div>
  `;
}

function renderHeader() {
  return `
    <div class="re-page-header">
      <div>
        <div class="re-page-title">规则引擎中心</div>
        <div class="re-page-subtitle">自动识别落后战区并生成业绩承诺会 · 支持手动/定时触发</div>
      </div>
    </div>
  `;
}

function renderTabs(activeTab) {
  const tabs = [
    { id: 'list', label: `${icon('list', { size: 14 })} 规则列表` },
    { id: 'form', label: `${icon('pencilSimple', { size: 14 })} 规则配置` },
    { id: 'history', label: `${icon('clockCounterClockwise', { size: 14 })} 执行历史` },
  ];
  return `
    <div class="re-tabs">
      ${tabs.map(t => `
        <button class="re-tab ${activeTab === t.id ? 'active' : ''}" data-re-action="switch-tab" data-tab="${t.id}">${t.label}</button>
      `).join('')}
    </div>
  `;
}

function renderListView(state, rules, logs, stats) {
  const lastRunMap = computeLastRunMap(logs);
  return `
    ${renderStatsCards(stats)}
    <div class="re-actions-bar">
      <button class="btn btn-primary" data-re-action="new-rule">+ 新建规则</button>
    </div>
    <div class="re-rule-grid">
      ${rules.length ? rules.map(r => renderRuleCard(r, lastRunMap.get(r.id))).join('') : renderEmptyState('暂无规则', '点击右上角「新建规则」开始配置')}
    </div>
  `;
}

function computeStats(rules, logs) {
  const enabled = rules.filter(r => r.enabled).length;
  const executedThisMonth = logs.filter(l => {
    const d = new Date(l.triggeredAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  return {
    total: rules.length,
    enabled,
    disabled: rules.length - enabled,
    executedThisMonth,
  };
}

function renderStatsCards(stats) {
  return `
    <div class="re-stats-row">
      <div class="re-stat-card">
        <div class="re-stat-value">${stats.total}</div>
        <div class="re-stat-label">规则总数</div>
      </div>
      <div class="re-stat-card">
        <div class="re-stat-value" style="color:var(--success)">${stats.enabled}</div>
        <div class="re-stat-label">已启用</div>
      </div>
      <div class="re-stat-card">
        <div class="re-stat-value" style="color:var(--text-tertiary)">${stats.disabled}</div>
        <div class="re-stat-label">已禁用</div>
      </div>
      <div class="re-stat-card">
        <div class="re-stat-value" style="color:var(--primary)">${stats.executedThisMonth}</div>
        <div class="re-stat-label">本月执行</div>
      </div>
    </div>
  `;
}

function renderRuleCard(rule, lastRun) {
  const statusClass = rule.enabled ? 'enabled' : 'disabled';
  const statusText = rule.enabled ? '已启用' : '已禁用';
  const triggerText = TRIGGER_MODE_LABELS[rule.triggerMode] || rule.triggerMode;
  const criteria = rule.criteria || {};
  const indicatorText = (criteria.indicatorIds || []).join(', ') || '未配置指标';
  return `
    <div class="re-rule-card" data-rule-id="${escapeHtml(rule.id)}">
      <div class="re-rule-card-main">
        <div class="re-rule-card-header">
          <div class="re-rule-card-title">${escapeHtml(rule.name)}</div>
          <span class="re-status-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="re-rule-card-meta">
          <span>${icon('lightning', { size: 12 })} ${triggerText}</span>
          <span>${icon('chartLine', { size: 12 })} ${escapeHtml(indicatorText)}</span>
          <span>${icon('trophy', { size: 12 })} 倒数第 ${criteria.rankingBottomN || 1} 名</span>
        </div>
        <div class="re-rule-card-footer">
          <span>最近执行：${lastRun ? formatDateTime(lastRun) : '—'}</span>
        </div>
      </div>
      <div class="re-rule-card-actions">
        <button class="btn btn-ghost btn-sm" data-re-action="toggle-rule" data-rule-id="${escapeHtml(rule.id)}" title="${rule.enabled ? '禁用' : '启用'}">
          ${icon(rule.enabled ? 'pause' : 'play', { size: 14 })}
        </button>
        <button class="btn btn-ghost btn-sm" data-re-action="edit-rule" data-rule-id="${escapeHtml(rule.id)}">${icon('pencilSimple', { size: 14 })} 编辑</button>
        <button class="btn btn-primary btn-sm" data-re-action="run-rule" data-rule-id="${escapeHtml(rule.id)}">${icon('lightning', { size: 14 })} 立即执行</button>
        <button class="btn btn-ghost btn-sm" data-re-action="delete-rule" data-rule-id="${escapeHtml(rule.id)}" style="color:var(--danger)">${icon('trash', { size: 14 })} 删除</button>
      </div>
    </div>
  `;
}

function computeLastRunMap(logs) {
  const map = new Map();
  (logs || []).forEach(l => {
    if (!map.has(l.ruleId) || new Date(l.triggeredAt) > new Date(map.get(l.ruleId).triggeredAt)) {
      map.set(l.ruleId, l);
    }
  });
  return map;
}

function renderHistoryView(state, logs) {
  return `
    <div class="re-history-list">
      ${logs.length ? logs.map(renderHistoryItem).join('') : renderEmptyState('暂无执行记录', '创建规则并点击「立即执行」后可见')}
    </div>
  `;
}

function renderHistoryItem(log) {
  const color = LOG_STATUS_COLORS[log.status] || 'var(--text-secondary)';
  return `
    <div class="re-history-item" data-log-id="${escapeHtml(log.id)}">
      <div class="re-history-header">
        <div>
          <span class="re-history-status" style="color:${color}">${icon(log.status === 'success' ? 'checkCircle' : log.status === 'partial' ? 'warningCircle' : 'xCircle', { size: 14 })} ${log.status === 'success' ? '成功' : log.status === 'partial' ? '部分成功' : '失败'}</span>
          <span class="re-history-title">${escapeHtml(log.ruleName || log.ruleId)}</span>
        </div>
        <div class="re-history-time">${formatDateTime(log.triggeredAt)}</div>
      </div>
      <div class="re-history-body">
        <span>${icon('lightning', { size: 12 })} ${log.triggerType === 'scheduled' ? '定时' : '手动'}${log.triggeredBy && log.triggeredBy !== 'system' ? ` · ${escapeHtml(log.triggeredBy)}` : ''}</span>
        <span>${icon('calendar', { size: 12 })} 考核月份：${escapeHtml(log.period)}</span>
        <span>${icon('users', { size: 12 })} 生成会议：${(log.results || []).filter(r => r.status === RESULT_STATUS.CREATED).length}</span>
        <span>${icon('skipForward', { size: 12 })} 跳过：${(log.results || []).filter(r => r.status === RESULT_STATUS.SKIPPED_DUPLICATE).length}</span>
      </div>
      ${log.results?.length ? `
        <div class="re-history-results">
          ${log.results.map(r => `
            <div class="re-history-result ${r.status}">
              <span>${escapeHtml(r.theater)} · ${escapeHtml(r.indicatorName)}</span>
              <span>排名：倒数第 ${r.rank} 名</span>
              <span>达成率：${r.achievementRate}%</span>
              <span class="re-history-result-status">${RESULT_STATUS_LABELS[r.status] || r.status}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${log.errorMessage ? `<div class="re-history-error">${escapeHtml(log.errorMessage)}</div>` : ''}
    </div>
  `;
}

export function renderRuleForm(rule, indicators = []) {
  const isNew = !rule?.id;
  const r = rule || {};
  const criteria = r.criteria || {};
  const action = r.action || {};
  const template = action.meetingTemplate || {};
  const schedule = r.schedule || {};

  return `
    <form class="re-form" id="ruleForm" data-re-form="rule">
      <input type="hidden" id="ruleId" value="${escapeHtml(r.id || '')}">

      <div class="re-form-section">
        <div class="re-form-section-title">基础信息</div>
        <div class="re-form-grid">
          <div class="re-form-group re-form-group-full">
            <label class="re-form-label">规则名称 <span class="re-required">*</span></label>
            <input type="text" id="ruleName" class="re-form-input" required placeholder="如：月度落后战区业绩承诺会规则" value="${escapeHtml(r.name || '')}">
          </div>
          <div class="re-form-group">
            <label class="re-form-label">启用状态</label>
            <label class="re-switch">
              <input type="checkbox" id="ruleEnabled" ${r.enabled !== false ? 'checked' : ''}>
              <span class="re-switch-slider"></span>
              <span class="re-switch-label">启用</span>
            </label>
          </div>
          <div class="re-form-group">
            <label class="re-form-label">触发方式</label>
            <select id="ruleTriggerMode" class="re-form-select">
              <option value="${TRIGGER_MODE.MANUAL}" ${r.triggerMode === TRIGGER_MODE.MANUAL ? 'selected' : ''}>手动触发</option>
              <option value="${TRIGGER_MODE.SCHEDULED}" ${r.triggerMode === TRIGGER_MODE.SCHEDULED ? 'selected' : ''}>定时触发</option>
              <option value="${TRIGGER_MODE.BOTH}" ${r.triggerMode === TRIGGER_MODE.BOTH || !r.triggerMode ? 'selected' : ''}>手动 + 定时</option>
            </select>
          </div>
        </div>
      </div>

      <div class="re-form-section" id="scheduleSection" style="display:${[TRIGGER_MODE.SCHEDULED, TRIGGER_MODE.BOTH].includes(r.triggerMode || TRIGGER_MODE.BOTH) ? 'block' : 'none'}">
        <div class="re-form-section-title">定时设置</div>
        <div class="re-form-grid">
          <div class="re-form-group">
            <label class="re-form-label">周期类型</label>
            <select id="schedulePeriodType" class="re-form-select">
              <option value="month" ${schedule.periodType === 'month' || !schedule.periodType ? 'selected' : ''}>月度</option>
              <option value="quarter" ${schedule.periodType === 'quarter' ? 'selected' : ''}>季度</option>
              <option value="year" ${schedule.periodType === 'year' ? 'selected' : ''}>年度</option>
            </select>
          </div>
          <div class="re-form-group">
            <label class="re-form-label">月份偏移</label>
            <select id="schedulePeriodOffset" class="re-form-select">
              <option value="-1" ${schedule.periodOffset === -1 || schedule.periodOffset === undefined ? 'selected' : ''}>上月</option>
              <option value="0" ${schedule.periodOffset === 0 ? 'selected' : ''}>当月</option>
            </select>
          </div>
          <div class="re-form-group">
            <label class="re-form-label">执行日期</label>
            <input type="number" id="scheduleDayOfMonth" class="re-form-input" min="1" max="31" value="${schedule.dayOfMonth || 5}">
          </div>
          <div class="re-form-group">
            <label class="re-form-label">执行时间</label>
            <input type="time" id="scheduleTime" class="re-form-input" value="${schedule.time || '09:00'}">
          </div>
        </div>
      </div>

      <div class="re-form-section">
        <div class="re-form-section-title">触发条件</div>
        <div class="re-form-grid">
          <div class="re-form-group re-form-group-full">
            <label class="re-form-label">OMP 指标 <span class="re-required">*</span></label>
            <select id="ruleIndicator" class="re-form-select" required>
              <option value="">请选择指标</option>
              ${indicators.map(i => `
                <option value="${escapeHtml(i.id)}" ${(criteria.indicatorIds || []).includes(i.id) ? 'selected' : ''}>
                  ${escapeHtml(i.name || i.label || i.id)}${i.unit ? `（${escapeHtml(i.unit)}）` : ''}
                </option>
              `).join('')}
            </select>
            <div class="re-form-hint">MVP 仅支持单指标；多指标能力后续扩展</div>
          </div>
          <div class="re-form-group">
            <label class="re-form-label">排名维度</label>
            <select id="ruleRankingScope" class="re-form-select">
              <option value="warzone" selected>战区</option>
            </select>
          </div>
          <div class="re-form-group">
            <label class="re-form-label">倒数第 N 名</label>
            <input type="number" id="ruleRankingBottomN" class="re-form-input" min="1" value="${criteria.rankingBottomN || 1}">
          </div>
          <div class="re-form-group">
            <label class="re-form-label">达成率阈值（可选）</label>
            <input type="number" id="ruleMinAchievementRate" class="re-form-input" min="0" max="100" placeholder="低于该值才触发" value="${criteria.minAchievementRate ?? ''}">
          </div>
          <div class="re-form-group">
            <label class="re-form-label">仅落后状态</label>
            <label class="re-switch">
              <input type="checkbox" id="ruleRequireLagging" ${criteria.requireLaggingStatus ? 'checked' : ''}>
              <span class="re-switch-slider"></span>
              <span class="re-switch-label">仅 status=lagging 时触发</span>
            </label>
          </div>
        </div>
      </div>

      <div class="re-form-section">
        <div class="re-form-section-title">执行动作</div>
        <div class="re-form-grid">
          <div class="re-form-group">
            <label class="re-form-label">自动生成会议</label>
            <label class="re-switch">
              <input type="checkbox" id="actionCreateMeeting" ${action.createMeeting !== false ? 'checked' : ''}>
              <span class="re-switch-slider"></span>
              <span class="re-switch-label">创建落后战区业绩承诺会</span>
            </label>
          </div>
          <div class="re-form-group">
            <label class="re-form-label">保存模式</label>
            <select id="actionAutoSave" class="re-form-select">
              <option value="false" ${!action.autoSave ? 'selected' : ''}>草稿待确认（默认）</option>
              <option value="true" ${action.autoSave ? 'selected' : ''}>自动保存（需高级权限）</option>
            </select>
          </div>
          <div class="re-form-group re-form-group-full">
            <label class="re-form-label">会议标题模板</label>
            <input type="text" id="meetingTitleTemplate" class="re-form-input" value="${escapeHtml(template.titleTemplate || '{theater} {period} {indicatorName} 业绩承诺会')}">
            <div class="re-form-hint">可用变量：{theater}、{period}、{indicatorName}</div>
          </div>
          <div class="re-form-group">
            <label class="re-form-label">会议级别</label>
            <select id="meetingLevel" class="re-form-select">
              <option value="L1" ${template.level === 'L1' ? 'selected' : ''}>L1 - 片联级</option>
              <option value="L2" ${template.level === 'L2' ? 'selected' : ''}>L2 - 本部/战区级</option>
              <option value="L3" ${template.level === 'L3' || !template.level ? 'selected' : ''}>L3 - 专题级</option>
            </select>
          </div>
          <div class="re-form-group">
            <label class="re-form-label">地点</label>
            <input type="text" id="meetingLocation" class="re-form-input" value="${escapeHtml(template.location || '待确认')}">
          </div>
          <div class="re-form-group">
            <label class="re-form-label">发送通知</label>
            <label class="re-switch">
              <input type="checkbox" id="actionNotify" ${action.notify !== false ? 'checked' : ''}>
              <span class="re-switch-slider"></span>
              <span class="re-switch-label">执行成功后企业微信通知</span>
            </label>
          </div>
          <div class="re-form-group">
            <label class="re-form-label">@所有人</label>
            <label class="re-switch">
              <input type="checkbox" id="actionMentionAll" ${action.notifyMentionAll ? 'checked' : ''}>
              <span class="re-switch-slider"></span>
              <span class="re-switch-label">通知时 @所有人</span>
            </label>
          </div>
        </div>

        <div class="re-agenda-template">
          <div class="re-form-section-subtitle">议程模板</div>
          <div id="agendaTemplateList">
            ${(template.agendaItems || []).map((a, idx) => renderAgendaItemRow(a, idx)).join('')}
          </div>
          <button type="button" class="btn btn-ghost btn-sm" data-re-action="add-agenda-item">+ 添加议程</button>
        </div>
      </div>

      <div class="re-form-actions">
        <button type="button" class="btn btn-ghost" data-re-action="cancel-form">取消</button>
        <button type="button" class="btn btn-ghost" data-re-action="preview-rule">预览</button>
        <button type="submit" class="btn btn-primary" data-re-action="save-rule">保存</button>
      </div>
    </form>
  `;
}

function renderAgendaItemRow(item, idx) {
  return `
    <div class="re-agenda-row" data-agenda-idx="${idx}">
      <select class="re-form-select re-agenda-type" data-agenda-field="type">
        <option value="budget_finance" ${item.type === 'budget_finance' ? 'selected' : ''}>财务预算</option>
        <option value="business_special" ${item.type === 'business_special' ? 'selected' : ''}>业务专题</option>
        <option value="key_task_management" ${item.type === 'key_task_management' ? 'selected' : ''}>重点工作</option>
        <option value="goal_management" ${item.type === 'goal_management' ? 'selected' : ''}>目标管理</option>
      </select>
      <input type="text" class="re-form-input re-agenda-title" data-agenda-field="title" placeholder="议程标题" value="${escapeHtml(item.title || '')}">
      <input type="number" class="re-form-input re-agenda-duration" data-agenda-field="duration" placeholder="时长" value="${item.duration || 30}">
      <button type="button" class="btn btn-ghost btn-sm" data-re-action="remove-agenda-item" data-agenda-idx="${idx}">${icon('x', { size: 14 })}</button>
    </div>
  `;
}

function renderPreviewModal(previewData) {
  if (!previewData) return '';
  const { rule, results, period } = previewData;
  return `
    <div class="modal-overlay" id="previewModal" style="display:flex;z-index:10000;">
      <div class="modal-content" style="max-width:min(800px, calc(100vw - 32px));width:100%;max-height:90vh;display:flex;flex-direction:column;">
        <button class="modal-close" data-re-action="close-preview">×</button>
        <div class="modal-header">
          <div class="modal-title">${icon('magnifyingGlass', { size: 18 })} 规则执行预览 — ${escapeHtml(rule.name)}</div>
          <div class="modal-subtitle">目标月份：${escapeHtml(period)} · 共 ${results.length} 条结果</div>
        </div>
        <div style="flex:1;overflow-y:auto;padding:0 24px;">
          ${results.length ? `
            <table class="re-preview-table">
              <thead>
                <tr>
                  <th>战区</th>
                  <th>指标</th>
                  <th>排名</th>
                  <th>达成率</th>
                  <th>实际值</th>
                  <th>目标值</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                ${results.map(r => `
                  <tr class="${r.status === RESULT_STATUS.SKIPPED_DUPLICATE ? 'skipped' : ''}">
                    <td>${escapeHtml(r.theater)}</td>
                    <td>${escapeHtml(r.indicatorName)}</td>
                    <td>倒数第 ${r.rank} 名</td>
                    <td>${r.achievementRate}%</td>
                    <td>${r.actualValue}</td>
                    <td>${r.targetValue}</td>
                    <td>${RESULT_STATUS_LABELS[r.status] || r.status}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : renderEmptyState('无触发结果', '当前周期没有符合触发条件的战区')}
        </div>
        <div class="form-actions" style="padding:16px 24px;border-top:1px solid var(--border-color);">
          <button type="button" class="btn btn-ghost" data-re-action="close-preview">仅预览</button>
          ${rule.action?.autoSave ? `
            <button type="button" class="btn btn-primary" data-re-action="confirm-create">确认创建</button>
          ` : `
            <button type="button" class="btn btn-primary" data-re-action="generate-drafts">生成草稿</button>
          `}
        </div>
      </div>
    </div>
  `;
}

function renderDeleteModal(deleteRuleId) {
  if (!deleteRuleId) return '';
  return `
    <div class="modal-overlay" id="deleteModal" style="display:flex;z-index:10000;">
      <div class="modal-content" style="max-width:min(420px, calc(100vw - 32px));width:100%;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <div style="font-size:18px;font-weight:600;margin-bottom:8px;">确认删除该规则？</div>
        <div style="font-size:14px;color:var(--text-tertiary);margin-bottom:24px;">删除后不可恢复，相关的执行历史仍保留。</div>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button type="button" class="btn btn-ghost" data-re-action="cancel-delete">取消</button>
          <button type="button" class="btn btn-primary" style="background:var(--danger);" data-re-action="confirm-delete" data-rule-id="${escapeHtml(deleteRuleId)}">确认删除</button>
        </div>
      </div>
    </div>
  `;
}

function renderEmptyState(title, subtitle) {
  return `
    <div class="re-empty-state">
      <div style="font-size:32px;margin-bottom:12px;"><span class="icon" data-icon="tray" data-icon-size="32"></span></div>
      <div style="font-size:14px;margin-bottom:8px;">${escapeHtml(title)}</div>
      <div style="font-size:12px;color:var(--text-tertiary);">${escapeHtml(subtitle)}</div>
    </div>
  `;
}

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch (e) {
    return String(iso);
  }
}
