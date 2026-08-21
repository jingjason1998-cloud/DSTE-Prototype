> **⛔ 已被取代（superseded，2026-08-21）**：同编号权威版为 009-sp-planning-workshop.md（基于本文重构）。本文保留作历史参考。

# RFC-009: 战略研讨会管理

> 状态：`draft` | 作者：Kimi | 日期：2026-08-20

---

## 摘要

在 DSTE 平台新增「战略研讨会」模块，承载 SP 战略制定全流程：会议安排与输出件验收、战略专题选题与立项、战区规划提交、规划工作评价。模块以「战略规划项目（SP Campaign）」为新实体，复用现有会议模块、战略专题管理、材料审核（reviewer）与 per-record-sync 同步机制，不重建已有能力。

**通用性原则**：KMS 提供的只是一个周期（SP 2025~2027，2025 年制定）的会议安排实例。功能设计不硬编码该安排——周期、阶段、会议场次与名称、输出件种类全部可配置，每年/每周期可新建、可从上一周期复制模板。

## 背景

来源：KMS《SP战略（2025~2027） 制定工作安排（启动会）》（pageId=1295515249）。实际的 SP 制定工作是一个跨 4~5 个月、多角色协同的项目：

**项目目标**（KMS 原文）：

1. 输出补齐 2025~2027 工作规划内容，并展望 2030 年目标
2. 回顾总结历史工作经验（2022~2025），巩固经验、吸收教训
3. 战略分解导出次年 BP 规划暨组织绩效目标
4. 对战略规划工作本身做评价，提升中长期规划能力

**总体框架**：确定战略意图（承接公司规模与 ARR 指标）→ 战区制定战略目标与行动路径、提出资源诉求 → 本部按专题方式研究 → 营销线汇总提炼输出 SP 战略规划。

**会议安排**（KMS 原表，仅为 SP 2025~2027 一个周期的实例）：

| 时间 | 会议 | 主要内容 | 预期主要输出件 | 参加人 |
|------|------|---------|--------------|--------|
| 7月20日 | 启动会暨任务安排会 | 公布计划 | 战略规划启动材料/工作计划表；战略专题研讨清单 | 片联全员 |
| 9月21~23日 | 战略规划中期检查会议 | 专题深入研究中期检查/研讨；战区业务战略中期检查 | 战略专题分析报告（XX 篇）；4 战区业务规划初稿；营销线 SP 输出框架 | 片联 AT + 本部专题人员 |
| 10月23日 | 战略规划研讨会一次会议 | 专题分析汇报 & 战区业务规划汇报 & 战略研讨 | 战区业务规划（十份）；战略分析报告；营销线 SP 战略规划初稿 | 片联全员 |
| 11月中下旬 | 战略规划研讨会二次会议 | 营销线 SP 战略规划评审收敛 | 营销线 SP 战略规划终稿 | 片联 AT + 本部专题人员 |

**其他关键机制**：战略专题备选 15 项课题（KMS 原方案用投票选题，本系统第一版改为评论+手动立项）；战区业务战略制定形式不限（有 PPT 模板）；对「战区业务规划、专题研究成果、规划组织工作」三方面做反馈评价。

**当前系统缺口**：

- 战略专题管理（`sp/strategy-topics`）只管理单专题生命周期，无「选题征集 → 评审 → 立项」前置环节，也不归属某个 SP 周期
- 会议模块（meetings）支持议程/材料/决议/行动项，但无「预期输出件清单及验收」概念，会议之间只有简单的上下游链
- 没有承载「SP 制定项目」整体进度的地方：哪场会该交什么、交了没有、验收过没过，目前靠 KMS 文档和人工跟进；且每年安排不同，缺少可配置的周期化载体

## 目标

1. 一个页面看清 SP 制定全貌：阶段时间线、会议安排、每场会输出件的提交/验收状态
2. **周期化通用**：支持任意 SP 周期（2025~2027、2026~2028……），阶段/会议/输出件结构完全可配置；新周期可从上一周期复制作为起点，历史周期可归档查看
3. 专题选题线上化：候选课题征集、评论、立项后自动进入战略专题管理（投票机制暂缓，立项由 AT 成员手动确认）
4. 输出件闭环：预期输出件 → 提交（KMS 链接）→ AI 材料审核 → 验收，状态可追踪
5. 会议安排与会议模块打通：从会议安排一键建会（带议程模板与输出件清单）
6. 规划工作评价：按 KMS 三方面（战区规划/专题成果/组织工作）收集评分与反馈；评价维度可按周期配置

