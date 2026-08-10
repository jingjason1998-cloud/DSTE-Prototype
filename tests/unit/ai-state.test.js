import { describe, it, expect, vi } from 'vitest';
import { AiRequestState } from '../../src/lib/ai-state.js';

describe('AiRequestState', () => {
  it('starts in idle state', () => {
    const state = new AiRequestState();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.lastRequestId).toBeNull();
  });

  it('startRequest returns signal and sets loading', () => {
    const state = new AiRequestState();
    const { signal, requestId } = state.startRequest();
    expect(state.loading).toBe(true);
    expect(requestId).toMatch(/^ai_req_/);
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it('abortCurrent cancels active request', () => {
    const state = new AiRequestState();
    const { signal } = state.startRequest();
    state.abortCurrent('test');
    expect(signal.aborted).toBe(true);
  });

  it('startRequest aborts previous request', () => {
    const state = new AiRequestState();
    const { signal: first } = state.startRequest();
    state.startRequest();
    expect(first.aborted).toBe(true);
  });

  it('finish clears loading and stores error', () => {
    const state = new AiRequestState();
    state.startRequest();
    state.finish(new Error('x'));
    expect(state.loading).toBe(false);
    expect(state.error?.message).toBe('x');
  });

  it('reset aborts and clears state', () => {
    const state = new AiRequestState();
    const { signal } = state.startRequest();
    state.reset();
    expect(signal.aborted).toBe(true);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });
});
