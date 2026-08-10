/**
 * AI Telemetry
 *
 * 记录 AI 请求的延迟、错误、模型等信息，用于 prompt 迭代和稳定性观测。
 * - 开发环境：console.log
 * - 生产环境：批量 POST 到 /api/ai/log
 */

import { Storage } from './utils.js';

const BATCH_KEY = 'dste_ai_telemetry_batch';
const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 30 * 1000;

let _flushTimer = null;
let _isFlushing = false;

function isDev() {
  return typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
}

function getBatch() {
  try {
    return Storage.get(BATCH_KEY, []);
  } catch (e) {
    return [];
  }
}

function setBatch(batch) {
  try {
    Storage.set(BATCH_KEY, batch);
  } catch (e) {
    // ignore
  }
}

async function flush() {
  if (_isFlushing) return;
  const batch = getBatch();
  if (batch.length === 0) return;

  _isFlushing = true;
  try {
    const resp = await fetch('/api/ai/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
    });
    if (resp.ok) {
      setBatch([]);
    } else {
      console.warn('[AI Telemetry] flush failed:', resp.status);
    }
  } catch (err) {
    console.warn('[AI Telemetry] flush error:', err);
  } finally {
    _isFlushing = false;
  }
}

function scheduleFlush() {
  if (_flushTimer) return;
  _flushTimer = setTimeout(() => {
    _flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

/**
 * 记录一个 AI 事件。
 * @param {Object} event
 * @param {string} event.type - 'chat' | 'agenda' | 'tool' | 'error'
 * @param {string} event.model
 * @param {string} event.endpoint
 * @param {number} [event.latencyMs]
 * @param {string} [event.errorCode]
 * @param {number} [event.tokenCount]
 */
export function logAiEvent(event) {
  if (!event || !event.type) return;

  const entry = {
    ...event,
    timestamp: Date.now(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };

  if (isDev()) {
    console.log('[AI-Telemetry]', entry);
    return;
  }

  const batch = getBatch();
  batch.push(entry);
  setBatch(batch);

  if (batch.length >= BATCH_SIZE) {
    flush();
  } else {
    scheduleFlush();
  }
}

export function flushAiTelemetry() {
  return flush();
}

export default { logAiEvent, flushAiTelemetry };
