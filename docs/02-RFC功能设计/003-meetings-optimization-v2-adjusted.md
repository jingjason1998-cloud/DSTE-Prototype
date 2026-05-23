

## 附录C：经营分析会页面价值主张设计方案

> 状态：`design` | 作者：AI Assistant | 日期：2026-05-23

### C.1 设计目标

1. **核心价值聚焦**：去掉信息分散的三段式卡片，只保留一句核心价值主张，让用户进入页面 1 秒内建立心智锚定——经营分析会是"战略执行核心引擎"，而非普通会议工具。
2. **视觉冲击**：通过大字号、高对比度渐变背景、微动效，让价值主张横幅成为页面视觉焦点，形成强烈的品牌记忆。
3. **向下引导**：价值主张区域下方自然过渡 KPI 效率卡片与会议列表，形成"理念 → 指标 → 行动"的叙事流。

### C.2 页面位置

```
面包屑（驾驶舱 / 战略执行 / 经营分析会）
  ↓
页面标题 + [📅 日历视图] [+ 新建会议]
  ↓
【价值主张横幅】← 大字号单横幅，视觉焦点
  ↓
【场景场次指标卡】← 5场景横向卡片，全局联动筛选 ← 新增
  ↓
KPI 效率四卡片（材料及时率 / 决议及时率 / 闭环率 / 满意度）
  ↓
筛选栏
  ↓
主体区域（会议列表 + 标签页 | 统计面板）
  ↓
【会议主视图】← 点击卡片触发
  ↓
【会议编辑页面】← 主视图内点击编辑按钮触发
```

### C.2a 场景场次指标卡（新增）

> 位置：价值主张横幅下方，KPI 四卡片上方

#### C.2a.1 设计目标

1. **场景化总览**：一眼掌握五大会议场景各自的会议数量分布，建立"场景维度"的心智模型。
2. **全局联动筛选**：点击任一场景卡片，下方会议列表自动筛选为该场景；再次点击取消筛选，恢复全部。
3. **视觉层次**：作为价值主张横幅到 KPI 卡片之间的过渡，保持页面信息流顺畅。

#### C.2a.2 五场景定义

| 场景 | 图标 | 标识色 | 说明 |
|------|------|--------|------|
| 集团级经营例会 | 🏢 | `var(--primary)` 蓝 | 公司级/集团级经营分析会 |
| 产品线经营例会 | 📦 | `var(--success)` 绿 | 产品线/BU级经营分析会 |
| 区域经营例会 | 🌍 | `var(--warning)` 橙 | 区域/分公司经营分析会 |
| 战略专项评审会 | 🎯 | `var(--danger)` 红 | 战略项目/专项评审 |
| 其他 | 📋 | `var(--text-secondary)` 灰 | 不属于以上四类的其他会议 |

#### C.2a.3 卡片设计

```
容器：
- display: flex
- gap: 12px
- margin-bottom: 20px

单卡片：
- flex: 1
- min-width: 0
- padding: 16px 12px
- background: var(--bg-card)
- border-radius: 10px
- border: 2px solid transparent
- text-align: center
- cursor: pointer
- transition: all 0.2s ease

未选中状态：
- border: 2px solid var(--border-light)
- 场景图标：font-size: 24px, margin-bottom: 8px
- 场景名称：font-size: 13px, font-weight: 600, color: var(--text-primary)
- 场次数字：font-size: 22px, font-weight: 800, color: {标识色}
- 单位文案：font-size: 11px, color: var(--text-secondary), "场会议"

悬停状态：
- transform: translateY(-2px)
- box-shadow: 0 4px 12px rgba(0,0,0,0.08)
- border-color: {标识色}40  /* 40 = 25% 透明度 */

选中状态（激活）：
- border: 2px solid {标识色}
- background: linear-gradient(180deg, {标识色}08 0%, var(--bg-card) 100%)
- box-shadow: 0 2px 8px {标识色}20
```

#### C.2a.4 全局联动机制

```
用户点击某场景卡片
  ↓
该卡片进入【选中状态】（边框高亮 + 背景渐变）
  ↓
自动同步：
  ├─ 筛选栏"会议场景"下拉框 → 自动设为该场景值
  ├─ 会议列表 → 只显示该场景的会议卡片
  └─ 其他场景卡片 → 保持未选中状态（可同时仅选一个）

用户再次点击已选中的卡片
  ↓
取消选中，恢复全部会议列表
  ↓
筛选栏"会议场景" → 恢复默认值"全部"
```

