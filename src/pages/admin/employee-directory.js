/**
 * 人员与组织管理页
 * Phase 1：提供员工目录导入、组织架构浏览。
 */

import {
  getEmployees,
  getOrgUnits,
  getOrgTree,
  hasEmployeeData,
  getImportMeta,
  clearEmployeeDirectory,
  IMPORT_META_STORAGE_KEY,
} from '../../lib/employee-directory.js';
import { icon } from '../../../assets/js/icons.js';
import { importEmployeesFromFile, executeImport } from '../../lib/employee-import.js';
import { showToast, escapeHtml } from '../../lib/utils.js';

// ===================== 状态 =====================
let _previewSummary = null;
let _pendingFile = null;
let _expandedOrgIds = new Set();
let _selectedOrgId = null;

// ===================== 页面初始化 =====================

export function initEmployeeDirectoryPage() {
  renderPageLayout();
  bindPageEvents();
  refreshAllPanels();
}

function renderPageLayout() {
  const container = document.getElementById('employee-directory-root');
  if (!container) return;

  container.innerHTML = `
    <div class="employee-directory-page">
      <header class="page-header">
        <h1>${icon('users', {size: 14})} 人员与组织管理</h1>
        <p class="page-desc">导入人员信息表后，全系统可统一使用实际组织架构和名单。Excel 为唯一来源，重新导入即可更新。</p>
      </header>

      <section class="directory-stats" id="directory-stats"></section>

      <section class="directory-import" id="directory-import"></section>

      <section class="directory-main">
        <div class="directory-tree" id="directory-tree"></div>
      </section>
    </div>
  `;
}

// ===================== 统计面板 =====================

