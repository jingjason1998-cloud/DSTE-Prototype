---
name: special-topic-review
description: Audit and evaluate deep-dive analysis materials for specific business issues or strategic topics. Use when the user needs to (1) audit a专项议题汇报材料, (2) evaluate problem analysis depth and solution feasibility for targeted business issues, (3) assess resource requirements and implementation plans for special initiatives, (4) review alignment between topic solutions and company strategic planning. Triggered by mentions of专项议题, 专题分析, deep-dive review, or targeted business issue analysis.
---

# Special Topic Review - Deep-Dive Analysis Audit

> **Status**: Skeleton created. Detailed audit criteria to be populated in `references/audit-criteria.md`.

## Workflow

Execute this workflow sequentially when auditing a special topic deep-dive analysis material.

### Step 1: Material Intake

1. Accept the KMS link to the special topic analysis material
2. Accept background context: what triggered this topic, scope, and stakeholders
3. Accept the supplementary form: **体系客户SP战略规划对照表** (if provided)
4. Parse documents for content analysis

### Step 2: Problem Definition Check (TODO: define weight)

Verify the material clearly defines the problem:

1. **问题背景** - Context and trigger for the topic
2. **问题界定** - Clear, specific problem statement (not vague symptoms)
3. **影响范围** - Quantified business impact (revenue, customers, efficiency)
4. **分析边界** - Scope of analysis clearly defined

### Step 3: Root Cause Analysis Depth Check (TODO: define weight)

- Require structured analytical framework (5Why, Fishbone, Funnel, etc.)
- Verify analysis goes beyond surface symptoms to systemic causes
- Check for multi-dimensional analysis (data, process, people, system)
- Validate root causes with evidence and data

### Step 4: Solution Feasibility Check (TODO: define weight)

Evaluate proposed solutions:
- Multiple alternatives considered with pros/cons
- Selected solution justified with clear rationale
- Implementation plan with milestones
- Risk assessment and mitigation strategies
- Expected ROI or business impact quantified

### Step 5: Resource Requirement Check (TODO: define weight)

- Specific resource needs identified (budget, headcount, technology, policy)
- Resource allocation justified by expected outcomes
- Cross-functional coordination requirements specified

### Step 6: SP Strategic Alignment Check (TODO: define weight)

1. Fetch SP document from submitted KMS link if available
2. Check if topic itself aligns with SP priority areas
3. Verify proposed solution supports SP strategic directions
4. Assess whether topic addresses SP-identified opportunities or risks

### Step 7: Data & Logic Quality Check (TODO: define weight)

- Data sources credible and verifiable
- Analysis logic sound and evidence-based
- Assumptions clearly stated and reasonable
- Conclusions follow logically from analysis

### Step 8: Generate Audit Report

Produce structured report with:
1. Overall score
2. Dimension breakdown
3. Pass/fail verdict
4. Classified issue list (Fatal/Warning/Suggestion)
5. Improvement suggestions for each issue
6. Recommendation on whether to proceed with proposed solution

## Reference Files

- **Detailed audit criteria to be added**: See [references/audit-criteria.md](references/audit-criteria.md) (TODO)