**状态管理**：
- 使用 `window._meetingsFilterScene` 记录当前选中的场景值（`null` 表示未选中/全部）
- 与现有的 `applyFilters()` 筛选函数打通，场景卡片的点击即触发 `applyFilters()`

#### C.2a.5 数据计算

```javascript
// 在 renderMeetings() 中实时计算
const sceneCounts = {
  '集团级经营例会': meetings.filter(m => m.scene === '集团级经营例会').length,
  '产品线经营例会': meetings.filter(m => m.scene === '产品线经营例会').length,
  '区域经营例会': meetings.filter(m => m.scene === '区域经营例会').length,
  '战略专项评审会': meetings.filter(m => m.scene === '战略专项评审会').length,
  '其他': meetings.filter(m => !['集团级经营例会','产品线经营例会','区域经营例会','战略专项评审会'].includes(m.scene)).length,
};
```

#### C.2a.6 与现有元素的关系

| 现有元素 | 关系 |
|---------|------|
| 价值主张横幅 | 指标卡在其下方，形成"理念→场景总览→指标"的叙事流 |
| 筛选栏 | 场景卡片的选中状态与"会议场景"下拉框双向同步 |
| 会议列表 | 场景卡片点击直接驱动列表筛选 |
| KPI 四卡片 | 指标卡在 KPI 卡片上方，KPI 仍反映全局/筛选后数据 |

#### C.2a.7 验收标准

- [ ] 页面顶部显示5个场景场次指标卡，横向等宽排列
- [ ] 每张卡片显示场景图标 + 名称 + 场次数字
- [ ] 点击卡片选中该场景，会议列表自动筛选，卡片边框高亮
- [ ] 再次点击已选中卡片，取消筛选，恢复全部
- [ ] 卡片选中状态与筛选栏"会议场景"下拉框同步
- [ ] 移动端横向可滚动，卡片最小宽度保证可读
- [ ] 不影响现有 pytest/Playwright 测试

---

### C.3 内容文案

#### C.3.1 核心主张（唯一文案）

> 🎯 **战略执行核心引擎**
>
> 数据驱动的经营例会体系 —— 从会前智能预警到会中结构化决策，再到会后行动项自动闭环，让每一次会议都成为战略落地的加速器。

引用 PRD 模块6定位："经营分析会不是简单的会议管理，而是战略执行的中央枢纽"。

> **说明**：不再拆分"会前/会中/会后"三段式卡片。核心价值主张本身已隐含全链路闭环理念，避免信息碎片化。

### C.4 视觉设计方案

#### C.4.1 整体横幅

```
容器样式：
- padding: 28px 32px
- background: linear-gradient(135deg, var(--primary) 0%, #1a6fc4 50%, #0d4a8a 100%)
  /* 深色渐变，高对比度，突出核心主张 */
- border-radius: 12px
- box-shadow: 0 4px 20px rgba(13, 74, 138, 0.25)
- margin-bottom: 20px
- position: relative
- overflow: hidden
```

#### C.4.2 装饰元素（增强视觉层次）

```
背景装饰圆（CSS 伪元素）：
- ::before: 右上角大圆，opacity 0.08，增强空间感
- ::after: 左下角小圆，opacity 0.12，平衡构图
- 均为 absolute 定位，pointer-events: none
```

#### C.4.3 主标题

```
样式：
- font-size: 22px
- font-weight: 800
- color: #ffffff
- letter-spacing: 0.5px
- margin-bottom: 10px
- text-shadow: 0 2px 4px rgba(0,0,0,0.15)
```

#### C.4.4 副标题描述

```
样式：
- font-size: 14px
- font-weight: 400
- color: rgba(255, 255, 255, 0.85)
- line-height: 1.7
- max-width: 720px
```

#### C.4.5 底部微装饰线

```
样式：
- width: 48px
- height: 3px
- background: rgba(255, 255, 255, 0.5)
- border-radius: 2px
- margin-top: 14px
```

#### C.4.6 响应式

```
@media (max-width: 768px):
  - padding: 20px 22px
  - 主标题 font-size: 18px
  - 副标题 font-size: 13px
```

### C.5 交互设计

- **纯展示型组件**，无点击/悬停交互。
- **入场微动效**（可选增强）：页面加载时横幅从 opacity 0 + translateY(-10px) 过渡到 opacity 1 + translateY(0)，duration 400ms，easing ease-out。
- 不占用额外数据请求，所有文案为静态文本。
- 不影响现有筛选联动、标签页切换等功能。

