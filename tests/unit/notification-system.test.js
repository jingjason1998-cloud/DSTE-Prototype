import { describe, it, expect, vi, beforeEach } from 'vitest';

const storageMap = new Map();

const elements = {};

globalThis.window = {
  API_BASE: 'https://dste-api.example.com',
  showToast: vi.fn(),
  AGENDA_TYPE_LABELS: { goal_management: '目标管理' },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  location: { hostname: 'localhost' },
};

globalThis.DSTE = {
  Storage: {
    get: (key, def) => (storageMap.has(key) ? storageMap.get(key) : def),
    set: (key, val) => storageMap.set(key, val),
    getString: (key) => storageMap.get(key) || '',
  },
};

globalThis.document = {
  getElementById: vi.fn((id) => {
    if (!elements[id]) {
      elements[id] = { style: {}, textContent: '', innerHTML: '', value: '', checked: false };
    }
    return elements[id];
  }),
  querySelector: vi.fn(() => null),
  querySelectorAll: vi.fn(() => []),
  addEventListener: vi.fn(),
};

globalThis.fetch = vi.fn();

const ns = await import('../../src/meetings/renderers/notification-system.js');

describe('loadNotificationConfig', () => {
  beforeEach(() => {
    storageMap.clear();
    elements['notif-webhooks-list'] = { style: {}, textContent: '', innerHTML: '', value: '', checked: false };
  });

  it('returns default config when empty', () => {
    const cfg = ns.loadNotificationConfig();
    expect(cfg.webhooks).toEqual([]);
    expect(cfg.enabledTypes).toEqual({ resolution: true, todo: true, alert: true, agenda: true });
    expect(cfg.mentionAll).toBe(false);
    expect(cfg.lastSent).toEqual([]);
  });

  it('migrates old single webhookUrl to webhooks array', () => {
    storageMap.set('dste_notification_config', {
      webhookUrl: 'https://old.webhook.url',
      enabledTypes: { resolution: true },
      mentionAll: true,
    });
    const cfg = ns.loadNotificationConfig();
    expect(cfg.webhooks).toEqual([{ id: '1', name: '默认群', url: 'https://old.webhook.url' }]);
    expect(cfg.webhookUrl).toBeUndefined();
    expect(cfg.enabledTypes).toEqual({ resolution: true });
    expect(cfg.mentionAll).toBe(true);
  });
});

describe('saveNotificationConfig', () => {
  beforeEach(() => {
    storageMap.clear();
  });

  it('persists config', () => {
    const cfg = { webhooks: [{ id: '1', name: '群1', url: 'https://a.com' }], enabledTypes: { resolution: true } };
    ns.saveNotificationConfig(cfg);
    const stored = storageMap.get('dste_notification_config');
    expect(stored).toEqual(cfg);
  });
});

