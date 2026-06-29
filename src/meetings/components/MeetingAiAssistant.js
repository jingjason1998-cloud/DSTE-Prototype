/**
 * Meeting AI Assistant Component
 * 经营分析会议 AI 助手侧滑面板
 *
 * 交互形态参考 Chrome Gemini side panel：
 * - 右侧固定抽屉，从屏幕外 translateX(100%) 平滑推入
 * - 半透明遮罩同步淡入淡出
 * - 对话 tab 通过 AIClient 调用后端 /api/ai/chat，流式输出 Kimi 回复
 * - 议程推荐 tab 调用后端 /api/ai/agenda
 *
 * 依赖全局：
 * - window.findMeetingById
 * - window._currentDetailMeetingId
 * - window.escapeHtml
 */

import { renderAiAgendaInto } from './AiAgendaDrawer.js';
import { AIClient } from '../../lib/ai-client.js';

let _aiMessages = [];
let _aiLoading = false;
let _currentMeetingForAi = null;
let _activeAiTab = 'chat'; // 'chat' | 'agenda'
let _aiClient = null;
let _aiSession = null;

function getAiClient() {
  if (!_aiClient) {
    _aiClient = new AIClient();
  }
  return _aiClient;
}

function getAiSession() {
  if (!_aiSession) {
    _aiSession = getAiClient().getCurrentSession();
  }
  return _aiSession;
}

const SUGGESTIONS = [
  '总结本次会议议程',
  '生成会议纪要要点',
  '列出未闭环行动项',
  '本次会议有哪些决议？',
];

function getSafeFindMeeting() {
  return typeof window !== 'undefined' && typeof window.findMeetingById === 'function'
    ? window.findMeetingById
    : () => null;
}

function getCurrentMeetingId() {
  return typeof window !== 'undefined' && window._currentDetailMeetingId
    ? window._currentDetailMeetingId
    : null;
}

