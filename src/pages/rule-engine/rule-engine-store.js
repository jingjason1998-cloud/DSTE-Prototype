/**
 * 规则引擎数据存储
 * @module rule-engine-store
 *
 * 负责规则 CRUD、执行日志、localStorage 持久化。
 */

import { Storage } from '../../lib/utils.js';

export const RULES_STORAGE_KEY = 'dste_rule_engine_rules_v1';
export const LOGS_STORAGE_KEY = 'dste_rule_engine_logs_v1';
export const LAST_RUNS_STORAGE_KEY = 'dste_rule_engine_last_runs_v1';

/**
 * 加载规则列表
 * @returns {Object[]}
 */
export function loadRules() {
  return Storage.get(RULES_STORAGE_KEY, []);
}

/**
 * 保存规则列表
 * @param {Object[]} rules
 */
export function saveRules(rules) {
  Storage.set(RULES_STORAGE_KEY, rules || []);
}

/**
 * 根据 ID 查找规则
 * @param {string} id
 * @returns {Object|null}
 */
export function findRuleById(id) {
  return (loadRules() || []).find((r) => r.id === id) || null;
}

/**
 * 新增规则
 * @param {Object} rule
 */
export function addRule(rule) {
  const rules = loadRules();
  rules.push(rule);
  saveRules(rules);
  return rule;
}

/**
 * 更新规则
 * @param {string} id
 * @param {Object} updates
 */
export function updateRule(id, updates) {
  const rules = loadRules();
  const idx = rules.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  rules[idx] = { ...rules[idx], ...updates, updatedAt: new Date().toISOString() };
  saveRules(rules);
  return rules[idx];
}

/**
 * 删除规则
 * @param {string} id
 */
export function deleteRule(id) {
  const rules = loadRules().filter((r) => r.id !== id);
  saveRules(rules);
}

/**
 * 切换规则启用状态
 * @param {string} id
 */
export function toggleRuleEnabled(id) {
  const rule = findRuleById(id);
  if (!rule) return null;
  return updateRule(id, { enabled: !rule.enabled });
}

/**
 * 加载执行日志
 * @returns {Object[]}
 */
export function loadExecutionLogs() {
  return Storage.get(LOGS_STORAGE_KEY, []);
}

/**
 * 保存执行日志
 * @param {Object[]} logs
 */
export function saveExecutionLogs(logs) {
  Storage.set(LOGS_STORAGE_KEY, logs || []);
}

/**
 * 追加执行日志
 * @param {Object} log
 */
export function appendExecutionLog(log) {
  const logs = loadExecutionLogs();
  logs.unshift(log);
  // 最多保留 100 条
  if (logs.length > 100) logs.length = 100;
  saveExecutionLogs(logs);
  return log;
}

/**
 * 更新执行日志中的会议 ID
 * @param {string} logId
 * @param {string} resultKey
 * @param {string} meetingId
 */
export function updateLogMeetingId(logId, resultKey, meetingId) {
  const logs = loadExecutionLogs();
  const log = logs.find((l) => l.id === logId);
  if (!log || !log.results) return false;

  const result = log.results.find((r) => r.indicatorId === resultKey || r.kpiInstanceId === resultKey);
  if (result) {
    result.meetingId = meetingId;
    result.status = 'created';
    saveExecutionLogs(logs);
    return true;
  }
  return false;
}

/**
 * 加载最后定时执行记录
 * @returns {Object}
 */
export function loadLastRuns() {
  return Storage.get(LAST_RUNS_STORAGE_KEY, {});
}

/**
 * 保存最后定时执行记录
 * @param {string} ruleId
 * @param {string} period
 */
export function recordScheduledRun(ruleId, period) {
  const lastRuns = loadLastRuns();
  lastRuns[ruleId] = period;
  Storage.set(LAST_RUNS_STORAGE_KEY, lastRuns);
}

/**
 * 检查规则在某个周期是否已经定时执行过
 * @param {string} ruleId
 * @param {string} period
 * @returns {boolean}
 */
export function hasScheduledRun(ruleId, period) {
  return loadLastRuns()[ruleId] === period;
}

/**
 * 获取 OMP 指标列表
 * @returns {Object[]}
 */
export function loadIndicators() {
  try {
    return Storage.get('dste_omp_indicators_v1', []);
  } catch (e) {
    return [];
  }
}

/**
 * 获取 OMP KPI 实例
 * @returns {Object[]}
 */
export function loadKpiInstances() {
  try {
    return Storage.get('dste_omp_kpi_instances_v1', []);
  } catch (e) {
    return [];
  }
}

/**
 * 获取通知配置
 * @returns {Object}
 */
export function loadNotificationConfig() {
  try {
    return Storage.get('dste_notification_config', { webhooks: [], enabledTypes: {} });
  } catch (e) {
    return { webhooks: [], enabledTypes: {} };
  }
}

/**
 * 生成唯一 ID
 * @param {string} prefix
 * @returns {string}
 */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

/**
 * 清空所有规则引擎数据（测试用）
 */
export function clearRuleEngineData() {
  Storage.set(RULES_STORAGE_KEY, []);
  Storage.set(LOGS_STORAGE_KEY, []);
  Storage.set(LAST_RUNS_STORAGE_KEY, {});
}

/**
 * 导出规则（备份）
 * @returns {Object}
 */
export function exportRules() {
  return {
    rules: loadRules(),
    logs: loadExecutionLogs(),
    lastRuns: loadLastRuns(),
    exportedAt: new Date().toISOString(),
  };
}

/**
 * 导入规则（恢复）
 * @param {Object} data
 */
export function importRules(data) {
  if (data.rules) saveRules(data.rules);
  if (data.logs) saveExecutionLogs(data.logs);
  if (data.lastRuns) Storage.set(LAST_RUNS_STORAGE_KEY, data.lastRuns);
}
