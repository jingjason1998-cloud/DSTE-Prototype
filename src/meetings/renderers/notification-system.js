import { renderNotificationMessage } from '../utils/notifications.js';
import { icon } from '../../../assets/js/icons.js';
import { getMeetings } from '../data-store.js';

const NOTIF_CONFIG_KEY = 'dste_notification_config';
const NOTIF_DEFAULT = { webhooks: [], enabledTypes: { resolution: true, todo: true, alert: true, agenda: true, rule: true }, mentionAll: false, lastSent: [] };

function loadNotificationConfig() {
  let cfg;
  try { cfg = DSTE.Storage.get(NOTIF_CONFIG_KEY, NOTIF_DEFAULT); }
  catch (e) { cfg = JSON.parse(JSON.stringify(NOTIF_DEFAULT)); }
  // 兼容旧配置：单 webhookUrl 迁移为 webhooks 数组
  if (cfg.webhookUrl && (!cfg.webhooks || cfg.webhooks.length === 0)) {
    cfg.webhooks = [{ id: '1', name: '默认群', url: cfg.webhookUrl }];
    delete cfg.webhookUrl;
    saveNotificationConfig(cfg);
  }
  if (!Array.isArray(cfg.webhooks)) cfg.webhooks = [];
  return cfg;
}

function saveNotificationConfig(cfg) {
  DSTE.Storage.set(NOTIF_CONFIG_KEY, cfg);
}

async function sendWeComNotification(type, payload, webhookUrl) {
  const cfg = loadNotificationConfig();
  if (!webhookUrl) { window.showToast('请先选择发送目标群', 'warning'); return { success: false, msg: '未选择发送目标' }; }
  const enabledKey = type.startsWith('alert') ? 'alert' : type.startsWith('agenda') ? 'agenda' : type.startsWith('rule') ? 'rule' : type;
  if (!cfg.enabledTypes[enabledKey]) return { success: false, msg: '该类型推送已禁用' };
  const msg = renderNotificationMessage(type, payload);
  if (!msg) return { success: false, msg: '消息内容为空' };
  const content = msg + (cfg.mentionAll ? '\n\n<font color="comment">@所有人</font>' : '');
  try {
    const res = await fetch((window.API_BASE || '') + '/api/notify/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl, payload: { msgtype: 'markdown', markdown: { content } } }),
    });
    const result = await res.json();
    const entry = { type, content: msg.slice(0, 100), sentAt: new Date().toISOString(), status: result.success ? 'success' : 'failed', error: result.errmsg || '' };
    cfg.lastSent = [entry, ...cfg.lastSent].slice(0, 20);
    saveNotificationConfig(cfg);
    return { success: result.success, msg: result.errmsg || '发送成功' };
  } catch (e) {
    const entry = { type, content: msg.slice(0, 100), sentAt: new Date().toISOString(), status: 'failed', error: e.message };
    cfg.lastSent = [entry, ...cfg.lastSent].slice(0, 20);
    saveNotificationConfig(cfg);
    return { success: false, msg: e.message };
  }
}

async function resolvePushWithWebhook() {
  const payload = window._webhookSelectorPayload;
  if (!payload) return;
  const selected = document.querySelector('input[name="webhook-select"]:checked');
  if (!selected) { window.showToast('请选择一个发送目标', 'warning'); return; }
  const webhookUrl = selected.value;
  closeWebhookSelector();
  const res = await sendWeComNotification(payload.type, payload.data, webhookUrl);
  if (res.success) { window.showToast(`发送成功 ${icon('check', {size: 14})}`, 'success'); } else { window.showToast('发送失败：' + res.msg, 'error'); }
}

