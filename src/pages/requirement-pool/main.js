/**
 * 需求管理中心 — 页面主逻辑
 */

import { showToast } from '../../lib/utils.js';
import {
  loadRequirements,
  loadRemoteRequirements,
  saveRequirements,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  getRequirementById,
  transitionStatus,
  addReview,
  clearCache,
  REQUIREMENT_STATUS,
  REQUIREMENT_TYPES,
  REQUIREMENT_SOURCES,
  DSTE_MODULES
} from './requirement-store.js';
import {
  renderPage,
  renderRequirementForm,
  renderRequirementDetail,
  renderTransitionForm,
  renderDashboard,
  renderTable,
  renderPagination,
  escapeHtml
} from './requirement-renderer.js';
import {
  analyzeRequirement,
  generateAnalysisSummary
} from './requirement-ai.js';

const DEFAULT_PAGE_SIZE = 20;

const state = {
  activeTab: 'pool',
  filters: {
    keyword: '',
    status: 'all',
    type: 'all',
    source: 'all',
    priority: 'all',
    module: 'all'
  },
  sort: { field: 'createdAt', direction: 'desc' },
  pagination: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 },
  editingId: null,
  detailId: null,
  deleteId: null,
  transition: null
};

let allRequirements = [];

async function init() {
  await loadRemoteRequirements();
  allRequirements = loadRequirements();
  bindEvents();
  render();
}

function render() {
  const container = document.getElementById('req-page-container');
  if (!container) return;

  const filtered = getFilteredRequirements();
  const total = filtered.length;
  const { page, pageSize } = state.pagination;
  state.pagination.total = total;

  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  container.innerHTML = renderPage(state, allRequirements, pageItems, state.pagination);
  bindFilterInputs();
}

function getFilteredRequirements() {
  const { filters, sort } = state;
  let result = [...allRequirements];

  if (state.activeTab === 'recycle') {
    result = result.filter(r => r.status === 'REJECTED' || r.status === 'SUSPENDED');
  } else if (state.activeTab === 'mine') {
    const user = getCurrentUserName();
    result = result.filter(r =>
      r.reporter === user ||
      r.productOwner === user ||
      r.techOwner === user ||
      r.createdBy === user
    );
  } else {
    result = result.filter(r => r.status !== 'REJECTED' && r.status !== 'SUSPENDED');
  }

  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase();
    result = result.filter(r =>
      (r.title || '').toLowerCase().includes(kw) ||
      (r.description || '').toLowerCase().includes(kw) ||
      (r.reqCode || '').toLowerCase().includes(kw) ||
      (r.reporter || '').toLowerCase().includes(kw)
    );
  }

  if (filters.status !== 'all') {
    result = result.filter(r => r.status === filters.status);
  }
  if (filters.type !== 'all') {
    result = result.filter(r => r.type === filters.type);
  }
  if (filters.source !== 'all') {
    result = result.filter(r => r.source === filters.source);
  }
  if (filters.priority !== 'all') {
    result = result.filter(r => r.priority === filters.priority);
  }
  if (filters.module !== 'all') {
    result = result.filter(r => (r.affectedModules || []).includes(filters.module));
  }

  result.sort((a, b) => {
    const dir = sort.direction === 'asc' ? 1 : -1;
    if (sort.field === 'priority') {
      const order = { P0: 4, P1: 3, P2: 2, P3: 1 };
      return ((order[a.priority] || 0) - (order[b.priority] || 0)) * dir;
    }
    if (sort.field === 'createdAt') {
      return (new Date(a.createdAt) - new Date(b.createdAt)) * dir;
    }
    return (a[sort.field] || '').localeCompare(b[sort.field] || '') * dir;
  });

  return result;
}

function bindEvents() {
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('submit', handleFormSubmit);
  document.addEventListener('keydown', handleKeydown);
}

function bindFilterInputs() {
  const keywordInput = document.getElementById('req-filter-keyword');
  if (keywordInput) {
    keywordInput.addEventListener('input', debounce((e) => {
      state.filters.keyword = e.target.value;
      state.pagination.page = 1;
      render();
    }, 300));
  }
}

