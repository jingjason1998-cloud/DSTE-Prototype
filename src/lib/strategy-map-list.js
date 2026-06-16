import {
  MapConfigStore,
  ObjectiveStore,
  LinkStore,
  MAP_STATUS_CONFIG,
  mapStatusText,
  DIM_CONFIG,
  DEFAULT_MAP_ID
} from './strategy-map-data.js';

/**
 * 战略地图列表页逻辑
 */

// ========== 状态 ==========
const state = {
  maps: [],
  filterStatus: '',
  filterCycle: '',
  search: '',
  deletingId: null,
  pendingPresentation: null,
};

// ========== DOM 引用 ==========
const els = {
  grid: document.getElementById('mapListGrid'),
  empty: document.getElementById('emptyState'),
  stats: {
    total: document.getElementById('statTotal'),
    approved: document.getElementById('statApproved'),
    draft: document.getElementById('statDraft'),
  },
  searchInput: document.getElementById('searchInput'),
  filterStatus: document.getElementById('filterStatus'),
  filterCycle: document.getElementById('filterCycle'),
  mapModal: document.getElementById('mapModal'),
  mapModalTitle: document.getElementById('mapModalTitle'),
  deleteModal: document.getElementById('deleteModal'),
  deleteMapName: document.getElementById('deleteMapName'),
  deleteObjCount: document.getElementById('deleteObjCount'),
  deleteLinkCount: document.getElementById('deleteLinkCount'),
  form: {
    id: document.getElementById('mapModalId'),
    name: document.getElementById('mapModalName'),
    dept: document.getElementById('mapModalDept'),
    deptName: document.getElementById('mapModalDeptName'),
    startYear: document.getElementById('mapModalStartYear'),
    endYear: document.getElementById('mapModalEndYear'),
    status: document.getElementById('mapModalStatus'),
    versionLabel: document.getElementById('mapModalVersionLabel'),
    description: document.getElementById('mapModalDesc'),
    source: document.getElementById('mapModalSource'),
    presentationUrl: document.getElementById('mapModalPresentationUrl'),
    presentationFile: document.getElementById('mapModalPresentationFile'),
    presentationBtn: document.getElementById('mapModalPresentationBtn'),
    presentationName: document.getElementById('mapModalPresentationName'),
  },
  toast: document.getElementById('toast'),
};

// ========== 初始化 ==========
function init() {
  loadMaps();
  bindEvents();
  render();
}

function loadMaps() {
  state.maps = MapConfigStore.getAll();
  populateCycleFilter();
}

function populateCycleFilter() {
  const cycles = new Set(state.maps.map(m => `${m.cycle.startYear}-${m.cycle.endYear}`));
  const current = els.filterCycle.value;
  els.filterCycle.innerHTML = '<option value="">全部周期</option>' +
    Array.from(cycles).sort().map(c => `<option value="${c}">${c}</option>`).join('');
  els.filterCycle.value = current;
}

