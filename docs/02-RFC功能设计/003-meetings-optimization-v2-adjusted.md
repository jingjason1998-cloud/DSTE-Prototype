

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

**双向同步（筛选栏 → 场景卡片）**：

```javascript
// 当用户通过筛选栏"会议场景"下拉框选择场景时
function onFilterSceneChange(selectedScene) {
  window._meetingsFilterScene = selectedScene;
  
  // 同步场景指标卡高亮状态
  document.querySelectorAll('.scene-card').forEach(card => {
    const isSelected = card.dataset.scene === selectedScene;
    card.classList.toggle('active', isSelected);
  });
  
  applyFilters();  // 触发列表筛选
}
```

> **注意**：筛选栏选择"全部"时，所有场景卡片取消高亮；选择具体场景时，对应卡片高亮，其余保持未选中。

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
> 数据驱动的经营例会体系 —— 从会前智能预警到会中结构化决策，再到会后行动(TODO)项自动闭环，让每一次会议都成为战略落地的加速器。

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
  │   ├─ 标签导航栏（纪要 | 行动(TODO) | 决策 | 会议链）
  │   └─ 标签内容区（切换显示对应内容）
  │       ├─ 议程时间线（视觉重点，见 D.3.3）← "纪要" 标签
  │       ├─ 行动(TODO)项列表 ← "行动(TODO)" 标签
  │       ├─ 决议列表 ← "决策" 标签
  │       └─ 上下游关联会议 ← "会议链" 标签
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
- padding: 20px 32px
- max-width: 1200px
- margin: 0 auto

内容区内部布局（桌面端 ≥768px）：
- display: grid
- grid-template-columns: 280px 1fr
- gap: 24px

左侧信息面板：
- position: sticky
- top: 20px
- align-self: start
- height: fit-content

右侧标签内容区：
- min-width: 0

内容区内部布局（移动端 <768px）：
- display: flex
- flex-direction: column
- gap: 16px

左侧信息面板（移动端）：
- position: static
- width: 100%
- order: -1  /* 基本信息面板移到最上方 */
```

#### D.3.2 顶部标题栏与基本信息面板（紧凑设计）

**顶部标题栏**：

```
布局：
- display: flex
- align-items: center
- justify-content: space-between
- padding: 12px 32px
- border-bottom: 1px solid var(--border-light)
- background: var(--bg-card)
- position: sticky
- top: 0
- z-index: 10

左侧（单行紧凑）：
- 会议名称：font-size: 18px, font-weight: 700
- 场景标签 + 状态 badge：紧跟名称后，margin-left: 8px，同一样式

右侧操作：
- [✏️ 编辑] 按钮：主按钮样式，font-size: 13px, padding: 6px 14px
- [✕ 关闭] 按钮：图标按钮，font-size: 18px
```

**左侧基本信息面板**：

```
面板容器：
- background: var(--bg-card)
- border-radius: 10px
- border: 1px solid var(--border-light)
- padding: 16px

信息项（单行紧凑布局）：
- display: flex
- align-items: baseline
- gap: 8px
- padding: 6px 0
- border-bottom: 1px dashed var(--border-light)
- 最后一项无边框

标签：
- font-size: 12px
- color: var(--text-secondary)
- min-width: 48px
- flex-shrink: 0

值：
- font-size: 13px
- color: var(--text-primary)
- font-weight: 500

信息项列表：
- 📅 日期：2026-05-21
- 📍 地点：会议室A
- 👤 主持人：张三
- 📝 记录人：李四
- 🏢 层级：L1
- 📊 状态：badge 样式
- 🔗 会议链接：可点击跳转（如有）
```

> **紧凑要点**：面板宽度固定 280px，padding 仅 16px，信息项间距 6px，标签+值单行排列，不浪费纵向空间。总高度控制在 200px 以内，一屏可见。

#### D.3.3 标签导航栏

```
容器：
- display: flex
- gap: 0
- border-bottom: 1px solid var(--border-light)
- margin-bottom: 20px

