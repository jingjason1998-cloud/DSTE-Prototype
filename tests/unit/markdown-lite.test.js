import { describe, it, expect } from 'vitest';
import { escapeHtml, renderMarkdownLite } from '../../src/lib/markdown-lite.js';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<div class="a">\'&')).toBe('&lt;div class=&quot;a&quot;&gt;&#039;&amp;');
  });

  it('handles null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('renderMarkdownLite', () => {
  it('escapes raw HTML (XSS safe)', () => {
    const out = renderMarkdownLite('<script>alert(1)</script>');
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;');
  });

  it('escapes event-handler injection in text', () => {
    const out = renderMarkdownLite('<img src=x onerror=alert(1)>');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img');
  });

  it('renders bold and inline code', () => {
    const out = renderMarkdownLite('这是 **重点** 和 `code`');
    expect(out).toContain('<strong>重点</strong>');
    expect(out).toContain('<code>code</code>');
  });

  it('renders italic', () => {
    const out = renderMarkdownLite('这是 *斜体* 文本');
    expect(out).toContain('<em>斜体</em>');
  });

  it('renders headings', () => {
    expect(renderMarkdownLite('# 标题')).toContain('<h1>标题</h1>');
    expect(renderMarkdownLite('### 小节')).toContain('<h3>小节</h3>');
  });

  it('renders unordered list', () => {
    const out = renderMarkdownLite('- 第一项\n- 第二项');
    expect(out).toContain('<ul>');
    expect(out).toContain('<li>第一项</li>');
    expect(out).toContain('<li>第二项</li>');
  });

  it('renders ordered list', () => {
    const out = renderMarkdownLite('1. 第一步\n2. 第二步');
    expect(out).toContain('<ol>');
    expect(out).toContain('<li>第一步</li>');
    expect(out).toContain('<li>第二步</li>');
  });

  it('renders paragraphs and line breaks', () => {
    const out = renderMarkdownLite('第一段\n第二行\n\n第二段');
    expect(out).toContain('<p>第一段<br>第二行</p>');
    expect(out).toContain('<p>第二段</p>');
  });

  it('renders mixed content in order', () => {
    const out = renderMarkdownLite('## 分析\n**结论**:营收未达标\n- 原因一\n- 原因二');
    expect(out.indexOf('<h2>分析</h2>')).toBeLessThan(out.indexOf('<strong>结论</strong>'));
    expect(out.indexOf('<strong>结论</strong>')).toBeLessThan(out.indexOf('<ul>'));
  });

  it('plain text passes through unchanged in a paragraph', () => {
    expect(renderMarkdownLite('根据当前数据,Q1 营收达标')).toBe('<p>根据当前数据,Q1 营收达标</p>');
  });

  it('does not treat a single asterisk as italic', () => {
    const out = renderMarkdownLite('公式 a * b 的结果');
    expect(out).not.toContain('<em>');
  });

  it('returns empty string for empty input', () => {
    expect(renderMarkdownLite('')).toBe('');
  });
});
