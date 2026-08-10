/**
 * Topic AI Chat 浮窗组件
 *
 * 从战略专题详情入口打开的 KMS-RAG 问答浮窗。
 * - 临时会话，不污染全局 AI 会话列表
 * - 使用共享 AiRequestState 管理请求生命周期
 * - 保留原有 DOM ID / class / E2E 选择器
 */

import { icon, hydrateIcons } from '../../../assets/js/icons.js';
import { AIClient, AISession } from '../../lib/ai-client.js';
import { AiRequestState } from '../../lib/ai-state.js';
import { renderMarkdownLite } from '../../lib/markdown-lite.js';

const OVERLAY_ID = 'topic-ai-chat-overlay';

const SYSTEM_PROMPT = `你是 DSTE 战略管理平台的 AI 助手，正在回答用户关于某一战略专题的问题。
你必须严格基于以下「专题元数据」和「KMS 页面正文」回答，不确定时明确说明，不要编造。
回答要求：
- 使用中文，简洁专业
- 关键结论后用括号标注数据来源（如「来源：KMS 页面《标题》」、「来源：专题元数据」）
- 如果用户问题超出下面提供的上下文，提示用户查看 KMS 原文`;

const QUICK_PROMPTS = [
  { label: '核心结论', prompt: '这个专题的核心结论是什么？' },
  { label: '里程碑', prompt: '关键里程碑与时间节点有哪些？' },
  { label: '风险与应对', prompt: '主要风险与应对措施是什么？' },
  { label: '经营影响', prompt: '这个专题对年度经营计划有什么影响？' },
];

/**
 * 临时 AI 客户端：不重写全局会话存储
 */
class TopicAiClient extends AIClient {
  saveSession() {
    // topic 浮窗会话为临时会话，不污染全局 AI 会话列表
  }
}

let _client = null;
let _session = null;
let _topic = null;
let _kmsPage = null;
const aiState = new AiRequestState();

function getClient() {
  if (!_client) {
    _client = new TopicAiClient();
  }
  return _client;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function resolveTopic(topicIdOrTopic) {
  if (topicIdOrTopic && typeof topicIdOrTopic === 'object') {
    return topicIdOrTopic;
  }
  if (typeof window !== 'undefined' && window.siResolveTopicForAiChat) {
    return window.siResolveTopicForAiChat(topicIdOrTopic);
  }
  return null;
}

function getTopicPageId(topic) {
  const kmsUrl = topic?.kmsUrl;
  if (!kmsUrl) return null;
  const match = /pageId=(\d+)/.exec(String(kmsUrl));
  return match ? match[1] : null;
}

function showToast(message, type = 'info', duration) {
  if (typeof window !== 'undefined' && window.showToast) {
    window.showToast(message, type, duration);
  }
}

function buildOverlayHtml(topic) {
  const quickButtons = QUICK_PROMPTS.map(
    ({ label, prompt }) =>
      `<button class="btn btn-sm btn-secondary dste-ai-chip" data-ai-topic-prompt="${escapeHtml(prompt)}">${escapeHtml(label)}</button>`
  ).join('');

  return `
    <div id="topic-ai-chat-modal" class="omp-modal omp-modal-wide" style="background:var(--bg-card);border-radius:12px;max-width:680px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border-color);flex-shrink:0;">
        <div class="min-width-0">
          <h3 style="margin:0;font-size:16px;display:flex;align-items:center;gap:8px;">${icon('robot', { size: 16 })} AI 问答 · ${escapeHtml(topic.name)}</h3>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            <a href="${escapeHtml(topic.kmsUrl)}" target="_blank" rel="noopener noreferrer" class="primary-text">${escapeHtml(topic.kmsUrl)}</a>
          </div>
        </div>
        <button type="button" id="topic-ai-chat-close" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-secondary);flex-shrink:0;" aria-label="关闭">×</button>
      </div>
      <div id="topic-ai-chat-area" style="flex:1;overflow-y:auto;padding:16px 20px;min-height:260px;">
        <div class="ai-message bot dste-ai-msg assistant">
          <div class="ai-avatar dste-ai-avatar">${icon('robot', { size: 14 })}</div>
          <div class="ai-message-content dste-ai-bubble"><span class="dste-ai-thinking">正在从 KMS 提取《${escapeHtml(topic.name)}》页面内容，请稍候…</span></div>
        </div>
      </div>
      <div style="padding:12px 20px;border-top:1px solid var(--border-color);flex-shrink:0;">
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;" id="topic-ai-status"><span class="dste-ai-thinking">正在提取 KMS 页面…</span></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;" id="topic-ai-quick-actions">
          ${quickButtons}
        </div>
        <div class="dste-ai-composer">
          <input type="text" id="topic-ai-chat-input" placeholder="输入关于该专题的问题，例如：关键举措有哪些？">
          <button class="dste-ai-send-btn" id="topic-ai-chat-send" aria-label="发送" disabled>${icon('arrowUp', { size: 16 })}</button>
        </div>
      </div>
    </div>
  `;
}

function bindOverlayEvents(overlay) {
  const area = overlay.querySelector('#topic-ai-chat-area');
  const input = overlay.querySelector('#topic-ai-chat-input');
  const sendBtn = overlay.querySelector('#topic-ai-chat-send');

  // 点击外部关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeTopicAiChat();
    }
  });

  // 关闭按钮
  const closeBtn = overlay.querySelector('#topic-ai-chat-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeTopicAiChat());
  }

  // 快捷提示芯片
  overlay.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-ai-topic-prompt]');
    if (!chip || !input) return;
    input.value = chip.dataset.aiTopicPrompt;
    sendTopicAiMessage();
  });

  // 输入框：启用/禁用发送按钮
  if (input && sendBtn) {
    input.addEventListener('input', () => {
      sendBtn.disabled = !input.value.trim();
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendTopicAiMessage();
      }
    });
  }

  // 发送按钮
  if (sendBtn) {
    sendBtn.addEventListener('click', () => sendTopicAiMessage());
  }
}