标签项：
- padding: 12px 20px
- font-size: 14px
- font-weight: 500
- color: var(--text-secondary)
- cursor: pointer
- border-bottom: 2px solid transparent
- transition: all 0.2s

标签悬停：
- color: var(--text-primary)

标签选中：
- color: var(--primary)
- border-bottom: 2px solid var(--primary)
- font-weight: 600

标签顺序：
- 📄 纪要（默认选中）
- ✅ 行动(TODO)
- 📋 决策
- 🔗 会议链
```

> **说明**：效果评估和原则管理不在主视图标签中。效果评估数据在会议列表卡片上已展示综合评分，无需重复。原则管理作为系统级功能，独立入口更为合适。

#### D.3.4 "纪要" 标签 — 议程时间线（视觉重点）

**设计目标**：将议程从扁平列表升级为**横向时间轴 + 纵向详情卡片**的复合布局，直观呈现议程顺序、时长占比与当前进度，提升会议筹备与执行阶段的体验。

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

左侧时间标识（时间段 + 时长）：
- 时间段：font-size: 12px, font-weight: 600, color: var(--text-primary)
  - 格式："09:00"（开始时间）
- 连接符：font-size: 11px, color: var(--text-secondary)
  - 格式："~"
- 结束时间：font-size: 12px, font-weight: 600, color: var(--text-primary)
  - 格式："09:25"
- 时长标签：font-size: 11px, color: var(--primary), background: var(--primary-light)
  - border-radius: 4px, padding: 2px 6px
  - 格式："25分钟"
  - 位置：时间段下方，形成"时间块"视觉单元

时间占比条：
- width: 3px
- height: 100%
- border-radius: 2px
- background：当前议程时长 / 总时长 的比例色带

右侧内容区：
- 第一行（标题行）：
  - 议程标题：font-size: 15px, font-weight: 600, color: var(--text-primary)
  - 议题类型标签：inline badge，font-size: 11px，margin-left: 8px

- 第二行（元信息行，紧凑排列）：
  - display: flex
  - gap: 16px
  - margin-top: 6px
  - font-size: 12px
  - color: var(--text-secondary)

  元信息项：
  - 👤 主持人：姓名（议程级主持人，区别于会议主持人）
  - 📎 材料：链接文本，color: var(--primary)，带下划线，点击跳转
    - 无材料时：不显示该项
  - 🎯 目的：简短描述，最多 30 字截断
    - 无目的时：不显示该项

- 议程描述（如有）：
  - font-size: 13px
  - color: var(--text-secondary)
  - line-height: 1.6
  - margin-top: 8px
  - padding-top: 8px
  - border-top: 1px dashed var(--border-light)

> **数据模型扩展**：
> ```javascript
> agendaItem: {
>   id: "1",
>   type: "经营报告",
>   title: "Q1经营分析报告",
>   start_time: "09:00",     // 新增：开始时间
>   end_time: "09:25",       // 新增：结束时间
>   duration: 25,            // 时长（分钟），由 start/end 计算或独立存储
>   speaker: "张三",         // 主持人/主讲人（议程级）
>   material_link: "https://...",  // 新增：会议材料链接
>   purpose: "回顾Q1业绩，识别偏差",  // 新增：议程目的
>   description: "..."       // 原有：详细描述
> }
> ```
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

#### D.3.5 "行动(TODO)" 标签 — 行动(TODO)项列表

**业务定位**：

> 行动(TODO)项是**为落实决议而需要执行的具体任务**，具有明确的执行人、截止时间和可交付成果。一次会议通常产生 5~15 条行动(TODO)项。
>
> 与决议的关系：**决议是"决定了什么"，行动(TODO)项是"谁要做什么"**。一个决议可拆解为多条行动(TODO)项，一条行动(TODO)项也可不关联任何决议（如会议纪要的发布任务）。

**布局**：

```
容器：
- background: var(--bg-card)
- border-radius: 10px
- padding: 20px
- border: 1px solid var(--border-light)

