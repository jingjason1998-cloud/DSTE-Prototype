/**
 * 战略地图渲染引擎
 * 负责卡片、SVG 因果链、侧边栏、详情面板等 UI 渲染
 */

import { DIM_CONFIG, DIM_ORDER, statusText } from './strategy-map-data.js';
import { icon } from '../../assets/js/icons.js';
import { renderPerson } from './employee-directory.js';

// ========== 工具函数 ==========
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function calcProgress(actual, target) {
  if (!actual || !target) return 0;
  const a = parseFloat(actual);
  const t = parseFloat(target);
  if (Number.isNaN(a) || Number.isNaN(t) || t === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((a / t) * 100)));
}

// ========== 主渲染入口 ==========
export function render(state) {
  const { objectives, currentView, activeDimFilter, allExpanded, expandedParents = new Set(), containerIds } = state;
  const containers = {
    fin: document.getElementById(containerIds?.fin || 'dim-fin'),
    cus: document.getElementById(containerIds?.cus || 'dim-cus'),
    int: document.getElementById(containerIds?.int || 'dim-int'),
    lea: document.getElementById(containerIds?.lea || 'dim-lea'),
  };

  Object.values(containers).forEach(c => { if (c) c.innerHTML = ''; });

  const year = currentView === 'all' ? null : parseInt(currentView, 10);
  const byDim = { fin: [], cus: [], int: [], lea: [] };
  objectives.forEach(obj => { if (byDim[obj.dim]) byDim[obj.dim].push(obj); });

  Object.keys(byDim).forEach(dim => {
    const objs = byDim[dim];
    if (objs.length === 0 || !containers[dim]) return;

    const primary = objs.filter(o => o.level !== 'secondary');
    const secondaryByParent = new Map();
    objs.filter(o => o.level === 'secondary').forEach(o => {
      const pid = o.parentId || '_unassigned';
      if (!secondaryByParent.has(pid)) secondaryByParent.set(pid, []);
      secondaryByParent.get(pid).push(o);
    });

    primary.forEach(obj => {
      const group = document.createElement('div');
      group.className = 'obj-group';

      const hasChildren = secondaryByParent.has(obj.id);
      const expanded = hasChildren && expandedParents.has(obj.id);

      const primaryRow = document.createElement('div');
      primaryRow.className = 'dim-row-primary';
      primaryRow.appendChild(buildCard({ obj, year, allExpanded, currentView, hasChildren, expanded }));
      group.appendChild(primaryRow);

      if (hasChildren) {
        const children = secondaryByParent.get(obj.id);
        const secondaryRow = document.createElement('div');
        secondaryRow.className = `dim-row-secondary ${expanded ? 'open' : ''}`;
        const inner = document.createElement('div');
        inner.className = 'dim-row-secondary-inner';
        children.forEach((child, idx) => {
          const card = buildCard({ obj: child, year, allExpanded, currentView });
          if (idx === 0) {
            const branch = document.createElement('span');
            branch.className = 'branch-icon';
            branch.textContent = '└─';
            card.appendChild(branch);
          }
          inner.appendChild(card);
        });
        secondaryRow.appendChild(inner);
        group.appendChild(secondaryRow);
      }

      containers[dim].appendChild(group);
    });
  });

  renderSidebar({ objectives, currentView, activeDimFilter });

  // 维度筛选淡化
  if (activeDimFilter) {
    document.querySelectorAll('.obj-card').forEach(card => {
      if (!card.classList.contains(`dim-${activeDimFilter}`)) {
        card.style.opacity = '0.25';
        card.style.filter = 'grayscale(0.8)';
      }
    });
    document.querySelectorAll('.link-path').forEach(path => { path.style.opacity = '0.1'; });
    document.querySelectorAll('.obj-list-item').forEach(item => {
      if (!item.classList.contains(`dim-${activeDimFilter}`)) item.classList.add('dimmed');
    });
  }
}

