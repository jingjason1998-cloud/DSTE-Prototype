/**
 * 营销线预算执行监控表主逻辑
 */

import { Storage, escapeHtml, showToast } from '../../lib/utils.js';
import { icon, hydrateIcons } from '../../../assets/js/icons.js';
import { AIClient } from '../../lib/ai-client.js';
import { PNL_DATA } from './demo-data.js';
import { parseExcelFile, downloadTemplate, RATIO_ROWS } from './xlsx-parser.js';
import {
  loadLinkages, saveLinkages, addTaskLink, removeTaskLink,
  addSubtaskLink, removeSubtaskLink, addTopicLink, removeTopicLink,
  getLinkCount
} from './budget-linkage-store.js';
import { buildGlobalPrompt, buildRowPrompt } from './ai-prompts.js';

// ===== 常量 =====
const LS_DATA_KEY = 'dste_marketing_budget_data_v1';
const LS_AI_CACHE_KEY = 'dste_budget_ai_cache_v1';
const PACE = 7 / 12;
const KPI_DEFS = [
  { row: 5, label: '销售额-D' },
  { row: 25, label: '净回款' },
  { row: 27, label: '税后净回款' },
  { row: 144, label: '贡献利润' },
  { row: 145, label: '贡献利润率', ratio: true },
  { row: 146, label: 'E/R', ratio: true }
];
const CHART_SUBJECTS = [
  { row: 5, name: '销售额-D' },
  { row: 13, name: '回款' },
  { row: 25, name: '净回款' },
  { row: 27, name: '税后净回款' },
  { row: 28, name: '直接费用' },
  { row: 120, name: '间接费用' },
  { row: 144, name: '贡献利润' }
];
const YEARS = ['2025', '2026', '2027'];

// ===== 状态 =====
let D = null;                 // 当前预算数据
let rows = [];                // 扁平行数组
let rowById = {};             // rowId -> row
let childrenOf = {};          // rowId -> children
let parentOf = {};            // rowId -> parent rowId
let parents = [];             // 所有有子节点的行
let collapsed = {};           // 折叠状态
let showZero = false;         // 隐藏零行
let linkages = {};            // 关联映射
let allTasks = [];            // OMP 任务（含年度重点、子任务）
let allTopics = [];           // 业务专题
let drawerRowId = null;       // 当前抽屉打开的科目行
let currentDrawerTab = 'summary';
let charts = [];              // ECharts 实例

// ===== 初始化 =====
function init() {
  loadAllTasks();
  loadAllTopics();
  linkages = loadLinkages();
  const saved = Storage.get(LS_DATA_KEY, null);
  setData(saved || PNL_DATA, false);
  bindEvents();
  renderPage();
  window.addEventListener('resize', () => {
    charts.forEach(c => { if (c) c.resize(); });
  });
}

// ===== 数据加载 =====
function loadAllTasks() {
  try {
    allTasks = Storage.get('dste_omp_tasks_v1', []) || [];
  } catch (e) {
    allTasks = [];
  }
}

function loadAllTopics() {
  try {
    allTopics = Storage.get('dste_business_topics_v2', []) || [];
  } catch (e) {
    allTopics = [];
  }
}

function getSubtasks(parentId) {
  return allTasks.filter(t => t.parentId === parentId);
}

function getTaskById(id) {
  return allTasks.find(t => t.id === id);
}

function getTopicById(id) {
  return allTopics.find(t => t.id === id);
}

function getProgressRecords(taskId) {
  try {
    const records = Storage.get('dste_omp_progress_v1', []) || [];
    return records.filter(r => r.taskId === taskId).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  } catch (e) {
    return [];
  }
}

function getLastLog(taskId) {
  const records = getProgressRecords(taskId);
  return records.length ? records[0].content : '';
}

// ===== 数据设置 =====
function setData(newData, persist) {
  D = newData;
  rows = D.rows || [];
  buildTree();
  collapsed = {};
  parents.forEach(r => { if (r.level >= 2) collapsed[r.row] = true; });
  if (persist) {
    try { Storage.set(LS_DATA_KEY, D); } catch (e) {}
  }
  renderPage();
}

function buildTree() {
  rowById = {};
  childrenOf = {};
  parentOf = {};
  let stack = [];
  rows.forEach(r => {
    rowById[r.row] = r;
    childrenOf[r.row] = [];
    stack = stack.filter(p => p.level < r.level);
    if (stack.length) {
      const p = stack[stack.length - 1];
      childrenOf[p.row].push(r);
      parentOf[r.row] = p.row;
    }
    stack.push(r);
  });
  parents = rows.filter(r => childrenOf[r.row].length > 0);
}

function isZeroRow(r) {
  return [r.cur, r.ytd, r.budget, r.lyYtd, r.fcst].every(v => v === null || v === undefined || v === 0);
}

const zeroSubtreeCache = {};
function isZeroSubtree(r) {
  if (zeroSubtreeCache[r.row] !== undefined) return zeroSubtreeCache[r.row];
  const z = isZeroRow(r) && childrenOf[r.row].every(isZeroSubtree);
  zeroSubtreeCache[r.row] = z;
  return z;
}

function isHidden(r) {
  if (!showZero && isZeroSubtree(r) && r.level > 1) return true;
  let pid = parentOf[r.row];
  while (pid) {
    if (collapsed[pid]) return true;
    const p = rowById[pid];
    if (!showZero && isZeroSubtree(p) && p.level > 1) return true;
    pid = parentOf[pid];
  }
  return false;
}

// ===== 格式化 =====
function fmtNum(v, digits) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  const d = digits === undefined ? 1 : digits;
  return Number(v).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtPct(v, digits) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return (v * 100).toFixed(digits === undefined ? 1 : digits) + '%';
}

