# T040: DSTE 完整功能框架搭建

> 目标：先把 DSTE 完整功能框架搭起来，让平台在导航和页面层面是完整的，缺的功能用占位页面或基础骨架补全，从而看清全局、便于后续迭代。

## 状态
- **当前阶段**：方案设计已完成，待实施
- **优先级**：高（为后续所有功能开发提供全局视图和导航基础）

---

## 一、当前已实现功能清单

| 阶段 | 模块 | 状态 | 说明 |
|------|------|------|------|
| 驾驶舱 | 驾驶舱概览 | ✅ 已实现 | KPI 卡片、欢迎页 |
| | 开发路线图 | ✅ 已实现 | 版本时间线、甘特图 |
| | 版本审计 | ✅ 已实现 | 三环境对比 |
| | 预算执行看板 | ⚠️ 部分实现 | 汇总年度经营计划、OMP、重点工作的预算执行 |
| SP 战略制定 | 战略地图列表 | ✅ 已实现 | 地图 CRUD、版本、筛选 |
| | 战略地图详情 | ✅ 已实现 | BSC 四维度、拖拽、关联线、下钻 |
| | 战略洞察与专题 | ✅ 已实现 | 洞察库、专题列表 |
| | 战略投资预算 | ❌ 占位页面 | 3-5 年重大投资预算规划 |
| BP 战略解码 | 战略指标库 | ✅ 已实现 | 指标 CRUD、分类树、搜索 |
| | BEM 战略解码 | ❌ 占位页面 | 仅一个 placeholder |
| | 年度经营计划 | ⚠️ 部分实现 | 总览/分解视图、KPI 表格、重点工作、资源配置/预算分配 |
| Execute 战略执行 | 组织绩效管理 | ✅ 已实现 | 四 Tab（总览/KPI/重点工作/甘特图） |
| | 重点工作管理 | ⚠️ 内嵌实现 | 在 OMP 内，缺少独立页面 |
| | 业务专题管理 | ✅ 已实现 | 完整 CRUD、里程碑、AI 报告 |
| | 经营分析会 | ⚠️ 部分实现 | 会议列表、三层体系、决议中心开发中 |
| | 会议材料审核 | ✅ 已实现 | 多场景审核、AI 辅助 |
| | 预算执行监控 | ❌ 占位页面 | 预算执行率、超支预警、冻结/解冻 |
| Review 战略评估 | 绩效与激励 | ❌ 占位页面 | |
| | 干部管理 | ❌ 占位页面 | |
| | 战略复盘 | ❌ 占位页面 | |
| | 差距分析 | ❌ 占位页面 | |
| | 预算分析评估 | ❌ 占位页面 | 预算偏差分析、资源配置复盘 |
| 公共支撑 | AI 战略助手 | ⚠️ 仅对话 UI | 无主动洞察/报告/预测 |
| | 报表中心 | ✅ 已实现 | FineReport 嵌入 |
| | 规则引擎中心 | ❌ 占位页面 | 预算/基线/核算/薪酬激励/预警规则的配置、计算、审计 |
| | 预警中心 | ❌ 占位页面 | 预警事件接收、分级、通知、工单、闭环跟踪 |
| | 需求管理中心 | ❌ 占位页面 | 统一收集、评审、跟踪需求，为 SP/BP 提供输入 |
| | 用户/权限/通知 | ❌ 未实现 | |

---

## 二、缺失功能优先级

### P0 — 战略主流程阻塞
1. BEM 战略解码（SP→BP 桥梁）
2. 年度经营计划闭环（KTI 挂载、任务关联、分组节点、预算、状态流转）
3. AI 战略助手核心能力（主动洞察、报告生成、会议助手）
4. 经营分析会智能闭环（会前材料、会中驾驶舱、会后行动项跟踪）

### P1 — 重要支撑
5. 规则引擎中心（BEM/年度计划/经营分析/预警的底层规则计算中枢）
6. 预警中心（统一接收/分级/通知/闭环预警事件）
7. 需求管理中心（统一需求入口，为 SP/BP 提供结构化输入）
8. 全面预算管理（跨阶段业财融合能力：战略投资预算→年度经营预算→执行监控→分析评估）
9. 重点工作管理独立化
10. 战略地图导出/对比
11. 用户权限与组织架构
12. 战略专题与重点工作/KPI 数据打通
13. 驾驶舱自定义布局/下钻

### P2 — 评估与扩展
14. 绩效与激励、干部管理、战略复盘、差距分析
15. 预算分析评估（预算偏差分析、资源配置复盘）
16. 数据集成与报表引擎

---

## 三、框架搭建方案

在现有 `cockpit.html` 单页应用 + 独立页面混合架构下，把所有缺失模块至少以「页面骨架 + 路由 + 导航」形式补齐。

### 3.1 占位页面标准化

升级现有 `renderPlaceholder()`，统一为带 Tab/数据看板骨架的占位页：

```html
<div class="placeholder-page">
  <div class="placeholder-header">
    <div class="placeholder-icon">🔧</div>
    <div class="placeholder-title">BEM 战略解码</div>
    <div class="placeholder-desc">基于 BEM 六步解码法，将战略地图转化为 CSF/CTQ/战略 KPI/重点工作。</div>
  </div>
  <div class="placeholder-roadmap">
    <div class="roadmap-step done">1. 导入战略地图</div>
    <div class="roadmap-step done">2. 识别 CSF</div>
    <div class="roadmap-step todo">3. 导出 CTQ</div>
    <div class="roadmap-step todo">4. 锚定战略 KPI</div>
    <div class="roadmap-step todo">5. 生成重点工作</div>
    <div class="roadmap-step todo">6. 解码评审</div>
  </div>
</div>
```

