/**
 * Meetings Data Store
 * 集中管理经营分析会页面的数据状态、本地存储、API 同步和数据迁移。
 *
 * 设计原则：
 * - window._meetingsData 继续作为运行时单一事实来源。
 * - 所有对 dste_meetings 的读取、写入、迁移、mock 回退、API 同步统一收口到本模块。
 * - 渲染层只读数据，不初始化数据；数据初始化由 init() 调用 initDataStore() 完成。
 */

import { Storage } from '../lib/utils.js';
import { createMeetingsRepository } from '../lib/repository.js';
import { getDefaultSyncQueue } from '../lib/sync-queue.js';
import { ensureLastModified } from '../lib/conflict-resolver.js';
import { normalizePersonField } from '../lib/employee-directory.js';
import { normalizeResolution, syncResolutionsToStore } from './utils/resolution-helpers.js';

const meetingsRepo = createMeetingsRepository({
  version: 6,
  migrators: {
    3: (data) => {
      window._meetingsData = data;
      migrateMeetingsData();
      return window._meetingsData;
    },
    4: (data) => {
      data.forEach(m => {
        normalizePersonField(m, 'host');
        normalizePersonField(m, 'recorder');
        (m.actions || []).forEach(a => { normalizePersonField(a, 'owner'); });
        (m.decisions || []).forEach(d => {
          if (!d.owner && d.decider) d.owner = d.decider;
          normalizePersonField(d, 'owner');
          normalizePersonField(d, 'decider');
        });
        (m.agenda_items || []).forEach(item => { normalizePersonField(item, 'owner'); });
      });
      return data;
    },
    5: (data) => {
      data.forEach(m => {
        (m.agenda_items || []).forEach(a => {
          if (typeof a.reviewReportUrl !== 'string') a.reviewReportUrl = '';
          if (typeof a.reviewScore !== 'number') a.reviewScore = 0;
          if (typeof a.reviewStatus !== 'string') a.reviewStatus = 'pending';
          if (typeof a.lastReviewedAt !== 'string') a.lastReviewedAt = '';
        });
      });
      return data;
    },
    6: (data) => {
      data.forEach(m => {
        (m.agenda_items || []).forEach(a => {
          if (a.sourceTaskId === undefined) a.sourceTaskId = null;
          if (a.sourceTaskName === undefined) a.sourceTaskName = null;
        });
      });
      return data;
    },
  },
});

function getApiBase() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === 'dste.jasonxspace.cc') {
    return Storage.getString('dste_api_base') || '';
  }
  return ''; // 生产环境走同域 /api/ 代理
}

// ===================== Sync Queue =====================
const syncQueue = getDefaultSyncQueue();

function createPerItemExecutor() {
  return async (operation) => {
    // 生产环境 apiBase 为 ''（同域 /api/ 代理），是相对路径而非"未配置"，
    // 绝不能像旧代码那样 if(!apiBase) return，否则生产上推送被静默禁用。
    const apiBase = getApiBase();
    const token = Storage.getString('dste-token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (operation.version != null) {
      headers['If-Match'] = String(operation.version);
    }
    const resp = await fetch(apiBase + operation.endpoint, {
      method: operation.method || 'POST',
      headers,
      body: operation.payload ? JSON.stringify(operation.payload) : undefined,
    });
    if (resp.status === 401) {
      // 登录过期：抛出而非静默 return，避免队列误判"完成"导致变更被悄悄丢弃。
      const err = new Error('登录已过期，数据未能同步到云端');
      err.authExpired = true;
      throw err;
    }
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
  };
}

if (typeof window !== 'undefined') {
  syncQueue.bindAutoProcess(createPerItemExecutor());
}

// ===================== Mock Data =====================

