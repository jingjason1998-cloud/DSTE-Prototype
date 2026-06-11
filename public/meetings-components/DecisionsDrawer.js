window._decisionsFilter = 'all';
window._decisionsSearch = '';
window.openDecisionsDrawer = function() {
  const overlay = document.getElementById('decisions-overlay');
  const drawer = document.getElementById('decisions-drawer');
  if (overlay) overlay.style.display = 'block';
  if (drawer) drawer.style.display = 'flex';
  window._decisionsFilter = 'all';
  window._decisionsSearch = '';
  renderDecisionsList();
};
window.closeDecisionsDrawer = function() {
  const overlay = document.getElementById('decisions-overlay');
  const drawer = document.getElementById('decisions-drawer');
  if (overlay) overlay.style.display = 'none';
  if (drawer) drawer.style.display = 'none';
};
window.filterDecisions = function(status) {
  window._decisionsFilter = status;
  renderDecisionsList();
};
window.searchDecisions = function(keyword) {
  window._decisionsSearch = keyword.trim().toLowerCase();
  renderDecisionsList();
};
function renderDecisionsList() {
  const container = document.getElementById('decisions-list');
  if (!container) return;
  const decisionItems = (window._meetingsData || []).flatMap(m => (m.decisions || []).map(d => ({ ...d, meetingTitle: m.title, meetingId: m.id })));
  let filtered = decisionItems;
  if (window._decisionsFilter !== 'all') {
    filtered = filtered.filter(d => d.status === window._decisionsFilter);
  }
  if (window._decisionsSearch) {
    filtered = filtered.filter(d =>
      (d.content || '').toLowerCase().includes(window._decisionsSearch) ||
      (d.owner || '').toLowerCase().includes(window._decisionsSearch) ||
      (d.meetingTitle || '').toLowerCase().includes(window._decisionsSearch)
    );
  }
  const statusLabels = { approved: '已批准', implemented: '已执行', pending: '待审批', rejected: '已驳回' };
  const statusColors = { approved: 'var(--success)', implemented: 'var(--success)', pending: 'var(--warning)', rejected: 'var(--danger)' };
  const statusIcons = { approved: '✅', implemented: '✅', pending: '⏳', rejected: '❌' };
  const filterButtons = [
    { key: 'all', label: '全部' },
    { key: 'implemented', label: '已执行' },
    { key: 'approved', label: '已批准' },
    { key: 'pending', label: '待审批' },
    { key: 'rejected', label: '已驳回' }
  ];
  container.innerHTML = `
    <div style="display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;">
      ${filterButtons.map(f => `
        <button type="button" onclick="filterDecisions('${f.key}')" style="padding: 4px 10px; font-size: 12px; border: 1px solid ${window._decisionsFilter === f.key ? 'var(--primary)' : 'var(--border-color)'}; border-radius: 4px; background: ${window._decisionsFilter === f.key ? 'var(--primary-light)' : 'var(--bg-page)'}; color: ${window._decisionsFilter === f.key ? 'var(--primary)' : 'var(--text-secondary)'}; cursor: pointer;">${f.label}</button>
      `).join('')}
    </div>
    ${filtered.length === 0 ? '<div style="text-align: center; color: var(--text-tertiary); padding: 40px 0;">🔍 未找到匹配决议</div>' : filtered.map(d => `
      <div style="padding: 14px; background: var(--bg-page); border-radius: 8px; margin-bottom: 12px; border-left: 3px solid ${statusColors[d.status] || 'var(--text-tertiary)'};">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${d.content}</span>
          <span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: ${statusColors[d.status] || 'var(--text-tertiary)'}15; color: ${statusColors[d.status] || 'var(--text-tertiary)'};">${statusIcons[d.status] || '⏳'} ${statusLabels[d.status] || d.status}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; font-size: 12px; color: var(--text-tertiary); flex-wrap: wrap;">
          <span>📅 ${d.deadline || '未设置'}</span>
          <span>👤 ${d.owner || '待定'}</span>
          <span style="cursor: pointer; color: var(--primary);" onclick="closeDecisionsDrawer(); openMeetingDetail('${d.meetingId}')">📋 ${d.meetingTitle}</span>
          ${d.kmsUrl ? `<a href="${d.kmsUrl}" target="_blank" style="color: var(--primary); text-decoration: none;">🔗 KMS</a>` : ''}
        </div>
      </div>
    `).join('')}
  `;
}
