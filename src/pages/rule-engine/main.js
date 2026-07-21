/**
 * 规则引擎中心 — 页面主逻辑
 */

import { showToast } from '../../lib/utils.js';
import { icon } from '../../../assets/js/icons.js';
import {
  renderRuleListPage,
  renderRuleForm,
} from './rule-engine-renderer.js';
import {
  loadRules,
  saveRules,
  addRule,
  updateRule,
  deleteRule,
  findRuleById,
  toggleRuleEnabled,
  appendExecutionLog,
  loadExecutionLogs,
  loadIndicators,
  loadKpiInstances,
  recordScheduledRun,
  hasScheduledRun,
  loadLastRuns,
  generateId,
} from './rule-engine-store.js';
import {
  executeRule,
  createDefaultRule,
  TRIGGER_MODE,
  DEFAULT_WARZONES,
  resolvePeriod,
  shouldRunScheduled,
} from './rule-engine-engine.js';
import { sendRuleTriggerNotifications, isNotificationEnabled } from './rule-engine-notifications.js';
import { initDataStore, addMeeting, findExistingLaggingMeeting } from '../../meetings/data-store.js';

const RULE_DRAFT_SESSION_KEY = 'dste_rule_engine_pending_draft';

const state = {
  activeTab: 'list',
  editingRule: null,
  deleteRuleId: null,
  previewData: null,
  indicators: [],
  kpiInstances: [],
};

let allRules = [];
let allLogs = [];

async function init() {
  await initDataStore();
  state.indicators = loadIndicators();
  state.kpiInstances = loadKpiInstances();
  allRules = loadRules();
  allLogs = loadExecutionLogs();

  if (allRules.length === 0) {
    seedDefaultRule();
  }

  bindEvents();
  render();
  runScheduledRulesIfNeeded();
}

function seedDefaultRule() {
  const indicators = state.indicators;
  const firstIndicator = indicators.length > 0 ? indicators[0].id : '';
  const rule = createDefaultRule({
    criteria: { indicatorIds: firstIndicator ? [firstIndicator] : [] },
  });
  addRule(rule);
  allRules = loadRules();
}

function render() {
  const container = document.getElementById('rule-engine-container');
  if (!container) return;
  container.innerHTML = renderRuleListPage(state, allRules, allLogs);
  bindFilterInputs();
}

function bindEvents() {
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('submit', handleFormSubmit);
  document.addEventListener('change', handleChange);
}

function bindFilterInputs() {
  // no-op for now; reserved for search/filter inputs
}

function handleChange(e) {
  const target = e.target;
  if (target.id === 'ruleTriggerMode') {
    const section = document.getElementById('scheduleSection');
    if (section) {
      section.style.display = [TRIGGER_MODE.SCHEDULED, TRIGGER_MODE.BOTH].includes(target.value) ? 'block' : 'none';
    }
  }
}

function handleDocumentClick(e) {
  const btn = e.target.closest('[data-re-action]');
  if (!btn) return;

  const action = btn.dataset.reAction;
  const ruleId = btn.dataset.ruleId;

  switch (action) {
    case 'switch-tab':
      state.activeTab = btn.dataset.tab;
      if (state.activeTab !== 'form') {
        state.editingRule = null;
      }
      render();
      break;
    case 'new-rule':
      state.editingRule = {
        ...createDefaultRule({
          criteria: { indicatorIds: state.indicators.length > 0 ? [state.indicators[0].id] : [] },
        }),
        id: '',
      };
      state.activeTab = 'form';
      render();
      break;
    case 'edit-rule':
      openEditRule(ruleId);
      break;
    case 'toggle-rule':
      toggleRule(ruleId);
      break;
    case 'delete-rule':
      state.deleteRuleId = ruleId;
      render();
      break;
    case 'confirm-delete':
      confirmDeleteRule(ruleId);
      break;
    case 'cancel-delete':
      state.deleteRuleId = null;
      render();
      break;
    case 'cancel-form':
      state.activeTab = 'list';
      state.editingRule = null;
      render();
      break;
    case 'save-rule':
      saveRuleFromForm();
      break;
    case 'preview-rule':
      handlePreviewRule();
      break;
    case 'run-rule':
      runRuleById(ruleId);
      break;
    case 'close-preview':
      state.previewData = null;
      render();
      break;
    case 'generate-drafts':
      handleGenerateDrafts();
      break;
    case 'confirm-create':
      handleConfirmCreate();
      break;
    case 'add-agenda-item':
      addAgendaItemToForm();
      break;
    case 'remove-agenda-item':
      removeAgendaItemFromForm(btn);
      break;
  }
}