### C.6 与现有页面的关系

| 现有元素    | 关系                                                    |
| ------- | ----------------------------------------------------- |
| 页面标题    | 价值主张在其下方，形成"标题 → 强视觉焦点 → 指标"的层级                    |
| KPI 四卡片 | 价值主张中的"智能预警/结构化决策/自动闭环"理念，自然对应 KPI 指标         |
| 筛选栏     | 无影响，筛选栏在 KPI 卡片下方，位置不变                                |
| 会议列表    | 无影响                                                   |

### C.7 实现要点

1. 插入位置：`renderMeetings()` 返回的 HTML 中，`page-header` 闭合标签之后，`kpi-grid` 之前。
2. 技术实现：纯 HTML + inline style，不引入新 CSS 类，保持与现有代码风格一致。
3. 主题适配：当前使用蓝色系渐变（与 `--primary` 一致），暗色模式下自动适配（因 `--primary` 变量会切换）。
4. 文案国际化：当前为中文静态文本，后续如需多语言，可提取为变量。

### C.8 验收标准

- [ ] 页面加载后，价值主张横幅位于页面标题与 KPI 卡片之间
- [ ] 横幅为单区域设计，无三段式卡片，文案仅包含主标题 + 副标题
- [ ] 视觉突出：深色渐变背景、白色大字、底部装饰线
- [ ] 移动端适配正常，字号自动缩小
- [ ] 不影响现有筛选联动、标签页切换、Playwright/pytest 测试通过

---

## 附录D：会议主视图与编辑页面设计方案

> 状态：`design` | 作者：AI Assistant | 日期：2026-05-23

### D.1 设计目标

1. **主视图化**：将原有的"会议详情弹窗"升级为"会议主视图"——不再是居中弹窗，而是占据绝大部分屏幕空间的沉浸式视图，让用户聚焦于单次会议的全链路信息。
2. **议程可视化**：议程安排从简单列表升级为**时间线式视觉设计**，突出议程的节奏感、时长占比与当前进度，提升会议筹备与执行阶段的体验。
3. **编辑页面化**：主视图中的"✏️ 编辑"按钮点击进入独立的编辑页面，提供沉浸式的表单编辑体验，与只读主视图形成清晰的"查看→编辑"状态切换。

### D.2 交互流程

```
用户点击会议卡片
  ↓
打开【会议主视图】（全屏沉浸式，非弹窗）
  ├─ 顶部标题栏：会议名称 + 场景标签 + 状态 Badge + [✏️ 编辑] + [✕ 关闭]
  ├─ 左侧信息面板：基本信息（日期/地点/主持人/记录人/层级）
  ├─ 右侧核心区域：
  │   ├─ 议程时间线（视觉重点，见 D.3.3）
  │   ├─ 行动项/决议卡片
  │   ├─ 效果评估（如有）
  │   └─ 一报一会流程段（适用场景才显示）
  └─ 底部操作栏：[关闭] [✏️ 编辑]
        ↓ 点击编辑
  保持主视图打开（背景遮罩）
        ↓
  打开【会议编辑页面】（全屏沉浸式，独立路由）
```

### D.3 会议主视图

#### D.3.1 整体布局

```
容器样式（主视图）：
- position: fixed
- inset: 0
- z-index: 2000
- background: var(--bg-page)
- display: flex
- flex-direction: column

内容区：
- flex: 1
- overflow-y: auto
- padding: 24px 32px
- max-width: 1200px
- margin: 0 auto
```

#### D.3.2 顶部标题栏

```
布局：
- display: flex
- align-items: center
- justify-content: space-between
- padding: 16px 32px
- border-bottom: 1px solid var(--border-light)
- background: var(--bg-card)
- position: sticky
- top: 0
- z-index: 10

左侧：
- 会议名称：font-size: 20px, font-weight: 700, color: var(--text-primary)
- 场景标签：badge 样式，font-size: 12px
- 状态 badge：与列表页一致

右侧操作：
- [✏️ 编辑] 按钮：主按钮样式
- [✕ 关闭] 按钮：图标按钮
```

#### D.3.3 议程时间线（视觉重点）

**设计目标**：将议程从扁平列表升级为**横向时间轴 + 纵向详情卡片**的复合布局，直观呈现议程顺序、时长占比与进行状态。

