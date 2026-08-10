import { describe, it, expect } from 'vitest';
import { AIError } from '../../src/lib/ai-error.js';

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
