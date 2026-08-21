/**
 * DSTE 统一 AI 客户端
 *
 * 封装所有前端 AI 调用：聊天、流式输出、工具调用、会话管理、降级。
 * 所有能力统一走 Kimi（kimi-k2.6），后端通过 meetingReviewerProxyUrl 或 dste_api_base 配置。
 */

import { Storage } from './utils.js';
import { fetchWithRetry } from './fetch-retry.js';
import { AIError } from './ai-error.js';
import { logAiEvent } from './ai-telemetry.js';

const DEFAULT_API_BASE = ''; // 生产环境走同域 /api/ 代理
const SESSIONS_KEY = 'dste_ai_sessions_v2';
const CURRENT_SESSION_KEY = 'dste_ai_current_session_v2';
const MAX_HISTORY_ROUNDS = 10;

/**
 * 清洗 tool_calls 与 tool 消息的配对关系。
 * Kimi 要求每个 tool 消息的 tool_call_id 必须能在某个 assistant.tool_calls 中找到，
 * 且 assistant 保留下来的每个 tool_call 都必须有对应 tool 响应，
 * 否则返回 400 "tool_call_id is not found"（Worker 映射为 502）。
 * 会话截断（_truncate 按消息数切片）可能把工具调用组拦腰切断，
 * 历史已污染的会话也需要在发送前（toKimiFormat）自愈。
 */
function sanitizeToolCallPairing(messages) {
  const respondedIds = new Set();
  messages.forEach((m) => {
    if (m.role === 'tool' && m.tool_call_id) respondedIds.add(m.tool_call_id);
  });

  // assistant：只保留有 tool 响应的 tool_calls；一个都不剩的摘掉 tool_calls，
  // 内容也为空的整条丢弃（截断残留的“空壳”）
  const withoutDanglingCalls = [];
  messages.forEach((m) => {
    if (m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
      const keptCalls = m.tool_calls.filter((tc) => tc && tc.id && respondedIds.has(tc.id));
      if (keptCalls.length === 0) {
        const rest = { ...m };
        delete rest.tool_calls;
        if (String(rest.content || '').trim() !== '') withoutDanglingCalls.push(rest);
        return;
      }
      withoutDanglingCalls.push(
        keptCalls.length === m.tool_calls.length ? m : { ...m, tool_calls: keptCalls },
      );
      return;
    }
    withoutDanglingCalls.push(m);
  });

  // tool：丢弃找不到对应 assistant tool_call 的孤儿消息
  const declaredIds = new Set();
  withoutDanglingCalls.forEach((m) => {
    if (m.role === 'assistant' && Array.isArray(m.tool_calls)) {
      m.tool_calls.forEach((tc) => {
        if (tc && tc.id) declaredIds.add(tc.id);
      });
    }
  });
  return withoutDanglingCalls.filter((m) => m.role !== 'tool' || declaredIds.has(m.tool_call_id));
}

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
      description: '搜索帆软 KMS 知识库，返回相关页面标题、链接和摘要片段',
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
  queryMeetingAgenda: {
    type: 'function',
    function: {
      name: 'queryMeetingAgenda',
      description: '查询指定会议的议程项列表',
      parameters: {
        type: 'object',
        properties: {
          meetingId: {
            type: 'string',
            description: '会议 ID',
          },
        },
        required: ['meetingId'],
      },
    },
  },
  queryMeetingActions: {
    type: 'function',
    function: {
      name: 'queryMeetingActions',
      description: '查询指定会议的行动项列表',
      parameters: {
        type: 'object',
        properties: {
          meetingId: {
            type: 'string',
            description: '会议 ID',
          },
        },
        required: ['meetingId'],
      },
    },
  },
  queryMeetingResolutions: {
    type: 'function',
    function: {
      name: 'queryMeetingResolutions',
      description: '查询指定会议的决议列表',
      parameters: {
        type: 'object',
        properties: {
          meetingId: {
            type: 'string',
            description: '会议 ID',
          },
        },
        required: ['meetingId'],
      },
    },
  },
  createActionItem: {
    type: 'function',
    function: {
      name: 'createActionItem',
      description: '为用户草拟一个会议行动项。此工具不会直接写入系统，只会生成草案等待用户确认',
      parameters: {
        type: 'object',
        properties: {
          meetingId: {
            type: 'string',
            description: '会议 ID',
          },
          content: {
            type: 'string',
            description: '行动项具体内容',
          },
          owner: {
            type: 'string',
            description: '负责人姓名或工号，可选',
          },
          deadline: {
            type: 'string',
            description: '截止日期，格式 YYYY-MM-DD，可选',
          },
        },
        required: ['meetingId', 'content'],
      },
    },
  },
  createMeeting: {
    type: 'function',
    function: {
      name: 'createMeeting',
      description: '为用户草拟一场新会议。此工具不会直接写入系统，只会生成会议草案等待用户确认',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '会议标题',
          },
          date: {
            type: 'string',
            description: '会议日期，格式 YYYY-MM-DD，可选，默认今天',
          },
          scenario: {
            type: 'string',
            description: '会议场景，可选值：union_quarterly/hq_routine/region_routine/lagging_region/lagging_vertical，可选',
          },
          level: {
            type: 'string',
            description: '会议层级，可选值：L1/L2/L3，可选',
          },
          host: {
            type: 'string',
            description: '主持人姓名，可选',
          },
          location: {
            type: 'string',
            description: '会议地点，可选',
          },
        },
        required: ['title'],
      },
    },
  },
};

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 解析错误响应体：提取人类可读 message 与 Worker 透传的 errorType/upstreamStatus（RFC-011）。
 */
