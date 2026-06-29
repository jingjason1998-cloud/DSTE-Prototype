/**
 * DSTE 统一 AI 客户端
 *
 * 封装所有前端 AI 调用：聊天、流式输出、工具调用、会话管理、降级。
 * 所有能力统一走 Kimi（kimi-k2.6），后端通过 meetingReviewerProxyUrl 或 dste_api_base 配置。
 */

import { Storage } from './utils.js';

const DEFAULT_API_BASE = 'https://dste-api.jasonxspace.workers.dev';
const SESSIONS_KEY = 'dste_ai_sessions_v1';
const CURRENT_SESSION_KEY = 'dste_ai_current_session_v1';
const MAX_HISTORY_ROUNDS = 10;

/**
 * 获取 AI 网关地址
 * 优先级：localStorage.meetingReviewerProxyUrl > localStorage.dste_api_base > 默认 Worker
 */
export function getAIGatewayUrl() {
  const proxy = Storage.getString('meetingReviewerProxyUrl', '').replace(/\/$/, '');
  if (proxy) return proxy;
  const base = Storage.getString('dste_api_base', '').replace(/\/$/, '');
  if (base) return base;
  return DEFAULT_API_BASE;
}

export const AITools = {
  navigateTo: {
    type: 'function',
    function: {
      name: 'navigateTo',
      description: '跳转到 DSTE 的某个页面',
      parameters: {
        type: 'object',
        properties: {
          pageId: {
            type: 'string',
            description: '页面 ID，例如 dashboard、exe/tasks、bp/annual-plan',
          },
        },
        required: ['pageId'],
      },
    },
  },
  searchKms: {
    type: 'function',
    function: {
      name: 'searchKms',
      description: '搜索帆软 KMS 知识库',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词',
          },
          limit: {
            type: 'number',
            description: '返回条数，默认 3',
          },
        },
        required: ['query'],
      },
    },
  },
};

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class AISession {
  constructor(id = generateId('ai_session')) {
    this.id = id;
    this.title = '';
    this.messages = [];
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
  }

  addMessage(role, content, meta = {}) {
    const message = {
      id: generateId('msg'),
      role,
      content: content || '',
      createdAt: new Date().toISOString(),
      ...meta,
    };
    this.messages.push(message);
    this.updatedAt = message.createdAt;

    if (role === 'user' && !this.title && content) {
      this.title = String(content).slice(0, 20).replace(/\n/g, ' ') || '新会话';
    }

    this._truncate();
    return message;
  }

  getMessages(includeSystem = true) {
    if (!includeSystem) {
      return this.messages.filter((m) => m.role !== 'system');
    }
    return this.messages;
  }

  toKimiFormat(includeSystem = true) {
    return this.getMessages(includeSystem).map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.name ? { name: m.name } : {}),
      ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
      ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
    }));
  }

  clear() {
    this.messages = [];
    this.title = '';
    this.updatedAt = new Date().toISOString();
  }

  _truncate() {
    const rounds = this.messages.filter((m) => m.role === 'user').length;
    if (rounds <= MAX_HISTORY_ROUNDS) return;

    // 保留 system 和最近 N 轮 user/assistant
    const systemMessages = this.messages.filter((m) => m.role === 'system');
    const others = this.messages.filter((m) => m.role !== 'system');
    const keepCount = MAX_HISTORY_ROUNDS * 2;
    const kept = others.slice(-keepCount);
    this.messages = [...systemMessages, ...kept];
  }
}

