/**
 * 轻量 AI 输出 schema 校验器（Worker 侧）
 *
 * 不引入外部依赖，手动实现常用校验规则，用于校验 Kimi 返回的结构化数据。
 */

const AGENDA_TYPES = new Set([
  'goal_management',
  'key_task_management',
  'budget_finance',
  'human_resources',
  'business_special',
  'other',
]);

const AGENDA_SOURCE_TYPES = new Set([
  'postponed_agenda',
  'open_action',
  'open_resolution',
  'key_work',
  'historical',
  'theme',
]);

/**
 * 校验议程候选列表。
 * @param {any} raw
 * @returns {{ valid: boolean, candidates?: Array, error?: string }}
 */
export function validateAgendaCandidates(raw) {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: '响应不是对象' };
  }

  const candidates = raw.candidates;
  if (!Array.isArray(candidates)) {
    return { valid: false, error: '缺少 candidates 数组' };
  }

  const errors = [];
  const validCandidates = [];

  candidates.forEach((c, idx) => {
    if (!c || typeof c !== 'object') {
      errors.push(`[${idx}] 候选项不是对象`);
      return;
    }

    const title = String(c.title || '').trim();
    if (!title) {
      errors.push(`[${idx}] 缺少 title`);
      return;
    }

    const type = String(c.type || '').trim();
    if (!AGENDA_TYPES.has(type)) {
      errors.push(`[${idx}] 无效的 type: ${type}`);
      return;
    }

    const sourceType = String(c.sourceType || '').trim();
    if (!AGENDA_SOURCE_TYPES.has(sourceType)) {
      errors.push(`[${idx}] 无效的 sourceType: ${sourceType}`);
      return;
    }

    const duration = Number(c.duration);
    if (!Number.isFinite(duration) || duration < 5 || duration > 120) {
      errors.push(`[${idx}] duration 必须在 5~120 之间: ${c.duration}`);
      return;
    }

    const confidence = Number(c.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      errors.push(`[${idx}] confidence 必须在 0~1 之间: ${c.confidence}`);
      return;
    }

    validCandidates.push({
      id: String(c.id || `ai_cand_${idx}_${Date.now()}`),
      title,
      type,
      sourceType,
      duration,
      confidence,
      owner: String(c.owner || '').trim() || '待定',
      reason: String(c.reason || '').trim(),
      sourceId: c.sourceId != null ? String(c.sourceId) : null,
    });
  });

  if (errors.length > 0) {
    return { valid: false, error: errors.join('; ') };
  }

  return { valid: true, candidates: validCandidates };
}

/**
 * 校验对象是否包含指定类型字段。
 * @param {any} obj
 * @param {Record<string, string>} schema - 字段名 -> 期望类型
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateObject(obj, schema) {
  if (!obj || typeof obj !== 'object') {
    return { valid: false, error: '输入不是对象' };
  }

  const errors = [];
  for (const [key, type] of Object.entries(schema)) {
    if (!(key in obj)) {
      errors.push(`缺少字段: ${key}`);
      continue;
    }
    const value = obj[key];
    if (typeof value !== type) {
      errors.push(`字段 ${key} 类型错误, 期望 ${type}, 实际 ${typeof value}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, error: errors.join('; ') };
  }
  return { valid: true };
}

export default { validateAgendaCandidates, validateObject };
