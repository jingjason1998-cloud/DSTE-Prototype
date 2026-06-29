/**
 * AI 议程推荐 API 封装
 * @module agenda-recommender
 *
 * 纯函数：构造推荐上下文、调用后端 AI 服务、候选转议程项。
 * 不涉及 DOM 操作。
 */

import { Storage, escapeHtml } from '../../lib/utils.js';
import { AIClient } from '../../lib/ai-client.js';
import { getMeetings } from '../data-store.js';

const AI_AGENDA_ENDPOINT = '/api/ai/agenda';
const AI_AGENDA_TIMEOUT = 25000;

/**
 * 获取 AI 议程推荐 API 完整 URL
 *
 * 优先级：
 * 1. localStorage.meetingReviewerProxyUrl — 与会议评审后端共用
 * 2. localStorage.dste_api_base — 通用 API Base 覆盖
 * 3. 默认 Cloudflare Worker（https://dste-api.jasonxspace.workers.dev）
 *
 * @param {string} [endpoint] - 端点路径，默认 /api/ai/agenda
 * @returns {string} 完整 URL
 */
export function getAiAgendaApiUrl(endpoint = AI_AGENDA_ENDPOINT) {
  const customReviewer = Storage.getString('meetingReviewerProxyUrl');
  if (customReviewer) return customReviewer.replace(/\/$/, '') + endpoint;

  const customBase = Storage.getString('dste_api_base');
  if (customBase) return customBase.replace(/\/$/, '') + endpoint;

  return 'https://dste-api.jasonxspace.workers.dev' + endpoint;
}

/**
 * 从 localStorage 读取未闭环决议列表
 * @returns {Array}
 */
export function getOpenResolutions() {
  try {
    const raw = Storage.get('dste_resolutions_v2', { resolutions: [] });
    const list = Array.isArray(raw) ? raw : (raw.resolutions || []);
    return list.filter(r => r.status !== 'closed');
  } catch (e) {
    return [];
  }
}

/**
 * 从 localStorage 读取 OMP 重点工作（仅标题/截止日/状态/风险）
 * @returns {Array}
 */
export function getOmpKeyWorks() {
  try {
    const raw = Storage.get('dste_omp_tasks_v1', []);
    const tasks = Array.isArray(raw) ? raw : [];
    return tasks
      .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
      .map(t => ({
        id: t.id || '',
        title: t.title || t.name || '',
        deadline: t.deadline || '',
        status: t.status || '',
        riskLevel: t.riskLevel || t.risk || '',
        owner: t.owner || t.department || '',
      }));
  } catch (e) {
    return [];
  }
}

/**
 * 判断两个议程标题是否相似（简单包含/相等）
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function isSimilarAgendaTitle(a, b) {
  const normalize = s => (s || '').toLowerCase().replace(/\s+/g, '').replace(/[，。]/g, '');
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * 为当前会议构造推荐上下文
 * @param {Object} meeting - 当前编辑中的会议对象
 * @param {Object} [options]
 * @param {string} [options.theme] - 用户输入的本次会议主题
 * @returns {Object}
 */
