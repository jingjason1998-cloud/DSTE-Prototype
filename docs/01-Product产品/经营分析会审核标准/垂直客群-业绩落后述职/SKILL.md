---
name: vertical-customer-audit
description: Audit and evaluate performance lag review materials for vertical customer segment business lines. Use when the user needs to (1) audit a述职材料 for业绩落后 personnel, (2) generate an audit report with scored dimensions, (3) identify fatal/warning/suggestion issues, (4) produce actionable improvement suggestions, or (5) check alignment between the review material and strategic planning (SP). Triggered by uploads of KMS links to review documents, requests to evaluate述职 materials, or any mention of业绩落后/述职/审核 in the vertical customer context.
---

# Vertical Customer Segment - Performance Lag Review Audit

## Workflow

Execute this workflow sequentially when auditing a performance lag review material.

### Step 1: Material Intake

1. Accept the KMS link to the review material
2. Also accept the supplementary form: **体系客户SP战略规划对照表** (if provided)
3. Parse both documents for content analysis

---

### Step 2: Completeness Check (30 points)

Verify the material contains all **6 required modules**. Deduct 15 points for each missing module (capped at 25 points):

| # | Required Module | Audit Points | Common Issues |
|---|-----------------|-------------|---------------|
| 1 | **业绩回顾** | Target, actual, achievement rate, review period | Only writes "not completed" without specific numbers |
| 2 | **差距拆解** | Decompose total gap by customer/product/region/time dimensions | Vague "market is bad" without structured decomposition |
| 3 | **根因分析** | Data/fact-supported, distinguishing subjective vs objective causes | Only lists external factors (market, competitors), avoiding self issues |
| 4 | **下一步计划/改进措施** | SMART-compliant with milestones; both reactive and forward-looking | Only lists remedial measures, lacks systematic deployment |
| 5 | **资源需求** | Specific needs: headcount, budget, policy, training | Not written or unreasonable (10 people for 1 person's work) |
| 6 | **时间节点** | Clear milestones and acceptance criteria | "As soon as possible", "strive to improve" - vague expressions |

**Supplementary Material: SP Strategic Planning Comparison Table**

The reviewer must additionally submit a **SP Strategic Planning Comparison Table** (in table format) as the basis for auditing "SP Strategic Alignment".

| Field | Description | Required |
|-------|-------------|----------|
| Customer System Name | Full name of the customer system the reviewer belongs to | ✅ |
| SP Strategic Planning KMS Link | KMS link to the currently effective SP strategic planning document | ✅ |
| Reviewer's Responsible Customer Scope | Specific customer list/region/industry segment | ✅ |
| SP Key Opportunities (auto-extracted) | Auto-extracted by system from SP document | 🤖 |
| Correspondence between Next Steps and Key Battles | How reviewer's next steps support the system's key battles | ❌ |

**Audit Rules for SP Table:**
- Not submitted: deduct **10 points** from completeness
- Submitted but SP link empty/invalid: deduct **5 points**
- Link content doesn't match claimed customer system: deduct **10 points**

**Bonus Elements (not required but add depth):**
- Benchmark against excellent colleagues
- Process metrics (visits, conversion rate, average deal size)
- Risk anticipation for improvement process

---

### Step 3: Data Authenticity Check (15 points)

#### 3.1 Data Consistency

| Check Item | Audit Rule | Severity |
|-----------|-----------|----------|
| Target value口径 | Consistent with annual contract/OKR? | 🔴 Fatal |
| Actual value口径 | Consistent with financial/CRM system? | 🔴 Fatal |
| Time口径 | Review period explicit (e.g. "2025 Q1")? | 🟡 Warning |
| Calculation logic | Achievement rate = actual/target, correct? | 🔴 Fatal |
| YoY/MoM comparison | Historical comparison data accurate? | 🟡 Warning |

#### 3.2 Data Presentation Standards

- Must present core data in tables/charts, not text-only
- Consistent units (10K yuan/yuan, customer count/order count)
- Data source attribution (CRM system/financial report/manual statistics)

---

### Step 4: Root Cause Analysis Depth Check (20 points, floor ≥12)

#### 4.1 Analysis Framework Check (must use at least one)

| Tool | Applicable When | Check Points |
|------|-----------------|-------------|
| **5Why Analysis** | Single key problem recurring | 5 consecutive追问layers to root cause |
| **Fishbone/Ishikawa** | Multiple factors intertwined | Covers people, machine, material, method, environment, measurement |
| **Comparative Analysis** | Gap with excellent colleagues | Controlled variables (same region/customer/time period) |
| **Funnel Analysis** | Conversion环节problems | Decomposes acquisition→touch→conversion→repurchase |

#### 4.2 Root Cause Quality Assessment

| Quality Level | Example | Audit Verdict |
|--------------|---------|---------------|
| ✅ High Quality | "My customer segmentation能力不足, causing 80% time spent on low-value customers" | Specific, verifiable, points to self-capability |
| ⚠️ Medium | "Market competition intensified, competitor dropped prices 20% and took 3 major customers" | Data-supported, but mainly external factors |
| ❌ Low Quality | "Market environment is bad" / "Customer budgets reduced" / "Company product competitiveness不足" | Hollow, unverifiable, blame-shifting |

**Audit Rules:**
- Subjective/self-causes must account for **≥40%** of root causes, otherwise deduct 10 points
- Each root cause must have data or factual evidence support; pure subjective感受 deducts 5 points/item
- Zero root cause analysis = **fatal**, this dimension = 0 points

---

### Step 5: Next-Phase Plan Check (20 points)

#### 5.1 SMART Criteria (each plan item must comply)

| Criterion | Check | Bad Example | Good Example |
|-----------|-------|-------------|--------------|
| **S**pecific | Plan clearly defined? | "Strengthen customer communication" | "Weekly phone回访to TOP20 customers, 1 time each" |
| **M**easurable | Quantifiable indicator? | "Improve customer satisfaction" | "NPS from 30 to 45" |
| **A**chievable | Realistic target? | "Next month业绩翻3倍" | "Next month业绩恢复至target的80%" |
| **R**elevant | Responds to root cause AND forward-looking? | Root cause is "acquisition不足", plan is "提高客单价" | Root cause is "acquisition不足", plan is "开拓2 new channels + 50 new leads/week" |
| **T**ime-bound | Clear deadline? | "As soon as possible" | "Complete customer segmentation by June 30" |

#### 5.2 Root Cause-to-Plan Mapping Matrix

Required format (can be table):

```
┌─────────────┬──────────────────────────┬─────────────────┬──────────┐
│ Root Cause  │ Next Step/Improvement    │ Acceptance Std  │ Deadline │
├─────────────┼──────────────────────────┼─────────────────┼──────────┤
│ Cause 1:... │ Plan 1:...(respond+forward)│ Std 1:...    │ June 15  │
│ Cause 2:... │ Plan 2:...(respond+forward)│ Std 2:...    │ June 30  │
└─────────────┴──────────────────────────┴─────────────────┴──────────┘
```

**Audit Rules:**
- Each root cause must have ≥1 corresponding plan, otherwise deduct 5 points/item
- Plans with only "remedial" but no "forward-looking deployment": deduct 3 points/item
- Plans without clear time nodes: deduct 3 points/item
- Plans without clear responsible person: deduct 2 points/item

---

### Step 6: SP Strategic Alignment Check (10 points)

#### 6.1 Alignment Framework

| Check Level | Audit Points | Bad Example | Good Example |
|-------------|-------------|-------------|--------------|
| **Company SP** | Improvement direction consistent with overall strategy? | "Lower customer准入门槛to sign大量orders" (conflicts with quality-first strategy) | "Focus on high-value customers,宁可reduce customer count to improve per-customer output" (consistent with quality-efficiency strategy) |
| **Department SP** | Plan supports department annual key battles? | "I'll just run around more" (unrelated to digital acquisition strategy) | "Actively trial new intelligent marketing tools" (directly supports digital strategy) |
| **Customer Structure** | Customer segmentation aligns with SP positioning? | "Maintain all old customers equally" (conflicts with "focus strategic customers") | "Re-segment customers per SP, 80% effort on A-class strategic customers" |
| **Capability Building** | Personal gaps addressed via training, not just overtime? | "Work overtime to 10pm daily next month" (unsustainable) | "Apply for solution sales training to补capability gap" |
| **SP Opportunities** | Material mentions/responds to SP-listed opportunities? | SP says "下沉market is new growth", but zero mention | "Q3 launch下沉market pilot, covering 3 new cities" |

#### 6.2 Alignment Levels

| Level | Criteria | Score |
|-------|----------|-------|
| **Strong** | Explicitly cites SP key directions, AND SP opportunities mentioned/responded | 8-10 |
| **Medium** | Direction doesn't conflict with SP, mentions SP, but opportunities not fully responded | 4-7 |
| **Weak** | Plan conflicts with SP, or completely ignores SP | 0-3 |

#### 6.3 Audit Rules (with backend auto-comparison)

**Auto-comparison Logic:**
1. System grabs SP document from submitted KMS link
2. NLP extracts key opportunities, growth directions, strategic priorities
3. Semantic comparison with review material
4. Generates "SP opportunity coverage rate" (mentioned/total)

**Rules:**
- Coverage < 50%: deduct **4 points**
- Coverage = 0%: deduct **7 points**
- Plan conflicts with SP direction (e.g. SP says focus高端, plan is低价抢量): **0 points**
- Actively cites SP原文or key battles with explanation: **+2 points**

---

### Step 7: Attitude & Reflection Check (5 points)

| Positive Signals (+) | Negative Signals (-) |
|---------------------|---------------------|
| "After复盘I found..." | "Mainly market/company/policy problems..." |
| "I indeed didn't do well in XX环节..." | "I've already tried my best..." |
| "I plan to improve from XX aspects..." | "If the company could give me XX resources..." |
| "I compared with excellent colleagues, gap is..." | "Colleagues had better luck/customer quality..." |

**Audit Rules:**
- ≥3 blame-shifting expressions: this dimension = **0 points**
- Specific self-reflection case (not empty表态): **+3 points**
| Benchmark against excellent colleagues with specific analysis: **+3 points**

---

### Step 8: Generate Audit Report

**Report Structure:**

```
[AI] XX 材料审核报告
述职人：XXX  业务线：垂直客群客户  考核周期：XXX

总分：XX/100  判定：[通过/待修改/不通过]
根因分析深度单项：XX/20 （底线：≥12分）

一、评分总览
| 维度 | 权重 | 得分 | 判定 |
|------|------|------|------|
| ... | ... | ... | ... |

二、详细审核（每维度：得分+打分理由+问题清单）
三、红线检查 / 一票否决检查
四、审核结论（总分+定性+最大硬伤+上会风险+追问预判）
五、修改清单（按P0/P1/P2优先级）
```

**Pass/Fail Verdict:**
- ✅ **通过**: ≥75 total AND root cause depth ≥12
- ⚠️ **待修改**: <75 total OR root cause depth <12, but not fatal
- ❌ **不通过**: Any fatal issue (data造假, zero root cause, zero plan)

---

## Issue Classification & Improvement Suggestions

### 🔴 Fatal Issues (一票否决)

| # | Problem Diagnosis | Improvement Suggestion |
|---|-------------------|------------------------|
| 1 | **业绩数据造假或与系统不符** | Verify data sources,对照CRM/financial reports修正target和actual values. Resubmit after correction. |
| 2 | **未做根因分析，或根因全是外部因素** | Use 5Why Analysis,追问at least 3 layers. Ensure subjective/self-causes ≥40%. Avoid "market is bad". |
| 3 | **下一步计划与根因完全不对应** | Build "Root Cause-to-Plan Mapping Matrix". Each cause → at least 1 plan. Plan must respond to cause. |
| 4 | **缺少下一步计划/改进措施或资源需求** | Add complete "Next Steps" and "Resource Needs". SMART criteria. Specific resources (people/budget/training). |

### 🟡 Warning Issues (Must Fix)

| # | Problem Diagnosis | Improvement Suggestion |
|---|-------------------|------------------------|
| 5 | **目标值/实际值口径不一致** | Verify against annual contract/OKR. Note any口径adjustments with reasons. |
| 6 | **根因分析缺少数据支撑** | Add specific data/facts per root cause. E.g.: not "customer流失严重", but "Q2 lost 12 customers, 8 due to delivery delays >7 days". |
| 7 | **下一步计划缺少时间节点** | Set clear deadlines and acceptance criteria. E.g.: "Complete by June 30" not "ASAP". |
| 8 | **数据呈现只有文字没有表格/图表** | Present core data in tables/charts. |
| 9 | **计划未考虑SP对齐，局部优化风险** | Review SP战略规划. Ensure plan direction aligns. |

### 🟢 Suggestion Issues (Optimize)

| # | Problem Diagnosis | Improvement Suggestion |
|---|-------------------|------------------------|
| 10 | **可以增加过程指标佐证** | Add process metrics (monthly visits, conversion rate, avg deal size). |
| 11 | **建议增加与优秀同事的对标分析** | Benchmark 1-2 excellent colleagues on customer structure, methods, resource usage. |
| 12 | **资源需求可以更具体** | Specific: not "need more support", but "apply for Q3 solution sales training (budget ¥5,000)". |
| 13 | **风险预判模块可以补充** | Add "Risk Anticipation" section with potential risks and countermeasures. |
| 14 | **计划不应只写补救措施** | Add forward-looking deployment: new channels, customer structure adjustment, new tools. |
| 15 | **建议主动引用SP** | Cite SP key directions or department key battles, explain how your work supports them. |

---

## Quality Writing Standards

### 1. Score Calibration
Each score must explain: "Not full marks because... not zero because... so we take..."

### 2. Use "Zero" for Complete Absence
- Not "lacks subjective attribution" → "**Zero** subjective attribution (0 subjective keywords)"
- Not "missing analysis tools" → "**Zero** analysis tools (no 5Why/fishbone/funnel)"

### 3. Qualitative Judgments
Be direct: "This is not root cause analysis, this is making excuses."

### 4. Conclusion 5 Elements
1. One-sentence total score and verdict
2. One-sentence material characterization
3. Biggest硬伤
4. 上会 risk assessment (high/medium/low)
5. 2-3 questions the参谋部will most likely ask

> **Example**: "Total 67分, root cause analysis 10分 (below 12分floor). Verdict: ❌ 待修改. Material has data and opportunities, not敷衍-type. But structural gaps (missing gap decomposition, resource needs, milestones, hard gap solution). Root cause is biggest硬伤: zero tools, zero subjective attribution, hit floor. 上会 risk: high. If this goes to meeting,参谋部will追问: ①'Break down the 4661万gap by dimension?' ②'What did YOU do wrong?' ③'Where does the 1199万hard gap come from?'"
