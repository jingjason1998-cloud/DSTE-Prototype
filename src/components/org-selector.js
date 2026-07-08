/**
 * 组织选择器组件
 * 基于组织架构树提供单选能力，支持展开/收起与清空。
 */

import { getOrgTree } from '../lib/employee-directory.js';
import { icon } from '../../assets/js/icons.js';

const DEFAULT_OPTIONS = {
  placeholder: '选择组织...',
  allowClear: true,
  orgTree: null,
  value: null,
  onChange: null,
};

/**
 * 创建组织选择器
 * @param {HTMLElement} container
 * @param {object} options
 * @param {string} options.placeholder
 * @param {boolean} options.allowClear 是否允许清空选择
 * @param {{orgUnits:object, roots:string[]}} options.orgTree 外部传入的组织树，默认读取 employee-directory
 * @param {string|object} options.value 初始值（orgId 或 { id }）
 * @param {Function} options.onChange 选择变化回调 (value) => void
 * @returns {{getValue: () => string|null, setValue: (value) => void, clear: () => void, destroy: () => void}}
 */
export function createOrgSelector(container, options = {}) {
  if (!container) throw new Error('Org selector container is required');

  const opts = { ...DEFAULT_OPTIONS, ...options };
  let selectedValue = normalizeValue(opts.value);
  let expandedIds = new Set();

  render();
  bindEvents();

  function render() {
    const tree = opts.orgTree || getOrgTree();
    const hasData = tree && tree.roots && tree.roots.length > 0;

    container.innerHTML = `
      <div class="org-selector" data-org-selector="true" style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:6px;overflow:hidden;">
        <div class="org-selector-header" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg-page);border-bottom:1px solid var(--border-color);cursor:pointer;">
          <span style="color:var(--text-primary);font-size:13px;">${escapeHtml(getDisplayLabel(tree))}</span>
          ${opts.allowClear && selectedValue ? `<span class="org-selector-clear" style="color:var(--text-tertiary);cursor:pointer;font-size:16px;line-height:1;">${icon('x', {size: 14})}</span>` : ''}
        </div>
        <div class="org-selector-tree" style="max-height:260px;overflow-y:auto;padding:4px 0;">
          ${hasData ? tree.roots.map(id => renderOrgNode(id, tree.orgUnits, 0)).join('') : `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px;">暂无组织数据</div>`}
        </div>
      </div>
    `;
  }

  function getDisplayLabel(tree) {
    if (!selectedValue) return opts.placeholder;
    const treeData = tree || opts.orgTree || getOrgTree();
    const unit = treeData?.orgUnits?.[selectedValue];
    return unit ? unit.name : selectedValue;
  }

  function renderOrgNode(orgId, orgUnits, depth) {
    const unit = orgUnits ? orgUnits[orgId] : null;
    if (!unit) return '';

    const hasChildren = Array.isArray(unit.children) && unit.children.length > 0;
    const isExpanded = expandedIds.has(orgId);
    const isSelected = selectedValue === orgId;
    const indent = depth * 18;
    const toggleIcon = hasChildren ? (isExpanded ? icon('caretDown', {size: 12}) : icon('caretRight', {size: 12})) : icon('circle', {size: 6});
    const rowBg = isSelected ? 'background:var(--primary-light,color-mix(in srgb, var(--primary) 12%, transparent));' : '';
    const nameColor = isSelected ? 'var(--primary)' : 'var(--text-primary)';
    const fontWeight = isSelected ? '600' : '400';

    const childrenHtml = hasChildren && isExpanded
      ? `<div style="margin-left:16px;border-left:1px dashed var(--border-color);">${unit.children.map(childId => renderOrgNode(childId, orgUnits, depth + 1)).join('')}</div>`
      : '';

    return `
      <div class="org-node" data-org-id="${escapeHtml(orgId)}">
        <div class="org-row" style="display:flex;align-items:center;gap:6px;padding:6px 12px 6px ${12 + indent}px;cursor:pointer;${rowBg}">
          <span class="org-toggle" style="font-size:11px;color:var(--text-tertiary);width:14px;text-align:center;${hasChildren ? '' : 'visibility:hidden;'}">${toggleIcon}</span>
          <span class="org-name" style="flex:1;font-size:13px;color:${nameColor};font-weight:${fontWeight};">${escapeHtml(unit.name)}</span>
          <span class="org-count" style="font-size:11px;color:var(--text-muted);">${unit.employeeCount || 0} 人</span>
        </div>
        ${childrenHtml}
      </div>
    `;
  }

  function bindEvents() {
    container.addEventListener('click', (e) => {
      const clearBtn = e.target.closest('.org-selector-clear');
      if (clearBtn) {
        e.stopPropagation();
        clearSelection();
        return;
      }

      const toggle = e.target.closest('.org-toggle');
      if (toggle) {
        const row = toggle.closest('.org-node');
        const orgId = row?.dataset.orgId;
        if (orgId) {
          if (expandedIds.has(orgId)) expandedIds.delete(orgId);
          else expandedIds.add(orgId);
          render();
        }
        return;
      }

      const nameEl = e.target.closest('.org-name');
      if (nameEl) {
        const row = nameEl.closest('.org-node');
        const orgId = row?.dataset.orgId;
        if (orgId) {
          selectedValue = orgId;
          render();
          notifyChange();
        }
      }
    });
  }

  function clearSelection() {
    selectedValue = null;
    render();
    notifyChange();
  }

  function notifyChange() {
    if (typeof opts.onChange === 'function') {
      opts.onChange(selectedValue);
    }
  }

  function normalizeValue(value) {
    if (!value) return null;
    if (typeof value === 'string') return value.trim() || null;
    if (value.id) return String(value.id);
    return null;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return {
    getValue() {
      return selectedValue;
    },
    setValue(value) {
      selectedValue = normalizeValue(value);
      render();
      notifyChange();
    },
    clear() {
      clearSelection();
    },
    destroy() {
      container.innerHTML = '';
    },
  };
}
