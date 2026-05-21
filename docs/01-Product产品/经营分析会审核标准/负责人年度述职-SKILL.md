---
name: annual-manager-review
description: Audit and evaluate annual performance review materials for business line managers and team leaders. Use when the user needs to (1) audit a负责人年度述职材料, (2) evaluate manager performance against annual goals and strategic objectives, (3) assess leadership development and team building plans, (4) review alignment between personal OKRs and company strategic planning. Triggered by mentions of年度述职, 负责人述职, manager review, or leadership performance assessment.
---

# Annual Manager Review - Performance Audit

> **Status**: Skeleton created. Detailed audit criteria to be populated in `references/audit-criteria.md`.

## Workflow

Execute this workflow sequentially when auditing a manager's annual performance review material.

### Step 1: Material Intake

1. Accept the KMS link to the manager's annual review material
2. Accept prior year review material for year-over-year comparison (if available)
3. Accept the supplementary form: **体系客户SP战略规划对照表** (if provided)
4. Parse documents for content analysis

### Step 2: Completeness Check (TODO: define weight)

Verify the material contains required modules for annual manager reviews:

1. **年度目标达成回顾** - Annual goal achievement with quantitative results
2. **关键战役复盘** - Review of major strategic initiatives and their outcomes
3. **团队建设成果** - Team development, talent retention, and organizational health metrics
4. **个人能力提升** - Leadership capability growth and learning achievements
5. **下一年度规划** - Forward-looking plan for next year with clear objectives
6. **战略规划承接** - How personal/team goals align with company and department SP

### Step 3: Data Authenticity Check (TODO: define weight)

- Verify annual targets match approved OKRs/performance contracts
- Validate team performance metrics against HR/CRM/Financial systems
- Check year-over-year data consistency

### Step 4: Strategic Initiative Review (TODO: define weight)

- Evaluate completion status of key strategic initiatives
- Assess initiative outcomes against planned targets
- Identify lessons learned and knowledge沉淀

### Step 5: Leadership & Team Development Check (TODO: define weight)

- Evaluate team performance trends (improvement/decline)
- Assess talent development and succession planning
- Review team satisfaction/engagement indicators

### Step 6: Next-Year Plan Quality Check (TODO: define weight)

Apply SMART criteria to annual plans:
- Objectives aligned with company strategic direction
- Balanced between business results and team development
- Resource requirements clearly specified
- Risk assessment included

### Step 7: SP Strategic Alignment Check (TODO: define weight)

1. Fetch SP document from submitted KMS link if available
2. Extract annual strategic priorities and opportunity points
3. Verify manager's plan directly supports SP directions
4. Check for explicit linkage between team goals and strategic initiatives

### Step 8: Generate Audit Report

Produce structured report with:
1. Overall score
2. Dimension breakdown
3. Pass/fail verdict
4. Classified issue list (Fatal/Warning/Suggestion)
5. Improvement suggestions for each issue
6. Year-over-year trend analysis (if prior data available)

## Reference Files

- **Detailed audit criteria to be added**: See [references/audit-criteria.md](references/audit-criteria.md) (TODO)