function renderStatsPanel() {
  const container = document.getElementById('directory-stats');
  if (!container) return;

  const meta = getImportMeta();
  const employees = getEmployees();
  const { orgUnits, roots } = getOrgTree();

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${employees.length}</div>
      <div class="stat-label">员工总数</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${Object.keys(orgUnits).length}</div>
      <div class="stat-label">组织单元</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${roots.length}</div>
      <div class="stat-label">一级组织</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${meta ? formatDate(meta.importedAt) : '未导入'}</div>
      <div class="stat-label">${meta ? `来源: ${escapeHtml(meta.fileName || '')}` : '导入时间'}</div>
    </div>
  `;
}

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ===================== 导入面板 =====================

function renderImportPanel() {
  const container = document.getElementById('directory-import');
  if (!container) return;

  container.innerHTML = `
    <div class="import-zone" id="import-drop-zone">
      <div class="import-icon">${icon('folder', {size: 14})}</div>
      <div class="import-text">拖拽人员信息表到此处，或点击选择文件</div>
      <div class="import-hint">支持 .xlsx / .xls / .csv，必填列：工号、姓名、组织全称、ldap</div>
      <input type="file" id="import-file-input" accept=".xlsx,.xls,.csv" style="display:none;">
    </div>
    <div id="import-preview"></div>
  `;
}

function renderImportPreview(summary, fileName) {
  const container = document.getElementById('import-preview');
  if (!container) return;

  const hasErrors = summary.errors.length > 0;
  const hasWarnings = summary.warnings.length > 0;

  container.innerHTML = `
    <div class="import-summary">
      <div class="summary-title">导入预览：${escapeHtml(fileName)}</div>
      <div class="summary-stats">
        <span>共 ${summary.total} 行</span>
        <span class="text-success">有效 ${summary.valid}</span>
        <span class="text-error">无效 ${summary.invalid}</span>
      </div>
      ${renderMessageList('错误', summary.errors, 'error')}
      ${renderMessageList('警告', summary.warnings, 'warning')}
      <div class="import-actions">
        <button class="btn btn-primary" id="btn-confirm-import" ${summary.employees.length === 0 ? 'disabled' : ''}>确认导入</button>
        <button class="btn btn-secondary" id="btn-cancel-import">取消</button>
      </div>
    </div>
  `;
}

function renderMessageList(title, list, type) {
  if (!list || list.length === 0) return '';
  const items = list.slice(0, 10).map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const more = list.length > 10 ? `<li>... 还有 ${list.length - 10} 条</li>` : '';
  return `
    <div class="message-list message-${type}">
      <div class="message-title">${title} (${list.length})</div>
      <ul>${items}${more}</ul>
    </div>
  `;
}

// ===================== 组织树面板 =====================

function renderOrgTreePanel() {
  const container = document.getElementById('directory-tree');
  if (!container) return;

  if (!hasEmployeeData()) {
    container.innerHTML = '<div class="empty-state">暂无组织数据，请先导入人员信息表</div>';
    return;
  }

  const { orgUnits, roots } = getOrgTree();
  if (roots.length === 0) {
    container.innerHTML = '<div class="empty-state">组织架构为空</div>';
    return;
  }

  const empMap = buildOrgEmployeesMap();

  container.innerHTML = `
    <div class="tree-header">
      <span>组织架构</span>
      <div style="display:flex;gap:12px;">
        <button class="btn-link" id="btn-expand-all">展开全部</button>
        <button class="btn-link" id="btn-collapse-all">收起全部</button>
      </div>
    </div>
    <div class="org-tree">${roots.map(id => renderOrgNode(id, orgUnits, 0, empMap)).join('')}</div>
  `;
}

function buildOrgEmployeesMap() {
  const employees = getEmployees();
  const map = {};
  employees.forEach(emp => {
    const pathParts = [emp.l1Org, emp.l1Team, emp.l2Team, emp.l3Team].filter(Boolean);
    if (pathParts.length === 0) return;
    const orgId = 'org:' + pathParts.join('/');
    if (!map[orgId]) map[orgId] = [];
    map[orgId].push(emp);
  });
  return map;
}

function renderEmployeeNode(emp, depth) {
  const indent = depth * 20 + 22;
  const initials = (emp.name || emp.displayName || '?').charAt(0);
  return `
    <div class="emp-row" style="padding-left:${indent}px;">
      <div class="emp-avatar">${escapeHtml(initials)}</div>
      <div class="emp-info">
        <div class="emp-name">${escapeHtml(emp.displayName || emp.name)}</div>
        <div class="emp-meta">${escapeHtml(emp.id)} · ${escapeHtml(emp.orgPath || '未分配组织')}</div>
      </div>
    </div>
  `;
}

function renderOrgNode(orgId, orgUnits, depth, empMap) {
  const unit = orgUnits[orgId];
  if (!unit) return '';

  const hasChildren = unit.children && unit.children.length > 0;
  const isExpanded = _expandedOrgIds.has(orgId);
  const isSelected = _selectedOrgId === orgId;
  const indent = depth * 20;
  const employees = empMap[orgId] || [];

  const toggleIcon = hasChildren ? (isExpanded ? '▼' : '▶') : '';
  const folderIcon = hasChildren ? (isExpanded ? icon('folders', {size: 14}) : icon('folder', {size: 14})) : icon('folders', {size: 14});
  const rowBg = isSelected ? 'background: var(--primary-light, color-mix(in srgb, var(--primary) 12%, transparent)); border-radius: 6px;' : '';
  const nameColor = isSelected ? 'var(--primary)' : 'var(--text-primary)';
  const fontWeight = isSelected ? '600' : '400';

  const childrenHtml = hasChildren && isExpanded
    ? `<div class="org-children">${unit.children.map(childId => renderOrgNode(childId, orgUnits, depth + 1, empMap)).join('')}</div>`
    : '';

  const employeesHtml = isExpanded && employees.length > 0
    ? `<div class="org-employees">${employees.map(emp => renderEmployeeNode(emp, depth + 1)).join('')}</div>`
    : '';

  return `
    <div class="org-node" data-org-id="${escapeHtml(orgId)}">
      <div class="org-row" style="padding-left:${indent}px; ${rowBg}" data-action="select-org" data-org-id="${escapeHtml(orgId)}">
        <span class="org-toggle" data-action="toggle-org" data-org-id="${escapeHtml(orgId)}" ${!hasChildren ? 'style="visibility:hidden;"' : ''}>${toggleIcon}</span>
        <span class="org-folder" style="font-size:14px;" data-action="select-org" data-org-id="${escapeHtml(orgId)}">${folderIcon}</span>
        <span class="org-name" style="flex:1; color:${nameColor}; font-weight:${fontWeight};" data-action="select-org" data-org-id="${escapeHtml(orgId)}">${escapeHtml(unit.name)}</span>
        <span class="org-count">${unit.employeeCount} 人</span>
      </div>
      ${childrenHtml}
      ${employeesHtml}
    </div>
  `;
}

// ===================== 事件绑定 =====================

function bindPageEvents() {
  bindImportEvents();
  bindTreeEvents();
}

function bindImportEvents() {
  const dropZone = document.getElementById('import-drop-zone');
  const fileInput = document.getElementById('import-file-input');
  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileSelected(files[0]);
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileSelected(e.target.files[0]);
  });
}

async function handleFileSelected(file) {
  _pendingFile = file;
  _previewSummary = null;

  const result = await importEmployeesFromFile(file);

  if (result.success) {
    showToast(`成功导入 ${result.summary.employees.length} 名员工`, 'success');
    refreshAllPanels();
    _pendingFile = null;
  } else {
    // 显示预览，等待用户确认
    _previewSummary = result.summary;
    renderImportPreview(result.summary, file.name);
    if (result.error && (!result.summary || result.summary.employees.length === 0)) {
      showToast(result.error, 'error');
    }
  }
}

function bindTreeEvents() {
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-action="toggle-org"]');
    if (toggle) {
      e.stopPropagation();
      const orgId = toggle.dataset.orgId;
      if (_expandedOrgIds.has(orgId)) {
        _expandedOrgIds.delete(orgId);
      } else {
        _expandedOrgIds.add(orgId);
      }
      renderOrgTreePanel();
      return;
    }

    const selectRow = e.target.closest('[data-action="select-org"]');
    if (selectRow) {
      const orgId = selectRow.dataset.orgId;
      _selectedOrgId = _selectedOrgId === orgId ? null : orgId;
      renderOrgTreePanel();
      return;
    }

    if (e.target.id === 'btn-expand-all') {
      const { orgUnits } = getOrgTree();
      Object.keys(orgUnits).forEach(id => _expandedOrgIds.add(id));
      renderOrgTreePanel();
      return;
    }

    if (e.target.id === 'btn-collapse-all') {
      _expandedOrgIds.clear();
      renderOrgTreePanel();
      return;
    }
  });
}

// 确认导入按钮（预览模式）
document.addEventListener('click', async (e) => {
  if (e.target.id === 'btn-confirm-import' && _previewSummary) {
    const result = executeImport(_previewSummary.employees, {
      fileName: _pendingFile ? _pendingFile.name : 'unknown',
      sourceRows: _previewSummary.total,
    });
    if (result.success) {
      showToast(`成功导入 ${_previewSummary.employees.length} 名员工`, 'success');
      _previewSummary = null;
      _pendingFile = null;
      refreshAllPanels();
    } else {
      showToast(result.error || '导入失败', 'error');
    }
  }

  if (e.target.id === 'btn-cancel-import') {
    _previewSummary = null;
    _pendingFile = null;
    renderImportPanel();
    bindImportEvents();
  }
});

// ===================== 刷新 =====================

function refreshAllPanels() {
  renderStatsPanel();
  renderImportPanel();
  bindImportEvents();
  renderOrgTreePanel();
}
