import { getMeetings, addMeeting, persistMeetings, deleteMeetingByIndex } from '../data-store.js';
import { icon } from '../../../assets/js/icons.js';
import {
  computeAgendaTimeSlots,
  getReportAssets,
  formatAgendaSourceHint,
  getAgendaPostponeWarning,
  getActionStatusConfig,
} from '../utils/helpers.js';
import { getMaterialReviewInfo, persistReviewScores } from '../utils/reviewer.js';
import { getResolutionStatusConfig, normalizeResolution } from '../utils/resolution-helpers.js';
import { renderPerson } from '../../lib/employee-directory.js';

// ---- 编辑弹窗函数 ----
window._meetingEditData = null;
function openMeetingEditor(id) {
  const meetings = getMeetings();
  const m = meetings.find(x => x.id === id);
  if (!m) return;
  window._meetingEditData = JSON.parse(JSON.stringify(m));
  const ov = document.getElementById('meeting-editor-overlay');
  if (ov) ov.style.display = 'flex';
  renderEditorForm();
  if (typeof window.flushPendingAgendaAdoptions === 'function') {
    window.flushPendingAgendaAdoptions(window._meetingEditData);
  }
}
function closeMeetingEditor() {
  const ov = document.getElementById('meeting-editor-overlay');
  if (ov) {
    ov.style.display = 'none';
    ov.dataset.isNew = '';
  }
  window._meetingEditData = null;
}
// ---- 智能填充：根据会议名称自动匹配历史模板 / 关键词规则 ----
function extractTitleKeywords(title) {
  if (!title) return [];
  return title
    .replace(/\d+月份?/g, '').replace(/Q\d/gi, '').replace(/[\d年月日]/g, '')
    .split(/[\s_\-\/]+/).filter(w => w.length >= 2);
}
function findBestMeetingMatch(inputTitle) {
  const meetings = getMeetings();
  if (!meetings || meetings.length === 0) return null;
  const inputWords = extractTitleKeywords(inputTitle);
  if (inputWords.length === 0) return null;
  let best = null, bestScore = 0;
  for (const m of meetings) {
    const histWords = extractTitleKeywords(m.title);
    const common = inputWords.filter(w => histWords.includes(w));
    const score = common.length / Math.max(inputWords.length, histWords.length, 1);
    if (score > bestScore && score >= 0.3) { bestScore = score; best = m; }
  }
  return best;
}
function applyKeywordRules(title) {
  // 按具体程度排序：多关键词 > 单关键词，先匹配先返回
  const rules = [
    { keywords: ['落后','垂直'], scenario: 'lagging_vertical', level: 'L3' },
    { keywords: ['落后','行业'], scenario: 'lagging_vertical', level: 'L3' },
    { keywords: ['落后','客群'], scenario: 'lagging_vertical', level: 'L3' },
    { keywords: ['落后'], scenario: 'lagging_region', level: 'L3' },
    { keywords: ['营销本部'], scenario: 'hq_routine', level: 'L2' },
    { keywords: ['片联'], scenario: 'union_quarterly', level: 'L1' },
    { keywords: ['战区'], scenario: 'region_routine', level: 'L2' },
    { keywords: ['本部'], scenario: 'hq_routine', level: 'L2' },
    { keywords: ['经分会'], scenario: 'region_routine', level: 'L2' },
  ];
  for (const r of rules) {
    if (r.keywords.every(k => title.includes(k))) return { scenario: r.scenario, level: r.level };
  }
  return null;
}
function inferDateFromTitle(title) {
  if (!title) return null;
  const now = new Date();
  const year = now.getFullYear();

  // 1. 完整中文日期：2026年5月11日 / 2026年05月11号
  const fullZh = title.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})(?:日|号)/);
  if (fullZh) {
    return `${fullZh[1]}-${String(fullZh[2]).padStart(2, '0')}-${String(fullZh[3]).padStart(2, '0')}`;
  }

  // 2. 月日中文：5月11日 / 5月11号
  const mdZh = title.match(/(\d{1,2})月\s*(\d{1,2})(?:日|号)/);
  if (mdZh) {
    return `${year}-${String(mdZh[1]).padStart(2, '0')}-${String(mdZh[2]).padStart(2, '0')}`;
  }

  // 3. 数字日期：2026-05-11 / 2026/05/11 / 05-11 / 5/11
  const iso = title.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
  }

  // 4. 仅月份：5月 / 5月份
  const m = title.match(/(\d{1,2})月份?/);
  if (m) {
    return `${year}-${String(m[1]).padStart(2, '0')}-01`;
  }

  // 5. 季度：Q2
  const qm = title.match(/Q(\d)/i);
  if (qm) {
    const q = parseInt(qm[1]);
    const month = (q - 1) * 3 + 1;
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }

  return null;
}
/**
 * 智能填充会议表单：根据会议名称自动匹配历史模板/关键词规则
 */
function autoFillMeetingForm() {
  const titleInput = document.getElementById('edit-title');
  if (!titleInput) return;
  const title = titleInput.value.trim();
  if (!title || title.length < 1) return;
  const isNew = document.getElementById('edit-meeting-id')?.value?.startsWith('new_');
  if (!isNew) return; // 仅新建会议时自动填充

  const fieldMap = {
    'edit-date': 'date', 'edit-location': 'location', 'edit-host': 'host',
    'edit-recorder': 'recorder', 'edit-scenario': 'scenario', 'edit-level': 'level'
  };
  let source = null, matched = false;

  // 1. 历史模板匹配
  const hist = findBestMeetingMatch(title);
  if (hist) { source = hist; matched = true; }
  else {
    // 2. 关键词规则兜底
    const rule = applyKeywordRules(title);
    if (rule) source = rule;
  }
  const inferredDate = inferDateFromTitle(title);

  // 新建会议时的默认值，可被智能填充覆盖
  const DEFAULT_OVERRIDES = {
    'edit-scenario': ['union_quarterly'],
    'edit-level': ['L1'],
    'edit-status': ['planned']
  };

  // 填充空字段（或默认值）
  const filledIds = [];
  for (const [id, key] of Object.entries(fieldMap)) {
    const el = document.getElementById(id);
    if (!el) continue;
    const isDefaultOverride = isNew && (DEFAULT_OVERRIDES[id] || []).includes(el.value);
    const isUserEdited = window._userEditedFields?.has(key);
    // 日期允许根据会议名称实时推断，除非用户手动修改过
    if (key === 'date') {
      if (!inferredDate || isUserEdited) continue;
    } else if (el.value && !isDefaultOverride && !isUserEdited) {
      continue;
    }
    let val = null;
    if (key === 'date' && inferredDate) val = inferredDate;
    else if (source && source[key] !== undefined && source[key] !== '') val = source[key];
    if (!val && key === 'date' && inferredDate) val = inferredDate;
    if (val) {
      if (key === 'host' || key === 'recorder') {
        window.ensurePersonInput(id, val);
      } else {
        el.value = val;
      }
      if (window._meetingEditData) {
        window._meetingEditData[key] = val;
        if (key === 'date') window._meetingEditData.month = val.slice(0, 7);
      }
      filledIds.push(id);
    }
  }

  // 议程项模板（仅当议程为空或只有1个空白项时）
  if (matched && source.agenda_items && source.agenda_items.length > 0) {
    const agendaList = window._meetingEditData?.agenda_items || [];
    const hasRealAgenda = agendaList.some(a => a.title && a.title.trim());
    if (!hasRealAgenda) {
      const templateItems = source.agenda_items.map(a => ({
        type: a.type || 'budget_finance', title: '',
        duration: a.duration || 30, owner: '', material_link: ''
      }));
      if (window._meetingEditData) window._meetingEditData.agenda_items = templateItems;
      renderAgendaList();
      // 视觉提示：议程区域
      const agendaContainer = document.getElementById('edit-agenda-list');
      if (agendaContainer) {
        agendaContainer.style.border = '1px solid var(--primary)';
        agendaContainer.style.borderRadius = '6px';
        agendaContainer.style.padding = '4px';
        setTimeout(() => { agendaContainer.style.border = ''; agendaContainer.style.padding = ''; }, 2000);
      }
    }
  }

  // 视觉提示：被填充的字段边框变蓝
  filledIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.borderColor = 'var(--primary)'; el.style.transition = 'border-color 0.3s'; setTimeout(() => { el.style.borderColor = ''; }, 2000); }
  });
}