### 3.2 本次要补齐的页面/模块

| 模块 | 形式 | 位置 |
|------|------|------|
| BEM 战略解码 | 占位页（带六步骨架） | `cockpit.html#bp/bem` |
| 重点工作管理 | 独立页面/路由 | `key-tasks.html` 或 `cockpit.html#exe/key-tasks` |
| AI 战略助手 | 增强现有 AI 页，增加能力 Tab | `cockpit.html#ai` |
| 经营分析会智能闭环 | 在 `meetings.html` 增加三个 Tab/视图 | `meetings.html` |
| 绩效与激励 | 占位页 | `cockpit.html#rev/performance` |
| 干部管理 | 占位页 | `cockpit.html#rev/cadre` |
| 战略复盘 | 占位页 | `cockpit.html#rev/review` |
| 差距分析 | 占位页 | `cockpit.html#rev/gap-analysis` |
| 规则引擎中心 | 占位页（带规则分类/计算/监控骨架） | `cockpit.html#admin/rule-engine` |
| 预警中心 | 占位页（带接入/分级/通知/工单骨架） | `cockpit.html#admin/alert-hub` |
| 需求管理中心 | 占位页（带需求池/评审/跟踪骨架） | `cockpit.html#admin/requirement-pool`（独立页面 `requirement-pool.html` 待 T010 实现） |
| 用户中心/权限 | 新页面 | `user-center.html` 或 `cockpit.html#dashboard/users` |
| 通知中心 | 新页面/顶部入口 | `notifications.html` 或顶部导航入口 |

> **全面预算管理**：按 PRD 定位，不拆独立模块/页面，作为业财融合能力嵌入年度计划、OMP、经营分析会、驾驶舱。

### 3.3 导航结构补全

更新 `src/lib/config.js` 和 `cockpit.html` 的 `SIDEBAR_CONFIG`：

```javascript
sp: [
  { id: 'sp/strategy-map', label: '战略地图' },
  { id: 'sp/insights-topics', label: '战略洞察与专题' }
],
bp: [
  { id: 'bp/kpi', label: '战略指标库' },
  { id: 'bp/bem', label: 'BEM 战略解码' },  // 新增
  { id: 'bp/annual-plan', label: '年度经营计划' }
],
exe: [
  { id: 'exe/key-tasks', label: '重点工作管理' },  // 新增独立入口
  { id: 'exe/tasks', label: '组织绩效管理' },
  { id: 'exe/business-topics', label: '业务专题管理' },
  { id: 'exe/meetings', label: '经营分析会' },
  { id: 'exe/meeting-review', label: '会议材料审核' }
],
rev: [
  { id: 'rev/performance', label: '绩效与激励' },
  { id: 'rev/cadre', label: '干部管理' },
  { id: 'rev/review', label: '战略复盘' },
  { id: 'rev/gap-analysis', label: '差距分析' }
],
admin: [
  { id: 'admin/rule-engine',      label: '规则引擎中心' },  // 新增
  { id: 'admin/alert-hub',        label: '预警中心' },      // 新增
  { id: 'admin/requirement-pool', label: '需求管理中心' },  // 新增
  { id: 'admin/users',            label: '用户中心' },      // 新增
  { id: 'admin/notifications',    label: '通知中心' }       // 新增
]
```

---

## 四、建议实施顺序

### 第一阶段：补齐所有占位页 + 导航（1-2 天）
1. 升级 `renderPlaceholder()` 为带进度骨架的占位页。
2. 为 `#bp/bem`、`#rev/*`、`#admin/rule-engine`、`#admin/alert-hub`、`#admin/requirement-pool` 等占位页定制描述和路线图。
3. 新增「重点工作管理」独立页面骨架（`src/key-tasks.html` 或 `#exe/key-tasks`）。
4. 新增「用户中心」「通知中心」「规则引擎中心」「预警中心」骨架入口。
5. 统一更新 `config.js`、`cockpit.html` 导航、`vite.config.js` 构建入口。

### 第二阶段：主流程骨架（2-3 天）
1. BEM 战略解码：六步页面骨架（导入地图 → CSF → CTQ → KPI → 重点工作 → 评审）。
2. 年度经营计划：补齐 KTI 挂载、任务关联、分组节点、**资源配置/预算分配** Tab。
3. AI 战略助手：增加「主动洞察」「报告生成」「会议助手」三个 Tab 骨架。
4. 经营分析会：增加「会前准备」「会中驾驶舱」「会后闭环」三个视图骨架，**含预算执行预警**。
5. 驾驶舱：增加「预算执行看板」汇总卡片。

### 第三阶段：数据打通标记（1 天）
1. 在战略专题、重点工作、业务专题、会议等模块中，用 TODO 标记数据打通点。
2. 统一 `localStorage` key 命名规范，为后续数据流整合做准备。
3. 明确预算字段（`budget` / `actualCost` / `budget_completion_rate`）在各模块的写入/读取点。

---

## 五、交付物

1. 一份「DSTE 功能全景图」Markdown 文档（`docs/00-功能全景图.md`）。
2. 所有缺失模块的占位页面/骨架页面。
3. 统一的导航和路由配置。
4. 一个按 P0/P1/P2 排序的「后续开发 backlog」。

---

## 六、关联文件

- `src/cockpit.html` — SPA 主页面与占位页渲染
- `src/lib/config.js` — 侧边栏导航配置
- `vite.config.js` — 多页面入口注册
- `docs/00-功能全景图.md` — 全景文档（待产出）
