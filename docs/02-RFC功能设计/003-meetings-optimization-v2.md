# RFC-003: 经营分析会模块优化方案 v2.0

> 状态：`design` | 作者：AI Assistant | 日期：2026-05-21 | 基于：RFC-002 + 《本部重点工作经营例会功能设计文档》+ 《材料智能审核助手产品设计》

---

## 一、现状分析：当前实现 vs 业务需求差距

### 1.1 数据模型差距

| 维度 | 当前实现 (v0.4.0) | 业务文档要求 | 差距等级 |
|------|-------------------|-------------|---------|
| **会议 ID** | `id: number` (1,2,3...) | `id: string` (YYYYMMDD) | 🔴 高 |
| **会议类型** | 月度/季度/年度/专项 | hq/weekly/special | 🔴 高 |
| **会议状态** | ready/done/plan | planned/completed | 🟡 中 |
| **议题结构** | `agenda: string[]` | `agenda_items: [{title, duration, speaker}]` | 🔴 高 |
| **TODO 模型** | ❌ 无独立模块 | 完整 Todo（content/assignee/deadline/status/source_meeting） | 🔴 高 |
| **决策模型** | {id,content,owner,deadline,progress,status,category} | {id,content,type,tags,basis,impact,date} | 🔴 高 |
| **效果评估** | 4维度（准备度/讨论度/决议质量/执行落地）无权重 | 5维度带权重（议题效率20%/TODO闭环25%/决策质量20%/会议效率15%/记录完整20%） | 🔴 高 |
| **原则管理** | ❌ 无 | 8条内置原则 + 扫描 + 问题报告 | 🔴 高 |
| **会议纪要** | 简单卡片（summary + keyPoints） | 标准区块格式 `[BLOCK]...[END]` | 🟡 中 |
| **KMS 同步** | ❌ 无 | 读取/追加/解析/格式转换 | 🔵 需后端 |

### 1.2 功能模块差距

| 模块 | 当前实现 | 业务文档要求 | 差距 |
|------|---------|-------------|------|
| **会议管理** | 静态卡片列表 | 列表 + 详情弹窗（议题/TODO/决策三标签） | 🟡 中 |
| **TODO 追踪** | ❌ 无 | 独立模块（增删改查/筛选/逾期自动检测） | 🔴 高 |
| **决策记录** | 简单表格（进度条） | 决策线设计 + 智能类型推荐 + 标签管理 | 🔴 高 |
| **会议记录生成器** | 简单纪要卡片 | 表单录入 + 实时预览标准区块 + 回写KMS | 🟡 中 |
| **效果评估** | 简单四维度条形图 | 5维度加权自动打分 + 建议生成（high/medium/low） | 🔴 高 |
| **原则管理** | ❌ 无 | 8条内置原则 + 扫描 + 问题报告 + 趋势统计 | 🔴 高 |
| **批量解析** | ❌ 无 | 粘贴KMS内容 + 双格式解析 + 预览 + 导入 | 🔵 需后端 |
| **Dashboard** | 4张KPI卡片 | 4指标 + 最近会议时间线 + 关键TODO预警 + 最近决策 + 原则问题统计 | 🟡 中 |
| **审核助手** | 独立 reviewer.html | 应与经营分析会页面整合（材料矩阵 + 单材料报告） | 🟡 中 |

### 1.3 视觉设计差距

| 维度 | 当前实现 | 业务文档要求 | 差距 |
|------|---------|-------------|------|
| **主题色调** | Light/Dark 双主题，主色 #1677FF | 深色主题为主 #0f172a | 🟡 中 |
| **差异化设计** | 通用卡片 | 「决策线」设计语言（3px彩色竖线） | 🟡 中 |
| **字体体系** | 系统默认 | Noto Sans SC + Inter + Menlo | 🟢 低 |
| **信息密度** | 中低密度 | 中高密度（办公场景高效扫视） | 🟡 中 |

---

## 二、优化目标

在 `renderMeetings()` 函数内，用**前端模拟方式**实现业务文档中 **80% 的核心功能**，同时**保持现有 DSTE 设计系统风格**。

**不做的事**（需后端支持）：
- KMS 真实读写（Confluence API）
- AI 智能审核（NLP/语义分析）
- 多用户协作/权限体系
- PDF 导出
- 企业 IM 通知
- 真实数据持久化（仍用硬编码模拟）

---

## 三、信息架构设计

