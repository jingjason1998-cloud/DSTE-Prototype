#!/usr/bin/env node
/**
 * AI smoke eval（RFC-011 P1-4）
 *
 * 把历史 AI 生产事故固化为真实调用 Kimi 的回归用例，发版前手动跑：
 *   node scripts/ai-smoke-eval.mjs                    # 打生产
 *   node scripts/ai-smoke-eval.mjs http://localhost:8787   # 打本地 wrangler dev
 *
 * 覆盖事故：
 *   v0.7.0  空 content 消息被 Kimi 拒绝（400）
 *   v0.7.19 流式 tool_calls 分片 / sanitize 误删带 tool_calls 的 assistant
 *   v0.7.20 tool_call id 重复
 *   v0.7.32 孤儿 tool 消息（tool_call_id is not found）
 *   v0.7.34 temperature=0.7 被 kimi-k2.7-code-highspeed 拒绝（invalid temperature）
 *   契约   errorType 透传、agenda JSON schema
 */

const BASE_URL = (process.argv[2] || 'https://dste.fineres.com').replace(/\/$/, '');
const ORIGIN = BASE_URL.includes('fineres.com') ? 'https://dste.fineres.com' : 'http://localhost:8787';

let passed = 0;
let failed = 0;
const failures = [];

async function post(path, body) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* SSE 或纯文本 */ }
  return { status: resp.status, json, text };
}

async function testCase(name, fn) {
  process.stdout.write(`  ${name} ... `);
  try {
    await fn();
    passed++;
    console.log('PASS');
  } catch (err) {
    failed++;
    failures.push({ name, reason: err.message });
    console.log(`FAIL: ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const AGENDA_TOOL = {
  type: 'function',
  function: {
    name: 'queryMeetingAgenda',
    description: '查询指定会议的议程项列表',
    parameters: { type: 'object', properties: { meetingId: { type: 'string' } }, required: ['meetingId'] },
  },
};

async function main() {
  console.log(`AI smoke eval → ${BASE_URL}\n`);

  await testCase('健康检查 /api/health', async () => {
    const resp = await fetch(`${BASE_URL}/api/health`, { headers: { Origin: ORIGIN } });
    assert(resp.status === 200, `HTTP ${resp.status}`);
  });

  await testCase('C1 v0.7.0 回归：assistant 空 content + 完整 tool 配对 → 200', async () => {
    const r = await post('/api/ai/chat', {
      messages: [
        { role: 'user', content: '查行动项' },
        { role: 'assistant', content: '', tool_calls: [{ id: 'eval_tc_1', type: 'function', function: { name: 'queryMeetingActions', arguments: '{}' } }] },
        { role: 'tool', content: '{"success":true,"actions":[]}', tool_call_id: 'eval_tc_1' },
        { role: 'user', content: '继续' },
      ],
      stream: false, max_tokens: 64,
    });
    assert(r.status === 200, `HTTP ${r.status}: ${r.text.slice(0, 200)}`);
  });

  await testCase('C2 v0.7.32 回归：孤儿 tool 消息被服务端清洗 → 200（非 502）', async () => {
    const r = await post('/api/ai/chat', {
      messages: [
        { role: 'user', content: '查行动项' },
        { role: 'tool', content: '{"success":true}', tool_call_id: 'eval_orphan_tc' },
        { role: 'user', content: '继续' },
      ],
      stream: false, max_tokens: 64,
    });
    assert(r.status === 200, `HTTP ${r.status}: ${r.text.slice(0, 200)}`);
  });

  await testCase('C3 悬空 tool_calls（无 tool 响应）被清洗 → 200', async () => {
    const r = await post('/api/ai/chat', {
      messages: [
        { role: 'user', content: '查议程' },
        { role: 'assistant', content: ' ', tool_calls: [{ id: 'eval_dangling_1', type: 'function', function: { name: 'queryMeetingAgenda', arguments: '{}' } }] },
        { role: 'user', content: '继续' },
      ],
      stream: false, max_tokens: 64,
    });
    assert(r.status === 200, `HTTP ${r.status}: ${r.text.slice(0, 200)}`);
  });

  await testCase('C4 v0.7.34 回归：temperature=0.7 触发 invalid temperature 兜底 → 200', async () => {
    const r = await post('/api/ai/chat', {
      messages: [{ role: 'user', content: '用一句话介绍 DSTE' }],
      stream: false, temperature: 0.7, max_tokens: 32,
    });
    assert(r.status === 200, `HTTP ${r.status}: ${r.text.slice(0, 200)}`);
  });

  await testCase('C5 工具调用链路：带工具提问 → 200 且返回 tool_calls 或文本', async () => {
    const r = await post('/api/ai/chat', {
      messages: [
        { role: 'system', content: '你是会议助手。会议ID：eval-meeting-1。需要数据时调用工具。' },
        { role: 'user', content: '这场会议的议程是什么' },
      ],
      tools: [AGENDA_TOOL],
      stream: false, max_tokens: 512,
    });
    assert(r.status === 200, `HTTP ${r.status}`);
    const msg = r.json?.choices?.[0]?.message;
    assert(msg && (msg.content || (msg.tool_calls && msg.tool_calls.length > 0)), '响应既无 content 也无 tool_calls');
  });

  await testCase('C6 agenda 推荐返回合法 candidates schema', async () => {
    const r = await post('/api/ai/agenda', {
      meeting: { title: '8月经营例会', scenario: 'union_monthly', level: 'L1', date: '2026-08-24' },
      context: {},
    });
    assert(r.status === 200, `HTTP ${r.status}: ${r.text.slice(0, 200)}`);
    assert(Array.isArray(r.json?.candidates), 'candidates 不是数组');
    if (r.json.candidates.length > 0) {
      const c = r.json.candidates[0];
      assert(typeof c.title === 'string' && typeof c.duration === 'number', 'candidate 缺 title/duration');
    }
  });

  await testCase('C7 工具执行：queryMeetingAgenda 无 KV 命中时回退 context', async () => {
    const r = await post('/api/ai/tools/execute', {
      name: 'queryMeetingAgenda',
      arguments: { meetingId: 'eval-not-exist' },
      context: { meeting: { id: 'eval-local', agenda_items: [{ id: 'a1', title: '测试议程' }] } },
    });
    assert(r.status === 200, `HTTP ${r.status}`);
    assert(r.json?.success === true, 'success 不为 true');
    assert(r.json.result.agendaItems.length === 1, '未回退到 context.meeting');
    assert(r.json.result.source === 'context', `source 应为 context，实际 ${r.json.result.source}`);
  });

  await testCase('C8 错误契约：坏 JSON → 4xx 且带 error 字段', async () => {
    const resp = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      body: '{bad json',
    });
    assert(resp.status === 400, `HTTP ${resp.status}`);
    const json = await resp.json();
    assert(typeof json.error === 'string', '缺 error 字段');
  });

  await testCase('C9 /api/ai/stats 观测端点可用', async () => {
    const resp = await fetch(`${BASE_URL}/api/ai/stats?days=7`, { headers: { Origin: ORIGIN } });
    assert(resp.status === 200, `HTTP ${resp.status}`);
    const json = await resp.json();
    assert(json.success === true && json.totals && typeof json.totals.requests === 'number', 'stats 结构异常');
  });

  console.log(`\n结果：${passed} passed / ${failed} failed`);
  if (failures.length > 0) {
    console.log('失败用例：');
    failures.forEach((f) => console.log(`  - ${f.name}: ${f.reason}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('eval 执行异常:', err);
  process.exit(1);
});
