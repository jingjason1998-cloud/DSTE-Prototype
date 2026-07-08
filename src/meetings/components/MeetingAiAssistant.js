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
import { icon } from '../../../assets/js/icons.js';
import { AIClient, AITools } from '../../lib/ai-client.js';
import { gatherBusinessContext, formatContextForAI } from '../../lib/ai-context.js';

let _aiMessages = [];
let _aiLoading = false;
let _currentMeetingForAi = null;
let _globalMeetingsContext = null;
let _activeAiTab = 'chat'; // 'chat' | 'agenda'
let _aiClient = null;
let _aiSession = null;
let _pendingAiDrafts = []; // AI 生成的待确认草案（行动项/决议等）

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

const GLOBAL_SUGGESTIONS = [
  '本月还有哪些会议没开？',
  '汇总所有待闭环行动项',
  '最近会议决议执行情况如何？',
  '生成经营分析会周报草稿',
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
  const isGlobal = !_currentMeetingForAi;
  const suggestions = isGlobal ? GLOBAL_SUGGESTIONS : SUGGESTIONS;
  const chips = suggestions.map(
    (s) => `<span class="meeting-ai-suggestion" onclick="askMeetingAi('${escapeHtmlLocal(s)}')">${escapeHtmlLocal(s)}</span>`
  ).join('');

  if (isGlobal) {
    return `
      <div class="ai-message assistant">
        <div>${icon('handWave', {size: 14})} 你好！我是你的经营分析会 AI 助手。当前为全局视图，我可以帮你：</div>
        <ul style="margin: 8px 0; padding-left: 18px; line-height: 1.7;">
          <li>了解会议整体情况与待办分布</li>
          <li>汇总决议执行与行动项闭环</li>
          <li>按场景/月份筛选会议并生成摘要</li>
          <li>起草经营分析会周报或汇报材料</li>
        </ul>
        <div class="ai-suggestions">${chips}</div>
      </div>
    `;
  }

  return `
    <div class="ai-message assistant">
      <div>${icon('handWave', {size: 14})} 你好！我是你的会议 AI 助手。我可以帮你：</div>
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
      <button type="button" class="meeting-ai-tab ${chatActive}" onclick="switchAiTab('chat')">${icon('chat', {size: 14})} 对话</button>
      <button type="button" class="meeting-ai-tab ${agendaActive}" onclick="switchAiTab('agenda')">${icon('clipboardText', {size: 14})} 议程推荐</button>
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

  html += renderDraftCards();

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
    chip.innerHTML = `${icon('pushPin', {size: 14})} 当前会议：${escapeHtmlLocal(_currentMeetingForAi.title)}`;
    chip.style.display = 'block';
  } else if (_globalMeetingsContext) {
    const { summary } = _globalMeetingsContext;
    chip.innerHTML = `${icon('pushPin', {size: 14})} 当前视图：经营分析会全局（${summary.meetingCount || 0} 场会议）`;
    chip.style.display = 'block';
  } else {
    chip.style.display = 'none';
  }
}

function initMeetingAiState() {
  _aiMessages = [];
  _aiLoading = false;
  _aiSession = null;
  _pendingAiDrafts = [];

  const meetingId = getCurrentMeetingId();
  const meeting = meetingId ? getSafeFindMeeting()(meetingId) : null;
  _currentMeetingForAi = meeting ? getMeetingContext(meeting) : null;
  _globalMeetingsContext = _currentMeetingForAi
    ? null
    : gatherBusinessContext({ maxMeetings: 10, maxTasks: 5, maxKpis: 5, maxTopics: 3, maxResolutions: 5 });
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
    return `${icon('lightbulb', {size: 14})} 当前为经营分析会全局视图。我已收到你的问题，但网络请求失败，无法调用 AI。请稍后重试，或尝试打开具体会议详情后再提问。`;
  }

  const t = text.toLowerCase();

  if (t.includes('议程') || t.includes('议题')) {
    const meetingId = getCurrentMeetingId();
    const meeting = getSafeFindMeeting()(meetingId);
    const items = Array.isArray(meeting?.agenda_items) ? meeting.agenda_items : [];
    if (items.length === 0) return `${icon('clipboardText', {size: 14})} 「${ctx.title}」暂未设置议程项。`;
    const list = items
      .map((a, i) => `${i + 1}. ${a.title || '未命名议题'}（${parseInt(a.duration, 10) || 0} 分钟）`)
      .join('\n');
    return `${icon('clipboardText', {size: 14})} 「${ctx.title}」共有 ${items.length} 个议程项，总时长 ${ctx.agendaTotalMinutes} 分钟：\n\n${list}`;
  }

  if (t.includes('纪要') || t.includes('总结') || t.includes('要点')) {
    if (!ctx.minutesContent) return `${icon('fileText', {size: 14})} 「${ctx.title}」暂时还没有会议纪要内容。你可以在编辑页面补充纪要后再来问我。`;
    const lines = ctx.minutesContent
      .split(/\n|。/)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 5);
    if (lines.length === 0) return `${icon('fileText', {size: 14})} 「${ctx.title}」纪要内容较简短，建议补充更多细节。`;
    const summary = lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
    return `${icon('fileText', {size: 14})} 「${ctx.title}」纪要要点提炼如下：\n\n${summary}\n\n（以上为基于纪要文本的简要梳理）`;
  }

  if (t.includes('行动项') || t.includes('todo') || t.includes('待办')) {
    const meetingId = getCurrentMeetingId();
    const meeting = getSafeFindMeeting()(meetingId);
    const actions = Array.isArray(meeting?.actions) ? meeting.actions : [];
    const pending = actions.filter(a => a && a.status !== 'completed');
    if (pending.length === 0) return `${icon('check', {size: 14})} 「${ctx.title}」当前没有未闭环的行动项，干得好！`;
    const list = pending
      .map((a, i) => `${i + 1}. ${a.content || '未描述'} — 负责人：${a.owner || '待定'}，截止：${a.deadline || '待定'}`)
      .join('\n');
    return `${icon('notification', {size: 14})} 「${ctx.title}」还有 ${pending.length} 项未闭环行动项：\n\n${list}`;
  }

  if (t.includes('决议') || t.includes('决策')) {
    const meetingId = getCurrentMeetingId();
    const meeting = getSafeFindMeeting()(meetingId);
    const decisions = Array.isArray(meeting?.decisions) ? meeting.decisions : [];
    if (decisions.length === 0) return `${icon('pushPin', {size: 14})} 「${ctx.title}」暂未记录任何决议。`;
    const list = decisions
      .map((d, i) => `${i + 1}. ${d.content || '未描述'} — 负责人：${d.owner || '待定'}，状态：${d.status || '待定'}`)
      .join('\n');
    return `${icon('pushPin', {size: 14})} 「${ctx.title}」共有 ${decisions.length} 项决议：\n\n${list}`;
  }

  return `${icon('lightbulb', {size: 14})} 收到你的问题：「${text}」。\n\n你可以尝试问我：\n• 总结本次会议议程\n• 生成会议纪要要点\n• 列出未闭环行动项\n• 本次会议有哪些决议？`;
}

function buildMeetingSystemPrompt() {
  if (!_currentMeetingForAi) {
    const ctxText = _globalMeetingsContext ? formatContextForAI(_globalMeetingsContext) : '暂无业务数据。';
    return `你是 DSTE 战略管理平台的会议 AI 助手。当前为经营分析会全局视图，未选中具体会议。

请基于以下经营分析会全局上下文，用中文简洁、专业地回答用户问题。

${ctxText}

注意事项：
- 如果用户问题涉及某场具体会议的议程、行动项或决议，请建议用户打开该会议详情，或询问用户想查询哪场会议。
- 当用户想要创建行动项时，提示用户先进入目标会议详情页或编辑器。
- 当用户想要创建新会议时，使用 createMeeting(title, date?, scenario?, level?, host?, location?) 草拟会议，不会直接写入系统，只会生成草案等待用户确认。
- 所有结论尽量给出数据来源。
- 涉及写入操作时只生成草案并提示用户确认。`;
  }

  const ctx = _currentMeetingForAi;
  return `你是 DSTE 战略管理平台的会议 AI 助手。当前会议信息如下：

会议名称：${ctx.title}
日期：${ctx.date || '未设置'}
主持人：${ctx.host || '未设置'}
场景：${ctx.scenario || '未设置'}
议程项数：${ctx.agendaCount}，总时长 ${ctx.agendaTotalMinutes} 分钟
决议数：${ctx.decisionCount}
行动项总数：${ctx.actionCount}，待闭环 ${ctx.pendingActionCount}，已完成 ${ctx.completedActionCount}

请基于以上信息，用中文简洁、专业地回答用户关于本次会议的问题。\n\n你可以使用以下工具获取更详细的会议数据：\n- queryMeetingAgenda(meetingId): 查询会议议程项\n- queryMeetingActions(meetingId): 查询会议行动项\n- queryMeetingResolutions(meetingId): 查询会议决议\n
当用户想要创建行动项时，使用 createActionItem(meetingId, content, owner?, deadline?) 草拟行动项。此工具不会直接写入系统，只会生成草案等待用户确认。\n当用户问题涉及具体议程、行动项或决议时，请先调用对应工具获取完整数据，再基于数据回答。如果问题与会议无关，可以友好地说明。`;
}

async function streamAiResponse(text) {
  const client = getAiClient();
  const session = getAiSession();
  const systemPrompt = buildMeetingSystemPrompt();
  const meetingId = getCurrentMeetingId();

  _aiMessages.push({ role: 'assistant', content: '' });
  renderMessages();

  try {
    const tools = [
      AITools.queryMeetingAgenda,
      AITools.queryMeetingActions,
      AITools.queryMeetingResolutions,
      AITools.createActionItem,
      AITools.createMeeting,
    ];
    const result = await client.callWithTools(text, tools, {
      session,
      systemPrompt,
      maxTokens: 2048,
    });
    const lastMsg = _aiMessages[_aiMessages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      lastMsg.content = result.content || 'AI 未返回有效回复';
    }

    // 收集需要用户确认的草案
    const drafts = (result.toolResults || [])
      .filter(tr => tr.result && tr.result.draft)
      .map(tr => ({
        id: generateDraftId(),
        type: tr.result.type,
        meetingId: tr.result.meetingId || meetingId,
        data: tr.result.actionItem || tr.result.meeting || tr.result.data,
        raw: tr.result,
      }));
    if (drafts.length > 0) {
      _pendingAiDrafts.push(...drafts);
    }
  } catch (err) {
    console.error('AI chat error:', err);
    const lastMsg = _aiMessages[_aiMessages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      lastMsg.content = `${icon('x', {size: 14})} AI 请求失败：${err.message || '网络错误'}\n\n已切换为本地回复：\n\n${buildResponse(text)}`;
    }
  } finally {
    _aiLoading = false;
    renderMessages();
  }
}

function generateDraftId() {
  return `ai_draft_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function getSafeShowToast() {
  return typeof window !== 'undefined' && typeof window.showToast === 'function'
    ? window.showToast
    : (msg, type = 'info') => console.log(`[toast:${type}]`, msg);
}

function confirmAiDraft(draftId) {
  const idx = _pendingAiDrafts.findIndex(d => d.id === draftId);
  if (idx < 0) return;
  const draft = _pendingAiDrafts[idx];

  if (draft.type === 'actionItem' && draft.data) {
    applyAiActionItem(draft.meetingId, draft.data);
  }

  if (draft.type === 'meeting' && draft.data) {
    applyAiMeeting(draft.data);
  }

  _pendingAiDrafts.splice(idx, 1);
  renderMessages();
}

function cancelAiDraft(draftId) {
  const idx = _pendingAiDrafts.findIndex(d => d.id === draftId);
  if (idx < 0) return;
  _pendingAiDrafts.splice(idx, 1);
  renderMessages();
}

function applyAiActionItem(meetingId, actionItem) {
  if (!meetingId || !actionItem) return;

  // 优先写入当前编辑中的会议
  const editData = typeof window !== 'undefined' ? window._meetingEditData : null;
  if (editData && editData.id === meetingId) {
    if (!editData.actions) editData.actions = [];
    editData.actions.push(actionItem);
    if (typeof window.renderActionList === 'function') window.renderActionList();
    getSafeShowToast()('已创建行动项', 'success');
    return;
  }

  // 否则暂存，进入编辑器后自动应用
  if (!window._pendingActionItemAdoptions) window._pendingActionItemAdoptions = new Map();
  const existing = window._pendingActionItemAdoptions.get(meetingId) || [];
  window._pendingActionItemAdoptions.set(meetingId, existing.concat(actionItem));
  if (typeof window.openMeetingEditor === 'function') {
    window.openMeetingEditor(meetingId);
  } else {
    getSafeShowToast()('无法自动打开编辑器，请手动编辑会议', 'warning');
  }
}

function applyAiMeeting(meeting) {
  if (!meeting || !meeting.id) return;

  if (typeof window === 'undefined') return;

  window._meetingEditData = JSON.parse(JSON.stringify(meeting));
  const ov = document.getElementById('meeting-editor-overlay');
  if (ov) {
    ov.style.display = 'flex';
    ov.dataset.isNew = 'true';
  }

  if (typeof window.renderEditorForm === 'function') {
    window.renderEditorForm();
  }

  // 关闭 AI 抽屉，避免遮挡编辑器
  closeMeetingAiAssistant();
  getSafeShowToast()('已打开会议编辑器，请检查并保存', 'success');
}

function renderDraftCards() {
  if (_pendingAiDrafts.length === 0) return '';

  const scenarioLabel = (key) => {
    const map = {
      union_quarterly: '片联季度会议',
      hq_routine: '营销本部月/双周会',
      region_routine: '战区月度经营分析会',
      lagging_region: '落后战区业绩承诺会',
      lagging_vertical: '落后垂直客群经分会',
    };
    return map[key] || key;
  };

  return _pendingAiDrafts.map(draft => {
    if (draft.type === 'actionItem' && draft.data) {
      const item = draft.data;
      return `
        <div class="ai-draft-card" style="margin: 10px 0; padding: 12px; border: 1px dashed var(--primary); border-radius: 8px; background: color-mix(in srgb, var(--primary) 6%, transparent);">
          <div style="font-size: 12px; font-weight: 600; color: var(--primary); margin-bottom: 8px;">${icon('fileText', {size: 14})} AI 草拟行动项（待确认）</div>
          <div style="font-size: 12px; color: var(--text-primary); line-height: 1.6;">
            <div><strong>内容：</strong>${escapeHtmlLocal(item.content)}</div>
            <div><strong>负责人：</strong>${escapeHtmlLocal(item.owner) || '<span style="color:var(--text-tertiary)">未指定</span>'}</div>
            <div><strong>截止：</strong>${escapeHtmlLocal(item.deadline)}</div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 10px;">
            <button type="button" onclick="confirmAiDraft('${draft.id}')" style="padding: 5px 12px; font-size: 11px; border: none; border-radius: 4px; background: var(--primary); color: #fff; cursor: pointer;">确认创建</button>
            <button type="button" onclick="cancelAiDraft('${draft.id}')" style="padding: 5px 12px; font-size: 11px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); color: var(--text-secondary); cursor: pointer;">取消</button>
          </div>
        </div>
      `;
    }

    if (draft.type === 'meeting' && draft.data) {
      const m = draft.data;
      return `
        <div class="ai-draft-card" style="margin: 10px 0; padding: 12px; border: 1px dashed var(--primary); border-radius: 8px; background: color-mix(in srgb, var(--primary) 6%, transparent);">
          <div style="font-size: 12px; font-weight: 600; color: var(--primary); margin-bottom: 8px;">${icon('fileText', {size: 14})} AI 草拟会议（待确认）</div>
          <div style="font-size: 12px; color: var(--text-primary); line-height: 1.6;">
            <div><strong>标题：</strong>${escapeHtmlLocal(m.title)}</div>
            <div><strong>日期：</strong>${escapeHtmlLocal(m.date)}</div>
            <div><strong>场景：</strong>${scenarioLabel(m.scenario) || '<span style="color:var(--text-tertiary)">未指定</span>'}</div>
            <div><strong>层级：</strong>${escapeHtmlLocal(m.level) || '<span style="color:var(--text-tertiary)">未指定</span>'}</div>
            <div><strong>主持人：</strong>${escapeHtmlLocal(m.host) || '<span style="color:var(--text-tertiary)">未指定</span>'}</div>
            <div><strong>地点：</strong>${escapeHtmlLocal(m.location) || '<span style="color:var(--text-tertiary)">未指定</span>'}</div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 10px;">
            <button type="button" onclick="confirmAiDraft('${draft.id}')" style="padding: 5px 12px; font-size: 11px; border: none; border-radius: 4px; background: var(--primary); color: #fff; cursor: pointer;">确认创建</button>
            <button type="button" onclick="cancelAiDraft('${draft.id}')" style="padding: 5px 12px; font-size: 11px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); color: var(--text-secondary); cursor: pointer;">取消</button>
          </div>
        </div>
      `;
    }

    return '';
  }).join('');
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
window.confirmAiDraft = confirmAiDraft;
window.cancelAiDraft = cancelAiDraft;
window.applyAiMeeting = applyAiMeeting;

export {
  openMeetingAiAssistant,
  openMeetingAiAssistantFromEditor,
  closeMeetingAiAssistant,
  sendMeetingAiMessage,
  askMeetingAi,
  switchAiTab,
};
