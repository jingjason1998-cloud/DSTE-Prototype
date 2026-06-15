/**
 * 战略地图 UI 交互层
 * Toast、Modal、详情面板、Tooltip、因果链高亮
 */

import { renderDetailPanel } from './strategy-map-render.js';

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
      document.getElementById('modalObjOwner').value = obj.owner || '';
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
    const owner = document.getElementById('modalObjOwner')?.value.trim() || '';
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
  open(obj) {
    const panel = document.getElementById('detailPanel');
    const content = document.getElementById('detailContent');
    if (!panel || !content || !obj) return;

    // 打开详情时自动收起左侧目标列表
    const objListPanel = document.getElementById('objListPanel');
    if (objListPanel && !objListPanel.classList.contains('collapsed')) {
      objListPanel.classList.add('collapsed');
    }

    content.innerHTML = renderDetailPanel(obj);
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

// 兼容性：保留全局函数引用（部分旧 onclick 调用需要）
export function bindGlobalModalHandlers() {
  if (typeof window !== 'undefined') {
    window.closeObjModal = () => ModalManager.closeObjModal();
    window.saveObjModal = () => ModalManager.saveObjModal();
    window.deleteObj = () => ModalManager.deleteObjModal();
  }
}
