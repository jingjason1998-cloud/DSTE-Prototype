/**
 * 人员输入增强组件
 * 为现有 <input> 添加人员搜索与选择能力，不破坏原表单结构。
 */

import { searchEmployees, normalizePerson, renderPerson, hasEmployeeData } from '../lib/employee-directory.js';

const DEFAULT_OPTIONS = {
  placeholder: '搜索姓名、英文名、工号...',
  maxItems: 10,
  searchDelay: 150,
  allowFreeText: true,
  onChange: null,
};

/**
 * 增强一个 input 元素，使其支持人员选择
 * @param {HTMLInputElement} input
 * @param {object} options
 * @returns {{getValue: () => object|null, setValue: (value) => void, destroy: () => void}}
 */
export function enhancePersonInput(input, options = {}) {
  if (!input || input.tagName !== 'INPUT') throw new Error('enhancePersonInput requires an input element');

  const opts = { ...DEFAULT_OPTIONS, ...options };
  let selectedValue = normalizeValue(options.value);
  let searchResults = [];
  let highlightedIndex = -1;
  let searchTimeout = null;
  let dropdown = null;
  let isComposing = false;

  setupInput();
  createDropdown();
  bindEvents();
  syncInputDisplay();

  function setupInput() {
    input.setAttribute('autocomplete', 'off');
    if (opts.placeholder) input.setAttribute('placeholder', opts.placeholder);
    input.dataset.personInput = 'true';
  }

  function createDropdown() {
    dropdown = document.createElement('div');
    dropdown.className = 'person-input-dropdown';
    dropdown.style.cssText = 'display:none;position:absolute;z-index:10000;background:var(--bg-card,#fff);border:1px solid var(--border-color);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.12);max-height:280px;overflow-y:auto;min-width:240px;';
    input.parentNode.style.position = 'relative';
    input.parentNode.insertBefore(dropdown, input.nextSibling);
  }

  function bindEvents() {
    input.addEventListener('focus', () => {
      if (input.value.trim()) doSearch(input.value.trim());
    });

    input.addEventListener('input', () => {
      if (isComposing) return;
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => doSearch(input.value.trim()), opts.searchDelay);
    });

    input.addEventListener('compositionstart', () => { isComposing = true; });
    input.addEventListener('compositionend', () => {
      isComposing = false;
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => doSearch(input.value.trim()), opts.searchDelay);
    });

    input.addEventListener('keydown', (e) => {
      if (dropdown.style.display === 'none') {
        if (e.key === 'Enter' && opts.allowFreeText) {
          selectFreeText(input.value.trim());
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightedIndex = Math.min(highlightedIndex + 1, searchResults.length - 1);
        renderDropdown();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightedIndex = Math.max(highlightedIndex - 1, 0);
        renderDropdown();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
          selectEmployee(searchResults[highlightedIndex]);
        } else if (opts.allowFreeText && input.value.trim()) {
          selectFreeText(input.value.trim());
        }
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    input.addEventListener('blur', () => {
      // 延迟关闭，以便点击下拉选项
      setTimeout(() => {
        if (!dropdown.matches(':hover')) {
          closeDropdown();
          syncInputDisplay();
        }
      }, 150);
    });

    dropdown.addEventListener('mousedown', (e) => {
      e.preventDefault(); // 防止触发 input blur 导致下拉关闭
      const option = e.target.closest('[data-idx]');
      if (option) {
        const idx = Number(option.dataset.idx);
        if (searchResults[idx]) selectEmployee(searchResults[idx]);
      }
    });

    document.addEventListener('click', (e) => {
      if (!input.parentNode.contains(e.target)) closeDropdown();
    });
  }

  async function doSearch(query) {
    if (!query) {
      closeDropdown();
      return;
    }
    try {
      searchResults = await searchEmployees(query, opts.maxItems);
      highlightedIndex = searchResults.length > 0 ? 0 : -1;
      renderDropdown();
    } catch (e) {
      console.warn('[person-input] search failed:', e);
      searchResults = [];
      closeDropdown();
    }
  }

  function renderDropdown() {
    if (searchResults.length === 0) {
      if (!hasEmployeeData()) {
        dropdown.innerHTML = `<div style="padding:10px 12px;font-size:12px;color:var(--text-muted);">暂无人员数据，请先到「系统管理 → 人员与组织管理」导入</div>`;
        dropdown.style.display = 'block';
        positionDropdown();
      } else {
        dropdown.style.display = 'none';
      }
      return;
    }

    dropdown.innerHTML = searchResults.map((emp, idx) => {
      const highlighted = idx === highlightedIndex ? 'background:var(--bg-hover);' : '';
      const label = escapeHtml(emp.displayName || emp.name);
      const org = emp.orgPath ? ` · ${escapeHtml(emp.orgPath)}` : '';
      return `<div data-idx="${idx}" style="padding:8px 12px;cursor:pointer;${highlighted}"
        onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
        <div style="font-size:13px;color:var(--text-primary);">${label}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">工号 ${escapeHtml(emp.id)}${org}</div>
      </div>`;
    }).join('');

    dropdown.style.display = 'block';
    positionDropdown();
  }

  function positionDropdown() {
    dropdown.style.top = `${input.offsetTop + input.offsetHeight + 2}px`;
    dropdown.style.left = `${input.offsetLeft}px`;
    dropdown.style.width = `${input.offsetWidth}px`;
  }

  function selectEmployee(emp) {
    selectedValue = {
      id: emp.id,
      name: emp.name,
      displayName: emp.displayName || emp.name,
      orgPath: emp.orgPath || '',
    };
    syncInputDisplay();
    closeDropdown();
    notifyChange();
  }

  function selectFreeText(text) {
    selectedValue = { _freeText: true, name: text };
    syncInputDisplay();
    closeDropdown();
    notifyChange();
  }

  function closeDropdown() {
    searchResults = [];
    highlightedIndex = -1;
    if (dropdown) dropdown.style.display = 'none';
  }

  function syncInputDisplay() {
    input.value = selectedValue ? renderPerson(selectedValue) : '';
  }

  function notifyChange() {
    if (typeof opts.onChange === 'function') {
      opts.onChange(selectedValue);
    }
  }

  function normalizeValue(value) {
    if (!value) return null;
    if (typeof value === 'string') {
      const normalized = normalizePerson(value);
      return normalized || { _freeText: true, name: value };
    }
    if (value.id || value._freeText || value._legacy) return value;
    return null;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const api = {
    getValue() {
      return selectedValue;
    },
    setValue(value) {
      selectedValue = normalizeValue(value);
      syncInputDisplay();
      notifyChange();
    },
    destroy() {
      if (dropdown && dropdown.parentNode) dropdown.parentNode.removeChild(dropdown);
      input.removeAttribute('data-person-input');
    },
  };

  input._personInputApi = api;
  return api;
}

/**
 * 便捷函数：从 input 的当前值获取 PersonRef
 * 如果 input 已被 enhancePersonInput 增强，则返回其选中值；否则返回原始字符串。
 * @param {HTMLInputElement} input
 * @returns {object|string|null}
 */
export function getPersonInputValue(input) {
  if (!input) return null;
  const enhanced = input._personInputApi;
  if (enhanced) return enhanced.getValue();
  return input.value.trim() || null;
}
