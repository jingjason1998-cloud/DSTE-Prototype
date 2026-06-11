---
name: general-topic-review
description: Audit and evaluate general topic/decision-making materials for business meetings (e.g. monthly management review, headquarters regular meeting). Use when the user needs to (1) audit a topic proposal material before a meeting, (2) evaluate whether a material is ready for discussion/decision, (3) assess problem-solution alignment and decision support quality, or (4) review action plan specificity and material formatting. Triggered by mentions of 议题材料, 上会材料, 决策提案, 本部会议, or any business meeting topic material that requires decision-making.
---

# General Topic Material Review - Decision-Making Audit

> **Scene**: `general-topic-review`  
> **Short Name**: 通用议题材料审核（以本部会为例）  
> **Trigger**: 审核经营分析会、月度例会、季度复盘会等会议的上会材料  

## Workflow

Execute this workflow sequentially when auditing a topic/decision material.

---

### Step 1: Material Intake

1. Accept the KMS link to the topic material
2. Identify the meeting type from context (monthly review / quarterly复盘 / special topic)
3. Parse the document for: problem background, proposed solution, decision request, action plan, supporting data

---

### Step 2: Problem-Solution Alignment Check (30 points)

**Core Question**: Why should this be discussed in the meeting? Is the proposal the right remedy?

#### 2.1 Problem Definition Quality

| Check Item | Full Marks | Deduction | Common Issues |
|-----------|-----------|-----------|---------------|
| **Problem Background** | Clear context and trigger | -5 if vague | "Market is bad" without specifics |
| **Problem Scope** | Clearly defined boundaries | -5 if too broad | Covers everything = covers nothing |
| **Impact Quantification** | Specific business impact (revenue, customers, efficiency) | -5 if no numbers | "Significant impact" without data |
| **Root Cause Distinction** | Distinguishes symptoms from root causes | -5 if symptom-only | Reports现象without digging |

#### 2.2 Solution Alignment

| Check Item | Full Marks | Deduction | Common Issues |
|-----------|-----------|-----------|---------------|
| **Solution-to-Problem Fit** | Solution directly addresses root cause | -10 if mismatch | Root cause is "获客不足", solution is "提高客单价" |
| **Decision Request Clarity** | Explicitly states what decision is needed | 🔴 Fatal if zero | "通报情况" instead of "请求决策" |
| **Option Comparison** | Multiple alternatives considered with pros/cons | -5 if single option | Only presents one way forward |

**🔴 Fatal Line**: Zero decision request = total score **capped at 60 points**, material must be rewritten.

---

### Step 3: Decision Support Quality Check (30 points)

**Core Question**: Is the data solid? Are the options comprehensive?

#### 3.1 Data Quality

| Check Item | Full Marks | Deduction | Common Issues |
|-----------|-----------|-----------|---------------|
| **Data Sources** | Credible and verifiable sources | -5 if unverifiable | No source attribution |
| **Data Relevance** | Directly supports the decision | -5 if tangential | Too much unrelated data |
| **Data Accuracy** | Calculations correct, logic sound | 🔴 Fatal if wrong | Wrong math, inconsistent numbers |
| **Comparative Data** | Baseline, benchmark, or historical comparison | -5 if no comparison | No "before/after" or "vs peers" |

#### 3.2 Argument Completeness

| Check Item | Full Marks | Deduction | Common Issues |
|-----------|-----------|-----------|---------------|
| **Options Presented** | ≥2 viable alternatives | -5 if only one | "My way or no way" |
| **Trade-off Analysis** | Clear pros/cons for each option | -5 if none | No comparison matrix |
| **Risk Assessment** | Identifies risks and mitigations | -5 if missing | "No risks" = naive |
| **Resource Estimate** | Rough cost/benefit or resource needs | -5 if absent | No budget or headcount mentioned |

**🔴 Fatal Line**: Zero data support = total score **capped at 60 points**.

---

### Step 4: Action Plan Specificity Check (25 points)

**Core Question**: Who does what? By when? How do we measure?

#### 4.1 SMART Criteria (each action item)