function renderEditorForm() {
  const d = window._meetingEditData;
  if (!d) return;
  // 每次打开编辑弹窗时清空用户编辑记录，避免弹窗间互相影响
  window._userEditedFields = new Set();
  document.getElementById('edit-meeting-id').value = d.id;
  document.getElementById('edit-title').value = d.title || '';
  document.getElementById('edit-date').value = d.date || '';
  const startTimeInput = document.getElementById('edit-start-time');
  if (startTimeInput) startTimeInput.value = d.startTime || '09:00';
  document.getElementById('edit-location').value = d.location || '';
  window.ensurePersonInput('edit-host', d.host || '');
  window.ensurePersonInput('edit-recorder', d.recorder || '');
  document.getElementById('edit-scenario').value = d.scenario || 'hq_routine';
  document.getElementById('edit-level').value = d.level || 'L2';
  document.getElementById('edit-status').value = d.status || 'planned';
  const kmsInput = document.getElementById('edit-kms-link');
  if (kmsInput) kmsInput.value = d.meeting_link || '';
  const preReportInput = document.getElementById('edit-pre-report-id');
  if (preReportInput) preReportInput.value = d.pre_report_id || '';
  const minutesInput = document.getElementById('edit-minutes-content');
  if (minutesInput) minutesInput.value = d.minutes_content || '';
  renderAgendaList();
  renderActionList();
  renderDecisionList();

  // 填充会议链上下游选项
  const upstreamSel = document.getElementById('edit-upstream');
  const downstreamSel = document.getElementById('edit-downstream');
  if (upstreamSel && downstreamSel) {
    const otherMeetings = getMeetings().filter(m => m.id !== d.id);
    const optionsHtml = otherMeetings.map(m => `<option value="${m.id}">${m.title} (${m.date})</option>`).join('');
    upstreamSel.innerHTML = '<option value="">无</option>' + optionsHtml;
    downstreamSel.innerHTML = '<option value="">无</option>' + optionsHtml;
    upstreamSel.value = d.upstreamMeeting || '';
    downstreamSel.value = d.downstreamMeeting || '';
    upstreamSel.onchange = () => { if (window._meetingEditData) window._meetingEditData.upstreamMeeting = upstreamSel.value || null; };
    downstreamSel.onchange = () => { if (window._meetingEditData) window._meetingEditData.downstreamMeeting = downstreamSel.value || null; };
  }

  // 草稿自动保存：表单变化实时同步到 _meetingEditData
  const fieldMap = {
    'edit-title': 'title', 'edit-date': 'date', 'edit-start-time': 'startTime', 'edit-location': 'location',
    'edit-host': 'host', 'edit-recorder': 'recorder',
    'edit-scenario': 'scenario', 'edit-level': 'level', 'edit-status': 'status', 'edit-kms-link': 'meeting_link', 'edit-pre-report-id': 'pre_report_id', 'edit-minutes-content': 'minutes_content'
  };
  // 追踪用户手动编辑的字段（autoFill 不覆盖用户手改的值）
  window._userEditedFields = window._userEditedFields || new Set();
  Object.entries(fieldMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) {
      el.oninput = () => {
        if (window._meetingEditData) {
          window._meetingEditData[key] = el.value;
        }
        if (key !== 'title') {
          window._userEditedFields.add(key);
        }
      };
    }
  });

  // 会议名称输入防抖自动填充（停止输入 500ms 后触发）
  const titleEl = document.getElementById('edit-title');
  if (titleEl) {
    let _autoFillTimer = null;
    titleEl.oninput = () => {
      if (window._meetingEditData) {
        window._meetingEditData.title = titleEl.value;
      }
      clearTimeout(_autoFillTimer);
      _autoFillTimer = setTimeout(() => { autoFillMeetingForm(); }, 500);
    };
  }
}
function renderAgendaList() {
  const d = window._meetingEditData;
  const container = window.getActiveEditorContainer()?.querySelector('#edit-agenda-list');
  if (!d || !container) return;
  const list = d.agenda_items || [];
  const timeSlots = computeAgendaTimeSlots(d);
  const batchMode = window._agendaReviewMode;
  container.innerHTML = list.map((item, idx) => {
    const url = item.material_link?.trim() || '';
    const reviewing = window._agendaReviewing.has(idx) || item.reviewStatus === 'reviewing';
    let scoreHtml = '';
    if (reviewing) {
      scoreHtml = `<span style="padding: 2px 8px; font-size: 11px; border-radius: 4px; background: var(--primary-light); color: var(--primary); white-space: nowrap;">⏳ 评审中...</span>`;
    } else if (!url) {
      scoreHtml = `<span style="padding: 2px 8px; font-size: 11px; border-radius: 4px; background: var(--bg-page); color: var(--text-tertiary); white-space: nowrap; border: 1px solid var(--border-light);">${icon('search', {size: 14})} 送审</span>`;
    } else {
      const info = getMaterialReviewInfo(url);
      if (info) {
        const color = info.score >= 80 ? 'var(--success)' : info.score >= 60 ? 'var(--warning)' : 'var(--danger)';
        scoreHtml = `<span onclick="event.stopPropagation(); openAgendaReviewDetail('${url.replace(/'/g, "\\'")}')" style="padding: 2px 8px; font-size: 11px; border-radius: 4px; background: ${color}18; color: ${color}; cursor: pointer; white-space: nowrap; font-weight: 600;">${icon('check', {size: 14})} ${info.score}分</span>`;
      } else {
        scoreHtml = `<button type="button" onclick="event.stopPropagation(); reviewSingleAgenda(${idx})" style="padding: 2px 8px; font-size: 11px; border: 1px solid var(--primary); border-radius: 4px; background: var(--primary-light); color: var(--primary); cursor: pointer; white-space: nowrap;">${icon('search', {size: 14})} 送审</button>`;
      }
    }
    // G2: 审核状态徽标
    const reviewStatusHtml = item.reviewStatus === 'reviewed'
      ? `<span style="padding: 1px 6px; font-size: 10px; border-radius: 4px; background: rgba(16,185,129,0.08); color: var(--success); white-space: nowrap; border: 1px solid rgba(16,185,129,0.2);">已审核</span>`
      : item.reviewStatus === 'failed'
      ? `<span style="padding: 1px 6px; font-size: 10px; border-radius: 4px; background: rgba(245,34,45,0.06); color: var(--danger); white-space: nowrap; border: 1px solid rgba(245,34,45,0.2);">审核失败</span>`
      : '';
    const checkbox = batchMode ? `<input type="checkbox" ${window._agendaBatchSelections.has(idx) ? 'checked' : ''} onchange="updateBatchReviewSelection(${idx}, this.checked)" style="cursor: pointer;" ${!url ? 'disabled' : ''} />` : '';
    return `
    <div style="margin-bottom: 12px; padding: 10px; background: var(--bg-page); border-radius: 8px; border: 1px solid var(--border-light);">
      <div style="display: flex; align-items: flex-start; gap: 8px;">
        ${batchMode ? `<div style="width: 18px; display: flex; align-items: center; padding-top: 6px;">${checkbox}</div>` : `<div style="width: 22px; display: flex; align-items: center; justify-content: center; padding-top: 6px;"><span style="font-size: 12px; color: var(--text-tertiary);">${idx + 1}.</span></div>`}
        <div style="flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0;">
          <div style="font-size: 11px; color: var(--text-secondary); font-weight: 500;">${icon('clock', {size: 14})} ${timeSlots[idx]?.start || '--:--'} ~ ${timeSlots[idx]?.end || '--:--'} · ${item.duration || 0} 分钟</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <select onchange="updateAgendaType(${idx}, this.value)" style="padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary); width: 110px; flex-shrink: 0;">
              ${Object.entries(window.AGENDA_TYPE_LABELS).map(([k, v]) => `<option value="${k}" ${item.type === k ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
            <select onchange="updateAgendaStatus(${idx}, this.value)" style="padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary); width: 90px; flex-shrink: 0;">
              <option value="planned" ${item.status === 'planned' ? 'selected' : ''}>未开始</option>
              <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>已完成</option>
              <option value="postponed" ${item.status === 'postponed' ? 'selected' : ''}>已顺延</option>
            </select>
            <input type="text" value="${item.title}" onchange="updateAgendaTitle(${idx}, this.value)" placeholder="议程标题" style="flex: 1; min-width: 0; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary);" />
            <input type="number" value="${item.duration}" onchange="updateAgendaDuration(${idx}, this.value)" placeholder="分钟" min="1" style="width: 60px; flex-shrink: 0; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary);" />
            <input type="text" value="${item.material_link || ''}" onchange="updateAgendaMaterialLink(${idx}, this.value)" placeholder="材料链接" style="width: 120px; flex-shrink: 0; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary);" />
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="text" value="${(item.data_views || []).join(', ')}" onchange="updateAgendaDataViews(${idx}, this.value)" placeholder="关联报表 ID，逗号分隔" style="flex: 1; min-width: 0; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 11px; background: var(--bg-card); color: var(--text-primary);" />
            <input type="text" value="${item.pre_report_section || ''}" onchange="updateAgendaPreReportSection(${idx}, this.value)" placeholder="报告章节，如 §2.1" style="width: 130px; flex-shrink: 0; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 11px; background: var(--bg-card); color: var(--text-primary);" />
            <button type="button" onclick="openReportAssetManager(${idx})" style="padding: 4px 8px; font-size: 11px; border: 1px solid var(--primary); border-radius: 4px; background: var(--primary-light); color: var(--primary); cursor: pointer; white-space: nowrap; flex-shrink: 0;">${icon('chartBar', {size: 14})} 报表</button>
          </div>
          ${(() => {
            const warning = getAgendaPostponeWarning(item);
            const hint = formatAgendaSourceHint(item, getMeetings());
            return (warning || hint) ? `<div style="display: flex; align-items: center; gap: 8px; font-size: 11px; flex-wrap: wrap;">${warning ? `<span style="color: var(--danger); font-weight: 600;">${warning}</span>` : ''}${hint ? `<span style="color: var(--warning);">${hint}</span>` : ''}</div>` : '';
          })()}
        </div>
        <div style="display: flex; align-items: center; gap: 8px; padding-top: 1px; flex-shrink: 0;">
          <div style="width: 72px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;">${scoreHtml}${reviewStatusHtml}</div>
          <input type="text" id="edit-agenda-owner-${idx}" value="${typeof item.owner === 'object' ? (item.owner.displayName || item.owner.name || '') : (item.owner || '')}" onchange="updateAgendaOwner(${idx})" placeholder="负责人" style="width: 80px; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary);" />
          ${item.status !== 'postponed' ? `<button type="button" onclick="event.stopPropagation(); openPostponeTargetSelector(window._meetingEditData.id, ${idx})" style="padding: 4px 8px; font-size: 11px; border: 1px solid var(--warning); border-radius: 4px; background: rgba(245,158,11,0.08); color: var(--warning); cursor: pointer; white-space: nowrap; flex-shrink: 0;">${icon('caretRight', {size: 12})} 顺延</button>` : ''}
          <button type="button" onclick="moveAgendaItem(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} style="padding: 4px 8px; font-size: 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-page); cursor: pointer; color: var(--text-secondary);">${icon('caretUp', {size: 12})}</button>
          <button type="button" onclick="moveAgendaItem(${idx}, 1)" ${idx === list.length - 1 ? 'disabled' : ''} style="padding: 4px 8px; font-size: 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-page); cursor: pointer; color: var(--text-secondary);">${icon('caretDown', {size: 12})}</button>
          <button type="button" onclick="removeAgendaItem(${idx})" ${list.length <= 1 ? 'disabled' : ''} style="padding: 4px 8px; font-size: 12px; border: 1px solid var(--danger); border-radius: 4px; background: rgba(245,34,45,0.08); cursor: pointer; color: var(--danger);">${icon('x', {size: 12})}</button>
        </div>
      </div>
    </div>
  `;
  }).join('');
  const total = list.reduce((s, a) => s + (parseInt(a.duration) || 0), 0);
  document.getElementById('edit-agenda-total').textContent = '总时长：' + total + ' 分钟';
  if (window.ensurePersonInput) {
    list.forEach((item, idx) => {
      window.ensurePersonInput('edit-agenda-owner-' + idx, item.owner || '', {
        onChange: (val) => {
          if (window._meetingEditData?.agenda_items?.[idx]) {
            window._meetingEditData.agenda_items[idx].owner = val || '';
          }
        },
      });
    });
  }
}
function updateAgendaType(idx, val) { if (window._meetingEditData?.agenda_items?.[idx]) window._meetingEditData.agenda_items[idx].type = val; }
function updateAgendaStatus(idx, val) { if (window._meetingEditData?.agenda_items?.[idx]) { window._meetingEditData.agenda_items[idx].status = val; renderAgendaList(); } }
function updateAgendaTitle(idx, val) { if (window._meetingEditData?.agenda_items?.[idx]) window._meetingEditData.agenda_items[idx].title = val; }
function updateAgendaDuration(idx, val) { if (window._meetingEditData?.agenda_items?.[idx]) window._meetingEditData.agenda_items[idx].duration = parseInt(val) || 0; renderAgendaList(); }
function updateAgendaOwner(idx, val) {
  if (!window._meetingEditData?.agenda_items?.[idx]) return;
  const inputId = 'edit-agenda-owner-' + idx;
  const person = window.getPersonValue ? window.getPersonValue(inputId) : null;
  window._meetingEditData.agenda_items[idx].owner = person || (typeof val === 'string' ? val : '');
}
function updateAgendaMaterialLink(idx, val) { if (window._meetingEditData?.agenda_items?.[idx]) window._meetingEditData.agenda_items[idx].material_link = val; }
function updateAgendaDataViews(idx, val) {
  if (!window._meetingEditData?.agenda_items?.[idx]) return;
  const ids = val.split(',').map(s => s.trim()).filter(Boolean);
  window._meetingEditData.agenda_items[idx].data_views = ids;
}
function updateAgendaPreReportSection(idx, val) {
  if (window._meetingEditData?.agenda_items?.[idx]) window._meetingEditData.agenda_items[idx].pre_report_section = val.trim();
}
function addAgendaItem() {
  if (!window._meetingEditData) return;
  if (!window._meetingEditData.agenda_items) window._meetingEditData.agenda_items = [];
  const newAgendaId = 'ag_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  window._meetingEditData.agenda_items.push({ id: newAgendaId, type: 'goal_management', title: '新议程项', duration: 15, owner: '', material_link: '', data_views: [], pre_report_section: '', status: 'planned', originalAgendaId: newAgendaId, postponedCount: 0, carriedFromAgendaId: null, carriedFromMeetingId: null, postponedHistory: [] });
  renderAgendaList();
  renderDecisionList();
}
function removeAgendaItem(idx) {
  if (!window._meetingEditData?.agenda_items) return;
  if (window._meetingEditData.agenda_items.length <= 1) { window.showToast('至少保留一个议程项', 'warning'); return; }
  const removed = window._meetingEditData.agenda_items[idx];
  const removedId = removed && removed.id;
  window._meetingEditData.agenda_items.splice(idx, 1);
  // 清理被删除议程关联的决议来源与行动项来源
  if (removedId) {
    if (window._meetingEditData.decisions) {
      window._meetingEditData.decisions.forEach(d => {
        if (d.sourceTopicId === removedId) d.sourceTopicId = '';
      });
    }
    if (window._meetingEditData.actions) {
      window._meetingEditData.actions.forEach(a => {
        if (a.sourceAgendaId === removedId) a.sourceAgendaId = '';
      });
    }
  }
  renderAgendaList();
  renderDecisionList();
  renderActionList();
}
function moveAgendaItem(idx, dir) {
  if (!window._meetingEditData?.agenda_items) return;
  const arr = window._meetingEditData.agenda_items;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  renderAgendaList();
}

// ---- 议程材料评审（ reviewer API ） ----
window._agendaReviewMode = false;
window._agendaBatchSelections = new Set();
window._agendaReviewing = new Set();
window._batchReviewTaskId = null;
window._batchReviewTimer = null;

function getReviewerProxyUrl() {
  const custom = DSTE.Storage.getString('meetingReviewerProxyUrl');
  if (custom) return custom;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:8766';
  return '';
}
function getReviewerScene(scenario) {
  const map = { lagging_region: 'lagging-region-review', lagging_vertical: 'vertical-segment-review' };
  return map[scenario] || 'general-topic-review';
}
function renderAgendaReviewScoreHtml(url) {
  if (!url) return '';
  const info = getMaterialReviewInfo(url);
  if (!info) return `<button type="button" onclick="event.stopPropagation(); reviewSingleAgenda(this.dataset.idx)" data-idx="" style="padding: 2px 8px; font-size: 11px; border: 1px solid var(--primary); border-radius: 4px; background: var(--primary-light); color: var(--primary); cursor: pointer; white-space: nowrap;">${icon('search', {size: 14})} 送审</button>`;
  const color = info.score >= 80 ? 'var(--success)' : info.score >= 60 ? 'var(--warning)' : 'var(--danger)';
  return `<span onclick="event.stopPropagation(); openAgendaReviewDetail('${url.replace(/'/g, "\\'")}')" style="padding: 2px 8px; font-size: 11px; border-radius: 4px; background: ${color}18; color: ${color}; cursor: pointer; white-space: nowrap; font-weight: 600;">${icon('check', {size: 14})} ${info.score}分</span>`;
}
function toggleAgendaReviewMode() {
  window._agendaReviewMode = !window._agendaReviewMode;
  window._agendaBatchSelections.clear();
  const batchBtn = document.getElementById('batch-review-btn');
  const toggleBtn = event?.target;
  if (window._agendaReviewMode) {
    const d = window._meetingEditData;
    (d?.agenda_items || []).forEach((a, i) => { if (a.material_link?.trim()) window._agendaBatchSelections.add(i); });
    if (batchBtn) batchBtn.style.display = 'inline-block';
    if (toggleBtn) toggleBtn.style.display = 'none';
  } else {
    if (batchBtn) batchBtn.style.display = 'none';
    if (toggleBtn) toggleBtn.style.display = 'inline-block';
  }
  if (batchBtn) batchBtn.textContent = `${icon('package', {size: 14})} 批量送审 (${window._agendaBatchSelections.size})`;
  renderAgendaList();
}
function updateBatchReviewSelection(idx, checked) {
  if (checked) window._agendaBatchSelections.add(idx);
  else window._agendaBatchSelections.delete(idx);
  const count = window._agendaBatchSelections.size;
  const btn = document.getElementById('batch-review-btn');
  if (btn) btn.textContent = `${icon('package', {size: 14})} 批量送审 (${count})`;
}

/**
 * 将材料审核结果同步到议程项缓存（additive，不修改 reviewer 逻辑）
 * @param {Object} item - 议程项
 * @param {string} url - 材料链接
 * @param {string} [status] - 状态：reviewed / failed / reviewing
 */
function syncAgendaItemReviewStatus(item, url, status = 'reviewed') {
  if (!item || !url) return;
  const info = getMaterialReviewInfo(url);
  item.reviewStatus = status;
  if (info) {
    item.reviewScore = info.score || 0;
    item.lastReviewedAt = new Date(info.lastReviewAt || Date.now()).toISOString();
  } else if (status === 'failed') {
    item.reviewScore = 0;
    item.lastReviewedAt = new Date().toISOString();
  }
  // 报告链接暂不存储完整报告，仅保留材料链接作为关联
  item.reviewReportUrl = url;
}

async function reviewSingleAgenda(idx) {
  const d = window._meetingEditData;
  if (!d?.agenda_items?.[idx]) return;
  const item = d.agenda_items[idx];
  const url = item.material_link?.trim();
  if (!url) { window.showToast('请先填写材料链接', 'warning'); return; }
  if (window._agendaReviewing.has(idx)) return;
  window._agendaReviewing.add(idx);
  renderAgendaList();
  const proxyUrl = getReviewerProxyUrl();
  try {
    const resp = await fetch(proxyUrl + '/api/review', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, scene: getReviewerScene(d.scenario) })
    });
    const data = await resp.json();
    if (data.success) {
      const map = DSTE.Storage.get('dste_review_scores', {});
      const cur = map[url];
      if (!cur || (data.total_score || 0) > cur.maxScore) {
        map[url] = { maxScore: data.total_score || 0, lastReviewAt: Date.now() };
        persistReviewScores(map);
      }
      syncAgendaItemReviewStatus(item, url, 'reviewed');
    } else {
      window.showToast('评审失败：' + (data.error || '未知错误'), 'error');
      syncAgendaItemReviewStatus(item, url, 'failed');
    }
  } catch (e) {
    window.showToast('评审服务不可用，请检查 reviewer 后端是否启动（' + proxyUrl + '）', 'error');
    syncAgendaItemReviewStatus(item, url, 'failed');
  }
  window._agendaReviewing.delete(idx);
  renderAgendaList();
}
function openBatchReviewModal() {
  const d = window._meetingEditData;
  const count = window._agendaBatchSelections.size;
  if (count === 0) { window.showToast('请至少选择一个议程项', 'warning'); return; }
  const scene = getReviewerScene(d?.scenario);
  const sceneName = { 'general-topic-review': '通用议题材料审核', 'lagging-region-review': '落后战区业绩承诺会', 'vertical-segment-review': '垂直客群-落后述职' }[scene] || scene;
  document.getElementById('batch-review-scene-display').textContent = sceneName;
  document.getElementById('batch-review-count').textContent = count;
  document.getElementById('batch-review-progress').style.display = 'none';
  document.getElementById('batch-review-confirm-btn').style.display = 'inline-block';
  document.getElementById('batch-review-overlay').style.display = 'flex';
}
function closeBatchReviewModal() {
  document.getElementById('batch-review-overlay').style.display = 'none';
  if (window._batchReviewTimer) { clearInterval(window._batchReviewTimer); window._batchReviewTimer = null; }
}
async function startBatchReview() {
  const d = window._meetingEditData;
  const indices = Array.from(window._agendaBatchSelections).sort((a, b) => a - b);
  const urls = indices.map(i => d.agenda_items[i]?.material_link?.trim()).filter(Boolean);
  if (urls.length === 0) { window.showToast('没有有效的材料链接', 'warning'); return; }
  const scene = getReviewerScene(d?.scenario);
  const proxyUrl = getReviewerProxyUrl();
  document.getElementById('batch-review-confirm-btn').style.display = 'none';
  document.getElementById('batch-review-progress').style.display = 'block';
  // G2: 标记选中议程项为评审中
  indices.forEach(idx => {
    const item = d.agenda_items[idx];
    if (item && item.material_link?.trim()) {
      syncAgendaItemReviewStatus(item, item.material_link.trim(), 'reviewing');
    }
  });
  renderAgendaList();
  try {
    const resp = await fetch(proxyUrl + '/api/batch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls, scene_id: scene })
    });
    const data = await resp.json();
    if (!data.success) { window.showToast('创建批量任务失败：' + (data.error || '未知错误'), 'error'); closeBatchReviewModal(); return; }
    window._batchReviewTaskId = data.task_id;
    let pollCount = 0;
    window._batchReviewTimer = setInterval(async () => {
      pollCount++;
      try {
        const pResp = await fetch(proxyUrl + '/api/batch/' + data.task_id);
        const pData = await pResp.json();
        if (pData.success && pData.task) {
          const t = pData.task;
          const pct = t.total > 0 ? Math.round(((t.completed || 0) / t.total) * 100) : 0;
          document.getElementById('batch-review-progress-bar').style.width = pct + '%';
          const statusLabel = t.status === 'running' ? '评审中' : t.status === 'completed' ? '已完成' : t.status === 'failed' ? '失败' : t.status;
          document.getElementById('batch-review-progress-text').textContent = `${t.completed || 0}/${t.total || 0} (${t.failed || 0} 失败) · ${statusLabel}`;
          if (t.status === 'completed' || t.status === 'failed') {
            clearInterval(window._batchReviewTimer); window._batchReviewTimer = null;
            const rResp = await fetch(proxyUrl + '/api/batch/' + data.task_id + '/results');
            const rData = await rResp.json();
            if (rData.success) {
              const map = DSTE.Storage.get('dste_review_scores', {});
              const urlToResult = new Map();
              for (const r of rData.results || []) {
                if (r.status === 'completed' && r.total_score != null) {
                  const cur = map[r.url];
                  if (!cur || r.total_score > cur.maxScore) {
                    map[r.url] = { maxScore: r.total_score, lastReviewAt: Date.now(), dimensionScores: r.dimension_scores || {}, issues: (r.issues || []).slice(0, 5), report: r.report || '' };
                  }
                  urlToResult.set(r.url, { success: true, score: r.total_score });
                } else {
                  urlToResult.set(r.url, { success: false });
                }
              }
              persistReviewScores(map);
              // G2: 同步批量评审结果到议程项
              indices.forEach(idx => {
                const item = d.agenda_items[idx];
                const url = item?.material_link?.trim();
                if (!url) return;
                const result = urlToResult.get(url);
                syncAgendaItemReviewStatus(item, url, result?.success ? 'reviewed' : 'failed');
              });
            }
            renderAgendaList();
            setTimeout(() => closeBatchReviewModal(), 800);
            return;
          }
          // 超时保护：轮询超过 80 次（约 2 分钟）后提示用户
          if (pollCount > 80) {
            clearInterval(window._batchReviewTimer); window._batchReviewTimer = null;
            document.getElementById('batch-review-progress-text').textContent = '评审耗时较长，后台仍在处理，请稍后到「会议材料审核」页面查看结果';
          }
        }
      } catch (e) { /* ignore polling errors */ }
    }, 1500);
  } catch (e) {
    window.showToast('批量评审服务不可用，请检查 reviewer 后端是否启动', 'error');
    closeBatchReviewModal();
  }
}
window._agendaReviewDetailUrl = '';
function openAgendaReviewDetail(url) {
  const info = getMaterialReviewInfo(url);
  if (!info) return;
  window._agendaReviewDetailUrl = url;
  const color = info.score >= 80 ? 'var(--success)' : info.score >= 60 ? 'var(--warning)' : 'var(--danger)';
  document.getElementById('agenda-review-detail-score').innerHTML = `<span style="font-size: 32px; font-weight: 700; color: ${color};">${info.score}</span><span style="font-size: 14px; color: var(--text-secondary);"> 分</span>`;
  document.getElementById('agenda-review-detail-url').textContent = url;
  document.getElementById('agenda-review-detail-time').textContent = info.lastReviewAt ? new Date(info.lastReviewAt).toLocaleString() : '-';
  const label = info.score >= 90 ? '卓越' : info.score >= 80 ? '良好' : info.score >= 60 ? '合格' : '待改进';
  const labelColor = info.score >= 80 ? 'var(--success)' : info.score >= 60 ? 'var(--warning)' : 'var(--danger)';
  document.getElementById('agenda-review-detail-label').innerHTML = `<span style="padding: 2px 10px; border-radius: 4px; background: ${labelColor}18; color: ${labelColor}; font-size: 13px; font-weight: 600;">${label}</span>`;
  // 维度得分
  const dims = Object.entries(info.dimensionScores || {});
  document.getElementById('agenda-review-detail-dims').innerHTML = dims.length === 0 ? '<div style="font-size: 12px; color: var(--text-tertiary); text-align: center; padding: 8px;">暂无维度得分</div>' : dims.map(([k, v]) => {
    const barColor = v >= 25 ? 'var(--success)' : v >= 15 ? 'var(--warning)' : 'var(--danger)';
    return `<div style="margin-bottom: 8px;"><div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;"><span style="color: var(--text-secondary);">${k}</span><span style="font-weight: 600; color: var(--text-primary);">${v}</span></div><div style="height: 4px; background: var(--bg-page); border-radius: 2px;"><div style="height: 100%; width: ${Math.min(100, v)}%; background: ${barColor}; border-radius: 2px;"></div></div></div>`;
  }).join('');
  // 问题清单
  const issues = info.issues || [];
  document.getElementById('agenda-review-detail-issues').innerHTML = issues.length === 0 ? '<div style="font-size: 12px; color: var(--text-tertiary); text-align: center; padding: 8px;">未发现问题</div>' : issues.map(i => {
    const issueColor = i.level === '致命' ? 'var(--danger)' : i.level === '严重' ? 'var(--danger)' : i.level === '警告' ? 'var(--warning)' : 'var(--info)';
    return `<div style="display: flex; gap: 6px; align-items: flex-start; margin-bottom: 6px; font-size: 12px;"><span style="padding: 1px 5px; border-radius: 3px; background: ${issueColor}18; color: ${issueColor}; font-weight: 600; white-space: nowrap; flex-shrink: 0;">${i.level}</span><span style="color: var(--text-secondary); line-height: 1.4;">${i.description}</span></div>`;
  }).join('');
  // 缓存完整报告
  window._agendaReviewDetailReport = info.report || '';
  showAgendaReviewSummary();
  document.getElementById('agenda-review-detail-overlay').style.display = 'flex';
}
async function reReviewAgendaMaterial() {
  const url = window._agendaReviewDetailUrl;
  if (!url) return;
  const d = window._meetingEditData;
  const scene = getReviewerScene(d?.scenario);
  const proxyUrl = getReviewerProxyUrl();
  const btn = document.getElementById('agenda-review-detail-rereview-btn');
  if (btn) { btn.textContent = '⏳ 评审中...'; btn.disabled = true; }
  try {
    const resp = await fetch(proxyUrl + '/api/review', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, scene })
    });
    const data = await resp.json();
    if (data.success) {
      const map = DSTE.Storage.get('dste_review_scores', {});
      const cur = map[url];
      if (!cur || (data.total_score || 0) > cur.maxScore) {
        map[url] = { maxScore: data.total_score || 0, lastReviewAt: Date.now(), dimensionScores: data.dimension_scores || {}, issues: (data.issues || []).slice(0, 5), report: data.report || '' };
        persistReviewScores(map);
      }
      // 刷新弹窗内容
      openAgendaReviewDetail(url);
      // 刷新议程列表
      renderAgendaList();
      window.showToast(`重新评审完成 ${icon('check', {size: 14})}`, 'success');
    } else {
      window.showToast('评审失败：' + (data.error || '未知错误'), 'error');
    }
  } catch (e) {
    window.showToast('评审服务不可用，请检查 reviewer 后端是否启动', 'error');
  }
  if (btn) { btn.textContent = `${icon('arrowsClockwise', {size: 14})} 重新送审`; btn.disabled = false; }
}
function showAgendaReviewSummary() {
  document.getElementById('agenda-review-detail-summary').style.display = 'block';
  document.getElementById('agenda-review-detail-report').style.display = 'none';
  document.getElementById('agenda-review-detail-report-btn').style.display = 'inline-block';
  document.getElementById('agenda-review-detail-back-btn').style.display = 'none';
}
function showAgendaReviewReport() {
  const report = window._agendaReviewDetailReport || '';
  const el = document.getElementById('agenda-review-detail-report-body');
  if (report) {
    // 简单 markdown → HTML：标题、粗体、换行
    const html = report
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^#{1,6}\s+(.+)$/gm, '<div style="font-size:14px;font-weight:700;color:var(--text-primary);margin:10px 0 4px;">$1</div>')
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary);">$1</strong>')
      .replace(/\n/g, '<br>');
    el.innerHTML = html;
  } else {
    el.innerHTML = '<div style="font-size:12px;color:var(--text-tertiary);text-align:center;padding:20px;">暂无完整报告缓存，请重新送审获取</div>';
  }
  document.getElementById('agenda-review-detail-summary').style.display = 'none';
  document.getElementById('agenda-review-detail-report').style.display = 'block';
  document.getElementById('agenda-review-detail-report-btn').style.display = 'none';
  document.getElementById('agenda-review-detail-back-btn').style.display = 'inline-block';
}
function closeAgendaReviewDetail() {
  document.getElementById('agenda-review-detail-overlay').style.display = 'none';
}

