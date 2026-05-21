---
name: lagging-warzone-audit
description: Audit and evaluate performance lag review materials for warzone/region-level business units. Use when the user needs to (1) audit a述职材料 for业绩落后 at the warzone level, (2) evaluate regional business performance and improvement plans, (3) check alignment between warzone operations and company strategic planning. Triggered by mentions of战区述职, 落后战区, 区域业绩审核, or warzone-level performance reviews.
---

# Lagging Warzone - Performance Review Audit

> **Status**: Skeleton created. Detailed audit criteria to be populated in `references/audit-criteria.md`.

## Workflow

Execute this workflow sequentially when auditing a warzone-level performance lag review material.

### Step 1: Material Intake

1. Accept the KMS link to the warzone review material
2. Accept the supplementary form: **体系客户SP战略规划对照表** (if provided)
3. Parse the document for content analysis

### Step 2: Completeness Check (TODO: define weight)

Verify the material contains required modules for warzone-level reviews:

1. **战区业绩回顾** - Warzone performance summary with targets vs actuals
2. **差距拆解** - Gap analysis by sub-region/customer segment/product line
3. **战区根因分析** - Root cause analysis covering team, process, market, and resource factors
4. **下一步计划/改进措施** - Next-phase deployment plan for the entire warzone
5. **资源协调需求** - Cross-functional resource needs (support from HQ, other regions, etc.)
6. **团队建设措施** - Team capability improvement and talent development plans

### Step 3: Data Authenticity Check (TODO: define weight)

- Verify warzone-level consolidated data matches source systems
- Check sub-region data rollup accuracy
- Validate KPI definitions consistent across regions

### Step 4: Root Cause Analysis Depth Check (TODO: define weight)

- Require structured analysis distinguishing warzone-level vs individual-level factors
- Check for systemic vs isolated issue identification
- Verify quantitative evidence supports each root cause

### Step 5: Next-Phase Plan Check (TODO: define weight)

Apply SMART criteria to warzone-level improvement plans:
- Specific actions with clear ownership
- Measurable targets at warzone and sub-region levels
- Achievable given resource constraints
- Relevant to root causes with forward-looking deployment
- Time-bound milestones with accountability

### Step 6: SP Strategic Alignment Check (TODO: define weight)

1. Fetch SP document from submitted KMS link if available
2. Extract strategic directions relevant to warzone operations
3. Compare warzone plan against SP requirements
4. Check for opportunity point coverage

### Step 7: Generate Audit Report

Produce structured report with:
1. Overall score
2. Dimension breakdown
3. Pass/fail verdict
4. Classified issue list (Fatal/Warning/Suggestion)
5. Improvement suggestions for each issue

## Reference Files

- **Detailed audit criteria to be added**: See [references/audit-criteria.md](references/audit-criteria.md) (TODO)
