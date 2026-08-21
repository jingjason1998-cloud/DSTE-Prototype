# RFC 流程 — Request for Comments

> 每个新功能、重大交互变更、页面重构，开发前先写 RFC。

---

## 什么时候需要 RFC？

| 场景 | 需要 RFC？ | 说明 |
|------|-----------|------|
| 新增一个完整页面 | ✅ 必须 | 如：战略地图可视化 |
| 现有页面重大重构 | ✅ 必须 | 如：经营分析会从占位到完整功能 |
| 新增交互组件 | ⚠️ 建议 | 如：甘特图、拖拽上传 |
| 修改导航结构 | ✅ 必须 | 影响所有页面 |
| Bug 修复 | ❌ 不需要 | 直接提 PR |
| 样式微调 | ❌ 不需要 | 直接提 PR |
| 新增 E2E 测试 | ❌ 不需要 | 直接提 PR |

---

## RFC 流程

```
[想法] → [写 RFC 草稿] → [自己 Review] → [发给团队/AI 讨论]
   ↑                                              ↓
[根据反馈修改] ← ← ← ← ← ← ← ← ← ← ← ← ← [收集反馈]
   ↓
[批准] → [创建开发任务] → [开发] → [PR 中引用 RFC] → [合并时关闭 RFC]
```

---

## RFC 状态

| 状态 | 含义 |
|------|------|
| `draft` | 草稿，正在完善 |
| `discussion` | 开放讨论中 |
| `approved` | 已批准，可以开始开发 |
| `implemented` | 已实现，对应代码已合并 |
| `rejected` | 被拒绝，记录原因 |
| `superseded` | 被新的 RFC 替代 |

---

## 已有 RFC

| 编号 | 标题 | 状态 | 对应版本 |
|------|------|------|----------|
| 001 | 导航架构 V2 | `implemented` | v0.1.0 |
| 002 | 经营分析会模块深化 | `implemented` | v0.4.0 |
| 003 | 经营分析会模块优化方案 v2.0（调整版） | `implemented`（⚠️ 文件残缺，仅存附录 C-E） | v0.4.0 |
| 004 | 通用议题材料审核场景重构 | `implemented` | — |
| 005 | 版本审计看板 | `implemented`（后端实际落在 api-worker） | — |
| 006 | 平台每日体检与持续改进 | 部分实施（仅脚本落地，日推大概率已停跑） | — |
| 007 | 需求管理中心 Phase 1 MVP | `implemented` | v0.6.0 |
| 008 | AI 战略合作伙伴全局设计 | 进行中（Phase 0/1 部分落地，Phase 2 未启动） | — |
| 009 | 战略研讨会（SP 战略规划制定） | `draft` | — |
| 009 | 战略研讨会管理（Kimi 初稿） | `superseded`（被 009-sp-planning-workshop 取代） | — |
| 010 | 工作区页签切换状态保持（keep-alive） | `implemented` | — |
| 011 | 战略洞察与专题（混合架构） | 已批准（已升级为正式 PRD） | — |
| 012 | 议程材料链接与审核评分展示 | `implemented` | — |
| 013 | 会议议程材料一键送审与批量送审 | `implemented` | — |
| 014 | 知识库网页版（knowledge.html） | `implemented` | v0.7.27 / v0.7.28 |

> **编号沿革（2026-08-21 治理）**：原 `001-strategy-insights-topics` 重编号为 011；原 `docs/02-RFC/004-agenda-material-link-and-review-score` 重编号为 012（消除与 004-topic-review-refactor 撞号）；docs 根目录 `rfc-agenda-material-review.md` 归入本目录并编号 013；原无编号的 `knowledge-hub.md` 补编号 014。009 存在两份同主题草案，`009-strategy-workshop.md` 已被 `009-sp-planning-workshop.md` 取代。
