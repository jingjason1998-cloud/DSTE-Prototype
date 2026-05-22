# RFC-003-Adj: 经营分析会模块优化方案 v2.0 — 调整版

> 状态：`design` | 作者：AI Assistant | 日期：2026-05-21 | 基于：RFC-002 + RFC-003 + PRD模块6 + 《本部重点工作经营例会功能设计文档》

---

## 一、PRD 模块6 关键补充（与 RFC-003 的差异）

阅读 PRD 中「模块 6: 经营分析会 (Business Review) — 战略执行核心引擎」后，发现以下 RFC-003 未覆盖的关键设计：

### 1.1 三层会议体系（PRD 6.2.1）

| 会议类型 | 频率 | 参与人 | 核心议题 | 时长 | 产出 |
|---------|------|--------|---------|------|------|
| **月度经营会** | 每月 | 部门负责人+战略管理员 | 上月KPI达成、重点工作进度、风险预警、下月计划 | 2h | 月度经营报告、行动项 |
| **季度战略会** | 每季 | 高管团队+部门负责人 | 季度战略复盘、差距根因、战略调整、资源重配 | 4h | 季度战略评估报告、战略刷新 |
| **年度复盘会** | 每年 | 全管理层 | 年度战略达成、组织能力建设、下年战略方向 | 1-2天 | 年度复盘报告、新周期SP/BP |

> **调整**：RFC-003 的 `hq/weekly/special` 应映射为 `monthly/quarterly/annual`，更贴合战略管理语境。

### 1.2 "一报一会"机制（PRD 6.2.2）

会前3天 → 经营报告生成 → 会前1天 → 材料预审 → **会议召开**（6个固定议程）→ 会后24h → 纪要+行动项 → 持续跟踪 → 下次闭环验证

会议固定议程（共2.5h）：
1. 上期行动项回顾（15min）
2. KPI达成分析（30min）
3. 重点工作进度（30min）
4. 差距与根因（30min）
5. 决议与行动（30min）
6. 下阶段重点（15min）

> **调整**：会议卡片需展示"一报一会"流水线状态（报告生成→材料预审→会议召开→纪要发布→行动项派发→闭环验证）。

### 1.3 经营报告自动生成（PRD 6.4）

会前系统自动生成的报告包含9个章节：
1. 执行摘要（AI生成）
2. KPI达成总览（红绿灯视图）
3. KPI趋势分析（近6期）
4. 重点工作进度（甘特图）
5. 差距分析（目标vs实际）
6. 根因分析（AI诊断）
7. 上期行动项回顾（完成率）
8. 风险预警（高风险项+建议）
9. 下期预测（AI预测）

> **调整**：新增「经营报告」标签页，预览这9个章节的结构化内容。

### 1.4 效率指标（PRD 6.10）

| 指标 | 计算方式 | 目标值 |
|------|---------|--------|
| 材料准备及时率 | 按时生成材料数/总会议数 | > 95% |
| 决议录入及时率 | 24h内录入纪要数/总会议数 | > 98% |
| 行动项闭环率 | 按期完成行动项数/总行动项数 | > 85% |
| 会议满意度 | 参会人评分平均值 | > 4.2/5 |

> **调整**：Dashboard KPI 应从「总会议/总议题/总TODO/完成率」改为这4个效率指标，更体现"战略执行中央枢纽"定位。

### 1.5 行动项正式化（PRD 6.3）

PRD 中行动项比 TODO 更正式：
- 协同人（不止一个负责人）
- 验收标准（可量化验收）
- 跟踪记录（进度+更新说明+时间）
- 闭环验证（发起人验收）

> **调整**：TODO 追踪模块升级为「行动项追踪」，增加协同人、验收标准、跟踪记录、闭环验证状态。

### 1.6 会议链与跨期关联（PRD 6.7）

- 会议链视图：时间轴+会议关联图
- 行动项跨期追踪：长期行动项在多会议间的执行历史
- 战略执行叙事：从SP到Review的完整叙事

> **调整**：新增「会议链」标签页，时间轴展示三层会议体系和行动项跨期追踪。

---

## 二、调整后信息架构

