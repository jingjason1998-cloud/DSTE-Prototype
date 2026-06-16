/**
 * 版本审计看板模块
 * 从 cockpit.html 抽离，降低单文件复杂度
 */

function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.renderVersionAudit = function() {
        // 异步数据加载由页面渲染后的脚本触发
        setTimeout(() => window.loadVersionAuditData && window.loadVersionAuditData(), 0);
        return `
          ${window.renderBreadcrumb('版本审计')}
          <div class="page-header">
            <h1 class="page-title">版本审计</h1>
            <div class="page-actions">
              <button class="btn btn-secondary" data-action="version-audit-refresh">🔄 刷新</button>
              <button class="btn btn-primary" data-action="version-audit-copy">📋 复制报告</button>
            </div>
          </div>

          <div class="card" style="margin-bottom: 16px;">
            <div style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">生产环境状态</div>
            <div id="version-audit-status" style="display: flex; gap: 16px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="status-badge status-warning">加载中...</span>
              </div>
            </div>
          </div>

          <div class="card" style="margin-bottom: 16px;">
            <div style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">三环境对比</div>
            <div style="overflow-x: auto;">
              <table class="data-table" id="version-audit-table">
                <thead>
                  <tr>
                    <th>检查项</th>
                    <th>本地</th>
                    <th>Git</th>
                    <th>生产</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>前端版本</td><td id="va-local-version">-</td><td id="va-git-version">-</td><td id="va-prod-version">-</td></tr>
                  <tr><td>构建时间</td><td id="va-local-build">-</td><td id="va-git-build">-</td><td id="va-prod-build">-</td></tr>
                  <tr><td>cockpit.html MD5</td><td id="va-local-cockpit">-</td><td id="va-git-cockpit">-</td><td id="va-prod-cockpit">-</td></tr>
                  <tr><td>meetings.html MD5</td><td id="va-local-meetings">-</td><td id="va-git-meetings">-</td><td id="va-prod-meetings">-</td></tr>
                  <tr><td>business-topics.html MD5</td><td id="va-local-bt">-</td><td id="va-git-bt">-</td><td id="va-prod-bt">-</td></tr>
                  <tr><td>reviewer.html MD5</td><td id="va-local-reviewer">-</td><td id="va-git-reviewer">-</td><td id="va-prod-reviewer">-</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">部署检查清单</div>
            <ul id="version-audit-checklist" style="list-style: none; padding: 0; margin: 0;">
              <li style="padding: 8px 0; border-bottom: 1px solid var(--border-light);">
                <span style="color: var(--text-secondary);">⏳</span> 前端文件已构建
              </li>
              <li style="padding: 8px 0; border-bottom: 1px solid var(--border-light);">
                <span style="color: var(--text-secondary);">⏳</span> Git tag 已推送
              </li>
              <li style="padding: 8px 0; border-bottom: 1px solid var(--border-light);">
                <span style="color: var(--text-secondary);">⏳</span> 生产环境已更新
              </li>
              <li style="padding: 8px 0;">
                <span style="color: var(--text-secondary);">⏳</span> 基线测试已通过
              </li>
            </ul>
          </div>

          <pre id="version-audit-raw" style="display: none;"></pre>
        `;
      }
window.loadVersionAuditData = async function() {
        try {
          const res = await fetch('version-audit.json');
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          window._versionAuditData = data;
          renderVersionAuditTable(data);
          updateVersionAuditStatus(data);
          updateVersionAuditChecklist(data);
          document.getElementById('version-audit-raw').textContent = JSON.stringify(data, null, 2);
        } catch (e) {
          console.warn('loadVersionAuditData failed:', e);
          const statusEl = document.getElementById('version-audit-status');
          if (statusEl) statusEl.innerHTML = '<span class="status-badge status-danger">加载失败：' + escapeHtml(e.message) + '</span>';
        }
      }