export function getMockMeetings() {
  return [
    {
      isMock: true, id: '20260415', title: '片联一季度经营分析会', date: '2026-04-15', month: '2026-04',
      level: 'L1', scope: 'union', scenario: 'union_quarterly',
      status: 'completed', location: '总部大会议室', host: '陈总裁', recorder: 'Jason.Jing',
      pipeline: { reportGenerated: true, preReviewDone: true, meetingHeld: true, minutesDrafted: true, minutesApproved: true, actionsTracked: true },
      meeting_link: 'https://kms.example.com/docs/Q1-review-2026',
      upstreamMeeting: null, downstreamMeeting: '20260515',
      agenda_items: [
        { type: 'budget_finance', title: 'Q1 财务整体复盘', duration: 45, owner: 'CFO' },
        { type: 'goal_management', title: 'KPI 达成追踪', duration: 30, owner: '运营部' },
        { type: 'business_special', title: '市场洞察与竞争分析', duration: 30, owner: '市场部' },
        { type: 'business_special', title: '风险预警与应对', duration: 20, owner: '风控部' }
      ],
      actions: [
        { id: 'A001', content: 'Q2 营收目标上调至 3.2 亿', owner: '李经理', deadline: '2026-04-30', status: 'in_progress' },
        { id: 'A002', content: '海外渠道新增 2 个代理商', owner: '陈总监', deadline: '2026-05-15', status: 'pending' }
      ],
      decisions: [
        { id: 'D001', content: 'Q2 营收目标 3.2 亿', owner: '李经理', deadline: '2026-04-30', status: 'approved', kmsUrl: 'https://kms.fineres.com/doc/d001' },
        { id: 'D002', content: '海外渠道扩张计划', owner: '陈总监', deadline: '2026-05-15', status: 'pending' }
      ],
      hasMinutes: true, minutesStatus: 'final',
      minutes_content: '1. Q1 营收达成 3.1 亿，同比增长 15%。\n2. 海外市场拓展顺利，新增 3 个区域代理。\n3. 产品 V2.5 版本按期上线，用户满意度提升至 4.5 分。\n4. 下季度重点：渠道下沉 + 产品线扩展。',
      metrics: { materialTimeliness: 98, resolutionTimeliness: 92, actionClosure: 85, satisfaction: 4.5 },
      effectiveness: { overallScore: 92, dimensions: { before: 32, during: 28, after: 32 }, subScores: { materialCompleteness: 6.5, agendaCoverage: 9.5, materialReviewScore: 16, effectiveDiscussion: 11, participation: 10, timeControl: 6, resolutionAndAction: 27, timeliness: 5, postponementDeduction: 0 }, feedback: ['材料充分', '讨论有效', '闭环到位'] }
    },
    {
      isMock: true, id: '20260315', title: '4月营销本部经营分析会', date: '2026-03-15', month: '2026-03',
      level: 'L2', scope: 'hq', scenario: 'hq_routine',
      status: 'completed', location: '会议室 A', host: '张总', recorder: 'Jason.Jing',
      pipeline: { reportGenerated: true, preReviewDone: true, meetingHeld: true, minutesDrafted: true, minutesApproved: true, actionsTracked: false },
      meeting_link: 'https://kms.example.com/docs/apr-hq-meeting',
      upstreamMeeting: '20260215', downstreamMeeting: '20260415',
      agenda_items: [
        { type: 'budget_finance', title: '3月财务复盘', duration: 30, owner: '财务部' },
        { type: 'goal_management', title: 'KPI 达成分析', duration: 25, owner: '运营部' },
        { type: 'key_task_management', title: '上月行动项复盘', duration: 20, owner: '各负责人' }
      ],
      actions: [
        { id: 'A003', content: '产品 V3.0 版本 5 月底上线', owner: '王总监', deadline: '2026-05-31', status: 'in_progress' }
      ],
      decisions: [
        { id: 'D003', content: '产品 V3.0 版本 5 月底上线', owner: '王总监', deadline: '2026-05-31', status: 'approved', kmsUrl: 'https://kms.fineres.com/doc/d003' }
      ],
      hasMinutes: true, minutesStatus: 'final',
      minutes_content: '1. 3月营收 1.2 亿，环比提升 8%。\n2. 产品 V3.0 开发进度 80%，预计 5 月底上线。\n3. 华东区签约目标上调至 8000 万。\n4. 客户满意度调研结果：4.2 分，需重点关注售后响应速度。',
      metrics: { materialTimeliness: 95, resolutionTimeliness: 88, actionClosure: 72, satisfaction: 4.2 },
      effectiveness: { overallScore: 88, dimensions: { before: 31, during: 27, after: 30 }, subScores: { materialCompleteness: 6, agendaCoverage: 9, materialReviewScore: 16, effectiveDiscussion: 10, participation: 10, timeControl: 6, resolutionAndAction: 25, timeliness: 5, postponementDeduction: 0 }, feedback: ['材料充分', '讨论有效', '闭环到位'] }
    },
    {
      isMock: true, id: '20260520', title: '华东战区 5 月经营分析会', date: '2026-05-20', month: '2026-05',
      level: 'L2', scope: 'region_east', scenario: 'region_routine',
      status: 'in_progress', location: '上海办公室', host: '刘战区总', recorder: '王小明',
      pipeline: { reportGenerated: true, preReviewDone: true, meetingHeld: true, minutesDrafted: false, minutesApproved: false, actionsTracked: false },
      meeting_link: 'https://kms.example.com/docs/may-region-east',
      upstreamMeeting: '20260415', downstreamMeeting: null,
      agenda_items: [
        { type: 'budget_finance', title: '5月财务复盘', duration: 30, owner: '财务组' },
        { type: 'business_special', title: '客户满意度分析', duration: 25, owner: '客户成功组' },
        { type: 'key_task_management', title: '行动项跟踪', duration: 20, owner: '运营组' }
      ],
      actions: [
        { id: 'A004', content: '华东区 Q2 签约目标 8000万', owner: '刘战区总', deadline: '2026-06-30', status: 'in_progress' }
      ],
      decisions: [
        { id: 'D004', content: '华东区 Q2 签约目标 8000万', owner: '刘战区总', deadline: '2026-06-30', status: 'approved', kmsUrl: 'https://kms.fineres.com/doc/d004' }
      ],
      hasMinutes: false, minutesStatus: null,
      metrics: { materialTimeliness: 90, resolutionTimeliness: 0, actionClosure: 60, satisfaction: 0 },
      effectiveness: null
    },
    {
      isMock: true, id: '20260525', title: '华南战区业绩承诺会暨经分会', date: '2026-05-25', month: '2026-05',
      level: 'L3', scope: 'region_south', scenario: 'lagging_region',
      status: 'planned', location: '深圳办公室', host: '赵战区总', recorder: '李小红',
      pipeline: { reportGenerated: false, preReviewDone: false, meetingHeld: false, minutesDrafted: false, minutesApproved: false, actionsTracked: false },
      meeting_link: 'https://kms.example.com/docs/Q2-union-review',
      upstreamMeeting: null, downstreamMeeting: null,
      agenda_items: [
        { type: 'budget_finance', title: '业绩差距根因分析', duration: 40, owner: '财务组' },
        { type: 'business_special', title: '风险预警与整改', duration: 30, owner: '风控组' },
        { type: 'key_task_management', title: '整改承诺与跟踪', duration: 30, owner: '各负责人' }
      ],
      actions: [],
      decisions: [],
      hasMinutes: false, minutesStatus: null,
      metrics: { materialTimeliness: 0, resolutionTimeliness: 0, actionClosure: 0, satisfaction: 0 },
      effectiveness: null
    },
    {
      isMock: true, id: '20260601', title: '金融行业客群经分会', date: '2026-06-01', month: '2026-06',
      level: 'L3', scope: 'vertical_finance', scenario: 'lagging_vertical',
      status: 'planned', location: '北京办公室', host: '孙行业总', recorder: '周小华',
      pipeline: { reportGenerated: false, preReviewDone: false, meetingHeld: false, minutesDrafted: false, minutesApproved: false, actionsTracked: false },
      meeting_link: 'https://kms.example.com/docs/Q2-union-review',
      upstreamMeeting: null, downstreamMeeting: null,
      agenda_items: [
        { type: 'budget_finance', title: '客群财务分析', duration: 35, owner: '财务组' },
        { type: 'business_special', title: '客户流失分析', duration: 25, owner: '客户组' },
        { type: 'business_special', title: '产品路线调整', duration: 20, owner: '产品组' }
      ],
      actions: [],
      decisions: [],
      hasMinutes: false, minutesStatus: null,
      metrics: { materialTimeliness: 0, resolutionTimeliness: 0, actionClosure: 0, satisfaction: 0 },
      effectiveness: null
    },
    {
      isMock: true, id: '20260615', title: '片联二季度经营分析会', date: '2026-06-15', month: '2026-06',
      level: 'L1', scope: 'union', scenario: 'union_quarterly',
      status: 'planned', location: '总部大会议室', host: '陈总裁', recorder: '待定',
      pipeline: { reportGenerated: false, preReviewDone: false, meetingHeld: false, minutesDrafted: false, minutesApproved: false, actionsTracked: false },
      meeting_link: 'https://kms.example.com/docs/Q2-union-review',
      upstreamMeeting: null, downstreamMeeting: null,
      agenda_items: [
        { type: 'budget_finance', title: 'Q2 财务复盘', duration: 45, owner: 'CFO' },
        { type: 'goal_management', title: '半年 KPI 追踪', duration: 30, owner: '运营部' }
      ],
      actions: [],
      decisions: [],
      hasMinutes: false, minutesStatus: null,
      metrics: { materialTimeliness: 0, resolutionTimeliness: 0, actionClosure: 0, satisfaction: 0 },
      effectiveness: null
    },
    {
      isMock: true, id: '20260701', title: '7月营销本部经营分析会', date: '2026-07-01', month: '2026-07',
      level: 'L2', scope: 'hq', scenario: 'hq_routine',
      status: 'planned', location: '会议室 B', host: '张总', recorder: '待定',
      pipeline: { reportGenerated: false, preReviewDone: false, meetingHeld: false, minutesDrafted: false, minutesApproved: false, actionsTracked: false },
      meeting_link: 'https://kms.example.com/docs/Q2-union-review',
      upstreamMeeting: '20260615', downstreamMeeting: null,
      agenda_items: [
        { type: 'budget_finance', title: '6月财务复盘', duration: 30, owner: '财务部' },
        { type: 'goal_management', title: 'KPI 达成分析', duration: 25, owner: '运营部' }
      ],
      actions: [],
      decisions: [],
      hasMinutes: false, minutesStatus: null,
      metrics: { materialTimeliness: 0, resolutionTimeliness: 0, actionClosure: 0, satisfaction: 0 },
      effectiveness: null
    }
  ];
}