```
经营分析会页面 (#exe/meetings)
│
├─ 顶部操作区
│  ├─ 面包屑：驾驶舱 / 战略执行 / 经营分析会
│  ├─ 页面标题 + [📅 日历视图] [+ 新建会议] [🤖 智能审核] [📺 会议驾驶舱]
│  └─ Dashboard KPI（4效率指标卡片）
│     ├─ 材料准备及时率  >95%
│     ├─ 决议录入及时率  >98%
│     ├─ 行动项闭环率    >85%
│     └─ 会议满意度      >4.2/5
│
├─ 筛选栏
│  └─ [周期▼] [状态▼] [类型▼] [一报一会阶段▼]     右侧统计摘要
│
├─ 主体区域（grid 2fr:1fr）
│  ├─ 左栏
│  │  ├─ 会议列表（垂直卡片）
│  │  │   ├─ 「一报一会」流水线进度条
│  │  │   ├─ 三层类型标识（月度/季度/年度）
│  │  │   ├─ 会议关联标识（上游→下游）
│  │  │   └─ 点击展开：议题/TODO/决策三标签详情
│  │  │
│  │  └─ 下方标签页（6个标签）
│  │     ├─ 📊 经营报告 — 会前9章节预览
│  │     ├─ ✅ 行动项追踪 — 筛选+逾期+闭环验证
│  │     ├─ 🎯 决策记录 — 决策线+智能推荐
│  │     ├─ ⭐ 效果评估 — 5维度+匿名评分
│  │     ├─ 📏 原则扫描 — 8原则+问题报告
│  │     └─ 🔗 会议链 — 时间轴+跨期追踪
│  │
│  └─ 右栏（垂直堆叠）
│     ├─ 📈 会议统计（4宫格）
│     ├─ 📉 效率趋势（4指标近6期折线）
│     ├─ 🔔 待办提醒（动态生成）
│     ├─ 📋 最近决策（决策线展示）
│     └─ 🚨 原则问题摘要
│
├─ 关联功能
│  └─ [重点工作] [战略复盘] [KPI看板] [会议材料审核] [经营报告中心]
│
```

---

## 三、数据模型调整

### 3.1 Meeting（会议）— 调整版

```javascript
{
  id: '20260415',              // YYYYMMDD
  date: '2026-04-15',
  month: '2026-04',
  level: 'L2',                  // L1(战略层) | L2(执行层) | L3(专项层)
  scope: 'hq',                   // hq(本部) | region(战区) | vertical(垂直客群) | union(片联)
  scenario: 'routine',           // 五大场景之一，见 3.5 场景映射表
  
  // 会议层级
  level: 'L2',                   // L1(战略层) | L2(执行层) | L3(专项层)
  scope: 'hq',                   // hq(本部) | region(战区) | vertical(垂直客群) | union(片联)
  title: '4月经营分析会',
  status: 'completed',         // planned | completed
  location: '会议室 A',
  host: '张总',
  recorder: 'Jason.Jing',
  
  // 一报一会流水线状态
  pipeline: {
    reportGenerated: true,     // 经营报告已生成
    materialReviewed: true,    // 材料已预审
    meetingHeld: true,         // 会议已召开
    minutesPublished: true,    // 纪要已发布
    actionsDispatched: true,   // 行动项已派发
   闭环Verified: false        // 闭环待验证
  },
  
  // 会议关联
  upstreamMeeting: '20260315',   // 上游会议ID（如上月）
  downstreamMeeting: '20260515', // 下游会议ID（如下月）
  
  agenda_items: [
    { title: '上期行动项回顾', duration: 15, speaker: '战略管理员', type: 'monthly_meeting' },
    { title: 'KPI达成分析', duration: 30, speaker: '财务BP', type: 'marketing_review', dataSupport: true },
    { title: '重点工作进度', duration: 30, speaker: '各部门', type: 'project_review' },
    { title: '差距与根因', duration: 30, speaker: '相关责任人', type: 'topic_review' },
    { title: '决议与行动', duration: 30, speaker: '主持人', type: 'system_decision' },
    { title: '下阶段重点', duration: 15, speaker: '战略管理员', type: 'strategic_refresh' }
  ],
  
  actions: ['A001', 'A002'],     // 行动项ID列表
  decisions: ['D001', 'D002'],
  hasMinutes: true,
  minutesStatus: 'final',
  
  // 效率指标（该次会议）
  metrics: {
    materialOnTime: true,       // 材料按时生成
    minutesOnTime: true,        // 纪要24h内发布
    satisfactionScore: 4.5      // 参会人评分
  }
}
```

### 3.2 ActionItem（行动项）— 升级自 TODO

