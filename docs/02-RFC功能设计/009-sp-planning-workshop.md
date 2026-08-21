# RFC-009：战略研讨会（SP 战略规划制定）功能方案

> 状态：`draft` | 作者：Claude（基于 Kimi 初稿重构） | 日期：2026-08-21
> 设计思路：以 BLM / DSTE / Hoshin Kanri 标准方法论为骨架，以 Cascade / WorkBoard / Aha! / Miro 为对标，将「战略研讨会」从一次会议升级为跨 3~5 个月的 SP 共创项目。

---

## 1. 摘要

在 DSTE 平台新增「战略规划制定」模块，承载 SP（如 2025~2027）战略制定全流程。

**核心主张**：战略研讨会不是「一次会议」，而是**把目标确定下来的完整过程**。它需要支持：
- 发散共创（差距分析、市场洞察、业务设计）
- 收敛排序（专题选题评分、优先级决策）
- 决策定型（AT 决议、行动项）
- 输出固化（KMS 报告、AI 审核、验收）
- 解码衔接（关键任务导入 BP/OMP）
- 复盘评价（规划工作本身评估）

模块以「战略规划项目（SP Campaign）」为新实体，复用现有会议模块、战略专题管理、材料审核（reviewer）、BP/OMP 与 per-record-sync 同步机制，不重建已有能力。

---

## 2. 理论基础

### 2.1 帆软三大会议定位

| 会议类型 | 核心目的 | 频次 | 关键产出 | 与本模块关系 |
|---|---|---|---|---|
| **战略研讨会** | 确定目标 | 三年 / 年度 / 不定期专题 | 战略机会共识、SP 规划初稿/终稿 | **本模块承载全部内容** |
| **战略解码会** | 规划路线 | 年度为主 | 关键成功要素、战略地图、年度重点工作 | 本模块输出作为其输入 |
| **经营分析会** | 行动纠偏 | 月度 / 双周 / 单周 | 关键任务进展、风险决策 | 执行本模块确定的策略 |

### 2.2 方法论组合

| 方法论 | 核心贡献 | 在系统内的体现 |
|---|---|---|
| **BLM 业务领先模型** | 统一的战略思维语言：差距分析 → 市场洞察 → 战略意图 → 创新焦点 → 业务设计 → 关键任务 → 执行设计 | 工作坊画布结构 |
| **DSTE 四步闭环** | SP → BP → 执行监控 → 战略评估 | 模块边界、与 BP/OMP 和经营分析会的衔接 |
| **Hoshin Kanri** | 聚焦 3~5 个突破性目标、Catchball 上下协商、PDCA | 战略意图管理、阶段时间线、评价复盘 |
| **标准研讨会流程** | 准备 → 发散 → 收敛 → 决策 → 固化 → 衔接 → 复盘 | Tab 组织与状态流转 |

### 2.3 七阶段研讨会流程

| 阶段 | 目标 | 系统能力 |
|---|---|---|
| **P1 准备** | 明确目标、收集输入、确定参与者 | 模板选择、输入材料挂载、角色分配 |
| **P2 发散共创** | 打开思路、充分讨论 | 多画布、评论、便签 |
| **P3 收敛排序** | 聚焦关键议题 | 评分卡、投票、优先级矩阵 |
| **P4 决策定型** | 管理层拍板 | 决议中心、行动项 |
| **P5 输出固化** | 形成可交付文档 | 输出件清单、AI 审核、验收 |
| **P6 解码衔接** | 把 SP 转成 BP/OMP | 关键任务导入、KPI 关联 |
| **P7 复盘评价** | 评估规划工作本身 | 三方评价、均分汇总 |

---

## 3. 对标借鉴

| 产品 | 最值得借鉴 |
|---|---|
| **Cascade** | Alignment Map、多框架兼容、Strategy Cadences、Tapestry AI |
| **WorkBoard** | Strategy Canvas / OKR Canvas、Smart Agendas、决议→执行流 |
| **Aha!** | Strategy Roadmap、Goals/Initiatives、Whiteboards、评分卡 |
| **Miro** | 无限画布、模板库、投票/计时器、AI 聚类 |

