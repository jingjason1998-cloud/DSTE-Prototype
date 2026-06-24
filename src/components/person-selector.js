/**
 * 人员选择器组件
 * 支持单选/多选、异步搜索、键盘导航、回退到纯文本输入。
 */

const DEFAULT_OPTIONS = {
  placeholder: '搜索姓名、英文名、工号...',
  multiple: false,
  maxItems: 10,
  allowFreeText: true,
  searchDelay: 150,
};

/**
 * 创建人员选择器
 * @param {HTMLElement} container
 * @param {object} options
 * @param {string} options.placeholder
 * @param {boolean} options.multiple 是否多选
 * @param {number} options.maxItems 下拉最多显示条数
 * @param {boolean} options.allowFreeText 是否允许无匹配时回退为纯文本
 * @param {Function} options.onSearch 搜索函数：async (query) => [{ id, name, displayName, orgPath }]
 * @param {Function} options.onChange 选择变化回调：(value) => void
 * @param {Array|object|string} options.value 初始值
 */
export function createPersonSelector(container, options = {}) {
  if (!container) throw new Error('Person selector container is required');

  const opts = { ...DEFAULT_OPTIONS, ...options };
  let selected = normalizeInitialValue(opts.value, opts.multiple);
  let highlightedIndex = -1;
  let searchResults = [];
  let searchTimeout = null;
  let isOpen = false;
  let inputValue = '';

  render();
  bindEvents();

  function render() {
    container.innerHTML = `
      <div class="person-selector" data-person-selector="true">
        <div class="person-selector-input-wrap">
          <input type="text" class="person-selector-input" autocomplete="off" placeholder="${escapeAttr(opts.placeholder)}"
            value="${escapeAttr(getInputDisplayValue())}">
          <span class="person-selector-clear" style="display:${selected.length > 0 ? 'flex' : 'none'}">×</span>
        </div>
        <div class="person-selector-dropdown" style="display:none;"></div>
        <input type="hidden" class="person-selector-value">
      </div>
    `;
    updateHiddenInput();
    renderSelectedTags();
  }

  function getInputDisplayValue() {
    if (opts.multiple) return inputValue;
    if (selected.length === 0) return inputValue;
    return renderItemLabel(selected[0]);
  }

  function renderItemLabel(item) {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.displayName || item.name || String(item.id);
  }

  function escapeAttr(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderSelectedTags() {
    if (!opts.multiple) return;
    const wrap = container.querySelector('.person-selector-input-wrap');
    if (!wrap) return;

    // 移除已有 tags
    wrap.querySelectorAll('.person-selector-tag').forEach(el => el.remove());

    selected.forEach((item, idx) => {
      const tag = document.createElement('span');
      tag.className = 'person-selector-tag';
      tag.innerHTML = `${escapeAttr(renderItemLabel(item))} <span data-remove-idx="${idx}">×</span>`;
      wrap.insertBefore(tag, wrap.querySelector('.person-selector-input'));
    });

    const input = wrap.querySelector('.person-selector-input');
    if (input) input.placeholder = selected.length > 0 ? '' : opts.placeholder;
  }

  function renderDropdown() {
    const dropdown = container.querySelector('.person-selector-dropdown');
    if (!dropdown) return;

    if (!isOpen || searchResults.length === 0) {
      dropdown.style.display = 'none';
      return;
    }

    const limited = searchResults.slice(0, opts.maxItems);
    const itemsHtml = limited.map((item, idx) => {
      const label = escapeAttr(renderItemLabel(item));
      const org = item.orgPath ? ` · ${escapeAttr(item.orgPath)}` : '';
      const highlighted = idx === highlightedIndex ? ' highlighted' : '';
      return `<div class="person-selector-option${highlighted}" data-idx="${idx}" data-id="${escapeAttr(String(item.id || ''))}">
        <div class="person-selector-option-name">${label}</div>
        <div class="person-selector-option-org">${org}</div>
      </div>`;
    }).join('');

    dropdown.innerHTML = itemsHtml;
    dropdown.style.display = 'block';
  }

  function bindEvents() {
    const input = container.querySelector('.person-selector-input');
    const clearBtn = container.querySelector('.person-selector-clear');
    const dropdown = container.querySelector('.person-selector-dropdown');
    if (!input || !dropdown) return;

    input.addEventListener('focus', () => {
      isOpen = true;
      if (inputValue.trim()) doSearch(inputValue);
    });

    input.addEventListener('input', (e) => {
      inputValue = e.target.value;
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => doSearch(inputValue), opts.searchDelay);
    });

    input.addEventListener('keydown', (e) => {
      if (!isOpen) return;
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
          selectItem(searchResults[highlightedIndex]);
        } else if (opts.allowFreeText && inputValue.trim()) {
          selectFreeText(inputValue.trim());
        }
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    container.addEventListener('click', (e) => {
      const option = e.target.closest('.person-selector-option');
      if (option) {
        const idx = Number(option.dataset.idx);
        if (searchResults[idx]) selectItem(searchResults[idx]);
        return;
      }

      const remove = e.target.closest('[data-remove-idx]');
      if (remove) {
        const idx = Number(remove.dataset.removeIdx);
        removeSelected(idx);
        return;
      }

      if (e.target.classList.contains('person-selector-clear')) {
        clearSelection();
        return;
      }

      input.focus();
    });

    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) closeDropdown();
    });
  }

  async function doSearch(query) {
    if (!opts.onSearch) return;
    const q = query.trim();
    if (!q) {
      searchResults = [];
      highlightedIndex = -1;
      renderDropdown();
      return;
    }
    try {
      searchResults = await opts.onSearch(q);
      highlightedIndex = searchResults.length > 0 ? 0 : -1;
      renderDropdown();
    } catch (e) {
      console.warn('[person-selector] search failed:', e);
      searchResults = [];
      renderDropdown();
    }
  }

  function selectItem(item) {
    if (!item) return;
    const normalized = normalizeSelectedItem(item);

    if (opts.multiple) {
      if (!selected.some(s => s.id === normalized.id)) {
        selected.push(normalized);
      }
      inputValue = '';
    } else {
      selected = [normalized];
      inputValue = '';
    }

    closeDropdown();
    render();
    bindEvents();
    notifyChange();
  }

  function selectFreeText(text) {
    if (opts.multiple) {
      if (!selected.some(s => s.name === text)) {
        selected.push({ _freeText: true, name: text });
      }
    } else {
      selected = [{ _freeText: true, name: text }];
    }
    inputValue = '';
    closeDropdown();
    render();
    bindEvents();
    notifyChange();
  }

  function removeSelected(idx) {
    selected.splice(idx, 1);
    render();
    bindEvents();
    notifyChange();
  }

  function clearSelection() {
    selected = [];
    inputValue = '';
    render();
    bindEvents();
    notifyChange();
  }

  function closeDropdown() {
    isOpen = false;
    highlightedIndex = -1;
    searchResults = [];
    const dropdown = container.querySelector('.person-selector-dropdown');
    if (dropdown) dropdown.style.display = 'none';
  }

  function updateHiddenInput() {
    const hidden = container.querySelector('.person-selector-value');
    if (!hidden) return;
    hidden.value = JSON.stringify(opts.multiple ? selected : (selected[0] || null));
  }

  function notifyChange() {
    updateHiddenInput();
    if (typeof opts.onChange === 'function') {
      opts.onChange(opts.multiple ? selected : (selected[0] || null));
    }
  }

  // 对外 API
  return {
    getValue() {
      return opts.multiple ? selected : (selected[0] || null);
    },
    setValue(value) {
      selected = normalizeInitialValue(value, opts.multiple);
      inputValue = '';
      render();
      bindEvents();
      notifyChange();
    },
    clear() {
      clearSelection();
    },
  };
}

function normalizeInitialValue(value, multiple) {
  if (!value) return [];
  if (multiple) {
    const arr = Array.isArray(value) ? value : [value];
    return arr.map(normalizeSelectedItem).filter(Boolean);
  }
  const item = normalizeSelectedItem(value);
  return item ? [item] : [];
}

function normalizeSelectedItem(item) {
  if (!item) return null;
  if (typeof item === 'string') return { _legacy: true, name: item };
  if (item._legacy || item._freeText) return item;
  return {
    id: item.id,
    name: item.name,
    displayName: item.displayName || item.name,
    orgPath: item.orgPath || '',
  };
}