// ---- 行动项编辑 ----
function renderActionList() {
  const d = window._meetingEditData;
  const container = window.getActiveEditorContainer()?.querySelector('#edit-action-list');
  if (!d || !container) return;
  const list = d.actions || [];
  if (list.length === 0) {
    container.innerHTML = '<div style="font-size: 12px; color: var(--text-tertiary); padding: 8px 0;">暂无行动项，点击上方按钮添加</div>';
    return;
  }
  container.innerHTML = list.map((item, idx) => `
    <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; padding: 10px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-page); border-left: 3px solid ${getActionStatusConfig(item.status).color};">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 12px; color: var(--text-tertiary); width: 18px; text-align: right;">${idx + 1}.</span>
        <input type="text" value="${item.content}" onchange="updateActionContent(${idx}, this.value)" placeholder="行动内容" style="flex: 1; min-width: 0; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary);" />
        <input type="text" id="edit-action-owner-${idx}" value="${typeof item.owner === 'object' ? (item.owner.displayName || item.owner.name || '') : (item.owner || '')}" onchange="updateActionOwner(${idx})" placeholder="负责人" style="width: 80px; flex-shrink: 0; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary);" />
        <input type="date" value="${item.deadline}" onchange="updateActionDeadline(${idx}, this.value)" style="width: 120px; flex-shrink: 0; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary);" />
        <select onchange="updateActionStatus(${idx}, this.value)" style="width: 90px; flex-shrink: 0; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary);">
          <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>待办</option>
          <option value="in_progress" ${item.status === 'in_progress' ? 'selected' : ''}>进行中</option>
          <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>已完成</option>
        </select>
        <button type="button" onclick="removeActionItem(${idx})" style="padding: 4px 8px; font-size: 12px; border: 1px solid var(--danger); border-radius: 4px; background: rgba(245,34,45,0.08); cursor: pointer; color: var(--danger);">${icon('x', {size: 12})}</button>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 6px; flex: 0 0 auto;">
          <span style="font-size: 11px; color: var(--text-tertiary); white-space: nowrap;">关联议程</span>
          <select onchange="updateActionSourceAgenda(${idx}, this.value)" style="width: 140px; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary); cursor: pointer;">
            <option value="">无</option>
            ${(d.agenda_items || []).map(a => `<option value="${a.id || ''}" ${item.sourceAgendaId === (a.id || '') ? 'selected' : ''}>${window.escapeHtml((a.title || '未命名议题').slice(0, 18))}</option>`).join('')}
          </select>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; flex: 0 0 auto;">
          <span style="font-size: 11px; color: var(--text-tertiary); white-space: nowrap;">关联决议</span>
          <select onchange="updateActionSourceDecision(${idx}, this.value)" style="width: 160px; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary); cursor: pointer;">
            <option value="">无</option>
            ${(d.decisions || []).map((dec, di) => `<option value="${dec.id || ''}" ${item.sourceDecisionId === (dec.id || '') ? 'selected' : ''}>${di + 1}. ${window.escapeHtml((dec.content || '未命名决议').slice(0, 16))}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
  `).join('');
  if (window.ensurePersonInput) {
    list.forEach((item, idx) => {
      window.ensurePersonInput('edit-action-owner-' + idx, item.owner || '', {
        onChange: (val) => {
          if (window._meetingEditData?.actions?.[idx]) {
            window._meetingEditData.actions[idx].owner = val || '';
          }
        },
      });
    });
  }
}
function updateActionContent(idx, val) { if (window._meetingEditData?.actions?.[idx]) window._meetingEditData.actions[idx].content = val; }
function updateActionOwner(idx, val) {
  if (!window._meetingEditData?.actions?.[idx]) return;
  const inputId = 'edit-action-owner-' + idx;
  const person = window.getPersonValue ? window.getPersonValue(inputId) : null;
  window._meetingEditData.actions[idx].owner = person || (typeof val === 'string' ? val : '');
}
function updateActionDeadline(idx, val) { if (window._meetingEditData?.actions?.[idx]) window._meetingEditData.actions[idx].deadline = val; }
function updateActionStatus(idx, val) { if (window._meetingEditData?.actions?.[idx]) window._meetingEditData.actions[idx].status = val; }
function updateActionSourceAgenda(idx, val) { if (window._meetingEditData?.actions?.[idx]) window._meetingEditData.actions[idx].sourceAgendaId = val; }
function updateActionSourceDecision(idx, val) { if (window._meetingEditData?.actions?.[idx]) window._meetingEditData.actions[idx].sourceDecisionId = val; }
function addActionItem() {
  if (!window._meetingEditData) return;
  if (!window._meetingEditData.actions) window._meetingEditData.actions = [];
  const today = new Date().toISOString().split('T')[0];
  window._meetingEditData.actions.push({ id: 'A' + Date.now() + '_' + Math.floor(Math.random() * 1000), content: '', owner: '', deadline: today, status: 'pending', sourceAgendaId: '', sourceDecisionId: '' });
  renderActionList();
}
function removeActionItem(idx) {
  if (!window._meetingEditData?.actions) return;
  window._meetingEditData.actions.splice(idx, 1);
  renderActionList();
}

// ---- 决策编辑 ----
function renderDecisionList() {
  const d = window._meetingEditData;
  const container = window.getActiveEditorContainer()?.querySelector('#edit-decision-list');
  if (!d || !container) return;
  const list = d.decisions || [];
  if (list.length === 0) {
    container.innerHTML = '<div style="font-size: 12px; color: var(--text-tertiary); padding: 8px 0;">暂无决议，点击上方按钮添加</div>';
    return;
  }
  const statusOptions = [
    { value: 'pending', label: '待审批' },
    { value: 'approved', label: '已通过' },
    { value: 'closed', label: '已闭环' },
  ];
  container.innerHTML = list.map((item, idx) => {
    const cfg = getResolutionStatusConfig(item.status);
    return `
    <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; padding: 10px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-page); border-left: 3px solid ${cfg.color};">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 12px; color: var(--text-tertiary); width: 18px; text-align: right;">${idx + 1}.</span>
        <input type="text" value="${item.content}" onchange="updateDecisionContent(${idx}, this.value)" placeholder="决议内容" style="flex: 1; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary);" />
        <input type="text" id="edit-decision-owner-${idx}" value="${typeof item.owner === 'object' ? (item.owner.displayName || item.owner.name || '') : (item.owner || '')}" onchange="updateDecisionOwner(${idx})" placeholder="责任人" style="width: 80px; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary);" />
        <input type="date" value="${item.deadline}" onchange="updateDecisionDeadline(${idx}, this.value)" style="width: 120px; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary);" />
        <select onchange="updateDecisionStatus(${idx}, this.value)" style="width: 100px; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary);">
          ${statusOptions.map(o => `<option value="${o.value}" ${item.status === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
        <button type="button" onclick="removeDecisionItem(${idx})" style="padding: 4px 8px; font-size: 12px; border: 1px solid var(--danger); border-radius: 4px; background: rgba(245,34,45,0.08); cursor: pointer; color: var(--danger);">${icon('x', {size: 12})}</button>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 6px; flex: 0 0 auto;">
          <span style="font-size: 11px; color: var(--text-tertiary); white-space: nowrap;">来源</span>
          <select onchange="updateDecisionSourceTopic(${idx}, this.value)" style="width: 160px; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary); cursor: pointer;">
            <option value="">无</option>
            ${(d.agenda_items || []).map(a => `<option value="${a.id || ''}" ${item.sourceTopicId === (a.id || '') ? 'selected' : ''}>${window.escapeHtml((a.title || '未命名议题').slice(0, 24))}</option>`).join('')}
          </select>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; flex: 0 0 auto;">
          <span style="font-size: 11px; color: var(--text-tertiary); white-space: nowrap;">审批</span>
          <input type="text" id="edit-decision-decider-${idx}" value="${typeof item.decider === 'object' ? (item.decider.displayName || item.decider.name || '') : (item.decider || '')}" onchange="updateDecisionDecider(${idx})" placeholder="审批人" style="width: 90px; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary);" />
        </div>
        <div style="display: flex; align-items: center; gap: 6px; flex: 0 0 auto;">
          <span style="font-size: 11px; color: var(--text-tertiary); white-space: nowrap;">${icon('link', {size: 14})} KMS</span>
          <input type="url" value="${item.kmsUrl || ''}" onchange="updateDecisionKmsUrl(${idx}, this.value)" placeholder="KMS 链接" style="width: 220px; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; background: var(--bg-card); color: var(--text-primary);" />
        </div>
      </div>
    </div>
  `;
  }).join('');
  if (window.ensurePersonInput) {
    list.forEach((item, idx) => {
      window.ensurePersonInput('edit-decision-owner-' + idx, item.owner || '', {
        onChange: (val) => {
          if (window._meetingEditData?.decisions?.[idx]) {
            window._meetingEditData.decisions[idx].owner = val || '';
          }
        },
      });
      window.ensurePersonInput('edit-decision-decider-' + idx, item.decider || '', {
        onChange: (val) => {
          if (window._meetingEditData?.decisions?.[idx]) {
            window._meetingEditData.decisions[idx].decider = val || '';
          }
        },
      });
    });
  }
}
function updateDecisionContent(idx, val) { if (window._meetingEditData?.decisions?.[idx]) window._meetingEditData.decisions[idx].content = val; }
function updateDecisionOwner(idx, val) {
  if (!window._meetingEditData?.decisions?.[idx]) return;
  const inputId = 'edit-decision-owner-' + idx;
  const person = window.getPersonValue ? window.getPersonValue(inputId) : null;
  window._meetingEditData.decisions[idx].owner = person || (typeof val === 'string' ? val : '');
}
function updateDecisionDeadline(idx, val) { if (window._meetingEditData?.decisions?.[idx]) window._meetingEditData.decisions[idx].deadline = val; }
function updateDecisionStatus(idx, val) { if (window._meetingEditData?.decisions?.[idx]) window._meetingEditData.decisions[idx].status = val; }
function updateDecisionKmsUrl(idx, val) { if (window._meetingEditData?.decisions?.[idx]) window._meetingEditData.decisions[idx].kmsUrl = val; }
function updateDecisionSourceTopic(idx, val) { if (window._meetingEditData?.decisions?.[idx]) window._meetingEditData.decisions[idx].sourceTopicId = val; }
function updateDecisionDecider(idx, val) {
  if (!window._meetingEditData?.decisions?.[idx]) return;
  const inputId = 'edit-decision-decider-' + idx;
  const person = window.getPersonValue ? window.getPersonValue(inputId) : null;
  window._meetingEditData.decisions[idx].decider = person || (typeof val === 'string' ? val : '');
}
function addDecisionItem() {
  if (!window._meetingEditData) return;
  if (!window._meetingEditData.decisions) window._meetingEditData.decisions = [];
  const today = new Date().toISOString().split('T')[0];
  window._meetingEditData.decisions.push(normalizeResolution({
    content: '',
    owner: '',
    deadline: today,
    status: 'pending',
    kmsUrl: '',
    sourceMeetingId: window._meetingEditData.id,
    sourceMeetingTitle: window._meetingEditData.title,
  }, window._meetingEditData));
  renderDecisionList();
}
function removeDecisionItem(idx) {
  if (!window._meetingEditData?.decisions) return;
  const removed = window._meetingEditData.decisions[idx];
  const removedId = removed && removed.id;
  window._meetingEditData.decisions.splice(idx, 1);
  // 清理被删除决议关联的行动项来源
  if (removedId && window._meetingEditData.actions) {
    window._meetingEditData.actions.forEach(a => {
      if (a.sourceDecisionId === removedId) a.sourceDecisionId = '';
    });
  }
  renderDecisionList();
  renderActionList();
}