**整体布局**：

```
议程区域容器：
- background: linear-gradient(180deg, var(--bg-card) 0%, var(--bg-page) 100%)
- border-radius: 12px
- padding: 24px
- border: 1px solid var(--border-light)
- margin-bottom: 24px
```

**顶部时间轴条**：

```
横向时间轴：
- display: flex
- align-items: center
- position: relative
- margin-bottom: 24px
- padding: 0 8px

时间轴节点：
- 每个议程一个节点
- 节点样式：圆形，直径 32px
  - 已完成：背景 var(--success)，白色 ✓ 图标
  - 进行中：背景 var(--primary)，白色数字/图标，外圈 3px 发光动画（box-shadow pulse）
  - 未开始：背景 var(--border)，灰色数字
- 节点间连线：
  - flex: 1，height: 3px
  - 已完成段：背景 var(--success)
  - 未开始段：背景 var(--border-light)

节点下方标签：
- 议程序号 + 缩略标题
- font-size: 11px
- color: var(--text-secondary)
- text-align: center
- max-width: 80px
- margin-top: 8px
```

**议程详情卡片列表**：

```
卡片容器：
- display: flex
- flex-direction: column
- gap: 16px

单张议程卡片：
- display: flex
- gap: 16px
- padding: 16px 20px
- background: var(--bg-page)
- border-radius: 10px
- border-left: 4px solid {类型色}
  - 经营报告：var(--primary) 蓝
  - 专题研讨：var(--warning) 橙
  - 决策事项：var(--success) 绿
  - 其他：var(--text-secondary) 灰
- box-shadow: 0 1px 3px rgba(0,0,0,0.04)
- transition: transform 0.2s, box-shadow 0.2s

卡片悬停（可选）：
- transform: translateX(4px)
- box-shadow: 0 4px 12px rgba(0,0,0,0.08)

左侧时间标识：
- 时长标签：font-size: 13px, font-weight: 600, color: var(--primary)
  - 格式："25分钟"
- 时间占比条：
  - width: 4px
  - height: 100%
  - border-radius: 2px
  - 背景：当前议程时长 / 总时长 的比例色带

右侧内容区：
- 议程标题：font-size: 15px, font-weight: 600, color: var(--text-primary)
- 议题类型标签：inline badge，font-size: 11px
- 负责人：👤 + 姓名，font-size: 13px, color: var(--text-secondary)
- 描述（如有）：font-size: 13px, color: var(--text-secondary), line-height: 1.6
```

**议程总览头部**：

```
头部区域（议程卡片上方）：
- display: flex
- justify-content: space-between
- align-items: center
- margin-bottom: 16px

左侧：
- 标题："📋 会议议程"，font-size: 16px, font-weight: 700
- 副信息："共 N 项 · 预计总时长 XX 分钟"，font-size: 13px, color: var(--text-secondary)

右侧：
- 进度指示："已完成 X / N"，font-size: 13px
- 圆形进度条（SVG）：直径 36px，描边宽度 3px，背景轨道灰色，进度色 var(--primary)
```

#### D.3.4 行动项/决议区域

```
两列卡片布局：
- display: grid
- grid-template-columns: 1fr 1fr
- gap: 16px
- margin-bottom: 24px

移动端：
- grid-template-columns: 1fr

单卡片：
- background: var(--bg-card)
- border-radius: 10px
- padding: 16px 20px
- border: 1px solid var(--border-light)

卡片头部：
- 标题："✅ 行动项" / "📌 决议"，font-size: 14px, font-weight: 700
- 数量 badge：font-size: 11px

列表项：
- 状态图标 + 内容 + 负责人 + 截止日期
- 无数据时显示占位文案："暂无行动项"（浅色居中）
```

#### D.3.5 效果评估

- 仅在 `m.effectiveness` 存在时显示
- 展示：综合评分大数字（font-size: 36px, font-weight: 800） + 四维度分数条
- 布局：横向排列四个维度卡片，每个含标签 + 分数 + 进度条

#### D.3.6 一报一会流程段

- **适用场景才显示**；不适用时整个区域直接隐藏，**不出现"不适用"等任何占位文案或提示**
- 六步水平步骤条：会前准备 → 材料提交 → 会议召开 → 纪要发布 → 行动跟踪 → 闭环验证
- 每步含图标 + 标签 + 状态指示（已完成/进行中/未开始）