**关键启示**：所有主流平台都把「规划」和「执行」连接起来，而不是停在文档。DSTE 必须确保研讨会产出的关键任务能进入 BP/OMP。

---

## 4. 设计原则

1. **项目视角**：一个 SP Campaign 是一个项目，包含多场会、多个画布、多个输出件。
2. **共创 → 收敛 → 决策 → 固化**：系统必须支持完整研讨闭环。
3. **输出件可验收**：每件输出件有负责人、截止日、提交链接、AI 审核分、验收状态。
4. **与执行系统无缝衔接**：决议和行动项可一键生成到 BP/OMP 和经营分析会。
5. **AI 是 facilitator**：AI 负责预读、初稿、风险提示、观点聚类，最终决策权留给管理层。
6. **可配置框架**：支持 BLM（默认）、Hoshin Kanri、自定义三种研讨会模板。

---

## 5. 信息架构

### 5.1 导航

SP 阶段侧边栏新增 **战略规划制定**（`sp/planning`）。功能复杂、需独立 URL，建议实现为独立页面 `src/sp-planning.html`，复用 BP 拆分已验证模式。

### 5.2 页面骨架

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SP 周期: [SP 2025~2027 ▾]   状态: 进行中   健康度: 🟡 72%   [新建周期]   │
├─────────────────────────────────────────────────────────────────────────┤
│ [总览] [阶段时间线] [工作坊画布] [专题选题] [会议安排] [输出件] [决议与行动] [评价] │
├─────────────────────────────────────────────────────────────────────────┤
│                        （Tab 内容区）                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Tab 设计

| Tab | 方法论对应 | 核心功能 | 对标参考 |
|---|---|---|---|
| **总览** | DSTE 第一步 + Hoshin True North | Campaign 仪表板、战略意图卡、关键指标、健康度、**战略对齐图** | Cascade Dashboard + Alignment Map |
| **阶段时间线** | BLM 全流程 | 甘特式阶段时间线，显示会议/画布/输出件进度 | Aha! Strategy Roadmap |
| **工作坊画布** | BLM 8 要素共创 | 差距分析、市场洞察、战略意图、创新焦点、业务设计、关键任务画布 | Miro + WorkBoard Canvas |
| **专题选题** | 发散 → 收敛 | 候选征集、评论、评分/投票、立项后进入 strategy-topics | Aha! Ideas + Miro Voting |
| **会议安排** | 研讨会落地 | 会议 CRUD、一键建会（scenario=sp_workshop）、议程模板 | WorkBoard Smart Agendas |
| **输出件** | P5 输出固化 | 提交 KMS → AI 审核 → 验收/退回 | Cascade Reports |
| **决议与行动** | P4 决策 + P6 解码衔接 | 决议状态机、行动项、一键导入 BP/OMP | WorkBoard Workstreams |
| **评价** | P7 复盘 | 战区规划 / 专题成果 / 组织工作 三类评分 + 汇总 | — |

---

## 6. 数据模型

### 6.1 新实体：`sp_campaigns`

