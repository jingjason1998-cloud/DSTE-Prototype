/**
 * DSTE 图标渲染工具
 * 依赖 assets/js/phosphor-icons.js（由 scripts/build-icon-sprite.js 生成）
 */

import { getIconName } from './icon-mapping.js';
import { PHOSPHOR_ICONS } from './phosphor-icons.js';

/**
 * 渲染一个 SVG 图标
 * @param {string} key - DSTE 图标标识
 * @param {Object} options
 * @param {number} options.size - 图标尺寸（px）
 * @param {string} options.className - CSS 类名
 * @param {string} options.ariaLabel - 可访问性标签；为空时 aria-hidden
 * @returns {string} SVG HTML 字符串
 */
export function icon(key, options = {}) {
  const { size = '1em', className = 'icon', ariaLabel = '' } = options;
  const name = getIconName(key);
  const data = PHOSPHOR_ICONS[name];

  if (!data) {
    console.warn(`[DSTE Icons] Missing icon data: ${name} (key: ${key})`);
    return '';
  }

  const sizeValue = typeof size === 'number' ? `${size}px` : size;
  const ariaAttrs = ariaLabel
    ? `aria-label="${escapeHtml(ariaLabel)}" role="img"`
    : 'aria-hidden="true" role="presentation"';

  return `<svg class="${className}" style="width:${sizeValue};height:${sizeValue};" viewBox="${data.viewBox}" fill="currentColor" focusable="false" ${ariaAttrs}>${data.content}</svg>`;
}

/**
 * 创建一个 SVG 图标元素（DOM）
 * @param {string} key
 * @param {Object} options
 * @returns {SVGElement}
 */
export function iconElement(key, options = {}) {
  const wrapper = document.createElement('span');
  wrapper.innerHTML = icon(key, options);
  return wrapper.firstElementChild;
}

/**
 * 将静态 HTML 中的 `<span class="icon" data-icon="key" data-icon-size="18">`
 * 替换为对应的 SVG 图标。
 * 用于不便直接调用 icon() 的静态模板。
 * @param {HTMLElement|Document} root - 搜索根节点，默认 document
 */
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    const key = el.dataset.icon;
    const sizeAttr = el.dataset.iconSize;
    const size = sizeAttr ? parseInt(sizeAttr, 10) : '1em';
    const ariaLabel = el.getAttribute('aria-label') || '';
    const className = el.className.replace(/\s*data-icon-pending\s*/g, '').trim() || 'icon';
    el.innerHTML = icon(key, { size, className, ariaLabel });
    el.removeAttribute('data-icon');
    el.removeAttribute('data-icon-size');
  });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