头部：
- 标题："✅ 行动(TODO)"，font-size: 16px, font-weight: 700
- 数量 badge + 完成率（已完成 / 总数）

列表项：
- 状态图标（✅/⏳/⏸️）+ 内容 + 负责人 + 截止日期
- 来源决议（如有）：
  - font-size: 11px
  - color: var(--text-secondary)
  - 格式："来自决议：Q3 增长目标调整"
  - 可点击跳转到对应决议详情
- 每条底部 border-bottom: 1px solid var(--border-light)
- 最后一条无边框

空状态：
- 居中显示 "暂无行动(TODO)项"，color: var(--text-secondary)
```

**数据模型**：

```javascript
actionItem: {
  id: "a1",
  content: "财务部在6月5日前重算预算分配表",
  assignee: "张三",
  deadline: "2026-06-05",
  status: "in_progress",  // completed / in_progress / paused
  source_resolution: "r1",  // 可选：关联的决议ID
  source_resolution_title: "Q3 增长目标调整"  // 用于展示
}
```

#### D.3.6 "决策" 标签 — 决议列表

**业务定位**：

> 决议是**会议形成的结论、决定或共识**，具有权威性和方向性，回答"会议决定了什么"。一次会议通常产生 3~5 条决议。
>
> 与行动(TODO)项的关系：**决议是"因"，行动(TODO)项是"果"**。决议本身不直接产生可交付物，而是通过拆解为行动(TODO)项来落地。下次会议需验证决议是否被正确执行。

**布局**：

```
容器：与行动(TODO)标签同样式

头部：
- 标题："📋 决议"，font-size: 16px, font-weight: 700
- 数量 badge

列表项：
- 状态图标（✅/⏳）+ 决议内容 + 决策人 + 决策日期
- 关联行动(TODO)项提示：
  - font-size: 11px
  - color: var(--primary)
  - 格式："已拆解 3 项行动(TODO)"
  - 点击：展开/折叠显示关联的行动(TODO)项列表（迷你版）
- 每条底部 border-bottom: 1px solid var(--border-light)
- 最后一条无边框

空状态：
- 居中显示 "暂无决议"，color: var(--text-secondary)
```

**数据模型**：

```javascript
resolution: {
  id: "r1",
  content: "同意 Q3 增长目标调整为 20%",
  decider: "王总",           // 决策责任人（拍板者）
  decision_date: "2026-05-21",
  status: "confirmed",       // confirmed / overturned
  action_items: ["a1", "a2", "a3"]  // 关联的行动(TODO)项ID列表
}
```

> **说明**：原设计中"行动(TODO)项/决议两列卡片"改为分标签独立展示，避免信息拥挤。分标签后通过"来源决议"和"已拆解N项行动(TODO)"建立两者关联，用户可直观看到决议→行动(TODO)的拆解链路。

#### D.3.7 "会议链" 标签 — 上下游关联会议

**设计目标**：展示当前会议与上下游会议的关联关系，形成"会前遗留→本次会议→会后跟踪"的完整链条。

**数据模型**：

```javascript
// 会议主数据中的关联字段
meeting: {
  id: "m1",
  name: "5月经营分析会",
  // ... 其他字段
  upstream_meetings: ["m0"],      // 上游会议ID数组（通常1个，也可多个）
  downstream_meetings: ["m2"],   // 下游会议ID数组（通常1个，也可多个）
  carryover_items: [             // 从上游会议遗留到本次会议的问题/事项
    { from_meeting: "m0", content: "4月行动项3项未闭环", status: "in_progress" }
  ]
}

// 上游会议示例
upstreamMeeting: {
  id: "m0",
  name: "4月经营分析会",
  date: "2026-04-21",
  carryover_count: 3  // 遗留到下游的问题数量，用于 badge 展示
}