```javascript
// localStorage: dste_sp_campaigns_v1  |  KV: dste_sp_campaigns_v1  |  /api/sp-campaigns
const campaign = {
  id: 'spc_2025_2027',
  name: 'SP战略（2025~2027）制定',
  spRange: '2025~2027',
  visionYear: 2030,
  status: 'in_progress',          // planned / in_progress / closed
  methodology: 'blm',             // blm / hoshin / custom

  // 战略意图（BLM Strategic Intent / Hoshin True North）
  strategicIntent: {
    vision: '...',
    goals: [{ id: 'g1', text: '...', target: '...', year: 2027 }],
    breakthroughs: [{ id: 'b1', text: '...', owner: '', kpi: '' }]
  },

  // 差距分析（BLM Gap Analysis）
  gaps: {
    performance: [{ text: '...', metric: '...' }],
    opportunity: [{ text: '...', market: '...' }]
  },

  framework: '...',
  kmsUrl: 'https://kms.fineres.com/pages/viewpage.action?pageId=1295515249',

  // 阶段时间线（P1~P7）
  phases: [{
    id: 'ph_gap',
    name: '差距分析',
    methodologyStage: 'gap_analysis',
    startDate: '2025-07-20',
    endDate: '2025-08-10',
    order: 1
  }],

  // 工作坊画布
  canvases: [{
    id: 'cv_gap',
    phaseId: 'ph_gap',
    type: 'gap_analysis',
    title: '差距分析画布',
    content: { /* 见 6.2 */ },
    completion: 0.6,
    version: 1,
    updatedAt: 1724000000000
  }],

  // 会议安排
  sessions: [{
    id: 'ses_01',
    seq: 1,
    phaseId: 'ph_gap',
    dateRange: '2025-07-20',
    name: '战略规划启动会暨任务安排会',
    content: '公布计划',
    audience: '片联全员',
    meetingId: null,
    expectedDeliverables: ['dlv_01', 'dlv_02']
  }],

  // 预期输出件
  deliverables: [{
    id: 'dlv_01',
    sessionId: 'ses_01',
    phaseId: 'ph_gap',
    name: '战略规划启动材料/工作计划表',
    type: 'document',
    owner: '',
    kmsUrl: '',
    submittedAt: null,
    reviewScore: null,
    reviewReportUrl: null,
    acceptStatus: 'pending',      // pending / submitted / reviewed / accepted / rejected
    acceptedBy: null,
    acceptedAt: null,
    note: ''
  }],

  // 专题选题
  topicCandidates: [{
    id: 'cand_01',
    seq: 1,
    title: '市场空间宏观洞察与战区规模指标参考路径',
    direction: '...',
    proposer: '',
    comments: [{ user: '', text: '...', createdAt: '' }],
    votes: [{ user: '', score: 5, dimension: 'importance' }],
    status: 'pending',            // pending / approved / dropped
    topicId: null
  }],

  // 决议与行动项
  resolutions: [{
    id: 'res_01',
    sessionId: 'ses_02',
    title: '...',
    status: 'pending',            // pending / approved / closed
    owner: '',
    kmsUrl: '',
    linkedBpTaskId: null
  }],
  actions: [{
    id: 'act_01',
    resolutionId: 'res_01',
    title: '...',
    owner: '',
    deadline: '2025-10-01',
    status: 'pending',
    linkedOmpTaskId: null
  }],

  // 评价
  evaluations: [{
    id: 'eva_01',
    category: 'region_plan',      // region_plan / topic_research / org_work
    targetName: '华东战区业务规划',
    targetRefId: null,
    scores: [{ user: '', score: 4, feedback: '', createdAt: '' }]
  }],

  version: 3,
  lastModified: 1724000000000,
  createdAt: 1721000000000,
  updatedAt: 1724000000000
};
```

### 6.2 画布内容结构化示例

```javascript
// 差距分析画布
{
  type: 'gap_analysis',
  fields: {
    performanceGaps: [{ text: '...', metric: '...' }],
    opportunityGaps: [{ text: '...', market: '...' }]
  }
}

// 业务设计画布
{
  type: 'business_design',
  fields: {
    customerSelection: '',
    valueProposition: '',
    profitModel: '',
    activityScope: '',
    strategicControl: '',
    riskManagement: ''
  },
  notes: [{ author: '', text: '', createdAt: '' }],
  attachments: [{ name: '', kmsUrl: '' }]
}
```

---

## 7. 关键场景

### 7.1 创建 SP Campaign 向导

1. 选择模板：BLM（默认）、Hoshin Kanri、自定义
2. 输入 SP 周期、展望年份、战略意图
3. 系统预生成阶段时间线、画布模板、会议安排模板、输出件清单
4. 可选：导入 KMS 源文档，自动识别会议安排与候选课题

### 7.2 阶段时间线视图

- 横向甘特时间线，显示各阶段起止、重叠关系
- 每个阶段卡片显示：会议数、输出件验收率、画布完成度
- 点击阶段进入「画布 + 会议 + 输出件」组合视图

### 7.3 工作坊画布编辑

- 左侧：BLM 8 要素导航；右侧：结构化表单 + 评论区
- 支持挂载 KMS 链接、AI 辅助生成要点
- 画布完成度驱动阶段健康度