function openWebhookSelector(type, data) {
  const cfg = loadNotificationConfig();
  if (!cfg.webhooks || cfg.webhooks.length === 0) { window.showToast('请先配置企业微信群 Webhook', 'warning'); openNotificationConfig(); return; }
  if (cfg.webhooks.length === 1) {
    sendWeComNotification(type, data, cfg.webhooks[0].url).then(res => {
      if (res.success) { window.showToast(`发送成功 ${icon('check', {size: 14})}`, 'success'); } else { window.showToast('发送失败：' + res.msg, 'error'); }
    });
    return;
  }
  window._webhookSelectorPayload = { type, data };
  const listHtml = cfg.webhooks.map((w, i) => `
    <label style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border-color); cursor: pointer; margin-bottom: 8px;">
      <input type="radio" name="webhook-select" value="${w.url}" ${i === 0 ? 'checked' : ''} style="cursor: pointer;">
      <div>
        <div style="font-size: 13px; font-weight: 500; color: var(--text-primary);">${w.name || '未命名'}</div>
        <div style="font-size: 11px; color: var(--text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px;">${w.url}</div>
      </div>
    </label>
  `).join('');
  document.getElementById('webhook-selector-list').innerHTML = listHtml;
  document.getElementById('webhook-selector-overlay').style.display = 'flex';
}

function closeWebhookSelector() {
  window._webhookSelectorPayload = null;
  document.getElementById('webhook-selector-overlay').style.display = 'none';
}

function pushResolution(meetingId, idx) {
  const m = getMeetings().find(x => x.id === meetingId);
  if (!m || !m.decisions || !m.decisions[idx]) return;
  const d = m.decisions[idx];
  openWebhookSelector('resolution', { meetingTitle: m.title, content: d.content, owner: d.owner, deadline: d.deadline, status: d.status, kmsUrl: d.kmsUrl });
}

