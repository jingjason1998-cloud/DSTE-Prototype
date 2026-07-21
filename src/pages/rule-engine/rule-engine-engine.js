/**
 * 规则引擎核心算法
 * @module rule-engine-engine
 *
 * 纯函数：规则解析、战区排名、触发判断、会议生成。
 * 不涉及 DOM、localStorage 或网络请求。
 */

/** 默认十大战区列表 */
export const DEFAULT_WARZONES = [
  '北京大区', '上海大区', '华南大区', '浙闽大区', '苏皖大区',
  '西南大区', '华北大区', '华中大区', '西北大区', '东北大区',
];

/** 规则触发模式 */
export const TRIGGER_MODE = {
  MANUAL: 'manual',
  SCHEDULED: 'scheduled',
  BOTH: 'both',
};

/** 规则执行结果状态 */
export const RESULT_STATUS = {
  CREATED: 'created',
  DRAFT: 'draft',
  SKIPPED_DUPLICATE: 'skipped_duplicate',
  FAILED: 'failed',
};

/**
 * 解析目标周期
 * @param {Object} schedule
 * @param {string} [basePeriod] - 基础周期，默认当前月份 YYYY-MM
 * @returns {string}
 */
export function resolvePeriod(schedule, basePeriod) {
  const { periodType = 'month', periodOffset = -1 } = schedule || {};

  let base;
  if (basePeriod) {
    base = new Date(basePeriod + '-01');
    if (Number.isNaN(base.getTime())) {
      base = new Date();
    }
  } else {
    base = new Date();
  }

  if (periodType === 'month') {
    base.setMonth(base.getMonth() + periodOffset);
    return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
  }

  if (periodType === 'quarter') {
    const month = base.getMonth() + periodOffset * 3;
    base.setMonth(month);
    const quarter = Math.floor(base.getMonth() / 3) + 1;
    return `${base.getFullYear()}-Q${quarter}`;
  }

  if (periodType === 'year') {
    base.setFullYear(base.getFullYear() + periodOffset);
    return `${base.getFullYear()}`;
  }

  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 判断 KPI 实例 period 是否匹配目标 period
 * @param {string} instancePeriod
 * @param {string} targetPeriod
 * @returns {boolean}
 */
export function periodMatches(instancePeriod, targetPeriod) {
  if (!instancePeriod || !targetPeriod) return false;
  return String(instancePeriod).trim() === String(targetPeriod).trim();
}

/**
 * 标准化战区名，用于生成确定性 ID
 * @param {string} theater
 * @returns {string}
 */
export function normalizeTheater(theater) {
  return String(theater || '')
    .replace(/[\s\-_]/g, '')
    .replace(/[（(].*?[)）]/g, '')
    .replace(/大区$/, '')
    .toLowerCase();
}

/**
 * 获取 KPI 状态
 * @param {number} achievementRate
 * @param {number} actualValue
 * @returns {'achieved'|'warning'|'lagging'}
 */
export function getKpiStatus(achievementRate, actualValue) {
  if (achievementRate >= 100) return 'achieved';
  if (achievementRate >= 80) return 'warning';
  return 'lagging';
}

/**
 * 过滤有效的战区 KPI 实例
 * @param {Object[]} kpiInstances
 * @param {Object} rule
 * @param {string} targetPeriod
 * @param {string[]} warzones
 * @returns {Object[]}
 */
export function filterWarzoneKpis(kpiInstances, rule, targetPeriod, warzones) {
  const indicatorIds = new Set(rule.criteria?.indicatorIds || []);
  const warzoneSet = new Set(warzones || DEFAULT_WARZONES);

  return (kpiInstances || []).filter((kpi) => {
    if (!kpi || !indicatorIds.has(kpi.indicatorId)) return false;
    if (!periodMatches(kpi.period, targetPeriod)) return false;
    if (!warzoneSet.has(kpi.dept)) return false;

    const actual = parseFloat(kpi.actualValue);
    if (Number.isNaN(actual)) return false;

    return true;
  });
}

/**
 * 比较两个战区 KPI，用于排序
 * @param {Object} a
 * @param {Object} b
 * @returns {number}
 */
export function compareTheaterKpi(a, b) {
  const rateA = parseFloat(a.achievementRate) || 0;
  const rateB = parseFloat(b.achievementRate) || 0;
  if (rateA !== rateB) return rateA - rateB;

  const targetA = parseFloat(a.targetValue) || 0;
  const targetB = parseFloat(b.targetValue) || 0;
  const ratioA = targetA > 0 ? (parseFloat(a.actualValue) || 0) / targetA : 0;
  const ratioB = targetB > 0 ? (parseFloat(b.actualValue) || 0) / targetB : 0;
  if (ratioA !== ratioB) return ratioA - ratioB;

  return String(a.dept).localeCompare(String(b.dept));
}

/**
 * 按指标分组并取倒数第 N 名
 * @param {Object[]} kpis
 * @param {number} bottomN
 * @returns {Map<string, Object[]>}
 */
export function rankBottomNByIndicator(kpis, bottomN) {
  const byIndicator = new Map();

  kpis.forEach((kpi) => {
    const list = byIndicator.get(kpi.indicatorId) || [];
    list.push(kpi);
    byIndicator.set(kpi.indicatorId, list);
  });

  const results = new Map();
  byIndicator.forEach((list, indicatorId) => {
    const sorted = [...list].sort(compareTheaterKpi);
    const n = Math.max(1, Math.min(bottomN || 1, sorted.length));
    results.set(indicatorId, sorted.slice(0, n));
  });

  return results;
}

/**
 * 应用阈值过滤
 * @param {Object[]} results
 * @param {Object} criteria
 * @returns {Object[]}
 */
export function applyThresholdFilters(results, criteria) {
  const minRate = criteria?.minAchievementRate;
  const requireLagging = criteria?.requireLaggingStatus;

  return results.filter((r) => {
    const achievementRate = parseFloat(r.achievementRate) || 0;

    if (minRate !== undefined && minRate !== null && minRate !== '' && achievementRate >= parseFloat(minRate)) {
      return false;
    }

    if (requireLagging) {
      const status = getKpiStatus(achievementRate, parseFloat(r.actualValue) || 0);
      if (status !== 'lagging') return false;
    }

    return true;
  });
}

/**
 * 将 KPI 实例转换为触发结果
 * @param {Object} kpi
 * @param {number} rank
 * @param {Map<string, Object>} indicatorsMap
 * @param {string} targetPeriod
 * @returns {Object}
 */
export function kpiToTriggerResult(kpi, rank, indicatorsMap, targetPeriod) {
  const indicator = indicatorsMap?.get(kpi.indicatorId) || {};
  return {
    indicatorId: kpi.indicatorId,
    indicatorName: indicator.name || indicator.label || kpi.indicatorId,
    theater: kpi.dept,
    rank,
    achievementRate: parseFloat(kpi.achievementRate) || 0,
    actualValue: parseFloat(kpi.actualValue) || 0,
    targetValue: parseFloat(kpi.targetValue) || 0,
    kpiInstanceId: kpi.id,
    period: targetPeriod,
  };
}

/**
 * 评估规则，返回触发结果列表
 * @param {Object} rule
 * @param {Object} context
 * @returns {Object[]}
 */
export function evaluateRule(rule, context = {}) {
  const {
    kpiInstances = [],
    indicators = [],
    warzones = DEFAULT_WARZONES,
    basePeriod,
  } = context;

  const targetPeriod = resolvePeriod(rule?.schedule, basePeriod);
  const indicatorsMap = new Map((indicators || []).map((i) => [i.id, i]));

  const filteredKpis = filterWarzoneKpis(kpiInstances, rule, targetPeriod, warzones);
  if (filteredKpis.length === 0) return [];

  const rankedMap = rankBottomNByIndicator(filteredKpis, rule?.criteria?.rankingBottomN || 1);

  const results = [];
  rankedMap.forEach((list) => {
    list.forEach((kpi, idx) => {
      results.push(kpiToTriggerResult(kpi, idx + 1, indicatorsMap, targetPeriod));
    });
  });

  return applyThresholdFilters(results, rule?.criteria);
}

/**
 * 生成确定性会议 ID
 * @param {Object} result
 * @param {string} ruleId
 * @returns {string}
 */
export function generateMeetingId(result, ruleId) {
  const period = String(result.period || '').replace(/-/g, '');
  const indicator = String(result.indicatorId || '').replace(/[^a-zA-Z0-9]/g, '');
  const theater = normalizeTheater(result.theater);
  const rule = String(ruleId || '').replace(/[^a-zA-Z0-9]/g, '');
  return `lg_${period}_${indicator}_${theater}_${rule}`;
}

/**
 * 填充会议模板
 * @param {Object} result
 * @param {Object} rule
 * @returns {Object}
 */
export function buildMeetingFromTemplate(result, rule) {
  const template = rule?.action?.meetingTemplate || {};
  const titleTemplate = template.titleTemplate || '{theater} {period} {indicatorName} 业绩承诺会';

  const title = titleTemplate
    .replace(/\{theater\}/g, result.theater)
    .replace(/\{period\}/g, result.period)
    .replace(/\{indicatorName\}/g, result.indicatorName);

  const today = new Date().toISOString().split('T')[0];
  const month = result.period || today.slice(0, 7);
  const date = month ? `${month}-01` : today;

  const meetingId = generateMeetingId(result, rule.id);

  const agendaItems = (template.agendaItems || []).map((a, idx) => ({
    id: `ag_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
    type: a.type || 'business_special',
    title: a.title || '',
    duration: a.duration || 30,
    owner: a.owner || '',
    material_link: '',
    data_views: [],
    pre_report_section: '',
    status: 'planned',
    originalAgendaId: `ag_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
    postponedCount: 0,
    carriedFromAgendaId: null,
    carriedFromMeetingId: null,
    postponedHistory: [],
  }));

  return {
    id: meetingId,
    title,
    date,
    month,
    startTime: '09:00',
    level: template.level || 'L3',
    scenario: template.scenario || 'lagging_region',
    status: 'planned',
    location: template.location || '待确认',
    host: template.defaultHost || '待定',
    recorder: template.defaultRecorder || '待定',
    pipeline: {
      reportGenerated: false,
      preReviewDone: false,
      meetingHeld: false,
      minutesDrafted: false,
      minutesApproved: false,
      actionsTracked: false,
    },
    meeting_link: '',
    upstreamMeeting: null,
    downstreamMeeting: null,
    pre_report_id: '',
    minutes_report_id: '',
    minutes_content: '',
    hasMinutes: false,
    minutesStatus: null,
    agenda_items: agendaItems,
    actions: [],
    decisions: [],
    metrics: { materialTimeliness: 0, resolutionTimeliness: 0, actionClosure: 0, satisfaction: 0 },
    effectiveness: null,
    _ruleGenerated: {
      ruleId: rule.id,
      period: result.period,
      indicatorId: result.indicatorId,
      theater: result.theater,
      rank: result.rank,
      achievementRate: result.achievementRate,
    },
  };
}

/**
 * 检查会议是否已存在（确定性 ID + 元数据回退）
 * @param {Object} result
 * @param {Object} rule
 * @param {Object} options
 * @returns {Object|null} 返回已存在的会议，不存在返回 null
 */
export function findExistingMeeting(result, rule, options = {}) {
  const { findById, findByMetadata } = options;

  const deterministicId = generateMeetingId(result, rule.id);
  if (typeof findById === 'function') {
    const byId = findById(deterministicId);
    if (byId) return byId;
  }

  if (typeof findByMetadata === 'function') {
    return findByMetadata(result, rule) || null;
  }

  return null;
}

/**
 * 执行规则并返回完整结果（含会议对象）
 * @param {Object} rule
 * @param {Object} context
 * @param {Object} helpers
 * @returns {Object}
 */
export function executeRule(rule, context = {}, helpers = {}) {
  const startTime = Date.now();
  const triggerType = context.triggerType || TRIGGER_MODE.MANUAL;
  const triggeredBy = context.triggeredBy || 'system';

  const triggerResults = evaluateRule(rule, context);

  const results = triggerResults.map((result) => {
    const existing = findExistingMeeting(result, rule, helpers);
    if (existing) {
      return {
        ...result,
        meetingId: existing.id,
        status: RESULT_STATUS.SKIPPED_DUPLICATE,
      };
    }

    const meeting = buildMeetingFromTemplate(result, rule);
    return {
      ...result,
      meetingId: meeting.id,
      meeting,
      status: rule.action?.autoSave ? RESULT_STATUS.CREATED : RESULT_STATUS.DRAFT,
    };
  });

  return {
    ruleId: rule.id,
    ruleVersion: rule.version || '1.0.0',
    triggerType,
    triggeredBy,
    period: results[0]?.period || resolvePeriod(rule?.schedule, context.basePeriod),
    results,
    inputSummary: {
      indicatorIds: rule.criteria?.indicatorIds || [],
      theaterCount: (context.warzones || DEFAULT_WARZONES).length,
      kpiCount: (context.kpiInstances || []).length,
    },
    durationMs: Date.now() - startTime,
  };
}

/**
 * 判断规则是否应该定时执行
 * @param {Object} rule
 * @param {Date} [now]
 * @param {Object} [lastRuns]
 * @returns {boolean}
 */
export function shouldRunScheduled(rule, now = new Date(), lastRuns = {}) {
  if (!rule.enabled) return false;
  if (![TRIGGER_MODE.SCHEDULED, TRIGGER_MODE.BOTH].includes(rule.triggerMode)) return false;

  const schedule = rule.schedule || {};
  const dayOfMonth = schedule.dayOfMonth || 1;

  if (now.getDate() < dayOfMonth) return false;

  const currentPeriod = resolvePeriod(schedule, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const lastRun = lastRuns[rule.id];
  if (lastRun === currentPeriod) return false;

  return true;
}

/**
 * 创建默认规则
 * @param {Object} overrides
 * @returns {Object}
 */
export function createDefaultRule(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: `rule_lg_${Date.now()}`,
    name: '月度落后战区业绩承诺会规则',
    enabled: true,
    version: '1.0.0',
    triggerMode: TRIGGER_MODE.BOTH,
    schedule: {
      periodType: 'month',
      periodOffset: -1,
      dayOfMonth: 5,
      time: '09:00',
    },
    criteria: {
      indicatorIds: [],
      rankingScope: 'warzone',
      rankingBottomN: 1,
      minAchievementRate: '',
      requireLaggingStatus: false,
    },
    action: {
      createMeeting: true,
      autoSave: false,
      meetingTemplate: {
        titleTemplate: '{theater} {period} {indicatorName} 业绩承诺会',
        level: 'L3',
        scenario: 'lagging_region',
        defaultHost: '',
        defaultRecorder: '',
        location: '待确认',
        agendaItems: [
          { type: 'budget_finance', title: '业绩差距根因分析', duration: 40, owner: '' },
          { type: 'business_special', title: '风险预警与整改', duration: 30, owner: '' },
          { type: 'key_task_management', title: '整改承诺与跟踪', duration: 30, owner: '' },
        ],
      },
      notify: true,
      notifyWebhookId: '',
      notifyMentionAll: false,
    },
    createdAt: now,
    updatedAt: now,
    createdBy: 'admin',
    updatedBy: 'admin',
    ...overrides,
  };
}