| Criterion | Full Marks | Deduction | Bad Example | Good Example |
|-----------|-----------|-----------|-------------|--------------|
| **S**pecific | Concrete action | -3 if vague | "加强客户沟通" | "每周对TOP20客户进行1次电话回访" |
| **M**easurable | Quantifiable indicator | -3 if not | "提升客户满意度" | "NPS从30提升至45" |
| **A**chievable | Realistic target | -3 if not | "下个月业绩翻3倍" | "下个月业绩恢复至目标的80%" |
| **R**elevant | Addresses the decision | -3 if off-topic | Plan doesn't solve the proposed problem | Plan directly responds to the decision |
| **T**ime-bound | Specific deadline | -3 if not | "尽快完成" | "6月30日前完成客户分层盘点" |

#### 4.2 Responsibility Assignment

| Check Item | Full Marks | Deduction | Common Issues |
|-----------|-----------|-----------|---------------|
| **Owner Named** | Each item has a responsible person | -5 if missing | "团队负责" = nobody负责 |
| **Escalation Path** | Clear escalation if blocked | -3 if missing | No plan B |
| **Dependencies** | Cross-functional needs identified | -3 if missing | "IT部门配合" without confirming |

**🔴 Fatal Line**: Zero responsible person OR zero timeline = total score **capped at 60 points**.

---

### Step 5: Material Formatting Check (15 points)

**Core Question**: Is the structure clear? Is the length appropriate?

#### 5.1 Structure Quality

| Check Item | Full Marks | Deduction | Common Issues |
|-----------|-----------|-----------|---------------|
| **Logical Flow** | Background → Problem → Options → Recommendation → Action | -3 if jumbled | Random order, hard to follow |
| **Section Headers** | Clear hierarchical structure | -3 if no headers | Wall of text |
| **Executive Summary** | 1-page summary at the top | -3 if missing | Forces reader to hunt for the point |
| **Visual Aids** | Tables/charts for complex data | -2 if text-only | 10-page text with 0 tables |

#### 5.2 Conciseness

| Check Item | Full Marks | Deduction | Common Issues |
|-----------|-----------|-----------|---------------|
| **Length Control** | ≤15 slides or ≤8 pages | -3 if too long | 50-page epic nobody reads |
| **Empty Words Ratio** | "空话套话" ≤20% of content | -5 if bloated | Full of "战略高度" "高度重视" without substance |
| **Decision Focus** | Every paragraph serves the decision | -3 if off-topic | 30% content unrelated to the decision |

---

### Step 6: Generate Audit Report

**Report Structure:**

```
[AI] XX 材料审核报告
材料：XXX
场景：通用议题材料审核（以本部会为例）

总分：XX/100  判定：[通过/待修改/退回重写]

一、评分总览（维度表格）
| 维度 | 权重 | 得分 | 判定 |
|------|------|------|------|
| 目标-解决方案对齐度 | 30% | XX | ... |
| 决策支撑度 | 30% | XX | ... |
| 行动具体化 | 25% | XX | ... |
| 材料规范度 | 15% | XX | ... |

二、详细审核（每维度：得分+打分理由+问题清单）
三、红线检查 / 一票否决检查
四、审核结论（总分+定性+最大硬伤+上会风险+追问预判）
五、修改清单（按P0/P1/P2优先级）
```

**Pass/Fail Verdict:**
- ✅ **通过**: ≥80 total, no red lines touched
- ⚠️ **待修改**: <80 total OR red line touched (score capped at 60), material can be fixed
- ❌ **退回重写**: Zero decision request / zero data support / zero responsible person AND zero timeline

---

## Red Lines (触碰即总分封顶60分)

| Red Line | Trigger | Consequence |
|----------|---------|-------------|
| **零决策请求** | Material reports status but asks for no decision | Total capped at 60, must rewrite |
| **零数据支撑** | Claims made without any data/case/evidence | Total capped at 60, must supplement |
| **零责任主体** | Action plan has no named owner | Total capped at 60, must assign |
| **零时间计划** | Action plan has no deadlines | Total capped at 60, must add timeline |

---

## Issue Classification & Improvement Suggestions

### 🔴 Fatal Issues (P0 - 必须修改，不上会)