function appendMessage(area, role, content, options = {}) {
  const el = document.createElement('div');
  const isUser = role === 'user';
  el.className = `ai-message ${role} dste-ai-msg ${isUser ? 'user' : 'assistant'}${options.streaming ? ' ai-streaming' : ''}`;
  if (options.id) el.id = options.id;
  el.innerHTML = `
    ${isUser ? '' : `<div class="ai-avatar dste-ai-avatar"><span class="icon" data-icon="robot" data-icon-size="14"></span></div>`}
    <div class="ai-message-content dste-ai-bubble">${options.streaming ? '' : escapeHtml(content)}</div>
  `;
  area.appendChild(el);
  area.scrollTop = area.scrollHeight;
  return el;
}

function appendThinking(area) {
  const id = 'ai-thinking-' + Date.now();
  const el = document.createElement('div');
  el.className = 'ai-message bot ai-thinking dste-ai-msg assistant';
  el.id = id;
  el.innerHTML = `
    <div class="ai-avatar dste-ai-avatar"><span class="icon" data-icon="robot" data-icon-size="14"></span></div>
    <div class="ai-message-content dste-ai-bubble"><span class="dste-ai-thinking">正在分析战略数据…</span></div>
  `;
  area.appendChild(el);
  area.scrollTop = area.scrollHeight;
  return id;
}

function removeThinking(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
  return el;
}

function updateStreamingMessage(elOrId, content) {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (!el) return;
  const contentEl = el.querySelector('.ai-message-content');
  if (contentEl) contentEl.textContent = content;
}

function finalizeMessage(elOrId, content) {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (!el) return;
  el.classList.remove('ai-streaming');
  const contentEl = el.querySelector('.ai-message-content');
  if (contentEl) {
    contentEl.innerHTML = renderMarkdownLite(content);
    contentEl.classList.add('dste-ai-md');
  }
}

