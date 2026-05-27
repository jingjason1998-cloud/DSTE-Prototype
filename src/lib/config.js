/**
 * DSTE Shell 配置
 * 顶部导航和侧边栏的共享配置
 */

export const TOP_NAV = [
  { id: 'dashboard', icon: '🎛️', label: '驾驶舱', full: '驾驶舱', defaultPage: 'dashboard' },
  { id: 'sp', icon: '🎯', label: 'SP', full: '战略制定', defaultPage: 'sp/strategy-map' },
  { id: 'bp', icon: '🔧', label: 'BP', full: '战略解码', defaultPage: 'bp/kpi' },
  { id: 'exe', icon: '🚀', label: '执行', full: '战略执行', defaultPage: 'exe/tasks' },
  { id: 'rev', icon: '📊', label: '评估', full: '战略评估', defaultPage: 'rev/performance' },
  { id: 'ai', icon: '🤖', label: 'AI', full: 'AI 助手', defaultPage: 'ai' }
];

export const SIDEBAR_CONFIG = {
  dashboard: [
    { type: 'item', id: 'dashboard', icon: '🎛️', label: '驾驶舱概览' },
    { type: 'quick', label: '快捷入口' },
    { type: 'item', id: 'sp/strategy-map', icon: '🗺️', label: '战略地图' },
    { type: 'item', id: 'bp/kpi', icon: '📈', label: 'KPI 看板' },
    { type: 'item', id: 'exe/tasks', icon: '✅', label: '重点工作' },
    { type: 'item', id: 'exe/meetings', icon: '🎯', label: '经营分析会' },
    { type: 'item', id: 'exe/meeting-review', icon: '📋', label: '会议审核' },
    { type: 'group', title: '系统管理', items: [
      { id: 'dashboard/roadmap', icon: '📊', label: '开发路线图 Road Map' }
    ]}
  ],
  sp: [
    { type: 'group', title: '战略制定 (SP)', items: [
      { id: 'sp/strategy-map', icon: '🗺️', label: '战略地图' },
      { id: 'sp/insights-topics', icon: '🔭', label: '战略洞察与专题' }
    ]},
    { type: 'quick', label: '快捷工具' },
    { type: 'item', id: 'exe/meeting-review', icon: '📋', label: '会议材料审核' }
  ],
  bp: [
    { type: 'group', title: '战略解码 (BP)', items: [
      { id: 'bp/kpi', icon: '📈', label: 'KPI 指标体系' },
      { id: 'bp/bem', icon: '🔧', label: 'BEM 战略解码' },
      { id: 'bp/annual-plan', icon: '📅', label: '年度经营计划' }
    ]},
    { type: 'quick', label: '快捷工具' },
    { type: 'item', id: 'exe/meeting-review', icon: '📋', label: '会议材料审核' }
  ],
  exe: [
    { type: 'group', title: '战略执行', items: [
      { id: 'exe/tasks', icon: '✅', label: '重点工作管理' },
      { id: 'exe/business-topics', icon: '📂', label: '业务专题管理' },
      { id: 'exe/meetings', icon: '🎯', label: '经营分析会 ⭐' },
      { id: 'exe/finereport', icon: '📊', label: 'FineReport 报表' }
    ]},
    { type: 'quick', label: '快捷工具' },
    { type: 'item', id: 'exe/meeting-review', icon: '📋', label: '会议材料审核' }
  ],
  rev: [
    { type: 'group', title: '战略评估', items: [
      { id: 'rev/performance', icon: '🏆', label: '绩效与激励' },
      { id: 'rev/cadre', icon: '👔', label: '干部管理' },
      { id: 'rev/review', icon: '🔄', label: '战略复盘' },
      { id: 'rev/gap-analysis', icon: '📉', label: '差距分析' }
    ]},
    { type: 'quick', label: '快捷工具' },
    { type: 'item', id: 'exe/meeting-review', icon: '📋', label: '会议材料审核' }
  ],
  ai: []
};

export const EXTERNAL_PAGES = {
  'exe/meeting-review': 'reviewer.html',
  'exe/business-topics': 'business-topics.html'
};

export const PAGE_NAMES = {
  'dashboard': '驾驶舱',
  'sp/strategy-map': '战略地图',
  'sp/insights-topics': '战略洞察与专题',
  'bp/kpi': 'KPI 指标体系',
  'bp/bem': 'BEM 战略解码',
  'bp/annual-plan': '年度经营计划',
  'exe/tasks': '重点工作管理',
  'exe/business-topics': '业务专题管理',
  'exe/meetings': '经营分析会',
  'exe/meeting-review': '会议材料审核',
  'rev/performance': '绩效与激励',
  'rev/cadre': '干部管理',
  'rev/review': '战略复盘',
  'rev/gap-analysis': '差距分析',
  'ai': 'AI 战略助手',
  'dashboard/roadmap': '开发路线图 Road Map',
  'exe/finereport': 'FineReport 报表'
};
