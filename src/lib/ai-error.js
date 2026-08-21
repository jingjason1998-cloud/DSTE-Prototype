/**
 * 标准 AI 错误类
 *
 * 统一 AI 调用过程中各类错误的 code，方便上层根据类型做不同处理：
 * - AUTH_EXPIRED: 登录过期，触发重新登录
 * - TIMEOUT: 请求超时
 * - NETWORK: 网络错误
 * - RATE_LIMIT: 限流
 * - SERVER: 服务端错误（5xx）
 * - VALIDATION: 输出格式校验失败
 */

export class AIError extends Error {
  constructor(message, { code, status, retryable = false, cause = null, errorType = null, upstreamStatus = null } = {}) {
    super(message);
    this.name = 'AIError';
    this.code = code || 'UNKNOWN';
    this.status = status;
    this.retryable = retryable;
    this.cause = cause;
    // RFC-011：Worker 透传的上游错误分类（auth/ratelimit/invalid_request/upstream/timeout/internal）
    this.errorType = errorType;
    this.upstreamStatus = upstreamStatus;

    if (code === 'AUTH_EXPIRED') {
      this.authExpired = true;
    }
  }

  static authExpired(message = '登录已过期，请重新登录') {
    return new AIError(message, { code: 'AUTH_EXPIRED' });
  }

  static timeout(message = 'AI 请求超时') {
    return new AIError(message, { code: 'TIMEOUT', retryable: true });
  }

  static network(message = '网络错误', { cause } = {}) {
    return new AIError(message, { code: 'NETWORK', retryable: true, cause });
  }

  static rateLimit(message = 'AI 服务限流，请稍后重试') {
    return new AIError(message, { code: 'RATE_LIMIT', retryable: true });
  }

  static server(message = 'AI 服务异常', { status, cause } = {}) {
    return new AIError(message, { code: 'SERVER', status, retryable: true, cause });
  }

  static validation(message = 'AI 输出格式校验失败') {
    return new AIError(message, { code: 'VALIDATION' });
  }
}

/**
 * 把 AI 错误映射为对用户可操作的提示（RFC-011）。
 * 优先按 Worker 透传的 errorType 分类，回退到 code/HTTP 状态。
 */
export function getAiErrorUserMessage(err) {
  const errorType = err?.errorType;
  switch (errorType) {
    case 'auth':
      return 'AI 服务鉴权失效，请联系管理员检查模型 API Key';
    case 'ratelimit':
      return 'AI 服务繁忙（限流），请稍后重试';
    case 'invalid_request':
      return '会话内容异常，已自动开启新会话，请重试';
    case 'upstream':
      return 'AI 服务响应异常，请稍后重试';
    case 'timeout':
      return 'AI 服务响应超时，请重试';
    default:
      break;
  }
  if (err?.code === 'TIMEOUT') return 'AI 服务响应超时，请重试';
  if (err?.code === 'RATE_LIMIT') return 'AI 服务繁忙（限流），请稍后重试';
  if (err?.code === 'NETWORK') return '网络连接异常，请检查网络后重试';
  if (err?.code === 'AUTH_EXPIRED') return err.message || '登录已过期，请重新登录';
  return `AI 服务暂时不可用：${err?.message || '未知错误'}，请稍后重试`;
}

export default AIError;
