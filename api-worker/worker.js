/**
 * DSTE 战略管理平台 — Cloudflare Worker API
 * 数据同步后端：业务专题、议题、经营分析会
 */

const ALLOWED_ORIGINS = [
  'http://localhost:3456',
  'http://localhost:8080',
  'http://localhost:5173',
  'https://dste.fineres.com',
  'https://www.dste.fineres.com',
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

function errorResponse(message, status = 500, request) {
  return jsonResponse({ error: message }, status, request);
}

// KV key 常量
const KEYS = {
  topics: 'dste_topics_v2',
  issues: 'dste_issues_v1',
  meetings: 'dste_meetings_v1',
  // 人员/组织目录（按用户隔离，前缀 user:{userId}:
  employees: 'dste_employees_v1',
  orgUnits: 'dste_org_units_v1',
  employeeImportMeta: 'dste_employee_import_meta_v1',
  // OMP 数据层
  indicators: 'dste_omp_indicators_v1',
  kpiInstances: 'dste_omp_kpi_instances_v1',
  tasks: 'dste_omp_tasks_v1',
  milestones: 'dste_omp_milestones_v1',
  progressRecords: 'dste_omp_progress_v1',
  cycles: 'dste_cycles_v1',
  // 版本审计
  versionAudit: 'dste_version_audit_v1',
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
  issues: '[]',
  meetings: '[]',
  employees: '[]',
  orgUnits: '{}',
  employeeImportMeta: 'null',
  indicators: '[]',
  kpiInstances: '[]',
  tasks: '[]',
  milestones: '[]',
  progressRecords: '[]',
  cycles: '[]',
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

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const resp = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        max_tokens: 2048,
        messages: [
          { role: 'system', content: AI_AGENDA_PROMPT },
          { role: 'user', content: userContent },
        ],
      }),
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('Kimi API error:', resp.status, errorText);
      return errorResponse(`AI service error: ${resp.status}`, 502, request);
    }

    const aiData = await resp.json();
    const rawContent = aiData.choices && aiData.choices[0] ? aiData.choices[0].message?.content || '' : '';
    const parsed = safeExtractJson(rawContent);

    if (!parsed || !Array.isArray(parsed.candidates)) {
      console.error('AI response parse failed:', rawContent);
      return errorResponse('AI response format invalid', 502, request);
    }

    const candidates = parsed.candidates.map((c, idx) => {
      const rawDuration = Number(c.duration);
      const duration = Number.isFinite(rawDuration) ? rawDuration : 20;
      return {
        id: `ai_${Date.now()}_${idx}`,
        title: String(c.title || '').slice(0, 60),
        type: ['goal_management', 'key_task_management', 'budget_finance', 'human_resources', 'business_special'].includes(c.type) ? c.type : 'other',
        duration: Math.min(120, Math.max(5, duration)),
        owner: String(c.owner || '').slice(0, 30),
        reason: String(c.reason || '').slice(0, 200),
        sourceType: ['postponed_agenda', 'open_action', 'open_resolution', 'key_work', 'historical', 'theme'].includes(c.sourceType) ? c.sourceType : 'theme',
        sourceId: String(c.sourceId || '').slice(0, 50),
        confidence: Math.min(1, Math.max(0, Number(c.confidence) || 0.8)),
      };
    });

    return jsonResponse({ success: true, candidates }, 200, request);
  } catch (err) {
    if (err.name === 'AbortError') {
      return errorResponse('AI request timeout', 504, request);
    }
    console.error('AI agenda recommend error:', err);
    return errorResponse(err.message || 'AI request failed', 502, request);
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

  const messages = body.messages || [];
  if (!Array.isArray(messages) || messages.length === 0) {
    return errorResponse('Missing messages', 400, request);
  }

  const stream = !!body.stream;
  const tools = body.tools;
  const max_tokens = body.max_tokens || 4096;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const resp = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages,
        stream,
        tools: tools && tools.length > 0 ? tools : undefined,
        max_tokens,
      }),
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('Kimi API error:', resp.status, errorText);
      return errorResponse(`AI service error: ${resp.status}`, 502, request);
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
      return errorResponse('AI request timeout', 504, request);
    }
    console.error('AI chat error:', err);
    return errorResponse(err.message || 'AI request failed', 502, request);
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
          await env.DSTE_KV.put(KEYS.topics, JSON.stringify(body));
          return jsonResponse({ success: true, message: 'topics saved' }, 200, request);
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
          await env.DSTE_KV.put(KEYS.issues, JSON.stringify(body));
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
          await env.DSTE_KV.put(KEYS.meetings, JSON.stringify(body));
          return jsonResponse({ success: true, message: 'meetings saved' }, 200, request);
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
          await env.DSTE_KV.put(KEYS.employees, JSON.stringify(body));
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
          await env.DSTE_KV.put(KEYS.orgUnits, JSON.stringify(body));
          return jsonResponse({ success: true, message: 'org units saved' }, 200, request);
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
          await env.DSTE_KV.put(KEYS.employeeImportMeta, JSON.stringify(body));
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
          const kvKey = getUserKey(auth, KEYS.tasks);
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
        return handleAiAgendaRecommend(request, env);
      }

      // --- AI 通用对话 ---
      if (path === '/api/ai/chat') {
        return handleChat(request, env);
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