/**
 * 保存会议数据（新建或更新）
 * 数据持久化到 API 和 本地存储
 */
function saveMeeting() {
  const meetings = getMeetings();
  try {
    const d = window._meetingEditData;
    if (!d) { console.warn('saveMeeting: _meetingEditData is null'); window.showToast('编辑数据丢失，请重新打开编辑窗口', 'error'); return; }
    const id = document.getElementById('edit-meeting-id').value;
    const isNew = id.startsWith('new_');
    const idx = meetings.findIndex(m => m.id === id);
    const titleVal = document.getElementById('edit-title').value.trim();
    const dateVal = document.getElementById('edit-date').value.trim();
    const startTimeVal = document.getElementById('edit-start-time')?.value.trim() || '09:00';
    if (!titleVal) { window.showToast('会议名称不能为空', 'warning'); return; }
    if (!dateVal) { window.showToast('会议日期不能为空', 'warning'); return; }
    const scenarioVal = document.getElementById('edit-scenario').value;
    const statusVal = document.getElementById('edit-status').value;
    if (isNew || idx === -1) {
      const newMeeting = {
        id: dateVal.replace(/-/g, '') + '_' + Math.floor(Math.random() * 1000),
        title: titleVal,
        date: dateVal,
        startTime: startTimeVal,
        month: dateVal.slice(0, 7),
        location: document.getElementById('edit-location').value.trim() || '待确认',
        host: window.getPersonValue('edit-host') || '待定',
        recorder: window.getPersonValue('edit-recorder') || '待定',
        meeting_link: document.getElementById('edit-kms-link')?.value.trim() || '',
        pre_report_id: document.getElementById('edit-pre-report-id')?.value.trim() || '',
        minutes_report_id: d.minutes_report_id || '',
        minutes_content: document.getElementById('edit-minutes-content')?.value.trim() || '',
        hasMinutes: !!document.getElementById('edit-minutes-content')?.value.trim(),
        minutesStatus: document.getElementById('edit-minutes-content')?.value.trim() ? 'draft' : null,
        scenario: scenarioVal,
        level: document.getElementById('edit-level').value,
        status: statusVal,
        agenda_items: (d.agenda_items || []).filter(a => a.title.trim()),
        actions: (d.actions || []).filter(a => a.content?.trim() || (typeof a.owner === 'string' ? a.owner.trim() : (a.owner?.name || a.owner?.id))),
        decisions: d.decisions || [],
        pipeline: d.pipeline || {},
        upstreamMeeting: d.upstreamMeeting || null,
        downstreamMeeting: d.downstreamMeeting || null,
        hasMinutes: d.hasMinutes || false,
        minutesStatus: d.minutesStatus || null,
        metrics: d.metrics || { materialTimeliness: 0, resolutionTimeliness: 0, actionClosure: 0, satisfaction: 0 },
        effectiveness: d.effectiveness || null
      };
      if (newMeeting.agenda_items.length === 0) {
        const fallbackAgendaId = 'ag_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        newMeeting.agenda_items = [{ id: fallbackAgendaId, type: 'goal_management', title: '未设置议程', duration: 15, owner: '', material_link: '', data_views: [], pre_report_section: '', status: 'planned', originalAgendaId: fallbackAgendaId, postponedCount: 0, carriedFromAgendaId: null, carriedFromMeetingId: null, postponedHistory: [] }];
      }
      addMeeting(newMeeting);
      const editorOverlay = document.getElementById('meeting-editor-overlay');
      if (editorOverlay && editorOverlay.style.display === 'flex') closeMeetingEditor();
      window.openMeetingDetail(newMeeting.id);
    } else {
      meetings[idx].title = titleVal;
      meetings[idx].date = dateVal;
      meetings[idx].startTime = startTimeVal;
      meetings[idx].month = dateVal.slice(0, 7);
      meetings[idx].location = document.getElementById('edit-location').value.trim() || '待确认';
      meetings[idx].host = window.getPersonValue('edit-host') || '待定';
      meetings[idx].recorder = window.getPersonValue('edit-recorder') || '待定';
      meetings[idx].meeting_link = document.getElementById('edit-kms-link')?.value.trim() || '';
      meetings[idx].pre_report_id = document.getElementById('edit-pre-report-id')?.value.trim() || '';
      meetings[idx].minutes_report_id = d.minutes_report_id || '';
      meetings[idx].minutes_content = document.getElementById('edit-minutes-content')?.value.trim() || '';
      meetings[idx].hasMinutes = !!document.getElementById('edit-minutes-content')?.value.trim();
      meetings[idx].minutesStatus = document.getElementById('edit-minutes-content')?.value.trim() ? 'draft' : null;
      meetings[idx].scenario = scenarioVal;
      meetings[idx].level = document.getElementById('edit-level').value;
      meetings[idx].status = statusVal;
      meetings[idx].agenda_items = (d.agenda_items || []).filter(a => a.title.trim());
      if (meetings[idx].agenda_items.length === 0) {
        const fallbackAgendaId = 'ag_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        meetings[idx].agenda_items = [{ id: fallbackAgendaId, type: 'goal_management', title: '未设置议程', duration: 15, owner: '', material_link: '', data_views: [], pre_report_section: '', status: 'planned', originalAgendaId: fallbackAgendaId, postponedCount: 0, carriedFromAgendaId: null, carriedFromMeetingId: null, postponedHistory: [] }];
      }
      meetings[idx].actions = (d.actions || []).filter(a => a.content?.trim() || (typeof a.owner === 'string' ? a.owner.trim() : (a.owner?.name || a.owner?.id)));
      meetings[idx].decisions = d.decisions || [];
      meetings[idx].pipeline = d.pipeline || {};
      meetings[idx].upstreamMeeting = d.upstreamMeeting || null;
      meetings[idx].downstreamMeeting = d.downstreamMeeting || null;
      meetings[idx].hasMinutes = d.hasMinutes || false;
      meetings[idx].minutesStatus = d.minutesStatus || null;
      meetings[idx].metrics = d.metrics || { materialTimeliness: 0, resolutionTimeliness: 0, actionClosure: 0, satisfaction: 0 };
      meetings[idx].effectiveness = d.effectiveness || null;
      const editorOverlay = document.getElementById('meeting-editor-overlay');
      if (editorOverlay && editorOverlay.style.display === 'flex') closeMeetingEditor();
      persistMeetings();
      window.navigate('exe/meetings');
    }
  } catch (err) {
    console.error('saveMeeting error:', err);
    window.showToast('保存失败：' + err.message, 'error');
  }
}
function deleteMeeting() {
  const meetings = getMeetings();
  const d = window._meetingEditData;
  if (!d) return;
  if (!confirm('确定要删除该会议吗？此操作不可撤销。')) return;
  const idx = meetings.findIndex(m => m.id === d.id);
  if (idx > -1) deleteMeetingByIndex(idx);
  const editorOverlay = document.getElementById('meeting-editor-overlay');
  if (editorOverlay && editorOverlay.style.display === 'flex') closeMeetingEditor();
  window.navigate('exe/meetings');
}