function isRatio(row) {
  return !!RATIO_ROWS[row.row];
}

function fmtCell(row, v) {
  if (v === null || v === undefined) return '<span class="nil">—</span>';
  if (isRatio(row)) return fmtPct(v);
  return fmtNum(v);
}

function arrow(v) {
  return v > 0 ? '▲' : (v < 0 ? '▼' : '');
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return String(h);
}

// ===== 页面渲染 =====
function renderPage() {
  const root = document.getElementById('budget-page-root');
  if (!root) return;
  root.innerHTML = renderHeader() + renderKpis() + renderCharts() + renderTableSection();
  requestAnimationFrame(() => {
    initCharts();
    animateBars();
    hydrateIcons(root);
  });
}

function renderHeader() {
  return `
    <div class="breadcrumb">
      <a href="cockpit.html#dashboard">驾驶舱</a>
      <span class="breadcrumb-separator">/</span>
      <a href="cockpit.html#exe/tasks">战略执行</a>
      <span class="breadcrumb-separator">/</span>
      <a href="cockpit.html#exe/report-center">经营分析报表中心</a>
      <span class="breadcrumb-separator">/</span>
      <span>营销线预算执行监控表</span>
    </div>
    <div class="page-header">
      <div>
        <div class="page-title">营销线预算执行监控表</div>
        <div class="page-subtitle">${escapeHtml(D.title || '国内营销线预算执行监控')} · 单位：${escapeHtml(D.unit || '万元')} · 数据截至 ${escapeHtml(D.asOf || '2026年7月')}</div>
      </div>
      <div class="nav-actions">
        <select id="budgetYearSelect" class="budget-year-select">
          ${YEARS.map(y => `<option value="${y}" ${y === '2026' ? 'selected' : ''}>${y} 年度</option>`).join('')}
        </select>
        <button class="btn btn-ghost" data-action="open-upload"><span class="icon" data-icon="upload" data-icon-size="14"></span> 上传 Excel</button>
        <button class="btn btn-primary" data-action="open-ai"><span class="icon" data-icon="robot" data-icon-size="14"></span> AI 分析</button>
        <button class="btn btn-ghost" data-action="reset-data">恢复示例数据</button>
      </div>
    </div>
  `;
}

function renderKpis() {
  const html = KPI_DEFS.map((def, i) => {
    const r = rowById[def.row];
    if (!r) return '';
    const delay = i * 70;
    let body = '';
    let accent = '';
    if (def.ratio) {
      const pp = (r.ytd !== null && r.lyYtd !== null) ? (r.ytd - r.lyYtd) * 100 : null;
      accent = pp !== null && pp < 0 ? 'accent-bad' : 'accent-good';
      body = `
        <div class="budget-kpi-value">${fmtPct(r.ytd)}</div>
        <div class="budget-kpi-sub">
          ${pp === null ? '<span class="budget-chip flat">同比 —</span>' : `<span class="budget-chip ${pp >= 0 ? 'up' : 'down'}">${arrow(pp)} ${pp >= 0 ? '+' : ''}${pp.toFixed(1)} pp</span>`}
          <span>上年同期 ${fmtPct(r.lyYtd)}</span>
        </div>
      `;
    } else {
      const behind = r.rate !== null && r.rate < PACE;
      accent = behind ? 'accent-bad' : 'accent-good';
      const chipCls = r.yoy === null ? 'flat' : (r.yoy >= 0 ? 'up' : 'down');
      body = `
        <div class="budget-kpi-value">${fmtNum(r.ytd)}</div>
        <div class="budget-kpi-bar">
          <div class="fill ${behind ? 'behind' : ''}" data-w="${Math.min((r.rate || 0) * 100, 100)}" style="width:0"></div>
          <div class="pace-mark" style="left:${(PACE * 100).toFixed(1)}%" title="时间进度 ${fmtPct(PACE)}"></div>
        </div>
        <div class="budget-kpi-sub">
          <span class="budget-chip ${chipCls}">${r.yoy === null ? '同比 —' : arrow(r.yoy) + ' ' + (r.yoyPct === null ? fmtNum(r.yoy) : fmtPct(r.yoyPct))}</span>
          <span>完成 ${fmtPct(r.rate)} · 预测 ${fmtNum(r.fcst, 0)}</span>
        </div>
      `;
    }
    return `<div class="budget-kpi-card ${accent} budget-animate-in" style="animation-delay:${delay}ms">
      <div class="budget-kpi-label">${escapeHtml(def.label)}<span class="unit">${def.ratio ? '比率' : escapeHtml(D.unit)}</span></div>
      ${body}
    </div>`;
  }).join('');
  return `<div class="budget-kpi-grid">${html}</div>`;
}

function animateBars() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.budget-kpi-bar .fill').forEach(f => {
        f.style.width = f.getAttribute('data-w') + '%';
      });
    });
  });
}

function renderCharts() {
  return `
    <div class="budget-chart-grid">
      <div class="budget-chart-card budget-animate-in">
        <h3>利润瀑布图<span class="sub">累计口径 · ${escapeHtml(D.unit)}</span></h3>
        <div class="budget-chart-box" id="chart-waterfall"></div>
      </div>
      <div class="budget-chart-card budget-animate-in" style="animation-delay:70ms">
        <h3>预算执行进度<span class="sub">重点科目</span></h3>
        <div class="budget-chart-box" id="chart-progress"></div>
      </div>
      <div class="budget-chart-card budget-animate-in" style="animation-delay:140ms">
        <h3>同比对比<span class="sub">累计实际 vs 上年同期</span></h3>
        <div class="budget-chart-box" id="chart-yoy"></div>
      </div>
      <div class="budget-chart-card budget-animate-in" style="animation-delay:210ms">
        <h3>费用构成<span class="sub">直接费用 / 间接费用</span></h3>
        <div class="budget-chart-box" id="chart-pie"></div>
      </div>
    </div>
  `;
}