### 7.4 专题选题流程

1. **征集**：AT 成员提交候选课题
2. **评论**：成员补充与讨论
3. **评分**：按「战略重要性、紧迫性、可行性」三维度 1~5 分评分
4. **立项**：AT 负责人确认后，自动在 `strategy-topics` 创建专题
5. **冻结**：超期未立项的候选标记为 `dropped`

### 7.5 一键建会

- 选择会议安排行 → 创建会议（scenario=`sp_workshop`）
- 自动生成议程 items（每个预期输出件一个议程）
- 自动带入画布摘要与参加人
- 已建会的行可跳转 `meetings.html?id=xxx`

### 7.6 输出件验收

```
预期输出件 → 提交 KMS 链接 → AI 材料审核 → 审核分回写
     ↓
AT 验收 / 退回 → 通过则阶段进度更新 → 未通过则重新提交
```

### 7.7 决议与行动 → BP/OMP 衔接

- 决议转为会议模块 `decisions[]`
- 行动项可一键导入 BP/OMP，回填 `linkedOmpTaskId`
- 经营分析会可通过 `sourceCampaignId` 追溯来源

### 7.8 规划工作评价

- 三类对象：战区业务规划、专题研究成果、规划组织工作
- 每项 1~5 分 + 文字反馈
- 自动汇总均分，作为下一个 SP 周期的输入

### 7.9 战略对齐图

战略对齐图放在「总览」Tab，用来可视化「战略意图 → 专题 → 战区规划 → 年度重点工作」的支撑关系，帮助管理层快速发现目标悬空、重复建设和方向冲突。

**数据映射：**

| 对齐图层级 | DSTE 数据来源 |
|---|---|
| 顶层战略意图 | `campaign.strategicIntent.goals` / `breakthroughs` |
| 第二层 | `strategy-topics`（已立项专题） |
| 第三层 | 战区业务规划输出件（`deliverables` 中 `type=region_plan`） |
| 第四层 | BP/OMP 年度重点工作（`dste_omp_*_v1`） |

**第一版实现：** 嵌套树形表格 + 缩进箭头 + 对齐状态标识（✓ 已对齐 / ⚠ 部分对齐 / ✗ 未对齐）。

**第二版实现：** 图形化网络图，节点卡片 + 支撑箭头 + 对齐分数。

---

## 8. 与现有系统集成

| 能力 | 复用/扩展方式 |
|---|---|
| 页面 | 新增 `sp/planning` 到 `config.js`；独立页 `src/sp-planning.html` 复用 BP 拆分模式 |
| 战略专题 | 立项后写入 `dste_strategy_topics_v2`，复用 `Repository` + `siPersistTopics` |
| 会议模块 | 新增 scenario `sp_workshop`，复用 `data-store.js` 建会逻辑 |
| AI 审核 | 复用 `src/meetings/utils/reviewer.js` 与 reviewer 后端 `/api/review` |
| 决议/行动 | 复用会议模块 `decisions[]` / `actions[]`；导入 OMP 复用 `src/lib/omp-store.js` |
| 同步 | 新实体 `sp-campaigns` 走 `per-record-sync.js` 标准模式 |
| AI 助手 | 复用 `TopicAiChat.js` 或 `GlobalAiDrawer`，增加 campaign-level 上下文 |

### 8.1 API 接口

