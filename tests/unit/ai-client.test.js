import { describe, it, expect, vi, beforeEach } from 'vitest';

const storageMap = new Map();

const mockStorage = {
  getString: (key, defaultValue = '') => storageMap.get(key) ?? defaultValue,
  set: (key, val) => { storageMap.set(key, JSON.stringify(val)); return true; },
  setString: (key, val) => { storageMap.set(key, val); return true; },
  get: (key, defaultValue) => {
    const raw = storageMap.get(key);
    if (raw === undefined || raw === '') return defaultValue;
    try { return JSON.parse(raw); }
    catch (e) { return defaultValue; }
  },
  remove: (key) => { storageMap.delete(key); return true; },
  getKeys: (prefix = '') => {
    const keys = [];
    for (const key of storageMap.keys()) {
      if (key.startsWith(prefix)) keys.push(key);
    }
    return keys;
  },
};

vi.mock('../../src/lib/utils.js', () => ({ Storage: mockStorage }));

globalThis.window = { location: { hostname: 'localhost', hash: '' } };
globalThis.fetch = vi.fn();

const { AIClient, AISession, AITools, getAIGatewayUrl } = await import('../../src/lib/ai-client.js');

describe('ai-client', () => {
  beforeEach(() => {
    storageMap.clear();
    fetch.mockReset();
  });

  describe('getAIGatewayUrl', () => {
    it('returns reviewer proxy url when set', () => {
      storageMap.set('meetingReviewerProxyUrl', 'http://localhost:9999/');
      expect(getAIGatewayUrl()).toBe('http://localhost:9999');
    });

    it('returns dste_api_base when set and no proxy', () => {
      storageMap.set('dste_api_base', 'http://localhost:8787/');
      expect(getAIGatewayUrl()).toBe('http://localhost:8787');
    });

    it('returns default worker by default', () => {
      expect(getAIGatewayUrl()).toBe('https://dste-api.jasonxspace.workers.dev');
    });
  });

  describe('AISession', () => {
    it('creates a new session', () => {
      const session = new AISession();
      expect(session.id).toMatch(/^ai_session_\d+/);
      expect(session.messages).toEqual([]);
    });

    it('adds messages and generates title from first user message', () => {
      const session = new AISession();
      session.addMessage('user', '分析 KPI 达成情况');
      expect(session.title).toBe('分析 KPI 达成情况');
      expect(session.messages.length).toBe(1);
    });

    it('truncates long history', () => {
      const session = new AISession();
      for (let i = 0; i < 25; i++) {
        session.addMessage('user', `msg ${i}`);
        session.addMessage('assistant', `reply ${i}`);
      }
      const userCount = session.messages.filter((m) => m.role === 'user').length;
      expect(userCount).toBeLessThanOrEqual(10);
    });

    it('formats messages for Kimi without system', () => {
      const session = new AISession();
      session.addMessage('user', 'hello');
      session.addMessage('assistant', 'hi');
      const formatted = session.toKimiFormat(false);
      expect(formatted).toEqual([
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi' },
      ]);
    });
  });

  describe('AIClient session management', () => {
    it('creates and retrieves current session', () => {
      const client = new AIClient();
      const session = client.getCurrentSession();
      expect(session).toBeTruthy();
      expect(client.getCurrentSession().id).toBe(session.id);
    });

    it('lists and switches sessions', () => {
      const client = new AIClient();
      const s1 = client.getCurrentSession();
      const s2 = client.createSession();
      expect(client.listSessions().length).toBe(2);
      expect(client.getCurrentSession().id).toBe(s2.id);
      client.switchSession(s1.id);
      expect(client.getCurrentSession().id).toBe(s1.id);
    });

    it('deletes session and falls back', () => {
      const client = new AIClient();
      const s1 = client.getCurrentSession();
      const s2 = client.createSession();
      client.deleteSession(s2.id);
      expect(client.listSessions().length).toBe(1);
      expect(client.getCurrentSession().id).toBe(s1.id);
    });
  });

  describe('AIClient.chat', () => {
    it('returns assistant content from non-stream response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: '分析结果' } }],
        }),
      });

      const client = new AIClient({ baseUrl: 'http://localhost:8766' });
      const result = await client.chat('分析 KPI');
      expect(result.content).toBe('分析结果');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8766/api/ai/chat',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"stream":false'),
        })
      );
    });

    it('marks mock when response indicates mock', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mock: true,
          choices: [{ message: { role: 'assistant', content: 'mock answer' } }],
        }),
      });

      const client = new AIClient({ baseUrl: 'http://localhost:8766' });
      const result = await client.chat('test');
      expect(result.mock).toBe(true);
      expect(result.content).toBe('mock answer');
    });

    it('throws on non-ok response', async () => {
      fetch.mockResolvedValueOnce({ ok: false, text: async () => 'Server error' });
      const client = new AIClient({ baseUrl: 'http://localhost:8766' });
      await expect(client.chat('test')).rejects.toThrow(/AI request failed/);
    });
  });

  describe('AIClient.streamChat', () => {
    it('yields content chunks from SSE', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'));
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":" world"}}]}\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      fetch.mockResolvedValueOnce({ ok: true, body: stream });

      const client = new AIClient({ baseUrl: 'http://localhost:8766' });
      const chunks = [];
      for await (const chunk of client.streamChat('hi')) {
        chunks.push(chunk);
      }
      const contents = chunks.filter((c) => !c.done).map((c) => c.content);
      expect(contents).toEqual(['Hello', ' world']);
    });
  });

  describe('AITools', () => {
    it('defines navigateTo tool', () => {
      expect(AITools.navigateTo.function.name).toBe('navigateTo');
    });

    it('defines searchKms tool', () => {
      expect(AITools.searchKms.function.name).toBe('searchKms');
    });
  });

  describe('AIClient._executeTool', () => {
    beforeEach(() => {
      window.location.hash = '';
    });

    it('executes navigateTo locally', async () => {
      const client = new AIClient({ baseUrl: 'http://localhost:8766' });
      const result = await client._executeTool({
        id: 'call_1',
        function: { name: 'navigateTo', arguments: JSON.stringify({ pageId: 'exe/tasks' }) },
      });
      expect(result).toEqual({ success: true, action: 'navigateTo', pageId: 'exe/tasks' });
      expect(window.location.hash).toBe('exe/tasks');
    });

    it('posts other tools to Worker endpoint', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: { success: true, agendaItems: [{ title: 'A' }] } }),
      });

      const client = new AIClient({ baseUrl: 'http://localhost:8766' });
      const result = await client._executeTool({
        id: 'call_2',
        function: { name: 'queryMeetingAgenda', arguments: JSON.stringify({ meetingId: 'm1' }) },
      }, { meeting: { id: 'm1', agenda_items: [{ title: 'A' }] } });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8766/api/ai/tools/execute',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"name":"queryMeetingAgenda"'),
        })
      );
      expect(result).toEqual({ success: true, agendaItems: [{ title: 'A' }] });
    });

    it('returns error when Worker request fails', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const client = new AIClient({ baseUrl: 'http://localhost:8766' });
      const result = await client._executeTool({
        id: 'call_3',
        function: { name: 'searchKms', arguments: JSON.stringify({ query: 'test' }) },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('AIClient.callWithTools', () => {
    it('returns content directly when no tool calls', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { role: 'assistant', content: '直接回答' } }] }),
      });

      const client = new AIClient({ baseUrl: 'http://localhost:8766' });
      const result = await client.callWithTools('你好', [AITools.navigateTo]);
      expect(result.content).toBe('直接回答');
      expect(result.toolResults).toEqual([]);
    });

    it('executes tools via Worker and returns final content', async () => {
      // first chat returns tool call
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              role: 'assistant',
              content: '',
              tool_calls: [{ id: 'call_1', function: { name: 'queryMeetingActions', arguments: JSON.stringify({ meetingId: 'm1' }) } }],
            },
          }],
        }),
      });
      // tool execution via Worker
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: { success: true, actions: [{ content: '行动' }] } }),
      });
      // second chat returns final answer
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { role: 'assistant', content: '有一个行动项' } }] }),
      });

      const client = new AIClient({ baseUrl: 'http://localhost:8766' });
      const result = await client.callWithTools('有哪些行动项', [AITools.queryMeetingActions], {
        toolContext: { meeting: { id: 'm1', actions: [{ content: '行动' }] } },
      });

      expect(result.content).toBe('有一个行动项');
      expect(result.toolResults.length).toBe(1);
      expect(result.toolResults[0].result.success).toBe(true);
    });
  });
});