// ========== 渲染 ==========
function getFilteredMaps() {
  return state.maps
    .filter(m => !state.filterStatus || m.status === state.filterStatus)
    .filter(m => {
      if (!state.filterCycle) return true;
      const cycle = `${m.cycle.startYear}-${m.cycle.endYear}`;
      return cycle === state.filterCycle;
    })
    .filter(m => {
      if (!state.search) return true;
      const term = state.search.toLowerCase();
      return (m.name || '').toLowerCase().includes(term) ||
             (m.description || '').toLowerCase().includes(term) ||
             (m.deptName || '').toLowerCase().includes(term);
    })
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

function render() {
  const filtered = getFilteredMaps();
  renderStats();

  if (filtered.length === 0) {
    els.grid.style.display = 'none';
    els.empty.style.display = 'block';
    return;
  }

  els.grid.style.display = 'grid';
  els.empty.style.display = 'none';
  els.grid.innerHTML = filtered.map(map => renderMapCard(map)).join('');
}

function renderStats() {
  els.stats.total.textContent = state.maps.length;
  els.stats.approved.textContent = state.maps.filter(m => m.status === 'approved').length;
  els.stats.draft.textContent = state.maps.filter(m => m.status === 'draft').length;
}

function renderMapCard(map) {
  const statusCfg = MAP_STATUS_CONFIG[map.status] || MAP_STATUS_CONFIG.draft;
  const cycle = `${map.cycle.startYear}-${map.cycle.endYear}`;
  const dimCounts = getDimensionCounts(map.id);
  const isDefault = map.id === DEFAULT_MAP_ID;
  const updatedAt = formatDate(map.updatedAt);

  const hasSource = !!(map.source || '').trim();
  const hasPresentationUrl = !!(map.presentation?.url || '').trim();
  const hasPresentationFile = !!(map.presentation?.fileName && map.presentation?.fileData);

  return `
    <div class="sm-map-card ${map.status === 'archived' ? 'archived' : ''}" data-id="${map.id}" data-action="view-map">
      <div class="sm-map-card-header">
        <div class="sm-map-card-title">
          <span class="icon">🗺️</span>
          <span>${escapeHtml(map.name)}</span>
        </div>
        <div class="sm-map-card-actions">
          <button class="btn-icon" title="查看" data-action="view-map" data-id="${map.id}">👁</button>
          <button class="btn-icon" title="编辑" data-action="edit-map" data-id="${map.id}">✏️</button>
          <button class="btn-icon danger" title="删除" data-action="delete-map" data-id="${map.id}" ${isDefault ? 'disabled' : ''}>🗑</button>
        </div>
      </div>
      <div class="sm-map-card-meta">
        <span class="status-badge ${statusCfg.badgeClass}"><span class="dot" style="background:${statusCfg.dot}"></span>${mapStatusText(map.status)}</span>
        <span>📅 ${cycle}</span>
        <span>🏢 ${escapeHtml(map.deptName || '未指定部门')}</span>
        <span>🔖 ${escapeHtml(map.versionLabel || `v${map.version || 1}`)}</span>
      </div>
      <div class="sm-map-card-desc">${escapeHtml(map.description || '暂无描述')}</div>
      <div class="sm-map-card-links">
        ${hasSource ? `<a class="sm-map-link" href="${escapeHtml(map.source)}" target="_blank" rel="noopener" data-action="link">🔗 KMS 链接</a>` : ''}
        ${hasPresentationUrl ? `<a class="sm-map-link" href="${escapeHtml(map.presentation.url)}" target="_blank" rel="noopener" data-action="link">📎 宣贯 PPT</a>` : ''}
        ${hasPresentationFile ? `<a class="sm-map-link" href="${escapeHtml(map.presentation.fileData)}" download="${escapeHtml(map.presentation.fileName)}" data-action="link">📎 ${escapeHtml(map.presentation.fileName)}</a>` : ''}
      </div>
      <div class="sm-map-card-footer">
        <div class="sm-map-card-dims">
          <span>💰 财务(${dimCounts.fin})</span>
          <span>🤝 客户(${dimCounts.cus})</span>
          <span>⚙️ 内部(${dimCounts.int})</span>
          <span>📚 学习(${dimCounts.lea})</span>
        </div>
        <div>更新于 ${updatedAt}</div>
      </div>
    </div>
  `;
}

function getDimensionCounts(mapId) {
  const objectives = ObjectiveStore.load(mapId);
  const counts = { fin: 0, cus: 0, int: 0, lea: 0 };
  objectives.forEach(o => {
    if (counts[o.dim] !== undefined) counts[o.dim] += 1;
  });
  return counts;
}

// ========== 事件绑定 ==========
function bindEvents() {
  // 搜索
  els.searchInput.addEventListener('input', (e) => {
    state.search = e.target.value.trim();
    render();
  });

  // 筛选
  els.filterStatus.addEventListener('change', (e) => {
    state.filterStatus = e.target.value;
    render();
  });
  els.filterCycle.addEventListener('change', (e) => {
    state.filterCycle = e.target.value;
    render();
  });

  // 事件委托
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    // 卡片操作按钮阻止冒泡，避免触发卡片查看
    if (['view-map', 'edit-map', 'delete-map'].includes(action)) {
      e.stopPropagation();
    }

    // 链接直接跳转，不触发卡片查看
    if (action === 'link') {
      return;
    }

    switch (action) {
      case 'new-map':
        openMapModal();
        break;
      case 'view-map':
        viewMap(id);
        break;
      case 'edit-map':
        openMapModal(id);
        break;
      case 'delete-map':
        openDeleteModal(id);
        break;
      case 'close-map-modal':
        closeMapModal();
        break;
      case 'save-map':
        saveMapModal();
        break;
      case 'close-delete-modal':
        closeDeleteModal();
        break;
      case 'confirm-delete':
        confirmDelete();
        break;
      case 'remove-presentation-file':
        e.preventDefault();
        e.stopPropagation();
        removePresentationFile();
        break;
      case 'refresh':
        loadMaps();
        render();
        showToast('已刷新', 'success');
        break;
    }
  });

  // 弹窗关闭：点击遮罩
  els.mapModal.addEventListener('click', (e) => {
    if (e.target === els.mapModal) closeMapModal();
  });
  els.deleteModal.addEventListener('click', (e) => {
    if (e.target === els.deleteModal) closeDeleteModal();
  });

  // 宣贯 PPT 文件上传
  els.form.presentationBtn.addEventListener('click', () => {
    els.form.presentationFile.click();
  });
  els.form.presentationFile.addEventListener('change', handlePresentationFileChange);
}

