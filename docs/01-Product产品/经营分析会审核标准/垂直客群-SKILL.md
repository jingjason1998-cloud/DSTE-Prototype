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

### Step 2: Completeness Check (30 points)

Verify the material contains all 6 required modules. Deduct 5 points for each missing module:

1. **业绩回顾** - Performance review with target, actual, achievement rate
2. **差距拆解** - Gap decomposition by customer/product/region/time
3. **根因分析** - Root cause analysis with data support, distinguishing subjective vs objective causes
4. **下一步计划/改进措施** - Next-phase work deployment (not just reactive fixes)
5. **资源需求** - Specific resource needs (headcount, budget, training, policy)
6. **时间节点** - Clear milestones and acceptance criteria

### Step 3: Data Authenticity Check (15 points)

- Verify target value matches annual contract/OKR (fatal if mismatched)
- Verify actual value matches CRM/financial system (fatal if mismatched)
- Check calculation logic: achievement rate = actual/target
- Check data presentation format (tables/charts required)

### Step 4: Root Cause Analysis Depth Check (20 points, floor ≥12)

- Require at least one analytical framework: 5Why, Fishbone, Funnel, or Comparative
- Subjective/self-causes must account for ≥40% of root causes
- Each root cause must have data or factual evidence support
- Deduct points for vague external blame ("market is bad")

### Step 5: Next-Phase Plan Check (20 points)

Apply SMART criteria to each plan item:
- **S**pecific: concrete actions, not vague slogans
- **M**easurable: quantifiable indicators
- **A**chievable: realistic targets
- **R**elevant: must address root cause AND include forward-looking deployment
- **T**ime-bound: specific deadlines

Also verify root-cause-to-plan mapping matrix exists.

### Step 6: SP Strategic Alignment Check (10 points)

1. If the **体系客户SP战略规划对照表** is provided with a KMS link:
   - Fetch the SP document automatically
   - Extract key opportunity points and strategic directions via NLP/semantic analysis
   - Compare against the review material
   - Calculate **SP opportunity coverage rate** (mentioned/total)
   - If coverage < 50%: deduct 4 points
   - If coverage = 0%: deduct 7 points
2. Check for conflicts between plan and SP direction (fatal: 0 points)
3. Award bonus (+2) for explicitly citing SP directions and explaining alignment

### Step 7: Attitude & Reflection Check (5 points)

- Scan for blame-shifting language ("market is bad", "company policy issue")
- Reward self-reflection and specific improvement commitments
- Deduct for generic excuses or resource-demanding without self-effort

### Step 8: Generate Audit Report

Produce a structured report containing:

1. **Overall Score** / 100
2. **Dimension Breakdown** (6 dimensions with sub-scores)
3. **Pass/Fail Verdict** (Pass: ≥75 total AND root cause ≥12)
4. **Issue List** classified by severity:
   - 🔴 Fatal (一票否决)
   - 🟡 Warning (must fix)
   - 🟢 Suggestion (optimize)
5. **Improvement Suggestions** for each identified issue (specific, actionable, with examples)

## Improvement Suggestion Rules

When generating suggestions in the audit report:

- Be specific: "Use 5Why to drill down 3 layers" not "Please improve"
- Include a positive example for clarity
- Match severity to tone: Fatal → mandatory directive; Warning → concrete fix direction; Suggestion → optimization idea
- Reference the detailed criteria in `references/audit-criteria.md` when needed

## Reference Files

- **Detailed audit criteria, scoring rubric, issue-suggestion mapping**: See [references/audit-criteria.md](references/audit-criteria.md)