```javascript
{
  id: 'A001',
  content: '营销线IOC增加客户成功指标',
  owner: 'Alex.Fang',           // 主负责人
  collaborators: ['王总监'],     // 协同人
  deadline: '2026-04-25',
  acceptanceCriteria: 'IOC看板新增NPS和留存率指标，数据实时更新',
  status: 'in_progress',         // pending | in_progress | completed | overdue
  sourceMeeting: '20260415',
  
  // 跟踪记录
  tracking: [
    { date: '2026-04-18', progress: 30, update: '已完成指标定义，进入开发' },
    { date: '2026-04-22', progress: 70, update: '前端页面开发中，预计按时完成' }
  ],
  
  // 闭环验证
  closedLoop: {
    verified: false,
    verifier: '张总',
    verifyDate: null,
    verifyResult: null           // pass | fail
  }
}
```

### 3.3 BusinessReport（经营报告）— 新增

```javascript
{
  reportId: 'R20260415',
  meetingId: '20260415',
  reportType: 'monthly',
  generatedAt: '2026-04-12',
  
  sections: [
    { type: 'executive_summary', title: '执行摘要', content: '...', aiGenerated: true },
    { type: 'kpi_overview', title: 'KPI达成总览', content: '...', dataSource: 'kpi_module' },
    { type: 'kpi_trend', title: 'KPI趋势分析', content: '...', dataSource: 'kpi_module' },
    { type: 'work_progress', title: '重点工作进度', content: '...', dataSource: 'execution_module' },
    { type: 'gap_analysis', title: '差距分析', content: '...', dataSource: 'kpi_module' },
    { type: 'root_cause', title: '根因分析', content: '...', aiGenerated: true },
    { type: 'prev_actions', title: '上期行动项回顾', content: '...', dataSource: 'meeting_module' },
    { type: 'risk_alert', title: '风险预警', content: '...', dataSource: 'alert_module' },
    { type: 'forecast', title: '下期预测', content: '...', aiGenerated: true }
  ]
}
```

### 3.4 其他模型保持不变

- Decision（决策记录）：同 RFC-003
- MeetingEvaluation（效果评估）：同 RFC-003（5维度加权）
- MeetingRule（原则）：同 RFC-003（8条内置）

---

## 四、关键设计调整（相比 RFC-003）

### 调整1：Dashboard KPI 从「数量指标」改为「效率指标」

| 版本 | 指标1 | 指标2 | 指标3 | 指标4 |
|------|-------|-------|-------|-------|
| RFC-003 | 总会议数 | 总议题数 | 总TODO数 | TODO完成率 |
| **调整后** | **材料准备及时率** | **决议录入及时率** | **行动项闭环率** | **会议满意度** |

理由：PRD 明确将经营分析会定位为「战略执行中央枢纽」，效率指标更能体现其「节拍器」作用。

### 调整2：新增「经营报告」标签页

会前自动生成的9章节报告预览，用折叠面板组织：
- 执行摘要（AI标识）
- KPI达成总览（红绿灯卡片）
- 重点工作进度（进度条列表）
- 风险预警（红色高亮）

### 调整3：TODO → 行动项正式化

- 增加「协同人」字段
- 增加「验收标准」字段
- 增加「跟踪记录」时间线
- 增加「闭环验证」状态（待验证/已通过/未通过）

### 调整4：新增「会议链」标签页

时间轴视图：
```
2026 Q1 ────── 2026 Q2 ────── 2026 Q3
   │              │              │
  月度会1  →   月度会2  →   月度会3
     ↘     季度战略会     ↙
      └──── 行动项A跨期追踪 ────┘
```

### 调整5：会议卡片增加「一报一会」流水线

每条会议卡片顶部增加6步进度条：
```
报告生成 ──→ 材料预审 ──→ 会议召开 ──→ 纪要发布 ──→ 行动派发 ──→ 闭环验证
  ✓           ✓           ✓           ✓           ✓           ○
```

### 调整6：议题类型映射（13种议题类型，不是独立会议）

> **关键调整**：原来13种"会议类型"改为"议题类型"。一个会议包含多个议题，议题类型决定该议题的审核标准和关注维度。