```
经营分析会页面 (#exe/meetings)
│
├─ 顶部操作区
│  ├─ 面包屑：驾驶舱 / 战略执行 / 经营分析会
│  ├─ 页面标题 + [📅 日历视图] [+ 新建会议] [🤖 智能审核]
│  └─ Dashboard KPI（4卡片横向排列）
│     ├─ 总会议数
│     ├─ 总议题数
│     ├─ 总TODO数
│     └─ TODO完成率
│
├─ 筛选栏
│  └─ [月份▼] [状态▼] [类型▼]              右侧统计摘要
│
├─ 主体区域（grid 2fr:1fr）
│  ├─ 左栏
│  │  ├─ 会议列表（垂直卡片，点击展开详情）
│  │  └─ 下方标签页（5个标签）
│  │     ├─ 📄 会议纪要 — 标准区块格式预览
│  │     ├─ ✅ TODO追踪 — 筛选 + 列表 + 逾期标记
│  │     ├─ 🎯 决策记录 — 决策线设计 + 类型推荐
│  │     ├─ ⭐ 效果评估 — 5维度打分 + 建议
│  │     └─ 📏 原则扫描 — 8条原则 + 问题报告
│  │
│  └─ 右栏（垂直堆叠）
│     ├─ 📊 会议统计（4宫格）
│     ├─ 📈 决议执行趋势（柱状图）
│     ├─ 🔔 待办提醒（动态生成）
│     ├─ 📋 最近决策（2条，彩色决策线）
│     └─ 🚨 原则问题摘要（扫描结果）
│
├─ 关联功能
│  └─ [重点工作] [战略复盘] [KPI看板] [会议材料审核]
│
```

---

## 四、数据模型设计

### 4.1 Meeting（会议）

```javascript
{
  id: '20260415',           // YYYYMMDD，同一天只有一个会议
  date: '2026-04-15',
  month: '2026-04',
  type: 'hq',               // hq | weekly | special
  title: '本部重点工作经营例会',
  status: 'completed',      // planned | completed
  location: '会议室 A',
  host: '张总',
  recorder: 'Jason.Jing',
  agenda_items: [
    { title: '上期TODO复盘', duration: 10, speaker: 'marks' },
    { title: 'Q2 目标对齐', duration: 15, speaker: '张总' }
  ],
  todos: ['20260415_001', '20260415_002'],
  decisions: ['D001', 'D002'],
  hasMinutes: true,
  minutesStatus: 'final'    // draft | reviewed | final
}
```

### 4.2 Todo（待办任务）

```javascript
{
  id: '20260415_001',
  content: '营销线IOC增加客户成功指标',
  assignee: 'Alex.Fang',
  deadline: '2026-04-25',
  status: 'pending',         // pending | completed | overdue
  sourceMeeting: '20260415'
}
```

**逾期检测规则**：`deadline < 今天` 且 `status !== 'completed'` → 自动标记 `overdue`

### 4.3 Decision（决策）

```javascript
{
  id: 'D001',
  content: '26年培训预算控制在200万',
  type: 'strategic',        // strategic | execution | pending
  basis: 'Q1支出分析',
  impact: '本部所有部门',
  tags: ['预算', '培训'],
  date: '2026-04-15'
}
```

**智能类型推荐**：
- 含 "预算/编制/战略/HC" → `strategic`
- 含 "完成/制作/提交/复盘" → `execution`
- 默认 → `pending`

### 4.4 MeetingEvaluation（效果评估）

```javascript
{
  meetingId: '20260315',
  overallScore: 88,
  dimensions: [
    { dimension: '议题效率', score: 85, weight: 0.20, details: '议题4个，平均时长15min' },
    { dimension: 'TODO闭环', score: 75, weight: 0.25, details: '完成率60%' },
    { dimension: '决策质量', score: 90, weight: 0.20, details: '所有决策有依据+影响范围+标签' },
    { dimension: '会议效率', score: 80, weight: 0.15, details: '有议题+TODO+决策记录' },
    { dimension: '记录完整', score: 95, weight: 0.20, details: '信息完整，有TODO+决策+类型标签' }
  ],
  suggestions: [
    { dimension: 'TODO闭环', priority: 'high', content: 'TODO完成率仅60%，建议加强跟踪', action: '建立TODO周报机制' },
    { dimension: '议题效率', priority: 'medium', content: '议题数量合理，但个别议题超时', action: '议题超时提前提醒' }
  ]
}
```

**评分规则**（前端自动计算）：

| 维度 | 权重 | 满分条件 | 扣分规则 |
|------|------|----------|----------|
| 议题效率 | 20% | 议题3-5个，单个15-30min | 议题<2或>8扣20%；平均>40min扣15% |
| TODO闭环 | 25% | 所有TODO截止前完成 | 完成率直接换算 |
| 决策质量 | 20% | 所有决策有依据+影响范围+标签 | 缺失一项扣20%；待定过多扣10% |
| 会议效率 | 15% | 有议题/TODO/决策记录 | 每缺失一类扣30% |
| 记录完整 | 20% | 基础分60%，有TODO+10%，有决策+10%，有类型标签+10%，≥90分额外+10% | |