// 下游会议示例
downstreamMeeting: {
  id: "m2",
  name: "6月经营分析会",
  date: "2026-06-21",
  status: "planned"
}
```

> **关联建立方式**：在编辑页面的表单中增加"上下游会议"选择器（多选下拉），或从会议链标签中直接操作关联。当前推荐：编辑页面中维护 upstream_meetings / downstream_meetings 字段。

**布局**：

```
容器：
- background: var(--bg-card)
- border-radius: 10px
- padding: 20px
- border: 1px solid var(--border-light)

上游会议（前置会议）：
- 标题："⬆️ 上游会议"，font-size: 14px, font-weight: 600
- 会议卡片（迷你版）：
  - 会议名称 + 日期
  - 遗留问题数量 badge
  - 点击：打开该会议主视图
- 无上游时："无上游关联会议"

当前会议：
- 居中显示，带高亮边框
- 标题："📍 当前会议"
- 名称 + 日期

下游会议（后续会议）：
- 标题："⬇️ 下游会议"，font-size: 14px, font-weight: 600
- 会议卡片（迷你版）：同上游
- 无下游时："无下游关联会议"

连接线（视觉）：
- 上游 → 当前：向下箭头连线
- 当前 → 下游：向下箭头连线
- 使用虚线 + 箭头图标，color: var(--border)
```

#### D.3.8 一报一会流程段（跨标签常驻）

> **位置**：一报一会流程段不属于任何标签内部，而是放在右侧核心区域的**标签导航栏上方**，作为会议的元信息常驻展示。适用场景才显示，不适用时直接隐藏。

**布局**：

```
容器：
- margin-bottom: 16px
- padding: 12px 16px
- background: linear-gradient(90deg, var(--primary-light) 0%, var(--bg-card) 100%)
- border-radius: 8px
- border-left: 3px solid var(--primary)

内容：
- 标题："📊 一报一会"，font-size: 13px, font-weight: 600
- 六步水平步骤条（简化版）：
  - 会前准备 → 材料提交 → 会议召开 → 纪要发布 → 行动跟踪 → 闭环验证
  - 每步小圆点 + 标签，横向紧凑排列
  - 已完成：var(--success)，进行中：var(--primary)，未开始：var(--border)
```

#### D.3.9 会议链接

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
弹出小型输入弹窗（非全屏，z-index: 2200）
  ├─ 链接名称输入：placeholder "如：飞书文档、腾讯会议"
  ├─ URL 输入：placeholder "https://..."
  └─ 底部：[取消] [保存]
        ↓ 保存
  更新 window._meetingsData 中当前会议的 meeting_link 字段
  局部刷新：仅重新渲染左侧基本信息面板的链接区域
  不关闭主视图，弹窗直接关闭
```

> **刷新策略**：会议链接的增删改只局部刷新基本信息面板的链接区域，不需要重新渲染整个主视图。

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

#### D.4.1 触发方式与数据回显

- **唯一入口**：主视图顶部或底部的"✏️ 编辑"按钮
- 编辑页面为**全屏独立页面**，不再是居中弹窗，与主视图同为沉浸式布局

**数据回显**：

```javascript
// 打开编辑页面时，将当前会议数据深拷贝到编辑表单
// 避免直接修改 window._meetingsData，保证取消时可丢弃修改
window._editingMeeting = JSON.parse(JSON.stringify(meeting));
// meeting 为当前会议的完整对象引用，包含 id / name / date / agenda 等全部字段
```

> **关键**：编辑页面必须基于 `window._editingMeeting` 渲染表单，而非直接操作 `window._meetingsData`。保存时才将修改写回主数据。

#### D.4.2 整体布局