#### D.3.7 会议链接

**设计目标**：提供会议相关外部资源（飞书文档、Zoom/腾讯会议链接、录屏回放等）的快速入口，支持在主视图中一键访问或添加。

**展示位置**：基本信息面板底部，独立一行。

```
会议链接区域：
- 有链接时：
  - 显示 🔗 图标 + 链接标题（如"飞书会议文档"）
  - 链接文本：font-size: 13px, color: var(--primary), 带下划线
  - 点击：新开标签页跳转
  - 右侧：[编辑链接] 图标按钮（小铅笔）

- 无链接时：
  - 显示占位："暂无会议链接"
  - 右侧：[➕ 添加链接] 按钮：次要按钮样式，font-size: 12px
```

**添加/编辑交互**：

```
点击 [添加链接] 或 [编辑链接]
  ↓
弹出小型输入弹窗（非全屏）
  ├─ 链接名称输入：placeholder "如：飞书文档、腾讯会议"
  ├─ URL 输入：placeholder "https://..."
  └─ 底部：[取消] [保存]
        ↓ 保存
  更新 meetings 数据中的 meeting_link 字段
  刷新主视图链接区域显示
```

**数据模型**：

```javascript
meeting_link: {
  title: "飞书会议文档",  // 链接显示名称
  url: "https://..."       // 完整URL
}
// 或简化为字符串：meeting_link: "https://..."（仅URL，显示标题固定为"会议链接"）
```

> **当前推荐**：简化为字符串字段 `meeting_link`，统一显示为 "🔗 会议链接"，降低复杂度。

### D.4 会议编辑页面

#### D.4.1 触发方式

- **唯一入口**：主视图顶部或底部的"✏️ 编辑"按钮
- 编辑页面为**全屏独立页面**，不再是居中弹窗，与主视图同为沉浸式布局

#### D.4.2 整体布局

```
容器样式（编辑页面）：
- position: fixed
- inset: 0
- z-index: 2100
- background: var(--bg-page)
- display: flex
- flex-direction: column

内容区：
- flex: 1
- overflow-y: auto
- padding: 24px 32px
- max-width: 960px
- margin: 0 auto
```

#### D.4.3 表单字段

| 字段 | 类型 | 必填 |
|------|------|------|
| 会议名称 | text | ✅ |
| 会议日期 | date | ✅ |
| 地点 | text | |
| 主持人 | text | |
| 记录人 | text | |
| 会议场景 | select（5场景） | |
| 层级 | select（L1/L2/L3） | |
| 状态 | select（planned/in_progress/completed/cancelled） | |
| 会议链接 | text（URL） | |

#### D.4.4 议程项动态管理

- 列表展示：类型选择器 + 标题输入 + 时长输入（分钟，正整数）+ 负责人输入
- 操作：上移 ↑ / 下移 ↓ / 删除 ×（至少保留1项）
- 底部：总时长自动累加显示
- "+ 添加议程项" 按钮

#### D.4.5 底部操作

- 左侧：🗑️ 删除（带确认弹窗）
- 右侧：[取消] [保存]
- 保存后：关闭编辑页面，返回并刷新主视图数据

### D.5 数据持久化机制

#### D.5.1 问题背景

原始实现中 `meetings` 为 `renderMeetings()` 内部局部变量，`saveMeeting()` 修改后调用 `navigate('exe/meetings')` 重新渲染，导致修改被重新初始化覆盖。

#### D.5.2 解决方案

```javascript
// renderMeetings() 内部
if (!window._meetingsData) {
  window._meetingsData = [ /* 初始化数据 */ ];
}
const meetings = window._meetingsData;
```

- 首次渲染：初始化 `window._meetingsData`
- 后续渲染：复用已有数据
- `saveMeeting()` 修改 `meetings`（即 `window._meetingsData` 的引用），修改自然持久化
- `apiSave('/api/meetings', meetings)` 异步同步到后端（如有 API）

### D.6 实现要点

1. **视图切换**：`openMeetingDetail(id)` 渲染全屏主视图并覆盖内容区。
2. **关闭方式**：点击关闭按钮或背景遮罩（可选），关闭后返回会议列表。
3. **编辑页面与主视图共存**：编辑页面 z-index 高于主视图（如 2100 vs 2000），编辑保存后关闭编辑页面并刷新主视图内容。
4. **响应式**：主视图内容区 `max-width: 1200px` 居中，移动端 padding 缩减为 16px，议程时间轴节点可横向滚动。
5. **性能**：主视图数据直接读取 `window._meetingsData`，无需额外请求。

