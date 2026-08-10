/**
 * 带重试的 fetch 封装
 *
 * - 指数退避 + 随机抖动
 * - 默认重试 HTTP 408/429/502/503/504 与网络错误（TypeError）
 * - 不重试 401/403、显式取消（AbortError 且 signal 已 abort）
 */

function isRetryableStatus(status, retryOn) {
  return retryOn.includes(status);
}

function isRetryableError(err, retryOnError) {
  const name = err?.name || '';
  return retryOnError.some((n) => name === n);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} url
 * @param {RequestInit} [options]
 * @param {Object} [retryOptions]
 * @param {number} [retryOptions.retries=2]
 * @param {number} [retryOptions.retryDelay=500]
 * @param {number[]} [retryOptions.retryOn=[408, 429, 502, 503, 504]]
 * @param {string[]} [retryOptions.retryOnError=['TypeError']]
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(
  url,
  options = {},
  {
    retries = 2,
    retryDelay = 500,
    retryOn = [408, 429, 502, 503, 504],
    retryOnError = ['TypeError'],
  } = {},
) {
  const signal = options.signal;
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) {
      throw new Error(signal.reason || 'Aborted');
    }

    try {
      const resp = await fetch(url, options);

      if (resp.ok || !isRetryableStatus(resp.status, retryOn)) {
        return resp;
      }

      lastError = new Error(`HTTP ${resp.status}`);
      lastError.status = resp.status;
      lastError.response = resp;
    } catch (err) {
      // 如果 signal 是调用方主动取消的，不再重试
      if (signal?.aborted || err.name === 'AbortError') {
        throw err;
      }

      if (!isRetryableError(err, retryOnError)) {
        throw err;
      }

      lastError = err;
    }

    if (attempt < retries) {
      const delay = retryDelay * 2 ** attempt + Math.random() * 300;
      await sleep(Math.min(delay, 10000));
    }
  }

  throw lastError || new Error('Request failed after retries');
}

export default fetchWithRetry;