// ---- Expose on window for onclick handlers in HTML strings ----
window.openMeetingEditor = openMeetingEditor;
window.closeMeetingEditor = closeMeetingEditor;
window.renderEditorForm = renderEditorForm;
window.autoFillMeetingForm = autoFillMeetingForm;
window.renderAgendaList = renderAgendaList;
window.updateAgendaType = updateAgendaType;
window.updateAgendaStatus = updateAgendaStatus;
window.updateAgendaTitle = updateAgendaTitle;
window.updateAgendaDuration = updateAgendaDuration;
window.updateAgendaOwner = updateAgendaOwner;
window.updateAgendaMaterialLink = updateAgendaMaterialLink;
window.updateAgendaDataViews = updateAgendaDataViews;
window.updateAgendaPreReportSection = updateAgendaPreReportSection;
window.addAgendaItem = addAgendaItem;
window.removeAgendaItem = removeAgendaItem;
window.moveAgendaItem = moveAgendaItem;
window.renderActionList = renderActionList;
window.updateActionContent = updateActionContent;
window.updateActionOwner = updateActionOwner;
window.updateActionDeadline = updateActionDeadline;
window.updateActionStatus = updateActionStatus;
window.updateActionSourceAgenda = updateActionSourceAgenda;
window.updateActionSourceDecision = updateActionSourceDecision;
window.addActionItem = addActionItem;
window.removeActionItem = removeActionItem;
window.renderDecisionList = renderDecisionList;
window.updateDecisionContent = updateDecisionContent;
window.updateDecisionOwner = updateDecisionOwner;
window.updateDecisionDeadline = updateDecisionDeadline;
window.updateDecisionStatus = updateDecisionStatus;
window.updateDecisionKmsUrl = updateDecisionKmsUrl;
window.updateDecisionSourceTopic = updateDecisionSourceTopic;
window.updateDecisionDecider = updateDecisionDecider;
window.addDecisionItem = addDecisionItem;
window.removeDecisionItem = removeDecisionItem;
window.saveMeeting = saveMeeting;
window.deleteMeeting = deleteMeeting;