```
会议：本部重点工作经营例会（scenario: 'routine', level: 'L2'）
  ├── 议题1：营销线层经分会     (agenda_type: 'marketing_review')
  ├── 议题2：重点工作项目会     (agenda_type: 'project_review')
  └── 议题3：专题问题解决会议   (agenda_type: 'topic_review')

会议：落后战区业绩承诺会（scenario: 'lagging_region', level: 'L3'）
  ├── 议题1：落后战区经分会     (agenda_type: 'lagging_region_review')
  └── 议题2：落后战区业绩承诺会  (agenda_type: 'lagging_region_commitment')
```

**13种议题类型**：

| 层级 | 议题类型 | 图标 | 配色 | 说明 |
|------|---------|------|------|------|
| L1 | `strategic_refresh` | 🎯 | `#a855f7` | 战略刷新 |
| L1 | `system_decision` | ⚖️ | `#3b82f6` | 制度决策 |
| L1 | `cadre_review` | 👔 | `#10b981` | 干部述职 |
| L1 | `performance_review` | 🏆 | `#f59e0b` | 绩效评优评差 |
| L2 | `monthly_meeting` | 📅 | `#3b82f6` | 本部月度/双周会 |
| L2 | `marketing_review` | 📈 | `#0d9f6f` | 营销线层经分会 |
| L2 | `project_review` | 📂 | `#8b5cf6` | 重点工作项目会 |
| L2 | `topic_review` | 🔧 | `#f97316` | 专题问题解决会 |
| L2 | `region_monthly` | 🗺️ | `#06b6d4` | 战区月度经营分析会 |
| L3 | `lagging_vertical_review` | ⚠️ | `#ef4444` | 落后垂直客群经分会 |
| L3 | `lagging_vertical_commitment` | 📝 | `#f43f5e` | 落后垂直客群业绩承诺会 |
| L3 | `lagging_region_review` | 🚨 | `#dc2626` | 落后战区经分会 |
| L3 | `lagging_region_commitment` | ✍️ | `#be123c` | 落后战区业绩承诺会 |

---

## 五、不做的事（边界明确）

| 功能 | 原因 |
|------|------|
| KMS 真实读写 | 需 Confluence API + 本地代理 |
| AI 智能生成报告/根因分析 | 需后端 AI 服务 |
| 语音/文字实时转决议 | 需语音识别 + NLP |
| 多用户协作/权限 | 需后端用户体系 |
| 真实数据下钻 | 需后端数据接口 |
| PDF 导出 | 需后端 PDF 生成 |
| 音视频会议集成 | PRD 明确不做 |

---

## 六、实现优先级（调整后）

| 优先级 | 模块 | 说明 |
|--------|------|------|
| **P0** | 数据模型重构 | Meeting/ActionItem/BusinessReport/Decision/Evaluation/Rule |
| **P0** | Dashboard 效率指标 | 4张卡片，目标值 vs 实际值 |
| **P0** | 会议列表 + 一报一会流水线 | 6步进度条 + 三层类型 |
| **P1** | 6个标签页 | 经营报告/行动项/决策/评估/原则/会议链 |
| **P1** | 右栏面板 | 统计/趋势/待办/决策/原则摘要 |
| **P2** | 会议驾驶舱入口 | 6议程计时模拟 |
| **P2** | 关联功能更新 | 增加经营报告中心入口 |

---

## 七、任务清单（调整后）

- [ ] 数据模型重构（Meeting + pipeline/upstream/downstream/metrics, ActionItem + tracking/closedLoop, BusinessReport + 9 sections）
- [ ] Dashboard 效率指标四卡片（材料及时率/决议及时率/闭环率/满意度）
- [ ] 会议列表增强（一报一会流水线进度条 + 三层类型 + 关联标识）
- [ ] 标签页框架（6标签 + 切换交互）
- [ ] 📊 经营报告标签（9章节折叠预览）
- [ ] ✅ 行动项追踪标签（协同人/验收标准/跟踪时间线/闭环验证）
- [ ] 🎯 决策记录标签（决策线 + 智能推荐）
- [ ] ⭐ 效果评估标签（5维度 + 匿名评分）
- [ ] 📏 原则扫描标签（8原则 + 扫描 + 报告）
- [ ] 🔗 会议链标签（时间轴 + 跨期追踪）
- [ ] 右栏：效率趋势折线 + 待办提醒 + 最近决策 + 原则摘要
- [ ] 关联功能更新
- [ ] pytest 回归测试
- [ ] Playwright E2E 测试
- [ ] 预览截图验收


---