### D.7 验收标准

- [ ] 点击会议卡片打开全屏主视图，而非居中弹窗
- [ ] 主视图展示会议全局信息（基本信息、议程时间线、行动项、决议、评估、流程段）
- [ ] 一报一会流程段仅适用场景显示，不适用时直接隐藏，不出现"不适用"等任何文案
- [ ] 议程时间线包含：顶部节点轴 + 议程详情卡片列表 + 总时长统计 + 进度指示
- [ ] 议程卡片有左侧彩色竖线（按议题类型区分颜色）
- [ ] 主视图有"✏️ 编辑"按钮，点击打开全屏编辑页面
- [ ] 主持人修改后保存成功，刷新页面后修改保留
- [ ] pytest 全量通过
- [ ] JS 语法无错误

---

## 附录E：日历视图设计方案

> 状态：`design` | 作者：AI Assistant | 日期：2026-05-23

### E.1 设计目标

1. **时间维度总览**：以日历形式呈现会议的时间分布，帮助用户快速感知会议密度、冲突与空档。
2. **视图切换自如**：列表视图与日历视图一键切换，满足不同使用场景（批量浏览 vs 时间规划）。
3. **筛选联动一致**：日历视图与列表视图共享同一套筛选状态（场景、层级、状态），切换视图时筛选条件保持。

### E.2 页面位置

```
页面标题 + [📅 日历视图] [+ 新建会议]
  ↓
价值主张横幅
  ↓
场景场次指标卡
  ↓
KPI 效率四卡片
  ↓
筛选栏
  ↓
【主体区域】← 列表视图 / 日历视图 二选一
  ├─ 列表视图：会议卡片网格（现有）
  └─ 日历视图：月历网格（新增）
```

### E.3 视图切换

```
切换按钮位置：页面标题右侧，与 [+ 新建会议] 并列

默认状态：
- 当前为列表视图时：显示 [📅 日历视图] 按钮，次要按钮样式
- 当前为日历视图时：显示 [📋 列表视图] 按钮，次要按钮样式

状态持久化：
- 使用 localStorage 记录用户上次选择的视图模式（`dste_meetings_view: 'list' | 'calendar'`）
- 首次进入默认列表视图
```

### E.4 日历视图布局

#### E.4.1 整体容器

```
容器：
- background: var(--bg-card)
- border-radius: 12px
- border: 1px solid var(--border-light)
- padding: 20px 24px
```

#### E.4.2 日历头部

```
布局：
- display: flex
- justify-content: space-between
- align-items: center
- margin-bottom: 16px

左侧月份导航：
- [◀] 上一月：图标按钮
- 当前月份标题："2026年5月"，font-size: 18px, font-weight: 700
- [▶] 下一月：图标按钮
- [今天] 按钮：font-size: 12px，点击回到当前月份并高亮今天

右侧信息：
- "本月 N 场会议"，font-size: 13px, color: var(--text-secondary)
```

#### E.4.3 星期标题行

```
布局：
- display: grid
- grid-template-columns: repeat(7, 1fr)
- gap: 1px
- margin-bottom: 8px

单格：
- text-align: center
- font-size: 12px
- font-weight: 600
- color: var(--text-secondary)
- padding: 8px 0

顺序：日 一 二 三 四 五 六（中文习惯）
```

#### E.4.4 日期网格

```
布局：
- display: grid
- grid-template-columns: repeat(7, 1fr)
- gap: 1px
- background: var(--border-light)  /* 网格线颜色 */
- border-radius: 8px
- overflow: hidden

单格（日期单元）：
- background: var(--bg-card)
- min-height: 100px
- padding: 8px
- position: relative

其他月份日期（灰色显示）：
- color: var(--text-disabled)
- background: var(--bg-page)

今天高亮：
- 日期数字背景：var(--primary)
- 日期数字颜色：白色
- 圆形 badge：width/height 24px, border-radius 50%

有会议的日期：
- 底部显示会议条
```

#### E.4.5 会议条（日期格子内）