| # | Problem Diagnosis | Improvement Suggestion |
|---|-------------------|------------------------|
| 1 | **零决策请求** - 材料只是"通报情况"，没有明确的上会目的和决策需求 | 在材料开头明确写出："本次上会请求决策：XXX（如：批准预算500万启动下沉市场试点）" |
| 2 | **零数据支撑** - 关键论点没有任何数据/案例/对比 | 为每个关键论点补充数据支撑。例如：不要写"客户流失严重"，要写"Q2流失客户12家，其中8家因交付延迟超过7天流失" |
| 3 | **方案与问题根因不对症** - 提出的解决方案没有针对问题的真正原因 | 建立「根因-方案对应矩阵」，确保每个根因都有对应的解决方案，且方案直接回应根因 |
| 4 | **零责任主体** - 行动计划中没有明确的责任人 | 为每个行动项指定负责人（姓名+角色），避免"团队负责""相关部门配合" |
| 5 | **零时间计划** - 行动计划中没有明确的deadline | 为每个行动项设定明确的完成时间和验收标准 |

### 🟡 Warning Issues (P1 - 建议修改，修改后上会)

| # | Problem Diagnosis | Improvement Suggestion |
|---|-------------------|------------------------|
| 6 | **只有一个方案，没有备选** - 只提出了一个解决方案，没有对比分析 | 至少提供2个备选方案，用对比矩阵呈现各自的优缺点、成本、风险和预期收益 |
| 7 | **缺少风险评估** - 材料中没有识别潜在风险或应对措施 | 增加「风险评估」章节，列出实施过程中可能遇到的风险及应对方案 |
| 8 | **数据计算错误** - 材料中的数据存在计算错误或逻辑矛盾 | 重新核算所有数据，确保计算逻辑正确、前后一致 |
| 9 | **缺少资源需求估算** - 没有说明实施方案需要多少预算/人力/时间 | 明确列出资源需求：预算金额、人力投入、时间周期 |
| 10 | **材料过长，超过15页/30张PPT** - 内容冗余，重点不突出 | 精简至15页以内，使用「一页纸摘要」在开头概括核心结论和决策需求 |
| 11 | **空话套话占比过高** - "高度重视""战略意义"等空话超过20% | 删除所有空话套话，每段内容必须有具体的数据、案例或行动支撑 |

### 🟢 Suggestion Issues (P2 - 可选优化)

| # | Problem Diagnosis | Improvement Suggestion |
|---|-------------------|------------------------|
| 12 | **可以增加历史对比数据** | 补充去年同期或上季度的对比数据，增强说服力 |
| 13 | **建议增加外部对标** | 引用行业标杆或竞争对手的做法作为参考 |
| 14 | **可以增加可视化图表** | 将关键数据用图表呈现，提升可读性 |
| 15 | **建议在结尾增加「如果不上会/不通过会怎样」的说明** | 增加决策紧迫性说明：如果不批准会有什么后果 |

---

## Quality Writing Standards

### 1. Score Calibration
Each score must explain: "Not full marks because... not zero because... so we take..."

### 2. Use "Zero" for Complete Absence
- Not "lacks data support" → "**Zero** data support (0 quantitative metrics)"
- Not "missing decision request" → "**Zero** decision request (status report disguised as proposal)"

### 3. Qualitative Judgments
Be direct: "This is not a decision proposal, this is a quarterly newsletter."

### 4. Conclusion 5 Elements
1. One-sentence total score and verdict
2. One-sentence material characterization
3. Biggest硬伤
4. 上会 risk assessment (high/medium/low)
5. 2-3 questions the参谋部will most likely ask

> **Example**: "Total 72分, 目标-解决方案对齐度 18分 (触碰红线：零决策请求). Verdict: ⚠️ 待修改. Material has good data and clear problem description, but structurally flawed — it reports status rather than requests a decision. The biggest硬伤: the entire 20-page deck has zero decision request. 上会 risk: high. If this goes to meeting, the chairman will ask: ①'So what decision do you need from us?' ②'What's your recommendation and why?' ③'What if we don't approve?'"

---

## Reference

- **Frontend dimension cards**: `src/pages/reviewer/main.js` → `sceneDimensionData['general-topic-review']`
- **Unified PRD**: `docs/01-Product产品/会议材料智能审核助手-统一产品设计.md` §4.4
- **RFC-004 refactor**: `docs/02-RFC功能设计/004-topic-review-refactor.md`
