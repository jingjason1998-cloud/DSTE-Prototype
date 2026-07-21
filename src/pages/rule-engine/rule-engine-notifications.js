/**
 * 规则引擎通知模块
 * @module rule-engine-notifications
 *
 * 构造并发送规则触发后的企业微信通知。
 */

import { renderNotificationMessage } from '../../meetings/utils/notifications.js';
import { loadNotificationConfig } from './rule-engine-store.js';

/**
 * 构造规则触发通知内容
 * @param {Object} rule
 * @param {Object} result
 * @param {Object|null} meeting
 * @returns {string}
 */
export function buildRuleTriggerMessage(rule, result, meeting = null) {
  return renderNotificationMessage('rule-trigger', {
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

/**
 * 发送规则触发通知
 * @param {Object} rule
 * @param {Object} result
 * @param {Object|null} meeting
 * @param {string} [webhookUrl] - 指定 webhook，为空时使用配置中的第一个
 * @returns {Promise<Object>}
 */
export async function sendRuleTriggerNotification(rule, result, meeting, webhookUrl) {
  const config = loadNotificationConfig();
  const url = webhookUrl || resolveWebhookUrl(config, rule?.action?.notifyWebhookId);

  if (!url) {
    return { success: false, error: '未配置企业微信 webhook' };
  }

  const content = buildRuleTriggerMessage(rule, result, meeting);

  try {
    const apiBase = window.API_BASE || '';
    const res = await fetch(`${apiBase}/api/notify/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: url,
        payload: {
          msgtype: 'markdown',
          markdown: { content },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { success: false, error: `HTTP ${res.status}: ${text}` };
    }

    return { success: true, error: '' };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * 批量发送规则触发通知
 * @param {Object} rule
 * @param {Object[]} resultsWithMeetings - { result, meeting }
 * @returns {Promise<Object[]>}
 */
export async function sendRuleTriggerNotifications(rule, resultsWithMeetings) {
  const config = loadNotificationConfig();
  const webhookId = rule?.action?.notifyWebhookId;
  const url = resolveWebhookUrl(config, webhookId);

  if (!url) {
    return resultsWithMeetings.map(() => ({ success: false, error: '未配置企业微信 webhook' }));
  }

  const promises = resultsWithMeetings.map(({ result, meeting }) =>
    sendRuleTriggerNotification(rule, result, meeting, url)
  );

  return Promise.all(promises);
}

/**
 * 解析 webhook URL
 * @param {Object} config
 * @param {string} webhookId
 * @returns {string|null}
 */
function resolveWebhookUrl(config, webhookId) {
  const webhooks = config?.webhooks || [];

  if (webhookId) {
    const found = webhooks.find((w) => w.id === webhookId || w.name === webhookId);
    if (found?.url) return found.url;
  }

  // 返回第一个可用 webhook
  const first = webhooks.find((w) => w.url);
  return first?.url || null;
}

/**
 * 检查通知是否启用
 * @param {Object} rule
 * @returns {boolean}
 */
export function isNotificationEnabled(rule) {
  if (!rule?.action?.notify) return false;
  const config = loadNotificationConfig();
  return config?.enabledTypes?.rule !== false;
}