// ========== 地图弹窗 ==========
function openMapModal(id = null) {
  const isEdit = !!id;
  els.mapModalTitle.textContent = isEdit ? '编辑战略地图' : '新建战略地图';
  const map = isEdit ? MapConfigStore.get(id) : null;

  els.form.id.value = id || '';
  els.form.name.value = map?.name || '';
  els.form.dept.value = map?.dept || '';
  els.form.deptName.value = map?.deptName || '';
  els.form.startYear.value = map?.cycle?.startYear ?? 2025;
  els.form.endYear.value = map?.cycle?.endYear ?? 2027;
  els.form.status.value = map?.status || 'draft';
  els.form.versionLabel.value = map?.versionLabel || '';
  els.form.description.value = map?.description || '';
  els.form.source.value = map?.source || '';
  els.form.presentationUrl.value = map?.presentation?.url || '';
  state.pendingPresentation = map?.presentation ? { ...map.presentation } : { url: '', fileName: '', fileData: '' };
  renderPresentationUploadName();

  els.mapModal.classList.add('open');
}

function closeMapModal() {
  els.mapModal.classList.remove('open');
  state.pendingPresentation = null;
}

function renderPresentationUploadName() {
  const p = state.pendingPresentation;
  if (!p) {
    els.form.presentationName.textContent = '';
    return;
  }
  if (p.fileName) {
    els.form.presentationName.innerHTML = `已上传: <strong>${escapeHtml(p.fileName)}</strong> (${formatFileSize(p.fileData)}) <button type="button" class="btn-link" data-action="remove-presentation-file" style="margin-left:8px;color:var(--danger);">移除</button>`;
  } else {
    els.form.presentationName.textContent = '';
  }
}

