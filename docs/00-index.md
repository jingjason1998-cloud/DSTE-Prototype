# DSTE 文档中心

> 本文档中心采用 [Diátaxis 框架](https://diataxis.fr/) 组织：
> - **教程** (Tutorials) — 手把手带做
> - **指南** (How-to) — 解决具体问题
> - **参考** (Reference) — 事实性描述
> - **解释** (Explanation) — 理解背景知识
>
> 外加 **RFC/ADR** 流程管理产品变更和架构决策。
>
> 📌 本索引于 2026-08-21 按磁盘实际文件重新生成；新增/移动文档后请同步更新本页。

---

## 快速导航

| 我想... | 去这里 |
|---------|--------|
| 看功能全景与实现状态 | [功能全景图](00-功能全景图.md) |
| **战略管理平台 PRD** | [PRD（主文档）](01-Product产品/prd.md) |
| 经营分析会设计 | [经营分析会-功能设计文档](01-Product产品/经营分析会-功能设计文档.md) |
| 会议材料审核设计 | [会议材料智能审核助手-统一产品设计](01-Product产品/会议材料智能审核助手-统一产品设计.md) |
| 业务专题设计 | [业务专题管理-完整设计方案](01-Product产品/业务专题管理-完整设计方案.md) |
| 战略专题/洞察设计 | [战略专题管理-完整设计方案](01-Product产品/战略专题管理-完整设计方案.md) · [战略洞察-完整设计方案](01-Product产品/战略洞察-完整设计方案.md) |
| OMP / 重点工作 | [组织绩效管理-产品设计文档](01-Product产品/组织绩效管理-产品设计文档.md) · [重点工作管理-PRD](01-Product产品/重点工作管理-PRD.md) |
| 看路线图与版本管理 | [版本管理与路标管理-PRD](01-Product产品/版本管理与路标管理-PRD.md) |
| 看竞品分析 | [竞品分析报告](01-Product产品/竞品分析报告.md) |
| 开发前写设计 | [RFC 模板](02-RFC功能设计/000-template.md)（流程见 [RFC README](02-RFC功能设计/README.md)） |
| 了解架构决策 | [ADR README](03-ADR架构决策/README.md)（当前架构见 [ADR-004 混合架构](03-ADR架构决策/004-hybrid-architecture.md)） |
| 搭建开发环境 | [环境搭建](04-Guide开发指南/setup.md) |
| 开发一个新页面 | [新页面开发指南](04-Guide开发指南/new-page.md) |
| 给 AI 分配任务 | [AI 协作规范](04-Guide开发指南/ai-collaboration.md) |
| 了解组件怎么用 | [组件参考](05-Reference参考手册/components.md) |
| 写测试 | [测试参考](05-Reference参考手册/testing.md) |
| 设计系统（token/组件/图标/Shell） | [设计系统文档](07-DesignSystem/00-index.md) |
| 看战略执行链路实体关系 | [战略执行链路-实体关系手册](06-Explanation架构解释/战略执行链路-实体关系手册.md) |
| 找已归档的历史文档 | [归档区](.archive/README.md) |

---

## 文档结构

```
docs/
├── 00-index.md                         ← 你在读这个
├── 00-功能全景图.md                      # 功能全景与实现状态（以 src/lib/config.js 为准）
├── .archive/                           # 已归档的历史文档（仅作参考，不代表现状）
├── 01-Product产品/                      # 产品文档
│   ├── prd.md                          # 战略管理平台 PRD（主文档，v1.8）
│   ├── 组织绩效管理-产品设计文档.md
│   ├── 重点工作管理-PRD.md               # 重点工作单一事实源（三份子 PRD 已归档并入）
│   ├── KPI管理-产品设计文档.md
│   ├── 年度经营计划-产品设计文档.md
│   ├── 战略地图-产品设计文档.md
│   ├── 战略专题管理-完整设计方案.md
│   ├── 战略洞察-完整设计方案.md
│   ├── 业务专题管理-完整设计方案.md
│   ├── 需求管理中心-产品设计文档.md
│   ├── 目录管理-配置功能-PRD.md
│   ├── 规则引擎-产品设计文档.md           # 主体为远期愿景，附录最小规则引擎已实现
│   ├── 预警中心-产品设计文档.md           # 远期愿景，未排期
│   ├── 经营分析会-功能设计文档.md
│   ├── 经营分析会-运营中枢-产品设计文档.md   # 目标架构（部分已落地）
│   ├── 会议材料智能审核助手-统一产品设计.md
│   ├── 经营分析会AI辅助能力-开发计划.md
│   ├── 经营分析会审核标准/                # 4 个审核场景 ×（SKILL.md + 审核原则.md）+ 写作技巧
│   ├── 版本管理与路标管理-PRD.md
│   ├── roadmap-优化方案.md
│   ├── AI元素设计方案.md                 # 草稿，待重新评审
│   ├── 竞品分析报告.md
│   ├── 开发计划.yml
│   └── changelog.md                    # 软链 → 根目录 CHANGELOG.md
├── 02-RFC功能设计/                      # RFC 功能设计（唯一 RFC 目录）
│   ├── README.md                       # RFC 流程与清单（001~014）
│   ├── 000-template.md
│   ├── 001-navigation-arch.md          # 导航架构
│   ├── 002-meetings-module.md          # 会议模块（implemented）
│   ├── 003-meetings-optimization-v2-adjusted.md  # ⚠️ 残缺稿，仅存附录 C-E
│   ├── 004-topic-review-refactor.md    # reviewer 审核场景重构（implemented）
│   ├── 005-version-audit-dashboard.md  # 版本审计看板（implemented）
│   ├── 006-daily-health-check.md       # 每日体检（部分实施）
│   ├── 007-requirement-pool-phase1.md  # 需求池（implemented，v0.6.0）
│   ├── 008-ai-strategic-partner-global-design.md # AI 战略伙伴总纲
│   ├── 009-sp-planning-workshop.md     # SP 战略规划研讨会（权威版草案）
│   ├── 009-strategy-workshop.md        # ⛔ 已被 009-sp-planning-workshop 取代
│   ├── 010-workspace-tab-keepalive.md  # 工作区页签状态保持（implemented）
│   ├── 011-strategy-insights-topics.md # 战略洞察/专题（原 001，2026-08 重编号）
│   ├── 012-agenda-material-link-and-review-score.md  # 议程材料链接与评分（implemented）
│   ├── 013-agenda-material-batch-review.md           # 一键/批量送审（implemented）
│   └── 014-knowledge-hub.md            # 知识中心（implemented，v0.7.27/28）
├── 03-ADR架构决策/                      # ADR 架构决策
│   ├── README.md                       # ADR 流程与清单
│   ├── 000-template.md
│   ├── 001-spa-vs-multi-page.md        # SPA Shell（历史决策，架构已演进见 004）
│   ├── 002-vite-playwright.md          # Vite + Playwright 选型
│   ├── 003-micro-frontend.md           # ⛔ superseded by 004
│   └── 004-hybrid-architecture.md      # 混合架构：SPA 壳 + 独立页 + iframe keep-alive
├── 04-Guide开发指南/                    # 开发指南
│   ├── setup.md                        # 环境搭建
│   ├── new-page.md                     # 新页面开发
│   ├── external-page.md                # ⚠️ 外部页嵌入（待重写，先看 ADR-004）
│   └── ai-collaboration.md             # 多 AI 协作
├── 05-Reference参考手册/                # 参考文档
│   ├── components.md                   # 组件速查
│   ├── testing.md                      # 测试参考（pytest / vitest / Playwright）
│   └── conventions.md                  # 命名与提交规范
├── 06-Explanation架构解释/              # 架构说明
│   ├── architecture.md                 # 系统架构（含后端拓扑）
│   ├── tech-stack.md                   # 技术栈
│   ├── 页面框架设计.md                  # 初始设计稿（样式以 07-DesignSystem 为准）
│   ├── multi-ai-architecture.md        # 多 AI 协作架构
│   ├── A级架构升级记录.md               # 2026-05 历史快照
│   └── 战略执行链路-实体关系手册.md       # 执行链路实体字典/关联矩阵
└── 07-DesignSystem/                    # 设计系统（样式规范唯一事实源）
    ├── 00-index.md
    ├── 01-tokens.md                    # 设计变量（数值以 assets/css/tokens.css 为准）
    ├── 02-components.md                # 组件规范
    ├── 03-icons.md                     # Phosphor 图标体系
    ├── 04-shell.md                     # Shell 布局规范
    ├── 05-a11y.md                      # 无障碍
    └── 06-migration.md                 # 旧类名迁移映射（Phase 0~2 已完成）
```

---

## 文档即代码 (Docs as Code)

本文档与项目代码共用 Git 仓库，遵循相同的工作流：

1. **代码变更 → 文档同步更新**：每个 PR 必须包含对应的文档更新
2. **版本控制**：文档历史可查，回滚同步
3. **Code Review**：文档和代码一起 review
4. **Living Documentation**：文档不滞后于代码

> 失效或被取代的文档不删除，移入 `.archive/` 并在文首加归档横幅（注明原因与当前有效文档）。

---

## RFC / ADR 流程

### 什么时候写 RFC？

新增功能、重大交互变更、页面重构——任何**影响用户体验或技术实现**的变更，开发前先写 RFC。

### 什么时候写 ADR？

技术选型、架构变更、引入新依赖、重大重构——任何**影响技术债务或团队决策**的变更，决策时写 ADR。

### 流程

```
[想法] → [写 RFC/ADR 草稿] → [Review & 讨论] → [批准] → [开发] → [合并时关闭 RFC/ADR]
```