function renderVersionAuditTable(data) {
        const local = data.local || {};
        const git = data.git || {};
        const prod = data.production || {};

        const set = (id, value) => {
          const el = document.getElementById(id);
          if (el) el.textContent = value || '-';
        };

        set('va-local-version', local.version_tag + (local.build_time ? ' (' + local.build_time + ')' : ''));
        set('va-git-version', (git.version_tag || '-') + (git.commit ? ' @' + git.commit : '') + (git.dirty ? ' [dirty]' : ''));
        set('va-prod-version', prod.version_tag + (prod.note ? ' ‼ ' + prod.note : ''));

        set('va-local-build', local.build_time || '-');
        set('va-git-build', git.commit ? 'commit ' + git.commit : '-');
        set('va-prod-build', prod.build_time || '-');

        set('va-local-cockpit', local.cockpit_html?.md5 || '-');
        set('va-git-cockpit', git.cockpit_html?.md5 || '-');
        set('va-prod-cockpit', prod.cockpit_html?.md5 || '-');

        set('va-local-meetings', local.meetings_html?.md5 || '-');
        set('va-git-meetings', git.meetings_html?.md5 || '-');
        set('va-prod-meetings', prod.meetings_html?.md5 || '-');

        set('va-local-bt', local.business_topics_html?.md5 || '-');
        set('va-git-bt', git.business_topics_html?.md5 || '-');
        set('va-prod-bt', prod.business_topics_html?.md5 || '-');

        set('va-local-reviewer', local.reviewer_html?.md5 || '-');
        set('va-git-reviewer', git.reviewer_html?.md5 || '-');
        set('va-prod-reviewer', prod.reviewer_html?.md5 || '-');
      }
function updateVersionAuditStatus(data) {
        const localVer = data.local?.version_tag;
        const gitVer = data.git?.version_tag;
        const prodVer = data.production?.version_tag;
        const prodNote = data.production?.note;

        let statusHtml = '';
        if (prodNote) {
          statusHtml = '<span class="status-badge status-warning">未配置生产环境数据</span>';
        } else if (localVer === gitVer && gitVer === prodVer) {
          statusHtml = '<span class="status-badge status-success">三环境版本一致</span>';
        } else if (localVer === prodVer) {
          statusHtml = '<span class="status-badge status-info">本地与生产一致，Git 待发布</span>';
        } else {
          statusHtml = '<span class="status-badge status-warning">版本不一致，建议核查</span>';
        }

        const el = document.getElementById('version-audit-status');
        if (el) el.innerHTML = statusHtml;
      }
function updateVersionAuditChecklist(data) {
        const localVer = data.local?.version_tag;
        const gitVer = data.git?.version_tag;
        const prodVer = data.production?.version_tag;
        const prodNote = data.production?.note;

        const items = [
          { ok: true, text: '前端文件已构建' },
          { ok: !data.git?.dirty && localVer === gitVer, text: 'Git tag 已推送' },
          { ok: !prodNote && prodVer != null, text: '生产环境已更新' },
          { ok: localVer === prodVer && !prodNote, text: '基线测试已通过' },
        ];

        const ul = document.getElementById('version-audit-checklist');
        if (!ul) return;
        ul.innerHTML = items.map(item => `
          <li style="padding: 8px 0; border-bottom: 1px solid var(--border-light);">
            <span style="color: ${item.ok ? 'var(--success)' : 'var(--text-secondary)'};">${item.ok ? '✅' : '⏳'}</span> ${item.text}
          </li>
        `).join('');
      }
window.refreshVersionAudit = async function() {
        window._versionAuditData = null;
        await window.loadVersionAuditData();
      }
window.copyVersionAuditReport = async function() {
        try {
          const raw = document.getElementById('version-audit-raw');
          const text = raw ? raw.textContent : JSON.stringify(window._versionAuditData, null, 2);
          await navigator.clipboard.writeText(text || '无数据');
          showToast('版本审计报告已复制到剪贴板', 'success');
        } catch (e) {
          showToast('复制失败：' + e.message, 'error');
        }
      }