// ========== 卡片构建 ==========
export function buildCard({ obj, year, allExpanded, currentView, hasChildren = false, expanded = false }) {
  const card = document.createElement('div');
  const isSecondary = obj.level === 'secondary';
  card.className = `obj-card dim-${obj.dim}${isSecondary ? ' secondary-level' : ''}`;
  card.id = obj.id;
  card.dataset.id = obj.id;
  card.dataset.dim = obj.dim;

  if (year && obj.milestones[year]?.focusLevel === 'none') card.classList.add('dimmed');

  const ms = obj.milestones;
  let msHtml = '';
  if (currentView === 'all') {
    msHtml = `<div class="ms-pills">
      <div class="ms-pill ${ms[2025]?.focusLevel === 'primary' ? 'primary' : 'secondary'}"><div class="yr">2025</div><div class="val">${escapeHtml(ms[2025]?.target)}</div></div>
      <div class="ms-pill ${ms[2026]?.focusLevel === 'primary' ? 'primary' : 'secondary'}"><div class="yr">2026</div><div class="val">${escapeHtml(ms[2026]?.target)}</div></div>
      <div class="ms-pill ${ms[2027]?.focusLevel === 'primary' ? 'primary' : 'secondary'}"><div class="yr">2027</div><div class="val">${escapeHtml(ms[2027]?.target)}</div></div>
    </div>`;
  } else {
    const yms = ms[year] || {};
    const progress = calcProgress(yms.actual, yms.target);
    msHtml = `<div class="ms-box">
      <div class="ms-box-header"><span class="ms-box-year">${year}年目标</span><span class="ms-box-status ${yms.status}">${statusText(yms.status)}</span></div>
      <div class="ms-row"><span class="target">${escapeHtml(yms.target)}</span>${yms.actual ? `<span class="actual">实际: ${escapeHtml(yms.actual)}</span>` : ''}</div>
      ${yms.actual ? `<div class="ms-row" style="margin-top:4px;"><label>进度:</label><div class="ms-progress"><div class="ms-progress-fill ${yms.status}" style="width:${progress}%"></div></div><span style="font-size:10px;color:#6b7280;">${progress}%</span></div>` : ''}
    </div>`;
  }

  let badge = '';
  if (year) {
    const fl = ms[year]?.focusLevel;
    if (fl === 'primary') badge = `<span class="obj-focus primary">${icon('fire', {size: 14})} 重点</span>`;
    else if (fl === 'secondary') badge = `<span class="obj-focus secondary">○ 次要</span>`;
  }

  const drillToggle = (!isSecondary && hasChildren)
    ? `<button class="drill-toggle ${expanded ? 'expanded' : ''}" data-action="toggle-children" data-id="${obj.id}" title="${expanded ? '收起二级指标' : '展开二级指标'}">▼</button>`
    : '';

  const cid = `ms-${obj.id}`;
  card.innerHTML = `
    <div class="obj-bar ${obj.dim}"></div>
    <div class="obj-name">${escapeHtml(obj.name)} ${badge}${drillToggle}</div>
    <div class="obj-desc">${escapeHtml(obj.desc)}</div>
    <div class="obj-ports">
      <div class="port" data-port="left"></div>
      <button class="ms-toggle" data-action="toggle-ms" data-ms="${cid}"><span>${allExpanded ? '▲' : '▼'}</span> 分解</button>
      <div class="port" data-port="right"></div>
    </div>
    <div class="ms-wrap ${allExpanded ? 'open' : ''}" id="${cid}" data-ms-wrap="${obj.id}">${msHtml}</div>
  `;

  return card;
}

// ========== 侧边栏 ==========
export function renderSidebar({ objectives, currentView, _activeDimFilter }) {
  const list = document.getElementById('objList');
  const countEl = document.getElementById('objListCount');
  if (!list) return;

  list.innerHTML = '';
  const year = currentView === 'all' ? null : parseInt(currentView, 10);

  objectives.forEach(obj => {
    const item = document.createElement('div');
    item.className = `obj-list-item dim-${obj.dim}`;
    item.style.borderLeftColor = DIM_CONFIG[obj.dim]?.color;
    item.dataset.id = obj.id;
    if (year && obj.milestones[year]?.focusLevel === 'none') item.classList.add('dimmed');
    item.innerHTML = `<span class="item-dot" style="background:${DIM_CONFIG[obj.dim]?.color};"></span>${escapeHtml(obj.name)}`;
    list.appendChild(item);
  });

  if (countEl) countEl.textContent = objectives.length;
}