## 附录：三层会议 × 五大会场景 管理矩阵

> 本附录明确三层会议体系与五大会场景的映射关系，是编码实现的直接依据。

### 三层会议体系（按附件图片）

```
┌─────────────────────────────────────────────────────────────┐
│  一层（战略层）— 片联季度会议                                │
│  ├── 战略刷新会                                             │
│  ├── 重要制度决策会议                                        │
│  ├── 干部述职会议                                           │
│  └── 绩效评优与"评差"                                       │
├─────────────────────────────────────────────────────────────┤
│  二层（执行层）                                             │
│  ├── 本部月度/双周会                                        │
│  │   ├── 营销线层经分会                                     │
│  │   ├── 重点工作项目会                                     │
│  │   └── 专题问题解决会议                                   │
│  └── 战区：月度经营分析会（机会、销售额、回款；3GAP分析）    │
├─────────────────────────────────────────────────────────────┤
│  三层（专项层）— 落后区域业绩承诺会                          │
│  ├── 落后垂直客群经分会 / 业绩承诺会                         │
│  └── 落后战区经分会 / 业绩承诺会                             │
└─────────────────────────────────────────────────────────────┘
```

### 五大会场景

| 场景ID | 场景名称 | 说明 | 延伸关系 |
|--------|---------|------|---------|
| `routine` | 本部重点工作经营例会 | 常规执行层会议，覆盖本部和战区日常经营分析 | 基础场景 |
| `lagging_vertical` | 垂直客群-落后述职 | 本部会议的延伸，管理垂直细分客群的进度 | ← 本部月度会延伸 |
| `lagging_region` | 落后战区述职 | 战区月度经营分析会的延伸 | ← 战区月度会延伸 |
| `annual_review` | 负责人年度述职 | 年度干部述职与绩效评定 | 独立场景 |
| `special_topic` | 专项议题 | 跨层级专项问题研讨 | 独立场景 |

### 三层 × 五场景 映射表

> **注意**：以下13种不是独立会议，而是**议题类型**。一个会议可包含多个不同议题类型的议程项。

| 层级 | 议题类型 | 所属场景 | 场景说明 |
|------|---------|---------|---------|
| **L1 战略层** | `strategic_refresh` | `special_topic` | 战略级专项议题 |
| L1 | `system_decision` | `special_topic` | 制度级专项议题 |
| L1 | `cadre_review` | `annual_review` | 年度人才盘点 |
| L1 | `performance_review` | `annual_review` | 年度绩效管理 |
| **L2 执行层** | `monthly_meeting` | `routine` | 常规经营分析 |
| L2 | `marketing_review` | `routine` | 营销线常规分析 |
| L2 | `project_review` | `routine` | 项目进度跟踪 |
| L2 | `topic_review` | `special_topic` | 执行层专项问题 |
| L2 | `region_monthly` | `routine` | 战区常规分析 |
| **L3 专项层** | `lagging_vertical_review` | `lagging_vertical` | 本部延伸：客群业绩管理 |
| L3 | `lagging_vertical_commitment` | `lagging_vertical` | 本部延伸：客群业绩承诺 |
| L3 | `lagging_region_review` | `lagging_region` | 战区延伸：战区业绩管理 |
| L3 | `lagging_region_commitment` | `lagging_region` | 战区延伸：战区业绩承诺 |

### 场景决定的内容

```javascript
const SCENARIO_CONFIG = {
  routine: {
    auditStandard: null,                    // 无特殊审核标准
    focusDimensions: ['KPI达成', '重点工作进度', '风险预警'],
    materialTemplate: ['经营数据', '重点工作进展', '下月计划'],
    decisionWeight: { strategic: 0.2, execution: 0.7, pending: 0.1 }
  },
  lagging_vertical: {
    auditStandard: 'vertical-customer-audit',
    focusDimensions: ['完整性', '数据真实性', '根因分析深度', 'SP战略关联度', '下一步计划'],
    materialTemplate: ['业绩回顾', '差距拆解', '根因分析', '改进计划', '资源需求', 'SP布局'],
    decisionWeight: { strategic: 0.3, execution: 0.6, pending: 0.1 }
  },
  lagging_region: {
    auditStandard: 'lagging-warzone-audit',
    focusDimensions: ['完整性', '数据真实性', '战区根因分析', '资源协调', '下一步计划'],
    materialTemplate: ['战区业绩回顾', '差距拆解', '根因分析', '改进计划', '资源协调', '团队建设'],
    decisionWeight: { strategic: 0.3, execution: 0.6, pending: 0.1 }
  },
  annual_review: {
    auditStandard: 'annual-manager-review',
    focusDimensions: ['年度目标达成', '关键战役复盘', '团队建设', '战略规划承接', '个人领导力'],
    materialTemplate: ['年度回顾', '关键战役', '团队建设', '能力提升', '下年规划', '战略承接'],
    decisionWeight: { strategic: 0.5, execution: 0.4, pending: 0.1 }
  },
  special_topic: {
    auditStandard: 'special-topic-review',
    focusDimensions: ['问题定义清晰度', '根因分析深度', '对策可行性', '资源需求明确性', 'SP战略对齐'],
    materialTemplate: ['问题背景', '问题界定', '影响量化', '分析边界', '根因分析', '对策方案'],
    decisionWeight: { strategic: 0.4, execution: 0.5, pending: 0.1 }
  }
};
```

