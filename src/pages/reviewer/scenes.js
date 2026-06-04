        async function loadScenes() {
            const select = document.getElementById('sceneSelect');
            let sceneList = [];
            try {
                const resp = await fetch(PROXY_URL + '/api/scenes', { method: 'GET', mode: 'cors' });
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
                    bottom: '⚠️ 红线：零决策请求 = 打回重写',
                    bottomClass: 'red'
                },
                {
                    dim: '决策支撑度',
                    weight: '30分',
                    body: '关键论点有数据/案例/对比支撑；提供明确的决策建议及备选方案对比；包含风险评估和资源需求清单',
                    bottom: '⚠️ 红线：零数据支撑 = 打回补充',
                    bottomClass: 'red'
                },
                {
                    dim: '行动具体化',
                    weight: '25分',
                    body: 'SMART原则：具体(S)、可衡量(M)、可达成(A)、相关(R)、有时限(T)。每个行动项必须有责任人和时间节点',
                    bottom: '⚠️ 红线：零责任主体或零时间计划 = 打回明确',
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
                    bottom: '⚠️ 红线：缺少市场现状或业绩回顾 = 打回补充',
                    bottomClass: 'red'
                },
                {
                    dim: '差距与根因分析',
                    weight: '20分',
                    body: '业绩差距需量化呈现（目标vs实际，同比/环比），根因分析需深入业务本质而非表面归因。建议使用5Why或鱼骨图等结构化方法，避免"市场环境不好"等空泛结论',
                    bottom: '⚠️ 红线：差距无量化数据或根因停留在表面 = 打回重做',
                    bottomClass: 'red'
                },
                {
                    dim: '业绩预测达成概率分析',
                    weight: '10分',
                    body: '对未来业绩目标的预测需有逻辑支撑（历史趋势、市场容量、竞争态势、资源投入），明确给出达成概率评估及关键假设条件。避免"一定能完成"等主观断言',
                    bottom: '⚠️ 红线：无概率评估或假设条件缺失 = 打回完善',
                    bottomClass: 'red'
                },
                {
                    dim: '下一步计划',
                    weight: '20分',
                    body: '改进措施需具体可执行，明确责任人和时间节点，与差距分析形成闭环。优先解决根因中的高影响项，资源需求和支持请求需清晰列出',
                    bottom: '⚠️ 红线：措施与根因脱节或缺少责任人/时间节点 = 打回明确',
                    bottomClass: 'red'
                },
                {
                    dim: 'SP战略关联度',
                    weight: '10分',
                    body: '述职内容需与SP战略方向明确对齐，体现战略解码成果。展示本部门/区域如何承接公司战略，关键举措与战略目标的映射关系清晰',
                    bottom: '⚠️ 红线：未提及战略方向或缺少对齐分析 = 打回补充',
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
            'lagging-region-review': [],
            'annual-leader-review': []
        };

        function getLocalFocusDimensions(sceneId) {
            const map = {
                'vertical-segment-review': ['完整性', '差距与根因分析', '业绩预测达成概率分析', '下一步计划', 'SP战略关联度', '态度与反思'],
                'lagging-region-review': ['完整性', '差距与根因分析', 'SP战略关联度', '业绩预测达成概率分析'],
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
            if (activeScene === 'general-topic-review') {
                stdBody.innerHTML = `
                    <div class="std-item"><span class="std-dot"></span><span>总分 ≥ <strong>80分</strong></span></div>
                    <div class="std-item"><span class="std-dot"></span><span>且未触碰任何红线：</span></div>
                    <div style="padding-left:18px;color:#6b7280;font-size:0.9em;">
                        <div>• 零决策请求 / 零数据支撑 / 零责任主体 / 零时间计划</div>
                    </div>
                    <div style="margin-top:6px;padding:6px 10px;background:#fff;border-radius:6px;border:1px solid #e5e7eb;font-size:0.85em;color:#6b7280;">
                        触碰红线 → 总分封顶60分，判定<span class="std-redline">「待修改」</span>
                    </div>
                `;
            } else {
                stdBody.innerHTML = `
                    <div class="std-item"><span class="std-dot"></span><span>总分 ≥ <strong>80分</strong></span></div>
                    <div class="std-item"><span class="std-dot"></span><span>且差距与根因分析 ≥ <strong>12分</strong>（单项底线）</span></div>
                    <div style="margin-top:6px;padding:6px 10px;background:#fff;border-radius:6px;border:1px solid #e5e7eb;font-size:0.85em;color:#6b7280;">
                        根因分析低于12分 → 直接判定<span class="std-redline">「待修改」</span>，不论总分
                    </div>
                `;
            }
        }

        function getLocalSceneHints(sceneId) {
            const hints = {
                'lagging-region-review': [
                    '季度目标达成全景是否清晰（财务/客户/运营/学习成长）',
                    '策略执行的有效性评估是否客观',
                    '未达成目标的根因分析是否深入（5Why）',
                    '下季度策略调整是否有数据支撑',
                    '跨部门协同问题是否识别并给出解决方案',
                    '业绩承诺是否具体可衡量，避免空话套话',
                    '资源需求和支持请求是否明确'
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
                    { name: '完整性', max: 25, short: '完整性' },
                    { name: '差距与根因分析', max: 25, short: '差距根因' },
                    { name: 'SP战略关联度', max: 25, short: 'SP战略' },
                    { name: '业绩预测达成概率分析', max: 25, short: '业绩预测' }
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
