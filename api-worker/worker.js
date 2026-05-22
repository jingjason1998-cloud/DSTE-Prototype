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