export function openTopicAiChat(topicIdOrTopic) {
  const topic = resolveTopic(topicIdOrTopic);
  if (!topic) {
    showToast('未找到对应的战略专题', 'warning');
    return;
  }

  if (!topic.kmsUrl) {
    showToast('该专题未关联 KMS 页面，无法使用 AI 问答', 'warning');
    return;
  }

  const pageId = getTopicPageId(topic);
  if (!pageId) {
    showToast('KMS 链接格式无法解析 pageId', 'warning');
    return;
  }

  // 取消可能正在进行的旧请求
  aiState.abortCurrent('new-chat');

  // 关闭已存在的浮窗
  closeTopicAiChat();

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.className = 'omp-modal-overlay';
  overlay.style.zIndex = '100002';
  overlay.innerHTML = buildOverlayHtml(topic);
  document.body.appendChild(overlay);
  bindOverlayEvents(overlay);
  hydrateIcons(overlay);

  // 初始化临时会话与状态
  _session = new AISession();
  _topic = topic;
  _kmsPage = null;

  const area = overlay.querySelector('#topic-ai-chat-area');
  const statusEl = overlay.querySelector('#topic-ai-status');
  const input = overlay.querySelector('#topic-ai-chat-input');
  const sendBtn = overlay.querySelector('#topic-ai-chat-send');

  // 拉取 KMS 页面内容
  (async () => {
    const { signal } = aiState.startRequest();
    try {
      const client = getClient();
      const res = await client.request('/api/ai/tools/execute', {
        name: 'getKmsPage',
        arguments: { pageId },
      }, { signal });

      if (signal.aborted) return;

      if (!res.success || !res.result || !res.result.success) {
        const err = res.result?.error || res.error || '提取失败';
        if (statusEl) {
          statusEl.innerHTML = `${icon('warning', { size: 12 })} KMS 提取失败：${escapeHtml(err)}`;
        }
        if (area) {
          area.innerHTML = `
            <div class="ai-message bot dste-ai-msg assistant">
              <div class="ai-avatar dste-ai-avatar">${icon('warning', { size: 14 })}</div>
              <div class="ai-message-content dste-ai-bubble">无法提取 KMS 页面内容：${escapeHtml(err)}。你可以直接访问上方 KMS 链接查看原文。</div>
            </div>
          `;
          hydrateIcons(area);
        }
        if (input) input.disabled = true;
        if (sendBtn) sendBtn.disabled = true;
        return;
      }

      const kmsPage = res.result;
      _kmsPage = { ...kmsPage, topic };

      const cachedTag = kmsPage.cached ? '（缓存命中）' : '（新提取）';
      const truncatedTag = kmsPage.truncated ? '，已截断' : '';
      if (statusEl) {
        statusEl.innerHTML = `${icon('check', { size: 12 })} 已加载 KMS 页面《${escapeHtml(kmsPage.title || topic.name)}》${kmsPage.charCount || 0} 字${escapeHtml(truncatedTag)} ${escapeHtml(cachedTag)}`;
      }

      if (area) {
        area.innerHTML = `
          <div class="ai-message bot dste-ai-msg assistant">
            <div class="ai-avatar dste-ai-avatar">${icon('robot', { size: 14 })}</div>
            <div class="ai-message-content dste-ai-bubble dste-ai-md">
              <p>已加载专题 <strong>${escapeHtml(topic.name)}</strong> 的 KMS 页面《${escapeHtml(kmsPage.title || '未命名')}》，共 ${kmsPage.charCount || 0} 字${escapeHtml(truncatedTag)}。你可以围绕该专题内容提问，例如：</p>
              <ul>
                <li>这个专题的核心结论是什么？</li>
                <li>关键里程碑与时间节点有哪些？</li>
                <li>主要风险与应对措施是什么？</li>
              </ul>
            </div>
          </div>
        `;
        hydrateIcons(area);
      }
    } catch (err) {
      if (signal.aborted || err.name === 'AbortError') return;
      console.error('[TopicAI] fetch KMS page error:', err);
      if (statusEl) {
        statusEl.innerHTML = `${icon('warning', { size: 12 })} KMS 提取异常：${escapeHtml(err.message || String(err))}`;
      }
      if (input) input.disabled = true;
      if (sendBtn) sendBtn.disabled = true;
    }
  })();
}

export function closeTopicAiChat() {
  aiState.abortCurrent('overlay-closed');
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.remove();
  }
  _session = null;
  _topic = null;
  _kmsPage = null;
}