### 数据模型中的场景字段

```javascript
interface Meeting {
  id: string;                    // YYYYMMDD
  level: 'L1' | 'L2' | 'L3';    // 三层体系
  scope: 'hq' | 'region' | 'vertical' | 'union';  // 管理范围
  type: string;                  // 13种具体会议类型
  scenario: 'routine' | 'lagging_vertical' | 'lagging_region' | 'annual_review' | 'special_topic';
  // ... 其他字段
}
```


---

## 附录B：会议编辑与录入功能设计

### B.1 功能概述

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **新建会议** | 表单录入会议基本信息 + 动态添加议程项 | P0 |
| **编辑会议** | 修改会议信息 + 增删改议程项 + 修改关联 | P0 |
| **删除会议** | 级联删除关联TODO（需二次确认） | P1 |
| **会议详情弹窗** | 议题/TODO/决策三标签页 | P0 |

### B.2 新建/编辑会议表单

```
┌─────────────────────────────────────────────────────────────┐
│  ✏️ 新建经营分析会                              [取消] [保存] │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ 📅 会议日期  │  │ 🏷️ 会议场景  │  │ 🏢 管理范围  │        │
│  │ 2026-04-15  │  │ [routine ▼] │  │ [hq ▼]      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📋 会议标题                                          │   │
│  │ 4月经营分析会                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│
│  │ 📍 会议地点  │  │ 👤 主持人   │  │ 📝 记录人          ││
│  │ 会议室 A    │  │ 张总        │  │ Jason.Jing         ││
│  └─────────────┘  └─────────────┘  └─────────────────────┘│
│  ┌─────────────┐  ┌─────────────┐                        │
│  │ 🔗 上游会议  │  │ 🔗 下游会议  │                        │
│  │ [选择 ▼]    │  │ [选择 ▼]    │                        │
│  └─────────────┘  └─────────────┘                        │
├─────────────────────────────────────────────────────────────┤
│  📋 会议议程（动态添加）                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 序号 │ 议题类型        │ 议题标题        │ 时长 │ 主讲人 │
│  ├──────┼─────────────────┼─────────────────┼──────┼────────┤
│  │  1   │ 📈 营销线经分会  │ 营销线经营分析   │ 15min│ Alex   │
│  │  2   │ 📂 重点工作项目  │ Q2渠道拓展计划   │ 20min│ 李经理  │
│  │  3   │ 🔧 专题问题解决  │ 供应链成本优化   │ 15min│ 张总监  │
│  │  +   │                 │                 │      │        │
│  └─────────────────────────────────────────────────────┘   │
│  [+ 添加议程]                                               │
├─────────────────────────────────────────────────────────────┤
│  ⏱️ 预计总时长：50分钟                                       │
└─────────────────────────────────────────────────────────────┘
```

### B.3 议程项动态添加/删除

```javascript
// 议程项表单字段
{
  seq: 1,                        // 序号，自动计算
  type: 'marketing_review',      // 议题类型（13种下拉选择）
  title: '营销线经营分析',        // 议题标题
  duration: 15,                  // 时长（分钟，正整数）
  speaker: 'Alex.Fang',          // 主讲人
  dataSupport: false             // 是否需要数据支撑
}
```

