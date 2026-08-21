/**
 * DSTE 战略管理平台 — Cloudflare Worker API
 * 数据同步后端：业务专题、议题、经营分析会
 */

import { cleanConfluenceHtml, truncateText, splitIntoSemanticChunks } from './kms-utils.js';
import { validateAgendaCandidates } from './schema-validator.js';

const DEFAULT_AI_MODEL = 'kimi-k2.7-code-highspeed';
const AI_MODEL_ALLOWLIST = new Set(['kimi-k2.7-code-highspeed', 'kimi-k2.6']);

const ALLOWED_ORIGINS = [
  'http://localhost:3456',
  'http://localhost:3457',
  'http://localhost:3458',
  'http://localhost:8080',
  'http://localhost:5173',
  'https://dste.fineres.com',
  'https://www.dste.fineres.com',
  'https://dste.jasonxspace.cc',
];

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data, status = 200, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(request),
    },
  });
}

function errorResponse(message, status = 500, request, extra = {}) {
  return jsonResponse({ error: message, ...extra }, status, request);
}

/**
 * 把 Kimi 上游错误分类透传给前端（RFC-011）。
 * 历史教训：上游所有错误一律映射 502，导致同类事故（鉴权/限流/协议 400）反复重新诊断。
 */
function classifyUpstreamStatus(status) {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'ratelimit';
  if (status === 400 || status === 422) return 'invalid_request';
  if (status >= 500) return 'upstream';
  return 'internal';
}

/**
 * 清理发送给 Kimi 的 messages 数组。
 * Kimi 对空/缺失 content 的 system/user/assistant 消息会返回 400，
 * 因此需要：过滤空内容、补全缺失字段、保留带 tool_calls 的 assistant 消息。
 */
function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  const cleaned = messages
    .map((m) => {
      if (!m || typeof m !== 'object') return null;
      const role = String(m.role || '').trim();
      if (!role) return null;

      let content = m.content;
      if (content === undefined || content === null) content = '';
      content = String(content);

      const hasToolCalls = Array.isArray(m.tool_calls) && m.tool_calls.length > 0;

      // assistant 带 tool_calls 时允许空 content，但需补一个空格避免 400
      if (role === 'assistant' && hasToolCalls && content.trim() === '') {
        content = ' ';
      }

      // tool 消息允许空 content，但 content 必须是字符串
      if (role === 'tool') {
        return {
          role,
          content,
          tool_call_id: String(m.tool_call_id || ''),
        };
      }

      // 其余角色空内容直接丢弃；但 assistant 带 tool_calls 时保留（上面已补空格）
      if (content.trim() === '' && !(role === 'assistant' && hasToolCalls)) return null;

      const sanitized = { role, content };
      if (role === 'assistant' && hasToolCalls) {
        sanitized.tool_calls = m.tool_calls;
      }
      if ((role === 'assistant' || role === 'user') && m.name) {
        sanitized.name = String(m.name);
      }
      return sanitized;
    })
    .filter(Boolean);

  // 第二遍：保证 tool_calls 与 tool 消息配对。
  // 前端会话截断可能留下孤儿 tool 消息或没有响应的 tool_calls，
  // Kimi 会返回 400 "tool_call_id is not found"（对调用方表现为 502）。
  const respondedIds = new Set();
  cleaned.forEach((m) => {
    if (m.role === 'tool' && m.tool_call_id) respondedIds.add(m.tool_call_id);
  });
  const withoutDanglingCalls = [];
  cleaned.forEach((m) => {
    if (m.role === 'assistant' && Array.isArray(m.tool_calls)) {
      const keptCalls = m.tool_calls.filter((tc) => tc && tc.id && respondedIds.has(tc.id));
      if (keptCalls.length === 0) {
        // 摘掉 tool_calls 后内容为空（之前补的空格）的“空壳”消息整条丢弃
        if (m.content.trim() !== '') {
          const rest = { role: m.role, content: m.content };
          if (m.name) rest.name = m.name;
          withoutDanglingCalls.push(rest);
        }
        return;
      }
      withoutDanglingCalls.push(
        keptCalls.length === m.tool_calls.length ? m : { ...m, tool_calls: keptCalls },
      );
      return;
    }
    withoutDanglingCalls.push(m);
  });
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

// KV key 常量
const KEYS = {
  topics: 'dste_topics_v2',
  strategyTopics: 'dste_strategy_topics_v2',
  insights: 'dste_insights_v1',
  issues: 'dste_issues_v1',
  meetings: 'dste_meetings_v1',
  // 需求池
  requirements: 'dste_requirements_v1',
  // 人员/组织目录（按用户隔离，前缀 user:{userId}:
  employees: 'dste_employees_v1',
  orgUnits: 'dste_org_units_v1',
  employeeImportMeta: 'dste_employee_import_meta_v1',
  reviewScores: 'dste_review_scores',
  // OMP 数据层
  indicators: 'dste_omp_indicators_v1',
  kpiInstances: 'dste_omp_kpi_instances_v1',
  tasks: 'dste_omp_tasks_v1',
  milestones: 'dste_omp_milestones_v1',
  progressRecords: 'dste_omp_progress_v1',
  cycles: 'dste_cycles_v1',
  // 战略地图
  strategyMaps: 'dste_strategy_maps_v1',
  // 版本审计
  versionAudit: 'dste_version_audit_v1',
  // 目录管理
  catalogs: 'dste_catalogs_v1',
  // SP 战略规划制定
  spCampaigns: 'dste_sp_campaigns_v1',
};

// CAS 配置
const CAS_CONFIG = {
  server: 'https://passport.fanruan.com',
  service: 'https://dste.fineres.com',
};

// Token 有效期（秒）
const TOKEN_TTL = 7200; // 2 小时

// 生成随机 Token
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// 按登录用户生成隔离的 KV key
function getUserKey(auth, baseKey) {
  if (auth && auth.valid && auth.user && auth.user.id) {
    return `user:${auth.user.id}:${baseKey}`;
  }
  return baseKey;
}

// 从请求中提取 Token
function extractToken(request) {
  const auth = request.headers.get('Authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

// 校验 Bearer token 是否有效
async function requireAuth(request, env) {
  const token = extractToken(request);
  if (!token) {
    return { valid: false, error: 'Unauthorized', status: 401 };
  }
  const userJson = await env.DSTE_KV.get(`token:${token}`);
  if (!userJson) {
    return { valid: false, error: 'Token expired', status: 401 };
  }
  try {
    return { valid: true, user: JSON.parse(userJson) };
  } catch (e) {
    return { valid: false, error: 'Invalid token', status: 401 };
  }
}

// AI 端点认证开关（本地开发可关闭）
// TODO: 临时放行生产域名，与前端 isLocalDev CAS 绕过对等；恢复 CAS 认证时一并移除 dste.fineres.com
const AI_AUTH_BYPASS_ORIGINS = ['https://dste.fineres.com'];
async function requireAiAuth(request, env) {
  if (env.AI_AUTH_REQUIRED === 'false') {
    const origin = request.headers.get('Origin') || '';
    if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:') || AI_AUTH_BYPASS_ORIGINS.includes(origin)) {
      return { valid: true, user: null };
    }
  }
  return requireAuth(request, env);
}

// ========== 通用 CRUD 辅助函数（支持单条冲突检测）==========

async function getKvData(env, key, defaultValue) {
  const raw = await env.DSTE_KV.get(key);
  if (!raw) return defaultValue;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return defaultValue;
  }
}