```
容器样式（编辑页面）：
- position: fixed
- inset: 0
- z-index: 2100
- background: var(--bg-page)
- display: flex
- flex-direction: column

顶部标题栏（同主视图结构，文案不同）：
- 左侧："✏️ 编辑会议"，font-size: 20px, font-weight: 700
- 右侧：[✕ 取消] 图标按钮（等价于底部取消）

内容区：
- flex: 1
- overflow-y: auto
- padding: 24px 32px
- max-width: 960px
- margin: 0 auto

底部操作栏（sticky）：
- position: sticky
- bottom: 0
- background: var(--bg-card)
- border-top: 1px solid var(--border-light)
- padding: 12px 32px
- display: flex
- justify-content: space-between
```

#### D.4.3 表单字段布局

**分组结构**：

```
【基本信息组】
  会议名称        会议日期
  地点            主持人
  记录人          会议链接
  会议场景        层级
  状态

【会议议程组】
  议程项动态管理（见 D.4.5）
```

**字段样式**：

```
表单网格：
- display: grid
- grid-template-columns: 1fr 1fr
- gap: 16px 24px

单列字段（会议名称、会议链接）：
- grid-column: 1 / -1

标签：
- font-size: 13px
- font-weight: 500
- color: var(--text-secondary)
- margin-bottom: 6px

输入框：
- height: 40px
- padding: 0 12px
- border: 1px solid var(--border)
- border-radius: 6px
- font-size: 14px
- background: var(--bg-card)
- 聚焦：border-color: var(--primary), box-shadow: 0 0 0 3px var(--primary-light)

必填标识：
- 标签后加红色 *，font-size: 12px

错误状态：
- border-color: var(--danger)
- 下方显示错误文案：font-size: 12px, color: var(--danger)
```

**字段详细定义**：

| 字段 | 类型 | 必填 | 校验规则 |
|------|------|------|---------|
| 会议名称 | text | ✅ | 非空，最长 100 字 |
| 会议日期 | date | ✅ | 合法日期格式 |
| 地点 | text | | 最长 50 字 |
| 主持人 | text | | 最长 20 字 |
| 记录人 | text | | 最长 20 字 |
| 会议场景 | select | | 5 选项：集团级经营例会 / 产品线经营例会 / 区域经营例会 / 战略专项评审会 / 其他 |
| 层级 | select | | 3 选项：L1 / L2 / L3 |
| 状态 | select | | 4 选项：planned / in_progress / completed / cancelled |
| 会议链接 | text（URL） | | 如有值需符合 URL 格式（以 http:// 或 https:// 开头）|

#### D.4.4 数据校验与反馈

**保存前校验**：

```javascript
function validateMeetingForm(data) {
  const errors = {};
  if (!data.name || data.name.trim() === '') {
    errors.name = '会议名称不能为空';
  }
  if (!data.date) {
    errors.date = '请选择会议日期';
  }
  if (data.meeting_link && !data.meeting_link.startsWith('http')) {
    errors.meeting_link = '链接格式不正确，需以 http:// 或 https:// 开头';
  }
  // 议程项校验
  data.agenda.forEach((item, i) => {
    if (!item.title || item.title.trim() === '') {
      errors[`agenda_${i}`] = `议程第 ${i+1} 项标题不能为空`;
    }
    if (!item.duration || item.duration < 1) {
      errors[`agenda_${i}_duration`] = `议程第 ${i+1} 项时长需为正整数`;
    }
  });
  return errors;
}
```

**校验失败时**：
- 错误字段边框变红，下方显示错误文案
- 页面自动滚动到第一个错误字段
- 保存按钮恢复可点击状态

**保存成功时**：
- 将 `window._editingMeeting` 写回 `window._meetingsData` 对应项
- 调用 `apiSave('/api/meetings', meetings)` 同步后端
- 关闭编辑页面
- 刷新主视图数据（重新渲染主视图内容区）

#### D.4.5 议程项动态管理

**布局**：