// ===================== Internal API helpers =====================

function computeMeetingDiff(oldArr, newArr) {
  const oldMap = new Map((oldArr || []).map(m => [String(m.id), m]));
  const newMap = new Map((newArr || []).map(m => [String(m.id), m]));
  const created = [];
  const updated = [];
  const deleted = [];

  for (const [id, m] of newMap) {
    if (!oldMap.has(id)) {
      created.push(m);
    } else if (JSON.stringify(oldMap.get(id)) !== JSON.stringify(m)) {
      updated.push(m);
    }
  }
  for (const id of oldMap.keys()) {
    if (!newMap.has(id)) {
      deleted.push(oldMap.get(id));
    }
  }
  return { created, updated, deleted };
}

function mergeMeetings(local, remote) {
  const map = new Map((local || []).map(m => [String(m.id), m]));
  for (const r of remote || []) {
    const id = String(r.id);
    const l = map.get(id);
    if (!l) {
      map.set(id, r);
    } else if ((r.version || 0) > (l.version || 0)) {
      map.set(id, r);
    } else if ((r.version || 0) === (l.version || 0) && r.lastModified > l.lastModified) {
      map.set(id, r);
    }
  }
  return Array.from(map.values());
}

// 记录最近一次云端拉取的原始结果，供"本地未同步对账"使用。
// { ok: boolean, data: Array|null, authExpired: boolean }
let _lastCloudFetch = { ok: false, data: null, authExpired: false };