function findItemById(items, id, { idField = 'id' } = {}) {
  if (!Array.isArray(items)) return undefined;
  return items.find(item => item && String(item[idField]) === String(id));
}

function getItem(data, id, { lookupMode = 'array', idField = 'id' } = {}) {
  if (lookupMode === 'map') {
    return data && typeof data === 'object' ? data[id] : undefined;
  }
  if (lookupMode === 'object') {
    return data && String(data[idField]) === String(id) ? data : undefined;
  }
  return findItemById(data, id, { idField });
}

function setItem(data, id, item, { lookupMode = 'array', idField = 'id' } = {}) {
  if (lookupMode === 'map') {
    data[id] = item;
    return data;
  }
  if (lookupMode === 'object') {
    return item;
  }
  const index = data.findIndex(i => i && String(i[idField]) === String(id));
  if (index >= 0) {
    data[index] = item;
  }
  return data;
}

function applyAuditFields(item, user, isCreate = false) {
  const now = Date.now();
  if (isCreate || item.version === undefined) {
    item.version = 1;
    if (!item.createdBy && user) item.createdBy = user.id;
    if (!item.createdAt) item.createdAt = now;
  } else {
    item.version = (Number(item.version) || 0) + 1;
  }
  item.lastModified = now;
  if (user) item.updatedBy = user.id;
  return item;
}

function normalizeArrayItems(items, user) {
  if (!Array.isArray(items)) return items;
  return items.map(item => {
    if (!item || typeof item !== 'object') return item;
    return applyAuditFields({ ...item }, user, item.version === undefined);
  });
}

function checkIfMatch(request, item) {
  const ifMatch = request.headers.get('If-Match');
  if (!ifMatch) return { ok: true }; // 无 If-Match 视为兼容/创建
  const expected = Number(ifMatch);
  const current = Number(item?.version) || 0;
  if (expected !== current) {
    return { ok: false, current };
  }
  return { ok: true };
}

async function handleEntityItem(request, env, options = {}) {
  const { key, id, user, lookupMode = 'array', idField = 'id' } = options;
  if (!user) {
    return errorResponse('Unauthorized', 401, request);
  }

  const defaultValue = lookupMode === 'array' ? [] : {};
  const data = await getKvData(env, key, defaultValue);

  if (request.method === 'GET') {
    const item = getItem(data, id, { lookupMode, idField });
    if (item === undefined) {
      return errorResponse('Not found', 404, request);
    }
    return jsonResponse({ success: true, data: item }, 200, request);
  }

  if (request.method === 'PUT' || request.method === 'PATCH') {
    const body = await request.json();
    const item = getItem(data, id, { lookupMode, idField });
    const isCreate = !item;

    // 无 If-Match 时接受写操作（当前阶段不做冲突拦截）
    if (!isCreate) {
      const match = checkIfMatch(request, item);
      if (!match.ok) {
        return jsonResponse({ success: false, error: 'Conflict', data: item, currentVersion: match.current }, 409, request);
      }
    }

    const updated = request.method === 'PUT'
      ? { ...body, [idField]: id }
      : isCreate
        ? { ...body, [idField]: id }
        : { ...item, ...body, [idField]: id };
    applyAuditFields(updated, user, isCreate);

    let newData;
    if (isCreate && lookupMode === 'array') {
      data.push(updated);
      newData = data;
    } else {
      newData = setItem(data, id, updated, { lookupMode, idField });
    }
    await env.DSTE_KV.put(key, JSON.stringify(newData));
    return jsonResponse({ success: true, data: updated }, isCreate ? 201 : 200, request);
  }

  if (request.method === 'DELETE') {
    const item = getItem(data, id, { lookupMode, idField });
    if (!item) {
      return errorResponse('Not found', 404, request);
    }

    const match = checkIfMatch(request, item);
    if (!match.ok) {
      return jsonResponse({ success: false, error: 'Conflict', data: item, currentVersion: match.current }, 409, request);
    }

    // 硬删除：从数组/object/map 中移除该记录
    let newData;
    if (lookupMode === 'map') {
      newData = { ...data };
      delete newData[id];
      await env.DSTE_KV.put(key, JSON.stringify(newData));
    } else if (lookupMode === 'object') {
      await env.DSTE_KV.delete(key);
      return jsonResponse({ success: true, data: item }, 200, request);
    } else {
      newData = data.filter(i => i && String(i[idField]) !== String(id));
      await env.DSTE_KV.put(key, JSON.stringify(newData));
    }
    return jsonResponse({ success: true, data: item }, 200, request);
  }

  return errorResponse('Method not allowed', 405, request);
}

// CAS Ticket 验证
async function validateCasTicket(ticket, service) {
  const validateUrl = `${CAS_CONFIG.server}/cas/serviceValidate?service=${encodeURIComponent(service)}&ticket=${encodeURIComponent(ticket)}`;
  const response = await fetch(validateUrl, { method: 'GET' });
  const text = await response.text();

  // 尝试 JSON 解析（通行证可能返回 JSON）
  try {
    const json = JSON.parse(text);
    if (json.serviceResponse?.authenticationSuccess) {
      const success = json.serviceResponse.authenticationSuccess;
      const attrs = success.attributes || {};
      return {
        valid: true,
        user: {
          id: String(success.user || attrs.id?.[0] || ''),
          username: attrs.username?.[0] || success.user || '',
          name: attrs.name?.[0] || attrs.username?.[0] || success.user || '',
          email: attrs.email?.[0] || '',
          mobile: attrs.mobile?.[0] || '',
          department: attrs.department?.[0] || '',
        },
      };
    }
  } catch (e) {
    // JSON 解析失败，可能是 XML 响应
  }

  // 简单 XML 解析（提取 user 和 attributes）
  const userMatch = text.match(/<cas:user>([^<]+)<\/cas:user>/);
  if (userMatch) {
    return {
      valid: true,
      user: {
        id: userMatch[1],
        username: userMatch[1],
        name: userMatch[1],
        email: '',
        mobile: '',
        department: '',
      },
    };
  }

  return { valid: false };
}

// 默认数据（首次使用）
const DEFAULTS = {
  topics: '[]',
  strategyTopics: '[]',
  insights: '[]',
  issues: '[]',
  meetings: '[]',
  requirements: '[]',
  employees: '[]',
  orgUnits: '{}',
  employeeImportMeta: 'null',
  reviewScores: '{}',
  indicators: '[]',
  kpiInstances: '[]',
  tasks: '[]',
  milestones: '[]',
  progressRecords: '[]',
  cycles: '[]',
  strategyMaps: '[]',
  catalogs: '[]',
  spCampaigns: '[]',
};

