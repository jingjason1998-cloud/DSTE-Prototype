/**
 * DSTE Shell 配置
 * 顶部导航和侧边栏的共享配置
 */

export const TOP_NAV = [
  { id: 'dashboard', icon: 'dashboard', label: '驾驶舱', full: '驾驶舱', defaultPage: 'dashboard' },
  { id: 'sp', icon: 'sp', label: 'SP', full: '战略制定', defaultPage: 'sp/strategy-map' },
  { id: 'bp', icon: 'bp', label: 'BP', full: '战略解码', defaultPage: 'bp/kpi' },
  { id: 'exe', icon: 'exe', label: '执行', full: '战略执行', defaultPage: 'exe/tasks' },
  { id: 'rev', icon: 'rev', label: '评估', full: '战略评估', defaultPage: 'rev/performance' },
  { id: 'ai', icon: 'ai', label: 'AI', full: 'AI 助手', defaultPage: 'ai' }
];

export const SIDEBAR_CONFIG = {
  dashboard: [
    { type: 'item', id: 'dashboard', icon: 'dashboard', label: '驾驶舱概览' },
    { type: 'quick', label: '快捷入口' },
    { type: 'item', id: 'sp/strategy-map', icon: 'sp/strategy-map', label: '战略地图' },
    { type: 'item', id: 'bp/kpi', icon: 'bp/kpi', label: 'KPI 看板' },
    { type: 'item', id: 'exe/tasks', icon: 'exe/tasks', label: '重点工作' },
    { type: 'item', id: 'exe/meetings', icon: 'exe/meetings', label: '经营分析会' },
    { type: 'item', id: 'exe/meeting-review', icon: 'exe/meeting-review', label: '会议审核' },
    { type: 'group', title: '系统管理', icon: 'settings', items: [
      { id: 'dashboard/roadmap', icon: 'dashboard/roadmap', label: '开发路线图 Road Map' },
      { id: 'dashboard/version-audit', icon: 'dashboard/version-audit', label: '版本审计' },
      { id: 'admin/employee-directory', icon: 'admin/employee-directory', label: '人员与组织管理' },
      { id: 'admin/rule-engine', icon: 'admin/rule-engine', label: '规则引擎中心' },
      { id: 'admin/alert-hub', icon: 'admin/alert-hub', label: '预警中心' },
      { id: 'admin/requirement-pool', icon: 'admin/requirement-pool', label: '需求管理中心' }
    ]}
  ],
  sp: [
    { type: 'group', title: '战略制定 (SP)', icon: 'sp', items: [
      { id: 'sp/strategy-map', icon: 'sp/strategy-map', label: '战略地图' },
      { id: 'sp/insights', icon: 'sp/insights', label: '战略洞察' },
      { id: 'sp/strategy-topics', icon: 'sp/strategy-topics', label: '战略专题管理' }
    ]},
    { type: 'quick', label: '快捷工具' },
    { type: 'item', id: 'exe/meeting-review', icon: 'exe/meeting-review', label: '会议材料审核' }
  ],
  bp: [
    { type: 'group', title: '战略解码 (BP)', icon: 'bp', items: [
      { id: 'bp/kpi', icon: 'bp/kpi', label: 'KPI 指标体系' },
      { id: 'bp/bem', icon: 'bp/bem', label: 'BEM 战略解码' },
      { id: 'bp/annual-plan', icon: 'bp/annual-plan', label: '年度经营计划' }
    ]},
    { type: 'quick', label: '快捷工具' },
    { type: 'item', id: 'exe/meeting-review', icon: 'exe/meeting-review', label: '会议材料审核' }
  ],
  exe: [
    { type: 'group', title: '组织绩效管理', icon: 'chart-line-up', items: [
      { id: 'exe/kpi', icon: 'exe/kpi', label: 'KPI管理' },
      { id: 'exe/tasks', icon: 'exe/tasks', label: '重点工作管理' }
    ]},
    { type: 'group', title: '经营分析会', icon: 'users-three', items: [
      { id: 'exe/meetings', icon: 'exe/meetings', label: '经营分析会' },
      { id: 'exe/business-topics', icon: 'exe/business-topics', label: '业务专题管理' },
      { id: 'exe/st-issue-tracking', icon: 'exe/st-issue-tracking', label: '片联ST议题跟踪表' },
      { id: 'exe/at-issue-tracking', icon: 'exe/at-issue-tracking', label: '片联AT议题跟踪表' }
    ]},
    { type: 'group', title: '经营分析报表中心', icon: 'chart-pie-slice', items: [
      { id: 'exe/report-center', icon: 'exe/report-center', label: '报表首页' },
      { id: 'exe/report-center', reportId: 'fr-001', icon: 'chart-line-up', label: '国内营销线利润表' },
      { id: 'exe/report-center', reportId: 'fr-002', icon: 'chart-line-up', label: '国内营销线利润表（新）' },
      { id: 'exe/report-center', reportId: 'fr-ioc-platform', icon: 'chart-pie-slice', label: '营销线组织绩效IOC平台' }
    ]},
    { type: 'quick', label: '快捷工具' },
    { type: 'item', id: 'exe/meeting-review', icon: 'exe/meeting-review', label: '会议材料审核' }
  ],
  rev: [
    { type: 'group', title: '战略评估', icon: 'rev', items: [
      { id: 'rev/performance', icon: 'rev/performance', label: '绩效与激励' },
      { id: 'rev/cadre', icon: 'rev/cadre', label: '干部管理' },
      { id: 'rev/review', icon: 'rev/review', label: '战略复盘' },
      { id: 'rev/gap-analysis', icon: 'rev/gap-analysis', label: '差距分析' }
    ]},
    { type: 'quick', label: '快捷工具' },
    { type: 'item', id: 'exe/meeting-review', icon: 'exe/meeting-review', label: '会议材料审核' }
  ],
  ai: []
};