**建议生成**：
- < 60分 → `high` 优先级（必须改进）
- 60-80分 → `medium` 优先级（有待提升）
- 80-100分 → `low` 优先级（保持或表扬）

### 4.5 MeetingRule（原则）

```javascript
{
  id: 'rule_001',
  name: 'TODO必须有明确截止日期',
  category: 'todo',
  condition: 'deadline为空或无效',
  severity: 'warning',       // fatal | warning | suggestion
  enabled: true
}
```

**内置8条原则**：

| ID | 名称 | 分类 | 条件 | 严重度 |
|----|------|------|------|--------|
| rule_001 | TODO必须有明确截止日期 | todo | deadline为空/无效 | warning |
| rule_002 | TODO责任人不能为空 | todo | assignee为"TBD"/空 | warning |
| rule_003 | 决策必须记录依据 | decision | basis为空 | suggestion |
| rule_004 | 决策必须标注影响范围 | decision | impact为空 | suggestion |
| rule_005 | 议题时长不能超过30分钟 | agenda | duration > 30 | suggestion |
| rule_006 | 会议必须有至少1个议题 | meeting | agenda_items为空 | fatal |
| rule_007 | 逾期TODO需要重新确认 | todo | overdue超7天 | fatal |
| rule_008 | 战略决策必须打标签 | decision | type=strategic且tags为空 | warning |

**扫描规则**：遍历所有 Meeting/Todo/Decision，匹配 enabled=true 的原则，生成 Violation 列表。

---

## 五、功能模块详细设计

### 5.1 Dashboard KPI（4卡片）

位置：页面标题下方，横向 4 列。

| 卡片 | 数值 | 说明 |
|------|------|------|
| 总会议 | meetings.length | 本年累计 |
| 总议题 | sum(meetings.agenda_items.length) | 本年累计 |
| 总TODO | todos.length | 本年累计 |
| TODO完成率 | completed / total * 100% | 动态计算 |

### 5.2 会议列表（增强）

每行卡片展示：
- 左侧：日期（大号）+ 标题 + 类型标签
- 右侧：状态标签
- 中间行：📅 日期时间 | 📍 地点 | 👤 主持人
- 议题行：📝 议题N个（每个议题显示时长和主讲人）
- 底部：TODO数量 + 决策数量 + 材料状态
- 点击展开：显示该会议的详细标签页（议题/TODO/决策）

**类型标签配色**：
- `hq` → 深海蓝 `#1a3a5c`
- `weekly` → 松石绿 `#0d9f6f`
- `special` → 琥珀黄 `#f59e0b`

### 5.3 标签页设计（左栏下方）

5个标签，水平排列，点击切换内容：

**标签1：📄 会议纪要**
- 标准区块格式预览（`[MEETING]` / `[TOPIC]` / `[TODO]` / `[DECISION]`）
- 复制按钮
- 模拟「回写KMS」按钮（alert 提示）

**标签2：✅ TODO追踪**
- 状态筛选按钮组：全部 / 待处理 / 已完成 / 已逾期
- TODO列表：每条显示内容 + 责任人 + 截止日期 + 状态
- 逾期自动标红
- 操作按钮：完成 / 撤销（alert 模拟）

**标签3：🎯 决策记录**
- 决策卡片：左侧 3px 彩色竖线（决策线设计）
  - 战略决策 → 紫色 `#a855f7`
  - 执行决策 → 蓝色 `#3b82f6`
  - 待定 → 橙色 `#f59e0b`
- 卡片内容：内容 + 依据 + 影响范围 + 标签
- 类型标签（带智能推荐标识）

**标签4：⭐ 效果评估**
- 总分大数字展示
- 5维度评分表（维度名 + 分数 + 权重 + 详情）
- 建议列表（按优先级 high/medium/low 分组）

**标签5：📏 原则扫描**
- 8条原则开关列表（启用/禁用）
- 「运行扫描」按钮
- 扫描结果：问题列表（按 fatal > warning > suggestion 排序）
- 统计摘要：fatal N条 / warning N条 / suggestion N条

### 5.4 右栏面板（垂直堆叠）

**📊 会议统计**：4宫格（本年会议 / 决议闭环率 / 待闭环 / 待审核材料）

**📈 决议执行趋势**：6个月柱状图（保持现有）

**🔔 待办提醒**：动态生成
- 材料待审核
- 纪要待生成
- TODO逾期
- 决策缺少依据/影响范围

**📋 最近决策**：最近2次会议的决策，最多5条
- 使用决策线彩色竖线

