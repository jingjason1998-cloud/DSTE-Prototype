/**
 * 需求管理中心 — 渲染层
 */

import {
  REQUIREMENT_TYPES,
  REQUIREMENT_SOURCES,
  REQUIREMENT_STATUS,
  DSTE_MODULES,
  STATUS_TRANSITIONS,
  getCurrentUser
} from './requirement-store.js';

const STATUS_COLORS = {
  COLLECTED: 'var(--text-tertiary)',
  ANALYZING: 'var(--primary)',
  PLANNED: 'var(--warning)',
  DEVELOPING: 'var(--info, #3b82f6)',
  PENDING_RELEASE: 'var(--accent-pink, #eb2f96)',
  RELEASED: 'var(--success)',
  VERIFIED: 'var(--success)',
  CLOSED: 'var(--text-tertiary)',
  REJECTED: 'var(--danger)',
  SUSPENDED: 'var(--warning)'
};

const STATUS_BG_COLORS = {
  COLLECTED: 'var(--bg-page)',
  ANALYZING: 'color-mix(in srgb, var(--primary) 12%, transparent)',
  PLANNED: 'color-mix(in srgb, var(--warning) 12%, transparent)',
  DEVELOPING: 'color-mix(in srgb, var(--info, #3b82f6) 12%, transparent)',
  PENDING_RELEASE: 'color-mix(in srgb, var(--accent-pink, #eb2f96) 12%, transparent)',
  RELEASED: 'color-mix(in srgb, var(--success) 12%, transparent)',
  VERIFIED: 'color-mix(in srgb, var(--success) 12%, transparent)',
  CLOSED: 'var(--bg-page)',
  REJECTED: 'color-mix(in srgb, var(--danger) 12%, transparent)',
  SUSPENDED: 'color-mix(in srgb, var(--warning) 12%, transparent)'
};

const PRIORITY_COLORS = {
  P0: 'var(--danger)',
  P1: 'var(--warning)',
  P2: 'var(--primary)',
  P3: 'var(--text-tertiary)'
};

export function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

export function renderPage(state, requirements, filtered, pagination) {
  return `
    ${renderBreadcrumb()}
    ${renderHeader()}
    ${renderTabs(state.activeTab)}
    ${renderDashboard(filtered)}
    ${renderFilters(state.filters)}
    ${renderActionsBar()}
    ${renderTable(filtered, state)}
    ${renderPagination(pagination)}
  `;
}

function renderBreadcrumb() {
  return `
    <div class="req-breadcrumb">
      <a href="cockpit.html#dashboard">驾驶舱</a>
      <span class="req-breadcrumb-separator">/</span>
      <span>需求管理中心</span>
    </div>
  `;
}

function renderHeader() {
  return `
    <div class="req-page-header">
      <div>
        <div class="req-page-title">需求管理中心</div>
        <div class="req-page-subtitle">DSTE 平台自身产品迭代的需求池 · 收集/分析/规划/跟踪</div>
      </div>
      <div class="req-page-actions">
        <button class="btn btn-primary" data-req-action="new-requirement">+ 新建需求</button>
      </div>
    </div>
  `;
}

function renderTabs(activeTab) {
  const tabs = [
    { id: 'pool', label: '📋 需求池' },
    { id: 'mine', label: '👤 我的需求' },
    { id: 'release', label: '📅 版本规划' },
    { id: 'recycle', label: '🗑 回收站' }
  ];
  return `
    <div class="req-tabs">
      ${tabs.map(t => `
        <button class="req-tab ${activeTab === t.id ? 'active' : ''}" data-req-action="switch-tab" data-tab="${t.id}">${escapeHtml(t.label)}</button>
      `).join('')}
    </div>
  `;
}

