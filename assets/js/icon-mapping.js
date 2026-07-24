/**
 * DSTE 图标映射表
 * 使用 Phosphor Icons (Regular weight)
 * key: DSTE 内部标识
 * value: Phosphor 图标名 (ph- 前缀)
 */

export const ICONS = {
  // Top navigation (DSTE stages)
  dashboard: 'gauge',
  sp: 'strategy',
  bp: 'gear',
  exe: 'rocket-launch',
  rev: 'chart-bar',
  ai: 'robot',

  // Phosphor self-key aliases (used in sidebar group icons)
  'chart-line-up': 'chart-line-up',
  'users-three': 'users-three',
  'chart-pie-slice': 'chart-pie-slice',
  'chart-bar': 'chart-bar',

  // Sidebar items
  'sp/strategy-map': 'map-trifold',
  'sp/insights': 'binoculars',
  'sp/strategy-topics': 'bookmarks',
  'bp/kpi': 'chart-line-up',
  'bp/bem': 'tree-structure',
  'bp/annual-plan': 'calendar-check',
  'exe/kpi': 'chart-line-up',
  'exe/tasks': 'check-square',
  'exe/meetings': 'users-three',
  'exe/meeting-review': 'clipboard-text',
  'exe/business-topics': 'folders',
  'exe/st-issue-tracking': 'building',
  'exe/at-issue-tracking': 'buildings',
  'exe/report-center': 'chart-pie-slice',
  'rev/performance': 'trophy',
  'rev/cadre': 'user-gear',
  'rev/review': 'arrows-clockwise',
  'rev/gap-analysis': 'trend-down',
  'dashboard/roadmap': 'map-pin-line',
  'dashboard/version-audit': 'shield-check',
  'admin/employee-directory': 'users',
  'admin/rule-engine': 'gear',
  'admin/alert-hub': 'bell',
  'admin/requirement-pool': 'list-checks',
  'ai/assistant': 'robot',

  // UI controls
  search: 'magnifying-glass',
  notification: 'bell',
  themeLight: 'sun',
  themeDark: 'moon',
  user: 'user-circle',
  menuCollapse: 'caret-left',
  menuExpand: 'caret-right',
  settings: 'gear',
  logout: 'sign-out',
  close: 'x',
  add: 'plus',
  edit: 'pencil-simple',
  delete: 'trash',
  download: 'download',
  upload: 'upload',
  filter: 'faders',
  more: 'dots-three',
  check: 'check',
  chevronDown: 'caret-down',
  chevronRight: 'caret-right',
  external: 'arrow-square-out',
  info: 'info',
  warning: 'warning',
  danger: 'warning-octagon',
  success: 'check-circle',
  help: 'question',
  calendar: 'calendar',
  clock: 'clock',
  location: 'map-pin',
  mapPin: 'map-pin',
  refresh: 'arrows-clockwise',
  arrowsClockwise: 'arrows-clockwise',
  expand: 'arrows-out',
  collapse: 'arrows-in',
  fullscreen: 'corners-out',
  exitFullscreen: 'corners-in',
  drag: 'dots-six-vertical',
  link: 'link',
  unlink: 'link-break',
  copy: 'copy',
  eye: 'eye',
  eyeOff: 'eye-slash',
  lock: 'lock',
  unlock: 'lock-open',
  star: 'star',
  flag: 'flag',
  tag: 'tag',
  mail: 'envelope',
  phone: 'phone',
  home: 'house',
  folder: 'folder',
  file: 'file-text',
  fileText: 'file-text',
  print: 'printer',
  share: 'share-network',
  send: 'paper-plane-right',
  archive: 'archive',
  restore: 'arrow-u-up-left',
  sortAsc: 'sort-ascending',
  sortDesc: 'sort-descending',
  robot: 'robot',
  chartBar: 'chart-bar',
  chartLineUp: 'chart-line-up',
  clipboardText: 'clipboard-text',

  // Extra semantic keys for business-topics module
  menu: 'list',
  list: 'list',
  circle: 'circle',
  target: 'target',
  brain: 'brain',
  handWave: 'hand-waving',
  'hand-waving': 'hand-waving',
  lightbulb: 'lightbulb',
  pushPin: 'push-pin',
  xCircle: 'x-circle',
  folderOpen: 'folder-open',
  caretUp: 'caret-up',
  caretDown: 'caret-down',
  caretRight: 'caret-right',
  caretLeft: 'caret-left',
  bookmark: 'bookmark',

  // Meetings module extras
  chat: 'chat',
  broadcast: 'broadcast',
  package: 'package',
  fire: 'fire',
  confetti: 'confetti',
  pause: 'pause',
  minus: 'minus',
  arrowUp: 'arrow-up',
  arrowDown: 'arrow-down',
  paperclip: 'paperclip',
  hourglass: 'hourglass',
  timer: 'timer',
  building: 'building',
  buildings: 'buildings',
  chartLine: 'chart-line-up',
  save: 'download',
  running: 'rocket-launch',
  ruler: 'ruler',
  userPlain: 'user',
  mapTrifold: 'map-trifold',
  siren: 'siren',
  eye: 'eye',
  plug: 'plug',

  // Cockpit / general extras
  tray: 'tray',
  inbox: 'tray',
  books: 'books',
  shuffle: 'shuffle',
  tree: 'tree',
  floppyDisk: 'floppy-disk',
  sword: 'sword',
  numbers: 'list-numbers',
  currencyDollar: 'currency-dollar',
  handshake: 'handshake',
  globe: 'globe',
  warningOctagon: 'warning-octagon',
  checkCircle: 'check-circle',
};

/**
 * 返回 Phosphor 图标名，找不到时返回 help
 */
export function getIconName(key) {
  return ICONS[key] || ICONS['help'];
}

/**
 * 返回该映射表涉及的所有 Phosphor 图标名（去重）
 * 供 build-icon-sprite.js 使用
 */
export function getAllPhosphorNames() {
  return [...new Set(Object.values(ICONS))].sort();
}