## 方案设计

### 信息架构

SP 阶段侧边栏新增一项「战略研讨会」（`sp/workshop`），实现为**独立页面** `src/sp-workshop.html`（参照 BP 拆分已验证的模式：功能复杂、需独立 URL，exe 会议域页面均为独立 html）。

页面顶部为**周期切换器**（列出所有 campaign，如「SP 2025~2027」「SP 2026~2028」），旁边有「+ 新建周期」按钮；下设 5 个内部 Tab：

```
┌──────────────────────────────────────────────────────────────┐
│ 周期: [SP 2025~2027 ▾] [+ 新建周期]    状态: 进行中  进度 62% │
├──────────────────────────────────────────────────────────────┤
│ [总览] [会议安排] [专题选题] [输出件] [评价]                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  （Tab 内容区）                                               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**周期管理**（通用性核心）：

- 新建周期：表单填写名称/规划区间（spRange）/展望年份/目标/框架说明；可选「从已有周期复制」——复制其 phases/sessions/deliverables 结构（清空会议关联、提交与验收状态，保留名称与内容描述作为模板），或从空白开始
- 周期状态：`planned`（未启动）→ `in_progress`（进行中）→ `closed`（已归档）；closed 周期只读，仍可切换查看
- 阶段（phases）、会议安排（sessions）、输出件（deliverables）均为数组结构，数量与命名完全由该周期自行定义

各 Tab：

- **总览**：阶段时间线（按该周期 phases 渲染），每阶段里程碑完成度；关键指标卡（专题立项数/输出件验收率/会议完成数）；目标与框架说明（来自 campaign 配置）
- **会议安排**：会议安排表格（时间/会议/主要内容/预期输出件/参加人，列结构参照 KMS 原表），**支持增删改**：
  - 新增：「+ 添加会议」弹出表单（名称/时间/主要内容/参加人/所属阶段），追加到安排表末尾，序号自动排
  - 编辑：行内「编辑」打开同一表单修改；已建会的（`meetingId` 非空）改名称/时间时提示「是否同步到已建会议」
  - 删除：二次确认；已建会的仅解除关联（`meetingId` 置空），**不删除会议模块中的会议**；其下输出件一并提示「保留为项目级输出件」或「随安排删除」
  - 每行可「创建会议」（写入会议模块并回填 `meetingId`）或「打开会议」；输出件列显示 n/m 已验收
- **专题选题**：候选课题卡片列表（课题、内容方向、提议人、评论），支持发表评论、「立项」按钮（由 AT 成员确认后，一键创建战略专题并回填 `topicId`）与「取消」；已立项的显示跳转链接。投票机制本期不做，预留字段位置
- **输出件**：按会议分组的输出件清单，每件含负责人、截止（= 会议日期）、KMS 链接、AI 审核分、验收状态；支持提交链接、调 reviewer 审核、验收/退回
- **评价**：评价维度（类别）按周期配置，默认三类「战区业务规划 / 专题研究成果 / 规划组织工作」；每类下列出评价对象，评分 + 文字反馈，汇总均分

### 数据结构

新实体一个（`sp_campaigns`），其余复用现有模块并以 id 关联：

```javascript
// localStorage: dste_sp_campaigns_v1  |  KV: dste_sp_campaigns_v1  |  /api/sp-campaigns
const campaign = {
  id: 'spc_2025_2027',
  name: 'SP战略（2025~2027）制定',
  spRange: '2025~2027',        // 规划覆盖区间
  visionYear: 2030,            // 展望年份
  status: 'in_progress',       // planned / in_progress / closed（closed 只读归档）
  goals: ['...'],              // 项目目标（KMS 一）
  framework: '...',            // 总框架说明（KMS 二）
  templateFromId: null,        // 新建时若从已有周期复制，记录来源周期 id
  phases: [                    // 阶段时间线，每周期自定义（总览页渲染用）
    { id: 'ph_kickoff', name: '启动', date: '2025-07-20' },
    { id: 'ph_research', name: '专题研究与战区制定', startDate: '2025-08-01', endDate: '2025-09-20' },
    // ...
  ],
  kmsUrl: 'https://kms.fineres.com/pages/viewpage.action?pageId=1295515249', // 源方案文档

  // 会议安排（KMS 四）——每周期场次、名称、时间完全可配置（增删改）
  sessions: [{
    id: 'ses_01',
    seq: 1,
    dateRange: '2025-09-21~2025-09-23',
    name: '战略规划中期检查会议',
    content: '专题深入研究中期检查/研讨；战区业务战略中期检查',
    audience: '片联AT+本部专题人员',
    meetingId: null,           // 建会后回填，关联会议模块
    phaseId: 'ph_midcheck'
  }],

  // 预期输出件（挂在 session 下；也允许 campaign 级，sessionId 为空）
  deliverables: [{
    id: 'dlv_01',
    sessionId: 'ses_01',
    name: '战略专题分析报告',
    expectedCount: null,       // 「XX 篇」待定则为 null，UI 显示「数量待定」
    owner: '',
    kmsUrl: '',                // 提交后填写
    submittedAt: null,
    reviewScore: null,         // reviewer 审核分（复用 dste_review_scores 缓存）
    reviewReportUrl: null,
    acceptStatus: 'pending',   // pending / submitted / reviewed / accepted / rejected
    acceptedBy: null,
    acceptedAt: null,
    note: ''
  }],

  // 专题选题（KMS 五）
  topicCandidates: [{
    id: 'cand_01',
    seq: 1,
    title: '市场空间宏观洞察与战区规模指标参考路径',
    direction: '帆软市场空间洞察及十大战区市场空间洞察；统筹五看信息，推荐增长曲线建议',
    proposer: '',
    comments: [{ user: '', text: '...', createdAt: '' }],
    status: 'pending',         // pending（待立项）/ approved（已立项）/ dropped（已取消）
    topicId: null              // 立项后回填，关联 sp/strategy-topics
  }],

  // 评价（KMS 七）——类别按周期配置，默认三类
  evaluationCategories: [      // 可增删；复制周期时随结构复制
    { id: 'region_plan', name: '战区业务规划' },
    { id: 'topic_research', name: '专题研究成果' },
    { id: 'org_work', name: '规划组织工作' }
  ],
  evaluations: [{
    id: 'eva_01',
    category: 'region_plan',   // 引用 evaluationCategories 的 id
    targetName: '华东战区业务规划', // 或关联 deliverableId / topicId
    targetRefId: null,
    scores: [{ user: '', score: 4, feedback: '', createdAt: '' }]
  }],

  version: 3,                  // per-record-sync / If-Match 需要
  lastModified: 1724000000000,
  createdAt: 1721000000000,
  updatedAt: 1724000000000
};
```

**关联而非复制**：会议明细在会议模块、专题明细在 strategy-topics、审核报告在 reviewer 缓存；campaign 只存 id 引用与轻量状态快照。回填关系：

- `session.meetingId` → meetings（建会时 scenario 用新枚举 `sp_workshop`，议程按该 session 的主要内容预填）
- `topicCandidate.topicId` → strategy-topics（立项时创建，year 取 SP 起始年，status=planning）
- `deliverable.kmsUrl` → reviewer（`/api/review` 审核，分数回写）

### API 接口（api-worker/worker.js）

按现有实体接入三件套扩展（KEYS 加 KV key、itemMatch 正则加 `sp-campaigns`、全量 GET/POST 分支），无新路由风格：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/sp-campaigns | 全量列表 |
| POST | /api/sp-campaigns | 整体覆盖（兼容批量导入） |
| GET/PUT/PATCH/DELETE | /api/sp-campaigns/{id} | 单条，走统一 `handleEntityItem()`（If-Match 409、`applyAuditFields` 自动 version+1） |

前端按 per-record-sync 标准模式接入：`Repository` + `enqueuePerRecordSync('sp-campaigns', …)` + `apiLoadArray` + `mergeEntities`。注意本地 key 与 KV key 保持一致（避免 meetings v6/v1 不一致的坑）。

### 与现有模块的复用点

| 能力 | 复用 |
|------|------|
| 建会/议程/纪要/决议/行动项 | 会议模块；新增 scenario `sp_workshop`（`SCENARIO_CONFIG` 加一项），建会后跳 `meetings.html` 详情 |
| 专题立项后的生命周期 | `sp/strategy-topics` 现有页面，不改动；只写入新 topic |
| 输出件 AI 审核 | reviewer 后端 `/api/review`，场景用默认 `general-topic-review`；分数缓存沿用 `dste_review_scores` |
| 同步 | `src/lib/per-record-sync.js` 全套 |

## 替代方案

1. **不建新实体，纯扩展会议模块**：给 meetings 加 scenario + 一个「研讨会看板」视图。否决：会议模型承载不了专题选题、输出件验收、跨会议项目进度与多周期配置；会污染会议数据模型（meeting 已有 30+ 字段）。
2. **拆成多个独立小实体**（sessions / deliverables / candidates 各自成表）：否决：它们生命周期完全从属于 campaign，且总量小（一个 SP 周期几十个对象），嵌套在一个 campaign 文档里最简单，单条同步粒度足够。
3. **在 cockpit.html 内做 PAGES 内嵌页**：可行但 BP 拆分后方向是把功能页移出 cockpit；本模块交互复杂（选题/验收/建会联动），独立页更合适。

## 影响范围

- 新增：`src/sp-workshop.html`、`src/pages/sp-workshop/main.js`（+ 拆分组件）、`vite.config.js` 入口、`src/lib/config.js` 侧边栏项（SP 分组「战略研讨会」）、`api-worker/worker.js` 实体注册
- 修改：会议模块 `SCENARIO_CONFIG` 加 `sp_workshop`（meetings.html，实施前需排查所有 scenario 消费点：scoring.js / REVIEWER_SCENE_MAP / 规则引擎等）；strategy-topics 创建逻辑暴露可被外部调用（或按 topic 字段全集构造写入）
- 测试：pytest 结构断言、unit（campaign 数据操作/周期复制/验收状态机）、E2E（新建周期、选题立项、输出件提交→审核→验收、会议安排增删改与建会跳转）
- 文档：本 RFC、功能全景图（`docs/00-功能全景图.md`）、侧边栏相关 navigation E2E 用例

## 任务拆分

- [ ] T1 数据层：`sp-campaign-store.js`（Repository + per-record-sync，含周期复制函数）+ Worker 端点 + 单元测试
- [ ] T2 页面骨架：sp-workshop.html 注册、周期切换器 + 新建周期（空白/从已有复制）、5 Tab 空壳、导航接入
- [ ] T3 会议安排 Tab：表格渲染、**增删改（表单弹窗 + 删除二次确认/关联处理）**、建会（scenario=sp_workshop + 议程预填）、跳转会议详情
- [ ] T4 专题选题 Tab：候选 CRUD、评论、立项写入 strategy-topics
- [ ] T5 输出件 Tab：提交 KMS 链接、调 reviewer 审核、验收状态机
- [ ] T6 总览 Tab：按周期 phases 渲染阶段时间线 + 进度统计
- [ ] T7 评价 Tab：评价类别配置 + 录入与汇总
- [ ] T8 初始数据迁移：把 KMS《SP战略（2025~2027）》的 4 场会议安排与 15 项候选课题灌入首个正式 campaign（SP 2025~2027 周期）
- [ ] E2E 测试 + pytest 结构用例（含周期新建/复制、选题立项、输出件验收、会议安排增删改）
- [ ] 文档更新（功能全景图、session 记忆）

## 参考

- KMS 源文档：<https://kms.fineres.com/pages/viewpage.action?pageId=1295515249>
- 战略专题 PRD：`docs/01-Product产品/战略专题管理-完整设计方案.md`
- BP 拆分模式（新独立页接入范本）：`.ai/memory/08-checkpoint.md`
- 新页面指引：`docs/04-Guide开发指南/new-page.md`