async function _apiLoad(endpoint) {
  let apiData = null;
  const apiBase = getApiBase();
  // 生产 apiBase 为 ''（相对路径，走同域 /api/ 代理），不是"未配置"，
  // 必须照常 fetch；旧代码 if(apiBase) 守卫导致生产上从不拉取云端。
  try {
    const token = Storage.getString('dste-token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const resp = await fetch(apiBase + endpoint, { headers });
    if (resp.status === 401) {
      console.warn('API load returned 401');
      if (endpoint === '/api/meetings') _lastCloudFetch = { ok: false, data: null, authExpired: true };
      return null;
    }
    const json = await resp.json();
    if (json.success && json.data) apiData = json.data;
  } catch (e) {
    console.warn('API load failed:', e.message);
  }

  if (endpoint === '/api/meetings') {
    const local = meetingsRepo.getRaw();
    // 云端可达（即便为空数组）才算权威；记录原始云端快照供对账。
    const cloudReachable = apiData !== null;
    _lastCloudFetch = { ok: cloudReachable, data: cloudReachable ? apiData : null, authExpired: false };
    if (apiData && apiData.length > 0) {
      return mergeMeetings(local, apiData);
    }
    if (cloudReachable) {
      // 云端可达但为空：以云端为准（本地视为未同步，交给对账提示）。
      return mergeMeetings(local, apiData);
    }
    // 云端不可达：退回本地，不覆盖。
    if (local && local.length > 0) return local;
  } else if (apiData && apiData.length > 0) {
    return apiData;
  }
  return null;
}

// ===================== Data Store Public API =====================

/**
 * 从 localStorage 或 mock 数据初始化 window._meetingsData。
 * 只在页面初始化时调用一次。
 */
export function initDataStore() {
  if (window._meetingsData) return window._meetingsData;

  let meetings = meetingsRepo.getRaw();
  const storedVersion = Storage.get(meetingsRepo.versionKey, 0);

  // 数据损坏或为空：尝试从备份恢复
  if (!Array.isArray(meetings) || meetings.length === 0) {
    const backup = meetingsRepo.restore();
    if (backup.success) {
      meetings = backup.data;
    }
  }

  // 版本迁移
  if (Array.isArray(meetings) && storedVersion < meetingsRepo.options.version) {
    meetings = meetingsRepo.migrate(meetings, storedVersion);
  }

  if (Array.isArray(meetings) && meetings.length > 0) {
    window._meetingsData = meetings;
    return window._meetingsData;
  }

  // 首次使用或生产环境无数据
  const isLocalDev = ['localhost', '127.0.0.1', 'dste.jasonxspace.cc'].includes(window.location.hostname);
  window._meetingsData = isLocalDev ? getMockMeetings() : [];
  if (!isLocalDev) {
    console.log('[meetings] Production mode: no mock data loaded');
  }
  meetingsRepo.set(window._meetingsData);
  return window._meetingsData;
}

/**
 * 获取当前会议数组（返回 window._meetingsData 引用）。
 */
export function getMeetings() {
  return window._meetingsData || [];
}

/**
 * 按 ID 查找会议。
 */
export function findMeetingById(id) {
  return getMeetings().find(m => m.id === id);
}

/**
 * 查找规则引擎生成的落后战区业绩承诺会（确定性 ID + 元数据回退）。
 * @param {string} period - 考核月份，如 2026-06
 * @param {string} theater - 战区名
 * @param {string} indicatorId - 指标 ID
 * @param {string} ruleId - 规则 ID
 * @returns {Object|null}
 */
export function findExistingLaggingMeeting(period, theater, indicatorId, ruleId) {
  const meetings = getMeetings();
  if (!meetings) return null;

  const normalizedTheater = String(theater || '')
    .replace(/[\s\-_]/g, '')
    .replace(/[（(].*?[)）]/g, '')
    .replace(/大区$/, '')
    .toLowerCase();
  const safePeriod = String(period || '').replace(/-/g, '');
  const safeIndicator = String(indicatorId || '').replace(/[^a-zA-Z0-9]/g, '');
  const safeRule = String(ruleId || '').replace(/[^a-zA-Z0-9]/g, '');
  const deterministicId = `lg_${safePeriod}_${safeIndicator}_${normalizedTheater}_${safeRule}`;

  const byId = meetings.find(m => m.id === deterministicId);
  if (byId) return byId;

  return meetings.find(m => {
    if (m.scenario !== 'lagging_region') return false;
    if (m.month !== period) return false;
    const title = String(m.title || '');
    return title.includes(theater) && title.includes(indicatorId);
  }) || null;
}

/**
 * 替换整个会议数组并持久化。
 */
export function setMeetings(meetings) {
  window._meetingsData = meetings;
  persistMeetings();
}

/**
 * 新增会议并持久化。
 */
export function addMeeting(meeting) {
  getMeetings().push(meeting);
  persistMeetings();
  return meeting;
}

/**
 * 按索引更新会议并持久化。
 */
export function updateMeeting(index, meeting) {
  const meetings = getMeetings();
  if (index >= 0 && index < meetings.length) {
    meetings[index] = meeting;
    persistMeetings();
    return meeting;
  }
  return null;
}

/**
 * 按索引删除会议并持久化。
 */
export function deleteMeetingByIndex(index) {
  const meetings = getMeetings();
  if (index >= 0 && index < meetings.length) {
    meetings.splice(index, 1);
    persistMeetings();
    return true;
  }
  return false;
}

/**
 * 持久化当前会议数据到 localStorage 和 API，并同步决议中心。
 * 所有数据变更后都应调用此方法。
 *
 * 同步策略（当前阶段无权限/无冲突弹窗）：
 * - 比较本地 repo 旧数据与当前内存数据，只把变更的单条会议 PUT 到服务器。
 * - 删除的会议单独 DELETE。
 * - 同一会议并发写入暂时 last-write-wins（不传 If-Match）。
 */
export function persistMeetings() {
  const oldMeetings = meetingsRepo.getRaw();
  const meetings = ensureLastModified(getMeetings());
  window._meetingsData = meetings;

  // 按会议单条同步到服务器
  const { created, updated, deleted } = computeMeetingDiff(oldMeetings, meetings);
  const executor = createPerItemExecutor();
  for (const m of created) {
    syncQueue.enqueue({
      endpoint: `/api/meetings/${encodeURIComponent(m.id)}`,
      method: 'PUT',
      payload: m,
      executor,
    }, { autoProcess: false });
  }
  for (const m of updated) {
    syncQueue.enqueue({
      endpoint: `/api/meetings/${encodeURIComponent(m.id)}`,
      method: 'PUT',
      payload: m,
      version: m.version,
      executor,
    }, { autoProcess: false });
  }
  for (const m of deleted) {
    const resourceKey = `meetings/${encodeURIComponent(m.id)}`;
    syncQueue.removePendingForResource(resourceKey);
    syncQueue.enqueue({
      endpoint: `/api/meetings/${encodeURIComponent(m.id)}`,
      method: 'DELETE',
      version: m.version,
      executor,
    }, { autoProcess: false });
  }

  // 批量入队后统一触发一次处理
  syncQueue.processQueue(executor);

  const saveOk = meetingsRepo.set(meetings);
  if (!saveOk) {
    console.error('[meetings] Failed to persist meetings data');
  }
  syncResolutionsToStore(meetings);

  // 全局待办面板刷新：由面板自己聚合，不维护独立数据
  if (typeof window.refreshTodoPanel === 'function') {
    window.refreshTodoPanel();
  }
}

/**
 * 从远程加载会议数据；若有数据则覆盖本地并持久化。
 */
export async function loadRemoteMeetings() {
  const remote = await _apiLoad('/api/meetings');
  if (remote && remote.length > 0) {
    window._meetingsData = remote;
    // 只把"本地比云端新"的既有记录推上去；不要把刚从云端拉下来的数据
    // 反向重新推送（否则每次加载都产生大量 pending，横幅一直挂着）。
    // 本地独有（created）的记录留给"未同步"横幅由用户确认上传，避免误复活。
    if (_lastCloudFetch.ok) {
      const { updated } = computeMeetingDiff(_lastCloudFetch.data || [], remote);
      if (updated.length) {
        const executor = createPerItemExecutor();
        for (const m of updated) {
          syncQueue.enqueue({
            endpoint: `/api/meetings/${encodeURIComponent(m.id)}`,
            method: 'PUT', payload: m, version: m.version, executor,
          }, { autoProcess: false });
        }
        syncQueue.processQueue(executor);
      }
    }
    // 仅落本地存储，不再调用 persistMeetings（它会用 localStorage 做基线反推云端数据）。
    meetingsRepo.set(remote);
    if (typeof window.refreshTodoPanel === 'function') {
      window.refreshTodoPanel();
    }
    return true;
  }
  return false;
}

/**
 * 计算"仅存在本机、云端没有"的会议（未同步记录）。
 * 仅在最近一次云端拉取成功时才有意义。
 * @returns {{reachable:boolean, authExpired:boolean, unsynced:Array}}
 */
export function getUnsyncedLocalMeetings() {
  if (!_lastCloudFetch.ok) {
    return { reachable: false, authExpired: !!_lastCloudFetch.authExpired, unsynced: [] };
  }
  const cloudIds = new Set((_lastCloudFetch.data || []).map(m => String(m.id)));
  const unsynced = getMeetings().filter(m => !cloudIds.has(String(m.id)));
  return { reachable: true, authExpired: false, unsynced };
}

/**
 * 将本地未同步的会议逐条上传到云端（PUT upsert）。
 * @returns {Promise<{uploaded:number, failed:number, authExpired:boolean}>}
 */
export async function uploadUnsyncedMeetings() {
  const { reachable, unsynced } = getUnsyncedLocalMeetings();
  if (!reachable || !unsynced.length) return { uploaded: 0, failed: 0, authExpired: false };
  const apiBase = getApiBase();
  const token = Storage.getString('dste-token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let uploaded = 0, failed = 0, authExpired = false;
  for (const m of unsynced) {
    try {
      const resp = await fetch(apiBase + '/api/meetings/' + encodeURIComponent(m.id), {
        method: 'PUT', headers, body: JSON.stringify(m),
      });
      if (resp.status === 401) { authExpired = true; failed++; continue; }
      if (!resp.ok) { failed++; continue; }
      uploaded++;
    } catch (e) {
      failed++;
    }
  }
  return { uploaded, failed, authExpired };
}

/**
 * 会议同步队列状态摘要（pending/failed），用于页面可见化。
 */
export function getMeetingSyncStatus() {
  return syncQueue.getStatus();
}

/**
 * 将同步失败的会议变更重置为 pending 并重新触发同步（供"重试"按钮）。
 */
export function retryFailedMeetingSync() {
  return syncQueue.retryFailed(createPerItemExecutor());
}

/**
 * 数据模型向后兼容：补齐新增字段、迁移决议状态、清理旧评分模型、规范化行动项。
 * @returns {boolean} 是否有数据被清理/修改（需要持久化）
 */
export function migrateMeetingsData() {
  let cleanedAny = false;
  const meetings = getMeetings();
  meetings.forEach(m => {
    if (typeof m.pre_report_id !== 'string') m.pre_report_id = '';
    if (typeof m.minutes_report_id !== 'string') m.minutes_report_id = '';
    (m.agenda_items || []).forEach(a => {
      if (!a.id) a.id = 'ag_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      if (!Array.isArray(a.data_views)) a.data_views = [];
      if (typeof a.pre_report_section !== 'string') a.pre_report_section = '';
      if (!a.status) a.status = 'planned';
      if (!a.originalAgendaId) a.originalAgendaId = a.id;
      if (typeof a.postponedCount !== 'number') a.postponedCount = 0;
      if (!a.carriedFromAgendaId) a.carriedFromAgendaId = null;
      if (!a.carriedFromMeetingId) a.carriedFromMeetingId = null;
      if (!Array.isArray(a.postponedHistory)) a.postponedHistory = [];
      // G2: 材料审核状态缓存（additive）
      if (typeof a.reviewReportUrl !== 'string') a.reviewReportUrl = '';
      if (typeof a.reviewScore !== 'number') a.reviewScore = 0;
      if (typeof a.reviewStatus !== 'string') a.reviewStatus = 'pending';
      if (typeof a.lastReviewedAt !== 'string') a.lastReviewedAt = '';
      // G3: 重点工作关联（additive，null = 未关联）
      if (a.sourceTaskId === undefined) a.sourceTaskId = null;
      if (a.sourceTaskName === undefined) a.sourceTaskName = null;
    });
    if (Array.isArray(m.decisions)) {
      m.decisions = m.decisions.map(d => normalizeResolution(d, m));
    }
    if (m.effectiveness && (m.effectiveness.dimensions?.preparation !== undefined)) {
      m.effectiveness = null;
      cleanedAny = true;
    }
    if (Array.isArray(m.actions)) {
      const beforeCount = m.actions.length;
      m.actions = m.actions
        .filter(a => (a.content || '').trim() || (a.owner || '').trim())
        .map(a => {
          const progressNote = a.progressNote || '';
          const progressLogs = Array.isArray(a.progressLogs) ? [...a.progressLogs] : [];
          // 将已有 progressNote 迁移为第一条跟进记录，避免历史数据丢失
          if (progressNote && progressLogs.length === 0) {
            progressLogs.push({
              content: progressNote,
              createdAt: a.updatedAt || a.createdAt || new Date().toISOString(),
            });
          }
          return {
            id: a.id || ('A' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
            content: a.content || '',
            owner: a.owner || '',
            deadline: a.deadline || '',
            status: a.status || 'pending',
            progress: typeof a.progress === 'number' ? a.progress : 0,
            progressNote,
            sourceAgendaId: a.sourceAgendaId || '',
            sourceDecisionId: a.sourceDecisionId || '',
            sourceMeetingId: a.sourceMeetingId || m.id || '',
            sourceMeetingTitle: a.sourceMeetingTitle || m.title || '',
            assistants: Array.isArray(a.assistants) ? a.assistants : [],
            acceptanceCriteria: a.acceptanceCriteria || '',
            verificationView: a.verificationView || '',
            progressLogs,
            riskLevel: a.riskLevel || 'normal',
            reminderCount: a.reminderCount || 0,
            lastRemindedAt: a.lastRemindedAt || null,
            createdAt: a.createdAt || new Date().toISOString(),
            updatedAt: a.updatedAt || new Date().toISOString(),
            completedAt: a.completedAt || null,
          };
        });
      if (m.actions.length !== beforeCount) cleanedAny = true;
    }
  });
  return cleanedAny;
}

// Re-export for convenience
export { syncResolutionsToStore };