// --- AI 议程推荐 ---
const AI_AGENDA_PROMPT = `You are an agenda advisor for a monthly business review meeting in a DSTE (Strategy Execution) system.
Given the meeting context and related historical/action/resolution data, recommend candidate agenda items.

Rules:
- Each candidate must have a clear business topic title (<= 40 chars in Chinese).
- Suggest duration between 10 and 45 minutes.
- Pick owner from known participants/departments when possible.
- Prioritize: overdue actions > postponed agendas > open resolutions > key work milestones > recurring monthly topics.
- If the user provided a theme, bias recommendations toward that theme.
- Do not include items already covered by the existing agenda titles.
- Return ONLY valid JSON in this shape, no markdown, no explanation:
{
  "candidates": [
    {
      "title": "string",
      "type": "goal_management|key_task_management|budget_finance|human_resources|business_special|other",
      "duration": number,
      "owner": "string|empty",
      "reason": "string (1 sentence in Chinese)",
      "sourceType": "postponed_agenda|open_action|open_resolution|key_work|historical|theme",
      "sourceId": "string|empty",
      "confidence": 0.0-1.0
    }
  ]
}`;

function safeExtractJson(text) {
  text = (text || '').trim();
  // If wrapped in markdown code block, extract inner JSON
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) text = codeBlockMatch[1].trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

/**
 * 带指数退避重试的 fetch
 * 对 429 / 5xx / 网络错误自动重试
 */
async function fetchWithRetry(url, options, timeout = 60000, retries = 3) {
  const baseDelay = 500;
  let lastError;

  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const resp = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        const shouldRetry = (resp.status === 429 || resp.status >= 500) && i < retries;
        if (shouldRetry) {
          const delay = baseDelay * Math.pow(2, i) + Math.floor(Math.random() * 300);
          console.warn(`[retry] Kimi API ${resp.status}, attempt ${i + 1}/${retries + 1}, next in ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      return resp;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      const shouldRetry = i < retries && (err.name === 'AbortError' || err.name === 'TypeError');
      if (shouldRetry) {
        const delay = baseDelay * Math.pow(2, i) + Math.floor(Math.random() * 300);
        console.warn(`[retry] fetch error: ${err.message}, attempt ${i + 1}/${retries + 1}, next in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('All retries failed');
}

async function handleAiAgendaRecommend(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405, request);
  }

  const apiKey = env.KIMI_API_KEY;
  if (!apiKey) {
    return errorResponse('AI service not configured', 503, request);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return errorResponse('Invalid JSON body', 400, request);
  }

  const meeting = body.meeting;
  if (!meeting || typeof meeting !== 'object' || !meeting.title) {
    return errorResponse('Missing meeting.title', 400, request);
  }

  const model = AI_MODEL_ALLOWLIST.has(body.model) ? body.model : DEFAULT_AI_MODEL;

  const userContent = JSON.stringify({
    meeting: {
      title: meeting.title,
      scenario: meeting.scenario || '',
      level: meeting.level || '',
      date: meeting.date || '',
      theme: body.theme || meeting.theme || '',
    },
    context: body.context || {},
  }, null, 2);

  async function callKimi(systemContent) {
    const resp = await fetchWithRetry('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
        messages: sanitizeMessages([
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ]),
      }),
    }, 25000, 2);

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('Kimi API error:', resp.status, errorText);
      const err = new Error(`AI service error: ${resp.status} ${errorText}`);
      err.upstreamStatus = resp.status;
      throw err;
    }

    const aiData = await resp.json();
    const rawContent = aiData.choices && aiData.choices[0] ? aiData.choices[0].message?.content || '' : '';
    return safeExtractJson(rawContent);
  }

  try {
    let parsed = await callKimi(AI_AGENDA_PROMPT);
    let validation = validateAgendaCandidates(parsed);

    if (!validation.valid) {
      console.warn('AI agenda validation failed, retry with stricter prompt:', validation.error);
      const strictPrompt = `${AI_AGENDA_PROMPT}\n\n[strict mode] 你必须严格返回 JSON，candidates 数组中每个对象必须包含且仅包含：title(string)、type(string)、sourceType(string)、duration(number 5-120)、confidence(number 0-1)，不要输出任何 markdown 或解释。`;
      parsed = await callKimi(strictPrompt);
      validation = validateAgendaCandidates(parsed);
    }

    if (!validation.valid) {
      console.error('AI agenda validation failed after retry:', validation.error);
      return errorResponse(`AI response format invalid: ${validation.error}`, 502, request, { errorType: 'upstream' });
    }

    return jsonResponse({ success: true, candidates: validation.candidates }, 200, request);
  } catch (err) {
    if (err.name === 'AbortError') {
      return errorResponse('AI request timeout', 504, request, { errorType: 'timeout' });
    }
    console.error('AI agenda recommend error:', err);
    return errorResponse(err.message || 'AI request failed', 502, request, {
      errorType: err.upstreamStatus ? classifyUpstreamStatus(err.upstreamStatus) : 'internal',
      ...(err.upstreamStatus ? { upstreamStatus: err.upstreamStatus } : {}),
    });
  }
}

// --- AI 通用对话 ---
async function handleChat(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405, request);
  }

  const apiKey = env.KIMI_API_KEY;
  if (!apiKey) {
    return errorResponse('AI service not configured', 503, request);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return errorResponse('Invalid JSON body', 400, request);
  }

  const messages = sanitizeMessages(body.messages || []);
  if (messages.length === 0) {
    return errorResponse('Missing valid messages', 400, request);
  }

  const stream = !!body.stream;
  const tools = body.tools;
  const max_tokens = body.max_tokens || 4096;
  const model = AI_MODEL_ALLOWLIST.has(body.model) ? body.model : DEFAULT_AI_MODEL;
  // 透传 temperature（RFC-011 P0-3：此前前端传的 temperature 被静默丢弃）
  const temperature = (typeof body.temperature === 'number' && body.temperature >= 0 && body.temperature <= 1.5)
    ? body.temperature
    : undefined;

  try {
    const kimiPayload = {
      model,
      messages,
      stream,
      tools: tools && tools.length > 0 ? tools : undefined,
      max_tokens,
      temperature,
    };
    let resp = await fetchWithRetry('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(kimiPayload),
    }, 25000, 2);

    // 部分模型（如 kimi-k2.7-code-highspeed）只允许 temperature=1；
    // 遇到 invalid temperature 时摘掉该字段重试一次，避免透传特性变成全量 400
    if (!resp.ok && temperature !== undefined && resp.status === 400) {
      const errText = await resp.text();
      if (errText.includes('invalid temperature')) {
        console.warn(`[chat] model ${model} rejected temperature=${temperature}, retrying without it`);
        delete kimiPayload.temperature;
        resp = await fetchWithRetry('https://api.moonshot.cn/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(kimiPayload),
        }, 25000, 2);
      } else {
        return errorResponse(`AI service error: ${resp.status} ${errText}`, 502, request, {
          errorType: classifyUpstreamStatus(resp.status),
          upstreamStatus: resp.status,
        });
      }
    }

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('Kimi API error:', resp.status, errorText);
      return errorResponse(`AI service error: ${resp.status} ${errorText}`, 502, request, {
        errorType: classifyUpstreamStatus(resp.status),
        upstreamStatus: resp.status,
      });
    }

    if (stream) {
      return new Response(resp.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          ...getCorsHeaders(request),
        },
      });
    }

    const data = await resp.json();
    return jsonResponse({ success: true, ...data }, 200, request);
  } catch (err) {
    if (err.name === 'AbortError') {
      return errorResponse('AI request timeout', 504, request, { errorType: 'timeout' });
    }
    console.error('AI chat error:', err);
    return errorResponse(err.message || 'AI request failed', 502, request, { errorType: 'internal' });
  }
}

