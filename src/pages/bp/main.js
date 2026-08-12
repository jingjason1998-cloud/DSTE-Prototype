/**
 * BP 模块（战略解码）独立页面入口
 * ============================================================
 * 由 src/cockpit.html 内联脚本抽取：战略指标库（bp/kpi）+ 年度经营计划（bp/annual-plan）。
 * 数据层统一走 ../../lib/omp-store.js（与 cockpit 共享，行为、数据 key、函数签名不变）。
 * 路由：#bp/kpi（默认）/ #bp/annual-plan（页面内 hash 路由，navigate 为局部 shim）。
 */
import { hydrateIcons, icon } from '../../../assets/js/icons.js';
import { escapeHtml } from '../../lib/utils.js';
import { renderPerson, getOrgTree } from '../../lib/employee-directory.js';
import { enhancePersonInput } from '../../components/person-input.js';
import { createOrgSelector } from '../../components/org-selector.js';
import {
  ASSESSMENT_LEVELS,
  DECOMPOSE_DIMENSIONS,
  getCurrentCycle,
  omp_load,
  omp_save,
  omp_initData,
  omp_openModal,
  omp_syncAnnualPlanTasksToExecution,
  omp_syncAnnualPlanKpisToExecution,
  omp_getPrimaryKpiAssociation,
  omp_getSupportingKpiAssociations,
  omp_renderKpiAssociationFields,
  omp_collectKpiAssociationsFromForm,
} from '../../lib/omp-store.js';