describe('sendWeComNotification', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.resetAllMocks();
  });

  it('returns error when no webhookUrl', async () => {
    const res = await ns.sendWeComNotification('resolution', { meetingTitle: 'M', content: 'C', owner: 'O', deadline: 'D', status: 'approved' }, '');
    expect(res.success).toBe(false);
    expect(res.msg).toBe('未选择发送目标');
    expect(window.showToast).toHaveBeenCalledWith('请先选择发送目标群', 'warning');
  });

  it('returns error when type is disabled', async () => {
    storageMap.set('dste_notification_config', {
      webhooks: [{ id: '1', name: '群', url: 'https://w.com' }],
      enabledTypes: { resolution: false, todo: true, alert: true, agenda: true },
      mentionAll: false,
      lastSent: [],
    });
    const res = await ns.sendWeComNotification('resolution', { meetingTitle: 'M', content: 'C', owner: 'O', deadline: 'D', status: 'approved' }, 'https://w.com');
    expect(res.success).toBe(false);
    expect(res.msg).toBe('该类型推送已禁用');
  });

  it('sends request and records success', async () => {
    storageMap.set('dste_notification_config', {
      webhooks: [{ id: '1', name: '群', url: 'https://w.com' }],
      enabledTypes: { resolution: true, todo: true, alert: true, agenda: true },
      mentionAll: false,
      lastSent: [],
    });
    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ success: true, errmsg: 'ok' }),
    });
    const res = await ns.sendWeComNotification('resolution', { meetingTitle: 'M', content: 'C', owner: 'O', deadline: 'D', status: 'approved' }, 'https://w.com');
    expect(res.success).toBe(true);
    expect(res.msg).toBe('ok');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://dste-api.example.com/api/notify/proxy',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('https://w.com'),
      })
    );
    const cfg = storageMap.get('dste_notification_config');
    expect(cfg.lastSent.length).toBe(1);
    expect(cfg.lastSent[0].status).toBe('success');
  });

  it('records failure on network error', async () => {
    storageMap.set('dste_notification_config', {
      webhooks: [{ id: '1', name: '群', url: 'https://w.com' }],
      enabledTypes: { resolution: true, todo: true, alert: true, agenda: true },
      mentionAll: false,
      lastSent: [],
    });
    globalThis.fetch.mockRejectedValueOnce(new Error('Network failure'));
    const res = await ns.sendWeComNotification('resolution', { meetingTitle: 'M', content: 'C', owner: 'O', deadline: 'D', status: 'approved' }, 'https://w.com');
    expect(res.success).toBe(false);
    expect(res.msg).toBe('Network failure');
    const cfg = storageMap.get('dste_notification_config');
    expect(cfg.lastSent.length).toBe(1);
    expect(cfg.lastSent[0].status).toBe('failed');
    expect(cfg.lastSent[0].error).toBe('Network failure');
  });
});

describe('openWebhookSelector', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.resetAllMocks();
    elements['webhook-selector-list'] = { style: {}, textContent: '', innerHTML: '', value: '', checked: false };
    elements['webhook-selector-overlay'] = { style: {}, textContent: '', innerHTML: '', value: '', checked: false };
  });

  it('opens config when no webhooks', () => {
    storageMap.set('dste_notification_config', {
      webhooks: [],
      enabledTypes: { resolution: true, todo: true, alert: true, agenda: true },
      mentionAll: false,
      lastSent: [],
    });
    ns.openWebhookSelector('resolution', { meetingTitle: 'M', content: 'C' });
    expect(window.showToast).toHaveBeenCalledWith('请先配置企业微信群 Webhook', 'warning');
  });

  it('auto-sends when one webhook', async () => {
    storageMap.set('dste_notification_config', {
      webhooks: [{ id: '1', name: '群1', url: 'https://w.com' }],
      enabledTypes: { resolution: true, todo: true, alert: true, agenda: true },
      mentionAll: false,
      lastSent: [],
    });
    globalThis.fetch.mockResolvedValueOnce({
      json: async () => ({ success: true, errmsg: 'ok' }),
    });
    ns.openWebhookSelector('resolution', { meetingTitle: 'M', content: 'C', owner: 'O', deadline: 'D', status: 'approved' });
    await vi.waitFor(() => expect(window.showToast).toHaveBeenCalled());
    expect(window.showToast).toHaveBeenCalledWith(expect.stringContaining('发送成功'), 'success');
  });
});

describe('renderWebhookConfigList', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.resetAllMocks();
    elements['notif-webhooks-list'] = { style: {}, textContent: '', innerHTML: '', value: '', checked: false };
  });

  it('renders rows for existing webhooks', () => {
    const webhooks = [
      { id: '1', name: '群1', url: 'https://w1.com' },
      { id: '2', name: '群2', url: 'https://w2.com' },
    ];
    ns.renderWebhookConfigList(webhooks);
    const container = elements['notif-webhooks-list'];
    expect(container.innerHTML).toContain('群1');
    expect(container.innerHTML).toContain('https://w1.com');
    expect(container.innerHTML).toContain('群2');
    expect(container.innerHTML).toContain('https://w2.com');
    expect(container.innerHTML).toContain('webhook-row');
  });

  it('renders empty tip when none', () => {
    ns.renderWebhookConfigList([]);
    const container = elements['notif-webhooks-list'];
    expect(container.innerHTML).toContain('暂无 Webhook');
  });
});