export function buildRecommendationContext(meeting, options = {}) {
  const allMeetings = getMeetings();
  const meetingDate = meeting.date || '';
  const scenario = meeting.scenario || '';
  const existingAgendaTitles = (meeting.agenda_items || [])
    .map(a => (a.title || '').trim())
    .filter(Boolean);

  // 1. 同场景近 6 期历史会议议程（去重，排除与已有议程相似的）
  const historicalAgendas = allMeetings
    .filter(m => m.id !== meeting.id && (scenario ? m.scenario === scenario : true))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 6)
    .flatMap(m => (m.agenda_items || [])
      .filter(a => a.title && a.title.trim())
      .filter(a => !existingAgendaTitles.some(t => isSimilarAgendaTitle(t, a.title)))
      .map(a => ({
        title: escapeHtml((a.title || '').trim()),
        type: a.type || 'other',
        duration: a.duration || 20,
        owner: escapeHtml(a.owner || ''),
        sourceMeetingTitle: escapeHtml(m.title || ''),
        sourceMeetingId: m.id || '',
        sourceMeetingDate: m.date || '',
      }))
    );

  // 去重：按标题
  const seenTitles = new Set();
  const uniqueHistorical = [];
  for (const item of historicalAgendas) {
    const key = (item.title || '').toLowerCase();
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    uniqueHistorical.push(item);
  }

  // 2. 当前会议中被顺延的议程
  const postponedAgendas = (meeting.agenda_items || [])
    .filter(a => a.status === 'postponed')
    .map(a => ({
      id: a.id || '',
      title: escapeHtml((a.title || '').trim()),
      type: a.type || 'other',
      postponedCount: a.postponedCount || 0,
      sourceMeetingTitle: escapeHtml(a.carriedFromMeetingId ? '往期会议' : ''),
    }));

  // 3. 所有会议中未完成的行动项（按截止日期接近会议日期排序）
  const openActions = allMeetings
    .flatMap(m => (m.actions || [])
      .filter(a => a.status !== 'completed' && a.content)
      .filter(a => !existingAgendaTitles.some(t => isSimilarAgendaTitle(t, a.content)))
      .map(a => ({
        id: a.id || '',
        content: escapeHtml((a.content || '').trim()),
        owner: escapeHtml(a.owner || ''),
        deadline: a.deadline || '',
        status: a.status || 'pending',
        sourceMeetingTitle: escapeHtml(m.title || ''),
        sourceMeetingId: m.id || '',
        riskLevel: a.riskLevel || '',
      }))
    )
    .sort((a, b) => {
      // 逾期/临近截止优先
      const da = a.deadline || '9999-12-31';
      const db = b.deadline || '9999-12-31';
      if (meetingDate) {
        const adiff = Math.abs(da.localeCompare(meetingDate));
        const bdiff = Math.abs(db.localeCompare(meetingDate));
        return adiff - bdiff;
      }
      return da.localeCompare(db);
    })
    .slice(0, 15);

  // 4. 未闭环决议
  const openResolutions = getOpenResolutions()
    .filter(r => r.content && !existingAgendaTitles.some(t => isSimilarAgendaTitle(t, r.content)))
    .slice(0, 10)
    .map(r => ({
      id: r.id || '',
      content: escapeHtml((r.content || '').trim()),
      owner: escapeHtml(r.owner || ''),
      deadline: r.deadline || '',
      status: r.status || 'pending',
      sourceMeetingTitle: escapeHtml(r.sourceMeetingTitle || ''),
      sourceMeetingId: r.sourceMeetingId || '',
    }));

  // 5. OMP 重点工作
  const keyWorks = getOmpKeyWorks()
    .filter(t => t.title && !existingAgendaTitles.some(title => isSimilarAgendaTitle(title, t.title)))
    .slice(0, 10);

  return {
    theme: escapeHtml((options.theme || meeting.theme || '').trim()),
    historicalAgendas: uniqueHistorical.slice(0, 20),
    postponedAgendas,
    openActions,
    openResolutions,
    keyWorks,
  };
}

/**
 * 调用 AI 服务获取议程候选
 * @param {Object} meeting - 会议对象
 * @param {Object} [options]
 * @param {string} [options.theme] - 本次会议主题
 * @returns {Promise<{success: boolean, candidates?: Array, error?: string}>}
 */
export async function recommendAgenda(meeting, options = {}) {
  const client = new AIClient();

  try {
    const data = await client.request(
      AI_AGENDA_ENDPOINT,
      {
        meeting,
        theme: options.theme || meeting.theme || '',
        context: buildRecommendationContext(meeting, options),
      },
      { timeout: AI_AGENDA_TIMEOUT }
    );

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'AI 推荐请求超时，请稍后重试' };
    }
    return { success: false, error: err.message || '网络错误' };
  }
}

/**
 * 将 AI 候选转换为标准 AgendaItem
 * @param {Object} candidate
 * @returns {Object}
 */
export function candidateToAgendaItem(candidate) {
  const now = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  const rawDuration = Number(candidate.duration);
  const duration = Number.isFinite(rawDuration) ? rawDuration : 20;
  return {
    id: candidate.id || `ag_${now}_${rand}`,
    type: ['goal_management', 'key_task_management', 'budget_finance', 'human_resources', 'business_special'].includes(candidate.type)
      ? candidate.type
      : 'other',
    title: (candidate.title || '').trim(),
    duration: Math.min(120, Math.max(5, duration)),
    owner: (candidate.owner || '').trim(),
    material_link: '',
    data_views: [],
    pre_report_section: '',
    status: 'planned',
    originalAgendaId: null,
    postponedCount: 0,
    carriedFromAgendaId: candidate.sourceType === 'postponed_agenda' ? candidate.sourceId : null,
    carriedFromMeetingId: null,
    postponedHistory: [],
  };
}

/**
 * 获取议程类型标签（复用 meetings.html 内的命名约定）
 * @param {string} type
 * @returns {string}
 */
export function getAgendaTypeLabel(type) {
  const map = {
    goal_management: '目标管理',
    key_task_management: '重点任务',
    budget_finance: '预算财务',
    human_resources: '人力资源',
    business_special: '业务专题',
    other: '其他',
  };
  return map[type] || '其他';
}

/**
 * 获取来源类型中文标签
 * @param {string} sourceType
 * @returns {string}
 */
export function getSourceTypeLabel(sourceType) {
  const map = {
    postponed_agenda: '顺延议程',
    open_action: '待办行动项',
    open_resolution: '未闭环决议',
    key_work: 'OMP 重点工作',
    historical: '历史会议',
    theme: '主题推荐',
  };
  return map[sourceType] || 'AI 推荐';
}