function escapeHtmlLocal(s) {
  if (typeof window !== 'undefined' && typeof window.escapeHtml === 'function') {
    return window.escapeHtml(s);
  }
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

function getMeetingContext(meeting) {
  if (!meeting) return null;
  const agendaItems = Array.isArray(meeting.agenda_items) ? meeting.agenda_items : [];
  const decisions = Array.isArray(meeting.decisions) ? meeting.decisions : [];
  const actions = Array.isArray(meeting.actions) ? meeting.actions : [];
  const completedActions = actions.filter(a => a && a.status === 'completed');
  const pendingActions = actions.filter(a => a && a.status !== 'completed');

  return {
    title: meeting.title || '未命名会议',
    date: meeting.date || '',
    host: meeting.host || '',
    scenario: meeting.scenario || '',
    minutesContent: meeting.minutes_content || '',
    agendaCount: agendaItems.length,
    agendaTotalMinutes: agendaItems.reduce((sum, a) => sum + (parseInt(a.duration, 10) || 0), 0),
    decisionCount: decisions.length,
    actionCount: actions.length,
    pendingActionCount: pendingActions.length,
    completedActionCount: completedActions.length,
  };
}

function renderWelcomeMessage() {
  const chips = SUGGESTIONS.map(
    (s) => `<span class="meeting-ai-suggestion" onclick="askMeetingAi('${escapeHtmlLocal(s)}')">${escapeHtmlLocal(s)}</span>`
  ).join('');

  return `
    <div class="ai-message assistant">
      <div>👋 你好！我是你的会议 AI 助手。我可以帮你：</div>
      <ul style="margin: 8px 0; padding-left: 18px; line-height: 1.7;">
        <li>总结会议议程与重点</li>
        <li>提炼纪要要点</li>
        <li>追踪行动项闭环</li>
        <li>梳理决议状态</li>
      </ul>
      <div class="ai-suggestions">${chips}</div>
    </div>
  `;
}

function renderMessage(msg) {
  if (msg.role === 'welcome') {
    return renderWelcomeMessage();
  }
  const cls = msg.role === 'user' ? 'user' : 'assistant';
  return `<div class="ai-message ${cls}">${nl2br(escapeHtmlLocal(msg.content))}</div>`;
}

function renderAiTabBar() {
  const chatActive = _activeAiTab === 'chat' ? 'meeting-ai-tab-active' : '';
  const agendaActive = _activeAiTab === 'agenda' ? 'meeting-ai-tab-active' : '';
  return `
    <div class="meeting-ai-tabs">
      <button type="button" class="meeting-ai-tab ${chatActive}" onclick="switchAiTab('chat')">💬 对话</button>
      <button type="button" class="meeting-ai-tab ${agendaActive}" onclick="switchAiTab('agenda')">📋 议程推荐</button>
    </div>
  `;
}

function renderChatMessages() {
  const container = document.getElementById('meeting-ai-messages');
  if (!container) return;

  let html = '';
  if (_aiMessages.length === 0) {
    html = renderWelcomeMessage();
  } else {
    html = _aiMessages.map(renderMessage).join('');
  }

  if (_aiLoading) {
    html += `
      <div class="ai-message assistant" style="display: flex; align-items: center; gap: 10px;">
        <span style="display: inline-block; width: 16px; height: 16px; border: 2px solid var(--border-light); border-top-color: var(--primary); border-radius: 50%; animation: meeting-ai-spin 0.8s linear infinite;"></span>
        <span style="font-size: 12px; color: var(--text-secondary);">AI 思考中...</span>
        <style>@keyframes meeting-ai-spin { to { transform: rotate(360deg); } }</style>
      </div>
    `;
  }

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

function renderMessages() {
  const tabBar = document.getElementById('meeting-ai-tab-bar');
  if (tabBar) tabBar.innerHTML = renderAiTabBar();

  const chatContainer = document.getElementById('meeting-ai-messages');
  const agendaContainer = document.getElementById('meeting-ai-agenda-content');
  const chatFooter = document.getElementById('meeting-ai-chat-footer');

  if (chatContainer) chatContainer.style.display = _activeAiTab === 'chat' ? 'block' : 'none';
  if (agendaContainer) agendaContainer.style.display = _activeAiTab === 'agenda' ? 'flex' : 'none';
  if (agendaContainer) agendaContainer.style.flexDirection = 'column';
  if (chatFooter) chatFooter.style.display = _activeAiTab === 'chat' ? 'block' : 'none';

  if (_activeAiTab === 'chat') {
    renderChatMessages();
  } else if (_activeAiTab === 'agenda') {
    renderAiAgendaInto('meeting-ai-agenda-content');
  }
}

function switchAiTab(tab) {
  if (tab !== 'chat' && tab !== 'agenda') return;
  _activeAiTab = tab;
  renderMessages();
  if (tab === 'chat') {
    setTimeout(() => {
      const input = document.getElementById('meeting-ai-input');
      if (input) input.focus();
    }, 50);
  }
}

function renderContextChip() {
  const chip = document.getElementById('meeting-ai-context-chip');
  if (!chip) return;
  if (_currentMeetingForAi) {
    chip.innerHTML = `📌 当前会议：${escapeHtmlLocal(_currentMeetingForAi.title)}`;
    chip.style.display = 'block';
  } else {
    chip.style.display = 'none';
  }
}

function initMeetingAiState() {
  _aiMessages = [];
  _aiLoading = false;
  _aiSession = null;

  const meetingId = getCurrentMeetingId();
  const meeting = meetingId ? getSafeFindMeeting()(meetingId) : null;
  _currentMeetingForAi = meeting ? getMeetingContext(meeting) : null;
}

function openMeetingAiAssistant(options = {}) {
  if (document.body.classList.contains('meeting-ai-open')) {
    closeMeetingAiAssistant();
    return;
  }
  const defaultTab = options.defaultTab || 'chat';
  _activeAiTab = ['chat', 'agenda'].includes(defaultTab) ? defaultTab : 'chat';
  initMeetingAiState();
  renderContextChip();
  renderMessages();

  document.body.classList.add('meeting-ai-open');

  // 动画结束后聚焦输入框（仅在对话 tab）
  if (_activeAiTab === 'chat') {
    setTimeout(() => {
      const input = document.getElementById('meeting-ai-input');
      if (input) input.focus();
    }, 350);
  }
}

function openMeetingAiAssistantFromEditor() {
  if (document.body.classList.contains('meeting-ai-open')) {
    closeMeetingAiAssistant();
    return;
  }
  const editData = typeof window !== 'undefined' && window._meetingEditData;
  if (editData && editData.id) {
    window._currentDetailMeetingId = editData.id;
  }
  openMeetingAiAssistant({ defaultTab: 'agenda' });
}

function closeMeetingAiAssistant() {
  document.body.classList.remove('meeting-ai-open');
}

function buildResponse(text) {
  const ctx = _currentMeetingForAi;
  if (!ctx) {
    return '💡 我暂时无法获取当前会议信息，请确认你已经打开了一个会议详情。';
  }

  const t = text.toLowerCase();

  if (t.includes('议程') || t.includes('议题')) {
    const meetingId = getCurrentMeetingId();
    const meeting = getSafeFindMeeting()(meetingId);
    const items = Array.isArray(meeting?.agenda_items) ? meeting.agenda_items : [];
    if (items.length === 0) return `📋 「${ctx.title}」暂未设置议程项。`;
    const list = items
      .map((a, i) => `${i + 1}. ${a.title || '未命名议题'}（${parseInt(a.duration, 10) || 0} 分钟）`)
      .join('\n');
    return `📋 「${ctx.title}」共有 ${items.length} 个议程项，总时长 ${ctx.agendaTotalMinutes} 分钟：\n\n${list}`;
  }

  if (t.includes('纪要') || t.includes('总结') || t.includes('要点')) {
    if (!ctx.minutesContent) return `📝 「${ctx.title}」暂时还没有会议纪要内容。你可以在编辑页面补充纪要后再来问我。`;
    const lines = ctx.minutesContent
      .split(/\n|。/)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 5);
    if (lines.length === 0) return `📝 「${ctx.title}」纪要内容较简短，建议补充更多细节。`;
    const summary = lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
    return `📝 「${ctx.title}」纪要要点提炼如下：\n\n${summary}\n\n（以上为基于纪要文本的简要梳理）`;
  }

  if (t.includes('行动项') || t.includes('todo') || t.includes('待办')) {
    const meetingId = getCurrentMeetingId();
    const meeting = getSafeFindMeeting()(meetingId);
    const actions = Array.isArray(meeting?.actions) ? meeting.actions : [];
    const pending = actions.filter(a => a && a.status !== 'completed');
    if (pending.length === 0) return `✅ 「${ctx.title}」当前没有未闭环的行动项，干得好！`;
    const list = pending
      .map((a, i) => `${i + 1}. ${a.content || '未描述'} — 负责人：${a.owner || '待定'}，截止：${a.deadline || '待定'}`)
      .join('\n');
    return `🔔 「${ctx.title}」还有 ${pending.length} 项未闭环行动项：\n\n${list}`;
  }

  if (t.includes('决议') || t.includes('决策')) {
    const meetingId = getCurrentMeetingId();
    const meeting = getSafeFindMeeting()(meetingId);
    const decisions = Array.isArray(meeting?.decisions) ? meeting.decisions : [];
    if (decisions.length === 0) return `📌 「${ctx.title}」暂未记录任何决议。`;
    const list = decisions
      .map((d, i) => `${i + 1}. ${d.content || '未描述'} — 负责人：${d.owner || '待定'}，状态：${d.status || '待定'}`)
      .join('\n');
    return `📌 「${ctx.title}」共有 ${decisions.length} 项决议：\n\n${list}`;
  }

  return `💡 收到你的问题：「${text}」。\n\n你可以尝试问我：\n• 总结本次会议议程\n• 生成会议纪要要点\n• 列出未闭环行动项\n• 本次会议有哪些决议？`;
}

function buildMeetingSystemPrompt() {
  const ctx = _currentMeetingForAi;
  if (!ctx) {
    return '你是 DSTE 战略管理平台的会议 AI 助手。当前没有打开任何会议，请提示用户先打开一个会议详情。';
  }

  return `你是 DSTE 战略管理平台的会议 AI 助手。当前会议信息如下：

会议名称：${ctx.title}
日期：${ctx.date || '未设置'}
主持人：${ctx.host || '未设置'}
场景：${ctx.scenario || '未设置'}
议程项数：${ctx.agendaCount}，总时长 ${ctx.agendaTotalMinutes} 分钟
决议数：${ctx.decisionCount}
行动项总数：${ctx.actionCount}，待闭环 ${ctx.pendingActionCount}，已完成 ${ctx.completedActionCount}

请基于以上信息，用中文简洁、专业地回答用户关于本次会议的问题。如果问题与会议无关，可以友好地说明。`;
}

async function streamAiResponse(text) {
  const client = getAiClient();
  const session = getAiSession();
  const systemPrompt = buildMeetingSystemPrompt();

  _aiMessages.push({ role: 'assistant', content: '' });
  renderMessages();

  try {
    for await (const chunk of client.streamChat(text, {
      session,
      systemPrompt,
      maxTokens: 2048,
    })) {
      if (chunk.content) {
        const lastMsg = _aiMessages[_aiMessages.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.content += chunk.content;
          renderMessages();
        }
      }
    }
  } catch (err) {
    console.error('AI chat error:', err);
    const lastMsg = _aiMessages[_aiMessages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      lastMsg.content = `❌ AI 请求失败：${err.message || '网络错误'}\n\n已切换为本地回复：\n\n${buildResponse(text)}`;
      renderMessages();
    }
  } finally {
    _aiLoading = false;
    renderMessages();
  }
}

function sendMeetingAiMessage() {
  const input = document.getElementById('meeting-ai-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text || _aiLoading) return;

  _aiMessages.push({ role: 'user', content: text });
  _aiLoading = true;
  input.value = '';
  renderMessages();

  streamAiResponse(text);
}

function askMeetingAi(text) {
  const input = document.getElementById('meeting-ai-input');
  if (input) input.value = text;
  sendMeetingAiMessage();
}

function handleMeetingAiKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMeetingAiMessage();
  }
}

function refreshMeetingAiAssistant() {
  if (!document.body.classList.contains('meeting-ai-open')) return;
  initMeetingAiState();
  renderContextChip();
  renderMessages();
  if (typeof window.refreshAiAgendaState === 'function') {
    window.refreshAiAgendaState();
  }
}

// ---- window shim ----
window.openMeetingAiAssistant = openMeetingAiAssistant;
window.openMeetingAiAssistantFromEditor = openMeetingAiAssistantFromEditor;
window.closeMeetingAiAssistant = closeMeetingAiAssistant;
window.sendMeetingAiMessage = sendMeetingAiMessage;
window.askMeetingAi = askMeetingAi;
window.handleMeetingAiKey = handleMeetingAiKey;
window.switchAiTab = switchAiTab;
window.refreshMeetingAiAssistant = refreshMeetingAiAssistant;

export {
  openMeetingAiAssistant,
  openMeetingAiAssistantFromEditor,
  closeMeetingAiAssistant,
  sendMeetingAiMessage,
  askMeetingAi,
  switchAiTab,
};
