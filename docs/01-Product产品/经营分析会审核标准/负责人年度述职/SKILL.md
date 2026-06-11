---
name: annual-leader-review
description: Audit and evaluate annual performance review materials for business managers and team leaders. Use when the user needs to (1) audit a负责人年度述职材料, (2) evaluate manager performance against annual goals and strategic objectives, (3) assess leadership development and team building, (4) review alignment between personal/team goals and company strategic planning. Triggered by mentions of年度述职, 负责人述职, manager review, leadership assessment, or annual performance evaluation.
---

# 负责人年度述职 — 材料审核 SKILL

> **Scene**: `annual-leader-review`
> **Short Name**: 负责人年度述职
> **Trigger**: 审核业务线负责人/团队管理者的年度述职材料
> **Methodology Reference**: 借鉴华为 DSTE（Develop Strategy To Execution）干部述职体系

## Workflow

Execute this workflow sequentially when auditing a manager's annual performance review material.

---

### Step 1: Material Intake

1. Accept the KMS link to the manager's annual review material
2. Accept prior year review material for year-over-year comparison (if available)
3. Accept the supplementary form: **体系SP战略规划对照表** (if provided)
4. Identify the manager's level (L3 基层管理者 / L4 中层管理者 / L5+ 高层管理者) — audit depth varies by level
5. Parse the document for: annual goals, key battles, team metrics, personal growth, next-year plan

---

### Step 2: 完整性 Check (25 points)

**Core Question**: Does the material cover all 8 required modules for a comprehensive annual review?

#### 2.1 Required Modules (借鉴华为干部述职八大内容)

| # | Module | Full Marks | Deduction | Content Requirements |
|---|--------|-----------|-----------|---------------------|
| 1 | **年度目标达成回顾** | 4 | -4 if missing | KPI/PBC目标 vs 实际，按重要性排序，量化呈现 |
| 2 | **关键战役复盘** | 4 | -4 if missing | 年度重点战役/项目：目标→执行→结果→经验→教训 |
| 3 | **团队建设与人才培养** | 3 | -3 if missing | 团队规模变化、关键岗位梯队、骨干流失率、人才培养成果 |
| 4 | **个人能力提升** | 3 | -3 if missing | 领导力成长、专业能力提升、管理方法改进、学习成果 |
| 5 | **客户/市场洞察** | 3 | -3 if missing | 客户满意度、市场变化、竞争态势、机会与风险识别 |
| 6 | **资源使用效率** | 2 | -2 if missing | 预算执行率、投入产出比、资源浪费/优化 |
| 7 | **问题反思与根因** | 3 | -3 if missing | 未达标项的坦诚反思，主观原因≥40%，用数据说话 |
| 8 | **下年度规划** | 3 | -3 if missing | 年度目标、关键战役、资源需求、风险预案 |

#### 2.2 Module Quality Standards