// ========== SVG 因果链绘制 ==========
export function drawLinks({ links, objectives, visibleIds, svgId, canvasId }) {
  const svg = document.getElementById(svgId || 'linksSvg');
  const canvas = document.getElementById(canvasId || 'canvas');
  if (!svg || !canvas) return;

  svg.querySelectorAll('.link-path').forEach(p => p.remove());
  const canvasRect = canvas.getBoundingClientRect();

  svg.setAttribute('width', canvas.scrollWidth);
  svg.setAttribute('height', canvas.scrollHeight);

  const objMap = new Map(objectives.map(o => [o.id, o]));

  links.forEach((link, index) => {
    if (visibleIds && (!visibleIds.has(link.from) || !visibleIds.has(link.to))) return;

    const fromEl = document.getElementById(link.from);
    const toEl = document.getElementById(link.to);
    if (!fromEl || !toEl) return;

    const fromObj = objMap.get(link.from);
    const toObj = objMap.get(link.to);
    if (!fromObj || !toObj) return;

    const fromDimIdx = DIM_ORDER[fromObj.dim];
    const toDimIdx = DIM_ORDER[toObj.dim];

    const fr = fromEl.getBoundingClientRect();
    const tr = toEl.getBoundingClientRect();
    const offset = 8;

    let x1, y1, x2, y2;

    if (fromDimIdx === toDimIdx) {
      if (fr.left < tr.left) {
        x1 = fr.right - canvasRect.left + offset;
        y1 = fr.top + fr.height / 2 - canvasRect.top;
        x2 = tr.left - canvasRect.left - offset;
        y2 = tr.top + tr.height / 2 - canvasRect.top;
      } else {
        x1 = fr.left - canvasRect.left - offset;
        y1 = fr.top + fr.height / 2 - canvasRect.top;
        x2 = tr.right - canvasRect.left + offset;
        y2 = tr.top + tr.height / 2 - canvasRect.top;
      }
    } else if (fromDimIdx < toDimIdx) {
      x1 = fr.left + fr.width / 2 - canvasRect.left;
      y1 = fr.top - canvasRect.top - offset;
      x2 = tr.left + tr.width / 2 - canvasRect.left;
      y2 = tr.bottom - canvasRect.top + offset;
    } else {
      x1 = fr.left + fr.width / 2 - canvasRect.left;
      y1 = fr.bottom - canvasRect.top + offset;
      x2 = tr.left + tr.width / 2 - canvasRect.left;
      y2 = tr.top - canvasRect.top - offset;
    }

    const dx = x2 - x1;
    const dy = y2 - y1;
    let cp1x, cp1y, cp2x, cp2y;

    if (fromDimIdx === toDimIdx) {
      cp1x = x1 + dx * 0.5;
      cp1y = y1;
      cp2x = x2 - dx * 0.5;
      cp2y = y2;
    } else {
      cp1x = x1;
      cp1y = y1 - dy * 0.5;
      cp2x = x2;
      cp2y = y2 + dy * 0.5;
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`);
    path.setAttribute('class', `link-path ${link.type}`);
    path.setAttribute('data-from', link.from);
    path.setAttribute('data-to', link.to);
    path.setAttribute('data-link-id', `${link.from}→${link.to}`);
    path.setAttribute('data-index', String(index));
    path.style.pointerEvents = 'auto';
    svg.appendChild(path);
  });
}

// ========== 详情面板内容 ==========
export function renderDetailPanel(obj, isEditMode = false) {
  const dimNames = {
    fin: `${icon('currencyDollar', {size: 14})} 财务维度`,
    cus: `${icon('handshake', {size: 14})} 客户维度`,
    int: `${icon('settings', {size: 14})} 内部流程维度`,
    lea: `${icon('books', {size: 14})} 学习与成长维度`
  };
  const ms = obj.milestones || {};
  const years = [2025, 2026, 2027];

  const rows = years.map(year => {
    const m = ms[year] || {};
    return `<tr>
      <td>${year}</td>
      <td>${escapeHtml(m.target) || '-'}</td>
      <td>${escapeHtml(m.actual) || '-'}</td>
      <td><span class="ms-box-status ${m.status}">${statusText(m.status)}</span></td>
      <td><span class="focus-dot ${m.focusLevel}"></span>${m.focusLevel === 'primary' ? '重点' : '次要'}</td>
    </tr>`;
  }).join('');

  const kpiBadge = obj.kpiRef ? `<span class="detail-tag">${icon('chartBar', {size: 14})} 已关联 KPI</span>` : `<span class="detail-tag" title="暂支持与 KPI/重点任务系统打通">${icon('plug', {size: 14})} 未接入</span>`;
  const editButton = isEditMode
    ? `<div style="margin-top:20px;"><button class="btn btn-primary" data-action="edit-obj" data-id="${obj.id}">${icon('pencil-simple', {size: 14})} 编辑目标</button></div>`
    : '';

  return `
    <div class="detail-dim">${dimNames[obj.dim] || obj.dim}</div>
    <div class="detail-name">${escapeHtml(obj.name)}</div>
    <div class="detail-desc">${escapeHtml(obj.desc)}</div>
    <div class="detail-section">
      <div class="detail-section-title">${icon('calendar', {size: 14})} 年度里程碑（2025-2027）</div>
      <table class="ms-table">
        <tr><th>年份</th><th>目标值</th><th>实际值</th><th>状态</th><th>重点级别</th></tr>
        ${rows}
      </table>
    </div>
    <div class="detail-section"><div class="detail-section-title">${icon('userPlain', {size: 14})} 负责人</div><span class="detail-tag">${escapeHtml(renderPerson(obj.owner)) || '未指定'}</span></div>
    <div class="detail-section"><div class="detail-section-title">${icon('link', {size: 14})} 系统关联</div>${kpiBadge}</div>
    ${editButton}
  `;
}

// ========== 因果链分析 ==========
export function getCausalChain(fromId, toId, links) {
  const upstream = new Set();
  const downstream = new Set();
  const linkIndices = new Set();

  const queueUp = [fromId];
  const queueDown = [toId];

  while (queueUp.length) {
    const id = queueUp.pop();
    if (upstream.has(id)) continue;
    upstream.add(id);
    links.forEach((l, idx) => {
      if (l.to === id) {
        linkIndices.add(idx);
        queueUp.push(l.from);
      }
    });
  }

  while (queueDown.length) {
    const id = queueDown.pop();
    if (downstream.has(id)) continue;
    downstream.add(id);
    links.forEach((l, idx) => {
      if (l.from === id) {
        linkIndices.add(idx);
        queueDown.push(l.to);
      }
    });
  }

  return { upstream, downstream, linkIndices };
}

// ========== 导出辅助 ==========
export function getObjById(objectives, id) {
  return objectives.find(o => o.id === id);
}
