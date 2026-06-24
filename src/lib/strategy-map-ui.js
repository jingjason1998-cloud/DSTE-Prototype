/**
 * 战略地图 UI 交互层
 * Toast、Modal、详情面板、Tooltip、因果链高亮
 */

import { LINK_TYPES } from './strategy-map-data.js';
import { renderDetailPanel } from './strategy-map-render.js';
import { enhancePersonInput, getPersonInputValue } from '../components/person-input.js';
import { renderPerson, normalizePerson } from './employee-directory.js';

// ========== Toast ==========
export const ToastManager = {
  show(msg, type = 'success', duration = 2500) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `toast ${type}`;
    requestAnimationFrame(() => t.classList.add('show'));
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => t.classList.remove('show'), duration);
  }
};

// ========== 目标编辑 Modal ==========
export const ModalManager = {
  openObjModal({ objId = null, objectives = [], onSave, onDelete }) {
    const modal = document.getElementById('objModal');
    const title = document.getElementById('modalTitle');
    const deleteBtn = document.getElementById('modalDeleteBtn');
    if (!modal) return;

    title.textContent = objId ? '编辑战略目标' : '新建战略目标';
    deleteBtn.style.display = objId ? 'inline-block' : 'none';

    if (objId) {
      const obj = objectives.find(o => o.id === objId);
      if (!obj) return;
      document.getElementById('modalObjName').value = obj.name || '';
      document.getElementById('modalObjDesc').value = obj.desc || '';
      document.getElementById('modalObjOwner').value = typeof obj.owner === 'object' ? (obj.owner.displayName || obj.owner.name || '') : (obj.owner || '');
      document.querySelectorAll('input[name="modalDim"]').forEach(r => { r.checked = r.value === obj.dim; });
      document.getElementById('ms2025Target').value = obj.milestones?.[2025]?.target || '';
      document.getElementById('ms2025Focus').value = obj.milestones?.[2025]?.focusLevel || 'primary';
      document.getElementById('ms2026Target').value = obj.milestones?.[2026]?.target || '';
      document.getElementById('ms2026Focus').value = obj.milestones?.[2026]?.focusLevel || 'secondary';
      document.getElementById('ms2027Target').value = obj.milestones?.[2027]?.target || '';
      document.getElementById('ms2027Focus').value = obj.milestones?.[2027]?.focusLevel || 'none';
    } else {
      document.getElementById('modalObjName').value = '';
      document.getElementById('modalObjDesc').value = '';
      document.getElementById('modalObjOwner').value = '';
      document.querySelectorAll('input[name="modalDim"]').forEach(r => { r.checked = false; });
      document.getElementById('ms2025Target').value = '';
      document.getElementById('ms2025Focus').value = 'primary';
      document.getElementById('ms2026Target').value = '';
      document.getElementById('ms2026Focus').value = 'secondary';
      document.getElementById('ms2027Target').value = '';
      document.getElementById('ms2027Focus').value = 'none';
    }

    this._objId = objId;
    this._onObjSave = onSave;
    this._onObjDelete = onDelete;
    modal.classList.add('open');

    const ownerInput = document.getElementById('modalObjOwner');
    if (ownerInput) {
      const ownerValue = objId ? (objectives.find(o => o.id === objId)?.owner || '') : '';
      enhancePersonInput(ownerInput, { placeholder: ownerInput.getAttribute('placeholder') || '', allowFreeText: true });
      const api = ownerInput._personInputApi;
      if (api) api.setValue(ownerValue);
    }
  },

  closeObjModal() {
    const modal = document.getElementById('objModal');
    if (modal) modal.classList.remove('open');
    this._objId = null;
  },

  saveObjModal() {
    const name = document.getElementById('modalObjName')?.value.trim();
    const dim = document.querySelector('input[name="modalDim"]:checked')?.value;
    if (!name || !dim) {
      ToastManager.show('请填写目标名称和所属维度', 'error');
      return;
    }

    const desc = document.getElementById('modalObjDesc')?.value.trim() || '';
    const ownerInput = document.getElementById('modalObjOwner');
    const owner = ownerInput ? (getPersonInputValue(ownerInput) || ownerInput.value.trim() || '') : '';
    const milestones = {
      2025: { target: document.getElementById('ms2025Target')?.value.trim() || '0', actual: null, status: 'not_started', focusLevel: document.getElementById('ms2025Focus')?.value || 'primary' },
      2026: { target: document.getElementById('ms2026Target')?.value.trim() || '0', actual: null, status: 'not_started', focusLevel: document.getElementById('ms2026Focus')?.value || 'secondary' },
      2027: { target: document.getElementById('ms2027Target')?.value.trim() || '0', actual: null, status: 'not_started', focusLevel: document.getElementById('ms2027Focus')?.value || 'none' },
    };

    if (this._onObjSave) {
      this._onObjSave({
        id: this._objId,
        name,
        dim,
        desc,
        owner,
        milestones
      });
    }
  },

  deleteObjModal() {
    if (!this._objId) return;
    if (!confirm('确定删除该战略目标吗？')) return;
    if (this._onObjDelete) this._onObjDelete(this._objId);
  },

  // ========== 地图配置 Modal ==========
  openMapConfigModal({ config = null, onSave }) {
    let modal = document.getElementById('mapConfigModal');
    if (!modal) {
      modal = this._buildMapConfigModal();
      document.body.appendChild(modal);
      this._bindMapConfigModalEvents(modal);
    }

    const isEdit = !!config;
    modal.querySelector('#mapConfigTitle').textContent = isEdit ? '编辑地图配置' : '新建战略地图';
    modal.querySelector('#mapConfigId').value = config?.id || '';
    modal.querySelector('#mapConfigName').value = config?.name || '';
    modal.querySelector('#mapConfigDept').value = config?.dept || '';
    modal.querySelector('#mapConfigDeptName').value = config?.deptName || '';
    modal.querySelector('#mapConfigStartYear').value = config?.cycle?.startYear || 2025;
    modal.querySelector('#mapConfigEndYear').value = config?.cycle?.endYear || 2027;
    modal.querySelector('#mapConfigDesc').value = config?.description || '';

    this._onMapConfigSave = onSave;
    modal.classList.add('open');
  },

  closeMapConfigModal() {
    const modal = document.getElementById('mapConfigModal');
    if (modal) modal.classList.remove('open');
  },

  _buildMapConfigModal() {
    const div = document.createElement('div');
    div.id = 'mapConfigModal';
    div.className = 'modal-overlay';
    div.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title" id="mapConfigTitle">新建战略地图</span>
          <button class="modal-close" data-action="close-map-config">×</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="mapConfigId">
          <div class="form-row">
            <label class="form-label">地图名称 <span class="req">*</span></label>
            <input type="text" class="form-input" id="mapConfigName" placeholder="如：研发线 2025-2027 战略地图">
          </div>
          <div class="form-row" style="display:flex;gap:12px;">
            <div style="flex:1;">
              <label class="form-label">部门代码 <span class="req">*</span></label>
              <input type="text" class="form-input" id="mapConfigDept" placeholder="如：rd">
            </div>
            <div style="flex:1;">
              <label class="form-label">部门名称</label>
              <input type="text" class="form-input" id="mapConfigDeptName" placeholder="如：研发线">
            </div>
          </div>
          <div class="form-row" style="display:flex;gap:12px;">
            <div style="flex:1;">
              <label class="form-label">开始年份 <span class="req">*</span></label>
              <input type="number" class="form-input" id="mapConfigStartYear" value="2025" min="2000" max="2100">
            </div>
            <div style="flex:1;">
              <label class="form-label">结束年份 <span class="req">*</span></label>
              <input type="number" class="form-input" id="mapConfigEndYear" value="2027" min="2000" max="2100">
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">描述</label>
            <textarea class="form-textarea" id="mapConfigDesc" placeholder="简要描述该战略地图的用途..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" data-action="close-map-config">取消</button>
          <button class="btn btn-primary" data-action="save-map-config">保存</button>
        </div>
      </div>
    `;
    return div;
  },

  _bindMapConfigModalEvents(modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeMapConfigModal();
    });
  },

  saveMapConfigModal() {
    const name = document.getElementById('mapConfigName')?.value.trim();
    const dept = document.getElementById('mapConfigDept')?.value.trim();
    const deptName = document.getElementById('mapConfigDeptName')?.value.trim();
    const startYear = parseInt(document.getElementById('mapConfigStartYear')?.value, 10);
    const endYear = parseInt(document.getElementById('mapConfigEndYear')?.value, 10);
    const description = document.getElementById('mapConfigDesc')?.value.trim();

    if (!name || !dept || Number.isNaN(startYear) || Number.isNaN(endYear) || startYear > endYear) {
      ToastManager.show('请填写完整且有效的地图信息', 'error');
      return;
    }

    const existingId = document.getElementById('mapConfigId')?.value;
    if (this._onMapConfigSave) {
      this._onMapConfigSave({
        id: existingId || undefined,
        name,
        dept,
        deptName: deptName || dept,
        cycle: { startYear, endYear },
        description,
        status: 'draft'
      });
    }
  }
};

// ========== 详情面板 ==========
export const DetailPanelManager = {
  open(obj, isEditMode = false) {
    const panel = document.getElementById('detailPanel');
    const content = document.getElementById('detailContent');
    if (!panel || !content || !obj) return;

    // 打开详情时自动收起左侧目标列表
    const objListPanel = document.getElementById('objListPanel');
    if (objListPanel && !objListPanel.classList.contains('collapsed')) {
      objListPanel.classList.add('collapsed');
    }

    content.innerHTML = renderDetailPanel(obj, isEditMode);
    panel.classList.add('open');
  },

  close() {
    const panel = document.getElementById('detailPanel');
    if (panel) panel.classList.remove('open');
  }
};

// ========== Tooltip ==========
export const TooltipManager = {
  show(text, x, y) {
    let tooltip = document.getElementById('linkTooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'linkTooltip';
      tooltip.className = 'link-tooltip';
      document.body.appendChild(tooltip);
    }
    tooltip.innerHTML = text;
    tooltip.classList.add('show');

    const rect = tooltip.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let left = x + 12;
    let top = y + 12;
    if (left + rect.width > winW) left = x - rect.width - 8;
    if (top + rect.height > winH) top = y - rect.height - 8;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  },

  hide() {
    const tooltip = document.getElementById('linkTooltip');
    if (tooltip) tooltip.classList.remove('show');
  }
};

// ========== 因果链高亮 ==========
export const ChainHighlighter = {
  highlight({ fromId, toId, _links, upstream, downstream, linkIndices }) {
    this.clear();

    const highlightedIds = new Set([...upstream, ...downstream, fromId, toId]);

    document.querySelectorAll('.obj-card').forEach(card => {
      const id = card.dataset.id;
      if (highlightedIds.has(id)) {
        card.classList.add('chain-highlight');
      } else {
        card.classList.add('chain-dimmed');
      }
    });

    document.querySelectorAll('.link-path').forEach((path, idx) => {
      if (linkIndices.has(idx)) {
        path.classList.add('chain-highlight');
      } else {
        path.classList.add('chain-dimmed');
      }
    });

    this._active = true;
  },

  clear() {
    document.querySelectorAll('.obj-card').forEach(card => {
      card.classList.remove('chain-highlight', 'chain-dimmed');
    });
    document.querySelectorAll('.link-path').forEach(path => {
      path.classList.remove('chain-highlight', 'chain-dimmed');
    });
    this._active = false;
  },

  isActive() {
    return !!this._active;
  }
};

// ========== 因果链编辑弹窗 ==========
export const LinkModalManager = {
  _currentLink: null,
  _objectives: [],
  _onSave: null,
  _onDelete: null,

  open({ link, fromObj, toObj, objectives = [], onSave, onDelete }) {
    let modal = document.getElementById('linkModal');
    if (!modal) {
      modal = this._buildModal();
      document.body.appendChild(modal);
      this._bindEvents(modal);
    }

    this._currentLink = link;
    this._objectives = objectives;
    this._onSave = onSave;
    this._onDelete = onDelete;

    const deleteBtn = modal.querySelector('[data-action="delete-link"]');

    // 渲染起点/终点下拉框
    const fromSelect = modal.querySelector('#linkFromSelect');
    const toSelect = modal.querySelector('#linkToSelect');
    const currentFrom = link?.from || fromObj?.id || '';
    const currentTo = link?.to || toObj?.id || '';
    this._renderObjectiveOptions(fromSelect, currentFrom, objectives);
    this._renderObjectiveOptions(toSelect, currentTo, objectives);

    // 设置类型单选
    const type = link?.type || 'drives';
    modal.querySelectorAll('input[name="linkType"]').forEach(radio => {
      radio.checked = radio.value === type;
    });

    // 新建时不显示删除按钮
    deleteBtn.style.display = link ? 'inline-block' : 'none';

    modal.classList.add('open');
  },

  close() {
    const modal = document.getElementById('linkModal');
    if (modal) modal.classList.remove('open');
    this._currentLink = null;
    this._objectives = [];
    this._onSave = null;
    this._onDelete = null;
  },

  save() {
    if (!this._currentLink || !this._onSave) return;
    const modal = document.getElementById('linkModal');
    const type = modal.querySelector('input[name="linkType"]:checked')?.value || 'drives';
    const from = modal.querySelector('#linkFromSelect')?.value;
    const to = modal.querySelector('#linkToSelect')?.value;
    this._onSave({
      ...this._currentLink,
      from,
      to,
      type,
      _oldFrom: this._currentLink.from,
      _oldTo: this._currentLink.to
    });
    this.close();
  },

  delete() {
    if (!this._currentLink || !this._onDelete) return;
    this._onDelete(this._currentLink);
    this.close();
  },

  _renderObjectiveOptions(select, currentId, objectives) {
    if (!select) return;
    const dimNames = { fin: '财务', cus: '客户', int: '内部流程', lea: '学习成长' };
    select.innerHTML = objectives.map(o => {
      const selected = o.id === currentId ? ' selected' : '';
      return `<option value="${o.id}"${selected}>[${dimNames[o.dim] || o.dim}] ${o.name}</option>`;
    }).join('');
  },

  _buildModal() {
    const div = document.createElement('div');
    div.id = 'linkModal';
    div.className = 'modal-overlay';
    div.innerHTML = `
      <div class="modal" style="width: 400px;">
        <div class="modal-header">
          <span class="modal-title">编辑因果链</span>
          <button class="modal-close" data-action="close-link-modal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-row" style="display:flex;gap:12px;">
            <div class="form-group" style="flex:1;">
              <label class="form-label">从</label>
              <select class="form-select" id="linkFromSelect" style="width:100%;font-size:13px;"></select>
            </div>
            <div class="form-group" style="flex:1;">
              <label class="form-label">到</label>
              <select class="form-select" id="linkToSelect" style="width:100%;font-size:13px;"></select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">关系类型</label>
            <div class="form-radio-group" style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
              ${Object.entries(LINK_TYPES).map(([key, cfg]) => `
                <label class="form-radio" style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;">
                  <input type="radio" name="linkType" value="${key}" style="cursor:pointer;">
                  <span><strong>${cfg.label}</strong> — ${cfg.desc}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" data-action="close-link-modal">取消</button>
          <button class="btn btn-danger" data-action="delete-link">删除</button>
          <button class="btn btn-primary" data-action="save-link">保存</button>
        </div>
      </div>
    `;
    return div;
  },

  _bindEvents(modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'close-link-modal') this.close();
      if (action === 'save-link') this.save();
      if (action === 'delete-link') this.delete();
    });
  }
};