export async function sendTopicAiMessage(text) {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) return;

  const input = overlay.querySelector('#topic-ai-chat-input');
  const sendBtn = overlay.querySelector('#topic-ai-chat-send');
  const area = overlay.querySelector('#topic-ai-chat-area');
  const statusEl = overlay.querySelector('#topic-ai-status');

  if (!input || !area) return;

  const messageText = text !== undefined ? text : input.value.trim();
  if (!messageText) return;

  if (!_kmsPage || !_kmsPage.text) {
    showToast('KMS 页面内容尚未加载完成，请稍候', 'warning');
    return;
  }

  const { signal } = aiState.startRequest();

  appendMessage(area, 'user', messageText);
  const thinkingId = appendThinking(area);
  hydrateIcons(area);
  input.value = '';
  input.disabled = true;
  if (sendBtn) sendBtn.disabled = true;
  area.scrollTop = area.scrollHeight;

  try {
    const client = getClient();
    const session = _session;
    const topic = _kmsPage.topic;
    const kmsPage = _kmsPage;

    // 按问题从 KMS 页面检索最相关的 chunks
    let rankedText = kmsPage.text;
    let chunkInfo = '';
    try {
      const rankRes = await client.request('/api/ai/tools/execute', {
        name: 'getKmsPage',
        arguments: { pageId: kmsPage.pageId, query: messageText, topK: 5 },
      }, { signal });
      if (rankRes.success && rankRes.result?.rankedChunks?.length) {
        rankedText = rankRes.result.rankedChunks.map((c) => c.text).join('\n\n');
        chunkInfo = `（命中 ${rankRes.result.rankedChunks.length} 个相关片段）`;
      }
    } catch (rankErr) {
      console.warn('[TopicAI] rank chunks failed, fallback to full text:', rankErr);
    }

    if (statusEl && chunkInfo) {
      statusEl.innerHTML = `${icon('check', { size: 12 })} 已加载 KMS 页面《${escapeHtml(kmsPage.title || topic.name)}》${chunkInfo}`;
    }

    removeThinking(thinkingId);
    const botEl = appendMessage(area, 'bot', '', { streaming: true });
    hydrateIcons(area);
    let fullContent = '';

    for await (const chunk of client.streamChat(messageText, {
      session,
      systemPrompt: SYSTEM_PROMPT,
      context: {
        topic: {
          id: topic?.id,
          name: topic?.name,
          year: topic?.year,
          owner: topic?.owner,
          status: topic?.status,
          researchObjectives: topic?.researchObjectives,
          deliverables: topic?.deliverables,
          summary: topic?.summary,
        },
        kmsPage: {
          title: kmsPage.title,
          url: kmsPage.url,
          version: kmsPage.version,
          text: rankedText,
        },
      },
      signal,
    })) {
      if (chunk.done) break;
      fullContent += chunk.content;
      updateStreamingMessage(botEl, fullContent);
      area.scrollTop = area.scrollHeight;
    }

    if (signal.aborted) {
      return;
    }

    finalizeMessage(botEl, fullContent);
    hydrateIcons(area);

    if (fullContent.includes('【mock 模式】') || fullContent.includes('当前为 mock')) {
      showToast('当前为 AI mock 模式，未调用真实模型', 'info', 3000);
    }
  } catch (err) {
    if (signal.aborted || err.name === 'AbortError') {
      return;
    }
    removeThinking(thinkingId);
    appendMessage(area, 'bot', `抱歉，AI 服务暂时不可用：${err.message}。请检查网络连接或稍后重试。`);
    hydrateIcons(area);
    console.error('[TopicAI] send message error:', err);
  } finally {
    input.disabled = false;
    if (sendBtn) sendBtn.disabled = !input.value.trim();
    input.focus();
  }
  area.scrollTop = area.scrollHeight;
}

if (typeof window !== 'undefined') {
  window.openTopicAiChat = openTopicAiChat;
  window.closeTopicAiChat = closeTopicAiChat;
  window.sendTopicAiMessage = sendTopicAiMessage;
}