function openEditRule(id) {
  const rule = findRuleById(id);
  if (!rule) {
    showToast('规则不存在', 'error');
    return;
  }
  state.editingRule = JSON.parse(JSON.stringify(rule));
  state.activeTab = 'form';
  render();
}

function toggleRule(id) {
  const updated = toggleRuleEnabled(id);
  if (!updated) {
    showToast('规则不存在', 'error');
    return;
  }
  allRules = loadRules();
  showToast(`规则已${updated.enabled ? '启用' : '禁用'}`, 'success');
  render();
}

function confirmDeleteRule(id) {
  deleteRule(id);
  state.deleteRuleId = null;
  allRules = loadRules();
  showToast('规则已删除', 'success');
  render();
}

function handleFormSubmit(e) {
  const form = e.target.closest('[data-re-form="rule"]');
  if (!form) return;
  e.preventDefault();
  saveRuleFromForm();
}

function collectFormData() {
  const indicatorId = document.getElementById('ruleIndicator')?.value || '';
  const triggerMode = document.getElementById('ruleTriggerMode')?.value || TRIGGER_MODE.BOTH;

  const periodType = document.getElementById('schedulePeriodType')?.value || 'month';
  const periodOffset = parseInt(document.getElementById('schedulePeriodOffset')?.value || '-1', 10);
  const dayOfMonth = parseInt(document.getElementById('scheduleDayOfMonth')?.value || '5', 10);
  const time = document.getElementById('scheduleTime')?.value || '09:00';

  const minRateRaw = document.getElementById('ruleMinAchievementRate')?.value;
  const minRate = minRateRaw === '' ? '' : parseFloat(minRateRaw);

  const agendaItems = [];
  document.querySelectorAll('#agendaTemplateList .re-agenda-row').forEach(row => {
    agendaItems.push({
      type: row.querySelector('[data-agenda-field="type"]')?.value || 'business_special',
      title: row.querySelector('[data-agenda-field="title"]')?.value || '',
      duration: parseInt(row.querySelector('[data-agenda-field="duration"]')?.value || '30', 10),
    });
  });

  return {
    name: document.getElementById('ruleName')?.value?.trim() || '未命名规则',
    enabled: document.getElementById('ruleEnabled')?.checked ?? true,
    triggerMode,
    schedule: {
      periodType,
      periodOffset,
      dayOfMonth,
      time,
    },
    criteria: {
      indicatorIds: indicatorId ? [indicatorId] : [],
      rankingScope: document.getElementById('ruleRankingScope')?.value || 'warzone',
      rankingBottomN: parseInt(document.getElementById('ruleRankingBottomN')?.value || '1', 10),
      minAchievementRate: minRate,
      requireLaggingStatus: document.getElementById('ruleRequireLagging')?.checked ?? false,
    },
    action: {
      createMeeting: document.getElementById('actionCreateMeeting')?.checked ?? true,
      autoSave: document.getElementById('actionAutoSave')?.value === 'true',
      meetingTemplate: {
        titleTemplate: document.getElementById('meetingTitleTemplate')?.value || '{theater} {period} {indicatorName} 业绩承诺会',
        level: document.getElementById('meetingLevel')?.value || 'L3',
        scenario: 'lagging_region',
        location: document.getElementById('meetingLocation')?.value || '待确认',
        agendaItems,
      },
      notify: document.getElementById('actionNotify')?.checked ?? true,
      notifyWebhookId: '',
      notifyMentionAll: document.getElementById('actionMentionAll')?.checked ?? false,
    },
  };
}