// ========== AI Telemetry ==========

async function handleAiLog(request, env, auth) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405, request);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return errorResponse('Invalid JSON body', 400, request);
  }

  const events = Array.isArray(body.events) ? body.events : [];
  if (events.length === 0) {
    return errorResponse('Missing events', 400, request);
  }

  const userId = auth?.user?.id || 'anonymous';
  const key = `ai_logs_v1:${userId}:${Date.now()}`;
  const TTL_SECONDS = 90 * 24 * 60 * 60;

  try {
    await env.DSTE_KV.put(key, JSON.stringify({ events, receivedAt: new Date().toISOString() }), { expirationTtl: TTL_SECONDS });
    return jsonResponse({ success: true }, 200, request);
  } catch (err) {
    console.error('AI log write error:', err);
    return errorResponse('Failed to write logs', 502, request);
  }
}

/**
 * AI 观测统计（RFC-011 P1-3）：聚合 KV 中的 telemetry 日志。
 * 此前日志只进不出（无读取/聚合端点），出问题只能靠 wrangler tail 现抓。
 * GET /api/ai/stats?days=14
 */
async function handleAiStats(request, env) {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405, request);
  }

  const url = new URL(request.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '14', 10) || 14, 1), 90);
  const since = Date.now() - days * 24 * 3600 * 1000;

  try {
    const list = await env.DSTE_KV.list({ prefix: 'ai_logs_v1:' });
    // 防爆量：最多取最近 500 个批次（list 按 key 字典序，ts 结尾近似时间序）
    const keys = list.keys.slice(-500);
    const events = [];
    for (const k of keys) {
      try {
        const raw = await env.DSTE_KV.get(k.name);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const batch = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.events) ? parsed.events : []);
        events.push(...batch);
      } catch (e) {
        // 跳过损坏的批次
      }
    }

    const recent = events.filter((e) => (e?.timestamp || 0) >= since);
    const requests = recent.filter((e) => e.type === 'chat' || e.type === 'agenda' || e.type === 'tool');
    const errors = recent.filter((e) => e.type === 'error');
    const feedback = recent.filter((e) => e.type === 'feedback');

    const latencies = requests.map((e) => e.latencyMs).filter((n) => typeof n === 'number').sort((a, b) => a - b);
    const p95 = latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))] : null;
    const avg = latencies.length ? Math.round(latencies.reduce((s, n) => s + n, 0) / latencies.length) : null;

    const errorTypeDist = {};
    const errorCodeDist = {};
    errors.forEach((e) => {
      const t = e.errorType || 'unknown';
      errorTypeDist[t] = (errorTypeDist[t] || 0) + 1;
      const c = e.errorCode || 'UNKNOWN';
      errorCodeDist[c] = (errorCodeDist[c] || 0) + 1;
    });

    const endpointDist = {};
    requests.forEach((e) => {
      const ep = e.endpoint || 'unknown';
      endpointDist[ep] = (endpointDist[ep] || 0) + 1;
    });

    // 按天趋势
    const daily = {};
    recent.forEach((e) => {
      const day = new Date(e.timestamp).toISOString().slice(0, 10);
      if (!daily[day]) daily[day] = { requests: 0, errors: 0 };
      if (e.type === 'error') daily[day].errors++;
      else if (e.type === 'chat' || e.type === 'agenda' || e.type === 'tool') daily[day].requests++;
    });

    return jsonResponse({
      success: true,
      window: { days, since: new Date(since).toISOString() },
      totals: {
        requests: requests.length,
        errors: errors.length,
        successRate: requests.length + errors.length > 0
          ? +(requests.length / (requests.length + errors.length) * 100).toFixed(1)
          : null,
        feedbackUp: feedback.filter((e) => e.rating === 'up').length,
        feedbackDown: feedback.filter((e) => e.rating === 'down').length,
      },
      latency: { avgMs: avg, p95Ms: p95, samples: latencies.length },
      errorTypeDist,
      errorCodeDist,
      endpointDist,
      daily,
    }, 200, request);
  } catch (err) {
    console.error('AI stats error:', err);
    return errorResponse(err.message || 'AI stats failed', 500, request, { errorType: 'internal' });
  }
}