在 `api-worker/worker.js` 按现有实体三件套扩展：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/sp-campaigns` | 全量列表 |
| POST | `/api/sp-campaigns` | 整体覆盖 |
| GET/PUT/PATCH/DELETE | `/api/sp-campaigns/{id}` | 单条，走 `handleEntityItem()` |

前端：
- `new Repository('spCampaigns', { storageKey: 'dste_sp_campaigns_v1', schema: 'array', version: 1 })`
- `enqueuePerRecordSync('sp-campaigns', diff, executor, queue)`
- `apiLoadArray('/api/sp-campaigns')` + `createSwrSync`

---

## 9. 实施路线图

### MVP（支撑下一次 SP 启动会）

| 优先级 | 任务 | 交付物 |
|---|---|---|
| P0 | 数据层 | `sp-campaign-store.js` + Worker 端点 + 单元测试 |
| P0 | 页面骨架 | `sp-planning.html` 注册、Tab 路由、导航接入 |
| P0 | 总览 + 阶段时间线 | Campaign 仪表板、BLM 阶段时间线 |
| P0 | 会议安排 | 表格 CRUD、一键建会（scenario=sp_workshop） |
| P0 | 输出件 | 提交 KMS、AI 审核、验收状态机 |
| P0 | 初始数据 | 导入 SP 2025~2027 的 4 场会议安排与 15 项候选课题 |

### Phase 2（共创深化）

- 工作坊画布（差距分析、战略意图、业务设计）
- 专题选题评分/投票 + 立项写入 strategy-topics
- 决议与行动联动 + 导入 BP/OMP

### Phase 3（智能化）

- AI 辅助生成画布初稿、纪要、风险提醒
- 评价与复盘：三方评价、均分汇总、经验沉淀

---

## 10. 任务拆分

- [ ] **T1 数据层**：`sp-campaign-store.js` + Worker 端点 + 单元测试
- [ ] **T2 页面骨架**：`sp-planning.html` 注册、周期切换器、Tab 路由、导航接入
- [ ] **T3 总览与阶段时间线**：Campaign 仪表板、BLM/DSTE 阶段时间线、健康度计算
- [ ] **T4 会议安排 Tab**：表格 CRUD、一键建会、关联同步
- [ ] **T5 输出件 Tab**：提交 KMS、调用 reviewer、验收/退回状态机
- [ ] **T6 工作坊画布**：差距分析、战略意图、业务设计画布（MVP 先做 2~3 个）
- [ ] **T7 专题选题 Tab**：候选 CRUD、评论、评分、立项写入 strategy-topics
- [ ] **T8 决议与行动**：决议状态机、行动项、一键导入 BP/OMP
- [ ] **T9 评价 Tab**：三类评价录入、均分汇总
- [ ] **T10 初始数据迁移**：导入 SP 2025~2027 会议安排与候选课题
- [ ] **T11 测试**：pytest 结构断言、unit、E2E
- [ ] **T12 文档更新**：功能全景图、CHANGELOG、session 记忆

---

## 11. 替代方案

1. **不建新实体，纯扩展会议模块**：否决。会议模型承载不了专题选题、输出件验收、跨会议项目进度。
2. **拆成多个独立小实体**：否决。sessions / deliverables / candidates 生命周期完全从属于 campaign，嵌套文档最简单。
3. **在 cockpit.html 内做 PAGES 内嵌页**：可行但非最优。BP 拆分后方向是把复杂功能页移出 cockpit，独立页更合适。

---

## 12. 参考

- KMS 源文档：《SP战略（2025~2027） 制定工作安排（启动会）》(pageId=1295515249)
- 战略专题 PRD：`docs/01-Product产品/战略专题管理-完整设计方案.md`
- BP 拆分模式：`.ai/memory/08-checkpoint.md`
- 新页面指引：`docs/04-Guide开发指南/new-page.md`
- 对标表格样式参考：`docs/02-RFC功能设计/009-sp-planning-workshop-benchmark-styles.html`
- 方法论：
  - [IPD百科网：如何理解华为战略管理的流程框架 DSTE](http://ipdwiki.com/?yfzl/1629.html=)
  - [汉捷咨询：DSTE 打造更精准、更充分、更落地的战略管理体系](https://www.toutiao.com/article/7145334911182946856/)
  - [OEC：Hoshin Kanri: The Complete Practitioner Guide](https://www.oeconsulting.com.sg/single-post/hoshin-kanri-practitioner-guide)
- 对标产品：
  - [Cascade：Strategic Management Software](https://www.cascade.app/blog/strategic-management-software)
  - [WorkBoard：Strategy Execution Software](https://www.workboard.com/resources/blog/strategy-execution-software)
  - [Aha! Roadmaps Overview](https://www.aha.io/roadmaps/overview)
  - [Miro for Product Workshops](https://ideaplan.io/blog/miro-for-product-workshops)