```
议程组标题：
- "📋 会议议程"，font-size: 16px, font-weight: 700
- 右侧：总时长 "预计 XX 分钟"，font-size: 13px, color: var(--text-secondary)

议程列表容器：
- display: flex
- flex-direction: column
- gap: 12px
- margin: 12px 0

单条议程项：
- background: var(--bg-card)
- border: 1px solid var(--border-light)
- border-radius: 8px
- padding: 12px 16px
- display: grid
- grid-template-columns: auto 1fr auto auto auto
- gap: 12px
- align-items: center

议程项内部：
- 类型选择器：select，width: 100px（经营报告/专题研讨/决策事项/其他）
- 标题输入：text，flex: 1，placeholder "议程标题"
- 时长输入：number，width: 80px，placeholder "分钟"
- 负责人输入：text，width: 100px，placeholder "负责人"
- 操作按钮组：
  - [↑] 上移
  - [↓] 下移
  - [×] 删除（仅剩1项时禁用）
```

**交互规则**：

| 操作 | 行为 | 限制 |
|------|------|------|
| 添加议程项 | 列表末尾追加空议程项 | 无上限 |
| 删除议程项 | 移除当前项 | 至少保留 1 项，仅剩1项时删除按钮 disabled |
| 上移 | 与上一项交换位置 | 第1项不可上移 |
| 下移 | 与下一项交换位置 | 最后1项不可下移 |
| 时长变更 | 实时累加总时长 | 仅允许正整数 |

**总时长计算**：

```javascript
const totalMinutes = agenda.reduce((sum, item) => sum + (parseInt(item.duration) || 0), 0);
// 显示格式："预计 90 分钟" 或 "预计 1小时30分钟"
```

#### D.4.6 决议编辑

**布局**：

```
决议组标题：
- "📋 决议"，font-size: 16px, font-weight: 700

决议列表容器：
- display: flex
- flex-direction: column
- gap: 12px
- margin: 12px 0

单条决议项：
- background: var(--bg-card)
- border: 1px solid var(--border-light)
- border-radius: 8px
- padding: 12px 16px
- display: grid
- grid-template-columns: 1fr auto auto auto
- gap: 12px
- align-items: center

决议项内部：
- 决议内容输入：text，placeholder "决议内容"
- 决策人输入：text，width: 100px，placeholder "决策人"
- 状态选择器：select（已确认 / 已推翻）
- 操作按钮：[×] 删除

底部：
- [+ 添加决议] 按钮：次要按钮样式
```

> **说明**：决议项无顺序要求，无需上移/下移。可全部删除（决议为空时，主视图"决策"标签显示空状态）。

#### D.4.7 行动(TODO)项编辑

**布局**：

```
行动(TODO)组标题：
- "✅ 行动(TODO)"，font-size: 16px, font-weight: 700

行动(TODO)列表容器：
- display: flex
- flex-direction: column
- gap: 12px
- margin: 12px 0

单条行动(TODO)项：
- background: var(--bg-card)
- border: 1px solid var(--border-light)
- border-radius: 8px
- padding: 12px 16px
- display: grid
- grid-template-columns: auto 1fr auto auto auto auto
- gap: 12px
- align-items: center

行动(TODO)项内部：
- 状态选择器：select（已完成 / 进行中 / 暂停）
- 内容输入：text，placeholder "行动(TODO)内容"
- 负责人输入：text，width: 100px，placeholder "负责人"
- 截止日期：date 输入，width: 130px
- 关联决议：select（可选，下拉显示当前所有决议内容的前15字）
- 操作按钮：[×] 删除

底部：
- [+ 添加行动(TODO)] 按钮：次要按钮样式
```

> **说明**：行动(TODO)项无顺序要求。可全部删除。关联决议下拉框无选项时显示"-- 不关联决议 --"。

#### D.4.8 底部操作