function renderTableSection() {
  return `
    <div class="budget-table-toolbar">
      <button class="btn btn-sm btn-ghost" data-action="expand-all"><span class="icon" data-icon="caret-down" data-icon-size="14"></span> 全部展开</button>
      <button class="btn btn-sm btn-ghost" data-action="collapse-all"><span class="icon" data-icon="caret-right" data-icon-size="14"></span> 全部折叠</button>
      <label class="switch">
        <input type="checkbox" id="toggleZero" ${showZero ? 'checked' : ''}>
        <span class="track"></span>
        <span>隐藏零行</span>
      </label>
      <div class="spacer"></div>
      <span class="text-sm-tertiary">共 ${rows.length} 行 · 已折叠 ${Object.keys(collapsed).length} 个节点</span>
    </div>
    <div class="budget-table-card">
      <div class="budget-table-scroll">
        <table class="budget-table data-table">
          <thead>
            <tr>
              <th>科目名称</th>
              <th>当月实际</th>
              <th>累计实际</th>
              <th>年度预算</th>
              <th>完成率</th>
              <th>上年同期</th>
              <th>同比变动</th>
              <th>全年预测</th>
              <th>关联</th>
            </tr>
          </thead>
          <tbody id="budget-tbody">${renderTableRows()}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderTableRows() {
  Object.keys(zeroSubtreeCache).forEach(k => delete zeroSubtreeCache[k]);
  return rows.map(r => {
    if (isHidden(r)) return '';
    const hasKids = childrenOf[r.row].length > 0;
    const isCollapsed = !!collapsed[r.row];
    const cls = ['lv' + r.level];
    if (hasKids) cls.push('has-children');
    if (hasKids && !isCollapsed) cls.push('expanded');
    if (isZeroRow(r)) cls.push('zero-row');
    const indent = (r.level - 1) * 18;
    const count = getLinkCount(linkages, r.row);
    return `
      <tr class="${cls.join(' ')}" data-row="${r.row}">
        <td>
          <span class="budget-cell-name" style="padding-left:${indent}px">
            <span class="budget-twisty ${hasKids ? '' : 'leaf'}" data-toggle="${r.row}"></span>
            <span>${escapeHtml(r.name)}</span>
          </span>
        </td>
        <td>${fmtCell(r, r.cur)}</td>
        <td>${fmtCell(r, r.ytd)}</td>
        <td>${fmtCell(r, r.budget)}</td>
        <td>${renderRateCell(r)}</td>
        <td>${fmtCell(r, r.lyYtd)}</td>
        <td>${renderYoyCell(r)}</td>
        <td>${fmtCell(r, r.fcst)}</td>
        <td>${count ? `<span class="budget-badge">${count}</span>` : '<span class="budget-badge empty">·</span>'}</td>
      </tr>
    `;
  }).join('');
}

function renderRateCell(r) {
  if (isRatio(r) || r.rate === null || r.rate === undefined) return '<span class="nil">—</span>';
  const pct = r.rate * 100;
  const behind = r.rate < PACE;
  return `<span class="budget-rate-wrap">
    <span class="budget-rate-bar"><i class="${behind ? 'behind' : ''}" style="width:${Math.min(pct, 100).toFixed(1)}%"></i></span>
    <span class="budget-rate-val">${pct.toFixed(1)}%</span>
  </span>`;
}

function renderYoyCell(r) {
  if (r.yoy === null || r.yoy === undefined) return '<span class="nil">—</span>';
  const cls = r.yoy >= 0 ? 'pos' : 'neg';
  if (isRatio(r)) {
    const pp = r.yoy * 100;
    return `<span class="${cls}">${pp >= 0 ? '+' : ''}${pp.toFixed(1)} pp</span>`;
  }
  let s = (r.yoy >= 0 ? '+' : '') + fmtNum(r.yoy);
  if (r.yoyPct !== null && r.yoyPct !== undefined) {
    s += ` <span style="opacity:.75;font-size:11px">(${r.yoyPct >= 0 ? '+' : ''}${fmtPct(r.yoyPct)})</span>`;
  }
  return `<span class="${cls}">${s}</span>`;
}

// ===== 事件绑定 =====
function bindEvents() {
  document.addEventListener('click', handleClick);
  document.addEventListener('change', handleChange);

  // 上传拖拽
  const dropzone = document.getElementById('uploadDropzone');
  const fileInput = document.getElementById('uploadFileInput');
  if (dropzone) {
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length) handleFile(files[0]);
    });
  }
  if (fileInput) {
    fileInput.addEventListener('change', e => {
      if (e.target.files.length) handleFile(e.target.files[0]);
    });
  }
}

function handleClick(e) {
  const target = e.target;

  // 树表折叠
  const tw = target.closest('[data-toggle]');
  if (tw && !tw.classList.contains('leaf')) {
    e.stopPropagation();
    const id = tw.getAttribute('data-toggle');
    if (collapsed[id]) delete collapsed[id];
    else collapsed[id] = true;
    document.getElementById('budget-tbody').innerHTML = renderTableRows();
    hydrateIcons(document.getElementById('budget-tbody'));
    return;
  }

  // 行点击打开抽屉
  const tr = target.closest('tr[data-row]');
  if (tr && !target.closest('[data-toggle]')) {
    openDrawer(Number(tr.getAttribute('data-row')));
    return;
  }

  // data-action 按钮
  const btn = target.closest('[data-action]');
  if (btn) {
    const action = btn.getAttribute('data-action');
    switch (action) {
      case 'expand-all':
        collapsed = {};
        renderTableOnly();
        break;
      case 'collapse-all':
        collapsed = {};
        parents.forEach(r => { if (r.level >= 2) collapsed[r.row] = true; });
        renderTableOnly();
        break;
      case 'open-upload':
        openUploadModal();
        break;
      case 'close-upload':
        closeUploadModal();
        break;
      case 'choose-file':
        document.getElementById('uploadFileInput')?.click();
        break;
      case 'download-template':
        downloadTemplate();
        break;
      case 'reset-data':
        resetData();
        break;
      case 'open-ai':
        openAiDrawer();
        break;
      case 'close-ai':
        closeAiDrawer();
        break;
      case 'run-ai':
        runAiAnalysis('global');
        break;
      case 'close-drawer':
        closeDrawer();
        break;
    }
  }

  // 抽屉 Tab
  const dtab = target.closest('[data-dtab]');
  if (dtab) {
    switchDrawerTab(dtab.getAttribute('data-dtab'));
    return;
  }

  // 抽屉内添加关联
  const addLink = target.closest('[data-add-link]');
  if (addLink) {
    const type = addLink.getAttribute('data-add-link');
    handleAddLink(type);
    return;
  }

  // 抽屉内删除关联
  const removeLink = target.closest('[data-remove-link]');
  if (removeLink) {
    const type = removeLink.getAttribute('data-remove-link');
    const id = removeLink.getAttribute('data-id');
    handleRemoveLink(type, id);
  }
}

function handleChange(e) {
  const target = e.target;
  if (target.id === 'toggleZero') {
    showZero = target.checked;
    renderTableOnly();
  }
  if (target.id === 'budgetYearSelect') {
    // 年度切换：目前仅更新展示，数据仍为 demo/上传数据
    showToast(`已切换至 ${target.value} 年度视图`, 'info');
  }
}

function renderTableOnly() {
  const tbody = document.getElementById('budget-tbody');
  if (tbody) {
    tbody.innerHTML = renderTableRows();
    hydrateIcons(tbody);
  }
}

function renderChartsOnly() {
  initCharts();
}

// ===== Excel 上传 =====
async function handleFile(file) {
  const errEl = document.getElementById('uploadError');
  if (errEl) errEl.style.display = 'none';
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showUploadError('文件大小超过 5MB 限制');
    return;
  }
  try {
    const data = await parseExcelFile(file);
    setData(data, true);
    closeUploadModal();
    showToast(`已上传 ${data.rows.length} 行预算数据`, 'success');
  } catch (err) {
    showUploadError(String(err));
  }
}

function showUploadError(msg) {
  const errEl = document.getElementById('uploadError');
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
  }
}

function openUploadModal() {
  document.getElementById('uploadModal').style.display = 'flex';
}

function closeUploadModal() {
  document.getElementById('uploadModal').style.display = 'none';
}

function resetData() {
  if (!confirm('确定恢复示例数据？当前上传的 Excel 与关联项不会被删除。')) return;
  Storage.remove(LS_DATA_KEY);
  setData(PNL_DATA, false);
  showToast('已恢复示例数据', 'success');
}

// ===== 抽屉 =====
function openDrawer(rowId) {
  drawerRowId = rowId;
  currentDrawerTab = 'summary';
  document.getElementById('budgetOverlay').style.display = 'block';
  document.getElementById('budgetDrawer').style.display = 'flex';
  renderDrawer();
}

function closeDrawer() {
  document.getElementById('budgetOverlay').style.display = 'none';
  document.getElementById('budgetDrawer').style.display = 'none';
  drawerRowId = null;
}

function switchDrawerTab(name) {
  currentDrawerTab = name;
  renderDrawer();
}

function renderDrawer() {
  const r = rowById[drawerRowId];
  if (!r) return;

  document.getElementById('drawerEyebrow').textContent = `科目行 ${r.row} · LEVEL ${r.level}`;
  document.getElementById('drawerTitle').textContent = r.name;

  document.getElementById('drawerSummary').innerHTML = renderDrawerSummary(r);

  document.querySelectorAll('.budget-drawer-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-dtab') === currentDrawerTab);
  });

  const body = document.getElementById('drawerBody');
  switch (currentDrawerTab) {
    case 'summary':
      body.innerHTML = renderDrawerSummaryTab(r);
      break;
    case 'tasks':
      body.innerHTML = renderDrawerTasksTab(r);
      break;
    case 'topics':
      body.innerHTML = renderDrawerTopicsTab(r);
      break;
    case 'ai':
      body.innerHTML = renderDrawerAiTab(r);
      break;
  }

  const link = linkages[String(drawerRowId)] || { taskIds: [], subtaskIds: [], topicIds: [] };
  document.getElementById('tabTaskCount').textContent = (link.taskIds.length + link.subtaskIds.length) || '';
  document.getElementById('tabTopicCount').textContent = link.topicIds.length || '';

  hydrateIcons(body);
}

function renderDrawerSummary(r) {
  return `
    <div class="cell"><div class="k">累计实际</div><div class="v">${isRatio(r) ? fmtPct(r.ytd) : fmtNum(r.ytd)}</div></div>
    <div class="cell"><div class="k">年度预算</div><div class="v">${isRatio(r) ? fmtPct(r.budget) : fmtNum(r.budget)}</div></div>
    <div class="cell"><div class="k">完成率</div><div class="v">${isRatio(r) ? '—' : fmtPct(r.rate)}</div></div>
  `;
}

function renderDrawerSummaryTab(r) {
  return `
    <div class="budget-drawer-section">
      <h4>科目详情</h4>
      <div class="budget-link-card">
        <div class="budget-link-card-meta">
          <span><b>当月实际：</b>${fmtCell(r, r.cur)} ${isRatio(r) ? '' : D.unit}</span>
          <span><b>累计实际：</b>${fmtCell(r, r.ytd)} ${isRatio(r) ? '' : D.unit}</span>
          <span><b>年度预算：</b>${fmtCell(r, r.budget)} ${isRatio(r) ? '' : D.unit}</span>
          <span><b>上年同期：</b>${fmtCell(r, r.lyYtd)} ${isRatio(r) ? '' : D.unit}</span>
          <span><b>全年预测：</b>${fmtCell(r, r.fcst)} ${isRatio(r) ? '' : D.unit}</span>
        </div>
      </div>
    </div>
    <div class="budget-drawer-section">
      <h4>说明</h4>
      <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.7">${escapeHtml(D.note || '')}</p>
    </div>
  `;
}

function renderDrawerTasksTab(r) {
  const link = linkages[String(r.row)] || { taskIds: [], subtaskIds: [] };
  const linkedTasks = link.taskIds.map(id => getTaskById(id)).filter(Boolean);
  const linkedSubtasks = link.subtaskIds.map(id => {
    const s = getTaskById(id);
    if (!s) return null;
    const parent = getTaskById(s.parentId);
    return { ...s, taskName: parent ? parent.name : '未知重点工作' };
  }).filter(Boolean);

  const availableTasks = allTasks.filter(t => !t.parentId && !link.taskIds.includes(t.id));
  const availableSubtasks = allTasks.filter(t => t.parentId && !link.subtaskIds.includes(t.id));

  let html = `
    <div class="budget-drawer-section">
      <h4>关联重点工作</h4>
      <div class="budget-link-selector">
        <label>添加重点工作</label>
        <select id="addTaskSelect">
          <option value="">— 请选择 —</option>
          ${availableTasks.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)} · ${escapeHtml(t.owner || '—')}</option>`).join('')}
        </select>
        <button type="button" class="btn btn-sm btn-primary" data-add-link="task">+ 添加</button>
      </div>
      ${linkedTasks.length ? linkedTasks.map(t => renderTaskCard(t)).join('') : '<div class="budget-link-empty">暂无关联重点工作</div>'}
    </div>
  `;

  html += `
    <div class="budget-drawer-section">
      <h4>关联子任务</h4>
      <div class="budget-link-selector">
        <label>添加子任务</label>
        <select id="addSubtaskSelect">
          <option value="">— 请选择 —</option>
          ${availableSubtasks.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)} · ${escapeHtml(s.parentId ? getTaskById(s.parentId)?.name : '')}</option>`).join('')}
        </select>
        <button type="button" class="btn btn-sm btn-primary" data-add-link="subtask">+ 添加</button>
      </div>
      ${linkedSubtasks.length ? linkedSubtasks.map(s => renderSubtaskCard(s)).join('') : '<div class="budget-link-empty">暂无关联子任务</div>'}
    </div>
  `;

  return html;
}

function renderDrawerTopicsTab(r) {
  const link = linkages[String(r.row)] || { topicIds: [] };
  const linkedTopics = link.topicIds.map(id => getTopicById(id)).filter(Boolean);
  const availableTopics = allTopics.filter(t => !link.topicIds.includes(t.id));

  return `
    <div class="budget-drawer-section">
      <h4>关联业务专题</h4>
      <div class="budget-link-selector">
        <label>添加业务专题</label>
        <select id="addTopicSelect">
          <option value="">— 请选择 —</option>
          ${availableTopics.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)} · ${escapeHtml(t.department || '—')} · ${escapeHtml(t.owner || '—')}</option>`).join('')}
        </select>
        <button type="button" class="btn btn-sm btn-primary" data-add-link="topic">+ 添加</button>
      </div>
      ${linkedTopics.length ? linkedTopics.map(t => renderTopicCard(t)).join('') : '<div class="budget-link-empty">暂无关联业务专题</div>'}
    </div>
  `;
}

