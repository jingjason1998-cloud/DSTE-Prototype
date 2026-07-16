import { describe, it, expect } from 'vitest';
import { cleanConfluenceHtml, truncateText } from '../../api-worker/kms-utils.js';

describe('cleanConfluenceHtml', () => {
  it('removes ac:structured-macro blocks', () => {
    const html = `
      <h1>标题</h1>
      <ac:structured-macro ac:name="info">
        <ac:rich-text-body><p>提示内容</p></ac:rich-text-body>
      </ac:structured-macro>
      <p>正文</p>
    `;
    expect(cleanConfluenceHtml(html)).toContain('标题');
    expect(cleanConfluenceHtml(html)).toContain('正文');
    expect(cleanConfluenceHtml(html)).not.toContain('提示内容');
  });

  it('removes ac:image and ri:attachment', () => {
    const html = `
      <p>前文</p>
      <ac:image ac:height="200">
        <ri:attachment ri:filename="chart.png" />
      </ac:image>
      <p>后文</p>
    `;
    const text = cleanConfluenceHtml(html);
    expect(text).toContain('前文');
    expect(text).toContain('后文');
    expect(text).not.toContain('chart.png');
  });

  it('removes ac:link blocks', () => {
    const html = `<p>详见 <ac:link><ri:page ri:content-title="目标页面" /></ac:link> 了解详情。</p>`;
    const text = cleanConfluenceHtml(html);
    expect(text).toContain('详见');
    expect(text).toContain('了解详情');
    expect(text).not.toContain('目标页面');
  });

  it('converts br/p/h tags to newlines', () => {
    const html = `<h2>第一章</h2><p>第一段<br/>换行</p><h3>第二节</h3>`;
    const text = cleanConfluenceHtml(html);
    expect(text).toContain('第一章');
    expect(text).toContain('第一段');
    expect(text).toContain('换行');
    expect(text).toContain('第二节');
  });

  it('decodes common HTML entities', () => {
    const html = `<p>&nbsp;&ldquo;中文引号&rdquo; &mdash; &hellip;&nbsp;</p>`;
    const text = cleanConfluenceHtml(html);
    expect(text).toContain('“中文引号”');
    expect(text).toContain('—');
    expect(text).toContain('…');
    expect(text).not.toContain('&nbsp;');
  });

  it('collapses excessive blank lines', () => {
    const html = `<p>第一段</p>



<p>第二段</p>


<p>第三段</p>`;
    const text = cleanConfluenceHtml(html);
    expect(text.split('\n').length).toBeLessThanOrEqual(6);
    expect(text).toContain('第一段');
    expect(text).toContain('第二段');
    expect(text).toContain('第三段');
  });

  it('handles empty or non-string input', () => {
    expect(cleanConfluenceHtml('')).toBe('');
    expect(cleanConfluenceHtml(null)).toBe('');
    expect(cleanConfluenceHtml(undefined)).toBe('');
  });
});

describe('truncateText', () => {
  it('does not truncate short text', () => {
    const { text, truncated } = truncateText('短文本', 100);
    expect(text).toBe('短文本');
    expect(truncated).toBe(false);
  });

  it('truncates long text at paragraph boundary when possible', () => {
    const longText = 'A\n\n' + 'B'.repeat(5000) + '\n\n' + 'C'.repeat(5000);
    const { text, truncated } = truncateText(longText, 4000);
    expect(truncated).toBe(true);
    expect(text.length).toBeLessThanOrEqual(4000 + 200);
    expect(text).toContain('A');
    expect(text).not.toContain('C'.repeat(100));
    expect(text).toContain('[内容过长，已截断');
  });

  it('truncates at line boundary if paragraph boundary is too far', () => {
    const longText = 'A\n' + 'B'.repeat(6000) + '\n' + 'C'.repeat(6000);
    const { text, truncated } = truncateText(longText, 4000);
    expect(truncated).toBe(true);
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain('[内容过长，已截断');
  });
});
