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
| 了解产品是什么 | [PRD](01-product/prd.md) |
| 看路线图和版本计划 | [Roadmap](01-product/roadmap.md) |
| 搭建开发环境 | [环境搭建](04-guide/setup.md) |
| 开发一个新页面 | [新页面开发指南](04-guide/new-page.md) |
| 给 AI 分配任务 | [AI 协作规范](04-guide/ai-collaboration.md) |
| 了解组件怎么用 | [组件参考](05-reference/components.md) |
| 写测试 | [测试参考](05-reference/testing.md) |
| 为什么要选这个技术栈 | [技术栈说明](06-explanation/tech-stack.md) |
| 了解整体架构 | [架构说明](06-explanation/architecture.md) |

---

## 文档结构

```
docs/
├── 00-index.md              ← 你在读这个
├── 01-product/              # 产品文档
│   ├── prd.md               # 产品需求文档
│   ├── roadmap.md           # 开发路线图
│   └── changelog.md         # 变更日志
├── 02-rfc/                  # RFC 设计文档
│   ├── README.md            # RFC 流程
│   ├── 000-template.md      # RFC 模板
│   └── 001-*.md             # 具体 RFC
├── 03-adr/                  # ADR 架构决策记录
│   ├── README.md            # ADR 流程
│   ├── 000-template.md      # ADR 模板
│   └── 001-*.md             # 具体 ADR
├── 04-guide/                # 开发指南 (How-to)
│   ├── setup.md
│   ├── new-page.md
│   ├── testing.md
│   └── ai-collaboration.md
├── 05-reference/            # 参考文档
│   ├── components.md
│   ├── api.md
│   └── conventions.md
└── 06-explanation/          # 解释性文档
    ├── tech-stack.md
    └── architecture.md
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