function renderDrawerAiTab(r) {
  return `
    <div class="budget-drawer-section">
      <button type="button" class="btn btn-primary" data-action="run-row-ai"><span class="icon" data-icon="robot" data-icon-size="14"></span> 生成该科目 AI 分析</button>
    </div>
    <div id="rowAiResult" class="ai-result"></div>
  `;
}

function renderTaskCard(t) {
  const statusClass = getStatusClass(t.status);
  const statusLabel = getStatusLabel(t.status);
  return `
    <div class="budget-link-card" data-id="${escapeHtml(t.id)}">
      <div class="budget-link-card-top">
        <div class="budget-link-card-name">${escapeHtml(t.name)}</div>
        <button class="icon-btn danger" data-remove-link="task" data-id="${escapeHtml(t.id)}" title="移除"><span class="icon" data-icon="x" data-icon-size="14"></span></button>
      </div>
      <div class="budget-link-card-meta">
        <span>负责人：${escapeHtml(t.owner || '—')}</span>
        <span>部门：${escapeHtml(t.dept || '—')}</span>
        <span class="budget-status-tag ${statusClass}">${escapeHtml(statusLabel)}</span>
      </div>
      <div class="budget-link-card-progress">
        <div class="bar"><i style="width:${Math.min(t.progress || 0, 100)}%"></i></div>
        <span class="pct">${t.progress || 0}%</span>
      </div>
    </div>
  `;
}