function handleDocumentClick(e) {
  const btn = e.target.closest('[data-req-action]');
  if (!btn) return;

  const action = btn.dataset.reqAction;
  const id = btn.dataset.reqId;

  switch (action) {
    case 'new-requirement':
      openFormModal();
      break;
    case 'edit-requirement':
      openFormModal(id);
      break;
    case 'view-detail':
      openDetailModal(id);
      break;
    case 'close-form-modal':
      closeFormModal();
      break;
    case 'close-detail-modal':
      closeDetailModal();
      break;
    case 'close-delete-modal':
      closeDeleteModal();
      break;
    case 'close-transition-modal':
      closeTransitionModal();
      break;
    case 'switch-tab':
      state.activeTab = btn.dataset.tab;
      state.pagination.page = 1;
      render();
      break;
    case 'change-page':
      state.pagination.page = parseInt(btn.dataset.page, 10);
      render();
      break;
    case 'filter-status':
    case 'filter-type':
    case 'filter-source':
    case 'filter-priority':
    case 'filter-module':
      handleFilterChange(action, btn.dataset.value || btn.value);
      break;
    case 'reset-filters':
      resetFilters();
      break;
    case 'confirm-delete':
      openDeleteModal(id);
      break;
    case 'transition-status':
      openTransitionModal(id, btn.dataset.nextStatus);
      break;
    case 'ai-analyze':
      analyzeWithAI(btn);
      break;
    case 'export-data':
      exportData();
      break;
  }
}

function handleFilterChange(action, value) {
  const map = {
    'filter-status': 'status',
    'filter-type': 'type',
    'filter-source': 'source',
    'filter-priority': 'priority',
    'filter-module': 'module'
  };
  const key = map[action];
  if (key) {
    state.filters[key] = value;
    state.pagination.page = 1;
    render();
  }
}

function resetFilters() {
  state.filters = {
    keyword: '',
    status: 'all',
    type: 'all',
    source: 'all',
    priority: 'all',
    module: 'all'
  };
  state.pagination.page = 1;
  render();
}

function handleFormSubmit(e) {
  const form = e.target.closest('#req-form');
  if (!form) return;
  e.preventDefault();

  const formData = new FormData(form);
  const data = {
    title: (formData.get('title') || '').trim(),
    type: formData.get('type'),
    source: formData.get('source'),
    priority: formData.get('priority'),
    affectedModules: formData.getAll('affectedModules'),
    targetVersion: (formData.get('targetVersion') || '').trim(),
    roadmapPhase: (formData.get('roadmapPhase') || '').trim(),
    productOwner: (formData.get('productOwner') || '').trim(),
    techOwner: (formData.get('techOwner') || '').trim(),
    reporter: (formData.get('reporter') || '').trim(),
    reporterDept: (formData.get('reporterDept') || '').trim(),
    problem: (formData.get('problem') || '').trim(),
    value: (formData.get('value') || '').trim(),
    description: (formData.get('description') || '').trim(),
    acceptanceCriteria: (formData.get('acceptanceCriteria') || '').trim(),
    businessValue: parseInt(formData.get('businessValue'), 10) || null,
    technicalEffort: parseInt(formData.get('technicalEffort'), 10) || null,
    urgency: parseInt(formData.get('urgency'), 10) || null
  };

  if (!data.title) {
    showToast('请填写需求标题', 'warning');
    return;
  }
  if (!data.affectedModules.length) {
    showToast('请至少选择一个影响模块', 'warning');
    return;
  }

  try {
    const id = form.dataset.reqId;
    if (id) {
      updateRequirement(id, data);
      showToast('需求已更新', 'success');
    } else {
      createRequirement(data);
      showToast('需求已创建', 'success');
    }
    closeFormModal();
    refreshData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    closeFormModal();
    closeDetailModal();
    closeDeleteModal();
    closeTransitionModal();
  }
}