**交互规则**：
- 添加议程：点击「+ 添加议程」，在列表末尾新增一行空表单
- 删除议程：每行右侧有「删除」按钮，至少保留1个议程
- 议题类型下拉：13种议题类型，按层级分组（L1/L2/L3）
- 时长校验：必须为正整数，总时长自动累加显示
- 排序：支持拖拽调整顺序（简化版可用上下箭头）

### B.4 会议详情弹窗

点击会议列表卡片 → 弹出详情弹窗：

```
┌─────────────────────────────────────────────────────────────┐
│  📋 4月经营分析会                              [✏️ 编辑] [✕] │
├─────────────────────────────────────────────────────────────┤
│  场景：routine │ 层级：L2 │ 范围：hq                      │
│  日期：2026-04-15 14:00 │ 地点：会议室 A                   │
│  主持人：张总 │ 记录人：Jason.Jing                        │
├─────────────────────────────────────────────────────────────┤
│  [📋 议题] [✅ TODO] [🎯 决策]                              │
├─────────────────────────────────────────────────────────────┤
│  议题标签内容：                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. 📈 营销线经分会 (15min) — Alex.Fang              │   │
│  │ 2. 📂 重点工作项目 (20min) — 李经理                 │   │
│  │ 3. 🔧 专题问题解决 (15min) — 张总监                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  TODO标签内容：                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✅ 营销线IOC增加客户成功指标 — Alex.Fang — 4/25    │   │
│  │ ⏰ 供应链成本降低8% — 张总监 — 6/30 (已逾期)        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  决策标签内容：                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🟣 战略：Q2营收目标上调至3.2亿 — 李经理             │   │
│  │ 🔵 执行：产品V3.0版本5月底上线 — 王总监             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### B.5 删除会议

```javascript
function deleteMeeting(meetingId) {
  const relatedTodos = todos.filter(t => t.sourceMeeting === meetingId);
  if (relatedTodos.length > 0) {
    // 二次确认弹窗
    alert(`该会议关联 ${relatedTodos.length} 个TODO，删除将级联删除这些TODO，确认吗？`);
  }
  // 删除会议 + 级联删除关联TODO
}
```

### B.6 数据模型更新

```javascript
interface Meeting {
  id: string;                    // YYYYMMDD
  date: string;
  month: string;
  level: 'L1' | 'L2' | 'L3';    // 三层体系
  scope: 'hq' | 'region' | 'vertical' | 'union';
  scenario: 'routine' | 'lagging_vertical' | 'lagging_region' | 'annual_review' | 'special_topic';
  type: 'monthly_meeting',       // 会议自身的分类标签（简化）
  title: string;
  status: 'planned' | 'completed';
  location: string;
  host: string;
  recorder: string;
  
  // 一报一会流水线
  pipeline: {
    reportGenerated: boolean;
    materialReviewed: boolean;
    meetingHeld: boolean;
    minutesPublished: boolean;
    actionsDispatched: boolean;
    closedLoopVerified: boolean;
  },
  
  // 会议关联
  upstreamMeeting: string | null;
  downstreamMeeting: string | null;
  
  // 议程项（包含议题类型）
  agenda_items: AgendaItem[];
  
  // 关联数据
  actions: string[];             // 行动项ID列表
  decisions: string[];           // 决策ID列表
  
  // 纪要
  hasMinutes: boolean;
  minutesStatus: 'draft' | 'reviewed' | 'final';
  
  // 效率指标
  metrics: {
    materialOnTime: boolean;
    minutesOnTime: boolean;
    satisfactionScore: number;
  }
}

interface AgendaItem {
  seq: number;                   // 序号
  type: string;                  // 13种议题类型
  title: string;
  duration: number;              // 分钟，正整数
  speaker: string;
  dataSupport: boolean;
}
```

### B.7 新增/修改字段对比

| 字段 | 旧模型 | 新模型 | 说明 |
|------|--------|--------|------|
| `Meeting.type` | 13种会议类型 | 简化为场景标识 | 会议本身用scenario区分 |
| `Meeting.scenario` | 无 | 5种场景 | 新增，决定审核标准 |
| `AgendaItem.type` | 无（只有title） | 13种议题类型 | 新增，决定议题审核标准 |
| `AgendaItem.seq` | 无 | 序号 | 新增，用于排序 |
| `Meeting.pipeline` | 简单boolean | 6步流水线 | 细化一报一会各阶段 |
| `Meeting.upstream/downstream` | 无 | 关联会议ID | 新增，会议链关联 |
