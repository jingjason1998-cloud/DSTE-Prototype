import { describe, it, expect } from 'vitest';
import { AIError, getAiErrorUserMessage } from '../../src/lib/ai-error.js';

describe('AIError', () => {
  it('creates generic error with code', () => {
    const err = new AIError('boom', { code: 'TEST', status: 500, retryable: true });
    expect(err.message).toBe('boom');
    expect(err.code).toBe('TEST');
    expect(err.status).toBe(500);
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('AIError');
  });

  it('authExpired sets authExpired flag', () => {
    const err = AIError.authExpired();
    expect(err.code).toBe('AUTH_EXPIRED');
    expect(err.authExpired).toBe(true);
  });

  it('factory methods set expected codes', () => {
    expect(AIError.timeout().code).toBe('TIMEOUT');
    expect(AIError.network().code).toBe('NETWORK');
    expect(AIError.rateLimit().code).toBe('RATE_LIMIT');
    expect(AIError.server().code).toBe('SERVER');
    expect(AIError.validation().code).toBe('VALIDATION');
  });
});

describe('getAiErrorUserMessage (RFC-011)', () => {
  it('maps Worker errorType to actionable messages', () => {
    expect(getAiErrorUserMessage(new AIError('x', { errorType: 'auth' }))).toContain('鉴权失效');
    expect(getAiErrorUserMessage(new AIError('x', { errorType: 'ratelimit' }))).toContain('限流');
    expect(getAiErrorUserMessage(new AIError('x', { errorType: 'invalid_request' }))).toContain('新会话');
    expect(getAiErrorUserMessage(new AIError('x', { errorType: 'upstream' }))).toContain('响应异常');
    expect(getAiErrorUserMessage(new AIError('x', { errorType: 'timeout' }))).toContain('超时');
  });

  it('falls back to code when errorType missing', () => {
    expect(getAiErrorUserMessage(AIError.timeout())).toContain('超时');
    expect(getAiErrorUserMessage(AIError.rateLimit())).toContain('限流');
    expect(getAiErrorUserMessage(AIError.network())).toContain('网络');
  });

  it('falls back to generic message for unknown errors', () => {
    expect(getAiErrorUserMessage(new Error('boom'))).toContain('boom');
  });
});