**年度目标达成回顾** (4 points):
- Must present ALL KPIs, not just achievements
- Achievement rate must be calculated: (actual/target) × 100%
- Must rank KPIs by importance/priority (don't hide failures at the bottom)
- Must explain significant variances (≥10% deviation from target)
- Bad: Lists 10 KPIs with 8 green, buries 2 red ones
- Good: "Top 3 priorities achieved (120%, 110%, 105%). Missed 2 secondary targets (85%, 80%) due to X and Y. Root causes analyzed in Section 7."

**关键战役复盘** (4 points):
- Must use DSTE "战役复盘" structure: 目标→执行过程→结果→经验沉淀→教训反思
- Each key battle must have: target, timeline, responsible team, actual result, variance analysis
- Must distinguish between "胜利战役" (经验萃取) and "失败战役" (教训反思)
- Bad: "Completed Project A." (no detail)
- Good: "Project A: Target 300万营收 by Q2. Achieved 280万 (93%). Delayed due to client approval cycle 45天 vs planned 30天. Lesson: front-load client engagement in future projects."

**团队建设与人才培养** (3 points):
- Must include quantitative team metrics: headcount, turnover rate, promotion count, new hire quality
- Must identify 3 levels of talent pipeline: 接班人 (ready now) / 储备干部 (1-2 years) / 高潜人才 (3-5 years)
- Must address key岗位 vacancies and filling status
- Bad: "Team is stable, everyone works hard."
- Good: "Team: 12 people (vs target 15). Turnover 8% (target ≤10%). Promoted 2 to L3, 1 in pipeline for L4. Key gap: 缺少解决方案架构师, plan to hire in Q1 next year."

**个人能力提升** (3 points):
- Must include: management capability growth + professional skill growth
- Must reference specific training/learning activities with evidence
- Must demonstrate behavioral change (not just "attended training")
- Bad: "Participated in management training."
- Good: "Completed 'Project Management Excellence' course (40 hours). Applied lessons to reduce project delay rate from 25% to 15%. Improved 1-on-1 frequency from monthly to bi-weekly, team engagement score +8 points."

**客户/市场洞察** (3 points):
- Must include customer satisfaction data (NPS or equivalent)
- Must identify top 3 market changes affecting the business
- Must include competitive landscape analysis
- Bad: "Customers are generally satisfied."
- Good: "NPS: 45 (vs target 50). Top complaint: delivery cycle (avg 35 days vs competitor 28 days). Market shift: customers preferring bundled solutions over standalone products. Competitor X launched similar product at 20% lower price."

**资源使用效率** (2 points):
- Must include budget execution rate
- Must include ROI or equivalent efficiency metrics
- Must identify resource waste and optimization measures
- Bad: "Budget fully utilized."
- Good: "Budget execution: 95% (vs target 90-100%). Marketing ROI: 1:3.2 (vs target 1:3). Identified waste: 15% of event budget spent on low-conversion channels. Optimized by shifting to digital channels, expected improvement +20% efficiency."

**问题反思与根因** (3 points):
- Must be **honest and self-critical** (华为要求"自我批判")
- Must distinguish between external factors (market, policy) and internal factors (capability, process)
- Internal/self factors must account for ≥40% of root causes
- Must use at least one analysis framework (5Why, Fishbone, etc.)
- Bad: "Market was tough this year."
- Good: "Revenue miss: 40% external (market downturn, -15% industry avg) + 60% internal. Internal: ① Customer segmentation不到位 (personal gap: insufficient data analysis skill) ② 商机跟进不及时 (process gap: no SLA for lead response) ③ 团队能力建设滞后 (management gap: focused on delivery, neglected training)."

**下年度规划** (3 points):
- Must include specific targets (quantified)
- Must identify key battles for next year (3-5 priority initiatives)
- Must include resource requirements and risk assessment
- Bad: "Continue to work hard next year."
- Good: "2026 Targets: Revenue 5000万 (+25%), NPS ≥55, team expansion to 18 people. Key Battles: ① Launch bundled solution (Q1-Q2) ② Enter 2 new vertical markets (Q2-Q3) ③ Implement CRM upgrade (Q1). Resource: +2 sales headcount, ¥800K marketing budget. Risk: new market competition, mitigation: pre-launch customer validation."

---

### Step 3: SP战略关联度 Check (25 points)

**Core Question**: Do the manager's goals and plans align with company and department strategic planning?

#### 3.1 Alignment Dimensions

| Level | Full Marks | Deduction | Bad Example | Good Example |
|-------|-----------|-----------|-------------|--------------|
| **Company SP** | 8 | -8 if conflict | "Focus on low-price market" (conflicts with company "premium quality" strategy) | "Focus on high-value customers, aligning with company 'quality over quantity' strategic direction" |
| **Department BP** | 8 | -8 if no linkage | "My team's goals are independent" | "Team's 'digital customer acquisition' initiative directly supports department's 'intelligent marketing' key battle" |
| **Personal Goals→SP** | 5 | -5 if no explicit linkage | No mention of SP in material | "Personal PBC priority 1: 'Expand下沉market' aligns with SP opportunity point #3 '下沉market as new growth engine'" |
| **Next Year Plan→SP** | 4 | -4 if next year ignores SP | Next year plan completely different from SP direction | "2026 plan includes 3 SP-identified opportunity points: ①下沉market ② bundled solution ③ key account expansion" |

#### 3.2 SP Opportunity Coverage Assessment

- System extracts SP opportunity points from submitted SP document
- Compares against review material for mentions and responses
- Coverage rate = mentioned opportunities / total opportunities

| Coverage Rate | Deduction |
|--------------|-----------|
| ≥80% | No deduction |
| 50-79% | -5 points |
| 20-49% | -10 points |
| <20% | -15 points |

**🔴 Fatal Line**: Plan conflicts with SP direction (e.g., SP says "focus on high-end", plan says "compete on low price") → **This dimension = 0 points**

---

### Step 4: 态度与反思 Check (25 points)

**Core Question**: Is the review honest, self-critical, and growth-oriented? (华为 "自我批判" 文化)

#### 4.1 Attitude Assessment

| Dimension | Full Marks | Deduction | Positive Signal (+) | Negative Signal (-) |
|-----------|-----------|-----------|---------------------|---------------------|
| **Honesty** | 8 | -8 if deceptive | Admits failures openly, data transparent | Hides failures, cherry-picks data |
| **Self-criticism** | 8 | -8 if blame-shifting | "我的责任是..." "我在XX方面确实做得不够..." | "主要是市场/公司/政策的问题..." |
| **Growth mindset** | 5 | -5 if stagnant | Specific learning plans and capability gaps identified | "继续保持现有做法" |
| **Leadership reflection** | 4 | -4 if missing | Reflects on leadership style, team impact, coaching effectiveness | No mention of leadership or team development |

#### 4.2 Language Pattern Analysis

**Deduct points for blame-shifting language** (each instance: -2 points, max -10):
- "市场环境不好"
- "公司政策限制"
- "竞争对手太激�的"
- "资源不够"
- "团队执行力差" (without self-reflection)

**Reward self-critical language** (each instance: +2 points, max +10):
- "我复盘后发现..."
- "我在XX环节确实做得不够..."
- "对比优秀同事，我的差距是..."
- "下一年我要重点提升..."
- "这次失败的主要责任在我..."

#### 4.3 Leadership Growth Evidence

Must demonstrate growth in at least 2 of these areas:
- Strategic thinking (从执行到规划)
- Team development (从个人贡献到团队赋能)
- Cross-functional collaboration (从单打独斗到协同作战)
- Data-driven decision making (从经验驱动到数据驱动)
- Coaching capability (从做事到带人)

**🔴 Fatal Line**: ≥5 blame-shifting expressions with zero self-criticism → **This dimension ≤ 5 points**

---

### Step 5: 下一步计划 Check (25 points)

**Core Question**: Is the next-year plan specific, actionable, and aligned with the year's lessons?

#### 5.1 Plan Quality

| Criterion | Full Marks | Deduction | Bad Example | Good Example |
|-----------|-----------|-----------|-------------|--------------|
| **Targets quantified** | 8 | -8 if qualitative | "Work harder next year" | "Revenue 5000万 (+25%), team 18 people, NPS ≥55" |
| **Key battles defined** | 6 | -6 if missing | No priority initiatives | "3 Key Battles: ① bundled solution launch ② 2 new markets ③ CRM upgrade" |
| **Lessons applied** | 4 | -4 if no linkage | Next year plan ignores this year's lessons | "Based on 2025 lesson 'customer segmentation不到位', 2026 plan includes dedicated customer analytics role" |
| **Resources specified** | 4 | -4 if vague | "Need more support" | "+2 sales headcount, ¥800K marketing budget, IT system upgrade ¥200K" |
| **Risk assessment** | 3 | -3 if missing | "No risks anticipated" | "Risk: new market competition. Mitigation: pre-launch validation with 5 pilot customers by Q1" |

#### 5.2 Year-over-Year Continuity

- Must show clear progression from this year to next year
- Must address this year's gaps in next year's plan
- Must not contradict this year's lessons
- Bad: 2025 lesson says "need better segmentation", 2026 plan has no segmentation improvement
- Good: 2025 lesson → 2026 specific action → 2026 target linked to that action

---

### Step 6: Generate Audit Report

**Report Structure:**

```
[AI] XX负责人年度述职审核报告
述职人：XXX  职位：XXX  考核周期：202X年度

总分：XX/100  判定：[通过/待修改]

一、评分总览
| 维度 | 权重 | 得分 | 判定 |
|------|------|------|------|
| 完整性 | 25% | XX | ... |
| SP战略关联度 | 25% | XX | ... |
| 态度与反思 | 25% | XX | ... |
| 下一步计划 | 25% | XX | ... |

二、8大模块 completeness check
□ 年度目标达成回顾 (XX/4)
□ 关键战役复盘 (XX/4)
□ 团队建设与人才培养 (XX/3)
□ 个人能力提升 (XX/3)
□ 客户/市场洞察 (XX/3)
□ 资源使用效率 (XX/2)
□ 问题反思与根因 (XX/3)
□ 下年度规划 (XX/3)

三、详细审核（每维度：得分+打分理由+问题清单）
四、红线检查
五、审核结论（总分+定性+最大硬伤+晋升建议+追问预判）
六、修改清单
```

**Pass/Fail Verdict:**
- ✅ **通过**: ≥80 total, honest self-reflection, clear next-year plan
- ⚠️ **待修改**: <80 total OR insufficient self-reflection OR plan lacks specificity

---

## Issue Classification & Improvement Suggestions

### 🔴 Fatal Issues (P0 - 必须修改)

| # | Problem Diagnosis | Improvement Suggestion |
|---|-------------------|------------------------|
| 1 | **缺少多个必需模块** — 缺少≥3个八大模块 | 补充缺失模块。年度述职必须覆盖：目标回顾、战役复盘、团队建设、能力提升、客户洞察、资源效率、问题反思、下年规划 |
| 2 | **目标达成回顾不完整** — 只展示达标项，隐藏未达标项 | 诚实呈现所有KPI，包括未达标项。按重要性排序，不要掩埋失败 |
| 3 | **零关键战役复盘** — 没有年度重点战役的复盘分析 | 列出3-5个年度关键战役，每个用「目标→执行→结果→经验→教训」结构复盘 |
| 4 | **计划与SP方向冲突** — 下年计划与公司战略方向明显矛盾 | 查阅公司SP和部门BP，确保计划方向一致。如有冲突，说明调整理由 |
| 5 | **零自我反思** — 全篇推卸责任，没有任何自我批判 | 华为要求"自我批判"。至少识别3个自身不足，用数据支撑，说明改进计划 |

### 🟡 Warning Issues (P1 - 建议修改)

| # | Problem Diagnosis | Improvement Suggestion |
|---|-------------------|------------------------|
| 6 | **团队建设只有人数没有质量** — 只写团队规模，不写人才培养和梯队建设 | 补充：关键岗位梯队（接班人/储备/高潜）、骨干流失率、晋升情况、培训成果 |
| 7 | **关键战役复盘只有结果没有过程** — "完成了项目A"，没有执行过程和经验教训 | 补充：项目目标、时间线、负责团队、实际结果、偏差分析、经验沉淀、教训反思 |
| 8 | **问题反思全是外部因素** — "市场不好""竞争激烈"，没有分析自身原因 | 用5Why或鱼骨图分析，确保主观/自身原因≥40%。每条根因有数据或事实支撑 |
| 9 | **下年计划只有目标没有路径** — "明年营收5000万"，没有说明怎么做到 | 补充：关键战役、具体行动、资源需求、里程碑、风险预案 |
| 10 | **SP关联度低** — 述职材料完全没有提及公司战略或部门BP | 查阅SP中的机会点，在述职中明确引用，说明自身工作如何支撑战略方向 |
| 11 | **能力提升只有培训没有行为改变** — "参加了XX培训"，但没有应用成果 | 补充：培训后做了什么改变？取得了什么效果？用数据呈现行为改变 |

### 🟢 Suggestion Issues (P2 - 可选优化)

| # | Problem Diagnosis | Improvement Suggestion |
|---|-------------------|------------------------|
| 12 | **可以增加同比/环比趋势图** | 用图表展示KPI的年度变化趋势，增强说服力 |
| 13 | **建议增加与兄弟团队的对标** | 选取1-2个优秀兄弟团队，对比关键指标，明确差距 |
| 14 | **可以增加客户原声（VoC）** | 引用客户具体反馈，而非笼统的"客户满意" |
| 15 | **建议增加个人领导力360°评估** | 如有条件，补充上级/同级/下属的反馈摘要 |

---

## Quality Writing Standards

### 1. Score Calibration
Each score must explain: "Not full marks because... not zero because... so we take..."

### 2. Use "Zero" for Complete Absence
- Not "lacks team development" → "**Zero** team development evidence (no headcount change, no talent pipeline, no training record)"
- Not "missing self-reflection" → "**Zero** self-criticism (100% external blame, 0% internal attribution)"

### 3. Qualitative Judgments
- Bad: "Leadership has room for improvement"
- Good: "This is not leadership, this is micromanagement — the manager spent 80% time on execution, 20% on team development, exactly the opposite of what an L4 manager should do"

### 4. Conclusion 5 Elements
1. One-sentence total score and verdict
2. One-sentence material characterization (honest? superficial? data-driven?)
3. Biggest硬伤
4. Promotion/development recommendation
5. 2-3 questions the panel will most likely ask

> **Example**: "Total 72分, 态度与反思 15分 (insufficient self-criticism). Verdict: ⚠️ 待修改. Material is data-rich but reflection-poor. The manager presented 12 KPIs with impressive charts but blamed market downturn for all 3 misses. Biggest硬伤: zero internal attribution for a 15% revenue miss — not a single process, capability, or leadership issue identified. 上会 risk: medium. The panel will ask: ①'What exactly did YOU do wrong this year?' ②'How has your leadership style evolved?' ③'If market conditions are the same next year, what's your plan?'"

---

## Reference

- **Frontend dimension cards**: `src/pages/reviewer/main.js` → `sceneDimensionData['annual-leader-review']` (currently empty, uses focus dimensions)
- **Checklist**: `src/pages/reviewer/main.js` → checklists['annual-leader-review']
- **Unified PRD**: `docs/01-Product产品/会议材料智能审核助手-统一产品设计.md` §4.3
- **Huawei DSTE methodology**: 华为干部述职八大内容、PBC体系、BEM战略解码