// Also expose agenda review functions that are referenced by onclick handlers
window.toggleAgendaReviewMode = toggleAgendaReviewMode;
window.updateBatchReviewSelection = updateBatchReviewSelection;
window.reviewSingleAgenda = reviewSingleAgenda;
window.openBatchReviewModal = openBatchReviewModal;
window.closeBatchReviewModal = closeBatchReviewModal;
window.startBatchReview = startBatchReview;
window.openAgendaReviewDetail = openAgendaReviewDetail;
window.reReviewAgendaMaterial = reReviewAgendaMaterial;
window.showAgendaReviewSummary = showAgendaReviewSummary;
window.showAgendaReviewReport = showAgendaReviewReport;
window.closeAgendaReviewDetail = closeAgendaReviewDetail;

// ---- Named exports for testability ----
export {
  openMeetingEditor,
  closeMeetingEditor,
  renderEditorForm,
  autoFillMeetingForm,
  extractTitleKeywords,
  findBestMeetingMatch,
  applyKeywordRules,
  inferDateFromTitle,
  renderAgendaList,
  updateAgendaType,
  updateAgendaStatus,
  updateAgendaTitle,
  updateAgendaDuration,
  updateAgendaOwner,
  updateAgendaMaterialLink,
  updateAgendaDataViews,
  updateAgendaPreReportSection,
  addAgendaItem,
  removeAgendaItem,
  moveAgendaItem,
  renderActionList,
  updateActionContent,
  updateActionOwner,
  updateActionDeadline,
  updateActionStatus,
  updateActionSourceAgenda,
  updateActionSourceDecision,
  addActionItem,
  removeActionItem,
  renderDecisionList,
  updateDecisionContent,
  updateDecisionOwner,
  updateDecisionDeadline,
  updateDecisionStatus,
  updateDecisionKmsUrl,
  updateDecisionSourceTopic,
  updateDecisionDecider,
  addDecisionItem,
  removeDecisionItem,
  saveMeeting,
  deleteMeeting,
  getReviewerProxyUrl,
  getReviewerScene,
  renderAgendaReviewScoreHtml,
  toggleAgendaReviewMode,
  updateBatchReviewSelection,
  reviewSingleAgenda,
  openBatchReviewModal,
  closeBatchReviewModal,
  startBatchReview,
  openAgendaReviewDetail,
  reReviewAgendaMaterial,
  showAgendaReviewSummary,
  showAgendaReviewReport,
  closeAgendaReviewDetail,
};
