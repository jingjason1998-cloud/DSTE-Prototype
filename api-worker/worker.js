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

// 从请求中提取 Token
function extractToken(request) {
  const auth = request.headers.get('Authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
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
};

export default {
  async fetch(request, env, ctx) {
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
          const body = await request.json();
          await env.DSTE_KV.put(KEYS.meetings, JSON.stringify(body));
          return jsonResponse({ success: true, message: 'meetings saved' }, 200, request);
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
