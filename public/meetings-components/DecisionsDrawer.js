window._decisionsFilter = 'all';
window._decisionsSearch = '';

function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

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

  const decisionItems = (window._meetingsData || [])
    .flatMap(m => (m.decisions || []).map(d => ({ ...d, meetingTitle: m.title, meetingId: m.id })));

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

  container.innerHTML = '';

  const buttonsRow = document.createElement('div');
  buttonsRow.style.cssText = 'display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;';
  filterButtons.forEach(f => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = f.label;
    const active = window._decisionsFilter === f.key;
    btn.style.cssText = `padding: 4px 10px; font-size: 12px; border: 1px solid ${active ? 'var(--primary)' : 'var(--border-color)'}; border-radius: 4px; background: ${active ? 'var(--primary-light)' : 'var(--bg-page)'}; color: ${active ? 'var(--primary)' : 'var(--text-secondary)'}; cursor: pointer;`;
    btn.onclick = () => filterDecisions(f.key);
    buttonsRow.appendChild(btn);
  });
  container.appendChild(buttonsRow);

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align: center; color: var(--text-tertiary); padding: 40px 0;';
    empty.textContent = '🔍 未找到匹配决议';
    container.appendChild(empty);
    return;
  }

  filtered.forEach(d => {
    const color = statusColors[d.status] || 'var(--text-tertiary)';
    const label = statusLabels[d.status] || escapeHtml(d.status);
    const icon = statusIcons[d.status] || '⏳';

    const card = document.createElement('div');
    card.style.cssText = `padding: 14px; background: var(--bg-page); border-radius: 8px; margin-bottom: 12px; border-left: 3px solid ${color};`;

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;';

    const content = document.createElement('span');
    content.style.cssText = 'font-size: 13px; font-weight: 600; color: var(--text-primary);';
    content.textContent = d.content || '';

    const badge = document.createElement('span');
    badge.style.cssText = `font-size: 11px; padding: 2px 8px; border-radius: 4px; background: ${color}15; color: ${color};`;
    badge.textContent = `${icon} ${label}`;

    header.appendChild(content);
    header.appendChild(badge);
    card.appendChild(header);

    const meta = document.createElement('div');
    meta.style.cssText = 'display: flex; align-items: center; gap: 12px; font-size: 12px; color: var(--text-tertiary); flex-wrap: wrap;';

    const deadline = document.createElement('span');
    deadline.textContent = `📅 ${d.deadline || '未设置'}`;
    meta.appendChild(deadline);

    const owner = document.createElement('span');
    owner.textContent = `👤 ${d.owner || '待定'}`;
    meta.appendChild(owner);

    const meetingLink = document.createElement('span');
    meetingLink.style.cssText = 'cursor: pointer; color: var(--primary);';
    meetingLink.textContent = `📋 ${d.meetingTitle || ''}`;
    meetingLink.onclick = () => { closeDecisionsDrawer(); openMeetingDetail(d.meetingId); };
    meta.appendChild(meetingLink);

    if (d.kmsUrl) {
      const kmsLink = document.createElement('a');
      kmsLink.href = d.kmsUrl;
      kmsLink.target = '_blank';
      kmsLink.style.cssText = 'color: var(--primary); text-decoration: none;';
      kmsLink.textContent = '🔗 KMS';
      meta.appendChild(kmsLink);
    }

    card.appendChild(meta);
    container.appendChild(card);
  });
}