export function renderDashboard(requirements) {
  const total = requirements.length;
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const newThisWeek = requirements.filter(r => new Date(r.createdAt).getTime() > weekAgo).length;

  const pipeline = [
    { status: 'COLLECTED', label: '已收集', color: '#64748b' },
    { status: 'ANALYZING', label: '分析中', color: '#3b82f6' },
    { status: 'PLANNED', label: '已规划', color: '#f59e0b' },
    { status: 'DEVELOPING', label: '开发中', color: '#8b5cf6' },
    { status: 'PENDING_RELEASE', label: '待发布', color: '#ec4899' },
    { status: 'RELEASED', label: '已发布', color: '#10b981' },
    { status: 'VERIFIED', label: '已验证', color: '#059669' },
    { status: 'CLOSED', label: '已关闭', color: '#94a3b8' }
  ];

  const pipelineData = pipeline.map(node => ({
    ...node,
    count: requirements.filter(r => r.status === node.status).length
  }));

  const typeDist = getDistribution(requirements, 'type', REQUIREMENT_TYPES);
  const sourceDist = getDistribution(requirements, 'source', REQUIREMENT_SOURCES);
  const moduleDist = getDistribution(requirements, 'affectedModules', DSTE_MODULES, true);

  return `
    <div class="req-dashboard">
      <div class="req-pipeline-header">
        <div>
          <div class="req-pipeline-title">需求状态管道</div>
          <div class="req-pipeline-subtitle">从收集到闭环的全局流转视图</div>
        </div>
        <div class="req-pipeline-total">
          <div class="req-pipeline-total-value">${total}</div>
          <div class="req-pipeline-total-label">需求总数</div>
        </div>
        <div class="req-pipeline-total">
          <div class="req-pipeline-total-value" style="color:var(--success)">${newThisWeek}</div>
          <div class="req-pipeline-total-label">本周新增</div>
        </div>
      </div>

      <div class="req-pipeline">
        ${pipelineData.map((node, idx) => `
          <div class="req-pipeline-node" data-req-action="filter-status" data-value="${node.status}">
            <div class="req-pipeline-node-dot" style="background:${node.color};box-shadow:0 0 0 4px ${node.color}20""></div>
            <div class="req-pipeline-node-count" style="color:${node.color}">${node.count}</div>
            <div class="req-pipeline-node-label">${node.label}</div>
          </div>
          ${idx < pipelineData.length - 1 ? `
            <div class="req-pipeline-arrow">
              <div class="req-pipeline-arrow-line"></div>
              <div class="req-pipeline-arrow-head"></div>
            </div>
          ` : ''}
        `).join('')}
      </div>

      <div class="req-distribution-row">
        ${renderDistributionCard('按类型分布', typeDist)}
        ${renderDistributionCard('按来源分布', sourceDist)}
        ${renderDistributionCard('按模块分布', moduleDist)}
      </div>
    </div>
  `;
}