// ========== AI 工具执行层 ==========
async function searchKms(query, limit = 3, env) {
  const token = env.KMS_PAT_TOKEN;
  if (!token) {
    return { success: false, error: 'KMS not configured' };
  }

  try {
    const cql = `text ~ "${query.replace(/"/g, '\\"')}"`;
    const url = `${env.KMS_BASE_URL || 'https://kms.fineres.com'}/rest/api/content/search?cql=${encodeURIComponent(cql)}&limit=${limit}&expand=space`;
    const resp = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!resp.ok) {
      console.error('KMS search failed:', resp.status);
      return { success: false, error: `KMS search failed: ${resp.status}` };
    }

    const data = await resp.json();
    const snippets = (data.results || []).map((r) => ({
      id: String(r.id || ''),
      title: String(r.title || ''),
      url: `${env.KMS_BASE_URL || 'https://kms.fineres.com'}/pages/viewpage.action?pageId=${r.id}`,
      space: r.space?.name || r.space?.key || '',
    }));
    return { success: true, snippets };
  } catch (err) {
    console.error('KMS search error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 获取单个 KMS 页面内容，支持 Worker KV 版本缓存。
 */
async function getKmsPage(pageId, env) {
  const token = env.KMS_PAT_TOKEN;
  if (!token) {
    return { success: false, error: 'KMS not configured' };
  }

  const baseUrl = (env.KMS_BASE_URL || 'https://kms.fineres.com').replace(/\/$/, '');
  const pageUrl = `${baseUrl}/pages/viewpage.action?pageId=${pageId}`;
  const cacheKey = `kms_page:${pageId}`;
  const KV_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 天兜底

  try {
    // 1. 先拿元数据（版本、标题），作为缓存校验依据
    const metaResp = await fetch(`${baseUrl}/rest/api/content/${pageId}?expand=version,space`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!metaResp.ok) {
      console.error('KMS meta fetch failed:', metaResp.status);
      return { success: false, error: `KMS meta fetch failed: ${metaResp.status}` };
    }

    const meta = await metaResp.json();
    const title = String(meta.title || '');
    const version = Number(meta.version?.number || 0);

    // 2. 尝试命中缓存
    const cachedRaw = await env.DSTE_KV.get(cacheKey);
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw);
        if (cached && cached.version === version && cached.text) {
          return {
            success: true,
            pageId,
            title: cached.title || title,
            url: cached.url || pageUrl,
            version: cached.version,
            text: cached.text,
            chunks: cached.chunks || [],
            chunkCount: cached.chunkCount || (cached.chunks || []).length,
            charCount: cached.text.length,
            truncated: false,
            cached: true,
          };
        }
      } catch (e) {
        // 缓存损坏，继续重新拉取
      }
    }

    // 3. 缓存未命中或版本变更，拉取正文并清洗
    const bodyResp = await fetch(`${baseUrl}/rest/api/content/${pageId}?expand=body.storage,version,space`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!bodyResp.ok) {
      console.error('KMS body fetch failed:', bodyResp.status);
      return { success: false, error: `KMS body fetch failed: ${bodyResp.status}` };
    }

    const bodyData = await bodyResp.json();
    const html = String(bodyData.body?.storage?.value || '');
    const cleaned = cleanConfluenceHtml(html);
    const { text, truncated } = truncateText(cleaned, 8000);
    const chunks = splitIntoSemanticChunks(cleaned, { maxChunkSize: 800 });

    const result = {
      pageId,
      title: String(bodyData.title || title || ''),
      url: pageUrl,
      version: Number(bodyData.version?.number || version || 1),
      text,
      chunks,
      chunkCount: chunks.length,
      charCount: text.length,
      truncated,
      fetchedAt: new Date().toISOString(),
    };

    // 4. 写入 KV（按版本号校验，无需 TTL 也能幂等；加 TTL 防止脏数据永久驻留）
    await env.DSTE_KV.put(cacheKey, JSON.stringify(result), { expirationTtl: KV_TTL_SECONDS });

    return { success: true, ...result, cached: false };
  } catch (err) {
    console.error('getKmsPage error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 按查询关键词对 KMS chunks 进行相关性打分，返回 Top-K。
 */
function rankKmsChunks(query, chunks, topK = 5) {
  if (!Array.isArray(chunks) || chunks.length === 0) return [];
  const qTokens = String(query).toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  if (qTokens.length === 0) return chunks.slice(0, topK);

  const scored = chunks.map((chunk) => {
    const text = String(chunk.text || '').toLowerCase();
    const heading = String(chunk.heading || '').toLowerCase();
    let score = 0;
    for (const t of qTokens) {
      if (heading.includes(t)) score += 3;
      if (text.includes(t)) score += 1;
    }
    return { ...chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * 从 KV 权威数据源查会议（RFC-011 P1-2）。
 * 找到返回 { meeting, source: 'kv' }；未找到/出错回退前端缓存 context.meeting（source: 'context'）。
 */
async function resolveMeetingForTool(env, context, meetingId) {
  if (meetingId) {
    try {
      const raw = await env.DSTE_KV.get(KEYS.meetings);
      if (raw) {
        const meetings = JSON.parse(raw);
        if (Array.isArray(meetings)) {
          const found = meetings.find((m) => m && m.id === meetingId);
          if (found) return { meeting: found, source: 'kv' };
        }
      }
    } catch (err) {
      console.error('resolveMeetingForTool KV error:', err.message);
    }
  }
  return { meeting: context?.meeting || {}, source: 'context' };
}

async function executeTool(name, args, context, env) {
  // 查询类工具：优先读 Worker KV 权威数据，前端 context.meeting 仅作回退（RFC-011 P1-2）
  if (name === 'queryMeetingAgenda') {
    const { meeting, source } = await resolveMeetingForTool(env, context, args.meetingId);
    return { success: true, agendaItems: meeting.agenda_items || [], source };
  }

  if (name === 'queryMeetingActions') {
    const { meeting, source } = await resolveMeetingForTool(env, context, args.meetingId);
    return { success: true, actions: meeting.actions || [], source };
  }

  if (name === 'queryMeetingResolutions') {
    const { meeting, source } = await resolveMeetingForTool(env, context, args.meetingId);
    return { success: true, resolutions: meeting.decisions || meeting.resolutions || [], source };
  }

  // 写入类工具：只生成草案，不直接持久化
  if (name === 'createActionItem') {
    const today = new Date().toISOString().split('T')[0];
    const actionItem = {
      id: 'A' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      content: String(args.content || '').trim(),
      owner: String(args.owner || '').trim(),
      deadline: args.deadline || today,
      status: 'pending',
      sourceAgendaId: '',
      sourceDecisionId: '',
    };
    return {
      draft: true,
      type: 'actionItem',
      meetingId: args.meetingId,
      actionItem,
      message: '已草拟行动项，等待用户确认',
    };
  }

  if (name === 'createMeeting') {
    const today = new Date().toISOString().split('T')[0];
    const dateVal = args.date || today;
    const meeting = {
      id: 'new_' + Date.now(),
      title: String(args.title || '').trim(),
      date: dateVal,
      month: dateVal.slice(0, 7),
      startTime: '09:00',
      scenario: args.scenario || 'union_quarterly',
      level: args.level || 'L1',
      status: 'planned',
      location: String(args.location || '').trim() || '待确认',
      host: String(args.host || '').trim() || '待定',
      recorder: '待定',
      meeting_link: '',
      pre_report_id: '',
      minutes_report_id: '',
      minutes_content: '',
      hasMinutes: false,
      minutesStatus: null,
      pipeline: {
        reportGenerated: false,
        preReviewDone: false,
        meetingHeld: false,
        minutesDrafted: false,
        minutesApproved: false,
        actionsTracked: false,
      },
      upstreamMeeting: null,
      downstreamMeeting: null,
      agenda_items: [{
        id: 'ag_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        type: 'goal_management',
        title: '',
        duration: 30,
        owner: '',
        material_link: '',
        data_views: [],
        pre_report_section: '',
        status: 'planned',
        originalAgendaId: '',
        postponedCount: 0,
        carriedFromAgendaId: null,
        carriedFromMeetingId: null,
        postponedHistory: [],
      }],
      actions: [],
      decisions: [],
      metrics: { materialTimeliness: 0, resolutionTimeliness: 0, actionClosure: 0, satisfaction: 0 },
      effectiveness: null,
    };
    return {
      draft: true,
      type: 'meeting',
      meeting,
      message: '已草拟会议，等待用户确认',
    };
  }

  if (name === 'searchKms') {
    return searchKms(args.query || '', args.limit || 3, env);
  }

  if (name === 'getKmsPage') {
    const pageResult = await getKmsPage(String(args.pageId || ''), env);
    if (!pageResult.success || !args.query) {
      return pageResult;
    }
    const topChunks = rankKmsChunks(args.query, pageResult.chunks, args.topK || 5);
    return {
      ...pageResult,
      rankedChunks: topChunks,
    };
  }

  if (name === 'navigateTo') {
    return { success: true, action: 'navigateTo', pageId: args.pageId };
  }

  return { success: false, error: `Unknown tool: ${name}` };
}

async function handleToolsExecute(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405, request);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return errorResponse('Invalid JSON body', 400, request);
  }

  const name = body.name;
  const args = body.arguments || {};
  const context = body.context || {};

  if (!name) {
    return errorResponse('Missing tool name', 400, request);
  }

  try {
    const result = await executeTool(name, args, context, env);
    return jsonResponse({ success: true, result }, 200, request);
  } catch (err) {
    console.error('Tool execution error:', err);
    return errorResponse(err.message || 'Tool execution failed', 502, request, { errorType: 'internal' });
  }
}

export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS 预检
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request),
      });
    }

    try {
      // --- CAS 登录 ---
      if (path === '/api/auth/cas/login') {
        const ticket = url.searchParams.get('ticket');
        const redirect = url.searchParams.get('redirect') || '/';
        // 前端传来的 service URL（必须与传给 CAS 的一致）
        const serviceUrl = url.searchParams.get('service') || CAS_CONFIG.service;

        if (!ticket) {
          return errorResponse('Missing ticket', 400, request);
        }

        // 验证 ticket
        const casResult = await validateCasTicket(ticket, serviceUrl);
        if (!casResult.valid) {
          return errorResponse('Invalid CAS ticket', 401, request);
        }

        // 生成应用 Token
        const token = generateToken();
        const tokenKey = `token:${token}`;
        const userKey = `user:${casResult.user.id}`;

        // 存储到 KV（TTL 2小时）
        await env.DSTE_KV.put(tokenKey, JSON.stringify(casResult.user), { expirationTtl: TOKEN_TTL });
        await env.DSTE_KV.put(userKey, token, { expirationTtl: TOKEN_TTL });

        return jsonResponse({
          success: true,
          token,
          user: casResult.user,
          redirect,
        }, 200, request);
      }

      // --- 获取当前用户信息 ---
      if (path === '/api/auth/me') {
        const token = extractToken(request);
        if (!token) {
          return errorResponse('Unauthorized', 401, request);
        }

        const userJson = await env.DSTE_KV.get(`token:${token}`);
        if (!userJson) {
          return errorResponse('Token expired', 401, request);
        }

        return jsonResponse({
          success: true,
          user: JSON.parse(userJson),
        }, 200, request);
      }

      // --- 登出 ---
      if (path === '/api/auth/logout') {
        const token = extractToken(request);
        if (token) {
          const userJson = await env.DSTE_KV.get(`token:${token}`);
          if (userJson) {
            const user = JSON.parse(userJson);
            await env.DSTE_KV.delete(`user:${user.id}`);
          }
          await env.DSTE_KV.delete(`token:${token}`);
        }

        return jsonResponse({ success: true, message: 'Logged out' }, 200, request);
      }

      // --- 单条 CRUD 端点（新增）---
      const itemMatch = path.match(/^\/api\/(topics|strategy-topics|insights|issues|meetings|employees|org-units|requirements|catalogs|sp-campaigns)\/([^\/]+)$/);
      if (itemMatch) {
        const entity = itemMatch[1];
        const id = decodeURIComponent(itemMatch[2]);
        const key = KEYS[entity === 'org-units' ? 'orgUnits' : entity === 'strategy-topics' ? 'strategyTopics' : entity === 'sp-campaigns' ? 'spCampaigns' : entity];
        const auth = await requireAuth(request, env);
        // GET 保持开放与全量接口一致；写操作需认证
        const user = auth.valid ? auth.user : null;
        if (request.method !== 'GET' && !user) {
          return errorResponse('Unauthorized', 401, request);
        }
        return handleEntityItem(request, env, {
          key,
          id,
          user,
          lookupMode: entity === 'org-units' ? 'map' : 'array',
          idField: entity === 'issues' ? 'issueId' : 'id',
        });
      }

      // --- OMP 单条 CRUD 端点 ---
      const ompItemMatch = path.match(/^\/api\/omp\/([^\/]+)\/([^\/]+)$/);
      if (ompItemMatch) {
        const entity = ompItemMatch[1];
        const id = decodeURIComponent(ompItemMatch[2]);
        const key = KEYS[entity];
        if (!key) {
          return errorResponse('Unknown OMP entity: ' + entity, 400, request);
        }
        const auth = await requireAuth(request, env);
        const user = auth.valid ? auth.user : null;
        if (request.method !== 'GET' && !user) {
          return errorResponse('Unauthorized', 401, request);
        }
        return handleEntityItem(request, env, {
          key,
          id,
          user,
          lookupMode: 'array',
        });
      }

      // --- 战略地图单条 CRUD 端点 ---
      const smMapMatch = path.match(/^\/api\/strategy-maps\/([^\/]+)$/);
      if (smMapMatch) {
        const id = decodeURIComponent(smMapMatch[1]);
        const auth = await requireAuth(request, env);
        const user = auth.valid ? auth.user : null;
        if (request.method !== 'GET' && !user) {
          return errorResponse('Unauthorized', 401, request);
        }
        return handleEntityItem(request, env, {
          key: KEYS.strategyMaps,
          id,
          user,
          lookupMode: 'array',
        });
      }

      const smObjMatch = path.match(/^\/api\/strategy-maps\/([^\/]+)\/objectives\/([^\/]+)$/);
      if (smObjMatch) {
        const mapId = decodeURIComponent(smObjMatch[1]);
        const id = decodeURIComponent(smObjMatch[2]);
        const auth = await requireAuth(request, env);
        const user = auth.valid ? auth.user : null;
        if (request.method !== 'GET' && !user) {
          return errorResponse('Unauthorized', 401, request);
        }
        return handleEntityItem(request, env, {
          key: `dste_sm_obj_${mapId}_v3`,
          id,
          user,
          lookupMode: 'array',
        });
      }

      const smLinkMatch = path.match(/^\/api\/strategy-maps\/([^\/]+)\/links\/([^\/]+)$/);
      if (smLinkMatch) {
        const mapId = decodeURIComponent(smLinkMatch[1]);
        const id = decodeURIComponent(smLinkMatch[2]);
        const auth = await requireAuth(request, env);
        const user = auth.valid ? auth.user : null;
        if (request.method !== 'GET' && !user) {
          return errorResponse('Unauthorized', 401, request);
        }
        return handleEntityItem(request, env, {
          key: `dste_sm_links_${mapId}_v3`,
          id,
          user,
          lookupMode: 'array',
        });
      }

      // --- 业务专题 API ---
      if (path === '/api/topics') {
        if (method === 'GET') {
          const data = await env.DSTE_KV.get(KEYS.topics) || DEFAULTS.topics;
          return jsonResponse({ success: true, data: JSON.parse(data) }, 200, request);
        }
        if (method === 'POST') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          const normalized = normalizeArrayItems(body, auth.user);
          await env.DSTE_KV.put(KEYS.topics, JSON.stringify(normalized));
          return jsonResponse({ success: true, message: 'topics saved' }, 200, request);
        }
      }

      // --- 战略专题 API ---
      if (path === '/api/strategy-topics') {
        if (method === 'GET') {
          const data = await env.DSTE_KV.get(KEYS.strategyTopics) || DEFAULTS.strategyTopics;
          return jsonResponse({ success: true, data: JSON.parse(data) }, 200, request);
        }
        if (method === 'POST') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          const normalized = normalizeArrayItems(body, auth.user);
          await env.DSTE_KV.put(KEYS.strategyTopics, JSON.stringify(normalized));
          return jsonResponse({ success: true, message: 'strategy topics saved' }, 200, request);
        }
      }

      // --- SP 战略规划制定 API ---
      if (path === '/api/sp-campaigns') {
        if (method === 'GET') {
          const data = await env.DSTE_KV.get(KEYS.spCampaigns) || DEFAULTS.spCampaigns;
          return jsonResponse({ success: true, data: JSON.parse(data) }, 200, request);
        }
        if (method === 'POST') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          const normalized = normalizeArrayItems(body, auth.user);
          await env.DSTE_KV.put(KEYS.spCampaigns, JSON.stringify(normalized));
          return jsonResponse({ success: true, message: 'sp campaigns saved' }, 200, request);
        }
      }

      // --- 战略洞察 API ---
      if (path === '/api/insights') {
        if (method === 'GET') {
          const data = await env.DSTE_KV.get(KEYS.insights) || DEFAULTS.insights;
          return jsonResponse({ success: true, data: JSON.parse(data) }, 200, request);
        }
        if (method === 'POST') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          const normalized = normalizeArrayItems(body, auth.user);
          await env.DSTE_KV.put(KEYS.insights, JSON.stringify(normalized));
          return jsonResponse({ success: true, message: 'insights saved' }, 200, request);
        }
      }

      // --- 议题 API ---
      if (path === '/api/issues') {
        if (method === 'GET') {
          const data = await env.DSTE_KV.get(KEYS.issues) || DEFAULTS.issues;
          return jsonResponse({ success: true, data: JSON.parse(data) }, 200, request);
        }
        if (method === 'POST') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          const normalized = normalizeArrayItems(body, auth.user);
          await env.DSTE_KV.put(KEYS.issues, JSON.stringify(normalized));
          return jsonResponse({ success: true, message: 'issues saved' }, 200, request);
        }
      }

      // --- 经营分析会 API ---
      if (path === '/api/meetings') {
        if (method === 'GET') {
          const data = await env.DSTE_KV.get(KEYS.meetings) || DEFAULTS.meetings;
          return jsonResponse({ success: true, data: JSON.parse(data) }, 200, request);
        }
        if (method === 'POST') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          const normalized = normalizeArrayItems(body, auth.user);
          await env.DSTE_KV.put(KEYS.meetings, JSON.stringify(normalized));
          return jsonResponse({ success: true, message: 'meetings saved' }, 200, request);
        }
      }

      // --- 需求池 API ---
      if (path === '/api/requirements') {
        if (method === 'GET') {
          const data = await env.DSTE_KV.get(KEYS.requirements) || '[]';
          return jsonResponse({ success: true, data: JSON.parse(data) }, 200, request);
        }
        if (method === 'POST') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          const normalized = normalizeArrayItems(body, auth.user);
          await env.DSTE_KV.put(KEYS.requirements, JSON.stringify(normalized));
          return jsonResponse({ success: true, message: 'requirements saved' }, 200, request);
        }
      }

      // --- 战略地图 API ---
      if (path === '/api/strategy-maps') {
        if (method === 'GET') {
          const data = await env.DSTE_KV.get(KEYS.strategyMaps) || '[]';
          return jsonResponse({ success: true, data: JSON.parse(data) }, 200, request);
        }
        if (method === 'POST') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          const normalized = normalizeArrayItems(body, auth.user);
          await env.DSTE_KV.put(KEYS.strategyMaps, JSON.stringify(normalized));
          return jsonResponse({ success: true, message: 'strategy maps saved' }, 200, request);
        }
      }

      // --- 目录管理 API ---
      if (path === '/api/catalogs') {
        if (method === 'GET') {
          const data = await env.DSTE_KV.get(KEYS.catalogs) || DEFAULTS.catalogs;
          return jsonResponse({ success: true, data: JSON.parse(data) }, 200, request);
        }
        if (method === 'POST') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          const normalized = normalizeArrayItems(body, auth.user);
          await env.DSTE_KV.put(KEYS.catalogs, JSON.stringify(normalized));
          return jsonResponse({ success: true, message: 'catalogs saved' }, 200, request);
        }
      }

      const smObjectivesListMatch = path.match(/^\/api\/strategy-maps\/([^\/]+)\/objectives$/);
      if (smObjectivesListMatch) {
        const mapId = decodeURIComponent(smObjectivesListMatch[1]);
        if (method === 'GET') {
          const data = await env.DSTE_KV.get(`dste_sm_obj_${mapId}_v3`) || '[]';
          return jsonResponse({ success: true, data: JSON.parse(data) }, 200, request);
        }
        if (method === 'POST') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          await env.DSTE_KV.put(`dste_sm_obj_${mapId}_v3`, JSON.stringify(body));
          return jsonResponse({ success: true, message: 'objectives saved' }, 200, request);
        }
      }

      const smLinksListMatch = path.match(/^\/api\/strategy-maps\/([^\/]+)\/links$/);
      if (smLinksListMatch) {
        const mapId = decodeURIComponent(smLinksListMatch[1]);
        if (method === 'GET') {
          const data = await env.DSTE_KV.get(`dste_sm_links_${mapId}_v3`) || '[]';
          return jsonResponse({ success: true, data: JSON.parse(data) }, 200, request);
        }
        if (method === 'POST') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          await env.DSTE_KV.put(`dste_sm_links_${mapId}_v3`, JSON.stringify(body));
          return jsonResponse({ success: true, message: 'links saved' }, 200, request);
        }
      }

      // --- 人员/组织目录 API（全局共享，短期方案）---
      if (path === '/api/employees') {
        if (method === 'GET') {
          const data = await env.DSTE_KV.get(KEYS.employees) || DEFAULTS.employees;
          return jsonResponse({ success: true, data: JSON.parse(data) }, 200, request);
        }
        if (method === 'POST') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          const normalized = normalizeArrayItems(body, auth.user);
          await env.DSTE_KV.put(KEYS.employees, JSON.stringify(normalized));
          return jsonResponse({ success: true, message: 'employees saved' }, 200, request);
        }
      }

      if (path === '/api/org-units') {
        if (method === 'GET') {
          const data = await env.DSTE_KV.get(KEYS.orgUnits) || DEFAULTS.orgUnits;
          return jsonResponse({ success: true, data: JSON.parse(data) }, 200, request);
        }
        if (method === 'POST') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          const normalized = {};
          if (body && typeof body === 'object') {
            for (const [k, v] of Object.entries(body)) {
              normalized[k] = v && typeof v === 'object' ? applyAuditFields({ ...v }, auth.user, v.version === undefined) : v;
            }
          }
          await env.DSTE_KV.put(KEYS.orgUnits, JSON.stringify(normalized));
          return jsonResponse({ success: true, message: 'org units saved' }, 200, request);
        }
      }

      if (path === '/api/review-scores') {
        if (method === 'GET') {
          const data = await env.DSTE_KV.get(KEYS.reviewScores) || DEFAULTS.reviewScores;
          return jsonResponse({ success: true, data: JSON.parse(data) }, 200, request);
        }
        if (method === 'POST') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          const normalized = {};
          if (body && typeof body === 'object') {
            for (const [k, v] of Object.entries(body)) {
              normalized[k] = v && typeof v === 'object' ? applyAuditFields({ ...v }, auth.user, v.version === undefined) : v;
            }
          }
          await env.DSTE_KV.put(KEYS.reviewScores, JSON.stringify(normalized));
          return jsonResponse({ success: true, message: 'review scores saved' }, 200, request);
        }
      }

      if (path === '/api/employee-import-meta') {
        if (method === 'GET') {
          const data = await env.DSTE_KV.get(KEYS.employeeImportMeta);
          return jsonResponse({ success: true, data: data ? JSON.parse(data) : null }, 200, request);
        }
        if (method === 'POST') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          const normalized = body && typeof body === 'object' ? applyAuditFields({ ...body }, auth.user, body.version === undefined) : body;
          await env.DSTE_KV.put(KEYS.employeeImportMeta, JSON.stringify(normalized));
          return jsonResponse({ success: true, message: 'employee import meta saved' }, 200, request);
        }
      }

      // --- OMP 重点工作成员配置 API ---
      const ompTaskMembersMatch = path.match(/^\/api\/omp\/tasks\/([^\/]+)\/members$/);
      if (ompTaskMembersMatch) {
        const taskId = decodeURIComponent(ompTaskMembersMatch[1]);
        if (method === 'PATCH') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          const members = Array.isArray(body.members) ? body.members : [];
          const kvKey = KEYS.tasks;
          const raw = await env.DSTE_KV.get(kvKey) || DEFAULTS.tasks || '[]';
          let tasks;
          try { tasks = JSON.parse(raw); } catch (e) { tasks = []; }
          const task = tasks.find(t => t.id === taskId);
          if (!task) {
            return errorResponse('Task not found', 404, request);
          }
          task.members = members;
          await env.DSTE_KV.put(kvKey, JSON.stringify(tasks));
          return jsonResponse({ success: true, message: 'members updated', taskId }, 200, request);
        }
      }

      // --- OMP 子任务排序 API ---
      const ompTaskReorderMatch = path.match(/^\/api\/omp\/tasks\/reorder$/);
      if (ompTaskReorderMatch) {
        if (method === 'PATCH') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          const orders = Array.isArray(body) ? body : (body.orders || []);
          if (!Array.isArray(orders) || orders.length === 0) {
            return errorResponse('Invalid request body', 400, request);
          }
          const kvKey = KEYS.tasks;
          const raw = await env.DSTE_KV.get(kvKey) || DEFAULTS.tasks || '[]';
          let tasks;
          try { tasks = JSON.parse(raw); } catch (e) { tasks = []; }
          orders.forEach(({ taskId, seq }) => {
            const task = tasks.find(t => t.id === taskId);
            if (task) task.seq = seq;
          });
          await env.DSTE_KV.put(kvKey, JSON.stringify(tasks));
          return jsonResponse({ success: true, message: 'reordered' }, 200, request);
        }
      }

      // --- OMP 数据 API（指标库 / KPI / 重点工作 / 里程碑 / 进度记录 / 周期） ---
      const ompMatch = path.match(/^\/api\/omp\/([^\/]+)$/);
      if (ompMatch) {
        const entity = ompMatch[1];
        const kvKey = KEYS[entity];
        if (!kvKey) {
          return errorResponse('Unknown entity: ' + entity, 400, request);
        }
        if (method === 'GET') {
          const data = await env.DSTE_KV.get(kvKey) || DEFAULTS[entity] || '[]';
          return jsonResponse({ success: true, data: JSON.parse(data) }, 200, request);
        }
        if (method === 'POST') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          await env.DSTE_KV.put(kvKey, JSON.stringify(body));
          return jsonResponse({ success: true, message: entity + ' saved' }, 200, request);
        }
      }

      // --- 企业微信通知代理 ---
      if (path === '/api/notify/proxy') {
        if (method !== 'POST') {
          return errorResponse('Method not allowed', 405, request);
        }
        const body = await request.json();
        const webhookUrl = body.webhookUrl;
        const payload = body.payload;

        if (!webhookUrl) {
          return errorResponse('Missing webhookUrl', 400, request);
        }

        // 安全校验：只允许企业微信 Webhook URL
        if (!webhookUrl.startsWith('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=')) {
          return errorResponse('Invalid webhook URL', 400, request);
        }

        // 兼容旧接口：无 payload 时回退到 text 类型
        const forwardBody = payload || { msgtype: 'text', text: { content: body.message || '' } };

        try {
          const resp = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(forwardBody),
          });
          const result = await resp.json();
          return jsonResponse({ success: result.errcode === 0, errcode: result.errcode, errmsg: result.errmsg }, 200, request);
        } catch (err) {
          return errorResponse('Webhook request failed: ' + err.message, 502, request);
        }
      }

      // --- 版本审计看板 ---
      if (path === '/api/version-audit') {
        if (method === 'GET') {
          const auditJson = await env.DSTE_KV.get(KEYS.versionAudit);
          const audit = auditJson ? JSON.parse(auditJson) : {
            success: true,
            environment: 'production',
            hostname: 'unknown',
            timestamp: new Date().toISOString(),
            frontend: { version_tag: 'unknown' },
            backend: {},
            note: '尚未部署版本审计数据，请在发布时调用 POST /api/version-audit 更新',
          };
          return jsonResponse({ success: true, ...audit }, 200, request);
        }
        if (method === 'POST') {
          const auth = await requireAuth(request, env);
          if (!auth.valid) {
            return errorResponse(auth.error, auth.status, request);
          }
          const body = await request.json();
          const audit = {
            environment: 'production',
            timestamp: new Date().toISOString(),
            ...body,
          };
          await env.DSTE_KV.put(KEYS.versionAudit, JSON.stringify(audit));
          return jsonResponse({ success: true, message: 'version audit updated', audit }, 200, request);
        }
      }

      // --- AI 议程推荐 ---
      if (path === '/api/ai/agenda') {
        const auth = await requireAiAuth(request, env);
        if (!auth.valid) {
          return errorResponse(auth.error, auth.status, request);
        }
        return handleAiAgendaRecommend(request, env);
      }

      // --- AI 通用对话 ---
      if (path === '/api/ai/chat') {
        const auth = await requireAiAuth(request, env);
        if (!auth.valid) {
          return errorResponse(auth.error, auth.status, request);
        }
        return handleChat(request, env);
      }

      // --- AI 工具执行 ---
      if (path === '/api/ai/tools/execute') {
        const auth = await requireAiAuth(request, env);
        if (!auth.valid) {
          return errorResponse(auth.error, auth.status, request);
        }
        return handleToolsExecute(request, env);
      }

      // --- AI Telemetry ---
      if (path === '/api/ai/log') {
        const auth = await requireAiAuth(request, env);
        if (!auth.valid) {
          return errorResponse(auth.error, auth.status, request);
        }
        return handleAiLog(request, env, auth);
      }

      // --- AI 观测统计（RFC-011 P1-3）---
      if (path === '/api/ai/stats') {
        const auth = await requireAiAuth(request, env);
        if (!auth.valid) {
          return errorResponse(auth.error, auth.status, request);
        }
        return handleAiStats(request, env);
      }

      // --- 健康检查 ---
      if (path === '/api/health') {
        return jsonResponse({
          status: 'ok',
          service: 'dste-api',
          timestamp: new Date().toISOString(),
        }, 200, request);
      }

      return errorResponse('Not Found', 404, request);
    } catch (err) {
      console.error('API Error:', err);
      return errorResponse(err.message || 'Internal Server Error', 500, request);
    }
  },
};
