/**
 * markdown-lite — 轻量 Markdown 渲染器
 *
 * 用于 AI 回复内容渲染(对标 Kimi 网页版排版):
 * - 第一步全量 escapeHtml,防 XSS
 * - 支持:# ~ #### 标题、- / * / • 无序列表、1. 有序列表、
 *   **加粗**、*斜体*、`行内代码`、段落与换行
 * - 不引第三方库,纯字符串处理
 */

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderInline(escapedText) {
  return escapedText
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
}

export function renderMarkdownLite(text) {
  const escaped = escapeHtml(text);
  const lines = escaped.split('\n');

  let html = '';
  let listType = null; // 'ul' | 'ol' | null
  let paraOpen = false;

  const closeList = () => {
    if (listType) {
      html += listType === 'ul' ? '</ul>' : '</ol>';
      listType = null;
    }
  };
  const closePara = () => {
    if (paraOpen) {
      html += '</p>';
      paraOpen = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      closePara();
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      closePara();
      const level = heading[1].length;
      html += `<h${level}>${renderInline(heading[2])}</h${level}>`;
      continue;
    }

    const ulItem = trimmed.match(/^[-*•]\s+(.*)$/);
    if (ulItem) {
      closePara();
      if (listType !== 'ul') {
        closeList();
        html += '<ul>';
        listType = 'ul';
      }
      html += `<li>${renderInline(ulItem[1])}</li>`;
      continue;
    }

    const olItem = trimmed.match(/^\d+[.、)]\s*(.*)$/);
    if (olItem) {
      closePara();
      if (listType !== 'ol') {
        closeList();
        html += '<ol>';
        listType = 'ol';
      }
      html += `<li>${renderInline(olItem[1])}</li>`;
      continue;
    }

    closeList();
    if (!paraOpen) {
      html += '<p>';
      paraOpen = true;
    } else {
      html += '<br>';
    }
    html += renderInline(trimmed);
  }

  closeList();
  closePara();
  return html;
}