**🚨 原则问题摘要**：扫描结果快速预览
- fatal 数量（红色高亮）
- warning 数量（黄色）
- 点击「查看详情」跳转到原则扫描标签页

---

## 六、视觉设计调整

### 6.1 保持现有 DSTE 设计系统

- 继续使用 CSS 变量：`--primary`, `--success`, `--warning`, `--danger`
- 继续使用 `.card`, `.status-badge`, `.progress-bar` 等类名
- 继续使用 `style=""` 内联样式进行微调

### 6.2 融入「决策线」设计语言

在决策卡片和 TODO 卡片左侧增加 3px 彩色竖线：

```css
/* 决策线 */
border-left: 3px solid {color};
```

颜色映射：
| 类型 | 颜色 | 用途 |
|------|------|------|
| 战略决策 | `#a855f7` (紫) | 决策卡片 |
| 执行决策 | `#3b82f6` (蓝) | 决策卡片 |
| 待定 | `#f59e0b` (橙) | 决策卡片 |
| TODO待处理 | `#fbbf24` (黄) | TODO卡片 |
| TODO已完成 | `#10b981` (绿) | TODO卡片 |
| TODO已逾期 | `#ef4444` (红) | TODO卡片 |

### 6.3 标签页样式

```
┌─────────────────────────────────────────┐
│ [📄纪要] [✅TODO] [🎯决策] [⭐评估] [📏原则] │ ← 标签栏
├─────────────────────────────────────────┤
│  标签内容区                               │
└─────────────────────────────────────────┘
```

- active 标签：蓝色下划线 + 文字高亮
- inactive 标签：灰色文字，hover 变浅灰背景

---

## 七、交互设计

### 7.1 标签页切换

```javascript
function switchMeetingTab(tabId) {
  // 隐藏所有标签内容
  // 显示当前标签内容
  // 更新标签栏 active 样式
}
```

### 7.2 会议卡片展开/收起

```javascript
function toggleMeetingDetail(meetingId) {
  // 切换该会议详情区域的 display
}
```

### 7.3 智能类型推荐

```javascript
function recommendDecisionType(content) {
  if (/预算|编制|战略|HC/.test(content)) return 'strategic';
  if (/完成|制作|提交|复盘/.test(content)) return 'execution';
  return 'pending';
}
```

### 7.4 原则扫描

```javascript
function scanRules() {
  const violations = [];
  // 遍历 meetings, todos, decisions
  // 匹配每条 enabled 的原则
  // 返回 violations 列表
}
```

### 7.5 效果评估自动计算

```javascript
function calculateEvaluation(meeting) {
  // 议题效率分
  // TODO闭环分
  // 决策质量分
  // 会议效率分
  // 记录完整分
  // 加权求和 → overallScore
  // 生成 suggestions
}
```

---

## 八、实现优先级

| 优先级 | 模块 | 工作量 | 说明 |
|--------|------|--------|------|
| **P0** | 数据模型重构 | 中 | 所有下游依赖此 |
| **P0** | Dashboard KPI | 低 | 4张卡片，计算逻辑简单 |
| **P0** | 会议列表增强 | 中 | 新数据模型 + 展开交互 |
| **P1** | TODO追踪 | 中 | 独立模块，逾期检测 |
| **P1** | 决策记录（决策线） | 中 | 智能推荐 + 标签 |
| **P1** | 效果评估（5维度） | 中 | 打分规则 + 建议生成 |
| **P1** | 原则扫描 | 中 | 8条规则 + 扫描逻辑 |
| **P2** | 会议纪要标准区块 | 低 | 字符串模板拼接 |
| **P2** | 批量解析 | 低 | 正则解析，可简化 |
| **P2** | 审核助手整合入口 | 低 | 增加链接/iframe |

---

## 九、任务清单

- [ ] 数据模型重构（Meeting/Todo/Decision/Evaluation/Rule）
- [ ] Dashboard KPI 四卡片
- [ ] 会议列表增强（类型标签 + 展开详情）
- [ ] 标签页框架（5标签 + 切换交互）
- [ ] 📄 会议纪要标签（标准区块预览）
- [ ] ✅ TODO追踪标签（筛选 + 逾期检测）
- [ ] 🎯 决策记录标签（决策线 + 智能推荐）
- [ ] ⭐ 效果评估标签（5维度打分 + 建议）
- [ ] 📏 原则扫描标签（8原则 + 扫描 + 报告）
- [ ] 右栏：待办提醒 + 最近决策 + 原则问题摘要
- [ ] 关联功能更新（增加审核助手入口）
- [ ] pytest 回归测试通过
- [ ] Playwright E2E 测试通过
- [ ] 预览截图对比验收