(function() {
  'use strict';

  // ===== 全局 DSTE 状态（周期选择与 cockpit 经 localStorage 共享） =====
  const CYCLE_STORAGE_KEY = 'dste_current_cycle_id';
  window._dsteState = {
    currentCycleId: DSTE.Storage.getString(CYCLE_STORAGE_KEY) || 'cycle_2026_marketing',
  };

  // ===== 人员输入增强全局助手（与 cockpit.html 保持相同 API） =====
  window.renderPerson = renderPerson;
  window._personInputApis = window._personInputApis || {};
  window.ensurePersonInput = function(inputId, value) {
    if (!window.enhancePersonInput) return;
    const input = document.getElementById(inputId);
    if (!input) return;
    let api = window._personInputApis[inputId];
    // 弹窗每次打开都会创建新的 input DOM，需检测 input 是否与缓存 API 关联；
    // 若不一致，销毁旧 API 并重新增强，否则人员选择器不会绑定到新 input。
    if (!api || input._personInputApi !== api) {
      if (api && typeof api.destroy === 'function') {
        try { api.destroy(); } catch (e) {}
      }
      api = window.enhancePersonInput(input, {
        placeholder: input.getAttribute('placeholder') || '',
        allowFreeText: true,
      });
      window._personInputApis[inputId] = api;
    }
    api.setValue(value);
  };
  window.getPersonValue = function(inputId) {
    const api = window._personInputApis[inputId];
    if (api) return api.getValue();
    const input = document.getElementById(inputId);
    return input ? (input.value.trim() || null) : null;
  };

      // ===== 战略指标库页面状态 =====
      window._indicatorState = window._indicatorState || {
        selectedCategory: 'all',
        selectedSubCategory: null,
        selectedIndicatorId: null,
        searchQuery: '',
        frequencyFilter: 'all',
        statusFilter: 'all',
      };

      // ===== 战略指标库页面 =====
      function renderIndicatorSystem() {
        omp_initData();
        const indicators = omp_load('indicators');
        const state = window._indicatorState;

        // 指标类型标签
        const typeLabels = { result: '结果', process: '过程' };
        const typeColors = { result: 'var(--primary)', process: 'var(--warning)' };
        const dtypeLabels = { currency: '金额', percentage: '百分比', count: '计数', days: '天数', score: '分数' };
        const dtypeColors = { currency: 'var(--success)', percentage: 'var(--primary)', count: 'var(--warning)', days: 'var(--info)', score: 'var(--danger)' };

        // 筛选逻辑
        let filtered = indicators;
        if (state.selectedCategory !== 'all') {
          filtered = filtered.filter(i => i.category === state.selectedCategory);
          if (state.selectedSubCategory) {
            filtered = filtered.filter(i => i.subCategory === state.selectedSubCategory);
          }
        }
        if (state.frequencyFilter !== 'all') {
          filtered = filtered.filter(i => i.frequency === state.frequencyFilter);
        }
        if (state.statusFilter !== 'all') {
          filtered = filtered.filter(i => i.status === state.statusFilter);
        }
        if (state.searchQuery) {
          const q = state.searchQuery.toLowerCase();
          filtered = filtered.filter(i =>
            i.name.toLowerCase().includes(q) ||
            i.code.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q)
          );
        }

        // 分类统计
        const categories = ['财务', '客户', '流程', '学习成长'];
        const catIcons = { '财务': '<span class="icon" data-icon="chart-bar" data-icon-size="14"></span>', '客户': '<span class="icon" data-icon="user" data-icon-size="14"></span>', '流程': '<span class="icon" data-icon="gear" data-icon-size="14"></span>', '学习成长': '<span class="icon" data-icon="books" data-icon-size="14"></span>' };
        const catCounts = {};
        categories.forEach(c => catCounts[c] = indicators.filter(i => i.category === c).length);

        // 子分类
        const subCategories = {};
        categories.forEach(c => {
          subCategories[c] = [...new Set(indicators.filter(i => i.category === c).map(i => i.subCategory))];
        });

        // 选中的指标详情
        const selectedInd = state.selectedIndicatorId ? indicators.find(i => i.id === state.selectedIndicatorId) : null;

        // 频次标签
        const freqLabels = { monthly: '月度', quarterly: '季度', yearly: '年度' };
        const freqColors = { monthly: 'var(--primary)', quarterly: 'var(--warning)', yearly: 'var(--success)' };

        // 状态标签
        const statusLabels = { active: '启用', disabled: '禁用' };
        const statusColors = { active: 'var(--success)', disabled: 'var(--text-tertiary)' };

        return `
          ${renderBreadcrumb('战略指标库')}
          <div class="page-header">
            <h1 class="page-title">战略指标库</h1>
            <p style="margin:4px 0 0 0;font-size:13px;color:var(--text-secondary);">承接战略解码成果，支撑经营计划分解，实现战略到执行的指标贯通。</p>
            <div class="page-actions">
              <span class="text-sm-tertiary mr-3">共 ${indicators.length} 个指标</span>
              <button class="btn btn-primary" data-action="ind-new">+ 新建指标</button>
              <button class="btn btn-secondary" data-action="ind-export"><span class="icon" data-icon="download" data-icon-size="14"></span> 导出</button>
            </div>
          </div>

          <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap;">
            <div style="position:relative;flex:1;min-width:200px;">
              <span class="icon" data-icon="magnifying-glass" data-icon-size="14" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);pointer-events:none;"></span>
              <input type="text" id="ind-search" placeholder="搜索指标名称/编码/描述..." value="${state.searchQuery}" style="width:100%;padding:8px 12px 8px 30px;border:1px solid var(--border-color);border-radius:6px;background:var(--bg-card);color:var(--text-primary);font-size:13px;" data-action="ind-search">
            </div>
            <select data-action="ind-filter-freq" style="padding:8px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--bg-card);color:var(--text-primary);font-size:13px;cursor:pointer;">
              <option value="all" ${state.frequencyFilter === 'all' ? 'selected' : ''}>全部频次</option>
              <option value="monthly" ${state.frequencyFilter === 'monthly' ? 'selected' : ''}>月度</option>
              <option value="quarterly" ${state.frequencyFilter === 'quarterly' ? 'selected' : ''}>季度</option>
              <option value="yearly" ${state.frequencyFilter === 'yearly' ? 'selected' : ''}>年度</option>
            </select>
            <select data-action="ind-filter-status" style="padding:8px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--bg-card);color:var(--text-primary);font-size:13px;cursor:pointer;">
              <option value="all" ${state.statusFilter === 'all' ? 'selected' : ''}>全部状态</option>
              <option value="active" ${state.statusFilter === 'active' ? 'selected' : ''}>启用</option>
              <option value="disabled" ${state.statusFilter === 'disabled' ? 'selected' : ''}>禁用</option>
            </select>
          </div>

          <div class="flex-row gap-4">
            <!-- 左侧分类树 -->
            <div style="width:240px;flex-shrink:0;">
              <div class="card" style="height:fit-content;">
                <div class="card-header"><div class="card-title"><span class="icon" data-icon="folders" data-icon-size="14"></span> 指标分类</div></div>
                <div style="padding:12px;">
                  <div class="ind-cat-item ${state.selectedCategory === 'all' ? 'active' : ''}" data-action="ind-select-cat" data-cat="all" style="padding:8px 10px;border-radius:6px;cursor:pointer;font-size:13px;color:var(--text-primary);display:flex;align-items:center;gap:8px;margin-bottom:2px;${state.selectedCategory === 'all' ? 'background:var(--bg-active);font-weight:600;' : ''}">
                    <span><span class="icon" data-icon="clipboard-text" data-icon-size="14"></span></span> 全部指标 <span style="margin-left:auto;font-size:11px;color:var(--text-tertiary);background:var(--bg-page);padding:1px 6px;border-radius:10px;">${indicators.length}</span>
                  </div>
                  ${categories.map(cat => `
                    <div class="mt-1">
                      <div class="ind-cat-item ${state.selectedCategory === cat ? 'active' : ''}" data-action="ind-select-cat" data-cat="${cat}" style="padding:8px 10px;border-radius:6px;cursor:pointer;font-size:13px;color:var(--text-primary);display:flex;align-items:center;gap:8px;${state.selectedCategory === cat ? 'background:var(--bg-active);font-weight:600;' : ''}">
                        <span>${catIcons[cat]}</span> ${cat}指标 <span style="margin-left:auto;font-size:11px;color:var(--text-tertiary);background:var(--bg-page);padding:1px 6px;border-radius:10px;">${catCounts[cat] || 0}</span>
                      </div>
                      ${state.selectedCategory === cat ? subCategories[cat].map(sub => `
                        <div class="ind-subcat-item ${state.selectedSubCategory === sub ? 'active' : ''}" data-action="ind-select-subcat" data-sub="${sub}" style="padding:6px 10px 6px 32px;border-radius:6px;cursor:pointer;font-size:12px;color:var(--text-secondary);margin-top:2px;${state.selectedSubCategory === sub ? 'background:var(--bg-active);color:var(--primary);font-weight:500;' : ''}">
                          ${sub}
                        </div>
                      `).join('') : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- 右侧内容区 -->
            <div class="flex-1" class="min-width-0">
              ${filtered.length === 0 ? `
                <div class="card" style="text-align:center;padding:60px 20px;">
                  <div style="font-size:48px;margin-bottom:16px;"><span class="icon" data-icon="magnifying-glass" data-icon-size="14"></span></div>
                  <div style="font-size:16px;color:var(--text-primary);margin-bottom:8px;">未找到匹配的指标</div>
                  <div class="text-sm-tertiary">请调整筛选条件或搜索关键词</div>
                </div>
              ` : `
                <div style="display:grid;grid-template-columns:${selectedInd ? '1fr 320px' : '1fr'};gap:16px;">
                  <!-- 指标列表 -->
                  <div class="card" style="overflow:hidden;">
                    <div class="overflow-x-auto">
                      <table style="width:100%;border-collapse:collapse;font-size:13px;">
                        <thead>
                          <tr class="border-bottom-light">
                            <th style="padding:10px 12px;text-align:left;font-weight:600;color:var(--text-tertiary);font-size:12px;">编码</th>
                            <th style="padding:10px 12px;text-align:left;font-weight:600;color:var(--text-tertiary);font-size:12px;">指标名称</th>
                            <th class="table-header-cell">类型</th>
                            <th style="padding:10px 12px;text-align:left;font-weight:600;color:var(--text-tertiary);font-size:12px;">分类</th>
                            <th class="table-header-cell">数据类型</th>
                            <th class="table-header-cell">频次</th>
                            <th class="table-header-cell">状态</th>
                            <th class="table-header-cell">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${filtered.map(ind => `
                            <tr style="border-bottom:1px solid var(--border-light);cursor:pointer;${state.selectedIndicatorId === ind.id ? 'background:var(--bg-active);' : ''}" data-action="ind-select" data-id="${ind.id}">
                              <td style="padding:10px 12px;color:var(--text-secondary);font-size:12px;font-family:monospace;">${ind.code}</td>
                              <td style="padding:10px 12px;">
                                <div style="font-weight:500;color:var(--text-primary);">${ind.name}</div>
                                <div style="font-size:11px;color:var(--text-tertiary);margin-top:2px;">${ind.description.substring(0, 30)}${ind.description.length > 30 ? '...' : ''}</div>
                              </td>
                              <td class="table-cell-center">
                                <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${typeColors[ind.indicatorType] || 'var(--text-tertiary)'}15;color:${typeColors[ind.indicatorType] || 'var(--text-tertiary)'};">${typeLabels[ind.indicatorType] || '未知'}</span>
                              </td>
                              <td style="padding:10px 12px;">
                                <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:var(--bg-page);color:var(--text-secondary);">${ind.category}</span>
                              </td>
                              <td class="table-cell-center">
                                <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${dtypeColors[ind.dataType] || 'var(--text-tertiary)'}15;color:${dtypeColors[ind.dataType] || 'var(--text-tertiary)'};">${dtypeLabels[ind.dataType] || ind.dataType || '-'}</span>
                              </td>
                              <td class="table-cell-center">
                                <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${freqColors[ind.frequency]}15;color:${freqColors[ind.frequency]};">${freqLabels[ind.frequency]}</span>
                              </td>
                              <td class="table-cell-center">
                                <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${statusColors[ind.status]}15;color:${statusColors[ind.status]};">${statusLabels[ind.status]}</span>
                              </td>
                              <td class="table-cell-center">
                                <button class="btn btn-sm btn-secondary" data-action="ind-edit" data-id="${ind.id}" style="font-size:11px;padding:2px 8px;margin-right:4px;">编辑</button>
                                <button class="btn btn-sm btn-danger" data-action="ind-delete" data-id="${ind.id}" class="badge-xs">删除</button>
                              </td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  ${selectedInd ? `
                    <!-- 详情面板 -->
                    <div class="card" style="height:fit-content;">
                      <div class="card-header">
                        <div class="card-title"><span class="icon" data-icon="clipboard-text" data-icon-size="14"></span> 指标详情</div>
                      </div>
                      <div class="p-4">
                        <div style="font-size:16px;font-weight:600;color:var(--text-primary);margin-bottom:4px;">${selectedInd.name}</div>
                        <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:16px;font-family:monospace;">${selectedInd.code}</div>

                        <div class="mb-3">
                          <div class="form-label-sm">指标定义</div>
                          <div style="font-size:13px;color:var(--text-primary);line-height:1.5;">${selectedInd.description}</div>
                        </div>

                        <div class="mb-3">
                          <div class="form-label-sm">计算公式</div>
                          <div style="font-size:13px;color:var(--primary);font-family:monospace;background:var(--bg-page);padding:8px 10px;border-radius:6px;">${selectedInd.formula}</div>
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                          <div>
                            <div class="form-label-sm">指标类型</div>
                            <div class="text-sm-primary">
                              <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${typeColors[selectedInd.indicatorType] || 'var(--text-tertiary)'}15;color:${typeColors[selectedInd.indicatorType] || 'var(--text-tertiary)'};">${typeLabels[selectedInd.indicatorType] || selectedInd.indicatorType || '-'}</span>
                            </div>
                          </div>
                          <div>
                            <div class="form-label-sm">数据类型</div>
                            <div class="text-sm-primary">
                              <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${dtypeColors[selectedInd.dataType] || 'var(--text-tertiary)'}15;color:${dtypeColors[selectedInd.dataType] || 'var(--text-tertiary)'};">${dtypeLabels[selectedInd.dataType] || selectedInd.dataType || '-'}</span>
                            </div>
                          </div>
                          <div>
                            <div class="form-label-sm">单位</div>
                            <div class="text-sm-primary">${selectedInd.unit}</div>
                          </div>
                          <div>
                            <div class="form-label-sm">统计频次</div>
                            <div class="text-sm-primary">${freqLabels[selectedInd.frequency]}</div>
                          </div>
                          <div>
                            <div class="form-label-sm">数据来源</div>
                            <div class="text-sm-primary">${selectedInd.dataSource}</div>
                          </div>
                          <div>
                            <div class="form-label-sm">责任部门</div>
                            <div class="text-sm-primary">${resolveResponsibleDeptName(selectedInd.responsibleDept)}</div>
                          </div>
                        </div>

                        <div class="mb-3">
                          <div class="form-label-sm">分类</div>
                          <div class="text-sm-primary">${catIcons[selectedInd.category]} ${selectedInd.category} / ${selectedInd.subCategory}</div>
                        </div>

                        <div class="mb-3">
                          <div class="form-label-sm">趋势方向</div>
                          <div class="text-sm-primary">${selectedInd.isPositive ? '<span class="icon" data-icon="check" data-icon-size="14"></span> 越高越好' : '<span class="icon" data-icon="arrow-down" data-icon-size="14"></span> 越低越好'}</div>
                        </div>

                        <div style="padding-top:12px;border-top:1px solid var(--border-light);">
                          <div class="form-label-sm">创建时间</div>
                          <div class="text-xs-secondary">${selectedInd.createdAt}</div>
                        </div>

                        <div style="display:flex;gap:8px;margin-top:16px;">
                          <button class="btn btn-primary" style="flex:1;font-size:12px;" data-action="ind-edit" data-id="${selectedInd.id}">编辑</button>
                          <button class="btn btn-secondary" class="text-xs-only" data-action="ind-clear-select">关闭</button>
                        </div>
                      </div>
                    </div>
                  ` : ''}
                </div>
              `}
            </div>
          </div>

          <style>
            .ind-cat-item:hover { background: var(--bg-hover); }
            .ind-cat-item.active { background: var(--bg-active) !important; }
            .ind-subcat-item:hover { background: var(--bg-hover); }
            .ind-subcat-item.active { background: var(--bg-active) !important; }
          </style>
        `;
      }

      // ===== 年度经营计划页面状态 =====
      window._annualPlanState = {
        activeTab: 'overview',
        selectedKpiId: null,
        expandedGroupIds: new Set(),
        decomposeDimension: 'warzone',
        assessmentLevelFilter: 'all',
      };

      // ===== 年度经营计划 — 总览 Tab =====
      function ap_renderOverviewTab(kpis, indicators, allTasks, state) {
        const dimColors = { financial: 'var(--dim-financial)', customer: 'var(--dim-customer)', process: 'var(--dim-process)', learning: 'var(--dim-learning)' };
        const dimLabels = { financial: '财务', customer: '客户', process: '流程', learning: '学习成长' };
        const statusLabelsKt = { planning: '规划中', active: '进行中', done: '已完成', closed: '已关闭' };
        const statusColorsKt = { planning: 'var(--text-tertiary)', active: 'var(--primary)', done: 'var(--success)', closed: 'var(--text-tertiary)' };
        const levelFilter = state.assessmentLevelFilter || 'all';
        const currentCycleId = window._dsteState.currentCycleId;
        const tasks = allTasks.filter(t => t.source !== 'omp' && t.cycleId === currentCycleId);
        const sortedTasks = tasks.slice().sort((a, b) => {
          const seqDiff = (a.seq || 0) - (b.seq || 0);
          if (seqDiff !== 0) return seqDiff;
          return String(a.id).localeCompare(String(b.id));
        });
        const allKpis = omp_load('kpiInstances');

        return `
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px;">
            <select onchange="window._annualPlanState.assessmentLevelFilter = this.value; navigate('bp/annual-plan');" class="form-input-compact" class="cursor-pointer-sm">
              <option value="all" ${levelFilter === 'all' ? 'selected' : ''}>全部层级</option>
              <option value="marketing-line" ${levelFilter === 'marketing-line' ? 'selected' : ''}>营销线级</option>
              <option value="department" ${levelFilter === 'department' ? 'selected' : ''}>部门级</option>
              <option value="team" ${levelFilter === 'team' ? 'selected' : ''}>小组级</option>
            </select>
          </div>
          <div class="ap-card" class="mb-5">
            <table class="ap-table">
              <thead>
                <tr class="bg-page">
                  <th class="tab-header-cell">牵引点</th>
                  <th style="padding:12px;border-bottom:2px solid var(--border-color);text-align:center;width:70px;">考核层级</th>
                  <th style="padding:12px;border-bottom:2px solid var(--border-color);text-align:center;">KPI指标</th>
                  <th style="padding:12px;border-bottom:2px solid var(--border-color);text-align:center;width:100px;">全年目标</th>
                  <th class="tab-header-cell">H1占比</th>
                  <th style="padding:12px;border-bottom:2px solid var(--border-color);text-align:center;width:60px;">权重</th>
                  <th style="padding:12px;border-bottom:2px solid var(--border-color);text-align:center;" colspan="3">三档目标</th>
                  <th style="padding:12px;border-bottom:2px solid var(--border-color);text-align:left;">备注</th>
                </tr>
                <tr class="bg-page">
                  <th colspan="6"></th>
                  <th class="table-cell-center" style="border-bottom:1px solid var(--border-color);font-size:12px;">底线</th>
                  <th class="table-cell-center" style="border-bottom:1px solid var(--border-color);font-size:12px;">达标</th>
                  <th class="table-cell-center" style="border-bottom:1px solid var(--border-color);font-size:12px;">挑战</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${kpis.map(kpi => {
                  const ind = indicators.find(i => i.id === kpi.indicatorId);
                  const dim = kpi.bscDimension || 'financial';
                  const dimColor = dimColors[dim] || 'var(--text-tertiary)';
                  const baseline = kpi.baselineValue || Math.round(kpi.targetValue * (kpi.baselinePct || 0.7));
                  const challenge = kpi.challengeValue || Math.round(kpi.targetValue * (kpi.challengePct || 1.2));
                  const h1Ratio = kpi.h1Ratio !== undefined ? kpi.h1Ratio : 0.45;
                  const levelCfg = ASSESSMENT_LEVELS[kpi.assessmentLevel || 'marketing-line'];
                  const levelClass = 'ap-level-' + (kpi.assessmentLevel || 'marketing-line');
                  const canDecompose = kpi.assessmentLevel === 'marketing-line';
                  const isPublished = allKpis.some(k => k.source === 'omp' && k.annualPlanKpiId === kpi.id);
                  const publishBadge = isPublished
                    ? `<span style="font-size:11px;padding:2px 6px;border-radius:4px;background:var(--success-bg);color:var(--success);">已发布</span>`
                    : `<span style="font-size:11px;padding:2px 6px;border-radius:4px;background:var(--text-tertiary-bg);color:var(--text-tertiary);">未发布</span>`;
                  return `
                    <tr style="border-bottom:1px solid var(--border-light);cursor:pointer;${state.selectedKpiId === kpi.id ? 'background:var(--bg-active);' : ''}" data-action="ap-select-kpi" data-id="${kpi.id}">
                      <td class="table-cell-center" class="p-2">
                        <span class="ap-dim-badge" style="background:${dimColor}15;color:${dimColor};">${dimLabels[dim] || dim}</span>
                      </td>
                      <td class="table-cell-center" class="p-2">
                        <span class="ap-level-badge ${levelClass}" style="background:color-mix(in srgb, ${levelCfg.color} 15%, transparent);color:${levelCfg.color};">${levelCfg.short}</span>
                      </td>
                      <td style="padding:10px;text-align:center;font-weight:600;">${ind ? escapeHtml(ind.name) : kpi.indicatorId}</td>
                      <td style="padding:10px;text-align:center;color:var(--primary);font-weight:600;">${kpi.targetValue.toLocaleString()} ${escapeHtml(kpi.unit || '')}</td>
                      <td class="table-cell-center" class="p-2">${Math.round(h1Ratio * 100)}%</td>
                      <td style="padding:10px;text-align:center;font-weight:600;">${kpi.weight}</td>
                      <td style="padding:10px;text-align:center;color:var(--text-tertiary);">${baseline.toLocaleString()}</td>
                      <td style="padding:10px;text-align:center;color:var(--primary);font-weight:600;">${kpi.targetValue.toLocaleString()}</td>
                      <td style="padding:10px;text-align:center;color:var(--success);">${challenge.toLocaleString()}</td>
                      <td style="padding:10px;text-align:left;font-size:12px;color:var(--text-secondary);">
                        <div style="display:flex;gap:4px;justify-content:flex-end;align-items:center;">
                          ${publishBadge}
                          <button type="button" class="btn btn-sm btn-secondary" data-action="ap-edit-kpi" data-id="${kpi.id}" class="badge-xs">编辑</button>
                          ${canDecompose ? `<button type="button" class="btn btn-sm btn-primary" data-action="ap-decompose" data-id="${kpi.id}" class="badge-xs">分解</button>` : ''}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          <div class="ap-section-title">
            <span><span class="icon" data-icon="target" data-icon-size="14"></span></span> 年度重点工作
            <span style="font-size:12px;font-weight:400;color:var(--text-tertiary);margin-left:auto;">承接战略目标的关键举措</span>
          </div>
          <div class="ap-card">
            <table class="ap-table">
              <thead>
                <tr class="bg-page">
                  <th style="border-bottom:2px solid var(--border-color);text-align:center;width:100px;">牵引方向</th>
                  <th style="padding:12px;border-bottom:2px solid var(--border-color);text-align:center;width:60px;">序号</th>
                  <th style="padding:12px;border-bottom:2px solid var(--border-color);text-align:left;">${getCurrentCycle().year}重点工作清单</th>
                  <th style="padding:12px;border-bottom:2px solid var(--border-color);text-align:left;">KMS链接</th>
                  <th style="padding:12px;border-bottom:2px solid var(--border-color);text-align:center;width:100px;">负责人</th>
                  <th class="tab-header-cell">状态</th>
                  <th class="tab-header-cell">执行状态</th>
                  <th class="tab-header-cell">排序</th>
                  <th style="padding:12px;border-bottom:2px solid var(--border-color);text-align:center;width:60px;">操作</th>
                </tr>
              </thead>
              <tbody>
                ${sortedTasks.map((kt, idx) => {
                  const dim = kt.bscDimension || 'customer';
                  const dimColor = dimColors[dim] || 'var(--text-tertiary)';
                  const dimLabel = { customer: '客户', process: '流程', financial: '财务', learning: '学习成长' }[dim] || dim;
                  const ompTask = allTasks.find(t => t.annualPlanTaskId === kt.id);
                  const execStatus = ompTask
                    ? `<span style="font-size:11px;padding:2px 6px;border-radius:4px;background:var(--success-bg);color:var(--success);">已发布</span>`
                    : `<span style="font-size:11px;padding:2px 6px;border-radius:4px;background:var(--text-tertiary-bg);color:var(--text-tertiary);">未发布</span>`;
                  return `
                    <tr class="border-bottom-light">
                      <td class="table-cell-center" class="p-2">
                        <span class="ap-dim-badge" style="background:${dimColor}15;color:${dimColor};">${dimLabel}</span>
                      </td>
                      <td style="padding:10px;text-align:center;font-weight:600;color:var(--text-primary);">${kt.seq}</td>
                      <td style="padding:10px;text-align:left;font-weight:500;color:var(--text-primary);">${escapeHtml(kt.name)}</td>
                      <td style="padding:10px;text-align:left;">
                        <a href="${escapeHtml(kt.kmsUrl || '#')}" target="_blank" style="color:var(--primary);font-size:13px;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${escapeHtml(kt.kmsUrl || '-')}</a>
                      </td>
                      <td style="padding:10px;text-align:center;font-size:13px;color:var(--text-secondary);">${escapeHtml(window.renderPerson ? window.renderPerson(kt.owner) : (kt.owner || ''))}</td>
                      <td class="table-cell-center" class="p-2">
                        <span class="ap-status-pill" style="background:color-mix(in srgb, ${statusColorsKt[kt.status]} 10%, transparent);color:${statusColorsKt[kt.status]};">${statusLabelsKt[kt.status] || kt.status}</span>
                      </td>
                      <td class="table-cell-center" class="p-2">${execStatus}</td>
                      <td class="table-cell-center" class="p-2">
                        <div style="display:flex;flex-direction:column;gap:2px;align-items:center;">
                          <button type="button" onclick="window.ap_moveKeyTask('${kt.id}', 'up')" ${idx === 0 ? 'disabled class="visibility-hidden"' : ''} class="btn-icon-ghost" title="上移">▲</button>
                          <button type="button" onclick="window.ap_moveKeyTask('${kt.id}', 'down')" ${idx === sortedTasks.length - 1 ? 'disabled class="visibility-hidden"' : ''} class="btn-icon-ghost" title="下移">▼</button>
                        </div>
                      </td>
                      <td class="table-cell-center" class="p-2">
                        <button class="btn btn-sm btn-secondary" data-action="ap-edit-keytask" data-id="${kt.id}" class="badge-xs">编辑</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      // ===== 年度经营计划 — 分解视图 Tab =====
      function ap_renderDecompositionTab(kpis, indicators, childKpis, state) {
        const decomposeDim = state.decomposeDimension || 'warzone';
        const dimCfg = DECOMPOSE_DIMENSIONS[decomposeDim];
        const items = dimCfg ? dimCfg.items : [];
        const dimButtons = Object.entries(DECOMPOSE_DIMENSIONS).map(([key, cfg]) =>
          `<button class="btn btn-sm ${decomposeDim === key ? 'btn-primary' : 'btn-secondary'}" data-action="ap-switch-decompose-dim" data-dim="${key}" style="margin-right:6px;font-size:12px;">${cfg.label}</button>`
        ).join('');
        return `
          <div class="mb-4">${dimButtons}</div>
          <div class="ap-card">
            <table class="ap-table" class="text-xs-only">
              <thead>
                <tr class="bg-page">
                  <th style="padding:10px;border-bottom:2px solid var(--border-color);text-align:center;">考核指标</th>
                  <th style="padding:10px;border-bottom:2px solid var(--border-color);text-align:center;">合计</th>
                  ${items.map(z => `<th style="padding:10px;border-bottom:2px solid var(--border-color);text-align:center;min-width:70px;">${z}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${kpis.map(parentKpi => {
                  // 支持部门级/小组级独立 KPI：只在当前维度与其归属匹配时显示
                  const isVisible = parentKpi.assessmentLevel === 'marketing-line' || items.includes(parentKpi.dept);
                  if (!isVisible) return '';
                  const ind = indicators.find(i => i.id === parentKpi.indicatorId);
                  const name = escapeHtml(ind ? ind.name : parentKpi.indicatorId);
                  const isMarketingLine = parentKpi.assessmentLevel === 'marketing-line';
                  const levelLabel = isMarketingLine ? '' : (ASSESSMENT_LEVELS[parentKpi.assessmentLevel]?.short || '部门');
                  const levelBadge = isMarketingLine ? '' : `<span style="font-size:11px;margin-left:6px;padding:2px 6px;border-radius:4px;background:color-mix(in srgb, var(--info) 12%, transparent);color:var(--info);">${levelLabel}</span>`;
                  const myChildren = isMarketingLine
                    ? childKpis.filter(k => k.parentId === parentKpi.id && items.includes(k.dept))
                    : [];
                  const actualTotal = isMarketingLine
                    ? myChildren.reduce((sum, k) => sum + (k.targetValue || 0), 0)
                    : (parentKpi.targetValue || 0);
                  const match = isMarketingLine ? Math.abs(actualTotal - parentKpi.targetValue) < 0.01 : true;
                  const totalColor = match ? 'var(--success)' : 'var(--danger)';
                  const totalTitle = isMarketingLine
                    ? `父级目标: ${parentKpi.targetValue.toLocaleString()} | 实际合计: ${actualTotal.toLocaleString()}`
                    : `本级目标: ${parentKpi.targetValue.toLocaleString()}`;
                  return `
                    <tr class="border-bottom-light">
                      <td style="padding:8px;text-align:center;font-weight:600;">${name}${levelBadge}</td>
                      <td style="padding:8px;text-align:center;color:${totalColor};font-weight:600;" title="${totalTitle}">
                        ${actualTotal.toLocaleString()}
                        ${isMarketingLine && !match ? '<span style="font-size:11px;margin-left:4px;">≠</span>' : ''}
                      </td>
                      ${items.map(z => {
                        if (isMarketingLine) {
                          const child = childKpis.find(k => k.parentId === parentKpi.id && k.dept === z);
                          return `<td style="padding:8px;text-align:center;">${child ? child.targetValue.toLocaleString() : '-'}</td>`;
                        }
                        const ownValue = parentKpi.dept === z ? (parentKpi.targetValue || 0).toLocaleString() : '-';
                        return `<td style="padding:8px;text-align:center;">${ownValue}</td>`;
                      }).join('')}
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      // ===== 年度经营计划页面 =====
      function renderAnnualPlan() {
        omp_initData();
        const state = window._annualPlanState;
        const cycleId = window._dsteState.currentCycleId;
        let kpis = omp_load('kpiInstances').filter(k => k.cycleId === cycleId && k.parentId === null && k.source !== 'omp');
        if (state.assessmentLevelFilter !== 'all') {
          kpis = kpis.filter(k => k.assessmentLevel === state.assessmentLevelFilter);
        }
        const indicators = omp_load('indicators');
        const allTasks = omp_load('tasks').filter(t => t.cycleId === cycleId);
        const tasks = allTasks.filter(t => t.source !== 'omp');
        const tabs = [
          { id: 'overview', label: '<span class="icon" data-icon="chart-bar" data-icon-size="14"></span> 总览' },
          { id: 'decomposition', label: '<span class="icon" data-icon="shuffle" data-icon-size="14"></span> 分解视图' },
        ];
        const activeTab = state.activeTab;
        const cycle = getCurrentCycle();
        const phaseLabels = { planning: '规划中', execution: '执行中', review: '复盘', archived: '已归档' };

        let tabContent = '';
        if (activeTab === 'overview') {
          tabContent = ap_renderOverviewTab(kpis, indicators, allTasks, state);
        } else if (activeTab === 'decomposition') {
          const childKpis = omp_load('kpiInstances').filter(k => k.cycleId === cycleId && k.parentId !== null && k.source !== 'omp');
          tabContent = ap_renderDecompositionTab(kpis, indicators, childKpis, state);
        }

        return `
          ${renderBreadcrumb('年度经营计划')}
          <div class="page-header">
            <div>
              <h1 class="page-title">年度经营计划</h1>
              <p style="margin:4px 0 0 0;font-size:13px;color:var(--text-secondary);">承接战略解码成果，完成组织绩效目标分解与资源配置</p>
            </div>
            <div class="page-actions">
              <span style="font-size:13px;color:var(--text-primary);font-weight:600;margin-right:12px;">${cycle.name}</span>
              <span class="text-sm-tertiary mr-3">阶段: ${phaseLabels[cycle.phase] || cycle.phase}</span>
              <button class="btn btn-secondary" data-action="ap-add-kpi" class="mr-2">+ 添加KPI</button>
              <button class="btn btn-secondary" data-action="ap-add-keytask" class="mr-2">+ 添加重点工作</button>
              <button class="btn btn-primary" data-action="ap-publish">发布到执行</button>
            </div>
          </div>
          <div class="flex-row gap-0 border-bottom-default mb-5">
            ${tabs.map(t => `
              <button class="ap-tab-btn ${activeTab === t.id ? 'active' : ''}"
                      data-action="ap-switch-tab" data-tab="${t.id}"
                      style="padding:12px 24px;background:none;border:none;border-bottom:2px solid ${activeTab === t.id ? 'var(--primary)' : 'transparent'};color:${activeTab === t.id ? 'var(--primary)' : 'var(--text-secondary)'};font-weight:${activeTab === t.id ? '600' : '500'};cursor:pointer;font-size:14px;transition:all 0.2s;">
                ${t.label}
              </button>
            `).join('')}
          </div>
          <div id="ap-tab-content">${tabContent}</div>
          ${state.selectedKpiId ? ap_renderEditPanel(state.selectedKpiId) : ''}
        `;
      }

      // ===== 年度经营计划 — 编辑面板 =====
      function ap_renderEditPanel(kpiId) {
        const kpis = omp_load('kpiInstances');
        const kpi = kpis.find(k => k.id === kpiId);
        if (!kpi) return '';
        const indicators = omp_load('indicators');
        const ind = indicators.find(i => i.id === kpi.indicatorId);
        const baseline = kpi.baselineValue || Math.round(kpi.targetValue * (kpi.baselinePct || 0.7));
        const challenge = kpi.challengeValue || Math.round(kpi.targetValue * (kpi.challengePct || 1.2));
        const assessmentLevel = kpi.assessmentLevel || 'marketing-line';
        const isMarketingLine = assessmentLevel === 'marketing-line';
        return `
          <div class="ap-edit-panel">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
              <h3 class="text-md-primary" class="m-0">编辑 KPI</h3>
              <button data-action="ap-close-panel" class="btn-icon-lg">×</button>
            </div>
            <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:16px;">${ind ? escapeHtml(ind.name) : kpi.indicatorId}</div>
            <div class="flex-col-gap-3">
              <div>
                <label class="form-label">考核层级</label>
                <select id="ap-edit-assessment-level" onchange="window.ap_onAssessmentLevelChange('ap-edit', this.value)" class="form-input-compact">
                  <option value="marketing-line" ${assessmentLevel === 'marketing-line' ? 'selected' : ''}>营销线级</option>
                  <option value="department" ${assessmentLevel === 'department' ? 'selected' : ''}>部门级</option>
                  <option value="team" ${assessmentLevel === 'team' ? 'selected' : ''}>小组级</option>
                </select>
              </div>
              <div id="ap-edit-dept-wrap" style="${isMarketingLine ? 'display:none;' : ''}">
                <label id="ap-edit-dept-label" class="form-label">归属</label>
                <div id="ap-edit-dept" class="width-full"></div>
              </div>
              <input type="hidden" id="ap-edit-dept-hidden" value="${escapeHtml(kpi.dept || '营销线')}">
              <div>
                <label class="form-label">达标目标 *</label>
                <input type="number" id="ap-edit-target" value="${kpi.targetValue}" class="form-input-compact">
              </div>
              <div>
                <label class="form-label">权重（分值）</label>
                <input type="number" id="ap-edit-weight" value="${kpi.weight}" class="form-input-compact">
              </div>
              <div>
                <label class="form-label">H1 占比 (%)</label>
                <input type="number" id="ap-edit-h1" value="${Math.round((kpi.h1Ratio || 0.45) * 100)}" class="form-input-compact">
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div>
                  <label class="form-label">底线比例 (%)</label>
                  <input type="number" id="ap-edit-baseline-pct" value="${Math.round((kpi.baselinePct || 0.7) * 100)}" class="form-input-compact">
                </div>
                <div>
                  <label class="form-label">挑战比例 (%)</label>
                  <input type="number" id="ap-edit-challenge-pct" value="${Math.round((kpi.challengePct || 1.2) * 100)}" class="form-input-compact">
                </div>
              </div>
              <div>
                <label class="form-label">计分规则</label>
                <textarea id="ap-edit-scoring" rows="3" class="form-textarea-compact">${escapeHtml(kpi.scoringRule || '')}</textarea>
              </div>
              <div style="display:flex;gap:8px;margin-top:8px;">
                <button class="btn btn-primary" class="flex-1" data-action="ap-save-kpi" data-id="${kpi.id}">保存</button>
                <button class="btn btn-secondary" data-action="ap-close-panel">取消</button>
              </div>
              <div style="border-top:1px solid var(--border-light);padding-top:12px;margin-top:8px;">
                <button class="btn btn-sm btn-danger" style="width:100%;font-size:12px;" data-action="ap-delete-kpi" data-id="${kpi.id}"><span class="icon" data-icon="trash" data-icon-size="14"></span> 删除此 KPI</button>
              </div>
            </div>
          </div>
        `;
      }

      // ===== 年度经营计划 — 保存 KPI 编辑 =====
      window.ap_saveKpi = function(kpiId) {
        const kpis = omp_load('kpiInstances');
        const idx = kpis.findIndex(k => k.id === kpiId);
        if (idx === -1) return;
        const targetValue = parseFloat(document.getElementById('ap-edit-target')?.value);
        const weight = parseFloat(document.getElementById('ap-edit-weight')?.value);
        const h1Ratio = parseFloat(document.getElementById('ap-edit-h1')?.value) / 100;
        const baselinePct = parseFloat(document.getElementById('ap-edit-baseline-pct')?.value) / 100;
        const challengePct = parseFloat(document.getElementById('ap-edit-challenge-pct')?.value) / 100;
        const scoringRule = document.getElementById('ap-edit-scoring')?.value?.trim();
        const assessmentLevel = document.getElementById('ap-edit-assessment-level')?.value || 'marketing-line';
        let dept = document.getElementById('ap-edit-dept-hidden')?.value?.trim() || kpis[idx].dept || '营销线';
        if (assessmentLevel === 'marketing-line' && !dept) dept = '营销线';
        if (!targetValue || isNaN(targetValue)) {
          showToast('请输入有效的目标值', 'warning');
          return;
        }
        if (assessmentLevel !== 'marketing-line' && !dept) {
          showToast('请选择部门/战区归属', 'warning');
          return;
        }
        const baselineValue = Math.round(targetValue * baselinePct);
        const challengeValue = Math.round(targetValue * challengePct);
        kpis[idx] = { ...kpis[idx], targetValue, weight, h1Ratio, baselinePct, challengePct, baselineValue, challengeValue, scoringRule, assessmentLevel, dept, source: 'annual_plan', annualPlanKpiId: kpis[idx].annualPlanKpiId || null };
        omp_save('kpiInstances', kpis);
        window._annualPlanState.selectedKpiId = null;
        navigate('bp/annual-plan');
      };

      // ===== 年度经营计划 — 添加 KPI =====
      window.ap_addKpi = function() {
        const indicators = omp_load('indicators');
        const indOptions = indicators.map(i => `<option value="${i.id}">${escapeHtml(i.code)} — ${escapeHtml(i.name)}</option>`).join('');
        omp_openModal('添加 KPI', `
          <div class="flex-col-gap-3">
            <div>
              <label class="form-label">选择指标 *</label>
              <select id="ap-add-indicator" class="form-input-compact">
                <option value="">请选择指标</option>
                ${indOptions}
              </select>
            </div>
            <div class="grid-2-col">
              <div>
                <label class="form-label">考核层级 *</label>
                <select id="ap-add-assessment-level" class="form-input-compact">
                  <option value="marketing-line" selected>营销线级</option>
                  <option value="department">部门级</option>
                  <option value="team">小组级</option>
                </select>
              </div>
              <div id="ap-add-dept-wrap" style="display:none;">
                <label id="ap-add-dept-label" class="form-label">归属</label>
                <div id="ap-add-dept" class="width-full"></div>
              </div>
            </div>
            <div class="grid-2-col">
              <div>
                <label class="form-label">达标目标 *</label>
                <input type="number" id="ap-add-target" placeholder="如: 178623" class="form-input-compact">
              </div>
              <div>
                <label class="form-label">计量单位</label>
                <input type="text" id="ap-add-unit" placeholder="自动从指标继承" disabled class="form-select-compact">
              </div>
            </div>
            <div class="grid-2-col">
              <div>
                <label class="form-label">权重（分值）</label>
                <input type="number" id="ap-add-weight" value="10" class="form-input-compact">
              </div>
              <div>
                <label class="form-label">BSC 维度</label>
                <select id="ap-add-dim" class="form-input-compact">
                  <option value="financial">财务</option>
                  <option value="customer">客户</option>
                  <option value="process">流程</option>
                  <option value="learning">学习成长</option>
                </select>
              </div>
            </div>
            <div class="grid-2-col">
              <div>
                <label class="form-label">负责人</label>
                <input type="text" id="ap-add-owner" placeholder="如：陈总监" class="form-input-compact">
              </div>
              <div style="display:none;">
                <input type="text" id="ap-add-dept-hidden" value="营销线">
              </div>
            </div>
          </div>
          <div class="flex-row justify-flex-end mt-5">
            <button class="btn btn-secondary" data-modal-action="modal-cancel-add-kpi">取消</button>
            <button class="btn btn-primary" data-modal-action="modal-save-add-kpi">保存</button>
          </div>
        `, true);
        const addIndSelect = document.getElementById('ap-add-indicator');
        if (addIndSelect) addIndSelect.addEventListener('change', (e) => window.ap_onIndicatorChange(e.target.value));
        const levelSelect = document.getElementById('ap-add-assessment-level');
        if (levelSelect) {
          levelSelect.addEventListener('change', (e) => window.ap_onAssessmentLevelChange('ap-add', e.target.value));
          window.ap_onAssessmentLevelChange('ap-add', levelSelect.value);
        }
        if (window.ensurePersonInput) window.ensurePersonInput('ap-add-owner', '');
      };

      window.ap_onIndicatorChange = function(indicatorId) {
        const indicators = omp_load('indicators');
        const ind = indicators.find(i => i.id === indicatorId);
        const unitInput = document.getElementById('ap-add-unit');
        if (unitInput && ind) unitInput.value = ind.unit || '';
      };

      window.ap_initDeptSelector = function(context, selectedName) {
        const container = document.getElementById(`${context}-dept`);
        const hidden = document.getElementById(`${context}-dept-hidden`);
        if (!container) return;
        container.innerHTML = '';

        const tree = getOrgTree();
        const hasOrgData = tree && tree.roots && tree.roots.length > 0;
        if (!hasOrgData) {
          container.innerHTML = '<div style="padding:8px 0;color:var(--text-muted);font-size:13px;">暂无组织数据，请先导入人员信息表</div>';
          return;
        }

        let selectedOrgId = null;
        if (selectedName && selectedName !== '营销线') {
          const matched = Object.values(tree.orgUnits).find(u => u.name === selectedName);
          if (matched) selectedOrgId = matched.id;
        }

        createOrgSelector(container, {
          placeholder: '请选择归属',
          allowClear: false,
          value: selectedOrgId,
          orgTree: tree,
          onChange: (orgId) => {
            const unit = tree.orgUnits[orgId];
            if (hidden) hidden.value = unit ? unit.name : '';
          },
        });

        if (hidden && selectedName && selectedName !== '营销线') {
          hidden.value = selectedName;
        }
      };

      window.ap_onAssessmentLevelChange = function(context, level) {
        const deptWrap = document.getElementById(`${context}-dept-wrap`);
        const deptLabel = document.getElementById(`${context}-dept-label`);
        const hidden = document.getElementById(`${context}-dept-hidden`);
        if (!deptWrap) return;
        if (level === 'marketing-line') {
          deptWrap.style.display = 'none';
          if (hidden) hidden.value = '营销线';
        } else {
          deptWrap.style.display = 'block';
          if (deptLabel) deptLabel.textContent = level === 'team' ? '所属部门/小组' : '归属';
          const currentName = hidden?.value || '';
          const selectorName = (currentName === '营销线' ? '' : currentName);
          if (hidden && currentName === '营销线') hidden.value = '';
          window.ap_initDeptSelector(context, selectorName);
        }
      };

      window.ap_confirmAddKpi = function() {
        const indicatorId = document.getElementById('ap-add-indicator')?.value;
        const assessmentLevel = document.getElementById('ap-add-assessment-level')?.value || 'marketing-line';
        let dept = document.getElementById('ap-add-dept-hidden')?.value?.trim() || '';
        if (assessmentLevel === 'marketing-line' && !dept) dept = '营销线';
        const targetValue = parseFloat(document.getElementById('ap-add-target')?.value);
        const weight = parseFloat(document.getElementById('ap-add-weight')?.value) || 10;
        const bscDimension = document.getElementById('ap-add-dim')?.value || 'financial';
        const owner = window.getPersonValue ? window.getPersonValue('ap-add-owner') : (document.getElementById('ap-add-owner')?.value?.trim() || '');
        if (!indicatorId || !targetValue || isNaN(targetValue)) {
          showToast('请选择指标并输入有效的目标值', 'warning');
          return;
        }
        if (assessmentLevel !== 'marketing-line' && !dept) {
          showToast('请选择部门/战区归属', 'warning');
          return;
        }
        const indicators = omp_load('indicators');
        const ind = indicators.find(i => i.id === indicatorId);
        const kpis = omp_load('kpiInstances');
        const period = String(getCurrentCycle().year);
        const unit = ind?.unit || '';
        kpis.push({
          id: 'kpi_' + Date.now(),
          cycleId: window._dsteState.currentCycleId,
          indicatorId,
          period,
          targetValue,
          baselineValue: Math.round(targetValue * 0.7),
          challengeValue: Math.round(targetValue * 1.2),
          actualValue: 0,
          achievementRate: 0,
          weight,
          owner,
          dept,
          status: 'active',
          parentId: null,
          level: 0,
          assessmentLevel,
          bscDimension,
          unit,
          source: 'annual_plan',
          annualPlanKpiId: null,
          history: [],
          x: null, y: null, width: 170, height: 100
        });
        omp_save('kpiInstances', kpis);
        document.getElementById('omp-active-modal')?.remove();
        navigate('bp/annual-plan');
      };

      window.ap_publishToExecution = function() {
        if (!confirm('确定要发布到执行阶段吗？发布后KPI树结构将冻结，并将年度计划中的重点工作与KPI同步到OMP执行工作台。')) return;
        const cycles = omp_load('cycles');
        const idx = cycles.findIndex(c => c.id === window._dsteState.currentCycleId);
        if (idx === -1) { showToast('周期数据异常', 'error'); return; }
        cycles[idx] = { ...cycles[idx], phase: 'execution' };
        omp_save('cycles', cycles);

        // 同步年度计划重点工作与 KPI 到 OMP 执行侧
        omp_syncAnnualPlanTasksToExecution(window._dsteState.currentCycleId);
        omp_syncAnnualPlanKpisToExecution(window._dsteState.currentCycleId);

        showToast('已发布到执行阶段，重点工作与KPI已同步', 'success');
        navigate('bp/annual-plan');
      };

      // ===== 年度经营计划 — 重点工作 CRUD =====
      window._apEditingKeyTaskId = null;

      function ap_getAnnualPlanTasks() {
        const tasks = omp_load('tasks');
        const currentCycleId = window._dsteState.currentCycleId;
        return tasks
          .filter(t => t.source === 'annual_plan' && t.cycleId === currentCycleId)
          .sort((a, b) => {
            const seqDiff = (a.seq || 0) - (b.seq || 0);
            if (seqDiff !== 0) return seqDiff;
            return String(a.id).localeCompare(String(b.id));
          });
      }

      function ap_getNextKeyTaskSeq() {
        const annualTasks = ap_getAnnualPlanTasks();
        if (annualTasks.length === 0) return 1;
        return Math.max(...annualTasks.map(t => t.seq || 0)) + 1;
      }

      function ap_renumberKeyTasksAndSync(tasks) {
        const currentCycleId = window._dsteState.currentCycleId;
        const annualTasks = tasks
          .filter(t => t.source === 'annual_plan' && t.cycleId === currentCycleId)
          .sort((a, b) => {
            const seqDiff = (a.seq || 0) - (b.seq || 0);
            if (seqDiff !== 0) return seqDiff;
            return String(a.id).localeCompare(String(b.id));
          });
        annualTasks.forEach((t, idx) => {
          const newSeq = idx + 1;
          if (t.seq !== newSeq) {
            t.seq = newSeq;
            // 同步已派生的 OMP 执行任务 seq
            tasks.filter(dt => dt.annualPlanTaskId === t.id).forEach(dt => {
              dt.seq = newSeq;
            });
          }
        });
        return tasks;
      }

      window.ap_moveKeyTask = function(ktId, direction) {
        const tasks = omp_load('tasks');
        const annualTasks = ap_getAnnualPlanTasks();
        const idx = annualTasks.findIndex(t => t.id === ktId);
        if (idx === -1) return;
        if (direction === 'up' && idx > 0) {
          const temp = annualTasks[idx];
          annualTasks[idx] = annualTasks[idx - 1];
          annualTasks[idx - 1] = temp;
        } else if (direction === 'down' && idx < annualTasks.length - 1) {
          const temp = annualTasks[idx];
          annualTasks[idx] = annualTasks[idx + 1];
          annualTasks[idx + 1] = temp;
        } else {
          return;
        }
        // 重新编号并同步 OMP 派生任务
        annualTasks.forEach((t, i) => {
          const newSeq = i + 1;
          const task = tasks.find(x => x.id === t.id);
          if (task) task.seq = newSeq;
          tasks.filter(dt => dt.annualPlanTaskId === t.id).forEach(dt => {
            dt.seq = newSeq;
          });
        });
        omp_save('tasks', tasks);
        navigate('bp/annual-plan');
      };

      window.ap_addKeyTask = function() {
        window._apEditingKeyTaskId = 'new';
        const kpis = omp_load('kpiInstances');
        const cycleId = window._dsteState.currentCycleId;
        const kpiFields = omp_renderKpiAssociationFields(
          { kpiAssociations: [], dept: '', cycleId },
          'ap-kt',
          { kpis, primaryId: '', supportingIds: [], taskDept: '', primaryDisabled: false, cycleId }
        );
        omp_openModal('添加重点工作', `
          <div class="flex-col-gap-3">
            <div class="grid-2-col">
              <div>
                <label class="form-label">牵引方向</label>
                <select id="ap-kt-dim" class="form-input-compact">
                  <option value="customer">客户</option>
                  <option value="process">流程</option>
                  <option value="financial">财务</option>
                  <option value="learning">学习成长</option>
                </select>
              </div>
            </div>
            <div>
              <label class="form-label">工作名称 *</label>
              <input type="text" id="ap-kt-name" placeholder="如：大客户经营能力提升" class="form-input-compact">
            </div>
            <div>
              <label class="form-label">KMS 链接</label>
              <input type="text" id="ap-kt-kmsurl" placeholder="https://kms.fineres.com/..." class="form-input-compact">
            </div>
            <div>
              <label class="form-label">年度目标</label>
              <input type="text" id="ap-kt-annual-target" placeholder="如：收入提升 10%" class="form-input-compact">
            </div>
            <div class="grid-2-col">
              <div>
                <label class="form-label">关联 SP 链接</label>
                <input type="text" id="ap-kt-sp-link" placeholder="https://..." class="form-input-compact">
              </div>
              <div>
                <label class="form-label">主 BI 看板</label>
                <input type="text" id="ap-kt-bi-dashboard" placeholder="https://..." class="form-input-compact">
              </div>
            </div>
            <div class="grid-2-col">
              <div>
                <label class="form-label">负责人</label>
                <input type="text" id="ap-kt-owner" placeholder="如：陈总监" class="form-input-compact">
              </div>
              <div>
                <label class="form-label">状态</label>
                <select id="ap-kt-status" class="form-input-compact">
                  <option value="planning">规划中</option>
                  <option value="active">进行中</option>
                  <option value="done">已完成</option>
                  <option value="closed">已关闭</option>
                </select>
              </div>
            </div>
            ${kpiFields}
          </div>
          <div class="flex-row justify-flex-end mt-5">
            <button class="btn btn-secondary" data-modal-action="modal-cancel-keytask">取消</button>
            <button class="btn btn-primary" data-modal-action="modal-save-keytask">保存</button>
          </div>
        `, true);
        window.omp_initKpiSearchFields('ap-kt', '');
        if (window.ensurePersonInput) window.ensurePersonInput('ap-kt-owner', '');
      };
      window.ap_editKeyTask = function(ktId) {
        const kts = omp_load('tasks');
        const kt = kts.find(k => k.id === ktId);
        if (!kt) return;
        window._apEditingKeyTaskId = ktId;
        const kpis = omp_load('kpiInstances');
        const primaryId = omp_getPrimaryKpiAssociation(kt)?.kpiInstanceId || '';
        const supportingIds = omp_getSupportingKpiAssociations(kt).map(a => a.kpiInstanceId);
        const kpiFields = omp_renderKpiAssociationFields(kt, 'ap-kt', {
          kpis,
          primaryId,
          supportingIds,
          taskDept: kt.dept || '',
          primaryDisabled: false,
          cycleId: kt.cycleId
        });
        omp_openModal('编辑重点工作', `
          <div class="flex-col-gap-3">
            <div class="grid-2-col">
              <div>
                <label class="form-label">牵引方向</label>
                <select id="ap-kt-dim" class="form-input-compact">
                  <option value="customer" ${kt.bscDimension === 'customer' ? 'selected' : ''}>客户</option>
                  <option value="process" ${kt.bscDimension === 'process' ? 'selected' : ''}>流程</option>
                  <option value="financial" ${kt.bscDimension === 'financial' ? 'selected' : ''}>财务</option>
                  <option value="learning" ${kt.bscDimension === 'learning' ? 'selected' : ''}>学习成长</option>
                </select>
              </div>
            </div>
            <div>
              <label class="form-label">工作名称 *</label>
              <input type="text" id="ap-kt-name" value="${escapeHtml(kt.name)}" class="form-input-compact">
            </div>
            <div>
              <label class="form-label">KMS 链接</label>
              <input type="text" id="ap-kt-kmsurl" value="${escapeHtml(kt.kmsUrl || '')}" class="form-input-compact">
            </div>
            <div>
              <label class="form-label">年度目标</label>
              <input type="text" id="ap-kt-annual-target" value="${escapeHtml(kt.annualTarget || '')}" class="form-input-compact">
            </div>
            <div class="grid-2-col">
              <div>
                <label class="form-label">关联 SP 链接</label>
                <input type="text" id="ap-kt-sp-link" value="${escapeHtml(kt.spLink || '')}" class="form-input-compact">
              </div>
              <div>
                <label class="form-label">主 BI 看板</label>
                <input type="text" id="ap-kt-bi-dashboard" value="${escapeHtml(kt.biDashboard || '')}" class="form-input-compact">
              </div>
            </div>
            <div class="grid-2-col">
              <div>
                <label class="form-label">负责人</label>
                <input type="text" id="ap-kt-owner" value="${escapeHtml(kt.owner || '')}" class="form-input-compact">
              </div>
              <div>
                <label class="form-label">状态</label>
                <select id="ap-kt-status" class="form-input-compact">
                  <option value="planning" ${kt.status === 'planning' ? 'selected' : ''}>规划中</option>
                  <option value="active" ${kt.status === 'active' ? 'selected' : ''}>进行中</option>
                  <option value="done" ${kt.status === 'done' ? 'selected' : ''}>已完成</option>
                  <option value="closed" ${kt.status === 'closed' ? 'selected' : ''}>已关闭</option>
                </select>
              </div>
            </div>
            ${kpiFields}
          </div>
          <div style="display:flex;justify-content:space-between;gap:8px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border-color);">
            <button class="btn btn-sm btn-danger" data-modal-action="modal-delete-keytask"><span class="icon" data-icon="trash" data-icon-size="14"></span> 删除</button>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-secondary" data-modal-action="modal-cancel-keytask">取消</button>
              <button class="btn btn-primary" data-modal-action="modal-save-keytask">保存</button>
            </div>
          </div>
        `, true);
        window.omp_initKpiSearchFields('ap-kt', kt.dept || '');
        if (window.ensurePersonInput) window.ensurePersonInput('ap-kt-owner', kt.owner || '');
      };
      window.ap_saveKeyTask = function() {
        const bscDimension = document.getElementById('ap-kt-dim')?.value || 'customer';
        const name = document.getElementById('ap-kt-name')?.value?.trim();
        const kmsUrl = document.getElementById('ap-kt-kmsurl')?.value?.trim() || '#';
        const annualTarget = document.getElementById('ap-kt-annual-target')?.value?.trim() || '';
        const spLink = document.getElementById('ap-kt-sp-link')?.value?.trim() || '';
        const biDashboard = document.getElementById('ap-kt-bi-dashboard')?.value?.trim() || '';
        const owner = window.getPersonValue ? window.getPersonValue('ap-kt-owner') : (document.getElementById('ap-kt-owner')?.value?.trim() || '');
        const status = document.getElementById('ap-kt-status')?.value || 'planning';
        const kts = omp_load('tasks');
        const editId = window._apEditingKeyTaskId;
        const existingTask = editId !== 'new' ? kts.find(k => k.id === editId) : null;
        const kpiAssociations = omp_collectKpiAssociationsFromForm('ap-kt', existingTask?.kpiAssociations, false);
        if (!name) { showToast('请输入工作名称', 'warning'); return; }
        if (editId === 'new') {
          const cycle = getCurrentCycle();
          const defaultYear = cycle ? cycle.year : new Date().getFullYear();
          const seq = ap_getNextKeyTaskSeq();
          kts.push({
            id: 'kt_' + Date.now(),
            cycleId: window._dsteState.currentCycleId,
            source: 'annual_plan',
            seq,
            name,
            bscDimension,
            kmsUrl,
            annualTarget,
            spLink,
            biDashboard,
            owner,
            status,
            description: '',
            type: 'strategic',
            progress: 0,
            dept: '',
            startDate: `${defaultYear}-01-01`,
            endDate: `${defaultYear}-12-31`,
            kpiAssociations,
            budget: 0,
            actualCost: 0,
          });
        } else {
          const idx = kts.findIndex(k => k.id === editId);
          if (idx > -1) {
            kts[idx] = { ...kts[idx], name, bscDimension, kmsUrl, annualTarget, spLink, biDashboard, owner, status, kpiAssociations };
          }
        }
        omp_save('tasks', kts);
        window._apEditingKeyTaskId = null;
        document.getElementById('omp-active-modal')?.remove();

        // 同步更新派生的 OMP 执行任务负责人与 KPI 关联（若已存在）
        if (editId !== 'new') {
          const derivedTasks = kts.filter(t => t.annualPlanTaskId === editId);
          if (derivedTasks.length > 0) {
            let ompChanged = false;
            derivedTasks.forEach(dt => {
              if (dt.owner !== owner) { dt.owner = owner; ompChanged = true; }
              if (JSON.stringify(dt.kpiAssociations || []) !== JSON.stringify(kpiAssociations)) {
                dt.kpiAssociations = kpiAssociations.map(a => ({ ...a }));
                ompChanged = true;
              }
            });
            if (ompChanged) omp_save('tasks', kts);
          }
        }

        navigate('bp/annual-plan');
      };
      window.ap_deleteKeyTask = function() {
        if (!confirm('确定要删除这个重点工作吗？此操作不可恢复。')) return;
        const editId = window._apEditingKeyTaskId;
        if (!editId || editId === 'new') return;
        let kts = omp_load('tasks');
        kts = kts.filter(k => k.id !== editId);
        kts = ap_renumberKeyTasksAndSync(kts);
        omp_save('tasks', kts);
        window._apEditingKeyTaskId = null;
        document.getElementById('omp-active-modal')?.remove();
        navigate('bp/annual-plan');
      };

      // ===== 年度经营计划 — 分解 KPI（按维度分解）=====
      window.ap_decomposeKpi = function(kpiId) {
        console.log('[AP] decompose called:', kpiId);
        try {
          const kpis = omp_load('kpiInstances');
          const parent = kpis.find(k => k.id === kpiId);
          if (!parent) { console.warn('[AP] parent not found'); return; }
          if (parent.assessmentLevel !== 'marketing-line') {
            showToast('只有营销线级指标可以分解', 'warning');
            return;
          }
          const indicators = omp_load('indicators');
          const ind = indicators.find(i => i.id === parent.indicatorId);
          const dimOptions = Object.entries(DECOMPOSE_DIMENSIONS).map(([key, cfg]) =>
            `<option value="${key}">${cfg.label}</option>`
          ).join('');
          const defaultDim = 'warzone';
          window._apDecomposeDim = defaultDim;
          window._apDecomposeParentId = kpiId;
          omp_openModal('分解 KPI — ' + (ind ? ind.name : parent.indicatorId), `
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
              父级目标: <strong id="ap-decomp-parent-target">${parent.targetValue.toLocaleString()}</strong> ${escapeHtml(parent.unit || '')}
              <span style="margin-left:12px;color:var(--text-tertiary);">(合计需等于父级目标)</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
              <label class="text-sm-secondary">分解维度:</label>
              <select id="ap-decomp-dim" style="padding:4px 8px;border:1px solid var(--border-color);border-radius:4px;background:var(--bg-card);color:var(--text-primary);font-size:13px;">
                ${dimOptions}
              </select>
            </div>
            <div style="max-height:400px;overflow-y:auto;margin-bottom:12px;" id="ap-decomp-table-wrap"></div>
            <div id="ap-decomp-summary" style="padding:10px 12px;border-radius:6px;background:var(--bg-page);font-size:12px;margin-bottom:12px;"></div>
            <div style="display:flex;justify-content:flex-end;gap:8px;">
              <button class="btn btn-secondary" data-modal-action="modal-cancel-decompose">取消</button>
              <button class="btn btn-primary" data-modal-action="modal-save-decompose">保存分解</button>
            </div>
          `, true);
          window.ap_renderDecomposeTable(defaultDim);
          const decompSelect = document.getElementById('ap-decomp-dim');
          if (decompSelect) decompSelect.addEventListener('change', (e) => window.ap_switchDecomposeDim(e.target.value));
        } catch (err) { console.error('[AP] decompose error:', err); showToast('分解弹窗出错: ' + err.message, 'error'); }
      };

      window.ap_getDecomposeChildren = function(parentId, dimKey) {
        const kpis = omp_load('kpiInstances');
        return kpis.filter(k => k.parentId === parentId && (k.decomposeBy || 'warzone') === dimKey);
      };

      window.ap_renderDecomposeTable = function(dimKey) {
        const parentId = window._apDecomposeParentId;
        if (!parentId) return;
        const kpis = omp_load('kpiInstances');
        const parent = kpis.find(k => k.id === parentId);
        if (!parent) return;
        const cfg = DECOMPOSE_DIMENSIONS[dimKey];
        const items = cfg.items;
        const existing = window.ap_getDecomposeChildren(parentId, dimKey);
        const defaultTarget = Math.round(parent.targetValue / items.length);
        const defaultWeight = Math.round(100 / items.length);
        window._apDecomposeDim = dimKey;
        const tableWrap = document.getElementById('ap-decomp-table-wrap');
        if (tableWrap) {
          tableWrap.innerHTML = `
            <table style="width:100%;border-collapse:collapse;font-size:12px;" id="ap-decomp-table">
              <thead>
                <tr class="bg-page">
                  <th style="padding:8px;border-bottom:1px solid var(--border-color);text-align:left;">${cfg.label}</th>
                  <th style="padding:8px;border-bottom:1px solid var(--border-color);text-align:center;width:120px;">目标值</th>
                  <th style="padding:8px;border-bottom:1px solid var(--border-color);text-align:center;width:80px;">权重%</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((z, i) => {
                  const child = existing.find(k => k.dept === z);
                  const target = child ? child.targetValue : defaultTarget;
                  const weight = child ? child.weight : defaultWeight;
                  return `
                    <tr>
                      <td class="p-2" class="border-bottom-light">${z}</td>
                      <td class="p-2" class="border-bottom-light">
                        <input type="number" id="ap-decomp-target-${i}" value="${target}" style="width:100%;padding:4px 8px;border:1px solid var(--border-color);border-radius:4px;background:var(--bg-card);color:var(--text-primary);font-size:12px;" oninput="window.ap_updateDecomposeSummary()">
                      </td>
                      <td class="p-2" class="border-bottom-light">
                        <input type="number" id="ap-decomp-weight-${i}" value="${weight}" style="width:100%;padding:4px 8px;border:1px solid var(--border-color);border-radius:4px;background:var(--bg-card);color:var(--text-primary);font-size:12px;" oninput="window.ap_updateDecomposeSummary()">
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `;
        }
        window.ap_updateDecomposeSummary();
      };

      window.ap_switchDecomposeDim = function(dimKey) {
        window.ap_renderDecomposeTable(dimKey);
      };

      window.ap_updateDecomposeSummary = function() {
        const parentId = window._apDecomposeParentId;
        if (!parentId) return;
        const kpis = omp_load('kpiInstances');
        const parent = kpis.find(k => k.id === parentId);
        if (!parent) return;
        const dimKey = window._apDecomposeDim || 'warzone';
        const cfg = DECOMPOSE_DIMENSIONS[dimKey];
        if (!cfg) return;
        const items = cfg.items;
        let totalTarget = 0;
        let totalWeight = 0;
        for (let i = 0; i < items.length; i++) {
          totalTarget += parseFloat(document.getElementById(`ap-decomp-target-${i}`)?.value) || 0;
          totalWeight += parseFloat(document.getElementById(`ap-decomp-weight-${i}`)?.value) || 0;
        }
        const targetOk = Math.abs(totalTarget - parent.targetValue) < 0.01;
        // 战区维度：权重指各战区组织绩效中该 KPI 的占比，不做求和校验
        const isWarzone = dimKey === 'warzone';
        const targetColor = targetOk ? 'var(--success)' : 'var(--warning)';
        const targetIcon = targetOk ? icon('check', { size: 14 }) : icon('warning', { size: 14 });
        const targetTip = targetOk ? '(等于父级)' : '(与父级不一致，允许保存)';
        const el = document.getElementById('ap-decomp-summary');
        if (el) {
          let html = '<div class="flex-row gap-4">' +
            '<span style="color:' + targetColor + '">' + targetIcon + ' 目标合计: ' + totalTarget.toLocaleString() + ' / ' + parent.targetValue.toLocaleString() + ' ' + targetTip + '</span>';
          if (!isWarzone) {
            const weightOk = Math.abs(totalWeight - 100) < 0.01;
            const weightColor = weightOk ? 'var(--success)' : 'var(--danger)';
            const weightIcon = weightOk ? icon('check', { size: 14 }) : icon('x', { size: 14 });
            const weightTip = weightOk ? '(= 100%)' : '(需 = 100%)';
            html += '<span style="color:' + weightColor + '">' + weightIcon + ' 权重合计: ' + totalWeight + '% ' + weightTip + '</span>';
          }
          html += '</div>';
          el.innerHTML = html;
        }
      };

      window.ap_confirmDecompose = function(parentId) {
        const kpis = omp_load('kpiInstances');
        const parent = kpis.find(k => k.id === parentId);
        if (!parent) return;
        const dimKey = window._apDecomposeDim || 'warzone';
        const isWarzone = dimKey === 'warzone';
        const dimCfg = DECOMPOSE_DIMENSIONS[dimKey];
        if (!dimCfg) { showToast('分解维度配置错误', 'error'); return; }
        const items = dimCfg.items;
        let totalTarget = 0;
        let totalWeight = 0;
        const children = [];
        const now = Date.now();
        items.forEach((item, i) => {
          const target = parseFloat(document.getElementById(`ap-decomp-target-${i}`)?.value) || 0;
          const weight = parseFloat(document.getElementById(`ap-decomp-weight-${i}`)?.value) || 0;
          totalTarget += target;
          totalWeight += weight;
          if (target > 0) {
            children.push({
              id: 'kpi_' + now + '_' + Math.random().toString(36).slice(2, 6) + '_' + i,
              cycleId: window._dsteState.currentCycleId,
              indicatorId: parent.indicatorId,
              period: parent.period,
              targetValue: target,
              challengeValue: Math.round(target * 1.2),
              actualValue: 0,
              achievementRate: 0,
              weight: weight,
              owner: '',
              dept: item,
              status: 'active',
              parentId: parentId,
              level: parent.level + 1,
              assessmentLevel: dimKey === 'team' ? 'team' : 'department',
              bscDimension: parent.bscDimension,
              decomposeBy: dimKey,
              source: 'annual_plan',
              annualPlanKpiId: null,
              history: [],
              x: null, y: null, width: 170, height: 100
            });
          }
        });
        if (Math.abs(totalTarget - parent.targetValue) > 0.01) {
          showToast(`子目标合计 (${totalTarget}) 与父目标 (${parent.targetValue}) 不一致，已保存但建议检查`, 'warning');
        }
        // 自动归一化权重：允许用户只改一个值，保存时按比例调整为合计 100%
        // 战区维度除外：权重为各战区组织绩效中该 KPI 的占比，不做求和校验与归一化
        if (!isWarzone && children.length > 0) {
          if (totalWeight === 0) {
            const equal = Math.floor(100 / children.length);
            let remainder = 100 - equal * children.length;
            children.forEach(child => {
              child.weight = equal + (remainder > 0 ? 1 : 0);
              if (remainder > 0) remainder--;
            });
          } else if (Math.abs(totalWeight - 100) > 0.01) {
            const scale = 100 / totalWeight;
            let newTotal = 0;
            children.forEach((child, idx) => {
              const isLast = idx === children.length - 1;
              child.weight = isLast ? 100 - newTotal : Math.round(child.weight * scale);
              newTotal += child.weight;
            });
          }
          const normalizedTotal = children.reduce((sum, c) => sum + c.weight, 0);
          if (Math.abs(normalizedTotal - 100) > 1) {
            showToast(`权重合计为 ${normalizedTotal}%，必须等于 100%`, 'warning');
            return;
          }
        }
        // 移除同一父级、同一维度下的旧分解子节点，避免重复
        const filteredKpis = kpis.filter(k => !(k.parentId === parentId && (k.decomposeBy || 'warzone') === dimKey));
        filteredKpis.push(...children);
        omp_save('kpiInstances', filteredKpis);
        window._apDecomposeDim = null;
        window._apDecomposeParentId = null;
        document.getElementById('omp-active-modal')?.remove();
        showToast(`已保存 ${children.length} 条分解目标`, 'success');
        navigate('bp/annual-plan');
      };

      // ===== 战略指标库全局函数 =====
      let _indDeptSelector = null;

      function resolveResponsibleDeptName(value) {
        if (!value) return '-';
        if (String(value).startsWith('org:')) {
          const tree = getOrgTree();
          const unit = tree?.orgUnits?.[value];
          if (unit) return unit.name;
        }
        return value;
      }

      function findOrgIdByName(name) {
        if (!name) return null;
        const tree = getOrgTree();
        const units = tree?.orgUnits || {};
        for (const [id, unit] of Object.entries(units)) {
          if (unit.name === name) return id;
        }
        for (const [id, unit] of Object.entries(units)) {
          if (unit.name.includes(name) || name.includes(unit.name)) return id;
        }
        return null;
      }

      window.ind_delete = function(id) {
        const indicators = omp_load('indicators');
        const ind = indicators.find(i => i.id === id);
        if (!ind) return;
        // 检查是否被 KPI 实例使用
        const kpis = omp_load('kpiInstances');
        const usedByKpis = kpis.filter(k => k.indicatorId === id);
        // 检查是否被任务关联
        const tasks = omp_load('tasks');
        const relatedKpiIds = new Set(kpis.filter(k => k.indicatorId === id).map(k => k.id));
        const usedByTasks = tasks.filter(t => (t.kpiAssociations || []).some(a => relatedKpiIds.has(a.kpiInstanceId)));
        const totalUsed = usedByKpis.length + usedByTasks.length;
        if (totalUsed > 0) {
          let msg = `该指标已被 ${totalUsed} 处引用，无法删除：`;
          if (usedByKpis.length > 0) msg += `\n- ${usedByKpis.length} 个 KPI 实例`;
          if (usedByTasks.length > 0) msg += `\n- ${usedByTasks.length} 个重点工作`;
          msg += '\n\n请先将关联项改为其他指标。';
          showToast(msg, 'info');
          return;
        }
        if (!confirm(`确定要删除指标「${ind.name}」吗？此操作不可恢复。`)) return;
        const filtered = indicators.filter(i => i.id !== id);
        omp_save('indicators', filtered);
        window._indicatorState.selectedIndicatorId = null;
        navigate('bp/kpi');
      };

      window.ind_export = function() {
        const indicators = omp_load('indicators');
        const headers = ['编码', '名称', '定义', '计算公式', '单位', '频次', '分类', '子分类', '数据来源', '责任部门', '状态'];
        const rows = indicators.map(i => [
          i.code, i.name, i.description, i.formula, i.unit,
          i.frequency, i.category, i.subCategory, i.dataSource, resolveResponsibleDeptName(i.responsibleDept), i.status
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `战略指标库_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
      };

      function generateIndicatorCode() {
        const indicators = omp_load('indicators') || [];
        let maxNum = 0;
        indicators.forEach(i => {
          const match = String(i.code).match(/^IND_(\d+)$/);
          if (match) {
            maxNum = Math.max(maxNum, parseInt(match[1], 10));
          }
        });
        return `IND_${String(maxNum + 1).padStart(3, '0')}`;
      }

      window.ind_openModal = function(mode, id) {
        const indicators = omp_load('indicators');
        const isEdit = mode === 'edit';
        const ind = isEdit ? indicators.find(i => i.id === id) : null;
        const categories = ['财务', '客户', '流程', '学习成长'];
        const subCats = {
          '财务': ['收入类', '利润类', '成本类', '投资回报类'],
          '客户': ['客户满意度', '客户增长', '客户价值', '市场份额'],
          '流程': ['运营效率', '质量指标', '创新指标', '合规指标'],
          '学习成长': ['人才发展', '组织活力', '数字化能力', '知识管理']
        };
        const freqs = [
          { value: 'monthly', label: '月度' },
          { value: 'quarterly', label: '季度' },
          { value: 'yearly', label: '年度' }
        ];
        const indTypes = [
          { value: 'result', label: '<span class="icon" data-icon="chart-bar" data-icon-size="14"></span> 结果指标' },
          { value: 'process', label: '<span class="icon" data-icon="ruler" data-icon-size="14"></span> 过程指标' }
        ];
        const dataTypes = [
          { value: 'currency', label: '<span class="icon" data-icon="currency-dollar" data-icon-size="14"></span> 金额（万元/元）' },
          { value: 'percentage', label: '<span class="icon" data-icon="chart-line-up" data-icon-size="14"></span> 百分比（%）' },
          { value: 'count', label: '<span class="icon" data-icon="numbers" data-icon-size="14"></span> 计数（个/次）' },
          { value: 'days', label: '<span class="icon" data-icon="calendar" data-icon-size="14"></span> 天数' },
          { value: 'score', label: '⭐ 分数' }
        ];

        omp_openModal(isEdit ? '编辑指标' : '新建指标', `
          <div class="grid-2-col" class="gap-4">
            <div>
              <label class="form-label">指标编码（系统自动生成）</label>
              <input type="text" id="ind-code" value="${isEdit ? ind.code : generateIndicatorCode()}" placeholder="系统自动生成" style="width:100%;padding:8px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--bg-page);color:var(--text-secondary);font-size:13px;" disabled>
            </div>
            <div>
              <label class="form-label">指标名称 *</label>
              <input type="text" id="ind-name" value="${isEdit ? ind.name : ''}" placeholder="如: 合同额" class="form-input-compact">
            </div>
            <div class="grid-full-width">
              <label class="form-label">指标定义 *</label>
              <textarea id="ind-desc" rows="2" placeholder="描述该指标的业务含义和统计口径" class="form-textarea-compact">${isEdit ? ind.description : ''}</textarea>
            </div>
            <div class="grid-full-width">
              <label class="form-label">计算公式</label>
              <input type="text" id="ind-formula" value="${isEdit ? ind.formula : ''}" placeholder="如: SUM(合同金额)" class="form-input-compact">
            </div>
            <div>
              <label class="form-label">单位</label>
              <input type="text" id="ind-unit" value="${isEdit ? ind.unit : ''}" placeholder="如: 万元" class="form-input-compact">
            </div>
            <div>
              <label class="form-label">统计频次</label>
              <select id="ind-freq" class="form-input-compact">
                ${freqs.map(f => `<option value="${f.value}" ${isEdit && ind.frequency === f.value ? 'selected' : ''}>${f.label}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label">指标类型 *</label>
              <select id="ind-type" class="form-input-compact">
                ${indTypes.map(t => `<option value="${t.value}" ${isEdit && ind.indicatorType === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label">数据类型 *</label>
              <select id="ind-data-type" class="form-input-compact">
                ${dataTypes.map(d => `<option value="${d.value}" ${isEdit && ind.dataType === d.value ? 'selected' : ''}>${d.label}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label">BSC分类 *</label>
              <select id="ind-category" class="form-input-compact" onchange="window.ind_updateSubCats()">
                <option value="">请选择</option>
                ${categories.map(c => `<option value="${c}" ${isEdit && ind.category === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label">子分类</label>
              <select id="ind-subcategory" class="form-input-compact">
                ${isEdit ? subCats[ind.category]?.map(s => `<option value="${s}" ${ind.subCategory === s ? 'selected' : ''}>${s}</option>`).join('') : '<option value="">请先选择分类</option>'}
              </select>
            </div>
            <div>
              <label class="form-label">数据来源</label>
              <input type="text" id="ind-source" value="${isEdit ? ind.dataSource : '帆软数仓'}" placeholder="帆软数仓" class="form-input-compact">
            </div>
            <div>
              <label class="form-label">责任部门</label>
              <div id="ind-dept-selector" class="width-full"></div>
            </div>
            <div>
              <label class="form-label">趋势方向</label>
              <select id="ind-positive" class="form-input-compact">
                <option value="true" ${isEdit && ind.isPositive ? 'selected' : ''}>越高越好</option>
                <option value="false" ${isEdit && !ind.isPositive ? 'selected' : ''}>越低越好</option>
              </select>
            </div>
            <div>
              <label class="form-label">状态</label>
              <select id="ind-status" class="form-input-compact">
                <option value="active" ${isEdit && ind.status === 'active' ? 'selected' : ''}>启用</option>
                <option value="disabled" ${isEdit && ind.status === 'disabled' ? 'selected' : ''}>禁用</option>
              </select>
            </div>
          </div>
          <div class="flex-row justify-flex-end mt-5">
            <button class="btn btn-secondary" data-modal-action="modal-close">取消</button>
            <button class="btn btn-primary" onclick="window.ind_save('${isEdit ? id : 'new'}')">保存</button>
          </div>
        `, true);

        const deptSelectorContainer = document.getElementById('ind-dept-selector');
        if (deptSelectorContainer) {
          let initialDeptValue = null;
          if (isEdit && ind.responsibleDept) {
            initialDeptValue = String(ind.responsibleDept).startsWith('org:')
              ? ind.responsibleDept
              : findOrgIdByName(ind.responsibleDept);
          }
          _indDeptSelector = createOrgSelector(deptSelectorContainer, {
            placeholder: '选择责任部门...',
            allowClear: true,
            value: initialDeptValue
          });
        }

        window.ind_updateSubCats = function() {
          const cat = document.getElementById('ind-category').value;
          const subSelect = document.getElementById('ind-subcategory');
          const subs = subCats[cat] || [];
          subSelect.replaceChildren();
          if (subs.length === 0) {
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = '请选择分类';
            subSelect.appendChild(placeholder);
          } else {
            subs.forEach(s => {
              const option = document.createElement('option');
              option.value = s;
              option.textContent = s;
              subSelect.appendChild(option);
            });
          }
        };
      };

      window.ind_save = function(id) {
        const name = document.getElementById('ind-name')?.value?.trim();
        const description = document.getElementById('ind-desc')?.value?.trim();
        const formula = document.getElementById('ind-formula')?.value?.trim();
        const unit = document.getElementById('ind-unit')?.value?.trim();
        const frequency = document.getElementById('ind-freq')?.value;
        const indicatorType = document.getElementById('ind-type')?.value;
        const dataType = document.getElementById('ind-data-type')?.value;
        const category = document.getElementById('ind-category')?.value;
        const subCategory = document.getElementById('ind-subcategory')?.value;
        const dataSource = document.getElementById('ind-source')?.value?.trim();
        const responsibleDept = _indDeptSelector ? _indDeptSelector.getValue() : null;
        const isPositive = document.getElementById('ind-positive')?.value === 'true';
        const status = document.getElementById('ind-status')?.value || 'active';

        if (!name || !description || !category || !indicatorType || !dataType) {
          showToast('请填写必填项（名称、定义、分类、指标类型、数据类型）', 'warning');
          return;
        }

        const indicators = omp_load('indicators');
        let code = document.getElementById('ind-code')?.value?.trim();
        if (id === 'new') {
          while (indicators.some(i => i.code === code)) {
            code = generateIndicatorCode();
          }
          indicators.push({
            id: 'ind_' + Date.now(),
            code, name, description, formula, unit, frequency, indicatorType, dataType, category, subCategory, dataSource, responsibleDept, isPositive, status,
            createdAt: new Date().toISOString().slice(0, 10)
          });
        } else {
          const idx = indicators.findIndex(i => i.id === id);
          if (idx > -1) {
            indicators[idx] = { ...indicators[idx], name, description, formula, unit, frequency, indicatorType, dataType, category, subCategory, dataSource, responsibleDept, isPositive, status };
          }
        }
        omp_save('indicators', indicators);
        document.getElementById('omp-active-modal')?.remove();
        navigate('bp/kpi');
      };


      // ===== 面包屑（精简版：本模块固定属于「战略解码」阶段） =====
      function renderBreadcrumb(pageName) {
        return `
          <div class="breadcrumb">
            <a href="cockpit.html#dashboard" target="_top">驾驶舱</a>
            <span class="breadcrumb-separator">/</span>
            <a href="cockpit.html#bp/kpi" target="_top">战略解码</a>
            <span class="breadcrumb-separator">/</span>
            <span>${pageName}</span>
          </div>
        `;
      }

      // ===== 内部 hash 路由（#bp/kpi 默认 / #bp/annual-plan） =====
      const BP_PAGES = {
        'bp/kpi': renderIndicatorSystem,
        'bp/annual-plan': renderAnnualPlan,
      };
      let currentPage = 'bp/kpi';

      function renderCurrentPage() {
        const contentEl = document.getElementById('bp-page-content');
        if (!contentEl) return;
        const render = BP_PAGES[currentPage] || BP_PAGES['bp/kpi'];
        contentEl.innerHTML = render();
        hydrateIcons(contentEl);
        bindPageEvents(contentEl);
      }

      // 被搬代码中的 navigate('bp/...') 调用语义即「重渲染本页面」，此处 shim 为内部路由
      function navigate(pageId, updateHash = true) {
        if (!BP_PAGES[pageId]) pageId = 'bp/kpi';
        currentPage = pageId;
        if (updateHash && window.location.hash.slice(1) !== pageId) {
          window.location.hash = pageId;
        }
        renderCurrentPage();
      }
      // 暴露全局 navigate（被搬模板中存在 inline onchange 裸调用 navigate(...)）
      window.navigate = navigate;

      // ===== 周期选择栏（standalone 模式显示；embed 模式由 CSS 隐藏，用 cockpit 顶栏全局选择器） =====
      function renderCycleBar() {
        const select = document.getElementById('bp-cycle-select');
        if (!select) return;
        try {
          let cycles = JSON.parse(DSTE.Storage.getString('dste_cycles_v1') || '[]');
          // fallback: 如果周期数据不存在，自动创建默认值（与 cockpit renderCycleSelector 一致）
          if (!cycles || cycles.length === 0) {
            cycles = [2025, 2026, 2027].map(year => ({
              id: `cycle_${year}_marketing`,
              year,
              name: `${year}年度 — 营销线`,
              phase: year < 2026 ? 'archived' : 'planning',
              organization: '营销线',
              parentCycleId: null
            }));
            omp_save('cycles', cycles);
          }
          const currentId = window._dsteState.currentCycleId;
          select.replaceChildren();
          cycles.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.name;
            if (c.id === currentId) option.selected = true;
            select.appendChild(option);
          });
        } catch(e) {}
      }

      // ===== 页面事件委托（ind-* / ap-* 分支，自 cockpit.html bindPageEvents 搬出） =====
      function bindPageEvents(container) {
        if (container._dsteEventsBound) return;
        container._dsteEventsBound = true;
        container.addEventListener('click', (e) => {
          const actionBtn = e.target.closest('[data-action]');
          if (actionBtn) {
            try {
              const action = actionBtn.dataset.action;
              const id = actionBtn.dataset.id;
              switch (action) {
              // ===== 战略指标库事件 =====
              case 'ind-select':
                window._indicatorState.selectedIndicatorId = id;
                navigate('bp/kpi');
                break;
              case 'ind-select-cat':
                window._indicatorState.selectedCategory = actionBtn.dataset.cat;
                window._indicatorState.selectedSubCategory = null;
                window._indicatorState.selectedIndicatorId = null;
                navigate('bp/kpi');
                break;
              case 'ind-select-subcat':
                window._indicatorState.selectedSubCategory = actionBtn.dataset.sub;
                window._indicatorState.selectedIndicatorId = null;
                navigate('bp/kpi');
                break;
              case 'ind-new': window.ind_openModal('new'); break;
              case 'ind-edit': window.ind_openModal('edit', id); break;
              case 'ind-delete': window.ind_delete(id); break;
              case 'ind-export': window.ind_export(); break;
              case 'ind-clear-select':
                window._indicatorState.selectedIndicatorId = null;
                navigate('bp/kpi');
                break;
              case 'ind-filter-freq':
                window._indicatorState.frequencyFilter = actionBtn.value;
                navigate('bp/kpi');
                break;
              case 'ind-filter-status':
                window._indicatorState.statusFilter = actionBtn.value;
                navigate('bp/kpi');
                break;
              // ===== 年度经营计划事件 =====
              case 'ap-switch-tab':
                window._annualPlanState.activeTab = actionBtn.dataset.tab;
                navigate('bp/annual-plan');
                break;
              case 'ap-switch-cycle':
                // 已废弃：周期切换由全局选择器统一处理
                break;
              case 'ap-switch-decompose-dim':
                window._annualPlanState.decomposeDimension = actionBtn.dataset.dim;
                navigate('bp/annual-plan');
                break;
              case 'ap-select-kpi':
                window._annualPlanState.selectedKpiId = id;
                navigate('bp/annual-plan');
                break;
              case 'ap-edit-kpi':
                window._annualPlanState.selectedKpiId = id;
                navigate('bp/annual-plan');
                break;
              case 'ap-close-panel':
                window._annualPlanState.selectedKpiId = null;
                navigate('bp/annual-plan');
                break;
              case 'ap-save-kpi':
                window.ap_saveKpi(id);
                break;
              case 'ap-add-kpi':
                window.ap_addKpi();
                break;
              case 'ap-decompose':
                window.ap_decomposeKpi(id);
                break;
              case 'ap-delete-kpi':
                if (!confirm('确定要删除此 KPI 吗？年度计划侧仅删除源头 KPI，如有子节点将一并删除。')) break;
                const allKpis = omp_load('kpiInstances');
                const rootKpi = allKpis.find(k => k.id === id);
                if (!rootKpi || rootKpi.source === 'omp') {
                  showToast('年度计划侧只能删除源头 KPI', 'warning');
                  break;
                }
                const toDelete = new Set([id]);
                // 递归收集子节点（仅年度计划源头）
                let changed = true;
                while (changed) {
                  changed = false;
                  allKpis.forEach(k => {
                    if (!toDelete.has(k.id) && toDelete.has(k.parentId) && k.source !== 'omp') {
                      toDelete.add(k.id);
                      changed = true;
                    }
                  });
                }
                const filtered = allKpis.filter(k => !toDelete.has(k.id));
                omp_save('kpiInstances', filtered);
                window._annualPlanState.selectedKpiId = null;
                navigate('bp/annual-plan');
                break;
              case 'ap-publish':
                window.ap_publishToExecution();
                break;
              case 'ap-add-keytask':
                window.ap_addKeyTask();
                break;
              case 'ap-edit-keytask':
                window.ap_editKeyTask(id);
                break;
              }
            } catch (err) {
              console.error('[BP] 处理操作失败:', actionBtn.dataset.action, err);
            }
            return;
          }
        });

        // 战略指标库：搜索框实时搜索（防抖）
        const searchInput = container.querySelector('#ind-search');
        if (searchInput) {
          let debounceTimer;
          searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              window._indicatorState.searchQuery = e.target.value.trim();
              navigate('bp/kpi');
            }, 300);
          });
        }

      }

      // ===== 弹窗按钮事件委托（modal-*，自 cockpit.html 搬出 BP 分支） =====
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-modal-action]');
        if (!btn) return;
        const action = btn.dataset.modalAction;
        switch (action) {
          case 'modal-close':
          case 'modal-cancel-add-kpi':
            document.getElementById('omp-active-modal')?.remove();
            break;
          case 'modal-save-add-kpi':
            window.ap_confirmAddKpi();
            break;
          case 'modal-cancel-keytask':
            window._apEditingKeyTaskId = null;
            document.getElementById('omp-active-modal')?.remove();
            break;
          case 'modal-save-keytask':
            window.ap_saveKeyTask();
            break;
          case 'modal-delete-keytask':
            window.ap_deleteKeyTask();
            break;
          case 'modal-cancel-decompose':
            window._apDecomposeDim = null;
            document.getElementById('omp-active-modal')?.remove();
            break;
          case 'modal-save-decompose':
            window.ap_confirmDecompose(window._apDecomposeParentId);
            break;
        }
      });

      // ===== 初始化 =====
      function init() {
        renderCycleBar();
        const cycleSelect = document.getElementById('bp-cycle-select');
        if (cycleSelect) {
          cycleSelect.addEventListener('change', (e) => {
            window._dsteState.currentCycleId = e.target.value;
            DSTE.Storage.setString(CYCLE_STORAGE_KEY, e.target.value);
            renderCurrentPage();
          });
        }

        // 初始路由：embed 模式由 cockpit 经 ?pageId= 指定，否则读 hash
        const initialPage = new URLSearchParams(location.search).get('pageId')
          || window.location.hash.slice(1) || 'bp/kpi';
        navigate(initialPage, false);
        window.addEventListener('hashchange', () => {
          const pageId = window.location.hash.slice(1) || 'bp/kpi';
          if (pageId !== currentPage) navigate(pageId, false);
        });

        // 周期联动：cockpit（父页面 / 并列标签页）切换周期时重渲染当前页
        window.addEventListener('storage', (e) => {
          if (e.key !== CYCLE_STORAGE_KEY || !e.newValue) return;
          if (e.newValue === window._dsteState.currentCycleId) return;
          window._dsteState.currentCycleId = e.newValue;
          renderCycleBar();
          renderCurrentPage();
        });
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
})();
