# DSTE 文档中心

> 本文档中心采用 [Diátaxis 框架](https://diataxis.fr/) 组织：
> - **教程** (Tutorials) — 手把手带做
> - **指南** (How-to) — 解决具体问题
> - **参考** (Reference) — 事实性描述
> - **解释** (Explanation) — 理解背景知识
>
> 外加 **RFC/ADR** 流程管理产品变更和架构决策。

---

## 快速导航

| 我想... | 去这里 |
|---------|--------|
| **了解产品完整设计** | [PRD (完整版)](01-Product产品/prd.md) |
| **看经营分析会设计** | [经营分析会-材料智能审核助手-产品设计](01-Product产品/经营分析会-材料智能审核助手-产品设计.md) |
| **看业务专题设计** | [业务专题管理-完整设计方案](01-Product产品/业务专题管理-完整设计方案.md) |
| 看精简路线图 | [Roadmap](01-Product产品/roadmap.md) |
| 看页面框架设计 | [页面框架设计](06-Explanation架构解释/页面框架设计.md) |
| 看技术架构方案 | [技术架构方案](06-Explanation架构解释/技术架构方案.md) |
| 搭建开发环境 | [环境搭建](04-Guide开发指南/setup.md) |
| 开发一个新页面 | [新页面开发指南](04-Guide开发指南/new-page.md) |
| 给 AI 分配任务 | [AI 协作规范](04-Guide开发指南/ai-collaboration.md) |
| 了解组件怎么用 | [组件参考](05-Reference参考手册/components.md) |
| 写测试 | [测试参考](05-Reference参考手册/testing.md) |

---

## 文档结构

```
docs/
├── 00-index.md              ← 你在读这个
├── 01-Product产品/              # 产品文档（详细设计）
│   ├── prd.md               # 产品需求文档（1769行，完整版）
│   ├── 经营分析会-材料智能审核助手-产品设计.md
│   ├── 业务专题管理-完整设计方案.md
│   ├── 开发路线图.md
│   ├── roadmap.md           # 精简路线图
│   └── changelog.md         # 变更日志
├── 02-RFC功能设计/                  # RFC 功能设计
│   ├── README.md            # RFC 流程
│   ├── 000-template.md      # RFC 模板
│   └── 001-*.md             # 具体 RFC
├── 03-ADR架构决策/                  # ADR 架构决策
│   ├── README.md            # ADR 流程
│   ├── 000-template.md      # ADR 模板
│   └── 001-*.md             # 具体 ADR
├── 04-Guide开发指南/                # 开发指南
│   ├── setup.md
│   ├── new-page.md
│   ├── testing.md
│   └── ai-collaboration.md
├── 05-Reference参考手册/            # 参考文档
│   ├── components.md
│   ├── testing.md
│   └── conventions.md
└── 06-Explanation架构解释/          # 架构说明
    ├── tech-stack.md
    ├── architecture.md
    ├── 页面框架设计.md
    └── 技术架构方案.md
```

---

## 文档即代码 (Docs as Code)

本文档与项目代码共用 Git 仓库，遵循相同的工作流：

1. **代码变更 → 文档同步更新**：每个 PR 必须包含对应的文档更新
2. **版本控制**：文档历史可查，回滚同步
3. **Code Review**：文档和代码一起 review
4. **Living Documentation**：文档不滞后于代码

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
