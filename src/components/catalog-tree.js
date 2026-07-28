/**
 * 目录树组件
 * 支持管理页树形展示、行内编辑、增删改、启用/禁用、HTML5 拖拽排序、目录选择器弹窗。
 */

import {
  loadCatalogs,
  saveCatalogs,
  createCatalogNode,
  updateCatalogNode,
  deleteCatalogNode,
  buildCatalogTree,
  getCatalogPath,
  reorderCatalogNode,
  countCatalogRefs,
  CATALOG_SCOPES,
} from '../lib/catalog.js';
import { icon, hydrateIcons } from '../../assets/js/icons.js';
import { showToast, escapeHtml } from '../lib/utils.js';

const INSTANCES = new Map();
let _expandedIds = new Set();
let _pickerResolve = null;
let _pickerContainer = null;

const ALLOWED_ICONS = [
  'folder', 'folders', 'folderOpen', 'tree', 'tree-structure', 'list',
  'bookmark', 'tag', 'flag', 'star', 'target', 'brain', 'lightbulb',
  'chartBar', 'chartLineUp', 'chartPieSlice', 'users', 'building', 'buildings',
];

export function createCatalogTree(container, options = {}) {
  const {
    scope = CATALOG_SCOPES.OMP_TASKS,
    mode = 'manage', // 'manage' | 'pick'
    selectedId = null,
    onSelect = null,
    onChange = null,
    title = '目录',
  } = options;

  const id = `catalog-tree-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const state = {
    treeId: id,
    scope,
    mode,
    selectedId,
    editingId: null,
    dragSourceId: null,
    dropTargetId: null,
    dropPosition: null,
  };

  INSTANCES.set(id, { container, state, onSelect, onChange });

  function render() {
    const { roots } = buildCatalogTree(scope);
    const empty = roots.length === 0;
    const header = mode === 'manage'
      ? `<div class="catalog-tree-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
           <span class="text-sm-secondary">拖拽调整顺序和层级</span>
           <button class="btn btn-sm btn-primary" data-tree-id="${id}" data-action="catalog-add-root" data-scope="${escapeHtml(scope)}">+ 新建根目录</button>
         </div>`
      : '';

    container.innerHTML = `
      <div class="catalog-tree" data-tree-id="${id}" data-mode="${mode}">
        ${header}
        ${empty
          ? `<div class="empty-state">暂无${escapeHtml(title)}，${mode === 'manage' ? '点击右上角新建' : '请在管理页创建'}</div>`
          : `<div class="catalog-roots">${roots.map(node => renderNode(node, state, 0)).join('')}</div>`}
      </div>
    `;
    hydrateIcons(container);
    bindTreeEvents(container, state, id, render);
  }

  function destroy() {
    INSTANCES.delete(id);
    if (container) container.innerHTML = '';
  }

  render();
  return { render, destroy, id, state };
}

function renderNode(node, state, depth) {
  const { mode, selectedId, editingId, scope } = state;
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = _expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const isEditing = editingId === node.id;
  const isDisabled = node.status === 'disabled';
  const indent = depth * 20;

  const toggleIcon = hasChildren
    ? (isExpanded ? icon('caretDown', { size: 12 }) : icon('caretRight', { size: 12 }))
    : `<span style="width:12px;display:inline-block;"></span>`;
  const folderIcon = icon(node.icon || (isExpanded ? 'folderOpen' : 'folder'), { size: 16 });

  const rowClass = ['catalog-row'];
  if (isSelected) rowClass.push('selected');
  if (isDisabled) rowClass.push('disabled');
  if (state.dragSourceId === node.id) rowClass.push('dragging');
  if (state.dropTargetId === node.id) rowClass.push(`drop-${state.dropPosition || 'child'}`);

  const nameHtml = isEditing
    ? `<input type="text" class="catalog-name-input form-input form-input-sm" value="${escapeHtml(node.name)}" data-node-id="${escapeHtml(node.id)}" data-tree-id="${state.treeId || ''}" style="flex:1;min-width:60px;">`
    : `<span class="catalog-name" style="flex:1;${isDisabled ? 'opacity:0.6;' : ''}">${escapeHtml(node.name)}</span>`;

  const statusBadge = isDisabled
    ? `<span class="badge badge-sm" style="margin-left:8px;font-size:11px;background:var(--bg-tertiary);color:var(--text-tertiary);">已禁用</span>`
    : '';

  const actions = mode === 'manage' && !isEditing
    ? `<span class="catalog-actions" style="display:flex;gap:4px;opacity:0;transition:opacity 0.15s;">
         <button class="btn btn-xs btn-secondary" data-action="catalog-add-child" data-node-id="${escapeHtml(node.id)}" title="新增子目录">+</button>
         <button class="btn btn-xs btn-secondary" data-action="catalog-rename" data-node-id="${escapeHtml(node.id)}" title="重命名">${icon('edit', { size: 12 })}</button>
         <button class="btn btn-xs btn-secondary" data-action="catalog-toggle-status" data-node-id="${escapeHtml(node.id)}" title="${isDisabled ? '启用' : '禁用'}">${icon(isDisabled ? 'eye' : 'eyeOff', { size: 12 })}</button>
         <button class="btn btn-xs btn-danger" data-action="catalog-delete" data-node-id="${escapeHtml(node.id)}" title="删除">${icon('delete', { size: 12 })}</button>
       </span>`
    : '';

  const selectClass = mode === 'pick' && !isDisabled ? 'data-action="catalog-pick"' : '';
  const draggableAttr = mode === 'manage' ? 'draggable="true"' : '';

  const childrenHtml = hasChildren && isExpanded
    ? `<div class="catalog-children" style="margin-left:16px;border-left:1px dashed var(--border-light);padding-left:4px;">${node.children.map(child => renderNode(child, state, depth + 1)).join('')}</div>`
    : '';

  return `
    <div class="catalog-node" data-node-id="${escapeHtml(node.id)}">
      <div class="${rowClass.join(' ')}" ${draggableAttr} data-node-id="${escapeHtml(node.id)}" ${selectClass} style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;cursor:${mode === 'pick' ? 'pointer' : 'grab'};padding-left:${indent}px;">
        <span class="catalog-toggle" data-action="catalog-toggle" data-node-id="${escapeHtml(node.id)}" style="cursor:pointer;flex-shrink:0;width:16px;text-align:center;">${toggleIcon}</span>
        <span class="catalog-folder" style="flex-shrink:0;color:var(--primary);">${folderIcon}</span>
        ${nameHtml}
        ${statusBadge}
        ${actions}
      </div>
      ${childrenHtml}
    </div>
  `;
}

function bindTreeEvents(container, state, treeId, render) {
  const treeEl = container.querySelector('.catalog-tree');
  if (!treeEl) return;
  const scope = state.scope;

  treeEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const nodeId = btn.dataset.nodeId;

    switch (action) {
      case 'catalog-toggle': {
        e.stopPropagation();
        if (_expandedIds.has(nodeId)) _expandedIds.delete(nodeId);
        else _expandedIds.add(nodeId);
        render();
        break;
      }
      case 'catalog-add-root': {
        e.stopPropagation();
        const name = prompt('请输入新目录名称：', '');
        if (!name || !name.trim()) return;
        const catalogs = loadCatalogs();
        const node = createCatalogNode(scope, null, name.trim());
        catalogs.push(node);
        saveCatalogs(catalogs);
        _expandedIds.add(node.id);
        render();
        if (state.onChange) state.onChange();
        break;
      }
      case 'catalog-add-child': {
        e.stopPropagation();
        const name = prompt('请输入子目录名称：', '');
        if (!name || !name.trim()) return;
        const catalogs = loadCatalogs();
        const node = createCatalogNode(scope, nodeId, name.trim());
        catalogs.push(node);
        saveCatalogs(catalogs);
        _expandedIds.add(nodeId);
        _expandedIds.add(node.id);
        render();
        if (state.onChange) state.onChange();
        break;
      }
      case 'catalog-rename': {
        e.stopPropagation();
        state.editingId = nodeId;
        render();
        const input = container.querySelector(`input[data-node-id="${CSS.escape(nodeId)}"]`);
        if (input) {
          input.focus();
          input.select();
        }
        break;
      }
      case 'catalog-toggle-status': {
        e.stopPropagation();
        const node = loadCatalogs().find(c => c.id === nodeId);
        if (node) {
          updateCatalogNode(nodeId, { status: node.status === 'disabled' ? 'active' : 'disabled' });
          render();
        }
        break;
      }
      case 'catalog-delete': {
        e.stopPropagation();
        const node = loadCatalogs().find(c => c.id === nodeId);
        if (!node) return;
        const refCount = countCatalogRefs(nodeId, scope);
        if (refCount > 0) {
          showToast(`该目录已被 ${refCount} 个重点工作引用，无法删除`, 'warning');
          return;
        }
        if (!confirm(`确定删除目录「${node.name}」？`)) return;
        const result = deleteCatalogNode(nodeId, scope);
        if (result.success) {
          showToast('目录已删除', 'success');
          render();
          if (state.onChange) state.onChange();
        } else {
          showToast(result.error || '删除失败', 'error');
        }
        break;
      }
      case 'catalog-pick': {
        e.stopPropagation();
        if (state.selectedId === nodeId) return;
        state.selectedId = nodeId;
        render();
        const node = loadCatalogs().find(c => c.id === nodeId);
        if (state.onSelect && node) state.onSelect(node);
        if (_pickerResolve) _pickerResolve(node);
        closeCatalogPicker();
        break;
      }
    }
  });

  // 行内编辑事件
  treeEl.addEventListener('keydown', (e) => {
    if (e.target.classList.contains('catalog-name-input')) {
      const input = e.target;
      const nodeId = input.dataset.nodeId;
      if (e.key === 'Enter') {
        e.preventDefault();
        finishRename(input.value, nodeId, scope, state, render);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        state.editingId = null;
        render();
      }
    }
  });

  treeEl.addEventListener('blur', (e) => {
    if (e.target.classList.contains('catalog-name-input')) {
      const input = e.target;
      const nodeId = input.dataset.nodeId;
      finishRename(input.value, nodeId, scope, state, render);
    }
  }, true);

  // 拖拽事件
  if (state.mode === 'manage') {
    bindDragEvents(treeEl, state, render);
  }

  // 行操作按钮悬停显示
  treeEl.querySelectorAll('.catalog-row').forEach(row => {
    row.addEventListener('mouseenter', () => {
      const actions = row.querySelector('.catalog-actions');
      if (actions) actions.style.opacity = '1';
    });
    row.addEventListener('mouseleave', () => {
      const actions = row.querySelector('.catalog-actions');
      if (actions) actions.style.opacity = '0';
    });
  });
}

function finishRename(value, nodeId, scope, state, render) {
  if (state.editingId !== nodeId) return;
  const name = (value || '').trim();
  if (!name) {
    showToast('目录名称不能为空', 'error');
    state.editingId = null;
    render();
    return;
  }
  const catalogs = loadCatalogs();
  const node = catalogs.find(c => c.id === nodeId);
  if (!node) {
    state.editingId = null;
    render();
    return;
  }
  const siblings = catalogs.filter(c => c.parentId === node.parentId && c.id !== nodeId);
  if (siblings.some(c => c.name === name)) {
    showToast('同层级下已存在同名目录', 'error');
    state.editingId = null;
    render();
    return;
  }
  updateCatalogNode(nodeId, { name });
  state.editingId = null;
  render();
}

function bindDragEvents(treeEl, state, render) {
  treeEl.addEventListener('dragstart', (e) => {
    const row = e.target.closest('.catalog-row[draggable="true"]');
    if (!row) return;
    state.dragSourceId = row.dataset.nodeId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', row.dataset.nodeId);
    row.classList.add('dragging');
  });

  treeEl.addEventListener('dragend', (e) => {
    const row = e.target.closest('.catalog-row');
    if (row) row.classList.remove('dragging');
    state.dragSourceId = null;
    state.dropTargetId = null;
    state.dropPosition = null;
    render();
  });

  treeEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    const row = e.target.closest('.catalog-row[draggable="true"]');
    if (!row) return;
    const targetId = row.dataset.nodeId;
    if (targetId === state.dragSourceId) {
      state.dropTargetId = null;
      state.dropPosition = null;
      render();
      return;
    }
    const rect = row.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    let position = 'child';
    if (ratio < 0.3) position = 'before';
    else if (ratio > 0.7) position = 'after';

    if (state.dropTargetId !== targetId || state.dropPosition !== position) {
      state.dropTargetId = targetId;
      state.dropPosition = position;
      render();
    }
    e.dataTransfer.dropEffect = 'move';
  });

  treeEl.addEventListener('dragleave', (e) => {
    const row = e.target.closest('.catalog-row');
    if (!row) return;
    state.dropTargetId = null;
    state.dropPosition = null;
    render();
  });

  treeEl.addEventListener('drop', (e) => {
    e.preventDefault();
    const row = e.target.closest('.catalog-row[draggable="true"]');
    if (!row) return;
    const sourceId = state.dragSourceId;
    const targetId = row.dataset.nodeId;
    const position = state.dropPosition || 'child';
    state.dragSourceId = null;
    state.dropTargetId = null;
    state.dropPosition = null;

    if (!sourceId || sourceId === targetId) return;

    const result = reorderCatalogNode(sourceId, targetId, position);
    if (result.success) {
      showToast('目录位置已更新', 'success');
    } else {
      showToast(result.error || '移动失败', 'error');
    }
    render();
    if (state.onChange) state.onChange();
  });
}

// ===================== 目录选择器弹窗 =====================

export function openCatalogPicker(options = {}) {
  const {
    scope = CATALOG_SCOPES.OMP_TASKS,
    selectedId = null,
    title = '选择目录',
    includeDisabled = false,
  } = options;

  return new Promise((resolve) => {
    _pickerResolve = resolve;
    closeCatalogPicker();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay catalog-picker-overlay open';
    overlay.id = 'catalogPickerModal';
    overlay.style.zIndex = '10000';
    overlay.innerHTML = `
      <div class="modal" style="width:480px;max-height:70vh;display:flex;flex-direction:column;">
        <div class="modal-header">
          <span class="modal-title">${escapeHtml(title)}</span>
          <button class="modal-close" data-picker-action="close">${icon('x', { size: 14 })}</button>
        </div>
        <div class="modal-body" style="overflow-y:auto;flex:1;">
          <div id="catalog-picker-tree"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" data-picker-action="close">取消</button>
          <button class="btn btn-primary" data-picker-action="clear">清除选择</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    // 如果当前在 omp-active-modal 内打开，确保 picker 覆盖在该 modal 之上
    const taskModal = document.getElementById('omp-active-modal');
    if (taskModal) {
      taskModal.style.pointerEvents = 'none';
      overlay.style.pointerEvents = 'auto';
    }
    _pickerContainer = overlay;
    hydrateIcons(overlay);

    const treeContainer = overlay.querySelector('#catalog-picker-tree');
    createCatalogTree(treeContainer, {
      scope,
      mode: 'pick',
      selectedId,
      onSelect: (node) => {
        if (resolve) resolve(node);
        _pickerResolve = null;
        closeCatalogPicker();
      },
    });

    overlay.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-picker-action]');
      if (!btn && e.target === overlay) {
        closeCatalogPicker();
        resolve(null);
        return;
      }
      if (!btn) return;
      const action = btn.dataset.pickerAction;
      if (action === 'close') {
        closeCatalogPicker();
        resolve(null);
      } else if (action === 'clear') {
        closeCatalogPicker();
        resolve({ id: '', name: '' });
      }
    });
  });
}

function closeCatalogPicker() {
  const overlay = document.getElementById('catalogPickerModal');
  if (overlay) overlay.remove();
  const taskModal = document.getElementById('omp-active-modal');
  if (taskModal) taskModal.style.pointerEvents = '';
  _pickerContainer = null;
}

// 暴露给全局，方便内联 HTML 调用
if (typeof window !== 'undefined') {
  window.openCatalogPicker = openCatalogPicker;
  window.createCatalogTree = createCatalogTree;
}
