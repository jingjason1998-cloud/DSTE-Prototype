/**
 * KMS Confluence 页面内容清洗工具
 * 将 Confluence body.storage HTML 转换为可读纯文本。
 */

/**
 * 清理 Confluence storage HTML，输出可读的纯文本
 * @param {string} html
 * @returns {string}
 */
export function cleanConfluenceHtml(html) {
  if (!html || typeof html !== 'string') return '';

  let text = html;

  // 1. 移除结构化宏（图片、表格、展开宏等）
  text = text.replace(/<ac:structured-macro[^>]*>[\s\S]*?<\/ac:structured-macro>/gi, '');

  // 2. 移除图片、附件、链接
  text = text.replace(/<ac:image[^>]*>[\s\S]*?<\/ac:image>/gi, '');
  text = text.replace(/<ri:attachment[^>]*\/>/gi, '');
  text = text.replace(/<ac:link[^>]*>[\s\S]*?<\/ac:link>/gi, '');

  // 3. 将常见块级/换行标签替换为换行，便于阅读
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n');
  text = text.replace(/<(table|blockquote|pre)[^>]*>/gi, '\n');

  // 4. 移除剩余 HTML 标签
  text = text.replace(/<[^>]+>/g, '');

  // 5. 解码 HTML 实体
  text = decodeHtmlEntities(text);

  // 6. 折叠多余空行
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * 截断长文本，保留语义完整性
 * @param {string} text
 * @param {number} max 默认 8000 字符
 * @returns {{ text: string, truncated: boolean }}
 */
export function truncateText(text, max = 8000) {
  if (!text || text.length <= max) {
    return { text: text || '', truncated: false };
  }
  // 截断到最近的段落边界
  let cut = text.lastIndexOf('\n\n', max);
  if (cut < max * 0.8) cut = text.lastIndexOf('\n', max);
  if (cut < 0) cut = max;
  return {
    text: text.slice(0, cut) + '\n\n[内容过长，已截断；如需深入，请直接访问 KMS 原文]',
    truncated: true,
  };
}

function decodeHtmlEntities(input) {
  const entityMap = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&ldquo;': '“',
    '&rdquo;': '”',
    '&lsquo;': '‘',
    '&rsquo;': '’',
    '&hellip;': '…',
    '&mdash;': '—',
    '&ndash;': '–',
    '&bull;': '•',
  };
  let text = input;
  Object.entries(entityMap).forEach(([entity, char]) => {
    text = text.split(entity).join(char);
  });
  // 处理数值实体
  text = text.replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(parseInt(dec, 10)));
  text = text.replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCharCode(parseInt(hex, 16)));
  return text;
}