function renderSubtaskCard(s) {
  const statusClass = getStatusClass(s.status);
  const statusLabel = getStatusLabel(s.status);
  const lastLog = getLastLog(s.id);
  return `
    <div class="budget-link-card" data-id="${escapeHtml(s.id)}">
      <div class="budget-link-card-top">
        <div class="budget-link-card-name">${escapeHtml(s.name)}</div>
        <button class="icon-btn danger" data-remove-link="subtask" data-id="${escapeHtml(s.id)}" title="移除"><span class="icon" data-icon="x" data-icon-size="14"></span></button>
      </div>
      <div class="budget-link-card-meta">
        <span>所属重点工作：${escapeHtml(s.taskName)}</span>
        <span>负责人：${escapeHtml(s.owner || '—')}</span>
        <span class="budget-status-tag ${statusClass}">${escapeHtml(statusLabel)}</span>
      </div>
      <div class="budget-link-card-progress">
        <div class="bar"><i style="width:${Math.min(s.progress || 0, 100)}%"></i></div>
        <span class="pct">${s.progress || 0}%</span>
      </div>
      ${lastLog ? `<div class="budget-link-card-log">${escapeHtml(lastLog)}</div>` : ''}
    </div>
  `;
}

function renderTopicCard(t) {
  const statusClass = getStatusClass(t.status);
  const statusLabel = getStatusLabel(t.status);
  return `
    <div class="budget-link-card" data-id="${escapeHtml(t.id)}">
      <div class="budget-link-card-top">
        <div class="budget-link-card-name">${escapeHtml(t.name)}</div>
        <button class="icon-btn danger" data-remove-link="topic" data-id="${escapeHtml(t.id)}" title="移除"><span class="icon" data-icon="x" data-icon-size="14"></span></button>
      </div>
      <div class="budget-link-card-meta">
        <span>负责人：${escapeHtml(t.owner || '—')}</span>
        <span>部门：${escapeHtml(t.department || '—')}</span>
        <span>优先级：${escapeHtml(t.priority || '—')}</span>
        <span class="budget-status-tag ${statusClass}">${escapeHtml(statusLabel)}</span>
      </div>
      <div class="budget-link-card-progress">
        <div class="bar"><i style="width:${Math.min(t.progress || 0, 100)}%"></i></div>
        <span class="pct">${t.progress || 0}%</span>
      </div>
    </div>
  `;
}

