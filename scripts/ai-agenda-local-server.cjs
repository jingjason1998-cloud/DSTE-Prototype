#!/usr/bin/env node
/**
 * DSTE AI 统一网关（本地开发）
 *
 * 提供：
 * - /api/ai/chat      通用聊天（支持流式）
 * - /api/ai/agenda    议程推荐（已迁移到 Kimi）
 * - /api/ai/kms-search KMS 知识库搜索
 *
 * 用法：
 *   KIMI_API_KEY=sk-xxx node scripts/ai-agenda-local-server.cjs
 * 默认端口：8766
 *
 * 未设置 KIMI_API_KEY 时返回 mock 响应，便于前端 UI 调试。
 * 前端启用方式：
 *   localStorage.setItem('meetingReviewerProxyUrl', 'http://localhost:8766')
 */

const http = require('http');

const PORT = process.env.PORT || 8766;
const KIMI_API_KEY = process.env.KIMI_API_KEY;
const KIMI_API_BASE = process.env.KIMI_API_BASE || 'https://api.moonshot.cn/v1';
const KMS_PAT_TOKEN = process.env.KMS_PAT_TOKEN;
const KMS_BASE_URL = process.env.KMS_BASE_URL || 'https://kms.fineres.com';

const DEFAULT_MODEL = 'kimi-k2.6';

