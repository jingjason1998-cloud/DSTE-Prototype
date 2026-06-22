/**
 * Report Asset Manager Renderer
 * 报表资产注册表：渲染、添加、更新、删除、关联议程。
 */

import { getReportAssets, saveReportAssets } from '../utils/helpers.js';

function openReportAssetManager(agendaIdx) {
  window._reportAssetAgendaIdx = typeof agendaIdx === 'number' ? agendaIdx : null;
  renderReportAssetManager();
  const ov = document.getElementById('report-asset-manager-overlay');
  if (ov) ov.style.display = 'flex';
}

function closeReportAssetManager() {
  const ov = document.getElementById('report-asset-manager-overlay');
  if (ov) ov.style.display = 'none';
  window._reportAssetAgendaIdx = null;
}

function renderReportAssetManager() {
  const container = document.getElementById('report-asset-manager-list');
  if (!container) return;
  const assets = getReportAssets();
  const ids = Object.keys(assets);
  const agendaIdx = window._reportAssetAgendaIdx;
  const selectedIds = new Set();
  if (agendaIdx !== null && window._meetingEditData?.agenda_items?.[agendaIdx]) {
    (window._meetingEditData.agenda_items[agendaIdx].data_views || []).forEach(id => selectedIds.add(id));
  }
  container.innerHTML = ids.length === 0
    ? '<div style="padding: 16px; text-align: center; color: var(--text-secondary); font-size: 13px;">暂无注册报表，请添加第一条报表资产</div>'
    : ids.map(id => {
        const a = assets[id];
        const isSelected = selectedIds.has(id);
        return `
          <div style="padding: 12px; background: var(--bg-page); border-radius: 8px; margin-bottom: 8px; border: 1px solid ${isSelected ? 'var(--primary)' : 'var(--border-light)'};">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <input type="text" value="${a.name || ''}" onchange="updateReportAsset('${id}', 'name', this.value)" placeholder="报表名称" style="flex: 1; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary);" />
              <select onchange="updateReportAsset('${id}', 'type', this.value)" style="width: 90px; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary);">
                <option value="fr" ${a.type === 'fr' ? 'selected' : ''}>FR</option>
                <option value="bi" ${a.type === 'bi' ? 'selected' : ''}>BI</option>
                <option value="external" ${a.type === 'external' ? 'selected' : ''}>外部</option>
              </select>
              ${agendaIdx !== null ? `<button type="button" onclick="toggleReportAssetSelection('${id}')" style="padding: 4px 10px; font-size: 11px; border: 1px solid ${isSelected ? 'var(--danger)' : 'var(--primary)'}; border-radius: 4px; background: ${isSelected ? 'rgba(245,34,45,0.08)' : 'var(--primary-light)'}; color: ${isSelected ? 'var(--danger)' : 'var(--primary)'}; cursor: pointer;">${isSelected ? '移除' : '关联'}</button>` : ''}
              <button type="button" onclick="deleteReportAsset('${id}')" style="padding: 4px 10px; font-size: 11px; border: 1px solid var(--danger); border-radius: 4px; background: rgba(245,34,45,0.08); color: var(--danger); cursor: pointer;">删除</button>
            </div>
            <div style="display: flex; gap: 8px;">
              <input type="text" value="${a.url || ''}" onchange="updateReportAsset('${id}', 'url', this.value)" placeholder="报表 URL" style="flex: 1; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary);" />
              <input type="text" value="${a.owner || ''}" onchange="updateReportAsset('${id}', 'owner', this.value)" placeholder="责任人" style="width: 100px; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary);" />
            </div>
          </div>
        `;
      }).join('');
}

function addReportAsset() {
  const assets = getReportAssets();
  const id = 'ra_' + Date.now();
  assets[id] = { id, name: '', type: 'fr', url: '', owner: '', business_domain: '', meeting_scenarios: [], update_frequency: 'daily', created_at: new Date().toISOString() };
  saveReportAssets(assets);
  renderReportAssetManager();
}

function updateReportAsset(id, field, value) {
  const assets = getReportAssets();
  if (!assets[id]) return;
  assets[id][field] = value;
  saveReportAssets(assets);
}

function deleteReportAsset(id) {
  if (!confirm('确定删除该报表资产吗？')) return;
  const assets = getReportAssets();
  delete assets[id];
  saveReportAssets(assets);
  renderReportAssetManager();
}

function toggleReportAssetSelection(id) {
  const agendaIdx = window._reportAssetAgendaIdx;
  if (agendaIdx === null || !window._meetingEditData?.agenda_items?.[agendaIdx]) return;
  const item = window._meetingEditData.agenda_items[agendaIdx];
  if (!Array.isArray(item.data_views)) item.data_views = [];
  const idx = item.data_views.indexOf(id);
  if (idx > -1) item.data_views.splice(idx, 1);
  else item.data_views.push(id);
  renderReportAssetManager();
  if (typeof window.renderAgendaList === 'function') window.renderAgendaList();
}

// ---- window shim ----
window.openReportAssetManager = openReportAssetManager;
window.closeReportAssetManager = closeReportAssetManager;
window.addReportAsset = addReportAsset;
window.updateReportAsset = updateReportAsset;
window.deleteReportAsset = deleteReportAsset;
window.toggleReportAssetSelection = toggleReportAssetSelection;

export {
  openReportAssetManager,
  closeReportAssetManager,
  renderReportAssetManager,
  addReportAsset,
  updateReportAsset,
  deleteReportAsset,
  toggleReportAssetSelection,
};