```
左侧：
- 🗑️ 删除会议：次要危险按钮样式
  - 点击弹出确认弹窗："确定删除该会议？此操作不可撤销。"
  - 确认后：从 meetings 数组移除该会议，apiSave，关闭编辑页面，返回会议列表

右侧：
- [取消] 按钮：次要按钮样式
  - 点击：关闭编辑页面，返回主视图，**不保存任何修改**
  - 若表单有修改：弹出确认 "是否放弃未保存的修改？"
- [保存] 按钮：主按钮样式
  - 点击：先执行 validateMeetingForm，通过后才保存
  - 保存中：按钮显示 "保存中..." 并禁用，防止重复提交
```

#### D.4.7 取消时的未保存提示

```javascript
// 编辑页面关闭前检查
function hasUnsavedChanges() {
  const original = meetings.find(m => m.id === window._editingMeeting.id);
  return JSON.stringify(original) !== JSON.stringify(window._editingMeeting);
}

// 点击取消或关闭按钮时
if (hasUnsavedChanges()) {
  // 弹出确认
  const confirmed = confirm('您有未保存的修改，确定要放弃吗？');
  if (!confirmed) return; // 留在编辑页面
}
// 关闭编辑页面
```

#### D.4.8 实现要点（编辑页面）

1. **数据隔离**：编辑页面必须操作 `window._editingMeeting` 的深拷贝，不能直接修改 `window._meetingsData`
2. **保存原子性**：校验通过 → 写回数据 → API 同步 → 关闭页面 → 刷新主视图，任一步失败则回滚
3. **议程项渲染**： agenda 数组变更后需重新渲染整个议程列表（因序号需要重新计算）
4. **z-index**：编辑页面 2100，主视图 2000，编辑页面关闭后回到主视图

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
- [ ] 主视图包含4个标签：纪要（默认）、行动(TODO)、决策、会议链
- [ ] 标签导航栏有选中高亮下划线，切换流畅
- [ ] "纪要"标签展示议程时间线（顶部节点轴 + 议程详情卡片 + 总时长统计）
- [ ] "行动(TODO)"标签展示行动(TODO)项列表（状态图标 + 内容 + 负责人 + 截止日期）
- [ ] "决策"标签展示决议列表
- [ ] "会议链"标签展示上下游关联会议（上游 → 当前 → 下游）
- [ ] 议程卡片有左侧彩色竖线（按议题类型区分颜色）
- [ ] 一报一会流程段在标签导航栏上方常驻显示，不适用时直接隐藏
- [ ] 会议链接在左侧基本信息面板底部直接展示，不在标签内
- [ ] 效果评估和原则管理不在主视图标签中
- [ ] 主视图有"✏️ 编辑"按钮，点击打开全屏编辑页面
- [ ] 编辑页面加载时正确回显当前会议的所有字段（深拷贝，不直接修改原数据）
- [ ] 基本信息表单：两列布局，必填字段带 * 标识，聚焦有蓝色边框
- [ ] 会议名称/日期为空时保存，显示错误提示并阻止保存
- [ ] 会议链接格式非法时保存，显示错误提示
- [ ] 议程项可添加、删除（至少保留1项）、上移、下移
- [ ] 议程时长变更时总时长实时更新
- [ ] 议程项标题/时长为空时保存，显示错误提示
- [ ] 底部保存按钮点击后先校验，通过后才写入数据并关闭页面
- [ ] 保存中按钮显示"保存中..."并禁用，防止重复提交
- [ ] 取消/关闭时如有未保存修改，弹出确认提示
- [ ] 删除会议有二次确认弹窗，确认后从列表移除
- [ ] 保存成功后主视图数据刷新，修改立即生效
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
打开【当日会议浮层】（小型弹窗，z-index: 2200）
  ├─ 头部：日期 + "N 场会议" + [✕ 关闭] 按钮
  ├─ 会议列表：当天全部会议（与列表页卡片样式一致，迷你版）
  ├─ 底部：[+ 新建会议] 按钮（默认日期为该日）
  └─ 关闭方式：
      - 点击 ✕ 按钮
      - 点击浮层外部背景遮罩
      - 按 ESC 键
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