export class AIClient {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || getAIGatewayUrl()).replace(/\/$/, '');
    this.apiKey = options.apiKey || Storage.getString('kimi_api_key', '');
    this.model = options.model || 'kimi-k2.6';
    this.timeout = options.timeout || 60000;
  }

  // ========== 会话管理 ==========

  createSession() {
    const sessions = this._loadSessions();
    const session = new AISession();
    sessions.unshift(session);
    this._saveSessions(sessions);
    this._setCurrentSessionId(session.id);
    return session;
  }

  getCurrentSession() {
    const id = Storage.getString(CURRENT_SESSION_KEY, '');
    if (!id) return this.createSession();
    const sessions = this._loadSessions();
    const session = sessions.find((s) => s.id === id);
    if (!session) return this.createSession();
    return this._hydrate(session);
  }

  switchSession(id) {
    const sessions = this._loadSessions();
    if (!sessions.some((s) => s.id === id)) return null;
    this._setCurrentSessionId(id);
    return this.getCurrentSession();
  }

  listSessions() {
    return this._loadSessions().map((s) => this._hydrate(s));
  }

  deleteSession(id) {
    let sessions = this._loadSessions();
    sessions = sessions.filter((s) => s.id !== id);
    this._saveSessions(sessions);
    const currentId = Storage.getString(CURRENT_SESSION_KEY, '');
    if (currentId === id) {
      this._setCurrentSessionId(sessions[0]?.id || '');
    }
  }

  saveSession(session) {
    const sessions = this._loadSessions();
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.unshift(session);
    }
    this._saveSessions(sessions);
  }

  // ========== 聊天 API ==========

  /**
   * 非流式聊天
   * @param {string} message 用户消息
   * @param {Object} options
   * @param {string} options.systemPrompt 系统提示词
   * @param {Object} options.context 业务上下文（会被格式化为文本注入 system）
   * @param {AISession} options.session 当前会话
   * @param {Array} options.tools 可用工具定义
   * @returns {Promise<{ content: string, toolCalls?: Array, mock?: boolean }>}
   */
  async chat(message, options = {}) {
    const session = options.session || this.getCurrentSession();
    const messages = this._buildMessages(message, session, options);
    const response = await this._post('/api/ai/chat', {
      messages,
      tools: options.tools,
      stream: false,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    });

    const assistantContent = response.choices?.[0]?.message?.content || '';
    const toolCalls = response.choices?.[0]?.message?.tool_calls;

    session.addMessage('user', message);
    session.addMessage('assistant', assistantContent, { tool_calls: toolCalls });
    this.saveSession(session);

    return {
      content: assistantContent,
      toolCalls,
      mock: !!response.mock,
    };
  }

  /**
   * 流式聊天
   * @returns {AsyncIterable<{ content: string, done: boolean, toolCalls?: Array }>}
   */
  async *streamChat(message, options = {}) {
    const session = options.session || this.getCurrentSession();
    const messages = this._buildMessages(message, session, options);

    const url = `${this.baseUrl}/api/ai/chat`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const resp = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          messages,
          tools: options.tools,
          stream: true,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
        }),
      });

      clearTimeout(timeoutId);

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`AI request failed: ${resp.status} ${errText}`);
      }

      if (!resp.body) {
        throw new Error('AI response body is empty');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let toolCalls = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') continue;

          try {
            const data = JSON.parse(dataStr);
            const delta = data.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
              fullContent += delta.content;
              yield { content: delta.content, done: false };
            }

            if (delta.tool_calls) {
              toolCalls = toolCalls || [];
              toolCalls.push(...delta.tool_calls);
            }
          } catch (e) {
            // ignore malformed SSE lines
          }
        }
      }

      session.addMessage('user', message);
      session.addMessage('assistant', fullContent, { tool_calls: toolCalls });
      this.saveSession(session);

      yield { content: '', done: true, toolCalls };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  /**
   * 带工具调用的聊天（自动执行已知工具并返回最终回复）
   */
  async callWithTools(message, tools = [AITools.navigateTo, AITools.searchKms], options = {}) {
    const first = await this.chat(message, { ...options, tools });

    if (!first.toolCalls || first.toolCalls.length === 0) {
      return first;
    }

    // 执行已知工具
    const toolResults = [];
    for (const call of first.toolCalls) {
      const result = await this._executeTool(call);
      toolResults.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }

    // 把工具结果追加到会话再请求一次
    const session = options.session || this.getCurrentSession();
    toolResults.forEach((r) => session.addMessage(r.role, r.content, { tool_call_id: r.tool_call_id }));
    this.saveSession(session);

    return this.chat('请基于工具返回结果继续回答。', { ...options, session, tools: [] });
  }

  // ========== 工具执行 ==========

  async _executeTool(toolCall) {
    const name = toolCall.function?.name;
    let args = {};
    try {
      args = JSON.parse(toolCall.function?.arguments || '{}');
    } catch (e) {
      args = {};
    }

    if (name === 'navigateTo') {
      const pageId = args.pageId;
      if (typeof window !== 'undefined' && pageId) {
        window.location.hash = pageId;
      }
      return { success: true, action: 'navigateTo', pageId };
    }

    if (name === 'searchKms') {
      try {
        const resp = await fetch(`${this.baseUrl}/api/ai/kms-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: args.query || '', limit: args.limit || 3 }),
        });
        const data = await resp.json();
        return { success: true, snippets: data.snippets || [] };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    return { success: false, error: `Unknown tool: ${name}` };
  }

  // ========== 通用请求 ==========

  /**
   * 向 AI 网关发送通用 POST 请求
   * @param {string} endpoint - 端点路径（如 /api/ai/agenda）
   * @param {Object} body - 请求体
   * @param {Object} [options]
   * @param {number} [options.timeout] - 自定义超时（毫秒）
   * @returns {Promise<Object>}
   */
  async request(endpoint, body, options = {}) {
    return this._post(endpoint, body, options.timeout);
  }

  // ========== 内部方法 ==========

  _buildMessages(message, session, options) {
    const systemParts = [];
    if (options.systemPrompt) {
      systemParts.push(options.systemPrompt);
    }
    if (options.context) {
      systemParts.push('### 当前业务上下文\n' + this._formatContext(options.context));
    }

    const messages = [];
    if (systemParts.length > 0) {
      messages.push({ role: 'system', content: systemParts.join('\n\n') });
    }

    // 保留会话历史，但避免重复 system
    const history = session.toKimiFormat(false);
    messages.push(...history);
    messages.push({ role: 'user', content: message });

    return messages;
  }

  _formatContext(context) {
    if (typeof context === 'string') return context;
    try {
      return JSON.stringify(context, null, 2);
    } catch (e) {
      return String(context);
    }
  }

  async _post(endpoint, body, timeout = this.timeout) {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const resp = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
      });

      clearTimeout(timeoutId);

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`AI request failed: ${resp.status} ${errText}`);
      }

      return await resp.json();
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  _loadSessions() {
    const sessions = Storage.get(SESSIONS_KEY, []);
    return Array.isArray(sessions) ? sessions : [];
  }

  _saveSessions(sessions) {
    Storage.set(SESSIONS_KEY, sessions);
  }

  _setCurrentSessionId(id) {
    Storage.setString(CURRENT_SESSION_KEY, id);
  }

  _hydrate(raw) {
    const session = new AISession(raw.id);
    session.title = raw.title || '';
    session.messages = Array.isArray(raw.messages) ? raw.messages : [];
    session.createdAt = raw.createdAt || new Date().toISOString();
    session.updatedAt = raw.updatedAt || session.createdAt;
    return session;
  }
}

export default AIClient;
