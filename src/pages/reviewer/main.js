import { icon } from '../../../assets/js/icons.js';
        // 自动判断后端地址：
        // - file:// 打开 → 用 localhost（本地开发）
        // - http://localhost 打开 → 用 localhost:8766（本地开发）
        // - https:// 打开（KMS嵌入）→ 用 HTTPS 代理地址
        // - http:// 打开 → 用部署域名 HTTPS
        let PROXY_URL = '';
        if (window.location.protocol === 'file:') {
            PROXY_URL = 'http://localhost:8766';
        } else if (window.location.protocol === 'http:' && window.location.hostname === 'localhost') {
            PROXY_URL = 'http://localhost:8766';
        } else if (window.location.hostname === 'dste.fineres.com' || window.location.hostname === 'Dste.fineres.com') {
            PROXY_URL = '';  // 使用相对路径，由 nginx 反向代理到后端审核服务
        }
        // 允许 本地存储 覆盖（高级用户调试）
        PROXY_URL = DSTE.Storage.getString('meetingReviewerProxyUrl') || PROXY_URL;

        let currentPrompt = '';
        let currentReport = '';

        let currentPageInfo = null;
        let scenes = [];
        
        // 本地场景配置（代理不可用时作为备用）
        const LOCAL_SCENES = [
            { id: 'vertical-segment-review', short_name: '垂直客群-落后述职' },
            { id: 'lagging-region-review', short_name: '落后战区业绩承诺会' },
            { id: 'annual-leader-review', short_name: '负责人年度述职' },
            { id: 'general-topic-review', short_name: '通用议题材料审核（以本部会为例）' }
        ];

        // 加载场景列表
        async function loadScenes() {
            const select = document.getElementById('sceneSelect');
            let sceneList = [];
            try {
                // 1秒超时：代理不可用时快速回退到本地配置
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1000);
                const resp = await fetch(PROXY_URL + '/api/scenes', { method: 'GET', mode: 'cors', signal: controller.signal });
                clearTimeout(timeoutId);
                const data = await resp.json();
                if (data.success && data.scenes && data.scenes.length > 0) {
                    sceneList = data.scenes;
                }
            } catch(e) {
                console.log('从代理加载场景失败，使用本地配置:', e);
            }
            // 如果代理没有返回或返回为空，使用本地配置
            if (sceneList.length === 0) {
                sceneList = LOCAL_SCENES;
            } else {
                // 用本地 short_name 覆盖后端返回的名称（方案A：前端映射）
                sceneList = sceneList.map(s => {
                    const local = LOCAL_SCENES.find(ls => ls.id === s.id);
                    return local ? { ...s, short_name: local.short_name } : s;
                });
            }
            // 确保通用议题评审场景始终存在，名称与本地保持一致
            const hasGeneral = sceneList.some(s => s.id === 'general-topic-review');
            if (!hasGeneral) {
                sceneList.push({
                    id: 'general-topic-review',
                    name: '通用议题材料审核（以本部会为例）',
                    short_name: '通用议题材料审核（以本部会为例）',
                    description: '针对特定业务问题的深度分析'
                });
            }
            scenes = sceneList;
            select.innerHTML = '<option value="">默认场景</option>';
            sceneList.forEach(scene => {
                const opt = document.createElement('option');
                opt.value = scene.id;
                opt.textContent = scene.short_name || scene.name;
                select.appendChild(opt);
            });
        }

        loadScenes();

        // 各场景评审维度卡片数据
        const sceneDimensionData = {
            'general-topic-review': [
                {
                    dim: '目标-解决方案对齐度',
                    weight: '30分',
                    body: '议题背景清晰、问题定义精准（现象vs根因）、方案直接对应问题根因。不是"通报情况"，而是"请求决策"',
                    bottom: ' 红线：零决策请求 = 打回重写',
                    bottomClass: 'red'
                },
                {
                    dim: '决策支撑度',
                    weight: '30分',
                    body: '关键论点有数据/案例/对比支撑；提供明确的决策建议及备选方案对比；包含风险评估和资源需求清单',
                    bottom: ' 红线：零数据支撑 = 打回补充',
                    bottomClass: 'red'
                },
                {
                    dim: '行动具体化',
                    weight: '25分',
                    body: 'SMART原则：具体(S)、可衡量(M)、可达成(A)、相关(R)、有时限(T)。每个行动项必须有责任人和时间节点',
                    bottom: ' 红线：零责任主体或零时间计划 = 打回明确',
                    bottomClass: 'red'
                },
                {
                    dim: '材料规范度',
                    weight: '15分',
                    body: '结构清晰（背景→问题→分析→方案→决策请求）、篇幅可控（≤15页核心内容）、表达精简无空话套话',
                    bottom: '扣分：结构混乱(-4)/篇幅失控(-3)/空话过多(-3)',
                    bottomClass: 'yellow'
                }
            ],
            'vertical-segment-review': [
                {
                    dim: '完整性',
                    weight: '35分',
                    body: '述职材料完整覆盖要求的模块：市场现状与竞争格局、业绩达成回顾、核心差距识别、根因分析、下一步行动计划。缺少任一模块均影响评审有效性',
                    bottom: ' 红线：缺少市场现状或业绩回顾 = 打回补充',
                    bottomClass: 'red'
                },
                {
                    dim: '差距与根因分析',
                    weight: '20分',
                    body: '业绩差距需量化呈现（目标vs实际，同比/环比），根因分析需深入业务本质而非表面归因。建议使用5Why或鱼骨图等结构化方法，避免"市场环境不好"等空泛结论',
                    bottom: ' 红线：差距无量化数据或根因停留在表面 = 打回重做',
                    bottomClass: 'red'
                },
                {
                    dim: '业绩预测达成概率分析',
                    weight: '10分',
                    body: '对未来业绩目标的预测需有逻辑支撑（历史趋势、市场容量、竞争态势、资源投入），明确给出达成概率评估及关键假设条件。避免"一定能完成"等主观断言',
                    bottom: ' 红线：无概率评估或假设条件缺失 = 打回完善',
                    bottomClass: 'red'
                },
                {
                    dim: '下一步计划',
                    weight: '20分',
                    body: '改进措施需具体可执行，明确责任人和时间节点，与差距分析形成闭环。优先解决根因中的高影响项，资源需求和支持请求需清晰列出',
                    bottom: ' 红线：措施与根因脱节或缺少责任人/时间节点 = 打回明确',
                    bottomClass: 'red'
                },
                {
                    dim: 'SP战略关联度',
                    weight: '10分',
                    body: '述职内容需与SP战略方向明确对齐，体现战略解码成果。展示本部门/区域如何承接公司战略，关键举措与战略目标的映射关系清晰',
                    bottom: ' 红线：未提及战略方向或缺少对齐分析 = 打回补充',
                    bottomClass: 'red'
                },
                {
                    dim: '态度与反思',
                    weight: '5分',
                    body: '展现积极的问题意识和改进意愿，对过往失误有坦诚反思，不回避、不推诿。体现持续改进的管理者素养',
                    bottom: '扣分：回避问题(-2)/推诿责任(-2)/缺乏反思(-1)',
                    bottomClass: 'yellow'
                }
            ],
            'lagging-region-review': [
                {
                    dim: '目标承诺',
                    weight: '20分',
                    body: '战区必须做出明确的业绩承诺，承诺内容可衡量、可追踪。需包含：当月业绩承诺目标(5分)、累计业绩承诺目标(4分)、同比数据及目标(3分)、业绩缺口分析(4分)、承诺目标可量化可衡量(4分)。承诺目标需有数据/商机/历史依据支撑，拒绝拍脑袋',
                    bottom: '一票否决：未做出业绩承诺（目标承诺维度为0分）→ 直接退回重写 R5',
                    bottomClass: 'red'
                },
                {
                    dim: '行动具体化',
                    weight: '30分',
                    body: '每个行动项必须符合SMART原则，明确责任人和时间节点。含：每个行动项有明确责任人(8分)、明确时间节点(8分)、行动描述具体S(4分)、有可衡量的产出/验收标准M(4分)、行动与业绩目标关联R(3分)、行动切实可行A(3分)。拒绝"加强管理"等笼统表述',
                    bottom: '一票否决：行动方案完全无责任人或无时间节点（行动具体化维度低于10分）→ 直接退回重写 R5',
                    bottomClass: 'red'
                },
                {
                    dim: '材料规范度',
                    weight: '35分',
                    body: '材料结构完整，必需章节齐全。含：财务建议≥3条(7分)、销售运营中心建议≥3条(7分)、项目运营中心建议≥3条(7分)、战区内部分析(7分)、上月承诺复盘(条件触发)(7分)。上月做了业绩承诺但未达成时，必须复盘。拒绝建议雷同、仅罗列数据无洞察',
                    bottom: ' 严重：缺少必需章节（如财务建议/运营建议/项目建议）→ 大幅扣分，可能影响上会',
                    bottomClass: 'yellow'
                },
                {
                    dim: '数据质量',
                    weight: '15分',
                    body: '数据准确、逻辑自洽、无明显计算错误。含：同比/环比计算正确(4分)、百分比总和校验(3分)、数量级合理(3分)、正负号符合业务逻辑(2分)、关键指标计算正确(3分)。不深入验证数据来源真实性，但聚焦明显计算错误和逻辑矛盾',
                    bottom: '一票否决：数据存在重大错误导致决策误导（数据质量维度低于5分）→ 直接退回重写 R5',
                    bottomClass: 'red'
                }
            ],
            'annual-leader-review': [
                {
                    dim: '完整性',
                    weight: '25分',
                    body: '年度述职必须覆盖8大模块：年度目标达成回顾、关键战役复盘、团队建设与人才培养、个人能力提升、客户/市场洞察、资源使用效率、问题反思与根因、下年度规划',
                    bottom: ' 缺少≥3个模块 → 完整性维度大幅扣分',
                    bottomClass: 'yellow'
                },
                {
                    dim: 'SP战略关联度',
                    weight: '25分',
                    body: '个人/团队目标必须与公司SP、部门BP对齐。包含4层对齐检查：公司SP、部门BP、个人PBC→SP、下年计划→SP。SP机会覆盖度≥80%不扣分',
                    bottom: '一票否决：计划与SP方向明显冲突 → SP维度 = 0分',
                    bottomClass: 'red'
                },
                {
                    dim: '态度与反思',
                    weight: '25分',
                    body: '坦诚反思、敢于自我批判。评估维度：诚实度（不隐藏失败）、自我批判（归因于内≥40%）、成长思维（具体学习计划）、领导力反思（领导风格与团队影响）',
                    bottom: '一票否决：≥5处推卸责任且零自我批判 → 态度维度 ≤ 5分',
                    bottomClass: 'red'
                },
                {
                    dim: '下一步计划',
                    weight: '25分',
                    body: '下年度规划具体可执行。要求：目标量化、关键战役3-5个、教训应用、资源明确、风险预案。年度连续性：2025问题→2026行动→2026目标',
                    bottom: ' 目标定性或计划与教训脱节 → 大幅扣分',
                    bottomClass: 'yellow'
                }
            ]
        };

        function renderPrincipleCards(sceneId) {
            const container = document.getElementById('principleCardsContainer');
            if (!container) return;
            const activeScene = sceneId || 'general-topic-review';
            const dims = sceneDimensionData[activeScene] || [];
            if (dims.length === 0) {
                container.innerHTML = '<div class="principle-card" style="opacity:0.6;text-align:center;padding:24px 0;">该场景评审维度暂未配置</div>';
                return;
            }
            container.innerHTML = dims.map(d => `
                <div class="principle-card" data-dim="${d.dim}">
                    <div class="dim-title">${d.dim} <span class="dim-weight">${d.weight}</span></div>
                    <div class="dim-body">${d.body}</div>
                    <div class="dim-bottom ${d.bottomClass}">${d.bottom}</div>
                </div>
            `).join('');
        }

        function getLocalFocusDimensions(sceneId) {
            const map = {
                'vertical-segment-review': ['完整性', '差距与根因分析', '业绩预测达成概率分析', '下一步计划', 'SP战略关联度', '态度与反思'],
                'lagging-region-review': ['目标承诺', '行动具体化', '材料规范度', '数据质量'],
                'annual-leader-review': ['完整性', 'SP战略关联度', '态度与反思', '下一步计划'],
                'general-topic-review': ['目标-解决方案对齐度', '决策支撑度', '行动具体化', '材料规范度']
            };
            return map[sceneId] || [];
        }

        function highlightFocusDimensions(focusDims) {
            const cards = document.querySelectorAll('.principle-card');
            cards.forEach(card => {
                const dim = card.getAttribute('data-dim');
                if (!dim) return;
                const match = focusDims.some(fd => dim === fd || dim.includes(fd) || fd.includes(dim));
                if (match) card.classList.add('focus');
            });
        }

        function updatePassStandard(sceneId) {
            const stdBody = document.getElementById('passStandardBody');
            if (!stdBody) return;
            const activeScene = sceneId || 'general-topic-review';
            const standards = {
                'general-topic-review': {
                    score: '≥80分',
                    extra: '未触碰红线：零决策请求 / 零数据支撑 / 零责任主体 / 零时间计划',
                    note: '触碰红线 → 总分封顶60分'
                },
                'vertical-segment-review': {
                    score: '≥75分',
                    extra: '且根因分析深度 ≥12分（单项底线）',
                    note: '根因分析低于12分 → 直接待修改'
                },
                'lagging-region-review': {
                    score: 'R2及以上（≥80分）',
                    extra: 'R1(90-100)直接上会 / R2(80-89)微调上会 / R3(70-79)修改重审 / R4(60-69)大幅修改 / R5(0-59)退回重写',
                    note: '一票否决：零业绩承诺 / 行动无责任人 / 行动无时间节点 / 数据重大错误'
                },
                'annual-leader-review': {
                    score: '≥80分',
                    extra: '且态度与反思 ≥15分（防止数据漂亮但反思空洞）',
                    note: '缺少≥3个模块 → 大幅扣分 / 零自我反思 → 态度维度≤5分'
                }
            };
            const s = standards[activeScene] || standards['general-topic-review'];
            stdBody.innerHTML = `
                <div class="std-item"><span class="std-dot"></span><span>总分 <strong>${s.score}</strong></span></div>
                <div class="std-item"><span class="std-dot"></span><span>${s.extra}</span></div>
                <div style="margin-top:6px;padding:6px 10px;background:#fff;border-radius:6px;border:1px solid #e5e7eb;font-size:0.85em;color:#6b7280;">
                    ${s.note}
                </div>
            `;
        }

        function resetReportArea() {
            // 重置评分总览
            const totalEl = document.getElementById('analysisTotalScore');
            const badgeEl = document.getElementById('analysisStatusBadge');
            const dimsBox = document.getElementById('scoreBoardDims');
            const bottomLine = document.getElementById('scoreBoardBottomLine');
            if (totalEl) totalEl.textContent = '--';
            if (badgeEl) { badgeEl.textContent = '审核中'; badgeEl.className = 'analysis-status-badge'; }
            if (dimsBox) dimsBox.innerHTML = '';
            if (bottomLine) bottomLine.innerHTML = '';

            // 重置分项评分表
            const tbody = document.getElementById('dimensionTableBody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#666;">等待审核结果...</td></tr>';

            // 隐藏问题清单、改进建议、亮点、结论
            ['issuesCard','suggestionsCard','highlightsCard','conclusionCard'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });

            // 清空事实检查和原始报告
            const factCheckBox = document.getElementById('factCheckBox');
            const reportBox = document.getElementById('reportBox');
            if (factCheckBox) factCheckBox.innerHTML = '';
            if (reportBox) reportBox.innerHTML = '';

            // 收起事实检查和原始报告
            const factCheckContent = document.getElementById('factCheckContent');
            const rawReportContent = document.getElementById('rawReportContent');
            const factCheckBar = document.getElementById('factCheckBar');
            const rawReportBar = document.getElementById('rawReportBar');
            if (factCheckContent) factCheckContent.classList.remove('expanded');
            if (rawReportContent) rawReportContent.classList.remove('expanded');
            if (factCheckBar) factCheckBar.classList.remove('expanded');
            if (rawReportBar) rawReportBar.classList.remove('expanded');
        }

        // 场景选择变化时重新渲染维度卡片、更新合格标准、重置报告区域
        document.getElementById('sceneSelect').addEventListener('change', async function() {
            const sceneId = this.value;

            // 先渲染对应场景的维度卡片
            renderPrincipleCards(sceneId);

            // 更新合格标准
            updatePassStandard(sceneId);

            // 如果报告区域已显示，重置并提示重新审核
            const reportSection = document.getElementById('reportSection');
            if (reportSection && !reportSection.classList.contains('hidden')) {
                resetReportArea();
                // 在合格标准下方添加场景切换提示
                const stdBody = document.getElementById('passStandardBody');
                if (stdBody) {
                    stdBody.innerHTML += '<div style="margin-top:8px;padding:6px 10px;background:#fffbeb;border-radius:6px;border:1px solid #fcd34d;font-size:0.85em;color:#92400e;"> 场景已切换，请重新执行审核以获取当前场景的评审结果</div>';
                }
            }

            if (!sceneId) return;

            // 获取场景详情
            let focusDims = [];
            try {
                const resp = await fetch(PROXY_URL + '/api/scenes/' + sceneId, { method: 'GET', mode: 'cors' });
                const data = await resp.json();
                if (data.success && data.scene && data.scene.focus_dimensions) {
                    focusDims = data.scene.focus_dimensions;
                }
            } catch(e) {
                console.log('从代理获取场景详情失败:', e);
            }

            // 本地备用映射
            if (focusDims.length === 0) {
                focusDims = getLocalFocusDimensions(sceneId);
            }

            // 高亮匹配的 principle-card
            highlightFocusDimensions(focusDims);
        });

        // 页面加载时默认渲染通用议题评审维度
        renderPrincipleCards('general-topic-review');

        // 解析 prompt_suffix 提取要点
        function parsePromptSuffix(suffix) {
            const lines = suffix.split('\n').filter(line => line.trim().startsWith('-'));
            return lines.map(line => line.trim().substring(1).trim());
        }

        // 本地硬编码的审核要点（代理不可用时使用）
        function getLocalSceneHints(sceneId) {
            const hints = {
                'vertical-segment-review': [
                    '【完整性】是否包含市场现状与竞争格局分析',
                    '【完整性】是否包含业绩达成回顾（目标vs实际）',
                    '【完整性】是否包含核心差距识别（量化呈现）',
                    '【完整性】是否包含根因分析（深入业务本质）',
                    '【完整性】是否包含下一步行动计划（具体可执行）',
                    '【差距与根因】业绩差距是否量化（目标vs实际，同比/环比）',
                    '【差距与根因】根因分析是否使用结构化方法（5Why/鱼骨图）',
                    '【差距与根因】根因是否深入业务本质（非"市场环境不好"）',
                    '【业绩预测】未来业绩预测是否有逻辑支撑（历史趋势/市场容量）',
                    '【业绩预测】是否明确达成概率评估及关键假设条件',
                    '【下一步计划】改进措施是否具体可执行（责任人+时间节点）',
                    '【下一步计划】措施与差距分析是否形成闭环',
                    '【下一步计划】资源需求和支持请求是否清晰列出',
                    '【SP战略】述职内容是否与SP战略方向明确对齐',
                    '【SP战略】是否展示战略解码成果（关键举措与目标映射）',
                    '【态度反思】是否展现积极的问题意识和改进意愿',
                    '【态度反思】对过往失误是否有坦诚反思（不回避/不推诿）'
                ],
                'lagging-region-review': [
                    '【目标承诺】是否包含当月业绩承诺目标（定量，非定性）',
                    '【目标承诺】是否包含累计业绩承诺目标',
                    '【目标承诺】是否包含同比数据及目标（基数是否说明）',
                    '【目标承诺】是否包含业绩缺口分析（含归因，非仅罗列数据）',
                    '【目标承诺】承诺目标是否可量化、可衡量、有依据支撑',
                    '【行动具体化】每个行动项是否有明确责任人',
                    '【行动具体化】每个行动项是否有明确时间节点（具体日期，非"月底前"）',
                    '【行动具体化】行动描述是否具体（拒绝"加强管理"等笼统表述）',
                    '【行动具体化】是否有可衡量的产出/验收标准',
                    '【行动具体化】行动与业绩目标是否直接关联',
                    '【材料规范度】是否包含财务建议≥3条（问题+措施+预期效果）',
                    '【材料规范度】是否包含销售运营中心建议≥3条（含应收管理+大客户专项）',
                    '【材料规范度】是否包含项目运营中心建议≥3条（含重点项目+资源协调）',
                    '【材料规范度】是否包含战区内部分析（整体/客户/产品线维度，有洞察）',
                    '【材料规范度】上月做了业绩承诺但未达成时，是否包含复盘分析',
                    '【材料规范度】各模块建议是否差异化（避免雷同/重复）',
                    '【数据质量】同比/环比计算是否正确',
                    '【数据质量】百分比总和是否校验（如占比合计=100%）',
                    '【数据质量】关键指标计算是否正确（如利润率=利润/收入）',
                    '【数据质量】正文数据与表格数据是否前后一致',
                    '【数据质量】数量级是否合理（无小数点/单位错误）'
                ],
                'annual-leader-review': [
                    '年度目标达成情况是否全面回顾',
                    '团队建设和人才培养成果是否有证据',
                    '战略执行的关键举措和成效是否清晰',
                    '资源使用效率和投入产出比是否合理',
                    '下年度规划是否承接公司战略方向',
                    '风险识别和应对预案是否到位'
                ],
                'general-topic-review': [
                    '议题是否有明确的决策请求（不是单纯通报）',
                    '问题是否量化（目标值/实际值/缺口值三要素）',
                    '方案是否直接对应问题根因（不做答非所问）',
                    '关键论点是否有数据/案例/对比支撑',
                    '是否提供决策选项及优劣对比（至少2个方案）',
                    '风险分析和应对预案是否到位',
                    '资源需求是否清单化（预算/人力/权限/协同）',
                    '行动项是否符合SMART原则（具体/可衡量/可达成/相关/有时限）',
                    '每个行动项是否有明确责任人和时间节点',
                    '材料结构是否清晰（背景→问题→分析→方案→决策请求）',
                    '篇幅是否可控（核心内容≤15页）',
                    '是否删除空话套话（"加强/优化/提升/持续"等）'
                ]
            };
            return hints[sceneId] || ['暂无审核要点'];
        }
        
        // ==================== 后端 API 审核历史 ====================
        async function saveReviewRecord(record) {
            const resp = await fetch(PROXY_URL + '/api/history', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(record)
            });
            const data = await resp.json();
            if (!data.success) throw new Error(data.error || '保存失败');
            // 同步最高分到 本地存储，供 cockpit 议程展示使用
            try {
                const map = DSTE.reviewScoresRepo.get();
                const url = record.url;
                const current = map[url];
                if (!current || (record.total_score || 0) > current.maxScore) {
                    map[url] = { maxScore: record.total_score || 0, lastReviewAt: record.timestamp };
                    DSTE.reviewScoresRepo.set(map);
                }
            } catch (e) { /* ignore 本地存储 errors */ }
            return data;
        }

        async function getReviewHistory(limit = 50) {
            const resp = await fetch(PROXY_URL + '/api/history?limit=' + limit);
            const data = await resp.json();
            if (!data.success) throw new Error(data.error || '获取失败');
            return data.history || [];
        }

        async function deleteReviewRecord(id) {
            const resp = await fetch(PROXY_URL + '/api/history/' + id, {method: 'DELETE'});
            const data = await resp.json();
            if (!data.success) throw new Error(data.error || '删除失败');
        }

        async function clearReviewHistory() {
            const resp = await fetch(PROXY_URL + '/api/history/clear', {method: 'DELETE'});
            const data = await resp.json();
            if (!data.success) throw new Error(data.error || '清空失败');
        }


        async function renderHistoryPanel() {
            try {
                const history = await getReviewHistory(10);
                const listEl = document.getElementById('historyList');
                const trendEl = document.getElementById('trendChartBox');
                if (!history.length) {
                    listEl.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:20px;">暂无审核记录<br><span style="font-size:0.8em;color:#d1d5db;">成功审核后记录会自动保存到服务器</span></p>';
                    if (trendEl) trendEl.style.display = 'none';
                    const vcBox = document.getElementById('versionCompareBox');
                    if (vcBox) vcBox.style.display = 'none';
                    return;
                }
                
                // 按 URL 分组，同一材料的多版本归为一组
                const urlGroups = {};
                history.forEach(rec => {
                    const key = rec.url || 'unknown';
                    if (!urlGroups[key]) urlGroups[key] = [];
                    urlGroups[key].push(rec);
                });
                
                // 按最新审核时间排序（最新的在前）
                const sortedGroups = Object.entries(urlGroups).sort((a, b) => {
                    const maxA = Math.max(...a[1].map(r => r.timestamp || 0));
                    const maxB = Math.max(...b[1].map(r => r.timestamp || 0));
                    return maxB - maxA;
                });
                
                let html = '';
                sortedGroups.forEach(([url, recs]) => {
                    recs.sort((a, b) => (a.version || 1) - (b.version || 1));
                    const latest = recs[recs.length - 1];
                    const hasMultiple = recs.length > 1;
                    
                    let tagsHtml = '';
                    recs.forEach(rec => {
                        const isLatest = rec.id === latest.id;
                        const bg = isLatest ? 'rgba(59,130,246,0.1)' : '#f3f4f6';
                        const color = isLatest ? '#2563eb' : '#6b7280';
                        const border = isLatest ? 'rgba(59,130,246,0.3)' : '#e5e7eb';
                        const timeStr = new Date(rec.timestamp || 0).toLocaleString('zh-CN');
                        tagsHtml += '<span class="history-version-tag' + (isLatest ? ' latest' : '') + '" style="padding:4px 10px;border-radius:6px;font-size:0.8em;cursor:pointer;background:' + bg + ';color:' + color + ';border:1px solid ' + border + ';white-space:nowrap;" onclick="event.stopPropagation();showHistoryDetail(' + parseInt(rec.id, 10) + ')" title="' + escapeHtml(timeStr) + '">v' + (rec.version || 1) + ' · ' + (rec.total_score || '--') + '分</span>';
                    });
                    
                    let compareBtn = '';
                    if (hasMultiple) {
                        // 使用 data-url 方式避免引号嵌套问题
                        compareBtn = '<button class="btn btn-primary" style="padding:4px 12px;font-size:0.8em;" data-compare-url="' + escapeHtml(url) + '" onclick="event.stopPropagation();handleCompareClick(this)">&#128269; 对比版本</button>';
                    }
                    
                    html += '<div class="history-group" style="margin-bottom:16px;padding:16px;background:#f9fafb;border-radius:12px;border:1px solid #e8e8e8;">';
                    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
                    html += '<div style="font-weight:600;color:#1f2937;font-size:0.95em;">' + escapeHtml(latest.title || '无标题') + '</div>';
                    html += '<span style="font-size:0.8em;color:#9ca3af;">' + escapeHtml(latest.scene_name || '默认') + '</span>';
                    html += '</div>';
                    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;max-width:100%;">' + tagsHtml + '</div>';
                    html += '<div style="display:flex;gap:8px;align-items:center;">' + compareBtn + '<span style="font-size:0.75em;color:#9ca3af;">' + recs.length + ' 个版本</span></div>';
                    html += '</div>';
                });
                
                listEl.innerHTML = html;
                
                if (history.length >= 2) {
                    trendEl.style.display = 'block';
                    drawTrendChart(history);
                } else {
                    trendEl.style.display = 'none';
                }
                document.getElementById('versionCompareBox').style.display = 'none';
            } catch (err) {
                console.error('renderHistoryPanel 错误:', err);
                document.getElementById('historyList').innerHTML = '<p class="review-msg review-msg-error">加载失败: ' + escapeHtml(err.message) + '<br><span class="review-msg-hint">请按 F12 查看控制台详细错误</span></p>';
            }
        }
        
        async function handleCompareClick(btn) {
            const url = btn.getAttribute('data-compare-url');
            if (!url) return;
            const history = await getReviewHistory(10);
            const versions = history.filter(r => r.url === url).sort((a, b) => (a.version || 1) - (b.version || 1));
            if (versions.length < 2) { setStatus('该材料不足2个版本，无法对比', 'warning'); return; }
            showVersionCompare(versions[0], versions[versions.length - 1]);
        }

        function drawTrendChart(history) {
            const canvas = document.getElementById('trendCanvas');
            const ctx = canvas.getContext('2d');
            const w = canvas.width, h = canvas.height;
            const padding = 30;
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            ctx.clearRect(0, 0, w, h);
            
            // 背景
            ctx.fillStyle = isDark ? '#1a1a2e' : '#f9fafb';
            ctx.fillRect(0, 0, w, h);
            
            const data = [...history].reverse();
            const scores = data.map(d => d.total_score || 0);
            const maxScore = Math.max(...scores, 100);
            const minScore = Math.min(...scores, 0);
            const range = maxScore - minScore || 1;
            
            // 网格线
            ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 5; i++) {
                const y = padding + (h - 2 * padding) * (1 - i / 5);
                ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(w - padding, y); ctx.stroke();
                ctx.fillStyle = isDark ? '#888' : '#9ca3af';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(Math.round(minScore + range * i / 5), 5, y + 3);
            }
            
            if (data.length >= 2) {
                // 数据线
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.beginPath();
                data.forEach((d, i) => {
                    const x = padding + (w - 2 * padding) * (i / (data.length - 1));
                    const y = padding + (h - 2 * padding) * (1 - ((d.total_score || 0) - minScore) / range);
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                });
                ctx.stroke();
                
                // 数据点
                data.forEach((d, i) => {
                    const x = padding + (w - 2 * padding) * (i / (data.length - 1));
                    const y = padding + (h - 2 * padding) * (1 - ((d.total_score || 0) - minScore) / range);
                    ctx.fillStyle = '#3b82f6';
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = isDark ? '#fff' : '#1f2937';
                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(d.total_score || 0, x, y - 8);
                });
            }
            
            // X轴日期
            ctx.fillStyle = isDark ? '#888' : '#9ca3af';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'center';
            data.forEach((d, i) => {
                const x = padding + (w - 2 * padding) * (i / (data.length - 1));
                const date = new Date(d.timestamp);
                ctx.fillText(`${date.getMonth()+1}/${date.getDate()}`, x, h - 10);
            });
        }

        // ==================== 修改对比功能 ====================
        
        const STOP_WORDS = new Set(['的', '了', '是', '在', '有', '和', '与', '或', '但', '如果', '因为', '所以', '需要', '建议', '问题', '材料', '分析', '审核', '报告', '没有', '进行', '可以', '对于', '通过', '根据', '进行', '是否', '应该', '可能', '部分', '一些', '一个', '进行', '相关', '具体', '明确', '充分', '切实', '有效', '合理', '科学', '系统', '全面', '深入', '到位', '完善', '优化', '提升', '提高', '加强', '增强', '确保', '保证', '实现', '完成', '达到', '满足', '符合', '遵循', '按照', '依据', '针对', '关于', '对', '为', '将', '把', '被', '让', '使', '于', '从', '向', '到', '以', '及', '等', '或', '且', '而', '则', '即', '乃', '就', '便', '才', '都', '全', '总', '凡', '凡例', '以及', '还有', '另外', '此外', '同时', '并且', '而且', '然而', '但是', '不过', '只是', '只要', '只有', '无论', '不管', '不论', '尽管', '虽然', '即使', '即便', '除非', '否则', '不然', '要么', '不如', '宁可', '宁愿', '与其', '不但', '不仅', '不只', '不光', '不单', '不独', '而且', '反而', '反倒', '却', '可是', '然而', '只是', '不过', '无奈', '岂料', '岂知', '谁知', '哪知', '不料', '不想', '不提防', '不防备', '不虞', '不图', '不备', '不意', '不期', '不防', '不堤', '不虞']);
        
        function extractKeywords(text) {
            if (!text) return [];
            return text
                .replace(/<[^>]+>/g, '')
                .replace(/[\d,\.]+/g, '')
                .split(/[\s，。、；！？\(\)""''【】|:：«»\-\/]/)
                .filter(w => w.length >= 2)
                .filter(w => !STOP_WORDS.has(w));
        }
        
        function textSimilarity(text1, text2) {
            const words1 = new Set(extractKeywords(text1));
            const words2 = new Set(extractKeywords(text2));
            if (words1.size === 0 || words2.size === 0) return 0;
            const intersection = new Set([...words1].filter(w => words2.has(w)));
            const union = new Set([...words1, ...words2]);
            return intersection.size / union.size;
        }
        
        function compareIssues(issues1, issues2) {
            const resolved = [];
            const persistent = [];
            const newIssues = [];
            
            const matched2 = new Set();
            issues1.forEach((iss1, idx1) => {
                let bestMatch = -1;
                let bestScore = 0;
                
                issues2.forEach((iss2, idx2) => {
                    if (matched2.has(idx2)) return;
                    const score = textSimilarity(iss1.desc || '', iss2.desc || '');
                    if (score > bestScore && score > 0.5) {
                        bestScore = score;
                        bestMatch = idx2;
                    }
                });
                
                if (bestMatch >= 0) {
                    matched2.add(bestMatch);
                    persistent.push({v1: iss1, v2: issues2[bestMatch], similarity: bestScore});
                } else {
                    resolved.push(iss1);
                }
            });
            
            issues2.forEach((iss2, idx2) => {
                if (!matched2.has(idx2)) {
                    newIssues.push(iss2);
                }
            });
            
            return {resolved, persistent, new: newIssues};
        }
        
        function generateCompareSummary(v1, v2, compareResult) {
            const scoreChange = (v2.total_score || 0) - (v1.total_score || 0);
            const resolvedFatal = compareResult.issues.resolved.filter(i => i.level === '致命').length;
            const resolvedWarn = compareResult.issues.resolved.filter(i => i.level === '警告' || i.level === '严重').length;
            const resolvedTip = compareResult.issues.resolved.filter(i => i.level === '建议').length;
            const newFatal = compareResult.issues.new.filter(i => i.level === '致命').length;
            const newWarn = compareResult.issues.new.filter(i => i.level === '警告' || i.level === '严重').length;
            
            const parts = [];
            if (scoreChange > 0) parts.push(`分数提升 ${scoreChange} 分`);
            else if (scoreChange < 0) parts.push(`分数下降 ${Math.abs(scoreChange)} 分`);
            else parts.push('分数持平');
            
            if (resolvedFatal > 0) parts.push(`修复 ${resolvedFatal} 个致命问题`);
            if (resolvedWarn > 0) parts.push(`修复 ${resolvedWarn} 个警告`);
            if (resolvedTip > 0) parts.push(`修复 ${resolvedTip} 个建议`);
            if (newFatal > 0) parts.push(`新增 ${newFatal} 个致命问题 `);
            if (newWarn > 0) parts.push(`新增 ${newWarn} 个警告`);
            
            return `从 v${v1.version || 1}(${v1.total_score || '--'}分) 到 v${v2.version || '--'}(${v2.total_score || '--'}分)：${parts.join('，')}`;
        }
        
        function renderIssueCard(issue, type) {
            const colors = {'致命': '#ff5555', '严重': '#ff5555', '警告': '#ffcc00', '建议': '#00ff88'};
            const icons = {'resolved': '', 'new': '', 'persistent': '⏳'};
            const labels = {'resolved': `${icon('caretRight', {size: 12})} 已修复`, 'new': `${icon('caretLeft', {size: 12})} 新增`, 'persistent': '仍遗留'};
            const color = colors[issue.level] || '#888';
            return `
                <div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                        <span style="font-size:0.75em;">${icons[type]}</span>
                        <span style="color:${color};font-size:0.8em;font-weight:600;">${issue.level}</span>
                        <span style="color:#888;font-size:0.8em;">· ${issue.dimension || '通用'}</span>
                    </div>
                    <div style="font-size:0.85em;color:#ccc;padding-left:18px;">${renderRichComment(issue.desc || '')}</div>
                    <div style="font-size:0.75em;color:#666;padding-left:18px;margin-top:2px;">${labels[type]}</div>
                </div>
            `;
        }
        
        async function openCompareModal(url) {
            const history = await getReviewHistory(10);
            const versions = history.filter(r => r.url === url).sort((a, b) => (a.version || 1) - (b.version || 1));
            if (versions.length < 2) { setStatus('该材料不足2个版本，无法对比', 'warning'); return; }

            // 默认对比最早版本和最新版本
            showVersionCompare(versions[0], versions[versions.length - 1]);
        }
        
        function showVersionCompare(v1, v2) {
            const modal = document.getElementById('compareModal');
            const content = document.getElementById('compareContent');
            
            const compareResult = {
                issues: compareIssues(v1.issues || [], v2.issues || [])
            };
            const summary = generateCompareSummary(v1, v2, compareResult);
            const scoreChange = (v2.total_score || 0) - (v1.total_score || 0);
            const scoreColor = scoreChange >= 0 ? '#00ff88' : '#ff5555';
            
            // 维度分数对比
            const compareDimConfig = getDimensionConfig(v2.scene_id || v1.scene_id || '');
            const dimChanges = compareDimConfig.map(dim => {
                const s1 = (v1.dimension_scores || {})[dim.name] || 0;
                const s2 = (v2.dimension_scores || {})[dim.name] || 0;
                const change = s2 - s1;
                return {name: dim.name, v1: s1, v2: s2, change, max: dim.max};
            });
            
            const materialTitle = escapeHtml(v2.title || v1.title || '未知材料');
            
            content.innerHTML = `
                <div style="background:#f9fafb;padding:12px 16px;border-radius:8px;margin-bottom:16px;border:1px solid #e8e8e8;">
                    <div style="font-size:0.85em;color:#6b7280;margin-bottom:4px;">对比材料</div>
                    <div style="font-size:1em;color:#1f2937;font-weight:600;">${materialTitle}</div>
                    <div style="font-size:0.75em;color:#9ca3af;margin-top:2px;">${escapeHtml(v2.url || v1.url || '')}</div>
                </div>
                
                <div style="background:rgba(59,130,246,0.08);padding:12px 16px;border-radius:8px;margin-bottom:20px;border-left:3px solid #2563eb;">
                    <div style="font-size:0.9em;color:#2563eb;font-weight:600;">${escapeHtml(summary)}</div>
                </div>
                
                <div style="display:flex;gap:16px;margin-bottom:24px;">
                    <div style="flex:1;text-align:center;padding:16px;background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(255,255,255,0.08);">
                        <div style="font-size:0.8em;color:#888;margin-bottom:4px;">v${v1.version || 1} · ${new Date(v1.timestamp).toLocaleString('zh-CN', {month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'})}</div>
                        <div style="font-size:2.2em;font-weight:bold;color:#fff;">${v1.total_score || '--'}</div>
                        <div style="font-size:0.75em;color:#888;">分</div>
                    </div>
                    <div style="display:flex;align-items:center;justify-content:center;font-size:1.2em;color:${scoreColor};font-weight:600;">
                        ${scoreChange > 0 ? icon('arrowUp', {size: 12}) + ' +' + scoreChange : (scoreChange < 0 ? icon('arrowDown', {size: 12}) + ' ' + scoreChange : icon('caretRight', {size: 12}) + ' 0')}
                    </div>
                    <div style="flex:1;text-align:center;padding:16px;background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(255,255,255,0.08);">
                        <div style="font-size:0.8em;color:#888;margin-bottom:4px;">v${v2.version || '--'} · ${new Date(v2.timestamp).toLocaleString('zh-CN', {month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'})}</div>
                        <div style="font-size:2.2em;font-weight:bold;color:#00d4ff;">${v2.total_score || '--'}</div>
                        <div style="font-size:0.75em;color:#888;">分</div>
                    </div>
                </div>
                
                <div style="margin-bottom:20px;">
                    <h4 style="color:#fff;font-size:0.9em;margin-bottom:10px;">各维度分数变化</h4>
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        ${dimChanges.map(d => {
                            const changeColor = d.change > 0 ? '#00ff88' : (d.change < 0 ? '#ff5555' : '#888');
                            const arrow = d.change > 0 ? icon('arrowUp', {size: 12}) : (d.change < 0 ? icon('arrowDown', {size: 12}) : icon('caretRight', {size: 12}));
                            return `
                                <div style="display:flex;align-items:center;gap:10px;padding:6px 10px;background:rgba(255,255,255,0.02);border-radius:6px;">
                                    <div style="flex:1;font-size:0.85em;color:#ccc;">${d.name}</div>
                                    <div style="font-size:0.85em;color:#888;">${d.v1}/${d.max}</div>
                                    <div style="font-size:0.8em;color:${changeColor};width:50px;text-align:center;">${arrow} ${Math.abs(d.change)}</div>
                                    <div style="font-size:0.85em;color:#00d4ff;width:50px;text-align:right;">${d.v2}/${d.max}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr;gap:16px;">
                    ${compareResult.issues.resolved.length > 0 ? `
                        <div style="background:rgba(0,255,136,0.03);padding:12px 16px;border-radius:8px;border:1px solid rgba(0,255,136,0.1);">
                            <div style="font-size:0.85em;color:#00ff88;font-weight:600;margin-bottom:8px;"> 已修复的问题 (${compareResult.issues.resolved.length})</div>
                            ${compareResult.issues.resolved.map(i => renderIssueCard(i, 'resolved')).join('')}
                        </div>
                    ` : ''}
                    
                    ${compareResult.issues.new.length > 0 ? `
                        <div style="background:rgba(255,85,85,0.03);padding:12px 16px;border-radius:8px;border:1px solid rgba(255,85,85,0.1);">
                            <div style="font-size:0.85em;color:#ff5555;font-weight:600;margin-bottom:8px;"> 新增的问题 (${compareResult.issues.new.length})</div>
                            ${compareResult.issues.new.map(i => renderIssueCard(i, 'new')).join('')}
                        </div>
                    ` : ''}
                    
                    ${compareResult.issues.persistent.length > 0 ? `
                        <div style="background:rgba(255,204,0,0.03);padding:12px 16px;border-radius:8px;border:1px solid rgba(255,204,0,0.1);">
                            <div style="font-size:0.85em;color:#ffcc00;font-weight:600;margin-bottom:8px;">⏳ 遗留的问题 (${compareResult.issues.persistent.length})</div>
                            ${compareResult.issues.persistent.map(p => renderIssueCard(p.v2, 'persistent')).join('')}
                        </div>
                    ` : ''}
                </div>
                
                ${compareResult.issues.resolved.length === 0 && compareResult.issues.new.length === 0 && compareResult.issues.persistent.length === 0 ? `
                    <div style="text-align:center;padding:30px;color:#666;">两次审核的问题清单基本一致，无显著变化</div>
                ` : ''}
            `;
            modal.classList.remove('hidden');
        }

        async function deleteHistoryItem(id) {
            if (!confirm('确定删除这条记录吗？')) return;
            await deleteReviewRecord(id);
            await renderHistoryPanel();
        }

        async function showHistoryDetail(id) {
            const history = await getReviewHistory(10);
            const rec = history.find(r => r.id === id);
            if (!rec) return;
            document.getElementById('kmsUrl').value = rec.url || '';
            currentPageInfo = { title: rec.title, space: rec.space, url: rec.url };
            document.getElementById('pageInfo').innerHTML = `
                <p><strong style="color:#2563eb">标题：</strong>${escapeHtml(rec.title || '')}</p>
                <p><strong style="color:#2563eb">空间：</strong>${escapeHtml(rec.space || '')}</p>
                <p><strong style="color:#2563eb">链接：</strong><a href="${sanitizeUrl(rec.url)}" target="_blank" style="color:#7c3aed">${escapeHtml(rec.url)}</a></p>`;
            currentReport = rec.report || '';
            document.getElementById('reportBox').textContent = rec.report || '';
            let scoreData;
            if (rec.dimension_scores && Object.keys(rec.dimension_scores).length > 0) {
                const parsed = parseDimensionScores(rec.report || '', rec.scene_id);
                const commentMap = {};
                parsed.scores.forEach(s => { commentMap[s.name] = s.comment; });
                const dimConfig = getDimensionConfig(rec.scene_id || '');
                const scores = dimConfig.map(dim => {
                    const score = rec.dimension_scores[dim.name] || 0;
                    return { ...dim, score, comment: commentMap[dim.name] || '' };
                });
                scoreData = {
                    scores,
                    totalScore: rec.total_score || 0,
                    passed: parsed.passed
                };
            } else {
                scoreData = parseDimensionScores(rec.report || '', rec.scene_id);
            }
            drawRadarChart(scoreData);
            fillAnalysisReport(scoreData, rec.report || '', rec.facts || {});
            document.getElementById('reportSection').classList.remove('hidden');
            document.getElementById('promptSection').classList.add('hidden');
            document.getElementById('resultCard').classList.remove('hidden');
            setStatus(`[文件] 已加载历史记录 v${rec.version || 1}`, 'info');
        }

        function closeCompareModal() {
            document.getElementById('compareModal').classList.add('hidden');
        }

        function toggleHistoryPanel() {
            const panel = document.getElementById('historyPanel');
            const listEl = document.getElementById('historyList');
            if (!panel) { setStatus('错误：找不到面板', 'error'); return; }
            const hasHidden = panel.classList.contains('hidden');
            if (hasHidden) {
                panel.classList.remove('hidden');
                panel.style.setProperty('display', 'block', 'important');
                if (listEl) {
                    listEl.innerHTML = '<p class="review-msg review-msg-info">正在加载历史记录...</p>';
                }
                renderHistoryPanel().catch(function(err) {
                    if (listEl) listEl.innerHTML = '<p class="review-msg review-msg-error">加载失败: ' + escapeHtml(err.message || '未知错误') + '</p>';
                });
            } else {
                panel.classList.add('hidden');
                panel.style.setProperty('display', 'none', 'important');
            }
        }

        // 绑定按钮事件（只绑定一次，避免重复触发）
        (function() {
            const hb = document.getElementById('historyBtn');
            const hcb = document.getElementById('historyCloseBtn');
            if (hb) hb.onclick = toggleHistoryPanel;
            if (hcb) hcb.onclick = toggleHistoryPanel;
        })();

        // ==================== 批量审核功能 ====================
        function toggleBatchInput() {
            const area = document.getElementById('batchInputArea');
            if (!area) return;
            if (area.style.display === 'none') {
                const sceneSelect = document.getElementById('sceneSelect');
                const label = document.getElementById('batchSceneLabel');
                if (sceneSelect && label) {
                    const text = sceneSelect.options[sceneSelect.selectedIndex].text || '默认场景';
                    label.textContent = text;
                }
                area.style.display = 'block';
            } else {
                area.style.display = 'none';
            }
        }
        
        async function startBatchReview() {
            const textarea = document.getElementById('batchUrls');
            const statusEl = document.getElementById('batchStatus');
            const progressDiv = document.getElementById('batchProgress');
            const progressBar = document.getElementById('batchProgressBar');
            const progressText = document.getElementById('batchProgressText');
            const progressList = document.getElementById('batchProgressList');
            const actionsDiv = document.getElementById('batchActions');
            
            if (!textarea) return;
            const urls = textarea.value.split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
            if (urls.length === 0) {
                statusEl.textContent = '请输入至少一个链接';
                statusEl.style.color = '#dc2626';
                return;
            }
            
            statusEl.textContent = '正在创建任务...';
            statusEl.style.color = '#2563eb';
            
            try {
                const resp = await fetch(PROXY_URL + '/api/batch', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({urls: urls, scene_id: document.getElementById('sceneSelect').value})
                });
                const data = await resp.json();
                if (!data.success) {
                    statusEl.textContent = data.error || '创建失败';
                    statusEl.style.color = '#dc2626';
                    return;
                }
                
                progressDiv.style.display = 'block';
                actionsDiv.style.display = 'none';
                statusEl.textContent = '任务已创建，审核中...';
                pollBatchProgress(data.task_id);
            } catch(e) {
                statusEl.textContent = '请求失败: ' + e.message;
                statusEl.style.color = '#dc2626';
            }
        }
        
        async function pollBatchProgress(taskId, pollCount) {
            if (pollCount === undefined) pollCount = 0;
            pollCount++;
            const MAX_POLL = 300; // 最多轮询300次，约10分钟
            
            const progressBar = document.getElementById('batchProgressBar');
            const progressText = document.getElementById('batchProgressText');
            const progressList = document.getElementById('batchProgressList');
            const statusEl = document.getElementById('batchStatus');
            const actionsDiv = document.getElementById('batchActions');
            
            try {
                const resp = await fetch(PROXY_URL + '/api/batch/' + taskId);
                const data = await resp.json();
                if (!data.success) return;
                
                const task = data.task;
                const total = task.total || 1;
                const completed = task.completed || 0;
                const pct = Math.round((completed / total) * 100);
                
                progressBar.style.width = pct + '%';
                progressText.textContent = completed + '/' + total + ' 已完成';
                
                const rresp = await fetch(PROXY_URL + '/api/batch/' + taskId + '/results');
                const rdata = await rresp.json();
                if (rdata.success && rdata.results) {
                    let html = '';
                    rdata.results.forEach(function(res) {
                        const icon = res.status === 'completed' ? '' : (res.status === 'failed' ? '' : '⏳');
                        const score = res.total_score ? ' · <strong style="color:' + (res.total_score >= 80 ? '#16a34a' : (res.total_score >= 60 ? '#ca8a04' : '#dc2626')) + ';">' + res.total_score + '分</strong>' : '';
                        const titleColor = res.status === 'failed' ? '#dc2626' : '#374151';
                        const rawTitle = res.title || res.url || '';
                        const displayTitle = escapeHtml(rawTitle.length > 40 ? rawTitle.substring(0, 40) + '...' : rawTitle);
                        html += '<div style="margin-bottom:4px;color:#6b7280;">' + icon + ' <span style="color:' + titleColor + ';">' + displayTitle + '</span>' + score + '</div>';
                    });
                    progressList.innerHTML = html;
                }
                
                if (task.status === 'completed' || task.status === 'failed') {
                    statusEl.textContent = '审核完成';
                    statusEl.style.color = '#16a34a';
                    actionsDiv.style.display = 'block';
                    window._lastBatchTaskId = taskId;
                } else if (pollCount >= MAX_POLL) {
                    statusEl.textContent = '轮询超时，请手动刷新查看结果';
                    statusEl.style.color = '#ca8a04';
                    actionsDiv.style.display = 'block';
                    window._lastBatchTaskId = taskId;
                } else {
                    setTimeout(function() { pollBatchProgress(taskId, pollCount); }, 2000);
                }
            } catch(e) {
                statusEl.textContent = '查询进度失败';
                statusEl.style.color = '#dc2626';
            }
        }
        
        function closeCompareMatrixModal() {
            const modal = document.getElementById('compareMatrixModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.setProperty('display', 'none', 'important');
            }
        }
        
        async function showCompareMatrix() {
            const taskId = window._lastBatchTaskId;
            if (!taskId) {
                setStatus('请先完成批量审核', 'warning');
                return;
            }
            const modal = document.getElementById('compareMatrixModal');
            const content = document.getElementById('compareMatrixContent');
            if (!modal || !content) return;
            
            content.innerHTML = '<p class="review-msg review-msg-info">正在生成对比矩阵...</p>';
            modal.classList.remove('hidden');
            modal.style.setProperty('display', 'flex', 'important');
            
            try {
                const resp = await fetch(PROXY_URL + '/api/batch/' + taskId + '/compare');
                const data = await resp.json();
                if (!data.success) {
                    content.innerHTML = '<p class="review-msg review-msg-error">' + escapeHtml(data.error || '生成失败') + '</p>';
                    return;
                }
                renderCompareMatrix(data);
            } catch(e) {
                content.innerHTML = '<p class="review-msg review-msg-error">请求失败: ' + escapeHtml(e.message) + '</p>';
            }
        }
        
        function renderCompareMatrix(data) {
            const content = document.getElementById('compareMatrixContent');
            if (!content) return;
            if (!data.matrix || !Array.isArray(data.matrix) || data.matrix.length === 0) {
                content.innerHTML = '<p class="review-msg review-msg-error">对比矩阵数据为空</p>';
                return;
            }
            if (!data.matrix[0] || typeof data.matrix[0] !== 'object') {
                content.innerHTML = '<p class="review-msg review-msg-error">对比矩阵数据格式错误</p>';
                return;
            }
            
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const colKeys = Object.keys(data.matrix[0]).filter(function(k) { return k !== 'dimension'; });
            
            // 建立 url -> title 映射
            const urlTitleMap = {};
            (data.scores || []).forEach(function(s) {
                urlTitleMap[s.url] = s.title || s.url;
            });
            
            // 按总分排序（高->低）
            const sortedScores = (data.scores || []).slice().sort(function(a, b) {
                return (b.total_score || 0) - (a.total_score || 0);
            });
            const sortedColKeys = sortedScores.map(function(s) { return s.url; });
            
            // 合格线
            const PASS_LINE = 80;
            
            let html = '';
            
            // ===== 排名卡片区域 =====
            html += '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">';
            sortedScores.forEach(function(s, idx) {
                const rankColors = ['#f59e0b', '#9ca3af', '#b45309']; // 金、银、铜
                const rankBg = idx < 3 ? 'background:linear-gradient(135deg,' + rankColors[idx] + '15,transparent);' : '';
                const rankBorder = idx < 3 ? 'border-color:' + rankColors[idx] + '40;' : '';
                const passed = (s.total_score || 0) >= PASS_LINE;
                const statusBadge = passed 
                    ? '<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.7em;background:#dcfce7;color:#166534;font-weight:600;"> 合格</span>'
                    : '<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.7em;background:#fee2e2;color:#991b1b;font-weight:600;"> 不合格</span>';
                const scoreColor = s.total_score >= 80 ? '#16a34a' : (s.total_score >= 60 ? '#ca8a04' : '#dc2626');
                const titleShort = (s.title || s.url || '未知').substring(0, 20) + ((s.title || s.url || '').length > 20 ? '...' : '');
                html += '<div style="flex:1;min-width:160px;max-width:220px;padding:14px;border-radius:10px;border:1px solid #e5e7eb;' + rankBg + rankBorder + 'box-shadow:0 1px 3px rgba(0,0,0,0.04);">';
                html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">';
                html += '<span style="font-size:1.1em;font-weight:800;color:' + (idx < 3 ? rankColors[idx] : '#6b7280') + ';">#' + (idx + 1) + '</span>';
                html += '<span style="font-size:0.75em;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;" title="' + escapeHtml(s.title || s.url) + '">' + escapeHtml(titleShort) + '</span>';
                html += '</div>';
                html += '<div style="font-size:2em;font-weight:800;color:' + scoreColor + ';line-height:1;">' + (s.total_score || 0) + '<span style="font-size:0.5em;color:#9ca3af;font-weight:400;">/100</span></div>';
                html += '<div style="margin-top:6px;">' + statusBadge + '</div>';
                html += '</div>';
            });
            html += '</div>';
            
            // ===== 热力图表格 =====
            const theadBorder = '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb');
            const cellBorder = '1px solid ' + (isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6');
            const dimTextColor = isDark ? '#ccc' : '#374151';
            const thBg = isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb';
            
            html += '<div style="overflow-x:auto;border-radius:10px;border:1px solid #e5e7eb;">';
            html += '<table style="width:100%;border-collapse:collapse;font-size:0.85em;">';
            
            // 表头
            html += '<thead><tr style="background:' + thBg + ';">';
            html += '<th style="padding:10px 8px;border-bottom:' + theadBorder + ';text-align:left;font-weight:600;color:#6b7280;font-size:0.8em;white-space:nowrap;">维度 \ 材料</th>';
            sortedColKeys.forEach(function(k) {
                const title = urlTitleMap[k] || k;
                const shortTitle = title.substring(0, 12) + (title.length > 12 ? '...' : '');
                html += '<th style="padding:10px 8px;border-bottom:' + theadBorder + ';text-align:center;font-weight:600;color:#374151;font-size:0.8em;min-width:80px;" title="' + escapeHtml(title) + '">' + escapeHtml(shortTitle) + '</th>';
            });
            html += '</tr></thead><tbody>';
            
            // 维度行
            data.matrix.forEach(function(row) {
                html += '<tr style="border-bottom:' + cellBorder + ';">';
                html += '<td style="padding:10px 8px;text-align:left;font-weight:500;color:' + dimTextColor + ';white-space:nowrap;font-size:0.85em;">' + escapeHtml(row.dimension) + '</td>';
                sortedColKeys.forEach(function(k) {
                    const score = row[k] || 0;
                    const maxScore = data.scores.find(function(s) { return s.url === k; });
                    // 热力图背景色
                    let heatBg = '';
                    if (score >= 8) heatBg = 'background:rgba(22,163,74,0.08);';
                    else if (score >= 5) heatBg = 'background:rgba(202,138,4,0.08);';
                    else heatBg = 'background:rgba(220,38,38,0.06);';
                    const scoreColor = score >= 8 ? '#16a34a' : (score >= 5 ? '#ca8a04' : '#dc2626');
                    html += '<td style="padding:10px 8px;text-align:center;font-weight:600;color:' + scoreColor + ';font-size:0.9em;' + heatBg + '">' + score + '</td>';
                });
                html += '</tr>';
            });
            
            // 总分行
            html += '<tr style="background:' + thBg + ';font-weight:700;border-top:2px solid #e5e7eb;">';
            html += '<td style="padding:10px 8px;text-align:left;color:#1f2937;font-size:0.9em;white-space:nowrap;">总分</td>';
            sortedColKeys.forEach(function(k) {
                const s = sortedScores.find(function(item) { return item.url === k; });
                const total = s ? (s.total_score || 0) : 0;
                const totalColor = total >= 80 ? '#16a34a' : (total >= 60 ? '#ca8a04' : '#dc2626');
                html += '<td style="padding:10px 8px;text-align:center;font-size:1.1em;font-weight:800;color:' + totalColor + ';">' + total + '</td>';
            });
            html += '</tr>';
            
            // 统计行：平均分
            html += '<tr style="border-top:1px dashed #e5e7eb;">';
            html += '<td style="padding:10px 8px;text-align:left;color:#6b7280;font-size:0.8em;white-space:nowrap;">平均分</td>';
            sortedColKeys.forEach(function(k) {
                const scores = data.matrix.map(function(row) { return row[k] || 0; });
                const avg = scores.length ? (scores.reduce(function(a,b){return a+b;}, 0) / scores.length).toFixed(1) : 0;
                html += '<td style="padding:10px 8px;text-align:center;color:#6b7280;font-size:0.8em;">' + avg + '</td>';
            });
            html += '</tr>';
            
            // 统计行：最高分
            html += '<tr>';
            html += `<td style="padding:10px 8px;text-align:left;color:#6b7280;font-size:0.8em;white-space:nowrap;">${icon('arrowUp', {size: 12})} 最高分</td>`;
            sortedColKeys.forEach(function(k) {
                const scores = data.matrix.map(function(row) { return row[k] || 0; });
                const max = scores.length ? Math.max.apply(null, scores) : 0;
                html += '<td style="padding:10px 8px;text-align:center;color:#16a34a;font-size:0.8em;">' + max + '</td>';
            });
            html += '</tr>';
            
            // 统计行：最低分
            html += '<tr>';
            html += `<td style="padding:10px 8px;text-align:left;color:#6b7280;font-size:0.8em;white-space:nowrap;">${icon('arrowDown', {size: 12})} 最低分</td>`;
            sortedColKeys.forEach(function(k) {
                const scores = data.matrix.map(function(row) { return row[k] || 0; });
                const min = scores.length ? Math.min.apply(null, scores) : 0;
                html += '<td style="padding:10px 8px;text-align:center;color:#dc2626;font-size:0.8em;">' + min + '</td>';
            });
            html += '</tr>';
            
            html += '</tbody></table></div>';
            
            // ===== 图例 =====
            html += '<div style="display:flex;gap:16px;justify-content:center;margin-top:16px;font-size:0.75em;color:#9ca3af;">';
            html += '<span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:rgba(22,163,74,0.15);margin-right:4px;vertical-align:middle;"></span>优秀 (≥8)</span>';
            html += '<span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:rgba(202,138,4,0.15);margin-right:4px;vertical-align:middle;"></span>一般 (5-7)</span>';
            html += '<span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:rgba(220,38,38,0.1);margin-right:4px;vertical-align:middle;"></span>需改进 (&lt;5)</span>';
            html += '<span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#f59e0b;margin-right:4px;vertical-align:middle;"></span>前3名</span>';
            html += '</div>';
            
            content.innerHTML = html;
        }
        
        // 批量输入区默认收起
        (function() {
            const area = document.getElementById('batchInputArea');
            if (area) area.style.display = 'none';
        })();
        
        // ==================== 原有函数 ====================
        async function checkProxy() {
            try {
                const resp = await fetch(PROXY_URL + '/api/health', { 
                    method: 'GET',
                    mode: 'cors'
                });
                if (resp.ok) {
                    document.getElementById('proxyStatus').textContent = ' 代理在线';
                    document.getElementById('proxyStatus').className = 'proxy-status online';
                    return true;
                }
            } catch(e) {}
            document.getElementById('proxyStatus').textContent = ' 代理离线';
            document.getElementById('proxyStatus').className = 'proxy-status offline';
            return false;
        }
        
        checkProxy();
        setInterval(checkProxy, 30000);
        
        function setStatus(msg, type) {
            const el = document.getElementById('status');
            el.textContent = msg;
            el.className = 'status ' + type;
        }
        
        let lastReviewTime = 0;
        const REVIEW_COOLDOWN = 30000; // 30秒冷却

        // ── 维度配置（按场景） ──
        function getDimensionConfig(sceneId) {
            const configs = {
                'general-topic-review': [
                    { name: '目标-解决方案对齐度', max: 30, short: '目标对齐' },
                    { name: '决策支撑度', max: 30, short: '决策支撑' },
                    { name: '行动具体化', max: 25, short: '行动具体' },
                    { name: '材料规范度', max: 15, short: '材料规范' }
                ],
                'vertical-segment-review': [
                    { name: '完整性', max: 35, short: '完整性' },
                    { name: '差距与根因分析', max: 20, short: '差距根因' },
                    { name: '业绩预测达成概率分析', max: 10, short: '业绩预测' },
                    { name: '下一步计划', max: 20, short: '下一步计划' },
                    { name: 'SP战略关联度', max: 10, short: 'SP战略' },
                    { name: '态度与反思', max: 5, short: '态度反思' }
                ],
                'lagging-region-review': [
                    { name: '目标承诺', max: 20, short: '目标承诺' },
                    { name: '行动具体化', max: 30, short: '行动具体化' },
                    { name: '材料规范度', max: 35, short: '材料规范度' },
                    { name: '数据质量', max: 15, short: '数据质量' }
                ],
                'annual-leader-review': [
                    { name: '完整性', max: 25, short: '完整性' },
                    { name: 'SP战略关联度', max: 25, short: 'SP战略' },
                    { name: '态度与反思', max: 25, short: '态度反思' },
                    { name: '下一步计划', max: 25, short: '下一步计划' }
                ]
            };
            return configs[sceneId] || configs['general-topic-review'];
        }

        function getCurrentSceneId() {
            const el = document.getElementById('sceneSelect');
            return el ? el.value : '';
        }

        function parseDimensionScores(reportText, sceneId) {
            const scores = [];
            const lines = reportText.split('\n');
            const dimConfig = getDimensionConfig(sceneId || getCurrentSceneId());

            for (const dim of dimConfig) {
                let found = false;
                const escapedName = dim.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // 兼容维度名和得分被 HTML 标签包裹的情况，不严格匹配满分列（从报告中提取实际满分）
                const regex = new RegExp('\\|\\s*(?:<[^>]+>)?\\s*' + escapedName + '\\s*(?:<\\/[^>]+>)?\\s*\\|\\s*(?:<[^>]+>)?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:<\\/[^>]+>)?\\s*\\|');
                for (const line of lines) {
                    const match = line.match(regex);
                    if (match) {
                        // 提取评价：分割表格行，取第4/5列（先去掉HTML标签）
                        const cleanLine = line.replace(/<[^>]+>/g, '');
                        const parts = cleanLine.split('|').map(s => s.trim()).filter(s => s);
                        const score = parseFloat(match[1]);
                        const maxFromReport = parts.length >= 3 ? parseFloat(parts[2]) || dim.max : dim.max;
                        const comment = parts.length >= 5 ? parts[4] : (parts.length >= 4 ? parts[3] : '');
                        scores.push({ ...dim, score, max: maxFromReport, comment });
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    scores.push({ ...dim, score: 0, comment: '未识别到评分' });
                }
            }

            let totalScore = 0;
            const totalMatch = reportText.match(/【总体评分】\s*(\d+(?:\.\d+)?)\s*\/\s*100/);
            if (totalMatch) totalScore = parseFloat(totalMatch[1]);

            let passed = null;
            // 精确匹配判定结果，允许 colon 与结论之间有 emoji/图标/空白
            if (/判定[：:]\s*.*?通过/.test(reportText)) passed = true;
            else if (/判定[：:]\s*.*?待修改/.test(reportText)) passed = false;

            return { scores, totalScore, passed };
        }

        function getScoreColor(ratio) {
            if (ratio >= 0.8) return '#00ff88';
            if (ratio >= 0.6) return '#ffcc00';
            return '#ff5555';
        }
        
        function getScoreClass(ratio) {
            if (ratio >= 0.8) return 'high';
            if (ratio >= 0.6) return 'mid';
            return 'low';
        }
        
        function parseIssues(reportText) {
            const issues = [];
            const lines = reportText.split('\n');
            let inIssues = false;
            for (const line of lines) {
                const trimmed = line.trim();
                // 支持多种标题格式：【问题清单】、问题清单（分级）、## 问题清单 等
                if (!inIssues && (/问题清单/.test(trimmed) && !/【问题清单】/.test(trimmed) || trimmed.includes('【问题清单'))) {
                    inIssues = true; continue;
                }
                // 遇到下一个一级标题或空行+标题时退出
                if (inIssues && (/^#{1,2}\s/.test(trimmed) || /^【/.test(trimmed) || /^[-=]{3,}$/.test(trimmed))) {
                    // 如果是紧跟的下一个大段落标题，退出
                    if (/亮点|改进建议|审核结论|总体评分/.test(trimmed)) break;
                }
                if (!inIssues) continue;
                // 表格行：| 致命 | 维度 | 描述 |
                let m = line.match(/^\|\s*(?:\[[红黄绿]\])?\s*(致命|严重|警告|建议)\s*\|\s*([^|]*)\|\s*(.+)\|/);
                if (m) {
                    // 过滤表头行
                    const dimName = m[2].trim();
                    const descText = m[3].trim();
                    if (dimName === '维度' && /^(描述|问题|建议)$/.test(descText)) continue;
                    const emoji = m[1]==='致命'?'[红]':m[1]==='建议'?'[绿]':'[黄]';
                    issues.push({emoji, level:m[1], dimension:dimName, desc:descText});
                    continue;
                }
                // 列表行：- [红] 致命：维度 | 描述
                m = line.match(/^[\-*•]\s*(?:\[[红黄绿]\])?\s*(致命|严重|警告|建议)[：:]\s*(.+)$/);
                if (m) {
                    const emoji = m[1]==='致命'?'[红]':m[1]==='建议'?'[绿]':'[黄]';
                    // 尝试拆分维度和描述
                    const parts = m[2].split(/[|｜]/).map(s => s.trim()).filter(s => s);
                    if (parts.length >= 2) {
                        issues.push({emoji, level:m[1], dimension:parts[0], desc:parts.slice(1).join(' | ')});
                    } else {
                        issues.push({emoji, level:m[1], dimension:'', desc:m[2].trim()});
                    }
                    continue;
                }
                // 简单行：[红] 致命：描述
                m = line.match(/^(?:\[[红黄绿]\])?\s*(致命|严重|警告|建议)[：:]\s*(.+)$/);
                if (m) {
                    const emoji = m[1]==='致命'?'[红]':m[1]==='建议'?'[绿]':'[黄]';
                    issues.push({emoji, level:m[1], dimension:'', desc:m[2].trim()});
                }
            }
            return issues;
        }

        function parseSuggestions(reportText) {
            const suggestions = [];
            const lines = reportText.split('\n');
            let inSugg = false;
            for (const line of lines) {
                const trimmed = line.trim();
                // 支持多种标题格式
                if (/改进建议/.test(trimmed) && !/【改进建议】/.test(trimmed) || trimmed.includes('【改进建议')) {
                    inSugg = true; continue;
                }
                if (inSugg && (/^#{1,2}\s/.test(trimmed) || /^【/.test(trimmed))) {
                    if (/亮点|审核结论|总体评分|问题清单/.test(trimmed)) break;
                }
                if (!inSugg) continue;
                // 表格行：| P0 | 问题 | 建议 |
                let m = line.match(/^\|\s*(P[012])\s*\|\s*([^|]*)\|\s*(.+)\|/);
                if (m) {
                    suggestions.push({priority:m[1], problem:m[2].trim(), suggestion:m[3].trim()});
                    continue;
                }
                // 列表行：- P0 | 问题 | 建议
                m = line.match(/^[\-*•]\s*(P[012])\s*[|｜]\s*([^|｜]*)[|｜]\s*(.+)$/);
                if (m) {
                    suggestions.push({priority:m[1], problem:m[2].trim(), suggestion:m[3].trim()});
                    continue;
                }
                // 简单行：P0：问题 → 建议
                m = line.match(/^(P[012])[：:]\s*(.+?)[→\-\~]\s*(.+)$/);
                if (m) {
                    suggestions.push({priority:m[1], problem:m[2].trim(), suggestion:m[3].trim()});
                    continue;
                }
                // 行内格式：P0 问题 → 建议
                m = line.match(/^(P[012])\s+(.+?)[→\-\~]\s*(.+)$/);
                if (m) {
                    suggestions.push({priority:m[1], problem:m[2].trim(), suggestion:m[3].trim()});
                }
            }
            return suggestions;
        }

        function parseHighlights(reportText) {
            const highlights = [];
            const lines = reportText.split('\n');
            let inHigh = false;
            for (const line of lines) {
                const trimmed = line.trim();
                if (!inHigh && /亮点/.test(trimmed) && !trimmed.includes('无亮点') && !trimmed.includes('未识别')) {
                    inHigh = true; continue;
                }
                if (inHigh && (/^#{1,2}\s/.test(trimmed) || /^【/.test(trimmed))) {
                    if (/改进建议|审核结论|总体评分|问题清单/.test(trimmed)) break;
                }
                if (!inHigh) continue;
                const m = line.match(/^[\-*•]\s*(.+)$/);
                if (m) highlights.push(m[1].trim());
            }
            return highlights;
        }

        function parseConclusion(reportText) {
            const lines = reportText.split('\n');
            let inConc = false;
            const parts = [];
            for (const line of lines) {
                const trimmed = line.trim();
                if (/审核结论/.test(trimmed) || trimmed.includes('【审核结论')) { inConc = true; continue; }
                if (inConc && (/^#{1,2}\s/.test(trimmed) || /^【/.test(trimmed))) break;
                if (!inConc) continue;
                if (trimmed) parts.push(trimmed);
            }
            return parts.join('\n');
        }

        function drawRadarChart(data) {
            const canvas = document.getElementById('radarCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const { scores, totalScore, passed } = data;
            
            if (!scores || scores.length === 0) return;
            
            // 确保容器可见后再获取尺寸
            document.getElementById('radarChartBox').style.display = 'block';
            
            // 固定逻辑尺寸，避免多次调用导致canvas无限放大
            const W = 280;
            const H = 230;
            
            const dpr = window.devicePixelRatio || 1;
            canvas.width = W * dpr;
            canvas.height = H * dpr;
            // 使用setTransform重置变换矩阵，避免scale叠加
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            
            const cx = W / 2;
            const cy = H / 2 - 8;
            const radius = Math.max(20, Math.min(W, H) / 2 - 50);
            
            ctx.clearRect(0, 0, W, H);
            
            const dimCount = scores.length || 6;
            const angleStep = (Math.PI * 2) / dimCount;
            const startAngle = -Math.PI / 2;
            
            // 检测主题（雷达图在浅色卡片内，统一用适合白底的颜色）
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            
            // 网格 — 在白底上用浅灰色
            const gridLevels = 5;
            ctx.strokeStyle = 'rgba(0,0,0,0.08)';
            ctx.lineWidth = 1;
            for (let level = 1; level <= gridLevels; level++) {
                const r = (radius / gridLevels) * level;
                ctx.beginPath();
                for (let i = 0; i < dimCount; i++) {
                    const angle = startAngle + i * angleStep;
                    const x = cx + Math.cos(angle) * r;
                    const y = cy + Math.sin(angle) * r;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();
            }
            
            // 轴线
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            for (let i = 0; i < dimCount; i++) {
                const angle = startAngle + i * angleStep;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
                ctx.stroke();
            }
            
            // 数据区域
            ctx.beginPath();
            for (let i = 0; i < dimCount; i++) {
                const angle = startAngle + i * angleStep;
                const ratio = scores[i].score / scores[i].max;
                const r = radius * ratio;
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
            gradient.addColorStop(0, 'rgba(37,99,235,0.2)');
            gradient.addColorStop(1, 'rgba(37,99,235,0.06)');
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            
            // 数据点
            for (let i = 0; i < dimCount; i++) {
                const angle = startAngle + i * angleStep;
                const ratio = scores[i].score / scores[i].max;
                const r = radius * ratio;
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fillStyle = '#2563eb';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            // 标签
            ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (let i = 0; i < dimCount; i++) {
                const angle = startAngle + i * angleStep;
                const labelR = radius + 22;
                const x = cx + Math.cos(angle) * labelR;
                const y = cy + Math.sin(angle) * labelR;
                ctx.fillStyle = '#555';
                ctx.fillText(scores[i].short, x, y);
                ctx.fillStyle = getScoreColor(scores[i].score / scores[i].max);
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText(`${scores[i].score}/${scores[i].max}`, x, y + 16);
                ctx.font = '13px sans-serif';
            }
            
            // 中心总分
            ctx.fillStyle = '#1f1f1f';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${totalScore}`, cx, cy - 4);
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#888';
            ctx.fillText('/ 100', cx, cy + 14);
            
            // 雷达图区域不重复显示状态（左侧总分卡片已有）
            const badgeEl = document.getElementById('radarPassBadge');
            if (badgeEl) badgeEl.innerHTML = '';
            
            document.getElementById('radarChartBox').style.display = 'block';
        }

        // 直接审核：获取内容 + 调用 Kimi API
        async function directReview() {
            const url = document.getElementById('kmsUrl').value.trim();
            if (!url) {
                setStatus('请输入 KMS 链接', 'error');
                return;
            }
            
            // 检查冷却时间
            const now = Date.now();
            const elapsed = now - lastReviewTime;
            if (elapsed < REVIEW_COOLDOWN) {
                const wait = Math.ceil((REVIEW_COOLDOWN - elapsed) / 1000);
                setStatus(`请等待 ${wait} 秒后再审核（避免API限流）`, 'error');
                return;
            }
            
            const btn = document.getElementById('reviewBtn');
            const btnText = document.getElementById('reviewBtnText');
            btn.disabled = true;
            btnText.innerHTML = '<span class="spinner"></span> 审核中...';
            setStatus('正在获取内容并调用 AI 审核，请稍候（约 10-30 秒）...', 'info');
            
            const payload = {
                url: url,
                scene: document.getElementById('sceneSelect').value || undefined
            };
            
            try {
                const proxyOnline = await checkProxy();
                if (!proxyOnline) {
                    throw new Error('代理服务离线，请确认服务已启动');
                }
                
                const resp = await fetch(PROXY_URL + '/api/review', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                
                if (resp.status === 429) {
                    throw new Error('AI 服务繁忙，请稍后再试（429 限流）');
                }
                
                // 检查响应内容类型，防止收到 HTML 错误页面
                const contentType = resp.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await resp.text();
                    const preview = text.substring(0, 300).replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    console.error('服务器返回非JSON响应:', resp.status, preview);
                    throw new Error(`服务器返回非 JSON 响应（HTTP ${resp.status}）\n响应预览：${preview.substring(0, 150)}...\n可能原因：①后端服务未启动 ②后端崩溃 ③网络超时`);
                }
                
                const data = await resp.json();
                
                if (!data.success) {
                    throw new Error(data.error || '审核失败');
                }
                
                // 显示页面信息
                currentPageInfo = { title: data.title, space: data.space, url: data.url };
                document.getElementById('pageInfo').innerHTML = `
                    <p><strong style="color:#00d4ff">标题：</strong>${escapeHtml(data.title)}</p>
                    <p><strong style="color:#00d4ff">空间：</strong>${escapeHtml(data.space)}</p>
                    <p><strong style="color:#00d4ff">链接：</strong><a href="${sanitizeUrl(data.url)}" target="_blank" style="color:#7b2cbf">${escapeHtml(data.url)}</a></p>
                `;
                
                // 显示审核报告
                currentReport = data.report;
                document.getElementById('reportBox').textContent = data.report;
                
                // 优先使用后端结构化数据，兼容旧格式
                let scoreData;
                if (data.dimension_scores && Object.keys(data.dimension_scores).length > 0) {
                    // 从报告文本中解析打分理由（分数用后端返回的，理由从文本解析）
                    const parsed = parseDimensionScores(data.report, data.scene_id);
                    const commentMap = {};
                    parsed.scores.forEach(s => { commentMap[s.name] = s.comment; });
                    const dimConfig = getDimensionConfig(data.scene_id || getCurrentSceneId());
                    
                    const scores = dimConfig.map(dim => {
                        const score = data.dimension_scores[dim.name] || 0;
                        return { ...dim, score, comment: commentMap[dim.name] || '' };
                    });
                    scoreData = {
                        scores,
                        totalScore: data.total_score || 0,
                        passed: parsed.passed
                    };
                } else {
                    scoreData = parseDimensionScores(data.report, getCurrentSceneId());
                }
                drawRadarChart(scoreData);
                fillAnalysisReport(scoreData, data.report, data.facts);
                
                document.getElementById('reportSection').classList.remove('hidden');
                document.getElementById('promptSection').classList.add('hidden');
                
                document.getElementById('resultCard').classList.remove('hidden');
                setStatus(' AI 审核完成！', 'success');
                lastReviewTime = Date.now();  // 记录成功审核时间
                
                // 保存到 IndexedDB 历史记录
                try {
                    const history = await getReviewHistory(10);
                    const sameUrlRecords = history.filter(r => r.url === data.url);
                    const version = sameUrlRecords.length + 1;
                    const sceneSelect = document.getElementById('sceneSelect');
                    await saveReviewRecord({
                        url: data.url,
                        title: data.title,
                        space: data.space,
                        scene_id: sceneSelect ? sceneSelect.value : '',
                        scene_name: sceneSelect && sceneSelect.options[sceneSelect.selectedIndex] ? sceneSelect.options[sceneSelect.selectedIndex].text : '默认',
                        timestamp: Date.now(),
                        version: version,
                        total_score: data.total_score || scoreData.totalScore,
                        dimension_scores: data.dimension_scores || {},
                        issues: data.issues || [],
                        report: data.report,
                        facts: data.facts || {}
                    });
                } catch(e) {
                    console.log('保存历史记录失败:', e);
                }
                
            } catch(err) {
                setStatus(' ' + err.message, 'error');
                console.error(err);
            } finally {
                btn.disabled = false;
                btnText.textContent = '[AI] 直接审核';
            }
        }
        
        // 内容提要：获取内容 + 调用 Kimi API 生成精炼总结
        async function generateSummary() {
            const url = document.getElementById('kmsUrl').value.trim();
            if (!url) {
                setStatus('请输入 KMS 链接', 'error');
                return;
            }
            
            const btn = document.getElementById('summaryBtn');
            const btnText = document.getElementById('summaryBtnText');
            btn.disabled = true;
            btnText.innerHTML = '<span class="spinner"></span> 总结中...';
            setStatus('正在获取内容并生成提要，请稍候...', 'info');
            
            try {
                const proxyOnline = await checkProxy();
                if (!proxyOnline) {
                    throw new Error('代理服务离线，请确认服务已启动');
                }
                
                const resp = await fetch(PROXY_URL + '/api/summary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: url }),
                    mode: 'cors'
                });
                const data = await resp.json();
                
                if (!data.success) {
                    throw new Error(data.error || '生成失败');
                }
                
                currentPageInfo = {
                    title: data.title,
                    space: data.space,
                    url: data.url
                };
                
                document.getElementById('pageInfo').innerHTML = `
                    <p><strong style="color:#00d4ff">标题：</strong>${escapeHtml(data.title)}</p>
                    <p><strong style="color:#00d4ff">空间：</strong>${escapeHtml(data.space)}</p>
                    <p><strong style="color:#00d4ff">字数：</strong>${data.content_length} 字符</p>
                `;
                
                document.getElementById('reportBox').innerHTML = '<pre style="white-space:pre-wrap;word-wrap:break-word;font-family:inherit;line-height:1.8;">' + escapeHtml(data.summary) + '</pre>';
                document.getElementById('reportSection').classList.remove('hidden');
                document.getElementById('promptSection').classList.add('hidden');
                
                document.getElementById('scoreBoardCard').classList.add('hidden');
                document.getElementById('dimensionTable').classList.add('hidden');
                document.getElementById('issuesCard').classList.add('hidden');
                document.getElementById('suggestionsCard').classList.add('hidden');
                document.getElementById('highlightsCard').classList.add('hidden');
                document.getElementById('conclusionCard').classList.add('hidden');
                document.getElementById('factCheckContent').classList.add('hidden');
                document.getElementById('rawReportContent').classList.add('hidden');
                
                document.getElementById('resultCard').classList.remove('hidden');
                setStatus(' 内容提要生成完毕', 'success');
                
            } catch(err) {
                setStatus(' ' + err.message, 'error');
                console.error(err);
            } finally {
                btn.disabled = false;
                btnText.textContent = '[编辑] 内容提要';
            }
        }

        
        function copyReport() {
            if (!currentReport) return;
            navigator.clipboard.writeText(currentReport).then(() => {
                setStatus(' 报告已复制到剪贴板！', 'success');
            }).catch(() => {
                fallbackCopy(currentReport);
            });
        }
        
        function copyPrompt() {
            if (!currentPrompt) return;
            navigator.clipboard.writeText(currentPrompt).then(() => {
                setStatus(' 提示词已复制到剪贴板！', 'success');
            }).catch(() => {
                fallbackCopy(currentPrompt);
            });
        }
        
        function fallbackCopy(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setStatus(' 已复制到剪贴板！', 'success');
        }
        
        function toggleRawReport() {
            const content = document.getElementById('rawReportContent');
            const bar = document.getElementById('rawReportBar');
            content.classList.toggle('expanded');
            bar.classList.toggle('expanded');
        }
        
        function toggleFactCheck() {
            const content = document.getElementById('factCheckContent');
            const bar = document.getElementById('factCheckBar');
            content.classList.toggle('expanded');
            bar.classList.toggle('expanded');
        }

        function fillAnalysisReport(scoreData, reportText, facts) {
            
            // ========== 合格标准 ==========
            const stdBody = document.getElementById('passStandardBody');
            const currentScene = getCurrentSceneId();
            if (currentScene === 'general-topic-review') {
                stdBody.innerHTML = `
                    <div class="std-item"><span class="std-dot"></span><span>总分 ≥ <strong>80分</strong></span></div>
                    <div class="std-item"><span class="std-dot"></span><span>且未触碰任何红线：</span></div>
                    <div style="padding-left:18px;color:var(--text-tertiary);font-size:0.9em;">
                        <div>• 零决策请求 / 零数据支撑 / 零责任主体 / 零时间计划</div>
                    </div>
                    <div style="margin-top:6px;padding:6px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-color);font-size:0.85em;color:var(--text-tertiary);">
                        触碰红线 → 总分封顶60分，判定<span class="std-redline">「待修改」</span>
                    </div>
                `;
            } else if (currentScene === 'lagging-region-review') {
                stdBody.innerHTML = `
                    <div class="std-item"><span class="std-dot"></span><span><strong>R级制评分标准</strong></span></div>
                    <div style="padding-left:18px;color:var(--text-tertiary);font-size:0.85em;margin-bottom:8px;">
                        <div>• R1 (90-100分)：材料达标，可直接上会</div>
                        <div>• R2 (80-89分)：基本达标，微调后上会，无需重新评审</div>
                        <div>• R3 (70-79分)：存在明显不足，修改后需重新评审</div>
                        <div>• R4 (60-69分)：存在较多问题，大幅修改后重新评审</div>
                        <div>• R5 (0-59分)：严重不达标，退回重写</div>
                    </div>
                    <div class="std-item"><span class="std-dot"></span><span><strong>一票否决项</strong></span></div>
                    <div style="padding-left:18px;color:var(--text-tertiary);font-size:0.85em;">
                        <div>• 目标承诺维度为 0 分（未做出业绩承诺）</div>
                        <div>• 行动具体化维度低于 10 分（无责任人或无时间节点）</div>
                        <div>• 数据质量维度低于 5 分（重大错误导致决策误导）</div>
                    </div>
                    <div style="margin-top:6px;padding:6px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-color);font-size:0.85em;color:var(--text-tertiary);">
                        触发一票否决 → 直接判定<span class="std-redline">「R5 退回重写」</span>
                    </div>
                `;
            } else {
                stdBody.innerHTML = `
                    <div class="std-item"><span class="std-dot"></span><span>总分 ≥ <strong>80分</strong></span></div>
                    <div class="std-item"><span class="std-dot"></span><span>且差距与根因分析 ≥ <strong>12分</strong>（单项底线）</span></div>
                    <div style="margin-top:6px;padding:6px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-color);font-size:0.85em;color:var(--text-tertiary);">
                        根因分析低于12分 → 直接判定<span class="std-redline">「待修改」</span>，不论总分
                    </div>
                `;
            }
            
            // ========== 总体评分大卡片 ==========
            const totalEl = document.getElementById('analysisTotalScore');
            const badgeEl = document.getElementById('analysisStatusBadge');
            totalEl.textContent = scoreData.totalScore;
            
            if (scoreData.passed === true) {
                badgeEl.textContent = ' 通过';
                badgeEl.className = 'analysis-status-badge pass';
            } else if (scoreData.passed === false) {
                badgeEl.textContent = ' 待修改';
                badgeEl.className = 'analysis-status-badge fail';
            } else {
                badgeEl.textContent = '审核完成';
                badgeEl.className = 'analysis-status-badge';
            }
            
            // 各维度小卡片
            const dimsBox = document.getElementById('scoreBoardDims');
            dimsBox.innerHTML = scoreData.scores.map(s => {
                const ratio = s.score / s.max;
                const cls = getScoreClass(ratio);
                return `<div class="score-dim-item">
                    <div class="score-dim-value ${cls}">${s.score}</div>
                    <div class="score-dim-label">${escapeHtml(s.name)} / ${s.max}</div>
                </div>`;
            }).join('');
            
            // 单项底线提示（根据场景适配）
            const bottomLine = document.getElementById('scoreBoardBottomLine');
            let bottomLineHtml = '';
            
            if (currentScene === 'general-topic-review') {
                // 通用议题场景：检查红线触碰
                const alignScore = scoreData.scores.find(s => s.name.includes('目标'));
                const decisionScore = scoreData.scores.find(s => s.name.includes('决策'));
                const actionScore = scoreData.scores.find(s => s.name.includes('行动'));
                const redLines = [];
                if (alignScore && alignScore.score < 8) redLines.push('目标-解决方案对齐度 &lt; 8分（零决策请求风险）');
                if (decisionScore && decisionScore.score < 8) redLines.push('决策支撑度 &lt; 8分（零数据支撑风险）');
                if (actionScore && actionScore.score < 6) redLines.push('行动具体化 &lt; 6分（零责任主体或零时间计划风险）');
                if (redLines.length > 0) {
                    bottomLineHtml = `<span class="highlight-red">触碰红线：</span><br>` + redLines.map(l => `• ${l}`).join('<br>');
                    bottomLineHtml += '<br><span style="color:#ff7777;font-size:0.85em;">触碰任意红线，总分封顶60分，不得直接上会</span>';
                }
            } else if (currentScene === 'lagging-region-review') {
                // 业绩承诺会场景：一票否决检查
                const commitmentScore = scoreData.scores.find(s => s.name.includes('目标承诺'));
                const actionScore = scoreData.scores.find(s => s.name.includes('行动具体化'));
                const dataQualityScore = scoreData.scores.find(s => s.name.includes('数据质量'));
                const vetoLines = [];
                if (commitmentScore && commitmentScore.score === 0) vetoLines.push('目标承诺为 0 分（未做出业绩承诺）→ 一票否决 R5');
                if (actionScore && actionScore.score < 10) vetoLines.push('行动具体化 ' + actionScore.score + ' 分 &lt; 10 分（无责任人或无时间节点）→ 一票否决 R5');
                if (dataQualityScore && dataQualityScore.score < 5) vetoLines.push('数据质量 ' + dataQualityScore.score + ' 分 &lt; 5 分（重大错误导致决策误导）→ 一票否决 R5');
                if (vetoLines.length > 0) {
                    bottomLineHtml = `<span class="highlight-red">触发一票否决：</span><br>` + vetoLines.map(l => `• ${l}`).join('<br>');
                    bottomLineHtml += '<br><span style="color:#ff7777;font-size:0.85em;">一票否决项不修改到位，本次不予上会</span>';
                } else {
                    // 未触发一票否决，显示 R 级评定
                    const total = scoreData.totalScore || 0;
                    let rLevel = '';
                    let rDesc = '';
                    if (total >= 90) { rLevel = 'R1'; rDesc = '材料达标，可直接上会'; }
                    else if (total >= 80) { rLevel = 'R2'; rDesc = '基本达标，微调后上会'; }
                    else if (total >= 70) { rLevel = 'R3'; rDesc = '存在明显不足，修改后需重新评审'; }
                    else if (total >= 60) { rLevel = 'R4'; rDesc = '存在较多问题，大幅修改后重新评审'; }
                    else { rLevel = 'R5'; rDesc = '严重不达标，退回重写'; }
                    bottomLineHtml = `<span style="color:var(--text-tertiary);font-size:0.9em;">评审等级：<strong style="color:${total >= 80 ? '#16a34a' : (total >= 60 ? '#ca8a04' : '#dc2626')}">${rLevel}</strong> — ${rDesc}</span>`;
                }
            } else {
                // 述职场景：差距与根因分析底线
                const rcScore = scoreData.scores.find(s => s.name.includes('根因'));
                if (rcScore && rcScore.score < 12) {
                    bottomLineHtml = `<span class="highlight-red">差距与根因分析 ${rcScore.score} 分 &lt; 12 分底线</span><br>按评分规则直接判定为「待修改」，不论总分`;
                }
            }
            bottomLine.innerHTML = bottomLineHtml;
            
            // ========== 分项评分表 ==========
            const tbody = document.getElementById('dimensionTableBody');
            tbody.innerHTML = scoreData.scores.map(s => {
                const ratio = s.score / s.max;
                return `<tr>
                    <td><strong>${escapeHtml(s.name)}</strong></td>
                    <td style="font-weight:700;color:${getScoreColor(ratio)}">${s.score}</td>
                    <td>${s.max}</td>
                    <td>${renderRichComment(s.comment) || '—'}</td>
                </tr>`;
            }).join('');
            
            // ========== 问题清单 ==========
            const issues = parseIssues(reportText);
            const issuesCard = document.getElementById('issuesCard');
            if (issues.length > 0) {
                issuesCard.style.display = 'block';
                const badgeMap = {'致命':'badge-fatal','严重':'badge-serious','警告':'badge-warn','建议':'badge-tip'};
                document.getElementById('issueTableBody').innerHTML = issues.map(iss => {
                    const badgeCls = badgeMap[iss.level] || 'badge-warn';
                    const rowCls = iss.level === '致命' ? 'issue-fatal' : (iss.level === '严重' ? 'issue-serious' : (iss.level === '警告' ? 'issue-warn' : 'issue-tip'));
                    return `<tr class="${rowCls}">
                        <td><span class="${badgeCls}">${escapeHtml(iss.level)}</span></td>
                        <td>${escapeHtml(iss.dimension || '—')}</td>
                        <td>${renderRichComment(iss.desc)}</td>
                    </tr>`;
                }).join('');
            } else {
                issuesCard.style.display = 'none';
            }
            
            // ========== 改进建议 ==========
            const suggestions = parseSuggestions(reportText);
            const suggCard = document.getElementById('suggestionsCard');
            if (suggestions.length > 0) {
                suggCard.style.display = 'block';
                const pCls = {'P0':'priority-p0','P1':'priority-p1','P2':'priority-p2'};
                document.getElementById('suggestionTableBody').innerHTML = suggestions.map(s => {
                    return `<tr>
                        <td class="${pCls[s.priority] || 'priority-p1'}">${escapeHtml(s.priority)}</td>
                        <td>${renderRichComment(s.problem)}</td>
                        <td>${renderRichComment(s.suggestion)}</td>
                    </tr>`;
                }).join('');
            } else {
                suggCard.style.display = 'none';
            }
            
            // ========== 亮点 ==========
            const highlights = parseHighlights(reportText);
            const highCard = document.getElementById('highlightsCard');
            if (highlights.length > 0) {
                highCard.style.display = 'block';
                document.getElementById('highlightList').innerHTML = highlights.map(h => `<li>${renderRichComment(h)}</li>`).join('');
            } else {
                highCard.style.display = 'none';
            }
            
            // ========== 审核结论 ==========
            const conclusion = parseConclusion(reportText);
            const concCard = document.getElementById('conclusionCard');
            if (conclusion) {
                concCard.style.display = 'block';
                // 将 markdown 简单转换为 HTML，并保留AI输出的颜色标签
                const html = renderRichComment(conclusion)
                    .replace(/\n/g, '<br>');
                const box = document.getElementById('conclusionBox');
                box.innerHTML = html;
                // 根据通过状态给结论框添加样式
                box.classList.remove('conclusion-pass', 'conclusion-fail');
                if (scoreData.passed === true) box.classList.add('conclusion-pass');
                else if (scoreData.passed === false) box.classList.add('conclusion-fail');
            } else {
                concCard.style.display = 'none';
            }
            
            // 原始报告
            document.getElementById('reportBox').textContent = reportText;
            
            // 系统事实检查
            fillFactCheck(facts);
        }
        
        function fillFactCheck(facts) {
            const box = document.getElementById('factCheckBox');
            if (!facts) {
                box.innerHTML = '<div style="color:#666;font-size:0.85em;text-align:center;">暂无事实检查数据</div>';
                return;
            }
            
            const items = [];
            
            // ========== 通用议题场景检查项 ==========
            // 问题定义
            const prob = facts.problem_definition;
            if (prob) {
                items.push(renderFactItem(prob.has_problem_definition, prob.has_problem_definition ? '' : '', prob.has_problem_definition ? `问题定义：已检测到（${(prob.keywords_found || []).slice(0, 3).join('、')}）` : '问题定义：未明确检测到议题/问题/痛点描述'));
            }
            
            // 目标-方案对齐
            const align = facts.solution_alignment;
            if (align) {
                if (align.has_alignment) {
                    items.push(renderFactItem(true, '', '目标-方案对齐：问题与解决方案均已检测到'));
                } else if (align.has_problem && !align.has_solution) {
                    items.push(renderFactItem(false, '', '目标-方案对齐：有问题描述但缺少对应解决方案'));
                } else if (!align.has_problem && align.has_solution) {
                    items.push(renderFactItem(false, '', '目标-方案对齐：有解决方案但缺少问题定义'));
                } else {
                    items.push(renderFactItem(false, '', '目标-方案对齐：未检测到明确的问题和解决方案'));
                }
            }
            
            // 数据支撑
            const data = facts.data_support;
            if (data) {
                items.push(renderFactItem(data.has_data_support, data.has_data_support ? '' : '', data.has_data_support ? `数据支撑：检测到 ${data.data_count || 0} 处量化数据` : '数据支撑：未检测到量化数据（百分比/金额/数量等）'));
            }
            
            // 决策逻辑
            const logic = facts.decision_logic;
            if (logic) {
                items.push(renderFactItem(logic.has_decision_logic, logic.has_decision_logic ? '' : '', logic.has_decision_logic ? '决策逻辑：已检测到推理/结论表述' : '决策逻辑：未检测到明确的分析推理过程'));
            }
            
            // 行动具体化
            const action = facts.action_specificity;
            if (action) {
                const parts = [];
                if (action.has_action_items) parts.push('有行动项');
                if (action.has_responsible_person) parts.push('有责任人');
                if (action.has_timeline) parts.push('有时间节点');
                if (parts.length > 0) {
                    items.push(renderFactItem(null, '•', `行动具体化：${parts.join(' | ')}`, 'info'));
                } else {
                    items.push(renderFactItem(false, '', '行动具体化：未检测到具体行动安排'));
                }
            }
            
            // 材料格式
            const fmt = facts.material_format;
            if (fmt) {
                const parts = [];
                if (fmt.has_headings) parts.push('标题层级');
                if (fmt.has_lists) parts.push('列表');
                if (fmt.has_tables) parts.push('表格');
                if (fmt.has_paragraphs) parts.push('分段');
                if (parts.length > 0) {
                    items.push(renderFactItem(true, '', `材料格式：${parts.join(' | ')}`));
                } else {
                    items.push(renderFactItem(false, '', '材料格式：结构混乱，缺少标题/列表/表格'));
                }
            }
            
            // ========== 述职场景检查项（保持原有逻辑） ==========
            // 完整性
            const comp = facts.completeness;
            if (comp) {
                const pass = comp.has_all_modules;
                items.push(renderFactItem(pass, pass ? '' : '', pass ? `5大模块齐全（${comp.found_count}/${comp.total_count}）` : `模块缺失：${comp.found_count}/${comp.total_count}，缺少：${(comp.missing || []).join('、')}`));
            }
            
            // 根因分析工具
            const tools = facts.root_cause_tools;
            if (tools) {
                const pass = tools.has_tool;
                items.push(renderFactItem(pass, pass ? '' : '', pass ? `根因分析工具：${(tools.tools_found || []).join('、')}` : '根因分析工具：未检测到 5Why/鱼骨图/漏斗分析'));
            }
            
            // 归因
            const attr = facts.attribution;
            if (attr) {
                if (attr.total_attributions > 0) {
                    items.push(renderFactItem(null, '•', `主观归因：${attr.subjective_count} 个，客观归因：${attr.objective_count} 个（主观占比 ${Math.round(attr.subjective_ratio * 100)}%）`, 'info'));
                } else {
                    items.push(renderFactItem(null, '•', '归因分析：未检测到主观/客观归因关键词', 'info'));
                }
            }
            
            // 里程碑
            const ms = facts.milestones;
            if (ms) {
                items.push(renderFactItem(ms.has_milestone, ms.has_milestone ? '' : '', ms.has_milestone ? '里程碑/验收标准：已检测到' : '里程碑/验收标准：未检测到'));
            }
            
            // SP引用
            const sp = facts.sp_reference;
            if (sp) {
                items.push(renderFactItem(sp.has_sp_reference, sp.has_sp_reference ? '' : '', sp.has_sp_reference ? 'SP/战略引用：已检测到' : 'SP/战略引用：未检测到'));
            }
            
            // 资源需求
            const res = facts.resources;
            if (res) {
                const parts = [];
                const labels = {hr: '人力', budget: '预算', training: '培训', policy: '政策支持'};
                for (const key of ['hr', 'budget', 'training', 'policy']) {
                    parts.push(`${res[key] && res[key].has ? '' : ''}${labels[key]}`);
                }
                items.push(renderFactItem(null, '•', `资源需求：${parts.join(' | ')}`, 'info'));
            }
            
            // 硬缺口方案
            const gap = facts.hard_gap_plan;
            if (gap) {
                items.push(renderFactItem(gap.has_gap_plan, gap.has_gap_plan ? '' : '', gap.has_gap_plan ? '硬缺口应对方案：已检测到' : '硬缺口应对方案：未检测到'));
            }
            
            // 表格
            const tbl = facts.tables;
            if (tbl) {
                items.push(renderFactItem(tbl.has_tables, tbl.has_tables ? '' : '', tbl.has_tables ? `数据表格：已检测到（${tbl.table_line_count || 0} 行表格）` : '数据表格：未检测到'));
            }
            
            // 同比环比
            const qoq = facts.quarter_over_quarter;
            if (qoq) {
                items.push(renderFactItem(qoq.has_qoq, qoq.has_qoq ? '' : '', qoq.has_qoq ? '同比/环比数据：已检测到' : '同比/环比数据：未检测到'));
            }
            
            box.innerHTML = items.join('');
        }
        
        function renderFactItem(pass, icon, text, type) {
            let cls = 'fact-check-item';
            if (type === 'info') cls += ' info';
            else if (pass === true) cls += ' pass';
            else if (pass === false) cls += ' fail';
            return `<div class="${cls}"><span class="icon">${icon}</span><span>${escapeHtml(text)}</span></div>`;
        }

        async function exportReportToPDF() {
            if (!currentReport) {
                setStatus('请先完成审核再导出', 'error');
                return;
            }
            
            const btn = event.target;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="spinner" style="border-color:rgba(0,0,0,0.2);border-top-color:var(--primary);"></span> 生成中...';
            btn.disabled = true;
            
            try {
                // 构建导出内容：页面信息 + 右侧报告
                const container = document.createElement('div');
                container.style.cssText = 'padding:24px;background:#fff;color:#1f1f1f;font-family:Inter,-apple-system,sans-serif;line-height:1.7;font-size:14px;max-width:800px;margin:0 auto;';
                
                // 标题
                const title = currentPageInfo ? (currentPageInfo.title || '审核报告') : '审核报告';
                container.innerHTML = `
                    <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #1677ff;">
                        <h1 style="font-size:22px;font-weight:700;color:#1f1f1f;margin:0 0 8px 0;">会议材料审核报告</h1>
                        <p style="font-size:13px;color:#666;margin:0;">${escapeHtml(title)}</p>
                        <p style="font-size:12px;color:#999;margin:4px 0 0 0;">生成时间：${new Date().toLocaleString('zh-CN')}</p>
                    </div>
                `;
                
                // 页面信息
                if (currentPageInfo) {
                    container.innerHTML += `
                        <div style="margin-bottom:20px;padding:12px 16px;background:#f6f8fa;border-radius:8px;border-left:3px solid #1677ff;">
                            <p style="margin:4px 0;font-size:13px;"><strong>标题：</strong>${escapeHtml(currentPageInfo.title || '')}</p>
                            <p style="margin:4px 0;font-size:13px;"><strong>空间：</strong>${escapeHtml(currentPageInfo.space || '')}</p>
                            <p style="margin:4px 0;font-size:13px;"><strong>链接：</strong>${escapeHtml(currentPageInfo.url || '')}</p>
                        </div>
                    `;
                }
                
                // 克隆右侧报告区域
                const reportRight = document.querySelector('.report-right');
                if (reportRight) {
                    const clone = reportRight.cloneNode(true);
                    
                    // 清理不需要的元素（原始报告折叠栏、系统事实检查等）
                    const rawBar = clone.querySelector('.raw-report-bar');
                    const rawContent = clone.querySelector('.raw-report-content');
                    const factBar = clone.querySelector('.fact-check-bar');
                    const factContent = clone.querySelector('.fact-check-content');
                    const actionBtns = clone.querySelector('div[style*="flex-wrap"]');
                    if (rawBar) rawBar.remove();
                    if (rawContent) rawContent.remove();
                    if (factBar) factBar.remove();
                    if (factContent) factContent.remove();
                    if (actionBtns && actionBtns.querySelector('button')) actionBtns.remove();
                    
                    // 处理canvas：把雷达图转为高清图片，PDF中保持足够尺寸
                    const canvas = document.getElementById('radarCanvas');
                    const cloneCanvas = clone.querySelector('canvas');
                    if (canvas && cloneCanvas) {
                        const img = document.createElement('img');
                        img.src = canvas.toDataURL('image/png');
                        img.style.cssText = 'width:240px;height:auto;display:block;margin:0 auto;';
                        cloneCanvas.parentNode.replaceChild(img, cloneCanvas);
                    }
                    
                    // 清理内联样式中不适应打印的部分
                    clone.querySelectorAll('[class*="hidden"]').forEach(el => {
                        if (el.style.display === 'none') el.remove();
                    });
                    
                    // 展开所有折叠内容
                    clone.querySelectorAll('.raw-report-content, .fact-check-content').forEach(el => {
                        el.style.maxHeight = 'none';
                        el.style.overflow = 'visible';
                    });
                    
                    container.appendChild(clone);
                }
                
                // PDF 配置
                const opt = {
                    margin: [12, 12, 12, 12],
                    filename: `审核报告-${title.substring(0, 30).replace(/[\\/:*?"<>|]/g, '_')}.pdf`,
                    image: { type: 'jpeg', quality: 0.95 },
                    html2canvas: { 
                        scale: 2, 
                        useCORS: true, 
                        logging: false,
                        backgroundColor: '#ffffff'
                    },
                    jsPDF: { 
                        unit: 'mm', 
                        format: 'a4', 
                        orientation: 'portrait' 
                    },
                    pagebreak: { 
                        mode: ['css', 'legacy'],
                        avoid: 'table'
                    }
                };
                
                await html2pdf().set(opt).from(container).save();
                setStatus(' PDF 导出成功', 'success');
                
            } catch (err) {
                console.error('PDF导出失败:', err);
                setStatus(' PDF 导出失败: ' + err.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
        
        function resetForm() {
            document.getElementById('kmsUrl').value = '';
            document.getElementById('resultCard').classList.add('hidden');
            document.getElementById('status').style.display = 'none';
            document.getElementById('radarChartBox').style.display = 'none';
            document.getElementById('analysisTotalScore').textContent = '--';
            document.getElementById('analysisStatusBadge').textContent = '审核中';
            document.getElementById('analysisStatusBadge').className = 'analysis-status-badge';
            document.getElementById('scoreBoardDims').innerHTML = '';
            document.getElementById('scoreBoardBottomLine').innerHTML = '';
            document.getElementById('dimensionTableBody').innerHTML = '<tr><td colspan="4" style="text-align:center;color:#666;">等待审核结果...</td></tr>';
            document.getElementById('issuesCard').style.display = 'none';
            document.getElementById('issueTableBody').innerHTML = '';
            document.getElementById('suggestionsCard').style.display = 'none';
            document.getElementById('suggestionTableBody').innerHTML = '';
            document.getElementById('highlightsCard').style.display = 'none';
            document.getElementById('highlightList').innerHTML = '';
            document.getElementById('conclusionCard').style.display = 'none';
            document.getElementById('conclusionBox').innerHTML = '';
            document.getElementById('rawReportContent').classList.remove('expanded');
            document.getElementById('rawReportBar').classList.remove('expanded');
            document.getElementById('factCheckContent').classList.remove('expanded');
            document.getElementById('factCheckBar').classList.remove('expanded');
            document.getElementById('factCheckBox').innerHTML = '';
            document.querySelectorAll('.principle-card').forEach(card => card.classList.remove('focus'));
            currentPrompt = '';
            currentReport = '';
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function sanitizeUrl(url) {
            if (!url) return '#';
            // 仅允许 http/https 协议，防止 javascript: 等协议注入
            try {
                const parsed = new URL(url);
                if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                    return url;
                }
            } catch(e) {
                // 非绝对 URL，检查是否以 http 开头
                if (/^https?:\/\//.test(url)) return url;
            }
            return '#';
        }
        
        // 安全渲染AI输出的颜色标签（highlight-green/yellow/red）
        function renderRichComment(text) {
            if (!text) return '';
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const colorMap = {
                'green': isDark ? '#7ee787' : '#237804',
                'yellow': isDark ? '#ffd666' : '#ad6800',
                'red': isDark ? '#ff7875' : '#cf1322'
            };
            const parts = [];
            const regex = /<span class="highlight-(green|yellow|red)">(.*?)<\/span>/g;
            let lastIndex = 0;
            let match;
            while ((match = regex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    parts.push(escapeHtml(text.slice(lastIndex, match.index)));
                }
                const color = colorMap[match[1]] || '#ccc';
                parts.push(`<span style="color:${color}">${escapeHtml(match[2])}</span>`);
                lastIndex = match.index + match[0].length;
            }
            if (lastIndex < text.length) {
                parts.push(escapeHtml(text.slice(lastIndex)));
            }
            return parts.join('');
        }
        
        document.getElementById('kmsUrl').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') directReview();
        });
        
        // API 配置管理
        function toggleConfig() {
            const section = document.getElementById('configSection');
            const bar = document.getElementById('configBar');
            section.classList.toggle('expanded');
            bar.classList.toggle('expanded');
        }
        
        async function loadConfig() {
            // 先填充本地保存的后端地址
            document.getElementById('cfgProxyUrl').value = DSTE.Storage.getString('meetingReviewerProxyUrl');
            
            try {
                const resp = await fetch(PROXY_URL + '/api/config', { method: 'GET', mode: 'cors' });
                const data = await resp.json();
                
                if (!data.success) {
                    throw new Error(data.error || '加载失败');
                }
                
                const cfg = data.config || data;
                document.getElementById('cfgApiKey').value = cfg.kimi_api_key || '';
                document.getElementById('cfgApiUrl').value = cfg.kimi_api_url || '';
                document.getElementById('cfgModel').value = cfg.kimi_model || '';
                document.getElementById('cfgTemp').value = cfg.temperature !== undefined ? cfg.temperature : '';
                document.getElementById('cfgMaxTokens').value = cfg.max_tokens || '';
                document.getElementById('cfgTimeout').value = cfg.api_timeout || '';
                
                // 更新摘要显示
                const model = cfg.kimi_model || '默认模型';
                const temp = cfg.temperature !== undefined ? cfg.temperature : '0.3';
                document.getElementById('configSummary').textContent = `${model} · temp=${temp}`;
                
                setConfigStatus(' 配置已加载', 'success');
            } catch(err) {
                setConfigStatus(' 后端连接失败，使用本地配置', 'error');
                document.getElementById('configSummary').textContent = '本地模式';
            }
        }
        
        async function saveConfig() {
            // 保存后端地址到 本地存储
            const proxyUrl = document.getElementById('cfgProxyUrl').value.trim();
            if (proxyUrl) {
                DSTE.Storage.setString('meetingReviewerProxyUrl', proxyUrl);
                PROXY_URL = proxyUrl;
            }
            
            const updates = {};
            const apiKey = document.getElementById('cfgApiKey').value.trim();
            const apiUrl = document.getElementById('cfgApiUrl').value.trim();
            const model = document.getElementById('cfgModel').value.trim();
            const temp = document.getElementById('cfgTemp').value.trim();
            const maxTokens = document.getElementById('cfgMaxTokens').value.trim();
            const timeout = document.getElementById('cfgTimeout').value.trim();
            
            // 只发送有值的字段（支持部分更新）
            if (apiKey && !apiKey.startsWith('***')) updates.kimi_api_key = apiKey;
            if (apiUrl) updates.kimi_api_url = apiUrl;
            if (model) updates.kimi_model = model;
            if (temp !== '') updates.temperature = parseFloat(temp);
            if (maxTokens !== '') updates.max_tokens = parseInt(maxTokens);
            if (timeout !== '') updates.api_timeout = parseInt(timeout);
            
            if (Object.keys(updates).length === 0) {
                setConfigStatus(' 没有要保存的更改', 'error');
                return;
            }
            
            try {
                const resp = await fetch(PROXY_URL + '/api/config', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(updates)
                });
                const data = await resp.json();
                
                if (!data.success) {
                    throw new Error(data.error || '保存失败');
                }
                
                setConfigStatus(' 配置已保存', 'success');
                // 重新加载以显示脱敏后的值和更新摘要
                await loadConfig();
            } catch(err) {
                setConfigStatus(' ' + err.message, 'error');
            }
        }
        
        function setConfigStatus(msg, type) {
            const el = document.getElementById('configStatus');
            el.textContent = msg;
            el.className = 'status ' + type;
        }
        
        // 页面加载时自动加载配置
        loadConfig();
        
        // 主题切换由全局 assets/js/main.js 的 ThemeManager 统一处理，
        // reviewer 页面不再重复绑定，避免同一按钮触发两次切换导致无变化。

        // 暴露解析函数供测试使用（不影响生产功能）
        window._testParseDimensionScores = parseDimensionScores;
        window._testParseIssues = parseIssues;
        window._testParseSuggestions = parseSuggestions;
        window._testParseHighlights = parseHighlights;
        window._testParseConclusion = parseConclusion;
        window._testGetDimensionConfig = getDimensionConfig;

        // 暴露供 HTML 内联事件处理器调用的函数（模块作用域默认不挂载到 window）
        window.clearReviewHistory = clearReviewHistory;
        window.closeCompareMatrixModal = closeCompareMatrixModal;
        window.closeCompareModal = closeCompareModal;
        window.copyPrompt = copyPrompt;
        window.copyReport = copyReport;
        window.directReview = directReview;
        window.exportReportToPDF = exportReportToPDF;
        window.generateSummary = generateSummary;
        window.loadConfig = loadConfig;
        window.renderCompareMatrix = renderCompareMatrix;
        window.renderHistoryPanel = renderHistoryPanel;
        window.resetForm = resetForm;
        window.sanitizeUrl = sanitizeUrl;
        window.saveConfig = saveConfig;
        window.showCompareMatrix = showCompareMatrix;
        window.startBatchReview = startBatchReview;
        window.toggleBatchInput = toggleBatchInput;
        window.toggleConfig = toggleConfig;
        window.toggleFactCheck = toggleFactCheck;
        window.toggleRawReport = toggleRawReport;

        // 移动端汉堡菜单切换
        (function() {
            const menuToggle = document.getElementById('mobile-menu-toggle');
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (menuToggle && sidebar && overlay) {
                menuToggle.addEventListener('click', function() {
                    sidebar.classList.toggle('open');
                    overlay.classList.toggle('open');
                });
                overlay.addEventListener('click', function() {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('open');
                });
                sidebar.addEventListener('click', function(e) {
                    if (e.target.closest('.sidebar-item')) {
                        sidebar.classList.remove('open');
                        overlay.classList.remove('open');
                    }
                });
            }
        })();