export const EXTERNAL_PAGES = {
  'admin/employee-directory': 'employee-directory.html',
  'admin/requirement-pool': 'requirement-pool.html',
  'exe/business-topics': 'business-topics.html',
  'exe/meetings': 'meetings.html',
  'exe/st-issue-tracking': 'st-issue-tracking.html',
  'exe/at-issue-tracking': 'at-issue-tracking.html',
  'sp/strategy-map': 'strategy-map-list.html',
  'sp/strategy-map-detail': 'strategy-map.html'
};

export const PAGE_NAMES = {
  'dashboard': '驾驶舱',
  'sp/strategy-map': '战略地图',
  'sp/strategy-map-detail': '战略地图详情',
  'sp/insights': '战略洞察',
  'sp/strategy-topics': '战略专题管理',
  'bp/kpi': 'KPI 指标体系',
  'bp/bem': 'BEM 战略解码',
  'bp/annual-plan': '年度经营计划',
  'exe/kpi': 'KPI管理',
  'exe/tasks': '重点工作管理',
  'exe/business-topics': '业务专题管理',
  'exe/st-issue-tracking': '片联ST议题跟踪表',
  'exe/at-issue-tracking': '片联AT议题跟踪表',
  'exe/meetings': '经营分析会',
  'exe/meeting-review': '会议材料审核',
  'exe/report-center': '经营分析报表中心',
  'rev/performance': '绩效与激励',
  'rev/cadre': '干部管理',
  'rev/review': '战略复盘',
  'rev/gap-analysis': '差距分析',
  'ai': 'AI 战略助手',
  'dashboard/roadmap': '开发路线图 Road Map',
  'dashboard/version-audit': '版本审计',
  'exe/finereport': 'FineReport 报表',
  'admin/employee-directory': '人员与组织管理',
  'admin/rule-engine': '规则引擎中心',
  'admin/alert-hub': '预警中心',
  'admin/requirement-pool': '需求管理中心'
};