function getStatusClass(status) {
  const map = {
    active: 'budget-status-doing',
    in_progress: 'budget-status-doing',
    planning: 'budget-status-doing',
    completed: 'budget-status-done',
    done: 'budget-status-done',
    delayed: 'budget-status-delay',
    cancelled: 'budget-status-cancel',
    archived: 'budget-status-cancel'
  };
  return map[status] || 'budget-status-doing';
}

function getStatusLabel(status) {
  const map = {
    active: '进行中',
    in_progress: '进行中',
    planning: '规划中',
    completed: '已完成',
    done: '已完成',
    delayed: '已延期',
    cancelled: '已取消',
    archived: '已归档'
  };
  return map[status] || status || '进行中';
}

function handleAddLink(type) {
  const selectId = type === 'task' ? 'addTaskSelect' : type === 'subtask' ? 'addSubtaskSelect' : 'addTopicSelect';
  const select = document.getElementById(selectId);
  if (!select || !select.value) return;

  if (type === 'task') addTaskLink(linkages, drawerRowId, select.value);
  else if (type === 'subtask') addSubtaskLink(linkages, drawerRowId, select.value);
  else if (type === 'topic') addTopicLink(linkages, drawerRowId, select.value);

  saveLinkages(linkages);
  renderDrawer();
  renderTableOnly();
}

function handleRemoveLink(type, id) {
  if (type === 'task') removeTaskLink(linkages, drawerRowId, id);
  else if (type === 'subtask') removeSubtaskLink(linkages, drawerRowId, id);
  else if (type === 'topic') removeTopicLink(linkages, drawerRowId, id);

  saveLinkages(linkages);
  renderDrawer();
  renderTableOnly();
}

// 绑定抽屉内的 data-action（run-row-ai）
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action="run-row-ai"]');
  if (btn) {
    e.preventDefault();
    runAiAnalysis('row', drawerRowId);
  }
});

// ===== AI 分析 =====
function openAiDrawer() {
  document.getElementById('aiOverlay').style.display = 'block';
  document.getElementById('aiDrawer').style.display = 'flex';
}

function closeAiDrawer() {
  document.getElementById('aiOverlay').style.display = 'none';
  document.getElementById('aiDrawer').style.display = 'none';
}

async function runAiAnalysis(scope, rowId) {
  const resultEl = scope === 'row' ? document.getElementById('rowAiResult') : document.getElementById('aiResult');
  if (!resultEl) return;

  resultEl.innerHTML = '<div class="ai-loading">AI 正在分析...</div>';

  const linkedTasks = [];
  const linkedSubtasks = [];
  const linkedTopics = [];

  if (scope === 'row') {
    const link = linkages[String(rowId)] || { taskIds: [], subtaskIds: [], topicIds: [] };
    link.taskIds.forEach(id => {
      const t = getTaskById(id);
      if (t) linkedTasks.push(t);
    });
    link.subtaskIds.forEach(id => {
      const s = getTaskById(id);
      if (s) linkedSubtasks.push({ ...s, taskName: getTaskById(s.parentId)?.name || '未知重点工作' });
    });
    link.topicIds.forEach(id => {
      const t = getTopicById(id);
      if (t) linkedTopics.push(t);
    });
  }

  const prompt = scope === 'row'
    ? buildRowPrompt(rowById[rowId], D, linkedTasks, linkedSubtasks, linkedTopics)
    : buildGlobalPrompt(D, allTasks, allTopics, linkages);

  const cacheKey = hashString(prompt);
  const cache = Storage.get(LS_AI_CACHE_KEY, {});
  if (cache[cacheKey]) {
    resultEl.innerHTML = escapeHtml(cache[cacheKey]).replace(/\n/g, '<br>');
    return;
  }

  try {
    const client = new AIClient();
    const res = await client.request('/api/ai/chat', {
      messages: [
        { role: 'system', content: '你是 DSTE 战略管理执行平台的 AI 战略助手。' },
        { role: 'user', content: prompt }
      ]
    });
    const text = res?.content || res?.text || res?.message || 'AI 未返回有效内容';
    cache[cacheKey] = text;
    Storage.set(LS_AI_CACHE_KEY, cache);
    resultEl.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
  } catch (err) {
    resultEl.innerHTML = `<div style="color:var(--color-danger)">AI 分析失败：${escapeHtml(err.message || '未知错误')}</div>`;
  }
}

