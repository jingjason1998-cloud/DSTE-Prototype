/**
 * KMS 知识库前端接入
 *
 * 简化版：通过后端 /api/ai/kms-search 搜索 KMS 页面片段，
 * 将片段注入 AI 上下文作为相关知识库引用。
 */

import { getAIGatewayUrl } from './ai-client.js';

/**
 * 搜索 KMS
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function searchKms(query, limit = 3) {
  try {
    const baseUrl = getAIGatewayUrl().replace(/\/$/, '');
    const resp = await fetch(`${baseUrl}/api/ai/kms-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.snippets || [];
  } catch (err) {
    console.warn('[KMS] search failed:', err.message);
    return [];
  }
}

/**
 * 将 KMS 片段格式化为 AI 上下文文本
 * @param {Array} snippets
 * @returns {string}
 */
export function formatKmsSnippets(snippets) {
  if (!Array.isArray(snippets) || snippets.length === 0) return '';
  return snippets
    .map((s, idx) => `\n[${idx + 1}] ${s.title}\n来源：${s.url}\n${s.content || ''}`)
    .join('\n---\n');
}

/**
 * 将 KMS 片段注入消息列表（作为 system prompt 补充）
 * @param {Array} messages
 * @param {Array} snippets
 * @returns {Array}
 */
export function injectKmsSnippets(messages, snippets) {
  if (!snippets || snippets.length === 0) return messages;

  const snippetText = formatKmsSnippets(snippets);
  const injected = `### 相关知识库片段\n${snippetText}\n\n请基于以上知识库片段回答，并标注引用来源。`;

  // 找到 system 消息并追加；没有则新建
  const hasSystem = messages.some((m) => m.role === 'system');
  if (hasSystem) {
    return messages.map((m) => {
      if (m.role === 'system') {
        return { ...m, content: `${m.content}\n\n${injected}` };
      }
      return m;
    });
  }

  return [{ role: 'system', content: injected }, ...messages];
}
