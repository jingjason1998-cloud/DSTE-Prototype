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
  constructor(message, { code, status, retryable = false, cause = null } = {}) {
    super(message);
    this.name = 'AIError';
    this.code = code || 'UNKNOWN';
    this.status = status;
    this.retryable = retryable;
    this.cause = cause;

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

export default AIError;