function saveRuleFromForm() {
  console.log('saveRuleFromForm called');
  const formData = collectFormData();
  console.log('formData:', formData);
  const id = document.getElementById('ruleId')?.value;
  console.log('rule id:', id);

  if (formData.criteria.indicatorIds.length === 0) {
    showToast('请选择一个 OMP 指标', 'warning');
    return;
  }

  const now = new Date().toISOString();
  if (id && findRuleById(id)) {
    updateRule(id, { ...formData, updatedAt: now });
  } else {
    addRule({
      ...createDefaultRule(),
      ...formData,
      id: `rule_lg_${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  allRules = loadRules();
  state.activeTab = 'list';
  state.editingRule = null;
  showToast('规则已保存', 'success');
  render();
}

function addAgendaItemToForm() {
  const container = document.getElementById('agendaTemplateList');
  if (!container) return;
  const idx = container.children.length;
  const html = `
    <div class="re-agenda-row" data-agenda-idx="${idx}">
      <select class="re-form-select re-agenda-type" data-agenda-field="type">
        <option value="budget_finance">财务预算</option>
        <option value="business_special" selected>业务专题</option>
        <option value="key_task_management">重点工作</option>
        <option value="goal_management">目标管理</option>
      </select>
      <input type="text" class="re-form-input re-agenda-title" data-agenda-field="title" placeholder="议程标题" value="">
      <input type="number" class="re-form-input re-agenda-duration" data-agenda-field="duration" placeholder="时长" value="30">
      <button type="button" class="btn btn-ghost btn-sm" data-re-action="remove-agenda-item" data-agenda-idx="${idx}">${icon('x', { size: 14 })}</button>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
}

function removeAgendaItemFromForm(btn) {
  const row = btn.closest('.re-agenda-row');
  if (row) row.remove();
}

function handlePreviewRule() {
  const formData = collectFormData();
  if (formData.criteria.indicatorIds.length === 0) {
    showToast('请选择一个 OMP 指标', 'warning');
    return;
  }
  const rule = { ...createDefaultRule(), ...formData, id: state.editingRule?.id || 'preview' };
  showPreview(rule);
}

function runRuleById(id) {
  const rule = findRuleById(id);
  if (!rule) {
    showToast('规则不存在', 'error');
    return;
  }
  showPreview(rule);
}

function showPreview(rule) {
  const context = buildExecutionContext();
  const execution = executeRule(rule, context, {
    findById: (id) => {
      try {
        return window._meetingsData?.find(m => m.id === id) || null;
      } catch (e) {
        return null;
      }
    },
    findByMetadata: (result, r) => findExistingLaggingMeeting(result.period, result.theater, result.indicatorId, r.id),
  });

  state.previewData = {
    rule,
    results: execution.results,
    period: execution.period,
    execution,
  };
  render();
}

function buildExecutionContext() {
  return {
    kpiInstances: state.kpiInstances,
    indicators: state.indicators,
    warzones: DEFAULT_WARZONES,
    triggerType: 'manual',
    triggeredBy: getCurrentUserName(),
  };
}

function __unused_findExistingMeetingByMetadata(result, rule) {
  try {
    return window._meetingsData?.find(m => {
      if (m.scenario !== 'lagging_region') return false;
      if (m.month !== result.period) return false;
      const titleHasTheater = m.title?.includes(result.theater);
      const titleHasIndicator = m.title?.includes(result.indicatorName);
      return titleHasTheater && titleHasIndicator;
    }) || null;
  } catch (e) {
    return null;
  }
}

async function handleGenerateDrafts() {
  const { rule, execution } = state.previewData || {};
  if (!execution) return;

  const drafts = execution.results.filter(r => r.status !== 'skipped_duplicate');
  if (drafts.length === 0) {
    showToast('没有需要生成草稿的结果', 'warning');
    return;
  }

  if (drafts.length === 1) {
    sessionStorage.setItem(RULE_DRAFT_SESSION_KEY, JSON.stringify(drafts[0].meeting));
  } else {
    sessionStorage.setItem(RULE_DRAFT_SESSION_KEY, JSON.stringify(drafts[0].meeting));
  }

  const log = buildExecutionLog(rule, execution, 'manual');
  execution.results.forEach(r => {
    if (r.status !== 'skipped_duplicate') {
      r.status = 'draft';
    }
  });
  appendExecutionLog(log);
  allLogs = loadExecutionLogs();

  showToast('已生成会议草稿，请跳转确认', 'success');
  state.previewData = null;
  render();

  setTimeout(() => {
    window.location.href = 'meetings.html?ruleDraft=1';
  }, 300);
}

async function handleConfirmCreate() {
  const { rule, execution } = state.previewData || {};
  if (!execution) return;

  const created = [];
  for (const result of execution.results) {
    if (result.status === 'skipped_duplicate' || !result.meeting) continue;
    try {
      addMeeting(result.meeting);
      result.status = 'created';
      result.meetingId = result.meeting.id;
      created.push({ result, meeting: result.meeting });
    } catch (e) {
      result.status = 'failed';
      console.error('创建会议失败:', e);
    }
  }

  const log = buildExecutionLog(rule, execution, 'manual');
  appendExecutionLog(log);
  allLogs = loadExecutionLogs();

  if (rule.action?.notify && created.length > 0) {
    await sendRuleTriggerNotifications(rule, created);
  }

  showToast(`成功创建 ${created.length} 个会议`, created.length > 0 ? 'success' : 'warning');
  state.previewData = null;
  render();
}

function buildExecutionLog(rule, execution, triggerType) {
  return {
    id: generateId('exec'),
    ruleId: rule.id,
    ruleName: rule.name,
    ruleVersion: rule.version || '1.0.0',
    triggerType,
    triggeredAt: new Date().toISOString(),
    triggeredBy: triggerType === 'scheduled' ? 'system' : getCurrentUserName(),
    period: execution.period,
    inputSummary: execution.inputSummary,
    results: execution.results.map(r => ({
      indicatorId: r.indicatorId,
      indicatorName: r.indicatorName,
      theater: r.theater,
      rank: r.rank,
      achievementRate: r.achievementRate,
      actualValue: r.actualValue,
      targetValue: r.targetValue,
      kpiInstanceId: r.kpiInstanceId,
      meetingId: r.meetingId || null,
      status: r.status,
    })),
    notifications: [],
    status: execution.results.some(r => r.status === 'failed')
      ? 'partial'
      : execution.results.every(r => r.status === 'skipped_duplicate')
        ? 'success'
        : 'success',
    errorMessage: '',
    durationMs: execution.durationMs || 0,
  };
}

function runScheduledRulesIfNeeded() {
  const now = new Date();
  const rules = loadRules().filter(r => r.enabled && [TRIGGER_MODE.SCHEDULED, TRIGGER_MODE.BOTH].includes(r.triggerMode));
  const lastRuns = loadLastRuns();

  rules.forEach(rule => {
    try {
      const period = resolvePeriod(rule.schedule);
      if (shouldRunScheduled(rule, now, lastRuns) && !hasScheduledRun(rule.id, period)) {
        const context = buildExecutionContext();
        context.triggerType = 'scheduled';
        context.triggeredBy = 'system';
        const execution = executeRule(rule, context, {
          findById: (id) => window._meetingsData?.find(m => m.id === id) || null,
          findByMetadata: (result, r) => findExistingLaggingMeeting(result.period, result.theater, result.indicatorId, r.id),
        });
        processScheduledExecution(rule, execution);
      }
    } catch (e) {
      console.error('定时执行规则失败:', rule.id, e);
    }
  });
}

async function processScheduledExecution(rule, execution) {
  const created = [];
  for (const result of execution.results) {
    if (result.status === 'skipped_duplicate' || !result.meeting) continue;
    if (rule.action?.autoSave) {
      try {
        addMeeting(result.meeting);
        result.status = 'created';
        result.meetingId = result.meeting.id;
        created.push({ result, meeting: result.meeting });
      } catch (e) {
        result.status = 'failed';
      }
    } else {
      result.status = 'draft';
    }
  }

  const log = buildExecutionLog(rule, execution, 'scheduled');
  appendExecutionLog(log);
  recordScheduledRun(rule.id, execution.period);
  allLogs = loadExecutionLogs();

  if (rule.action?.notify && created.length > 0) {
    await sendRuleTriggerNotifications(rule, created);
  }
}

function getCurrentUserName() {
  return sessionStorage.getItem('dste-user') || DSTE.Storage.getString('dste-user') || 'system';
}

// Expose minimal globals for inline handlers
window._dsteRuleEngine = {
  closePreview: () => {
    state.previewData = null;
    render();
  },
};

init();
