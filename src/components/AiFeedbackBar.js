/**
 * AI 回复反馈条
 *
 * 在每条助手消息下方渲染 👍/👎，记录到 localStorage 供后续 prompt 迭代。
 */

import { Storage } from '../lib/utils.js';

const FEEDBACK_KEY = 'dste_ai_feedback_v1';

function generatePromptHash(prompt) {
  let hash = 0;
  const str = String(prompt || '');
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}`;
}

function saveFeedback(entry) {
  try {
    const list = Storage.get(FEEDBACK_KEY, []);
    list.unshift(entry);
    Storage.set(FEEDBACK_KEY, list.slice(0, 500));
  } catch (e) {
    console.warn('[AiFeedbackBar] save failed:', e);
  }
}

function createButton(emoji, title, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = emoji;
  btn.title = title;
  btn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:13px;padding:2px 4px;opacity:0.6;';
  btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
  btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.6'; });
  btn.addEventListener('click', onClick);
  return btn;
}

/**
 * 在指定消息元素下方渲染反馈条。
 * @param {HTMLElement} messageEl - 助手消息 DOM 元素
 * @param {Object} meta
 * @param {string} [meta.sessionId]
 * @param {string} [meta.messageId]
 * @param {string} [meta.prompt] - 用于生成 promptHash 的原始提示文本
 */
export function renderAiFeedbackBar(messageEl, { sessionId = '', messageId = '', prompt = '' } = {}) {
  if (!messageEl || messageEl.querySelector('.dste-ai-feedback-bar')) return;

  const bar = document.createElement('div');
  bar.className = 'dste-ai-feedback-bar';
  bar.style.cssText = 'display:flex;gap:6px;margin-top:4px;justify-content:flex-end;';

  const promptHash = generatePromptHash(prompt);

  function record(rating) {
    saveFeedback({
      messageId,
      sessionId,
      promptHash,
      rating,
      timestamp: Date.now(),
    });
    bar.innerHTML = `<span style="font-size:11px;color:var(--text-tertiary);">已反馈</span>`;
  }

  bar.appendChild(createButton('👍', '有用', () => record('up')));
  bar.appendChild(createButton('👎', '无用', () => record('down')));
  messageEl.appendChild(bar);
}

export { FEEDBACK_KEY, generatePromptHash };
export default renderAiFeedbackBar;