const AI_AGENDA_SYSTEM_PROMPT = `You are an agenda advisor for a monthly business review meeting in a DSTE (Strategy Execution) system.
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

const MOCK_CANDIDATES = {
  success: true,
  candidates: [
    {
      id: 'ai_c1',
      title: 'Q2 回款进度滞后跟进',
      type: 'budget_finance',
      duration: 20,
      owner: '财务部',
      reason: '上一期顺延，且相关行动项 6/30 到期',
      sourceType: 'postponed_agenda',
      sourceId: 'ag_001',
      confidence: 0.92,
    },
    {
      id: 'ai_c2',
      title: '华东区客户满意度整改',
      type: 'business_special',
      duration: 25,
      owner: '客户成功部',
      reason: 'OMP 重点工作风险等级高，建议本月讨论',
      sourceType: 'key_work',
      sourceId: 'kw_001',
      confidence: 0.78,
    },
    {
      id: 'ai_c3',
      title: '产品 V3.0 上线风险评审',
      type: 'key_task_management',
      duration: 30,
      owner: '产品部',
      reason: '历史会议中多次出现，且当前行动项未闭环',
      sourceType: 'historical',
      sourceId: '',
      confidence: 0.65,
    },
  ],
};

const MOCK_CHAT_RESPONSES = [
  {
    keywords: ['kpi', '指标', '达成', '落后', '完成率'],
    text: '根据当前接入的数据，我还没有看到具体的 KPI 数值（当前为 mock 模式）。在真实模式下，我会从 OMP 中读取各指标的目标值与实际值，识别落后项并给出根因分析框架。\n\n（当前为 mock 响应，设置 KIMI_API_KEY 后启用真实 AI）',
  },
  {
    keywords: ['会议', 'agenda', '议程', '经营分析会'],
    text: '我可以根据历史会议、未闭环决议、逾期行动项和 OMP 重点工作为你推荐议程。请提供会议主题，或直接在经营分析会编辑页使用「AI 议程推荐」。\n\n（当前为 mock 响应）',
  },
  {
    keywords: ['风险', '预警', '异常', '重点工作'],
    text: '在真实模式下，我会扫描 OMP 重点工作的风险等级、里程碑逾期情况以及 KPI 连续落后指标，主动推送高优先级风险。\n\n（当前为 mock 响应）',
  },
];

function getCorsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function safeExtractJson(text) {
  text = (text || '').trim();
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

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
  });
}

async function callKimiChat({ messages, stream = false, tools, temperature = 0.7, max_tokens = 4096 }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const resp = await fetch(`${KIMI_API_BASE}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        stream,
        temperature,
        max_tokens,
        tools: tools && tools.length > 0 ? tools : undefined,
      }),
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Kimi API error ${resp.status}: ${errText}`);
    }

    return resp;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function callKimiAgenda(payload) {
  const userContent = JSON.stringify({
    meeting: {
      title: payload.meeting?.title || '',
      scenario: payload.meeting?.scenario || '',
      level: payload.meeting?.level || '',
      date: payload.meeting?.date || '',
      theme: payload.theme || payload.meeting?.theme || '',
    },
    context: payload.context || {},
  }, null, 2);

  const resp = await callKimiChat({
    messages: [
      { role: 'system', content: AI_AGENDA_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    temperature: 0.7,
    max_tokens: 2048,
  });

  const data = await resp.json();
  const raw = data.choices && data.choices[0] ? data.choices[0].message?.content || '' : '';
  const parsed = safeExtractJson(raw);

  if (!parsed || !Array.isArray(parsed.candidates)) {
    throw new Error('AI response format invalid');
  }

  return {
    success: true,
    candidates: parsed.candidates.map((c, idx) => ({
      id: `ai_${Date.now()}_${idx}`,
      title: String(c.title || '').slice(0, 60),
      type: ['goal_management', 'key_task_management', 'budget_finance', 'human_resources', 'business_special'].includes(c.type) ? c.type : 'other',
      duration: Math.min(120, Math.max(5, Number(c.duration) || 20)),
      owner: String(c.owner || '').slice(0, 30),
      reason: String(c.reason || '').slice(0, 200),
      sourceType: ['postponed_agenda', 'open_action', 'open_resolution', 'key_work', 'historical', 'theme'].includes(c.sourceType) ? c.sourceType : 'theme',
      sourceId: String(c.sourceId || '').slice(0, 50),
      confidence: Math.min(1, Math.max(0, Number(c.confidence) || 0.8)),
    })),
  };
}

function getMockChatResponse(question) {
  const q = (question || '').toLowerCase();
  for (const item of MOCK_CHAT_RESPONSES) {
    if (item.keywords.some((k) => q.includes(k))) return item.text;
  }
  return `您好！我是 DSTE AI 战略助手。当前为 mock 模式，请设置 KIMI_API_KEY 环境变量以启用真实 AI。\n\n您的问题是：「${question || ''}」`;
}

async function handleChat(req, res, corsHeaders) {
  const payload = await parseJsonBody(req);
  const messages = payload.messages || [];
  const stream = !!payload.stream;
  const tools = payload.tools;

  if (!KIMI_API_KEY) {
    const userMsg = messages.filter((m) => m.role === 'user').pop();
    const answer = getMockChatResponse(userMsg?.content);

    if (stream) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', ...corsHeaders });
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: answer } }] })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({
      success: true,
      mock: true,
      choices: [{ message: { role: 'assistant', content: answer } }],
    }));
    return;
  }

  try {
    const kimiResp = await callKimiChat({ messages, stream, tools });

    if (stream) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', ...corsHeaders });
      kimiResp.body.on('data', (chunk) => res.write(chunk));
      kimiResp.body.on('end', () => res.end());
      kimiResp.body.on('error', (err) => {
        console.error('[ERROR] stream error:', err.message);
        res.end();
      });
      return;
    }

    const data = await kimiResp.json();
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ success: true, ...data }));
  } catch (err) {
    console.error('[ERROR] /api/ai/chat:', err.message);
    res.writeHead(502);
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
}

async function handleAgenda(req, res, corsHeaders) {
  try {
    const payload = await parseJsonBody(req);

    if (!KIMI_API_KEY) {
      console.log('[MOCK] /api/ai/agenda for', payload.meeting?.title);
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify(MOCK_CANDIDATES));
      return;
    }

    const result = await callKimiAgenda(payload);
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify(result));
  } catch (err) {
    console.error('[ERROR] /api/ai/agenda:', err.message);
    res.writeHead(502);
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
}

async function searchKms(query, limit = 3) {
  if (!KMS_PAT_TOKEN) return [];

  try {
    const cql = `text ~ "${query.replace(/"/g, '\\"')}"`;
    const url = `${KMS_BASE_URL}/rest/api/content/search?cql=${encodeURIComponent(cql)}&limit=${limit}&expand=space`;
    const resp = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${KMS_PAT_TOKEN}`,
        'Accept': 'application/json',
      },
    });

    if (!resp.ok) {
      console.error('[WARN] KMS search failed:', resp.status);
      return [];
    }

    const data = await resp.json();
    return (data.results || []).map((r) => ({
      id: String(r.id || ''),
      title: String(r.title || ''),
      url: `${KMS_BASE_URL}/pages/viewpage.action?pageId=${r.id}`,
      space: r.space?.name || r.space?.key || '',
    }));
  } catch (err) {
    console.error('[WARN] KMS search error:', err.message);
    return [];
  }
}

async function handleKmsSearch(req, res, corsHeaders) {
  try {
    const payload = await parseJsonBody(req);
    const snippets = await searchKms(payload.query || '', payload.limit || 3);
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ success: true, snippets }));
  } catch (err) {
    console.error('[ERROR] /api/ai/kms-search:', err.message);
    res.writeHead(502);
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'dste-ai-gateway', timestamp: new Date().toISOString() }));
    return;
  }

  if (req.url === '/api/ai/chat' && req.method === 'POST') {
    await handleChat(req, res, corsHeaders);
    return;
  }

  if (req.url === '/api/ai/agenda' && req.method === 'POST') {
    await handleAgenda(req, res, corsHeaders);
    return;
  }

  if (req.url === '/api/ai/kms-search' && req.method === 'POST') {
    await handleKmsSearch(req, res, corsHeaders);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`DSTE AI 统一网关已启动: http://localhost:${PORT}`);
  console.log(`模型: ${DEFAULT_MODEL}`);
  console.log(`模式: ${KIMI_API_KEY ? 'Kimi 真实 API' : 'MOCK 响应（未设置 KIMI_API_KEY）'}`);
  console.log(`KMS 搜索: ${KMS_PAT_TOKEN ? '已启用' : '未启用（未设置 KMS_PAT_TOKEN）'}`);
  console.log('');
  console.log('前端启用方式：');
  console.log(`  localStorage.setItem('meetingReviewerProxyUrl', 'http://localhost:${PORT}')`);
  console.log('然后刷新页面。');
});