function pushTodoReminder(meetingId, idx) {
  const m = getMeetings().find(x => x.id === meetingId);
  if (!m || !m.actions || !m.actions[idx]) return;
  const a = m.actions[idx];
  const daysLeft = a.deadline ? Math.ceil((new Date(a.deadline + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000) : null;
  openWebhookSelector('todo', { meetingTitle: m.title, content: a.content, owner: a.owner, deadline: a.deadline, daysLeft });
}

function pushAlert(meetingId, alertType, data) {
  const m = getMeetings().find(x => x.id === meetingId);
  if (!m) return;
  openWebhookSelector(alertType, { ...data, meetingTitle: m.title });
}

function pushAgenda(meetingId, idx, mode) {
  const m = getMeetings().find(x => x.id === meetingId);
  if (!m || !m.agenda_items || !m.agenda_items[idx]) return;
  const a = m.agenda_items[idx];
  openWebhookSelector('agenda', {
    meetingTitle: m.title,
    agendaTitle: a.title,
    agendaType: window.AGENDA_TYPE_LABELS[a.type] || '其他',
    duration: a.duration,
    owner: a.owner,
    speaker: a.speaker,
    materialLink: a.material_link,
    mode: mode || 'reminder'
  });
}

function pushAgendaMeeting(meetingId) {
  const m = getMeetings().find(x => x.id === meetingId);
  if (!m) return;
  const totalMinutes = (m.agenda_items || []).reduce((s, a) => s + (a.duration || 0), 0);
  openWebhookSelector('agenda-meeting', {
    meetingTitle: m.title,
    meetingDate: m.date,
    location: m.location,
    agendaItems: (m.agenda_items || []).map(a => ({
      title: a.title,
      type: window.AGENDA_TYPE_LABELS[a.type] || '其他',
      duration: a.duration,
      owner: a.owner
    })),
    totalDuration: totalMinutes
  });
}

function pushRuleTrigger(rule, result, meeting) {
  openWebhookSelector('rule-trigger', {
    ruleName: rule?.name || '规则触发',
    period: result?.period || '',
    theater: result?.theater || '',
    indicatorName: result?.indicatorName || '',
    rank: result?.rank || 1,
    achievementRate: result?.achievementRate || 0,
    actionRequired: '落后述职',
    meetingTitle: meeting?.title,
  });
}

function openNotificationCenter() {
  const cfg = loadNotificationConfig();
  const logs = cfg.lastSent || [];
  const listHtml = logs.length === 0 ? '<div style="text-align: center; color: var(--text-tertiary); padding: 40px 0;">暂无推送记录</div>' : logs.map(l => `
    <div style="padding: 12px; background: var(--bg-page); border-radius: 8px; margin-bottom: 8px; border-left: 3px solid ${l.status === 'success' ? 'var(--success)' : 'var(--danger)'}">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span style="font-size: 13px; font-weight: 600;">${l.type === 'resolution' ? `${icon('clipboardText', {size: 14})} 决议推送` : l.type === 'todo' ? `${icon('clock', {size: 14})} 待办提醒` : l.type.startsWith('agenda') ? `${icon('clipboardText', {size: 14})} 议程通知` : `${icon('warning', {size: 14})} 预警`}</span>
        <span style="font-size: 11px; color: var(--text-tertiary);">${new Date(l.sentAt).toLocaleString()}</span>
      </div>
      <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">${l.content}</div>
      <div style="font-size: 11px; color: ${l.status === 'success' ? 'var(--success)' : 'var(--danger)'}">${l.status === 'success' ? `${icon('check', {size: 14})} 成功` : `${icon('x', {size: 14})} ${l.error || '失败'}`}</div>
    </div>
  `).join('');
  const ov = document.getElementById('notification-center-overlay');
  const listEl = document.getElementById('notification-center-list');
  if (listEl) listEl.innerHTML = listHtml;
  if (ov) ov.style.display = 'flex';
}

function closeNotificationCenter() {
  const ov = document.getElementById('notification-center-overlay');
  if (ov) ov.style.display = 'none';
}

function renderWebhookConfigList(webhooks) {
  const container = document.getElementById('notif-webhooks-list');
  if (!container) return;
  const items = webhooks && webhooks.length > 0 ? webhooks : [];
  container.innerHTML = items.map((w, idx) => `
    <div class="webhook-row" data-idx="${idx}" style="display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 8px; background: var(--bg-page);">
      <div style="display: flex; gap: 8px;">
        <input type="text" class="webhook-name" placeholder="群名称" value="${w.name || ''}" style="flex: 1; padding: 6px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px; background: var(--bg-card); color: var(--text-primary);">
        <button type="button" onclick="removeWebhookRow(this)" style="padding: 4px 10px; font-size: 12px; border: 1px solid var(--danger); border-radius: 4px; background: rgba(245,34,45,0.08); color: var(--danger); cursor: pointer;">删除</button>
      </div>
      <input type="url" class="webhook-url" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." value="${w.url || ''}" style="width: 100%; padding: 6px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary); box-sizing: border-box;">
    </div>
  `).join('');
  if (items.length === 0) container.innerHTML = '<div style="text-align: center; color: var(--text-tertiary); padding: 16px 0; font-size: 13px;">暂无 Webhook，点击下方按钮添加</div>';
}

function addWebhookRow() {
  const container = document.getElementById('notif-webhooks-list');
  const emptyTip = container.querySelector('.webhook-row') === null;
  if (emptyTip) container.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'webhook-row';
  div.style.cssText = 'display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 8px; background: var(--bg-page);';
  div.innerHTML = `
    <div style="display: flex; gap: 8px;">
      <input type="text" class="webhook-name" placeholder="群名称" style="flex: 1; padding: 6px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px; background: var(--bg-card); color: var(--text-primary);">
      <button type="button" onclick="removeWebhookRow(this)" style="padding: 4px 10px; font-size: 12px; border: 1px solid var(--danger); border-radius: 4px; background: rgba(245,34,45,0.08); color: var(--danger); cursor: pointer;">删除</button>
    </div>
    <input type="url" class="webhook-url" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." style="width: 100%; padding: 6px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary); box-sizing: border-box;">
  `;
  container.appendChild(div);
}

function removeWebhookRow(btn) {
  const row = btn.closest('.webhook-row');
  if (row) row.remove();
  const container = document.getElementById('notif-webhooks-list');
  if (container.querySelectorAll('.webhook-row').length === 0) {
    container.innerHTML = '<div style="text-align: center; color: var(--text-tertiary); padding: 16px 0; font-size: 13px;">暂无 Webhook，点击下方按钮添加</div>';
  }
}

function openNotificationConfig() {
  const cfg = loadNotificationConfig();
  renderWebhookConfigList(cfg.webhooks);
  document.getElementById('notif-enable-resolution').checked = cfg.enabledTypes?.resolution !== false;
  document.getElementById('notif-enable-todo').checked = cfg.enabledTypes?.todo !== false;
  document.getElementById('notif-enable-alert').checked = cfg.enabledTypes?.alert !== false;
  document.getElementById('notif-enable-agenda').checked = cfg.enabledTypes?.agenda !== false;
  document.getElementById('notif-mention-all').checked = cfg.mentionAll || false;
  const ov = document.getElementById('notification-config-overlay');
  if (ov) ov.style.display = 'flex';
}

function closeNotificationConfig() {
  const ov = document.getElementById('notification-config-overlay');
  if (ov) ov.style.display = 'none';
}

function saveNotificationConfigFromUI() {
  const webhooks = [];
  document.querySelectorAll('#notif-webhooks-list .webhook-row').forEach(row => {
    const name = row.querySelector('.webhook-name')?.value.trim() || '';
    const url = row.querySelector('.webhook-url')?.value.trim() || '';
    if (url) webhooks.push({ id: Date.now() + '_' + Math.random().toString(36).slice(2, 7), name: name || '未命名', url });
  });
  const cfg = {
    webhooks,
    enabledTypes: {
      resolution: document.getElementById('notif-enable-resolution')?.checked || false,
      todo: document.getElementById('notif-enable-todo')?.checked || false,
      alert: document.getElementById('notif-enable-alert')?.checked || false,
      agenda: document.getElementById('notif-enable-agenda')?.checked || false,
    },
    mentionAll: document.getElementById('notif-mention-all')?.checked || false,
    lastSent: loadNotificationConfig().lastSent || [],
  };
  saveNotificationConfig(cfg);
  closeNotificationConfig();
  window.showToast(`通知配置已保存 ${icon('check', {size: 14})}`, 'success');
}

// Expose on window for onclick handlers in HTML strings
window.loadNotificationConfig = loadNotificationConfig;
window.saveNotificationConfig = saveNotificationConfig;
window.sendWeComNotification = sendWeComNotification;
window.resolvePushWithWebhook = resolvePushWithWebhook;
window.openWebhookSelector = openWebhookSelector;
window.closeWebhookSelector = closeWebhookSelector;
window.pushResolution = pushResolution;
window.pushTodoReminder = pushTodoReminder;
window.pushAlert = pushAlert;
window.pushAgenda = pushAgenda;
window.pushAgendaMeeting = pushAgendaMeeting;
window.pushRuleTrigger = pushRuleTrigger;
window.openNotificationCenter = openNotificationCenter;
window.closeNotificationCenter = closeNotificationCenter;
window.renderWebhookConfigList = renderWebhookConfigList;
window.addWebhookRow = addWebhookRow;
window.removeWebhookRow = removeWebhookRow;
window.openNotificationConfig = openNotificationConfig;
window.closeNotificationConfig = closeNotificationConfig;
window.saveNotificationConfigFromUI = saveNotificationConfigFromUI;

// Named exports for testability
export {
  loadNotificationConfig,
  saveNotificationConfig,
  sendWeComNotification,
  resolvePushWithWebhook,
  openWebhookSelector,
  closeWebhookSelector,
  pushResolution,
  pushTodoReminder,
  pushAlert,
  pushAgenda,
  pushAgendaMeeting,
  pushRuleTrigger,
  openNotificationCenter,
  closeNotificationCenter,
  renderWebhookConfigList,
  addWebhookRow,
  removeWebhookRow,
  openNotificationConfig,
  closeNotificationConfig,
  saveNotificationConfigFromUI,
};