function parseErrorBody(status, errText) {
  try {
    const errJson = JSON.parse(errText);
    return {
      message: errJson.error || `AI request failed: ${status} ${errText}`,
      errorType: errJson.errorType || null,
      upstreamStatus: errJson.upstreamStatus || null,
    };
  } catch (e) {
    return { message: `AI request failed: ${status} ${errText}`, errorType: null, upstreamStatus: null };
  }
}

/**
 * 根据 HTTP 状态构造 AIError。
 * 401 会触发全局登录过期事件。
 */
function createAIError(status, message, extras = {}) {
  let err;
  if (status === 401) {
    err = AIError.authExpired(message || '登录已过期，请重新登录');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dste:auth-expired', { detail: { source: 'AIClient' } }));
      if (typeof window.showToast === 'function') {
        window.showToast('登录已过期，请重新登录后 AI 请求将自动恢复', 'error');
      }
    }
  } else if (status === 408) {
    err = AIError.timeout(message || 'AI 请求超时');
  } else if (status === 429) {
    err = AIError.rateLimit(message || 'AI 服务限流，请稍后重试');
  } else if (status >= 500) {
    err = AIError.server(message || `AI 服务异常：${status}`, { status });
  } else {
    err = new AIError(message || `AI request failed: ${status}`, { status });
  }
  if (extras.errorType) err.errorType = extras.errorType;
  if (extras.upstreamStatus) err.upstreamStatus = extras.upstreamStatus;
  return err;
}

/**
 * 组合外部 signal 与内部 AbortController。
 * 任一方触发 abort，返回的 signal 都会触发。
 */
function composeSignal(controller, externalSignal) {
  if (!externalSignal) return controller.signal;
  if (typeof AbortSignal !== 'undefined' && AbortSignal.any) {
    return AbortSignal.any([controller.signal, externalSignal]);
  }
  // 降级：外部 abort 时同时取消内部 controller
  const handler = () => controller.abort(externalSignal.reason);
  externalSignal.addEventListener('abort', handler, { once: true });
  return controller.signal;
}

/**
 * 生成唯一的 tool-call id 前缀，防止同一会话多轮工具调用时出现重复 id。
 */