```
会议条容器（单日多条时纵向堆叠，最多显示3条）：
- display: flex
- flex-direction: column
- gap: 4px
- margin-top: 4px

单条会议：
- padding: 2px 6px
- border-radius: 4px
- font-size: 11px
- white-space: nowrap
- overflow: hidden
- text-overflow: ellipsis
- cursor: pointer
- 背景色按场景区分：
  - 集团级经营例会：var(--primary)15 背景 + var(--primary) 文字
  - 产品线经营例会：var(--success)15 背景 + var(--success) 文字
  - 区域经营例会：var(--warning)15 背景 + var(--warning) 文字
  - 战略专项评审会：var(--danger)15 背景 + var(--danger) 文字
  - 其他：var(--text-secondary)15 背景 + var(--text-secondary) 文字

超出3条时：
- 显示 "+N 更多"，font-size: 11px, color: var(--text-secondary)
- 点击展开该日全部会议（浮层或弹窗）

会议条内容：
- 会议标题（截取前8字）
- 无标题时显示 "未命名会议"
```

### E.5 交互设计

#### E.5.1 点击会议条

```
点击日期格子内的会议条
  ↓
打开该会议的【会议主视图】（与列表页点击卡片行为一致）
```

#### E.5.2 点击日期格子

```
点击日期格子（非会议条区域）
  ↓
打开【当日会议浮层】
  ├─ 头部：日期 + "N 场会议"
  ├─ 会议列表：当天全部会议（与列表页卡片样式一致，迷你版）
  └─ 底部：[+ 新建会议] 按钮（默认日期为该日）
```

#### E.5.3 月份切换

```
点击 [◀] / [▶]
  ↓
日历平滑过渡到上一月/下一月（可选：opacity + translateX 微动效）
  ↓
重新渲染该月日期网格及会议分布
```

### E.6 与筛选的联动

```
筛选栏（场景/层级/状态）或场景指标卡 发生变更
  ↓
同时影响列表视图和日历视图的显示数据
  ↓
日历视图只显示符合筛选条件的会议
  ↓
"本月 N 场会议"数字同步更新
```

### E.7 数据计算

```javascript
// 日历渲染时按日期分组
const meetingsByDate = {};
meetings.forEach(m => {
  const dateKey = m.date; // "2026-05-21"
  if (!meetingsByDate[dateKey]) meetingsByDate[dateKey] = [];
  meetingsByDate[dateKey].push(m);
});

// 渲染某日期格子时
const dayMeetings = meetingsByDate[dateString] || [];
```

### E.8 空状态

```
当月无会议时：
- 日历网格正常显示日期
- 底部显示空状态插图区
  - 图标：📅
  - 文案："本月暂无会议"
  - 按钮：[+ 新建会议]
```

### E.9 响应式

```
桌面端（≥1024px）：
- 日期格子 min-height: 100px
- 会议条显示3条

平板（768px - 1023px）：
- 日期格子 min-height: 80px
- 会议条显示2条

移动端（< 768px）：
- 日期格子 min-height: 60px
- 会议条显示1条
- 星期标题简化为 "日一二三四五六"
```

### E.10 与现有页面的关系

| 现有元素 | 关系 |
|---------|------|
| 会议主视图 | 日历中点击会议条 → 打开主视图，行为与列表页一致 |
| 场景指标卡 | 筛选联动，日历只显示选中场景的会议 |
| 筛选栏 | 筛选联动，日历与列表共享筛选状态 |
| 新建会议 | 日历视图中同样可以新建会议 |

### E.11 实现要点

1. **视图状态**：使用 `window._meetingsViewMode`（`'list'` | `'calendar'`）控制当前视图。
2. **渲染函数**：`renderMeetingsCalendar()` 独立函数，接收筛选后的 `meetings` 数组和当前月份。
3. **月份状态**：`window._calendarMonth = new Date()`，切换月份时更新该变量后重新渲染。
4. **性能**：日历渲染仅操作 DOM 替换主体区域内容，不重新渲染页面其他部分（横幅、KPI、筛选栏保持不变）。

### E.12 验收标准

- [ ] 列表视图与日历视图可一键切换，按钮文案随当前视图变化
- [ ] 日历视图显示当前月份日期网格，今天高亮显示
- [ ] 有会议的日期格子内显示会议条，按场景色区分
- [ ] 点击会议条打开会议主视图
- [ ] 点击日期格子打开当日会议浮层
- [ ] 月份导航（上一月/下一月/今天）正常工作
- [ ] 筛选条件（场景/层级/状态）同时影响列表和日历视图
- [ ] 视图模式切换后筛选状态保持
- [ ] 移动端适配正常
- [ ] pytest/Playwright 测试通过