function getDistribution(requirements, key, labelMap, isArray = false) {
  const counts = {};
  requirements.forEach(r => {
    const value = r[key];
    if (isArray && Array.isArray(value)) {
      value.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
    } else {
      const k = value || 'UNKNOWN';
      counts[k] = (counts[k] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .map(([k, v]) => ({ key: k, label: labelMap[k] || k, value: v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function renderDistributionCard(title, items) {
  const total = items.reduce((s, i) => s + i.value, 0);
  return `
    <div class="req-dist-card">
      <div class="req-dist-title">${title}</div>
      <div class="req-dist-list">
        ${items.length ? items.map(item => {
          const pct = total > 0 ? Math.round(item.value / total * 100) : 0;
          return `
            <div class="req-dist-item">
              <div class="req-dist-item-info">
                <span class="req-dist-item-label">${escapeHtml(item.label)}</span>
                <span class="req-dist-item-value">${item.value}</span>
              </div>
              <div class="req-dist-bar">
                <div class="req-dist-bar-fill" style="width:${pct}%"></div>
              </div>
            </div>
          `;
        }).join('') : '<div class="req-empty-tip">暂无数据</div>'}
      </div>
    </div>
  `;
}

export function renderFilters(filters) {
  const statusOptions = Object.entries(REQUIREMENT_STATUS).map(([k, v]) => ({ value: k, label: v }));
  const typeOptions = Object.entries(REQUIREMENT_TYPES).map(([k, v]) => ({ value: k, label: v }));
  const sourceOptions = Object.entries(REQUIREMENT_SOURCES).map(([k, v]) => ({ value: k, label: v }));
  const priorityOptions = ['P0', 'P1', 'P2', 'P3'].map(p => ({ value: p, label: p }));
  const moduleOptions = Object.entries(DSTE_MODULES).map(([k, v]) => ({ value: k, label: v }));

  return `
    <div class="req-filters">
      <div class="req-filter-group">
        <input type="text" class="req-filter-input" id="req-filter-keyword"
               placeholder="🔍 搜索标题、描述、编号..." value="${escapeHtml(filters.keyword || '')}"
               data-req-action="filter-keyword">
      </div>
      ${renderSelect('req-filter-status', '状态', statusOptions, filters.status, 'filter-status')}
      ${renderSelect('req-filter-type', '类型', typeOptions, filters.type, 'filter-type')}
      ${renderSelect('req-filter-source', '来源', sourceOptions, filters.source, 'filter-source')}
      ${renderSelect('req-filter-priority', '优先级', priorityOptions, filters.priority, 'filter-priority')}
      ${renderSelect('req-filter-module', '影响模块', moduleOptions, filters.module, 'filter-module')}
      <div class="req-filter-actions">
        <button class="btn btn-secondary btn-sm" data-req-action="reset-filters">重置</button>
      </div>
    </div>
  `;
}

function renderSelect(id, label, options, value, action) {
  return `
    <div class="req-filter-group">
      <label class="req-filter-label" for="${id}">${label}</label>
      <select class="req-filter-select" id="${id}" data-req-action="${action}">
        <option value="all" ${value === 'all' ? 'selected' : ''}>全部</option>
        ${options.map(o => `
          <option value="${o.value}" ${value === o.value ? 'selected' : ''}>${escapeHtml(o.label)}</option>
        `).join('')}
      </select>
    </div>
  `;
}

function renderActionsBar() {
  return `
    <div class="req-actions-bar">
      <div class="req-actions-left">
        <button class="btn btn-primary" data-req-action="new-requirement">+ 新建需求</button>
      </div>
      <div class="req-actions-right">
        <button class="btn btn-ghost btn-sm" data-req-action="export-data">📤 导出</button>
      </div>
    </div>
  `;
}

export function renderTable(requirements, state) {
  if (!requirements.length) {
    return `
      <div class="req-empty-state">
        <div class="req-empty-icon">📋</div>
        <div class="req-empty-title">暂无需求</div>
        <div class="req-empty-desc">点击「新建需求」开始收集 DSTE 产品迭代需求</div>
      </div>
    `;
  }

  return `
    <div class="req-table-wrapper">
      <table class="req-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>标题</th>
            <th>类型</th>
            <th>来源</th>
            <th>优先级</th>
            <th>状态</th>
            <th>目标版本</th>
            <th>影响模块</th>
            <th>负责人</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${requirements.map(r => renderTableRow(r, state)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderTableRow(req, state) {
  const statusLabel = REQUIREMENT_STATUS[req.status] || req.status;
  const typeLabel = REQUIREMENT_TYPES[req.type] || req.type;
  const sourceLabel = REQUIREMENT_SOURCES[req.source] || req.source;
  const modules = (req.affectedModules || [])
    .map(m => `<span class="req-module-tag">${escapeHtml(DSTE_MODULES[m] || m)}</span>`)
    .join('');
  const owner = req.productOwner || req.techOwner || '-';
  const targetVersion = req.targetVersion || '-';

  return `
    <tr data-req-id="${req.id}">
      <td><span class="req-code">${escapeHtml(req.reqCode)}</span></td>
      <td>
        <div class="req-title-cell" data-req-action="view-detail" data-req-id="${req.id}">${escapeHtml(req.title)}</div>
      </td>
      <td>${escapeHtml(typeLabel)}</td>
      <td>${escapeHtml(sourceLabel)}</td>
      <td><span class="req-priority req-priority-${req.priority}">${req.priority}</span></td>
      <td>${renderStatusBadge(req.status)}</td>
      <td>${escapeHtml(targetVersion)}</td>
      <td><div class="req-modules-cell">${modules || '-'}</div></td>
      <td>${escapeHtml(owner)}</td>
      <td>
        <div class="req-row-actions">
          <button class="req-action-btn" data-req-action="view-detail" data-req-id="${req.id}" title="查看">👁</button>
          <button class="req-action-btn" data-req-action="edit-requirement" data-req-id="${req.id}" title="编辑">✏️</button>
          <button class="req-action-btn" data-req-action="confirm-delete" data-req-id="${req.id}" title="删除">🗑</button>
        </div>
      </td>
    </tr>
  `;
}

export function renderStatusBadge(status) {
  const label = REQUIREMENT_STATUS[status] || status;
  return `
    <span class="req-status-badge"
          style="color:${STATUS_COLORS[status] || 'var(--text-secondary)'};
                 background:${STATUS_BG_COLORS[status] || 'var(--bg-page)'}">${escapeHtml(label)}</span>
  `;
}

export function renderPagination(pagination) {
  const { page, pageSize, total } = pagination;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return '';

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return `
    <div class="req-pagination">
      <button class="req-page-btn" data-req-action="change-page" data-page="${page - 1}"
              ${page === 1 ? 'disabled' : ''}>上一页</button>
      ${pages.map(p => `
        <button class="req-page-btn ${p === page ? 'active' : ''}" data-req-action="change-page" data-page="${p}">${p}</button>
      `).join('')}
      <button class="req-page-btn" data-req-action="change-page" data-page="${page + 1}"
              ${page === totalPages ? 'disabled' : ''}>下一页</button>
      <span class="req-pagination-info">共 ${total} 条，${totalPages} 页</span>
    </div>
  `;
}

export function renderRequirementForm(req = null) {
  const isEdit = !!req;
  const data = req || {};

  return `
    <form class="req-form" id="req-form" data-req-id="${data.id || ''}">
      <!-- 人填基础信息 -->
      <div class="req-form-section">
        <div class="req-form-section-title">📝 基础信息（人工填写）</div>
        <div class="req-form-grid">
          <div class="req-form-field req-form-field-full">
            <label>标题 *</label>
            <input type="text" name="title" id="req-form-title-input" required value="${escapeHtml(data.title || '')}"
                   placeholder="一句话描述需求，如：优化战略地图画布缩放体验">
          </div>

          <div class="req-form-field">
            <label>来源 *</label>
            <select name="source" id="req-form-source" required>
              ${Object.entries(REQUIREMENT_SOURCES).map(([k, v]) => `
                <option value="${k}" ${data.source === k ? 'selected' : ''}>${escapeHtml(v)}</option>
              `).join('')}
            </select>
          </div>

          <div class="req-form-field req-form-field-full">
            <label>详细描述</label>
            <textarea name="description" id="req-form-description" rows="4"
                      placeholder="背景、场景、期望... 描述越完整，AI 分析越准确">${escapeHtml(data.description || '')}</textarea>
          </div>
        </div>

        <div class="req-ai-actions">
          <button type="button" class="btn btn-secondary" data-req-action="ai-analyze">
            🤖 AI 分析
          </button>
          <span class="req-ai-tip">AI 将根据标题和描述自动推断类型、优先级、影响模块、问题、价值和验收标准</span>
        </div>
        <div id="req-ai-summary" class="req-ai-summary" style="display:none;"></div>
      </div>

      <!-- AI 分析结果区（可编辑） -->
      <div class="req-form-section" id="req-ai-suggestions">
        <div class="req-form-section-title">🤖 AI 分析建议（可人工调整）</div>
        <div class="req-form-grid">
          <div class="req-form-field">
            <label>类型 *</label>
            <select name="type" id="req-form-type" required>
              ${Object.entries(REQUIREMENT_TYPES).map(([k, v]) => `
                <option value="${k}" ${data.type === k ? 'selected' : ''}>${escapeHtml(v)}</option>
              `).join('')}
            </select>
          </div>

          <div class="req-form-field">
            <label>优先级 *</label>
            <select name="priority" id="req-form-priority" required>
              ${['P0', 'P1', 'P2', 'P3'].map(p => `
                <option value="${p}" ${data.priority === p ? 'selected' : ''}>${p}</option>
              `).join('')}
            </select>
          </div>

          <div class="req-form-field req-form-field-full">
            <label>影响模块 *</label>
            <div class="req-checkbox-group" id="req-form-modules">
              ${Object.entries(DSTE_MODULES).map(([k, v]) => {
                const checked = (data.affectedModules || []).includes(k);
                return `
                  <label class="req-checkbox">
                    <input type="checkbox" name="affectedModules" value="${k}" ${checked ? 'checked' : ''}>
                    <span>${escapeHtml(v)}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          <div class="req-form-field req-form-field-full">
            <label>问题/痛点</label>
            <textarea name="problem" id="req-form-problem" rows="3" placeholder="这个需求要解决什么问题？">${escapeHtml(data.problem || '')}</textarea>
          </div>

          <div class="req-form-field req-form-field-full">
            <label>价值说明</label>
            <textarea name="value" id="req-form-value" rows="3" placeholder="实现后的价值是什么？">${escapeHtml(data.value || '')}</textarea>
          </div>

          <div class="req-form-field req-form-field-full">
            <label>验收标准</label>
            <textarea name="acceptanceCriteria" id="req-form-acceptance" rows="3" placeholder="如何验收这个需求？">${escapeHtml(data.acceptanceCriteria || '')}</textarea>
          </div>
        </div>
      </div>

      <!-- 扩展信息 -->
      <div class="req-form-section">
        <div class="req-form-section-title">📋 扩展信息（可选）</div>
        <div class="req-form-grid">
          <div class="req-form-field">
            <label>目标版本</label>
            <input type="text" name="targetVersion" value="${escapeHtml(data.targetVersion || '')}"
                   placeholder="如 v0.6.0">
          </div>

          <div class="req-form-field">
            <label>RoadMap 阶段</label>
            <input type="text" name="roadmapPhase" value="${escapeHtml(data.roadmapPhase || '')}"
                   placeholder="如 Q3-体验优化">
          </div>

          <div class="req-form-field">
            <label>产品经理</label>
            <input type="text" name="productOwner" value="${escapeHtml(data.productOwner || '')}">
          </div>

          <div class="req-form-field">
            <label>技术负责人</label>
            <input type="text" name="techOwner" value="${escapeHtml(data.techOwner || '')}">
          </div>

          <div class="req-form-field">
            <label>提出人</label>
            <input type="text" name="reporter" value="${escapeHtml(data.reporter || getCurrentUser())}">
          </div>

          <div class="req-form-field">
            <label>提出部门</label>
            <input type="text" name="reporterDept" value="${escapeHtml(data.reporterDept || '')}">
          </div>

          <div class="req-form-field">
            <label>业务价值评分 1-5</label>
            <input type="number" name="businessValue" min="1" max="5"
                   value="${data.businessValue || ''}">
          </div>

          <div class="req-form-field">
            <label>技术成本评分 1-5</label>
            <input type="number" name="technicalEffort" min="1" max="5"
                   value="${data.technicalEffort || ''}">
          </div>

          <div class="req-form-field">
            <label>紧急程度评分 1-5</label>
            <input type="number" name="urgency" min="1" max="5"
                   value="${data.urgency || ''}">
          </div>
        </div>
      </div>

      <div class="req-form-actions">
        <button type="button" class="btn btn-secondary" data-req-action="close-form-modal">取消</button>
        <button type="submit" class="btn btn-primary">${isEdit ? '保存' : '创建'}</button>
      </div>
    </form>
  `;
}

export function renderRequirementDetail(req) {
  const statusLabel = REQUIREMENT_STATUS[req.status] || req.status;
  const typeLabel = REQUIREMENT_TYPES[req.type] || req.type;
  const sourceLabel = REQUIREMENT_SOURCES[req.source] || req.source;
  const modules = (req.affectedModules || [])
    .map(m => `<span class="req-module-tag">${escapeHtml(DSTE_MODULES[m] || m)}</span>`)
    .join('') || '-';

  const transitions = STATUS_TRANSITIONS[req.status] || [];

  return `
    <div class="req-detail">
      <div class="req-detail-header">
        <div class="req-detail-meta">
          <span class="req-code">${escapeHtml(req.reqCode)}</span>
          ${renderStatusBadge(req.status)}
          <span class="req-priority req-priority-${req.priority}">${req.priority}</span>
        </div>
        <h2 class="req-detail-title">${escapeHtml(req.title)}</h2>
      </div>

      <div class="req-detail-grid">
        <div class="req-detail-card">
          <div class="req-detail-card-title">基础信息</div>
          <div class="req-detail-item"><span class="req-detail-label">类型</span><span>${escapeHtml(typeLabel)}</span></div>
          <div class="req-detail-item"><span class="req-detail-label">来源</span><span>${escapeHtml(sourceLabel)}</span></div>
          <div class="req-detail-item"><span class="req-detail-label">提出人</span><span>${escapeHtml(req.reporter || '-')}</span></div>
          <div class="req-detail-item"><span class="req-detail-label">提出部门</span><span>${escapeHtml(req.reporterDept || '-')}</span></div>
          <div class="req-detail-item"><span class="req-detail-label">创建时间</span><span>${formatDate(req.createdAt)}</span></div>
        </div>

        <div class="req-detail-card">
          <div class="req-detail-card-title">规划信息</div>
          <div class="req-detail-item"><span class="req-detail-label">目标版本</span><span>${escapeHtml(req.targetVersion || '-')}</span></div>
          <div class="req-detail-item"><span class="req-detail-label">RoadMap 阶段</span><span>${escapeHtml(req.roadmapPhase || '-')}</span></div>
          <div class="req-detail-item"><span class="req-detail-label">产品经理</span><span>${escapeHtml(req.productOwner || '-')}</span></div>
          <div class="req-detail-item"><span class="req-detail-label">技术负责人</span><span>${escapeHtml(req.techOwner || '-')}</span></div>
          <div class="req-detail-item"><span class="req-detail-label">影响模块</span><span>${modules}</span></div>
        </div>

        ${req.businessValue || req.technicalEffort || req.urgency ? `
          <div class="req-detail-card">
            <div class="req-detail-card-title">评估评分</div>
            <div class="req-detail-item"><span class="req-detail-label">业务价值</span><span>${req.businessValue || '-'}/5</span></div>
            <div class="req-detail-item"><span class="req-detail-label">技术成本</span><span>${req.technicalEffort || '-'}/5</span></div>
            <div class="req-detail-item"><span class="req-detail-label">紧急程度</span><span>${req.urgency || '-'}/5</span></div>
          </div>
        ` : ''}
      </div>

      <div class="req-detail-section">
        <div class="req-detail-section-title">问题/痛点</div>
        <div class="req-detail-section-content">${escapeHtml(req.problem || '未填写')}</div>
      </div>

      <div class="req-detail-section">
        <div class="req-detail-section-title">价值说明</div>
        <div class="req-detail-section-content">${escapeHtml(req.value || '未填写')}</div>
      </div>

      <div class="req-detail-section">
        <div class="req-detail-section-title">详细描述</div>
        <div class="req-detail-section-content">${escapeHtml(req.description || '未填写')}</div>
      </div>

      <div class="req-detail-section">
        <div class="req-detail-section-title">验收标准</div>
        <div class="req-detail-section-content">${escapeHtml(req.acceptanceCriteria || '未填写')}</div>
      </div>

      ${renderReviews(req.reviews)}

      <div class="req-detail-actions">
        <button class="btn btn-secondary" data-req-action="close-detail-modal">关闭</button>
        <button class="btn btn-secondary" data-req-action="edit-requirement" data-req-id="${req.id}">编辑</button>
        ${transitions.map(next => `
          <button class="btn btn-primary" data-req-action="transition-status" data-req-id="${req.id}" data-next-status="${next}">推进到：${escapeHtml(REQUIREMENT_STATUS[next])}</button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderReviews(reviews) {
  if (!reviews || !reviews.length) return '';
  return `
    <div class="req-detail-section">
      <div class="req-detail-section-title">评审记录</div>
      <div class="req-reviews">
        ${reviews.map(r => `
          <div class="req-review-item">
            <div class="req-review-meta">
              <span class="req-review-action">${escapeHtml(REQUIREMENT_STATUS[r.action] || r.action)}</span>
              <span>${escapeHtml(r.reviewer)} · ${formatDate(r.createdAt)}</span>
            </div>
            ${r.comment ? `<div class="req-review-comment">${escapeHtml(r.comment)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export function renderTransitionForm(req, nextStatus) {
  return `
    <div class="req-form">
      <p style="margin-bottom:16px;color:var(--text-secondary);">
        将需求状态从 <strong>${escapeHtml(REQUIREMENT_STATUS[req.status])}</strong>
        推进到 <strong>${escapeHtml(REQUIREMENT_STATUS[nextStatus])}</strong>
      </p>
      <div class="req-form-field req-form-field-full">
        <label>评审意见 *</label>
        <textarea id="req-transition-comment" rows="4" placeholder="请填写状态变更原因或评审意见..."></textarea>
      </div>
      <div class="req-form-actions">
        <button type="button" class="btn btn-secondary" data-req-action="close-transition-modal">取消</button>
        <button type="button" class="btn btn-primary" id="req-confirm-transition-btn"
                data-req-id="${req.id}" data-next-status="${nextStatus}">确认推进</button>
      </div>
    </div>
  `;
}

function formatDate(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return iso;
  }
}