function makeToolCallIdPrefix() {
  return `tc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
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
    const paired = sanitizeToolCallPairing(this.getMessages(includeSystem));
    return paired.map((m) => ({
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
    // 切片可能把工具调用组拦腰切断（assistant.tool_calls 被裁掉、tool 消息留下），
    // 必须重新配对，否则 Kimi 报 400 tool_call_id is not found
    this.messages = sanitizeToolCallPairing([...systemMessages, ...kept]);
  }
}

export class AIClient {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || getAIGatewayUrl()).replace(/\/$/, '');
    this.token = options.token || Storage.getString('dste-token', '');
    this.model = options.model || 'kimi-k2.7-code-highspeed';
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
    let response;
    try {
      response = await this._chatRequest(message, session, options);
    } catch (err) {
      if (err?.errorType !== 'invalid_request') throw err;
      // 会话历史被 Kimi 协议校验拒绝（RFC-011）：重置会话历史后重试一次，
      // 避免坏历史持久化在 localStorage 导致会话永久不可用（v0.7.32 教训）
      session.clear();
      this.saveSession(session);
      response = await this._chatRequest(message, session, options);
    }

    const assistantContent = response.choices?.[0]?.message?.content || '';
    const rawToolCalls = response.choices?.[0]?.message?.tool_calls;
    const toolCallPrefix = Array.isArray(rawToolCalls) && rawToolCalls.length > 0 ? makeToolCallIdPrefix() : null;
    const toolCalls = toolCallPrefix
      ? rawToolCalls.map((tc) => ({ ...tc, id: `${toolCallPrefix}_${tc.id}` }))
      : rawToolCalls;

    session.addMessage('user', message, options.userMessageHidden ? { hidden: true } : {});
    session.addMessage('assistant', assistantContent, { tool_calls: toolCalls });
    this.saveSession(session);

    return {
      content: assistantContent,
      toolCalls,
      mock: !!response.mock,
    };
  }

  /**
   * chat 的底层请求：构造 messages 并 POST /api/ai/chat。
   */
  async _chatRequest(message, session, options = {}) {
    const messages = this._buildMessages(message, session, options);
    return this._post('/api/ai/chat', {
      messages,
      tools: options.tools,
      stream: false,
      model: this.model,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    }, { signal: options.signal });
  }

  /**
   * 带超时的 fetch（RFC-011）：
   * - 每次 attempt 独立 AbortController，内部超时 abort 带 reason 'timeout'
   * - 内部超时自动重试 1 次；用户主动取消（externalSignal）立即抛出，不重试
   */
  async _fetchWithTimeout(url, fetchOptions, timeout, externalSignal) {
    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (externalSignal?.aborted) {
        const aborted = new Error('Aborted');
        aborted.name = 'AbortError';
        throw aborted;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort('timeout'), timeout);
      const signal = composeSignal(controller, externalSignal);
      try {
        return await fetchWithRetry(url, { ...fetchOptions, signal });
      } catch (err) {
        if (externalSignal?.aborted) throw err; // 用户取消，不重试
        if (controller.signal.aborted) {
          lastErr = AIError.timeout('AI 请求超时');
          lastErr.errorType = 'timeout';
          continue;
        }
        // fetchWithRetry 对可重试状态码（429/5xx）重试耗尽后抛出 Error 并附带 response；
        // 交还响应给调用方，由调用方解析响应体（errorType/upstreamStatus 在里面）
        if (err?.response) return err.response;
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    }
    throw lastErr;
  }

  /**
   * 流式请求：POST /api/ai/chat（stream: true），返回原始 Response。
   */
  async _streamRequest(messages, options = {}) {
    const resp = await this._fetchWithTimeout(`${this.baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({
        messages,
        tools: options.tools,
        stream: true,
        model: this.model,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
      }),
    }, options.timeout ?? this.timeout, options.signal);

    if (!resp.ok) {
      const errText = await resp.text();
      const parsed = parseErrorBody(resp.status, errText);
      throw createAIError(resp.status, parsed.message, parsed);
    }
    return resp;
  }

  /**
   * 流式聊天
   * @param {Object} options
   * @param {boolean} options.skipUserAppend 为 true 时不自动追加 user 消息（调用方已自行追加）
   * @param {AbortSignal} [options.signal] 外部取消信号
   * @returns {AsyncIterable<{ content: string, done: boolean, toolCalls?: Array }>}
   */
  async *streamChat(message, options = {}) {
    const session = options.session || this.getCurrentSession();
    const skipUserAppend = options.skipUserAppend;
    const start = performance.now();
    let tokenCount = 0;
    let reader = null;

    try {
      let resp;
      try {
        resp = await this._streamRequest(this._buildMessages(message, session, options), options);
      } catch (err) {
        if (err?.errorType !== 'invalid_request') throw err;
        // 会话历史被 Kimi 协议校验拒绝（RFC-011）：重置会话后重试一次
        session.clear();
        this.saveSession(session);
        resp = await this._streamRequest(this._buildMessages(message, session, options), options);
      }

      if (!resp.body) {
        throw new Error('AI response body is empty');
      }

      reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      const toolCallAcc = [];

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
              tokenCount += delta.content.length;
              yield { content: delta.content, done: false };
            }

            if (Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                this._mergeToolCallDelta(toolCallAcc, tc);
              }
            }
          } catch (e) {
            // ignore malformed SSE lines
          }
        }
      }

      const toolCallPrefix = toolCallAcc.length > 0 ? makeToolCallIdPrefix() : null;
      const finalToolCalls = toolCallAcc.length > 0
        ? toolCallAcc.map((tc) => ({ ...tc, id: `${toolCallPrefix}_${tc.id}` }))
        : null;
      if (!skipUserAppend) {
        session.addMessage('user', message);
      }
      session.addMessage('assistant', fullContent, { tool_calls: finalToolCalls });
      this.saveSession(session);

      logAiEvent({
        type: 'chat',
        endpoint: '/api/ai/chat',
        model: this.model,
        latencyMs: Math.round(performance.now() - start),
        tokenCount,
      });

      yield { content: '', done: true, toolCalls: finalToolCalls };
    } catch (err) {
      logAiEvent({
        type: 'error',
        endpoint: '/api/ai/chat',
        model: this.model,
        latencyMs: Math.round(performance.now() - start),
        errorCode: err.code || err.name || 'UNKNOWN',
        errorType: err.errorType || null,
      });
      throw err;
    } finally {
      if (reader) {
        try { reader.releaseLock(); } catch (_) { /* ignore */ }
      }
    }
  }

  /**
   * 带工具调用的聊天（自动执行已知工具并返回最终回复）
   */
  async callWithTools(message, tools = [AITools.navigateTo, AITools.searchKms], options = {}) {
    const first = await this.chat(message, { ...options, tools });

    if (!first.toolCalls || first.toolCalls.length === 0) {
      return { content: first.content || '', toolResults: [] };
    }

    const session = options.session || this.getCurrentSession();
    return this.runToolLoop(session, first.toolCalls, tools, options);
  }

  /**
   * 多轮工具调用 loop（RFC-011 P1-1）。
   * 执行首轮 toolCalls → 结果写回会话 → 再请求模型；模型继续调用工具则循环，
   * 直到给出最终回答或达到 maxToolRounds（最后一轮不再提供 tools，强制收尾）。
   * GlobalAiDrawer（流式首轮）与 callWithTools（非流式）共用此实现。
   *
   * @param {AISession} session
   * @param {Array} firstToolCalls 首轮返回的 tool_calls
   * @param {Array} tools 可用工具定义
   * @param {Object} options { toolContext, signal, maxToolRounds=4, systemPrompt, context, ... }
   * @returns {Promise<{ content: string, toolResults: Array }>}
   */
  async runToolLoop(session, firstToolCalls, tools, options = {}) {
    const maxRounds = options.maxToolRounds ?? 4;
    const toolContext = options.toolContext || {};
    const toolResults = [];
    let toolCalls = firstToolCalls;
    let content = '';

    for (let round = 1; round <= maxRounds && toolCalls && toolCalls.length > 0; round++) {
      if (options.signal?.aborted) break;

      for (const call of toolCalls) {
        const result = await this._executeTool(call, toolContext, { signal: options.signal });
        toolResults.push({ call, result });
        session.addMessage('tool', JSON.stringify(result), { tool_call_id: call.id });
      }
      this.saveSession(session);

      const isLastRound = round >= maxRounds;
      const followup = isLastRound
        ? '工具调用次数已达上限，请基于已有信息给出最终回答。'
        : '请基于工具返回结果继续回答；如还需数据可继续调用工具，否则给出最终回答。';
      const next = await this.chat(followup, {
        ...options,
        session,
        tools: isLastRound ? [] : tools,
        userMessageHidden: true,
      });
      content = next.content || content;
      toolCalls = next.toolCalls;
    }

    return { content, toolResults };
  }

  // ========== 工具执行 ==========

  /**
   * 执行 AI 工具调用。
   * - navigateTo 在浏览器本地执行（Worker 无法操作 window.location）。
   * - 其余工具统一 POST 到 Worker 的 /api/ai/tools/execute，由后端 ToolExecutor 处理。
   * @param {Object} toolCall Kimi 返回的 tool_call 对象
   * @param {Object} toolContext 工具执行上下文（如 { meeting }）
   */
  async _executeTool(toolCall, toolContext = {}, options = {}) {
    const name = toolCall.function?.name;
    let args = {};
    try {
      args = JSON.parse(toolCall.function?.arguments || '{}');
    } catch (e) {
      args = {};
    }

    // navigateTo 必须在浏览器端执行
    if (name === 'navigateTo') {
      const pageId = args.pageId;
      if (typeof window !== 'undefined' && pageId) {
        window.location.hash = pageId;
      }
      return { success: true, action: 'navigateTo', pageId };
    }

    // 其他工具统一走 Worker ToolExecutor
    try {
      const resp = await fetchWithRetry(`${this.baseUrl}/api/ai/tools/execute`, {
        method: 'POST',
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        body: JSON.stringify({
          name,
          arguments: args,
          context: toolContext,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return { success: false, error: `Worker tool execution failed: ${resp.status} ${errText}` };
      }

      const data = await resp.json();
      return data.result || { success: false, error: 'Invalid response from Worker' };
    } catch (err) {
      return { success: false, error: err.message };
    }
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
    return this._post(endpoint, body, options);
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

  /**
   * 合并 streaming tool_call 增量。
   * Kimi/OpenAI 的流式 tool_calls 按 index 分片返回，需要把同一 index 的
   * id / type / function.name / function.arguments 累加到一起。
   */
  _mergeToolCallDelta(acc, delta) {
    if (!delta || typeof delta !== 'object') return;

    let target;
    if (typeof delta.index === 'number') {
      target = acc[delta.index];
      if (!target) {
        target = { id: '', type: 'function', function: { name: '', arguments: '' } };
        acc[delta.index] = target;
      }
    } else if (delta.id) {
      target = acc.find((t) => t.id === delta.id);
      if (!target) {
        target = { id: '', type: 'function', function: { name: '', arguments: '' } };
        acc.push(target);
      }
    } else {
      target = { id: '', type: 'function', function: { name: '', arguments: '' } };
      acc.push(target);
    }

    if (delta.id) target.id = delta.id;
    if (delta.type) target.type = delta.type;
    if (delta.function && typeof delta.function === 'object') {
      if (delta.function.name) target.function.name = delta.function.name;
      if (delta.function.arguments) target.function.arguments += delta.function.arguments;
    }
  }

  async _post(endpoint, body, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = typeof options === 'number' ? options : (options.timeout ?? this.timeout);
    const externalSignal = typeof options === 'number' ? null : options.signal;

    const start = performance.now();
    const eventType = endpoint.includes('agenda') ? 'agenda' : endpoint.includes('tools') ? 'tool' : 'chat';

    try {
      const resp = await this._fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        body: JSON.stringify(body),
      }, timeout, externalSignal);

      if (!resp.ok) {
        const errText = await resp.text();
        const parsed = parseErrorBody(resp.status, errText);
        throw createAIError(resp.status, parsed.message, parsed);
      }

      const result = await resp.json();
      logAiEvent({
        type: eventType,
        endpoint,
        model: this.model,
        latencyMs: Math.round(performance.now() - start),
      });
      return result;
    } catch (err) {
      logAiEvent({
        type: 'error',
        endpoint,
        model: this.model,
        latencyMs: Math.round(performance.now() - start),
        errorCode: err.code || err.name || 'UNKNOWN',
        errorType: err.errorType || null,
      });
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
