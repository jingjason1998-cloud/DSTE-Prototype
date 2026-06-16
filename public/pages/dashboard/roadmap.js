/**
 * RoadMap 开发路线图模块
 * 从 cockpit.html 抽离，降低单文件复杂度
 */

window.renderDevTimeline = function() {
        const fallbackData = {
          versions: [
            {
              version: 'v0.4.0',
              date: '2026-05-27',
              status: 'released',
              changes: [
                { type: 'Added', desc: '战略洞察与专题整合页面（数据看板+专题CRUD+AI匹配）' },
                { type: 'Added', desc: '经营分析会模块重构（会议增强+决议跟踪+日历视图）' },
                { type: 'Changed', desc: '全局响应式改造：4断点体系+汉堡菜单+导航栏优化' },
                { type: 'Changed', desc: '统一页面过渡效果：所有页面共享 fadeIn 动画' },
                { type: 'Fixed', desc: 'Road Map 时间线默认显示最新版本' }
              ]
            },
            {
              version: 'v0.3.5',
              date: '2026-05-26',
              status: 'released',
              changes: [
                { type: 'Added', desc: 'iframe 嵌入模式（?embed=1）+ 自适应高度' },
                { type: 'Added', desc: '通用嵌入架构：main.css 统一管理' },
                { type: 'Added', desc: '报表中心：独立报表目录页面（开口设计）' },
                { type: 'Fixed', desc: 'shell.css 404 导致导航栏错乱' }
              ]
            },
            {
              version: 'v0.3.4',
              date: '2026-05-25',
              status: 'released',
              changes: [
                { type: 'Fixed', desc: 'Road Map 版本历史记录补全' },
                { type: 'Fixed', desc: '版本标识统一为语义化版本 v0.3.4' }
              ]
            },
            {
              version: 'v0.3.3',
              date: '2026-05-23',
              status: 'released',
              changes: [
                { type: 'Added', desc: 'reviewer 6维度述职场景（SP战略关联度+态度与反思）' },
                { type: 'Added', desc: 'SonarCloud 代码质量自动监控' },
                { type: 'Fixed', desc: 'vertical-segment-review 维度配置升级' },
                { type: 'Security', desc: 'GitHub Actions CI 强制门禁' }
              ]
            },
            {
              version: 'v0.3.2',
              date: '2026-05-22',
              status: 'released',
              changes: [
                { type: 'Added', desc: '数据迁移工具页面 migrate-data.html' },
                { type: 'Fixed', desc: 'reviewer.html 场景维度卡片缺失修复' }
              ]
            },
            {
              version: 'v0.3.1',
              date: '2026-05-21',
              status: 'released',
              changes: [
                { type: 'Added', desc: 'Road Map 交互增强' }
              ]
            },
            {
              version: 'v0.3.0',
              date: '2026-05-21',
              status: 'released',
              changes: [
                { type: 'Added', desc: '新增开发路线图 Road Map 页面' },
                { type: 'Added', desc: '系统管理侧边栏分组' },
                { type: 'Added', desc: '版本时间线轴 + 甘特图 + 统计面板' },
                { type: 'Added', desc: '模块进度筛选功能' }
              ]
            },
            {
              version: 'v0.2.0',
              date: '2026-05-21',
              status: 'released',
              changes: [
                { type: 'Added', desc: '经营分析会页面全面升级' },
                { type: 'Added', desc: '新增决议跟踪面板（6条决议+进度条）' },
                { type: 'Added', desc: '会议列表增强（议题标签+材料状态）' },
                { type: 'Added', desc: '顶部筛选栏（季度/状态）' },
                { type: 'Fixed', desc: '修复 Light 模式 CSS 变量被 @media 错误嵌套' }
              ]
            },
            {
              version: 'v0.1.0',
              date: '2026-05-21',
              status: 'released',
              changes: [
                { type: 'Added', desc: '驾驶舱首页（6阶段导航+侧边栏+SPA路由）' },
                { type: 'Added', desc: '会议材料审核助手（智能审核+雷达图+批量）' },
                { type: 'Added', desc: '业务专题管理（CRUD+ST/AT议题导入）' },
                { type: 'Added', desc: '统一主题系统（Light/Dark跨页面同步）' },
                { type: 'Added', desc: '登录页（科技感网格背景）' },
                { type: 'Added', desc: 'pytest 回归测试 30 个用例' },
                { type: 'Security', desc: '会议审核 XSS 防护（sanitizeUrl协议白名单）' },
                { type: 'Security', desc: '空矩阵守卫（Array.isArray校验）' }
              ]
            }
          ],
          modules: [
            { name: '驾驶舱首页', progress: 100, status: 'done', targetVersion: 'v0.4.0' },
            { name: '会议审核助手', progress: 100, status: 'done', targetVersion: 'v0.1.0' },
            { name: '业务专题管理', progress: 100, status: 'done', targetVersion: 'v0.1.0' },
            { name: '经营分析会', progress: 100, status: 'done', targetVersion: 'v0.4.0' },
            { name: '战略洞察与专题', progress: 100, status: 'done', targetVersion: 'v0.4.0' },
            { name: '开发路线图', progress: 100, status: 'done', targetVersion: 'v0.3.0' },
            { name: 'KPI 看板', progress: 35, status: 'doing', targetVersion: 'v0.5.0' },
            { name: '战略地图', progress: 0, status: 'todo', targetVersion: 'v0.5.0' },
            { name: 'BEM 战略解码', progress: 0, status: 'todo', targetVersion: 'v0.5.0' },
            { name: '用户权限系统', progress: 0, status: 'todo', targetVersion: 'v1.0.0' }
          ],
          upcoming: [
            { name: '战略地图可视化（BSC 四维度）', priority: '高', eta: 'v0.5.0' },
            { name: 'KPI 看板数据对接', priority: '高', eta: 'v0.5.0' },
            { name: '2026 年度经营计划编制', priority: '高', eta: 'v0.6.0' },
            { name: 'BEM 战略解码工具', priority: '中', eta: 'v0.6.0' },
            { name: '战略复盘与差距分析', priority: '中', eta: 'v0.7.0' },
            { name: '干部管理与继任计划', priority: '中', eta: 'v0.7.0' },
            { name: '用户权限与角色管理', priority: '中', eta: 'v1.0.0' },
            { name: '数据导出与报表中心', priority: '低', eta: 'v1.0.0' }
          ],
          plans: [
            { id: 'PLAN-001', name: '战略洞察与专题整合', priority: '高', status: '已完成', owner: 'AI-1', targetVersion: 'v0.4.0' },
            { id: 'PLAN-002', name: '经营分析会重构', priority: '高', status: '已完成', owner: 'AI-1', targetVersion: 'v0.4.0' },
            { id: 'PLAN-003', name: '全局响应式改造', priority: '中', status: '已完成', owner: 'AI-2', targetVersion: 'v0.4.0' },
            { id: 'PLAN-004', name: '战略地图可视化（BSC）', priority: '高', status: '开发中', owner: 'AI-2', targetVersion: 'v0.5.0' },
            { id: 'PLAN-005', name: 'KPI 看板数据对接', priority: '高', status: '开发中', owner: 'AI-1', targetVersion: 'v0.5.0' },
            { id: 'PLAN-006', name: 'BEM 战略解码工具', priority: '中', status: '设计中', owner: 'AI-2', targetVersion: 'v0.5.0' },
            { id: 'PLAN-007', name: '用户权限系统方案', priority: '高', status: '待评审', owner: '待分配', targetVersion: 'v1.0.0' },
            { id: 'PLAN-008', name: '数据导出与报表中心', priority: '中', status: '设计中', owner: 'AI-1', targetVersion: 'v1.0.0' }
          ]
        };
        const roadmapData = (window._roadmapData && window._roadmapData.versions && window._roadmapData.modules)
          ? window._roadmapData
          : fallbackData;
        // 保证数据结构兼容：若 JSON 缺少 upcoming/plans，使用兜底
        if (!roadmapData.upcoming) roadmapData.upcoming = fallbackData.upcoming;
        if (!roadmapData.plans) roadmapData.plans = fallbackData.plans;

        // 状态常量
        const typeColors = { 'Added': 'var(--success)', 'Fixed': 'var(--primary)', 'Changed': 'var(--warning)', 'Security': 'var(--danger)' };
        const typeLabels = { 'Added': '新增', 'Fixed': '修复', 'Changed': '变更', 'Security': '安全' };
        const moduleStatusColor = { 'done': 'var(--success)', 'doing': 'var(--primary)', 'todo': 'var(--border-color)' };
        const moduleStatusLabel = { 'done': '已达成', 'doing': '攻坚中', 'todo': '战略必争' };
        const planStatusColor = { '已完成': 'var(--success)', '开发中': 'var(--primary)', '设计中': 'var(--warning)', '待评审': 'var(--border-color)', '测试中': 'var(--info)' };
        const priorityColor = { '高': 'var(--danger)', '中': 'var(--warning)', '低': 'var(--success)' };

        // 派生数据
        const latestVersion = roadmapData.versions[0] || { version: 'v0.0.0', date: '-' };
        const nextTargetVersion = roadmapData.upcoming[0]?.eta || 'v1.0.0';
        const nextTargetName = roadmapData.upcoming[0]?.name || '战略目标';
        function compareVersion(a, b) {
          const parse = v => v.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
          const av = parse(a), bv = parse(b);
          for (let i = 0; i < Math.max(av.length, bv.length); i++) {
            const diff = (av[i] || 0) - (bv[i] || 0);
            if (diff !== 0) return diff;
          }
          return 0;
        }
        const delayedCount = roadmapData.modules.filter(m => m.status === 'todo' && compareVersion(m.targetVersion, latestVersion.version) <= 0).length;
        const currentMonth = new Date().toISOString().slice(0, 7);
        const thisMonthReleases = roadmapData.versions.filter(v => v.date && v.date.startsWith(currentMonth)).length
          + roadmapData.plans.filter(p => p.eta && p.eta.startsWith(currentMonth)).length;
        const releasedCount = roadmapData.versions.filter(v => v.status === 'released').length;
        const featureCount = roadmapData.versions.reduce((sum, v) => sum + (v.changes || []).filter(c => c.type === 'Added').length, 0);
        const fixCount = roadmapData.versions.reduce((sum, v) => sum + (v.changes || []).filter(c => c.type === 'Fixed').length, 0);
        const todoCount = roadmapData.upcoming.length;

        // ① 执行摘要 KPI
        const kpiCards = [
          { label: '当前版本', value: latestVersion.version, sub: latestVersion.date || '-', color: 'var(--primary)', icon: '📦' },
          { label: '下一目标', value: nextTargetVersion, sub: nextTargetName, color: 'var(--warning)', icon: '🎯' },
          { label: '已延期', value: delayedCount, sub: '待启动模块', color: 'var(--danger)', icon: '⚠️' },
          { label: '本月发布', value: thisMonthReleases, sub: '版本/计划', color: 'var(--success)', icon: '🚀' }
        ];
        const executiveSummary = `
          <div class="card" style="margin-bottom: 16px; padding: 16px 20px;">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;" id="roadmap-kpi-summary">
              ${kpiCards.map(k => `
                <div style="padding: 14px 16px; background: var(--bg-page); border-radius: 8px; border-left: 3px solid ${k.color}; transition: transform 0.2s, box-shadow 0.2s; cursor: pointer;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
                  <div style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 6px;">${k.icon} ${k.label}</div>
                  <div style="font-size: 28px; font-weight: 700; color: ${k.color}; line-height: 1;">${k.value}</div>
                  <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 6px;">${k.sub}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        // ② 纵向时间线（默认）+ 横向时间线（可切换）
        const buildTimelineHorizontal = () => {
          const items = roadmapData.versions.map((v, i) => {
            const color = v.status === 'released' ? 'var(--success)' : 'var(--warning)';
            const pulse = v.status === 'released' ? '' : 'animation: pulse 2s infinite;';
            const keyChanges = (v.changes || []).slice(0, 2).map(c => `<span style="padding: 1px 6px; border-radius: 3px; font-size: 10px; background: ${typeColors[c.type]}18; color: ${typeColors[c.type]};">${escapeHtml(c.desc.substring(0, 8))}${c.desc.length > 8 ? '...' : ''}</span>`).join('');
            return `
              <div class="timeline-node" style="display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 100px; cursor: pointer; padding: 8px; border-radius: 8px; transition: background 0.2s;" data-scroll-to="version-${v.version}" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
                <div style="width: 14px; height: 14px; border-radius: 50%; background: ${color}; box-shadow: 0 0 0 4px ${color}33; ${pulse}"></div>
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${v.version}</div>
                <div style="font-size: 11px; color: var(--text-tertiary);">${v.date}</div>
                <div style="font-size: 11px; color: ${color}; font-weight: 500;">${v.status === 'released' ? '已发布' : '开发中'}</div>
                <div style="display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-top: 2px;">${keyChanges}</div>
              </div>
            `;
          });
          const nodes = items.map((item, i) => {
            if (i === items.length - 1) return item;
            const connectorColor = roadmapData.versions[i].status === 'released' ? 'var(--success)' : 'var(--border-color)';
            const connectorStyle = roadmapData.versions[i].status === 'released' ? 'solid' : 'dashed';
            return item + `<div style="flex: 1; height: 2px; background: ${connectorColor}; margin-top: 6px; min-width: 30px; border-top: 2px ${connectorStyle} ${connectorColor};"></div>`;
          }).join('');
          const milestoneNode = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 100px;">
              <div style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--primary); background: transparent;"></div>
              <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">v1.0.0</div>
              <div style="font-size: 11px; color: var(--text-tertiary);">待定</div>
              <div style="font-size: 11px; color: var(--primary); font-weight: 500;">战略目标</div>
            </div>
          `;
          return `
            <div id="dev-timeline-horizontal" class="roadmap-timeline-horizontal" style="display: none; align-items: flex-start; justify-content: flex-start; gap: 0; overflow-x: auto; padding-bottom: 8px;">
              ${nodes}
              <div style="flex: 1; height: 2px; border-top: 2px dashed var(--border-color); margin-top: 6px; min-width: 40px;"></div>
              ${milestoneNode}
            </div>
          `;
        };

        const buildTimelineVertical = () => {
          return `
            <div id="dev-timeline-vertical" class="roadmap-timeline-vertical" style="display: flex; flex-direction: column; gap: 0;">
              ${roadmapData.versions.map((v, i) => {
                const color = v.status === 'released' ? 'var(--success)' : 'var(--warning)';
                const pulse = v.status === 'released' ? '' : 'animation: pulse 2s infinite;';
                const keyChanges = (v.changes || []).slice(0, 3).map(c => `
                  <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary);">
                    <span style="padding: 1px 6px; border-radius: 3px; font-size: 10px; background: ${typeColors[c.type]}22; color: ${typeColors[c.type]}; font-weight: 500;">${typeLabels[c.type]}</span>
                    <span>${escapeHtml(c.desc.length > 36 ? c.desc.slice(0, 36) + '...' : c.desc)}</span>
                  </div>
                `).join('');
                const isLast = i === roadmapData.versions.length - 1;
                return `
                  <div class="timeline-node-vertical" data-scroll-to="version-${v.version}" style="display: flex; gap: 16px; position: relative; padding-bottom: ${isLast ? '0' : '16px'}; cursor: pointer;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
                    ${!isLast ? `<div style="position: absolute; left: 6px; top: 22px; bottom: 0; width: 2px; background: ${roadmapData.versions[i].status === 'released' ? 'var(--success)' : 'var(--border-color)'};"></div>` : ''}
                    <div style="display: flex; flex-direction: column; align-items: center; z-index: 1;">
                      <div style="width: 14px; height: 14px; border-radius: 50%; background: ${color}; box-shadow: 0 0 0 4px ${color}33; ${pulse}"></div>
                    </div>
                    <div style="flex: 1; padding-bottom: 4px;">
                      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                        <span style="font-size: 15px; font-weight: 600; color: var(--text-primary);">${v.version}</span>
                        <span style="font-size: 11px; color: var(--text-tertiary);">${v.date}</span>
                        <span style="padding: 1px 8px; border-radius: 4px; font-size: 11px; background: ${color}22; color: ${color}; font-weight: 500;">${v.status === 'released' ? '已发布' : '开发中'}</span>
                      </div>
                      <div style="display: flex; flex-direction: column; gap: 4px;">${keyChanges}</div>
                    </div>
                  </div>
                `;
              }).join('')}
              <div class="timeline-node-vertical" style="display: flex; gap: 16px; position: relative;">
                <div style="display: flex; flex-direction: column; align-items: center; z-index: 1;">
                  <div style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--primary); background: transparent;"></div>
                </div>
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                    <span style="font-size: 15px; font-weight: 600; color: var(--text-primary);">v1.0.0</span>
                    <span style="font-size: 11px; color: var(--text-tertiary);">待定</span>
                    <span style="padding: 1px 8px; border-radius: 4px; font-size: 11px; background: var(--primary)22; color: var(--primary); font-weight: 500;">战略目标</span>
                  </div>
                </div>
              </div>
            </div>
          `;
        };

        // ②③ 周视图看板
        const buildTimelineWeekly = () => {
          // ISO 周工具函数
          function getISOWeek(date) {
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
          }
          function getWeekStart(year, week) {
            const jan4 = new Date(Date.UTC(year, 0, 4));
            const jan4Day = jan4.getUTCDay() || 7;
            const start = new Date(Date.UTC(year, 0, 4 - jan4Day + 1 + (week - 1) * 7));
            return start;
          }
          function formatDateCN(date) {
            return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
          }
          function parseDateOrVersion(value) {
            if (!value) return null;
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value + 'T00:00:00Z');
            // 尝试按版本号找日期，如 v0.5.0
            const matched = roadmapData.versions.find(v => v.version === value);
            if (matched && matched.date) return new Date(matched.date + 'T00:00:00Z');
            return null;
          }

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const currentYear = today.getFullYear();
          const currentWeek = getISOWeek(today);

          // 生成 2 周前 ~ 4 周后 + 后续
          const weeks = [];
          for (let offset = -2; offset <= 4; offset++) {
            let y = currentYear;
            let w = currentWeek + offset;
            // 简单跨年处理
            const weeksInYear = offset > 0 ? 52 : 53;
            if (w > weeksInYear) { w -= weeksInYear; y += 1; }
            if (w < 1) { w += 52; y -= 1; }
            const start = getWeekStart(y, w);
            const end = new Date(start);
            end.setUTCDate(end.getUTCDate() + 6);
            weeks.push({ year: y, week: w, start, end, key: `${y}-W${String(w).padStart(2, '0')}`, label: `${y}-W${String(w).padStart(2, '0')}` });
          }
          weeks.push({ key: 'later', label: '后续 / 待定', start: null, end: null });

          // 收集所有可落周的项目
          const items = [];
          roadmapData.versions.forEach(v => {
            if (v.date) {
              items.push({ type: 'version', date: new Date(v.date + 'T00:00:00Z'), data: v });
            }
          });
          (roadmapData.plans || []).forEach(p => {
            const d = parseDateOrVersion(p.eta);
            if (d) items.push({ type: 'plan', date: d, data: p });
            else items.push({ type: 'plan', date: null, data: p });
          });
          (roadmapData.upcoming || []).forEach(u => {
            const d = parseDateOrVersion(u.eta);
            if (d) items.push({ type: 'upcoming', date: d, data: u });
            else items.push({ type: 'upcoming', date: null, data: u });
          });

          // 按周分组
          const columns = weeks.map(w => {
            const colItems = items.filter(it => {
              if (w.key === 'later') return it.date === null;
              return it.date && it.date >= w.start && it.date <= w.end;
            });
            return { ...w, items: colItems };
          });

          const isCurrentWeek = (w) => w.year === currentYear && w.week === currentWeek;

          return `
            <div id="dev-timeline-weekly" class="roadmap-timeline-weekly" style="display: none; overflow-x: auto; padding-bottom: 8px;">
              <div style="display: grid; grid-template-columns: repeat(${columns.length}, minmax(160px, 1fr)); gap: 12px; min-width: 900px;">
                ${columns.map(col => {
                  const isCurrent = isCurrentWeek(col);
                  const isPast = col.end && col.end < today;
                  return `
                    <div class="weekly-column" data-week="${col.key}" style="background: ${isPast ? 'var(--bg-secondary)' : 'var(--bg-page)'}; border: 1px solid ${isCurrent ? 'var(--primary)' : 'var(--border-color)'}; border-radius: 8px; padding: 10px; opacity: ${isPast ? 0.85 : 1};">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border-light);">
                        <div>
                          <div style="font-size: 13px; font-weight: 600; color: ${isCurrent ? 'var(--primary)' : 'var(--text-secondary)'};">${col.label}</div>
                          ${col.start ? `<div style="font-size: 11px; color: var(--text-tertiary); margin-top: 2px;">${formatDateCN(col.start)} - ${formatDateCN(col.end)}</div>` : ''}
                        </div>
                        ${isCurrent ? '<span style="font-size: 10px; padding: 1px 6px; background: var(--primary)22; color: var(--primary); border-radius: 10px;">本周</span>' : ''}
                      </div>
                      <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${col.items.map(it => {
                          if (it.type === 'version') {
                            const v = it.data;
                            return `
                              <div class="weekly-card weekly-version-card" data-version-name="${escapeHtml(v.version)}" data-scroll-to="version-${v.version}" style="padding: 8px; background: var(--bg-card); border-radius: 6px; border-left: 3px solid var(--success); cursor: pointer;" onclick="document.getElementById('version-${v.version}')?.scrollIntoView({behavior:'smooth',block:'center'})">
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                  <span style="font-size: 11px;">🏷️</span>
                                  <span style="font-size: 12px; font-weight: 600; color: var(--text-primary);">${v.version}</span>
                                </div>
                                <div style="font-size: 11px; color: var(--text-tertiary);">${v.date}</div>
                              </div>
                            `;
                          }
                          if (it.type === 'plan') {
                            const p = it.data;
                            const priority = p.priority || '中';
                            return `
                              <div class="weekly-card weekly-plan-card" data-plan-name="${escapeHtml(p.name)}" data-plan-owner="${escapeHtml(p.owner)}" data-plan-priority="${priority}" style="padding: 8px; background: var(--bg-card); border-radius: 6px; border-top: 3px solid ${priorityColor[priority] || 'var(--primary)'};">
                                <div style="font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${p.name}</div>
                                <div style="display: flex; gap: 4px; margin-bottom: 4px;">
                                  <span style="padding: 1px 5px; border-radius: 3px; font-size: 10px; background: ${planStatusColor[p.status] || 'var(--border-color)'}22; color: ${planStatusColor[p.status] || 'var(--text-tertiary)'};">${p.id}</span>
                                  <span style="padding: 1px 5px; border-radius: 3px; font-size: 10px; background: ${priorityColor[priority] || 'var(--border-color)'}22; color: ${priorityColor[priority] || 'var(--text-tertiary)'};">${priority}</span>
                                </div>
                                <div style="font-size: 11px; color: var(--text-tertiary);">👤 ${p.owner || '待分配'} · ${p.targetVersion}</div>
                                ${p.progress !== undefined ? `
                                  <div style="margin-top: 6px;">
                                    <div style="height: 3px; background: var(--border-light); border-radius: 2px; overflow: hidden;">
                                      <div style="width: ${p.progress}%; height: 100%; background: ${planStatusColor[p.status] || 'var(--primary)'};"></div>
                                    </div>
                                  </div>
                                ` : ''}
                              </div>
                            `;
                          }
                          const u = it.data;
                          const priority = u.priority || '中';
                          return `
                            <div class="weekly-card weekly-upcoming-card" data-upcoming-name="${escapeHtml(u.name)}" data-upcoming-priority="${priority}" style="padding: 8px; background: var(--bg-card); border-radius: 6px; border: 1px dashed var(--border-color);">
                              <div style="font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${u.name}</div>
                              <div style="display: flex; gap: 4px;">
                                <span style="padding: 1px 5px; border-radius: 3px; font-size: 10px; background: var(--bg-page); color: var(--text-tertiary);">${u.eta || '待定'}</span>
                                <span style="padding: 1px 5px; border-radius: 3px; font-size: 10px; background: ${priorityColor[priority] || 'var(--border-color)'}22; color: ${priorityColor[priority] || 'var(--text-tertiary)'};">${priority}</span>
                              </div>
                            </div>
                          `;
                        }).join('') || '<div style="text-align:center;color:var(--text-tertiary);font-size:12px;padding:12px 0;">暂无</div>'}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        };

        // ③ 甘特图
        const ganttRows = roadmapData.modules.map(m => `
          <div data-module-status="${m.status}" data-module-name="${escapeHtml(m.name)}" style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-light); transition: background 0.2s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
            <div style="width: 120px; font-size: 13px; color: var(--text-secondary); font-weight: 500;">${m.name}</div>
            <div style="flex: 1; display: flex; align-items: center; gap: 10px;">
              <div style="flex: 1; height: 8px; background: var(--bg-page); border-radius: 4px; overflow: hidden;">
                <div style="width: ${m.progress}%; height: 100%; background: ${moduleStatusColor[m.status]}; border-radius: 4px; transition: width 0.8s ease-out;"></div>
              </div>
              <span style="font-size: 12px; color: var(--text-tertiary); width: 36px; text-align: right;">${m.progress}%</span>
            </div>
            <div style="width: 70px; text-align: center;">
              <span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; background: ${moduleStatusColor[m.status]}22; color: ${moduleStatusColor[m.status]}; font-weight: 500;">${moduleStatusLabel[m.status]}</span>
            </div>
            <div style="width: 70px; font-size: 11px; color: var(--text-tertiary); text-align: center;">${m.targetVersion}</div>
          </div>
        `).join('');

        // ④ 版本详情（默认折叠显示最新 2 个）
        const visibleVersions = roadmapData.versions.slice(0, 2);
        const hiddenVersions = roadmapData.versions.slice(2);
        const buildVersionCard = (v, hidden) => `
          <div id="version-${v.version}" class="roadmap-version-card ${hidden ? 'roadmap-version-hidden' : ''}" data-version-status="${v.status}" data-version-name="${escapeHtml(v.version)}" style="padding: 14px 16px; background: var(--bg-page); border-radius: 8px; border-left: 3px solid ${v.status === 'released' ? 'var(--success)' : 'var(--warning)'}; transition: transform 0.2s;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform=''">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 15px; font-weight: 600; color: var(--text-primary);">${v.version}</span>
                <span style="font-size: 11px; color: var(--text-tertiary);">${v.date}</span>
              </div>
              <span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; background: ${v.status === 'released' ? 'var(--success)' : 'var(--warning)'}22; color: ${v.status === 'released' ? 'var(--success)' : 'var(--warning)'}; font-weight: 500;">${v.status === 'released' ? '已发布' : '开发中'}</span>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${(v.changes || []).slice(0, 4).map(c => `
                <span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; background: ${typeColors[c.type]}18; color: ${typeColors[c.type]}; font-weight: 500;">${typeLabels[c.type]} ${escapeHtml(c.desc.length > 24 ? c.desc.slice(0, 24) + '...' : c.desc)}</span>
              `).join('')}
            </div>
          </div>
        `;

        // ⑤ Upcoming 里程碑
        const upcomingMilestones = roadmapData.upcoming.slice(0, 6).map(u => `
          <div data-upcoming-name="${escapeHtml(u.name)}" style="display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid var(--border-light);">
            <div style="width: 10px; height: 10px; border-radius: 50%; background: ${priorityColor[u.priority] || 'var(--border-color)'}; margin-top: 4px; flex-shrink: 0;"></div>
            <div style="flex: 1;">
              <div style="font-size: 13px; color: var(--text-primary); font-weight: 500;">${u.name}</div>
              <div style="display: flex; gap: 8px; margin-top: 4px; font-size: 11px; color: var(--text-tertiary);">
                <span>目标版本 ${u.eta}</span>
                <span style="padding: 0 6px; border-radius: 3px; background: ${priorityColor[u.priority] || 'var(--border-color)'}22; color: ${priorityColor[u.priority] || 'var(--text-tertiary)'}">${u.priority}</span>
              </div>
            </div>
          </div>
        `).join('');

        // ⑥ 开发计划看板
        const kanbanColumns = ['待评审', '设计中', '开发中', '测试中'];
        const kanbanIcons = { '待评审': '📥', '设计中': '🎨', '开发中': '💻', '测试中': '🧪' };
        const planStatusOrder = { '待评审': 0, '设计中': 1, '开发中': 2, '测试中': 3, '已完成': 4 };
        const activePlans = roadmapData.plans.filter(p => planStatusOrder[p.status] !== undefined && planStatusOrder[p.status] < 4);
        const buildKanban = () => {
          return `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 4px 0;" class="kanban-grid">
              ${kanbanColumns.map(col => {
                const cards = activePlans.filter(p => p.status === col);
                return `
                  <div class="kanban-column" data-kanban-status="${col}" style="background: var(--bg-secondary); border-radius: 8px; padding: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                      <span style="font-size: 13px; font-weight: 600; color: var(--text-secondary);">${kanbanIcons[col]} ${col}</span>
                      <span style="font-size: 11px; color: var(--text-tertiary); padding: 1px 6px; background: var(--bg-page); border-radius: 10px;">${cards.length}</span>
                    </div>
                    ${cards.map(p => `
                      <div class="plan-card" data-plan-name="${escapeHtml(p.name)}" data-plan-owner="${escapeHtml(p.owner)}" data-plan-priority="${p.priority || '中'}" style="padding: 10px; background: var(--bg-page); border-radius: 6px; margin-bottom: 8px; border-top: 3px solid ${priorityColor[p.priority || '中'] || 'var(--primary)'}; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                          <span style="font-size: 12px; font-weight: 600; color: var(--text-primary);">${p.name}</span>
                        </div>
                        <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                          <span style="padding: 1px 6px; border-radius: 3px; font-size: 10px; background: ${planStatusColor[p.status] || 'var(--border-color)'}22; color: ${planStatusColor[p.status] || 'var(--text-tertiary)'};">${p.id}</span>
                          <span style="padding: 1px 6px; border-radius: 3px; font-size: 10px; background: ${priorityColor[p.priority || '中'] || 'var(--border-color)'}22; color: ${priorityColor[p.priority || '中'] || 'var(--text-tertiary)'}">${p.priority || '中'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-tertiary);">
                          <span style="display: flex; align-items: center; gap: 4px;">
                            <span style="width: 18px; height: 18px; border-radius: 50%; background: var(--primary); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 10px;">${(p.owner || '待').slice(0, 2)}</span>
                            ${p.owner}
                          </span>
                          <span>${p.targetVersion}</span>
                        </div>
                        ${p.eta ? `<div style="font-size: 11px; color: var(--text-tertiary); margin-top: 4px;">ETA ${p.eta}</div>` : ''}
                        ${p.progress !== undefined ? `
                          <div style="margin-top: 6px;">
                            <div style="height: 4px; background: var(--border-light); border-radius: 2px; overflow: hidden;">
                              <div style="width: ${p.progress}%; height: 100%; background: ${planStatusColor[p.status] || 'var(--primary)'}; border-radius: 2px; transition: width 0.8s ease-out;"></div>
                            </div>
                          </div>
                        ` : ''}
                      </div>
                    `).join('') || '<div style="text-align:center;color:var(--text-tertiary);font-size:12px;padding:8px;">暂无</div>'}
                  </div>
                `;
              }).join('')}
            </div>
          `;
        };

        // 统计与目标面板（右侧）
        const statsPanel = `
          <div class="card">
            <div class="card-header"><div class="card-title">📈 版本统计</div></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 8px 0;">
              <div style="text-align: center; padding: 14px; background: var(--bg-page); border-radius: 8px;">
                <div style="font-size: 28px; font-weight: 700; color: var(--success);">${releasedCount}</div>
                <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">已发布版本</div>
              </div>
              <div style="text-align: center; padding: 14px; background: var(--bg-page); border-radius: 8px;">
                <div style="font-size: 28px; font-weight: 700; color: var(--primary);">${featureCount}</div>
                <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">功能数</div>
              </div>
              <div style="text-align: center; padding: 14px; background: var(--bg-page); border-radius: 8px;">
                <div style="font-size: 28px; font-weight: 700; color: var(--warning);">${fixCount}</div>
                <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">Bug 修复</div>
              </div>
              <div style="text-align: center; padding: 14px; background: var(--bg-page); border-radius: 8px;">
                <div style="font-size: 28px; font-weight: 700; color: var(--danger);">${todoCount}</div>
                <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">计划中</div>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">🚀 目标版本</div></div>
            <div style="padding: 8px 0; text-align: center;">
              <div style="font-size: 32px; margin-bottom: 8px;">🎯</div>
              <div style="font-size: 22px; font-weight: 700; color: var(--primary);">${nextTargetVersion}</div>
              <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">${nextTargetName}</div>
              <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 8px;">关联 ${activePlans.filter(p => p.targetVersion === nextTargetVersion).length} 个计划</div>
            </div>
          </div>
        `;

        return `
          ${window.renderBreadcrumb('开发路线图 Road Map')}
          <div class="page-header">
            <h1 class="page-title">开发路线图 Road Map</h1>
            <div class="page-actions" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <input type="text" id="roadmap-search" placeholder="搜索版本、计划、模块..." style="padding: 6px 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 13px; min-width: 180px; background: var(--bg-card); color: var(--text-primary);" oninput="window.searchRoadmap(this.value)">
              <button class="btn btn-secondary" data-roadmap-view="two-column" onclick="window.toggleRoadmapLayout()">双栏</button>
              <button class="btn btn-secondary roadmap-timeline-btn" data-roadmap-timeline="vertical" onclick="window.setRoadmapTimeline('vertical')">纵向时间线</button>
              <button class="btn btn-secondary roadmap-timeline-btn" data-roadmap-timeline="horizontal" onclick="window.setRoadmapTimeline('horizontal')">横向时间线</button>
              <button class="btn btn-secondary roadmap-timeline-btn" data-roadmap-timeline="weekly" onclick="window.setRoadmapTimeline('weekly')">周视图</button>
              <button class="btn btn-secondary" data-filter-roadmap="all">全部</button>
              <button class="btn btn-secondary" data-filter-roadmap="done">已达成</button>
              <button class="btn btn-secondary" data-filter-roadmap="doing">攻坚中</button>
              <button class="btn btn-secondary" data-filter-roadmap="todo">战略必争</button>
            </div>
          </div>

          <!-- 执行摘要 -->
          ${executiveSummary}

          <!-- 主内容区 -->
          <div id="roadmap-main-layout" data-roadmap-layout="two-column" style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 16px;">
            <!-- 左栏 -->
            <div id="roadmap-left-column" style="display: flex; flex-direction: column; gap: 16px;">
              <!-- 时间线 -->
              <div class="card" style="padding: 20px;">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <div class="card-title">🕒 版本时间线</div>
                  <span style="font-size: 12px; color: var(--text-tertiary);">共 ${roadmapData.versions.length} 个版本</span>
                </div>
                ${buildTimelineVertical()}
                ${buildTimelineHorizontal()}
                ${buildTimelineWeekly()}
              </div>

              <!-- 甘特图 -->
              <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                  <div class="card-title">📊 模块开发进度</div>
                  <span style="font-size: 12px; color: var(--text-tertiary);">共 ${roadmapData.modules.length} 个模块</span>
                </div>
                <div style="padding: 4px 0;">
                  <div style="display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border-color); font-size: 12px; font-weight: 600; color: var(--text-tertiary);">
                    <div style="width: 120px;">模块</div>
                    <div style="flex: 1;">进度</div>
                    <div style="width: 36px;"></div>
                    <div style="width: 70px; text-align: center;">状态</div>
                    <div style="width: 70px; text-align: center;">目标版本</div>
                  </div>
                  ${ganttRows}
                </div>
              </div>

              <!-- 版本详情 -->
              <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                  <div class="card-title">📝 版本详情</div>
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <span style="font-size: 12px; color: var(--text-tertiary);">显示 ${Math.min(2, roadmapData.versions.length)} / ${roadmapData.versions.length}</span>
                    <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;" onclick="window.toggleVersionDetails()" id="roadmap-expand-versions">展开全部</button>
                  </div>
                </div>
                <div id="roadmap-version-list" style="display: flex; flex-direction: column; gap: 10px; padding: 4px 0;">
                  ${visibleVersions.map(v => buildVersionCard(v, false)).join('')}
                  ${hiddenVersions.map(v => buildVersionCard(v, true)).join('')}
                </div>
              </div>
            </div>

            <!-- 右栏 -->
            <div id="roadmap-right-column" style="display: flex; flex-direction: column; gap: 16px;">
              ${statsPanel}
              <div class="card">
                <div class="card-header"><div class="card-title">📅 Upcoming 里程碑</div></div>
                <div style="padding: 4px 0;">${upcomingMilestones}</div>
              </div>
              <div class="card">
                <div class="card-header"><div class="card-title">📋 开发计划看板</div></div>
                ${buildKanban()}
              </div>
            </div>
          </div>

          <div class="related-links">
            <div class="related-links-label">关联功能</div>
            <div class="related-links-row">
              <a class="related-link" href="#dashboard" data-navigate="dashboard">🎛️ 驾驶舱概览</a>
              <a class="related-link" href="reviewer.html">📋 会议材料审核</a>
              <a class="related-link" href="business-topics.html">📂 业务专题管理</a>
            </div>
          </div>

          <style>
            @keyframes pulse {
              0%, 100% { box-shadow: 0 0 0 4px rgba(250,173,20,0.2); }
              50% { box-shadow: 0 0 0 8px rgba(250,173,20,0.05); }
            }
            @keyframes pulse-dot {
              0%, 100% { box-shadow: 0 0 0 2px rgba(24,144,255,0.25); }
              50% { box-shadow: 0 0 0 6px rgba(24,144,255,0.08); }
            }
            .roadmap-version-hidden { display: none !important; }
            .roadmap-timeline-weekly::-webkit-scrollbar { height: 8px; }
            .roadmap-timeline-weekly::-webkit-scrollbar-track { background: var(--bg-secondary); border-radius: 4px; }
            .roadmap-timeline-weekly::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
            .weekly-card { transition: transform 0.2s, box-shadow 0.2s; }
            .weekly-card:hover { transform: translateY(-2px); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
            @media (max-width: 1024px) {
              #roadmap-main-layout[data-roadmap-layout="two-column"] { grid-template-columns: 1fr !important; }
            }
            @media (max-width: 768px) {
              #roadmap-kpi-summary { grid-template-columns: repeat(2, 1fr) !important; }
              .kanban-grid { grid-template-columns: repeat(2, 1fr) !important; }
            }
            @media (max-width: 480px) {
              #roadmap-kpi-summary { grid-template-columns: 1fr !important; }
              .kanban-grid { grid-template-columns: 1fr !important; }
            }
          </style>

          <div class="related-links">
            <div class="related-links-label">关联功能</div>
            <div class="related-links-row">
              <a class="related-link" href="#dashboard" data-navigate="dashboard">🎛️ 驾驶舱概览</a>
              <a class="related-link" href="reviewer.html">📋 会议材料审核</a>
              <a class="related-link" href="business-topics.html">📂 业务专题管理</a>
            </div>
          </div>
        `;
      }
// 开发路线图交互函数
window._setRoadmapTimeline = function(direction) {
        const vertical = document.getElementById('dev-timeline-vertical');
        const horizontal = document.getElementById('dev-timeline-horizontal');
        const weekly = document.getElementById('dev-timeline-weekly');
        const btns = document.querySelectorAll('.roadmap-timeline-btn');
        if (!vertical || !horizontal || !weekly) return;

        vertical.style.display = direction === 'vertical' ? 'flex' : 'none';
        horizontal.style.display = direction === 'horizontal' ? 'flex' : 'none';
        weekly.style.display = direction === 'weekly' ? 'block' : 'none';

        btns.forEach(btn => {
          const isActive = btn.dataset.roadmapTimeline === direction;
          btn.style.background = isActive ? 'var(--primary)' : '';
          btn.style.color = isActive ? '#fff' : '';
          btn.style.borderColor = isActive ? 'var(--primary)' : '';
        });
        sessionStorage.setItem('roadmapTimelineDirection', direction);
      }
window.setRoadmapTimeline = function(direction) {
        window._setRoadmapTimeline(direction);
      }
window.toggleRoadmapTimeline = function() {
        const directions = ['vertical', 'horizontal', 'weekly'];
        const current = sessionStorage.getItem('roadmapTimelineDirection') || 'vertical';
        const next = directions[(directions.indexOf(current) + 1) % directions.length];
        window._setRoadmapTimeline(next);
      }
window.toggleRoadmapLayout = function() {
        const layout = document.getElementById('roadmap-main-layout');
        const btn = document.querySelector('[data-roadmap-view]');
        if (!layout || !btn) return;
        const current = layout.dataset.roadmapLayout || 'two-column';
        if (current === 'two-column') {
          layout.style.gridTemplateColumns = '1fr';
          layout.dataset.roadmapLayout = 'single';
          btn.textContent = '单栏';
          btn.dataset.roadmapView = 'single';
        } else {
          layout.style.gridTemplateColumns = '2fr 1fr';
          layout.dataset.roadmapLayout = 'two-column';
          btn.textContent = '双栏';
          btn.dataset.roadmapView = 'two-column';
        }
      }
window.toggleVersionDetails = function() {
        const btn = document.getElementById('roadmap-expand-versions');
        if (!btn) return;
        const expanded = btn.dataset.expanded === 'true';
        const cards = document.querySelectorAll('.roadmap-version-card');
        cards.forEach((el, i) => {
          if (i < 2) return; // 前 2 个版本始终可见
          el.classList.toggle('roadmap-version-hidden', expanded);
        });
        btn.textContent = expanded ? '展开全部' : '收起';
        btn.dataset.expanded = expanded ? 'false' : 'true';
      }
window.searchRoadmap = function(keyword) {
        const k = (keyword || '').toLowerCase().trim();
        // 模块行
        document.querySelectorAll('[data-module-name]').forEach(el => {
          el.style.display = !k || el.dataset.moduleName.toLowerCase().includes(k) ? '' : 'none';
        });
        // 版本卡片
        document.querySelectorAll('.roadmap-version-card').forEach(el => {
          const text = (el.dataset.versionName + ' ' + el.textContent).toLowerCase();
          el.style.display = !k || text.includes(k) ? '' : 'none';
          if (k && text.includes(k)) el.classList.remove('roadmap-version-hidden');
        });
        // 计划卡片
        document.querySelectorAll('.plan-card').forEach(el => {
          const text = (el.dataset.planName + ' ' + el.dataset.planOwner + ' ' + el.textContent).toLowerCase();
          el.style.display = !k || text.includes(k) ? '' : 'none';
        });
        // Upcoming
        document.querySelectorAll('[data-upcoming-name]').forEach(el => {
          el.style.display = !k || el.dataset.upcomingName.toLowerCase().includes(k) ? '' : 'none';
        });
        // 周视图卡片
        document.querySelectorAll('.weekly-version-card').forEach(el => {
          const text = (el.dataset.versionName + ' ' + el.textContent).toLowerCase();
          el.style.display = !k || text.includes(k) ? '' : 'none';
        });
        document.querySelectorAll('.weekly-plan-card').forEach(el => {
          const text = (el.dataset.planName + ' ' + el.dataset.planOwner + ' ' + el.textContent).toLowerCase();
          el.style.display = !k || text.includes(k) ? '' : 'none';
        });
        document.querySelectorAll('.weekly-upcoming-card').forEach(el => {
          const text = (el.dataset.upcomingName + ' ' + el.textContent).toLowerCase();
          el.style.display = !k || text.includes(k) ? '' : 'none';
        });
      }
window.filterRoadmap = function(filter) {
        // 模块行
        const rows = document.querySelectorAll('[data-module-status]');
        rows.forEach(row => {
          const status = row.dataset.moduleStatus;
          row.style.display = (filter === 'all' || status === filter) ? '' : 'none';
        });
        // 版本卡片
        document.querySelectorAll('.roadmap-version-card').forEach(card => {
          const status = card.dataset.versionStatus;
          const show = filter === 'all' || (filter === 'done' && status === 'released') || (filter === 'todo' && status !== 'released');
          card.style.display = show ? '' : 'none';
        });
        // 计划卡片：todo 筛选展示所有待办计划，done 不展示计划，doing 展示开发中/测试中
        document.querySelectorAll('.plan-card').forEach(card => {
          const priority = card.dataset.planPriority;
          let show = filter === 'all';
          if (filter === 'todo') show = priority === '高';
          else if (filter === 'doing') show = true;
          else if (filter === 'done') show = false;
          card.style.display = show ? '' : 'none';
        });
        // 时间线节点：todo 隐藏历史已发布版本，只展示未发布
        document.querySelectorAll('.timeline-node-vertical, .timeline-node').forEach(node => {
          const target = node.dataset.scrollTo;
          if (!target) return;
          const versionEl = document.getElementById(target);
          if (versionEl) node.style.display = versionEl.style.display === 'none' ? 'none' : '';
        });
        // 周视图版本卡片
        document.querySelectorAll('.weekly-version-card').forEach(card => {
          const target = card.dataset.scrollTo;
          if (!target) return;
          const versionEl = document.getElementById(target);
          if (versionEl) card.style.display = versionEl.style.display === 'none' ? 'none' : '';
        });
        // 周视图计划卡片
        document.querySelectorAll('.weekly-plan-card').forEach(card => {
          const priority = card.dataset.planPriority;
          let show = filter === 'all';
          if (filter === 'todo') show = priority === '高';
          else if (filter === 'doing') show = true;
          else if (filter === 'done') show = false;
          card.style.display = show ? '' : 'none';
        });
        // 周视图 upcoming 卡片
        document.querySelectorAll('.weekly-upcoming-card').forEach(card => {
          const priority = card.dataset.upcomingPriority || '中';
          let show = filter === 'all';
          if (filter === 'todo') show = priority === '高';
          else if (filter === 'doing') show = false;
          else if (filter === 'done') show = false;
          card.style.display = show ? '' : 'none';
        });
      }