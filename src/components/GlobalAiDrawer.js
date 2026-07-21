/**
 * Global AI Drawer
 * 全局 AI 战略助手右侧抽屉
 *
 * - 从页面右侧滑出，挤压主内容区
 * - 识别当前页面并注入对应上下文
 * - 复用 AIClient / AISession 与会话历史
 */

import { icon, hydrateIcons } from '../../assets/js/icons.js';
import { AIClient, AITools } from '../lib/ai-client.js';
import { buildSystemPrompt, buildPageContext, getContextSummary } from '../lib/ai-context.js';
import { renderMarkdownLite } from '../lib/markdown-lite.js';
import { updateAiDrawerToggleActive } from '../lib/shell.js';

const DRAWER_WIDTH = 420;
const DRAWER_BODY_ID = 'global-ai-drawer';

let _client = null;
let _messages = [];
let _loading = false;
let _isOpen = false;

function getClient() {
  if (!_client) {
    _client = new AIClient();
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

function nl2br(s) {
  return String(s || '').replace(/\n/g, '<br>');
}

function getCurrentPageId() {
  return (typeof window !== 'undefined' && window.__dsteCurrentPageId) || '';
}

function ensureDrawer() {
  if (document.getElementById(DRAWER_BODY_ID)) return;

  const style = document.createElement('style');
  style.textContent = `
    .global-ai-drawer {
      position: fixed;
      top: var(--shell-topbar-height, 60px);
      right: 0;
      width: 0;
      height: calc(100vh - var(--shell-topbar-height, 60px));
      background: var(--bg-card, var(--color-bg-surface));
      border-left: 1px solid var(--border-color, var(--color-border-default));
      z-index: 4000;
      overflow: hidden;
      transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
    }
    .ai-drawer-open .global-ai-drawer { width: ${DRAWER_WIDTH}px; }
    .global-ai-drawer-inner {
      width: ${DRAWER_WIDTH}px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .global-ai-drawer-header {
      flex: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-color, var(--color-border-default));
    }
    .global-ai-drawer-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary, var(--color-text-primary));
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .global-ai-drawer-context {
      font-size: 12px;
      color: var(--text-secondary, var(--color-text-secondary));
      margin-top: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .global-ai-drawer-close {
      background: none;
      border: none;
      font-size: 22px;
      line-height: 1;
      color: var(--text-secondary, var(--color-text-secondary));
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    }
    .global-ai-drawer-close:hover { background: var(--bg-hover, var(--color-bg-hover)); }
    .global-ai-drawer-toolbar {
      flex: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      border-bottom: 1px solid var(--border-color, var(--color-border-default));
      gap: 8px;
    }
    .global-ai-drawer-session-select {
      flex: 1;
      min-width: 0;
      padding: 6px 8px;
      border: 1px solid var(--border-color, var(--color-border-default));
      border-radius: 6px;
      background: var(--bg-card, var(--color-bg-surface));
      color: var(--text-primary, var(--color-text-primary));
      font-size: 13px;
    }
    .global-ai-drawer-new-btn {
      flex: none;
      padding: 6px 10px;
      border: 1px solid var(--border-color, var(--color-border-default));
      border-radius: 6px;
      background: var(--bg-card, var(--color-bg-surface));
      color: var(--text-primary, var(--color-text-primary));
      font-size: 13px;
      cursor: pointer;
    }
    .global-ai-drawer-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      min-height: 0;
    }
    .global-ai-drawer-footer {
      flex: none;
      padding: 12px 16px;
      border-top: 1px solid var(--border-color, var(--color-border-default));
    }
    .global-ai-drawer-quick {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }

    .global-ai-welcome ul { margin: 8px 0; padding-left: 18px; }

    .ai-drawer-open .content-area { padding-right: ${DRAWER_WIDTH}px; }
    .ai-drawer-open #meeting-detail-overlay,
    .ai-drawer-open #meeting-editor-overlay { padding-right: ${DRAWER_WIDTH}px; }

    @media (max-width: 768px) {
      .ai-drawer-open .global-ai-drawer { width: 100vw; }
      .ai-drawer-open .content-area,
      .ai-drawer-open #meeting-detail-overlay,
      .ai-drawer-open #meeting-editor-overlay { padding-right: 0; }
      .global-ai-drawer-inner { width: 100vw; }
    }
  `;
  document.head.appendChild(style);

  const drawer = document.createElement('div');
  drawer.id = DRAWER_BODY_ID;
  drawer.className = 'global-ai-drawer';
  drawer.innerHTML = `
    <div class="global-ai-drawer-inner">
      <div class="global-ai-drawer-header">
        <div style="min-width:0;">
          <div class="global-ai-drawer-title">${icon('robot', { size: 16 })} AI 战略助手</div>
          <div class="global-ai-drawer-context" id="global-ai-context-chip">正在识别当前页面…</div>
        </div>
        <button type="button" class="global-ai-drawer-close" id="global-ai-close" aria-label="关闭">×</button>
      </div>
      <div class="global-ai-drawer-toolbar">
        <select class="global-ai-drawer-session-select" id="global-ai-session-select" aria-label="选择会话"></select>
        <button type="button" class="global-ai-drawer-new-btn" id="global-ai-new-session">+ 新会话</button>
      </div>
      <div class="global-ai-drawer-messages" id="global-ai-messages"></div>
      <div class="global-ai-drawer-footer">
        <div class="global-ai-drawer-quick" id="global-ai-quick"></div>
        <div class="global-ai-drawer-input-row dste-ai-composer">
          <input type="text" id="global-ai-input" placeholder="输入你的问题，例如：Q1 营收差距的根因是什么？" />
          <button type="button" id="global-ai-send" class="dste-ai-send-btn" aria-label="发送" disabled>${icon('arrowUp', { size: 16 })}</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(drawer);

  bindDrawerEvents(drawer);
}

function bindDrawerEvents(drawer) {
  drawer.addEventListener('click', (e) => {
    if (e.target.id === 'global-ai-close' || e.target.closest('#global-ai-close')) {
      closeGlobalAiDrawer();
      return;
    }
    if (e.target.id === 'global-ai-send' || e.target.closest('#global-ai-send')) {
      sendMessage();
      return;
    }
    if (e.target.id === 'global-ai-new-session' || e.target.closest('#global-ai-new-session')) {
      createNewSession();
      return;
    }
    const quick = e.target.closest('[data-ai-prompt]');
    if (quick) {
      const input = document.getElementById('global-ai-input');
      if (input) {
        input.value = quick.dataset.aiPrompt;
        sendMessage();
      }
      return;
    }
  });

  drawer.addEventListener('keypress', (e) => {
    if (e.target.id === 'global-ai-input' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  drawer.addEventListener('input', (e) => {
    if (e.target.id === 'global-ai-input') {
      const sendBtn = document.getElementById('global-ai-send');
      if (sendBtn) sendBtn.disabled = !e.target.value.trim() || _loading;
    }
  });

  drawer.addEventListener('change', (e) => {
    if (e.target.id === 'global-ai-session-select') {
      const client = getClient();
      client.switchSession(e.target.value);
      renderMessages();
    }
  });
}

function getDefaultSuggestions() {
  return [
    '分析当前季度 KPI 达成情况',
    '列出本月待开经营分析会',
    '识别高风险重点工作',
    '生成战略复盘报告模板',
  ];
}

function refreshContextChip() {
  const chip = document.getElementById('global-ai-context-chip');
  if (!chip) return;
  const pageId = getCurrentPageId();
  const ctx = buildPageContext(pageId);
  chip.textContent = `当前页面：${ctx.pageName}${ctx.suggestions.length ? ` · 已加载 ${ctx.context?.summary ? Object.keys(ctx.context.summary).length : 0} 类数据` : ''}`;
}

function renderSessionSelect() {
  const select = document.getElementById('global-ai-session-select');
  if (!select) return;
  const client = getClient();
  const sessions = client.listSessions();
  const current = client.getCurrentSession();
  select.innerHTML = sessions.map((s) => `
    <option value="${escapeHtml(s.id)}" ${s.id === current.id ? 'selected' : ''}>
      ${escapeHtml(s.title || '新会话')} (${s.messages.length} 条)
    </option>
  `).join('');
}

function renderQuickActions() {
  const pageId = getCurrentPageId();
  const ctx = buildPageContext(pageId);
  const suggestions = ctx.suggestions.length ? ctx.suggestions : getDefaultSuggestions();
  const container = document.getElementById('global-ai-quick');
  if (!container) return;
  container.innerHTML = suggestions.map((s) => `
    <button type="button" class="dste-ai-chip" data-ai-prompt="${escapeHtml(s)}">${escapeHtml(s)}</button>
  `).join('');
}

function renderWelcome() {
  return `
    <div class="global-ai-message assistant dste-ai-msg assistant">
      <div class="global-ai-avatar dste-ai-avatar">${icon('robot', { size: 14 })}</div>
      <div class="global-ai-content global-ai-welcome dste-ai-bubble dste-ai-md">
        <p><strong>AI 战略助手</strong></p>
        <p>你好！我是 DSTE 战略助手，可以帮你：</p>
        <ul>
          <li>分析 KPI 达成情况与差距根因</li>
          <li>生成经营分析报告与会议纪要初稿</li>
          <li>识别风险预警与机会洞察</li>
          <li>查询企业知识库与制度规范</li>
        </ul>
      </div>
    </div>
  `;
}

function renderMessage(msg) {
  if (msg.role === 'welcome') return renderWelcome();
  const isUser = msg.role === 'user';
  const content = isUser
    ? nl2br(escapeHtml(msg.content || ''))
    : renderMarkdownLite(msg.content || '');
  return `
    <div class="global-ai-message ${isUser ? 'user' : 'assistant'} dste-ai-msg ${isUser ? 'user' : 'assistant'}">
      ${isUser ? '' : `<div class="global-ai-avatar dste-ai-avatar">${icon('robot', { size: 14 })}</div>`}
      <div class="global-ai-content dste-ai-bubble${isUser ? '' : ' dste-ai-md'}">${content}</div>
    </div>
  `;
}

function renderMessages() {
  const container = document.getElementById('global-ai-messages');
  if (!container) return;

  const client = getClient();
  const session = client.getCurrentSession();
  const history = (session?.messages || [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));

  let html = '';
  if (history.length === 0) {
    html = renderWelcome();
  } else {
    html = history.map(renderMessage).join('');
  }

  if (_loading) {
    html += `
      <div class="global-ai-message assistant dste-ai-msg assistant">
        <div class="global-ai-avatar dste-ai-avatar">${icon('robot', { size: 14 })}</div>
        <div class="global-ai-content global-ai-thinking dste-ai-bubble">
          <span class="dste-ai-thinking">正在思考…</span>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;

  renderSessionSelect();
  renderQuickActions();
  refreshContextChip();
  hydrateIcons(container);
}

export async function sendMessage(text) {
  const input = document.getElementById('global-ai-input');
  const sendBtn = document.getElementById('global-ai-send');
  const messageText = text || (input ? input.value.trim() : '');
  if (!messageText) return;

  if (input) input.value = '';
  if (sendBtn) sendBtn.disabled = true;

  const client = getClient();
  const session = client.getCurrentSession();
  session.addMessage('user', messageText);
  client.saveSession(session);

  _loading = true;
  renderMessages();

  const pageId = getCurrentPageId();
  const pageCtx = buildPageContext(pageId);

  try {
    let fullContent = '';
    const botMsg = { role: 'assistant', content: '' };

    for await (const chunk of client.streamChat(messageText, {
      session,
      context: pageCtx.text,
      systemPrompt: `${buildSystemPrompt()}\n\n当前页面：${pageCtx.pageName}（${pageCtx.pageId || '全局'}）。请优先基于当前页面上下文回答。`,
      tools: [AITools.navigateTo, AITools.searchKms],
    })) {
      if (chunk.done) break;
      fullContent += chunk.content;
      botMsg.content = fullContent;
      updateLastMessage(fullContent);
    }

    session.addMessage('assistant', fullContent);
    client.saveSession(session);

    if (fullContent.includes('【mock 模式】') || fullContent.includes('当前为 mock')) {
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('当前为 AI mock 模式，未调用真实模型', 'info', 3000);
      }
    }
  } catch (err) {
    session.addMessage('assistant', `抱歉，AI 服务暂时不可用：${err.message}。请检查网络连接或稍后重试。`);
    client.saveSession(session);
    console.error('[GlobalAI] send message error:', err);
  } finally {
    _loading = false;
    if (sendBtn) sendBtn.disabled = !(input && input.value.trim());
    renderMessages();
  }
}

function updateLastMessage(content) {
  const container = document.getElementById('global-ai-messages');
  if (!container) return;
  const messages = container.querySelectorAll('.global-ai-message.assistant');
  const last = messages[messages.length - 1];
  if (last) {
    const contentEl = last.querySelector('.global-ai-content');
    if (contentEl) contentEl.textContent = content;
  }
  container.scrollTop = container.scrollHeight;
}

function createNewSession() {
  const client = getClient();
  client.createSession();
  renderMessages();
}

export function openGlobalAiDrawer() {
  ensureDrawer();
  _isOpen = true;
  document.body.classList.add('ai-drawer-open');
  renderMessages();
  updateAiDrawerToggleActive();
  const input = document.getElementById('global-ai-input');
  if (input) input.focus();
}

export function closeGlobalAiDrawer() {
  _isOpen = false;
  document.body.classList.remove('ai-drawer-open');
  updateAiDrawerToggleActive();
}

export function toggleGlobalAiDrawer() {
  if (_isOpen) {
    closeGlobalAiDrawer();
  } else {
    openGlobalAiDrawer();
  }
}

export function refreshGlobalAiDrawer() {
  if (!_isOpen) return;
  renderMessages();
}

// Esc 关闭
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && _isOpen) {
    closeGlobalAiDrawer();
  }
});

// 暴露到 window，供旧代码或内联事件调用
if (typeof window !== 'undefined') {
  window.openGlobalAiDrawer = openGlobalAiDrawer;
  window.closeGlobalAiDrawer = closeGlobalAiDrawer;
  window.toggleGlobalAiDrawer = toggleGlobalAiDrawer;
  window.refreshGlobalAiDrawer = refreshGlobalAiDrawer;
}