function analyzeWithAI(btn) {
  const titleInput = document.getElementById('req-form-title-input');
  const descriptionInput = document.getElementById('req-form-description');
  const summaryEl = document.getElementById('req-ai-summary');

  const title = (titleInput?.value || '').trim();
  const description = (descriptionInput?.value || '').trim();

  if (!title) {
    showToast('请先填写需求标题，AI 需要基于标题和描述分析', 'warning');
    titleInput?.focus();
    return;
  }

  // 显示分析中状态
  if (summaryEl) {
    summaryEl.style.display = 'block';
    summaryEl.innerHTML = '<span class="req-ai-analyzing">AI 正在分析需求</span>';
  }
  btn.disabled = true;
  btn.textContent = '🤖 分析中...';

  // 模拟 AI 分析耗时
  setTimeout(() => {
    try {
      const suggestions = analyzeRequirement(title, description);
      fillAIFormSuggestions(suggestions);

      if (summaryEl) {
        summaryEl.innerHTML = `<strong>AI 分析结论：</strong>${escapeHtml(generateAnalysisSummary(suggestions))}`;
      }
      showToast('AI 分析完成，请检查并调整建议', 'success');
    } catch (err) {
      console.error('AI analyze failed:', err);
      if (summaryEl) {
        summaryEl.innerHTML = '<span style="color:var(--danger)">AI 分析失败，请手动填写</span>';
      }
      showToast('AI 分析失败', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '🤖 AI 分析';
    }
  }, 600);
}

function fillAIFormSuggestions(suggestions) {
  const typeSelect = document.getElementById('req-form-type');
  const prioritySelect = document.getElementById('req-form-priority');
  const problemInput = document.getElementById('req-form-problem');
  const valueInput = document.getElementById('req-form-value');
  const acceptanceInput = document.getElementById('req-form-acceptance');

  if (typeSelect) typeSelect.value = suggestions.type;
  if (prioritySelect) prioritySelect.value = suggestions.priority;
  if (problemInput) problemInput.value = suggestions.problem;
  if (valueInput) valueInput.value = suggestions.value;
  if (acceptanceInput) acceptanceInput.value = suggestions.acceptanceCriteria;

  // 影响模块复选框
  document.querySelectorAll('#req-form-modules input[name="affectedModules"]').forEach(cb => {
    cb.checked = suggestions.affectedModules.includes(cb.value);
  });
}

function openFormModal(id = null) {
  state.editingId = id;
  const req = id ? getRequirementById(id) : null;
  const modal = document.getElementById('req-form-modal');
  const title = document.getElementById('req-form-title');
  const body = document.getElementById('req-form-body');

  if (title) title.textContent = req ? '编辑需求' : '新建需求';
  if (body) body.innerHTML = renderRequirementForm(req);
  if (modal) modal.style.display = 'flex';
}

function closeFormModal() {
  const modal = document.getElementById('req-form-modal');
  if (modal) modal.style.display = 'none';
  state.editingId = null;
}

function openDetailModal(id) {
  state.detailId = id;
  const req = getRequirementById(id);
  if (!req) return;

  const modal = document.getElementById('req-detail-modal');
  const body = document.getElementById('req-detail-body');
  if (body) body.innerHTML = renderRequirementDetail(req);
  if (modal) modal.style.display = 'flex';
}

function closeDetailModal() {
  const modal = document.getElementById('req-detail-modal');
  if (modal) modal.style.display = 'none';
  state.detailId = null;
}

function openDeleteModal(id) {
  state.deleteId = id;
  const req = getRequirementById(id);
  if (!req) return;

  const modal = document.getElementById('req-delete-modal');
  const target = document.getElementById('req-delete-target');
  const confirmBtn = document.getElementById('req-confirm-delete-btn');

  if (target) target.textContent = `${req.reqCode} ${req.title}`;
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      try {
        deleteRequirement(id);
        showToast('需求已删除', 'success');
        closeDeleteModal();
        refreshData();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }
  if (modal) modal.style.display = 'flex';
}

function closeDeleteModal() {
  const modal = document.getElementById('req-delete-modal');
  if (modal) modal.style.display = 'none';
  state.deleteId = null;
}

function openTransitionModal(id, nextStatus) {
  const req = getRequirementById(id);
  if (!req) return;

  state.transition = { id, nextStatus };

  const modal = document.getElementById('req-detail-modal');
  const body = document.getElementById('req-detail-body');
  if (body) body.innerHTML = renderTransitionForm(req, nextStatus);

  const confirmBtn = document.getElementById('req-confirm-transition-btn');
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      const commentInput = document.getElementById('req-transition-comment');
      const comment = commentInput ? commentInput.value.trim() : '';
      if (!comment) {
        showToast('请填写评审意见', 'warning');
        return;
      }
      try {
        transitionStatus(id, nextStatus, comment);
        showToast(`状态已推进为 ${REQUIREMENT_STATUS[nextStatus]}`, 'success');
        closeTransitionModal();
        refreshData();
        if (state.detailId) {
          openDetailModal(state.detailId);
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }
}

function closeTransitionModal() {
  state.transition = null;
  if (state.detailId) {
    openDetailModal(state.detailId);
  } else {
    closeDetailModal();
  }
}

function refreshData() {
  clearCache();
  allRequirements = loadRequirements();
  render();
}

function exportData() {
  const data = loadRequirements();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dste-requirements-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('需求数据已导出', 'success');
}

function getCurrentUserName() {
  return sessionStorage.getItem('dste-user')
    || (typeof DSTE !== 'undefined' ? DSTE.Storage.getString('dste-user') : null)
    || '产品管理员';
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
