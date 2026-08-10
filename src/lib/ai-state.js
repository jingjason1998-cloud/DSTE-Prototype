/**
 * 统一 AI 请求状态管理
 *
 * 解决多个 AI 组件中模块级 `_loading` / `_aiLoading` / `_isLoading`
 * 与 AbortController 分散、易竞态的问题。
 */

export class AiRequestState {
  constructor() {
    this.loading = false;
    this.abortController = null;
    this.error = null;
    this.lastRequestId = null;
    this._requestCount = 0;
  }

  /**
   * 开始一个新的 AI 请求。
   * 如果当前有进行中的请求，会先取消它（reason = 'new-request'）。
   * @returns {{ requestId: string, signal: AbortSignal }}
   */
  startRequest() {
    this.abortCurrent('new-request');
    this._requestCount += 1;
    const requestId = `ai_req_${Date.now()}_${this._requestCount}`;
    this.lastRequestId = requestId;
    this.loading = true;
    this.error = null;
    this.abortController = new AbortController();
    return { requestId, signal: this.abortController.signal };
  }

  /**
   * 取消当前进行中的请求。
   * @param {string} [reason='cancelled']
   */
  abortCurrent(reason = 'cancelled') {
    if (this.abortController) {
      try {
        this.abortController.abort(reason);
      } catch (_) {
        // ignore
      }
      this.abortController = null;
    }
  }

  /**
   * 结束当前请求。
   * @param {Error|null} [error]
   */
  finish(error = null) {
    this.loading = false;
    if (error) {
      this.error = error;
    }
    // 注意：这里不立即清空 abortController，因为调用方可能在 finally 中还需要检查
    // 但为防止内存泄漏，延迟到下一次 startRequest 时再复用/覆盖
  }

  /**
   * 完全重置状态（例如抽屉关闭时）。
   */
  reset() {
    this.abortCurrent('reset');
    this.loading = false;
    this.error = null;
    this.lastRequestId = null;
  }
}

export default AiRequestState;