function formatFileSize(base64) {
  if (!base64) return '0 B';
  const bytes = Math.ceil(base64.length * 0.75);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function handlePresentationFileChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast('PPT 文件过大，请上传 5MB 以内文件', 'error');
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.pendingPresentation = {
      url: els.form.presentationUrl.value.trim(),
      fileName: file.name,
      fileData: reader.result
    };
    renderPresentationUploadName();
    showToast('PPT 已读取', 'success');
  };
  reader.onerror = () => {
    showToast('读取文件失败', 'error');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function removePresentationFile() {
  state.pendingPresentation = {
    url: els.form.presentationUrl.value.trim(),
    fileName: '',
    fileData: ''
  };
  renderPresentationUploadName();
}

function saveMapModal() {
  try {
    const id = els.form.id.value.trim();
    const name = els.form.name.value.trim();
    const dept = els.form.dept.value.trim();
    const deptName = els.form.deptName.value.trim();
    const startYear = parseInt(els.form.startYear.value, 10);
    const endYear = parseInt(els.form.endYear.value, 10);
    const status = els.form.status.value;
    const versionLabel = els.form.versionLabel.value.trim();
    const description = els.form.description.value.trim();
    const source = els.form.source.value.trim();
    const presentationUrl = els.form.presentationUrl.value.trim();
    const presentation = state.pendingPresentation || { url: '', fileName: '', fileData: '' };

    if (!name) {
      showToast('请输入地图名称', 'error');
      return;
    }
    if (Number.isNaN(startYear) || Number.isNaN(endYear) || endYear < startYear) {
      showToast('规划周期不合法', 'error');
      return;
    }

    const payloadPresentation = {
      url: presentationUrl || presentation.url || '',
      fileName: presentation.fileName || '',
      fileData: presentation.fileData || ''
    };

    if (id) {
      const existing = MapConfigStore.get(id);
      MapConfigStore.save({
        ...existing,
        id,
        name,
        dept,
        deptName,
        cycle: { startYear, endYear },
        status,
        versionLabel,
        description,
        source,
        presentation: payloadPresentation,
      });
      showToast('地图已更新', 'success');
    } else {
      MapConfigStore.create({
        name,
        dept,
        deptName,
        cycle: { startYear, endYear },
        status,
        versionLabel,
        description,
        source,
        presentation: payloadPresentation,
      });
      showToast('地图已创建', 'success');
    }

    closeMapModal();
    loadMaps();
    render();
  } catch (err) {
    showToast(err.message || '保存失败', 'error');
  }
}

// ========== 删除弹窗 ==========
function openDeleteModal(id) {
  const map = MapConfigStore.get(id);
  if (!map) return;
  if (id === DEFAULT_MAP_ID) {
    showToast('默认地图不可删除', 'error');
    return;
  }
  state.deletingId = id;
  els.deleteMapName.textContent = map.name;
  els.deleteObjCount.textContent = ObjectiveStore.load(id).length;
  els.deleteLinkCount.textContent = LinkStore.load(id).length;
  els.deleteModal.classList.add('open');
}

function closeDeleteModal() {
  state.deletingId = null;
  els.deleteModal.classList.remove('open');
}

function confirmDelete() {
  if (!state.deletingId) return;
  const ok = MapConfigStore.delete(state.deletingId);
  closeDeleteModal();
  if (ok) {
    showToast('地图已删除', 'success');
    loadMaps();
    render();
  } else {
    showToast('删除失败', 'error');
  }
}

// ========== 查看地图 ==========
function viewMap(id) {
  MapConfigStore.setCurrentId(id);
  window.location.href = `strategy-map.html?id=${encodeURIComponent(id)}`;
}

// ========== 工具函数 ==========
function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'success') {
  const el = document.createElement('div');
  const bg = type === 'error' ? '#ef4444' : (type === 'warning' ? '#f59e0b' : '#22c55e');
  el.style.cssText = `
    background: ${bg}; color: #fff; padding: 10px 16px; border-radius: 8px;
    font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideIn 0.25s ease;
  `;
  el.textContent = message;
  els.toast.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    el.style.transition = 'all 0.25s ease';
    setTimeout(() => el.remove(), 250);
  }, 3000);
}

// 启动
init();