// ===== ECharts =====
function getCssColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function initCharts() {
  disposeCharts();
  if (typeof echarts === 'undefined') return;

  const C = {
    primary: getCssColor('--color-primary') || '#1677FF',
    success: getCssColor('--color-success') || '#52C41A',
    danger: getCssColor('--color-danger') || '#F5222D',
    warning: getCssColor('--color-warning') || '#FAAD14',
    gray1: getCssColor('--color-gray-400') || '#9CA3AF',
    gray2: getCssColor('--color-gray-300') || '#D1D5DB',
    gray3: getCssColor('--color-gray-200') || '#E4E6EB',
    text: getCssColor('--color-text-primary') || '#111827',
    textSecondary: getCssColor('--color-text-secondary') || '#374151'
  };

  const font = 'Inter, PingFang SC, Microsoft YaHei, sans-serif';

  function baseTooltip() {
    return {
      backgroundColor: getCssColor('--color-bg-surface') || '#fff',
      borderColor: getCssColor('--color-border-default') || '#E4E6EB',
      textStyle: { color: C.text, fontFamily: font, fontSize: 12 }
    };
  }

  function safeVal(rowId) {
    const r = rowById[rowId];
    return r && r.ytd != null ? r.ytd : 0;
  }

  // 1. 瀑布图
  (function () {
    const el = document.getElementById('chart-waterfall');
    if (!el) return;
    const chart = echarts.init(el);
    charts.push(chart);
    const a = safeVal(27), d = safeVal(28), g = safeVal(120), p = safeVal(144);
    const cats = ['税后净回款', '直接费用', '间接费用', '贡献利润'];
    const base = [0, a - d, p, 0];
    const vals = [
      { value: a, itemStyle: { color: C.primary } },
      { value: d, itemStyle: { color: C.danger } },
      { value: g, itemStyle: { color: C.warning } },
      { value: p, itemStyle: { color: C.success } }
    ];
    chart.setOption({
      tooltip: Object.assign(baseTooltip(), {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: ps => {
          const v = ps[1];
          const signed = v.dataIndex === 0 || v.dataIndex === 3 ? v.value : -v.value;
          return cats[v.dataIndex] + '：<b>' + fmtNum(signed) + '</b> ' + D.unit;
        }
      }),
      grid: { left: 8, right: 16, top: 24, bottom: 4, containLabel: true },
      xAxis: {
        type: 'category', data: cats,
        axisLine: { lineStyle: { color: C.gray3 } },
        axisTick: { show: false },
        axisLabel: { color: C.text, fontFamily: font, fontSize: 12 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: C.gray3 } },
        axisLabel: { color: C.textSecondary, fontFamily: font, formatter: v => fmtNum(v, 0) }
      },
      series: [
        { type: 'bar', stack: 'wf', silent: true, itemStyle: { color: 'transparent' }, data: base },
        {
          type: 'bar', stack: 'wf', barWidth: '52%',
          data: vals,
          label: {
            show: true, position: 'top', fontFamily: font, fontSize: 11, color: C.text,
            formatter: p2 => {
              const v = p2.dataIndex === 0 || p2.dataIndex === 3 ? p2.value : -p2.value;
              return fmtNum(v);
            }
          },
          itemStyle: { borderRadius: [3, 3, 0, 0] }
        }
      ]
    });
  })();

  // 2. 预算执行进度
  (function () {
    const el = document.getElementById('chart-progress');
    if (!el) return;
    const chart = echarts.init(el);
    charts.push(chart);
    const subjects = CHART_SUBJECTS.filter(s => rowById[s.row]);
    const names = subjects.map(s => s.name);
    const data = subjects.map(s => {
      const rate = rowById[s.row].rate || 0;
      return { value: +(rate * 100).toFixed(1), itemStyle: { color: rate >= PACE ? C.success : C.danger, borderRadius: [0, 3, 3, 0] } };
    });
    chart.setOption({
      tooltip: Object.assign(baseTooltip(), {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: ps => {
          const p2 = ps[0];
          const s = subjects[p2.dataIndex];
          const r = rowById[s.row];
          return s.name + '<br>完成率：<b>' + fmtPct(r.rate) + '</b><br>累计实际：' + fmtNum(r.ytd) + ' ' + D.unit + '<br>预算：' + fmtNum(r.budget) + ' ' + D.unit;
        }
      }),
      grid: { left: 8, right: 40, top: 10, bottom: 4, containLabel: true },
      xAxis: {
        type: 'value', max: 100,
        splitLine: { lineStyle: { color: C.gray3 } },
        axisLabel: { color: C.textSecondary, fontFamily: font, formatter: '{value}%' }
      },
      yAxis: {
        type: 'category', data: names, inverse: true,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: C.text, fontFamily: font, fontSize: 12 }
      },
      series: [{
        type: 'bar', data, barWidth: 14,
        label: { show: true, position: 'right', fontFamily: font, fontSize: 11, color: C.textSecondary, formatter: '{c}%' },
        markLine: {
          symbol: 'none',
          lineStyle: { color: C.text, type: 'dashed', width: 1.2 },
          label: { formatter: '时间进度 ' + fmtPct(PACE), fontFamily: font, fontSize: 10.5, color: C.text, position: 'end' },
          data: [{ xAxis: +(PACE * 100).toFixed(1) }]
        }
      }]
    });
  })();

  // 3. 同比对比
  (function () {
    const el = document.getElementById('chart-yoy');
    if (!el) return;
    const chart = echarts.init(el);
    charts.push(chart);
    const subjects = CHART_SUBJECTS.filter(s => rowById[s.row]);
    const names = subjects.map(s => s.name);
    const cur = subjects.map(s => +(rowById[s.row].ytd || 0).toFixed(1));
    const ly = subjects.map(s => +(rowById[s.row].lyYtd || 0).toFixed(1));
    chart.setOption({
      tooltip: Object.assign(baseTooltip(), {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        valueFormatter: v => fmtNum(v) + ' ' + D.unit
      }),
      legend: { top: 0, right: 0, itemWidth: 12, itemHeight: 8, textStyle: { color: C.textSecondary, fontFamily: font, fontSize: 11.5 } },
      grid: { left: 8, right: 12, top: 34, bottom: 4, containLabel: true },
      xAxis: {
        type: 'category', data: names,
        axisLine: { lineStyle: { color: C.gray3 } }, axisTick: { show: false },
        axisLabel: { color: C.text, fontFamily: font, fontSize: 11, interval: 0, rotate: 18 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: C.gray3 } },
        axisLabel: { color: C.textSecondary, fontFamily: font, formatter: v => fmtNum(v, 0) }
      },
      series: [
        { name: '累计实际', type: 'bar', data: cur, barWidth: 12, itemStyle: { color: C.success, borderRadius: [2, 2, 0, 0] } },
        { name: '同期累计', type: 'bar', data: ly, barWidth: 12, itemStyle: { color: C.gray2, borderRadius: [2, 2, 0, 0] } }
      ]
    });
  })();

  // 4. 费用构成
  (function () {
    const el = document.getElementById('chart-pie');
    if (!el) return;
    const chart = echarts.init(el);
    charts.push(chart);
    const directChildren = childrenOf[28] || [];
    const indirectChildren = childrenOf[120] || [];
    const directData = directChildren.filter(r => r.ytd).map((r, i) => {
      const colors = [C.success, C.warning, C.danger, C.gray1, C.primary];
      return { name: r.name.replace(/^[一二三四五六七八九十]+、/, ''), value: +r.ytd.toFixed(1), itemStyle: { color: colors[i % colors.length] } };
    });
    const indirectData = indirectChildren.filter(r => r.ytd).map((r, i) => {
      const colors = [C.danger, C.gray2, C.warning, C.gray1, C.primary];
      return { name: r.name.replace(/^[一二三四五六七八九十]+、/, ''), value: +r.ytd.toFixed(1), itemStyle: { color: colors[i % colors.length] } };
    });
    if (!directData.length) directData.push({ name: '直接费用', value: +safeVal(28).toFixed(1), itemStyle: { color: C.success } });
    if (!indirectData.length) indirectData.push({ name: '间接费用', value: +safeVal(120).toFixed(1), itemStyle: { color: C.danger } });

    chart.setOption({
      tooltip: Object.assign(baseTooltip(), {
        trigger: 'item',
        formatter: p2 => p2.seriesName + '<br>' + p2.name + '：<b>' + fmtNum(p2.value) + '</b> ' + D.unit + '（' + p2.percent + '%）'
      }),
      legend: { bottom: 0, left: 'center', itemWidth: 12, itemHeight: 8, textStyle: { color: C.textSecondary, fontFamily: font, fontSize: 11.5 } },
      title: [
        { text: '直接费用 ' + fmtNum(safeVal(28), 0), left: '25%', top: '6%', textAlign: 'center', textStyle: { fontSize: 12.5, fontFamily: font, color: C.text, fontWeight: 600 } },
        { text: '间接费用 ' + fmtNum(safeVal(120), 0), left: '75%', top: '6%', textAlign: 'center', textStyle: { fontSize: 12.5, fontFamily: font, color: C.text, fontWeight: 600 } }
      ],
      series: [
        {
          name: '直接费用构成', type: 'pie', radius: ['42%', '66%'], center: ['25%', '56%'],
          avoidLabelOverlap: true,
          label: { fontFamily: font, fontSize: 11, color: C.text, formatter: '{b}\n{d}%' },
          labelLine: { length: 8, length2: 6 },
          itemStyle: { borderColor: getCssColor('--color-bg-surface') || '#fff', borderWidth: 2 },
          data: directData
        },
        {
          name: '间接费用构成', type: 'pie', radius: ['42%', '66%'], center: ['75%', '56%'],
          label: { fontFamily: font, fontSize: 11, color: C.text, formatter: '{b}\n{d}%' },
          labelLine: { length: 8, length2: 6 },
          itemStyle: { borderColor: getCssColor('--color-bg-surface') || '#fff', borderWidth: 2 },
          data: indirectData
        }
      ]
    });
  })();
}

function disposeCharts() {
  charts.forEach(c => { if (c) c.dispose(); });
  charts = [];
}

// ===== 启动 =====
init();
