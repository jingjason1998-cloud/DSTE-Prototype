/**
 * 需求管理中心 — AI 分析器（前端规则型）
 * 基于标题和描述，自动推断需求字段建议
 */

import { REQUIREMENT_TYPES, DSTE_MODULES } from './requirement-store.js';

const TYPE_KEYWORDS = {
  FEATURE: ['新增', '增加', '支持', '添加', '实现', '上线', '开发', '引入'],
  OPTIMIZATION: ['优化', '改进', '提升', '改善', '提速', '流畅', '体验', '性能'],
  BUG: ['bug', '缺陷', '修复', '报错', '异常', '崩溃', '不显示', '失败', '问题'],
  TECH_DEBT: ['重构', '技术债', '架构', '升级', '迁移', '解耦', '兼容性', '依赖'],
  COMPETITOR: ['竞品', '对标', '参考', '行业', '友商', '市场'],
  SECURITY: ['安全', '权限', '审计', '合规', '鉴权', '越权', '漏洞']
};

const PRIORITY_KEYWORDS = {
  P0: ['紧急', '阻塞', '核心', '关键', 'p0', '必须', '立即', '无法使用', '严重', '数据丢失', '保存失败', '崩溃'],
  P1: ['重要', '高优', 'p1', '主要', '显著', '修复'],
  P2: ['一般', '优化', 'p2', '建议', '可以'],
  P3: ['低优', '暂缓', 'p3']
};

const MODULE_KEYWORDS = {
  dashboard: ['驾驶舱', 'dashboard', '总览', '看板', 'roadmap', '版本审计'],
  sp: ['战略地图', '战略洞察', '战略制定', '专题', 'sp'],
  bp: ['年度经营计划', 'kpi', 'bem', '战略解码', '指标', 'bp'],
  exe: ['重点工作', '业务专题', '经营分析会', '会议', '决议', '执行'],
  rev: ['绩效', '干部', '战略复盘', '差距分析', '评估'],
  ai: ['ai', 'ai助手', '智能', '自然语言', '机器人'],
  admin: ['系统管理', '规则引擎', '预警', '版本', '配置']
};

export function analyzeRequirement(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();

  const type = inferType(text);
  const priority = inferPriority(text);
  const affectedModules = inferModules(text);
  const problem = inferProblem(title, description);
  const value = inferValue(title, description, affectedModules);
  const acceptanceCriteria = inferAcceptanceCriteria(title, description, type);

  return {
    type,
    priority,
    affectedModules,
    problem,
    value,
    acceptanceCriteria
  };
}

function inferType(text) {
  const scores = {};
  Object.entries(TYPE_KEYWORDS).forEach(([type, keywords]) => {
    scores[type] = keywords.reduce((sum, kw) => sum + (text.includes(kw.toLowerCase()) ? 1 : 0), 0);
  });

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] > 0) return sorted[0][0];
  return 'FEATURE';
}

function inferPriority(text) {
  for (const [p, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw.toLowerCase()))) return p;
  }

  // 默认规则：BUG 且含阻塞/崩溃/无法使用 → P0；优化类 → P2；新增功能 → P1
  if (text.includes('bug') || text.includes('崩溃') || text.includes('无法使用')) return 'P0';
  if (text.includes('优化') || text.includes('改进')) return 'P2';
  return 'P1';
}

function inferModules(text) {
  const modules = [];
  Object.entries(MODULE_KEYWORDS).forEach(([module, keywords]) => {
    if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
      modules.push(module);
    }
  });
  return modules.length ? modules : ['admin'];
}

function inferProblem(title, description) {
  if (description) {
    // 尝试从描述中提取“问题/痛点”
    const problemPatterns = [
      /问题[是为：:]([^。\n]+)/,
      /痛点[是为：:]([^。\n]+)/,
      /当前([^。\n]+)存在([^。\n]+)/,
      /([^。\n]+)不够([^。\n]+)/,
      /([^。\n]+)无法([^。\n]+)/,
      /([^。\n]+)缺少([^。\n]+)/
    ];
    for (const pattern of problemPatterns) {
      const match = description.match(pattern);
      if (match) return match[0].trim();
    }
  }

  return `当前 ${title} 相关场景下存在体验或功能上的不足，需要进一步优化/补齐。`;
}

function inferValue(title, description, modules) {
  const moduleLabels = modules.map(m => {
    const entry = Object.entries(DSTE_MODULES).find(([k]) => k === m);
    return entry ? entry[1].replace(/\s*\(.*/, '') : m;
  });

  return `解决后将提升${moduleLabels.join('、')}的使用体验与效率，支撑 DSTE 平台产品迭代闭环。`;
}

function inferAcceptanceCriteria(title, description, type) {
  const typeLabels = {
    FEATURE: '功能可用',
    OPTIMIZATION: '体验/性能达到预期',
    BUG: 'Bug 不再复现',
    TECH_DEBT: '架构目标达成',
    COMPETITOR: '对标能力补齐',
    SECURITY: '安全合规要求满足'
  };

  return `1. ${title} 的${typeLabels[type] || '目标达成'}\n2. 相关场景回归通过\n3. 用户/测试验证通过`;
}

/**
 * 生成 AI 分析说明文本
 */
export function generateAnalysisSummary(suggestions) {
  const typeLabels = {
    FEATURE: '功能需求',
    OPTIMIZATION: '优化改进',
    BUG: '缺陷修复',
    TECH_DEBT: '技术债',
    COMPETITOR: '竞品对标',
    SECURITY: '安全合规'
  };

  const moduleLabels = suggestions.affectedModules.map(m => {
    const entry = Object.entries(DSTE_MODULES).find(([k]) => k === m);
    return entry ? entry[1].replace(/\s*\(.*/, '') : m;
  });

  return `基于内容分析，建议：类型为「${typeLabels[suggestions.type]}」，优先级「${suggestions.priority}」，影响模块「${moduleLabels.join('、')}」。请检查并调整。`;
}