// ========== 因果链选择状态 ==========
export const LinkSelectionManager = {
  _selected: null,

  select(pathEl) {
    this.clear();
    if (!pathEl) return;
    pathEl.classList.add('selected');
    this._selected = {
      from: pathEl.dataset.from,
      to: pathEl.dataset.to,
      linkId: pathEl.dataset.linkId
    };
  },

  clear() {
    if (this._selected) {
      document.querySelectorAll('.link-path.selected').forEach(el => el.classList.remove('selected'));
    }
    this._selected = null;
  },

  getSelected() {
    return this._selected;
  },

  isSelected() {
    return !!this._selected;
  }
};

// ========== 拖拽创建因果链 ==========
export const LinkDragManager = {
  _sourceId: null,
  _tempPath: null,
  _svg: null,
  _canvas: null,
  _onCreate: null,
  _onValidate: null,

  start({ sourceId, startX, startY, svg, canvas, onCreate, onValidate }) {
    this._sourceId = sourceId;
    this._svg = svg;
    this._canvas = canvas;
    this._onCreate = onCreate;
    this._onValidate = onValidate;

    this._tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this._tempPath.setAttribute('class', 'link-drag-temp');
    this._tempPath.setAttribute('d', `M ${startX} ${startY} L ${startX} ${startY}`);
    this._svg.appendChild(this._tempPath);

    document.body.style.cursor = 'grabbing';
    this._bindDragListeners();
  },

  _bindDragListeners() {
    this._handleMove = (e) => this._update(e);
    this._handleUp = (e) => this._end(e);
    document.addEventListener('mousemove', this._handleMove);
    document.addEventListener('mouseup', this._handleUp);
  },

  _update(e) {
    if (!this._tempPath) return;
    const canvasRect = this._canvas.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    const d = this._tempPath.getAttribute('d');
    const start = d.split(' L ')[0].slice(2);
    this._tempPath.setAttribute('d', `M ${start} L ${x} ${y}`);

    // drop target 反馈
    this._clearDropClasses();
    const targetCard = this._findCardAtPoint(e.clientX, e.clientY);
    if (targetCard && targetCard.dataset.id !== this._sourceId) {
      const isValid = this._onValidate ? this._onValidate(this._sourceId, targetCard.dataset.id) : true;
      targetCard.classList.add(isValid ? 'drop-target' : 'drop-invalid');
    }
  },

  _end(e) {
    document.removeEventListener('mousemove', this._handleMove);
    document.removeEventListener('mouseup', this._handleUp);
    document.body.style.cursor = '';

    const targetCard = this._findCardAtPoint(e.clientX, e.clientY);
    this._clearDropClasses();

    if (this._tempPath) {
      this._tempPath.remove();
      this._tempPath = null;
    }

    if (targetCard && targetCard.dataset.id !== this._sourceId) {
      const targetId = targetCard.dataset.id;
      if (this._onValidate && !this._onValidate(this._sourceId, targetId)) {
        this._reset();
        return;
      }
      if (this._onCreate) {
        this._onCreate({ from: this._sourceId, to: targetId });
      }
    }

    this._reset();
  },

  _findCardAtPoint(x, y) {
    const elements = document.elementsFromPoint(x, y);
    return elements.find(el => el.closest('.obj-card'))?.closest('.obj-card') || null;
  },

  _clearDropClasses() {
    document.querySelectorAll('.obj-card.drop-target, .obj-card.drop-invalid').forEach(card => {
      card.classList.remove('drop-target', 'drop-invalid');
    });
  },

  _reset() {
    this._sourceId = null;
    this._svg = null;
    this._canvas = null;
    this._onCreate = null;
    this._onValidate = null;
  },

  cancel() {
    if (this._tempPath) {
      this._tempPath.remove();
      this._tempPath = null;
    }
    this._clearDropClasses();
    document.removeEventListener('mousemove', this._handleMove);
    document.removeEventListener('mouseup', this._handleUp);
    document.body.style.cursor = '';
    this._reset();
  }
};

// 兼容性：保留全局函数引用（部分旧 onclick 调用需要）
export function bindGlobalModalHandlers() {
  if (typeof window !== 'undefined') {
    window.closeObjModal = () => ModalManager.closeObjModal();
    window.saveObjModal = () => ModalManager.saveObjModal();
    window.deleteObj = () => ModalManager.deleteObjModal();
  }
}
