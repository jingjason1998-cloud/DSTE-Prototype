# SP 战略规划模块 — 优化设计方案 v0.5

> **版本**: v0.5  
> **日期**: 2026-06-11  
> **状态**: 设计评审  
> **目标版本**: v0.5.0 ~ v0.6.0

---

## 一、现状诊断

### 1.1 当前 SP 模块结构

| 页面 | 功能 | 问题 |
|------|------|------|
| 战略地图 | BSC 四维度展示 + 目标 CRUD | 仅展示层，缺少规划过程引导 |
| 战略洞察与专题 | 五看洞察 + 专题管理 | 洞察到战略无闭环，专题与战略地图弱关联 |

### 1.2 核心痛点

1. **流程缺失**：SP 是一个"结果展示"而非"过程引导"，没有体现从差距→洞察→机会→VDBD 价值驱动业务设计→战略地图→战略选择的完整方法论链路
2. **工具单薄**：缺少差距分析、战略意图、VDBD 价值驱动业务设计等战略规划关键工具
3. **关联薄弱**：洞察 → 专题 → 战略地图 → KPI 之间的数据流转未打通
4. **无评审机制**：缺少战略评审、共识达成、版本管理的支撑
5. **方法论隐性**：使用了 BSC/五看等方法论但未显性化，对用户无方法论引导

---

## 二、方法论框架

### 2.1 参考模型

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SP 战略规划 — 方法论融合框架                        │
├─────────────────────────────────────────────────────────────────────┤
│  BLM 业务领先模型        │    华为 DSTE SP 流程     │    BSC 战略地图   │
│  ─────────────────       │    ────────────────      │    ───────────   │
│  • 差距分析              │    • 战略方向            │    • 四维度目标   │
│  • 战略意图              │    • 市场洞察(五看)       │    • 因果链      │
│  • 市场洞察              │    • 战略机会点          │    • 战略举措     │
│  • 创新焦点              │    • 战略控制点          │    • KPI 承接    │
│  • VDBD 价值驱动业务设计  │    • VDBD 价值驱动业务设计 │                  │
│  • 关键任务              │    • 战略地图            │                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 优化后的 SP 流程

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────────┐
│ 差距分析 │ → │ 战略意图 │ → │ 市场洞察 │ → │ 战略机会 │ → │ 价值驱动业务设计 │
│ Gap      │    │ Intent   │    │ Insights │    │ Options  │    │ VDBD             │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────────────┘
                                                                           ↓
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────────┐
│ 战略评审 │ ← │ 战略专题 │ ← │ 战略地图 │ ← │ 控制点   │ ← │                  │
│ Review   │    │ Topics   │    │ Map(BSC)│    │ Control  │    │                  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────────────┐
│                         输出 → BP 战略解码                            │
│  战略目标 → KPI 指标库  │  战略专题 → 年度重点工作  │  VDBD → 年度经营计划 │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 三、优化后的 SP 模块架构

### 3.1 导航结构（新版）

```
🎯 战略制定 (SP)
│
├── 📋 SP 流程总览          ← 新增：流程导航 + 各阶段状态仪表盘
├── 📉 差距分析             ← 新增：业绩差距 + 机会差距 + 根因分析
├── 🎯 战略意图             ← 新增：使命愿景 + 战略目标 + 里程碑
├── 🔭 市场洞察             ← 增强：五看 + PESTEL + SWOT
├── 💎 战略机会点           ← 新增：机会识别 + SPAN 矩阵 + 筛选
├── 🏗️ 价值驱动业务设计(VDBD) ← 新增：VDBD 六要素画布 + 价值量化
├── 🗺️ 战略地图             ← 增强：BSC + 因果链 + 举措映射
├── 📌 战略专题             ← 增强：与机会点强关联 + 举措细化
└── ✅ 战略评审             ← 新增：评审检查 + 版本管理 + 共识记录
```

### 3.2 与现有模块的衔接

```
SP 模块输出                      BP 模块输入
─────────────────────────────────────────────────
战略目标 (战略地图)      →      KPI 指标体系 (bp/kpi)
战略专题                 →      年度经营计划 (bp/annual-plan)
VDBD → 关键任务          →      BEM 战略解码 (bp/bem)
战略控制点               →      重点工作管理 (exe/tasks)
```

---

## 四、各子模块详细设计

---

### 4.1 SP 流程总览（新增）

**定位**：SP 模块的入口页面，提供战略规划全流程的可视化导航和各阶段状态仪表盘。

**核心功能**：

1. **流程管线图**
   - 8 个阶段横向流程图，每个节点可点击跳转
   - 节点状态：未开始 / 进行中 / 已完成 / 需评审
   - 阶段间的依赖关系可视化（前置阶段未完成时后续阶段置灰）

2. **阶段状态仪表盘**
   ```
   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
   │差距分析 │  │战略意图 │  │市场洞察 │  │机会点   │
   │  ✅ 完成 │  │ 🔄 进行 │  │ ✅ 完成 │  │ ⏳ 未开始│
   │ 3项差距 │  │ 目标待确│  │ 12条洞察│  │ 0个机会 │
   └─────────┘  └─────────┘  └─────────┘  └─────────┘
   ```

3. **SP 版本管理**
   - 当前规划周期（如 2026-2028）
   - 历史版本对比（上一年度 SP 的演进）
   - 版本状态：草稿 / 评审中 / 已发布 / 已归档

4. **关键指标卡片**
   - 战略意图完成度
   - 洞察 → 机会转化率
   - 机会 → 专题转化率
   - 战略地图目标覆盖率

**数据模型**：
```typescript
interface SPWorkflow {
  id: string;
  cycle: { startYear: number; endYear: number; label: string };
  version: number;
  status: 'draft' | 'reviewing' | 'published' | 'archived';
  stages: {
    gapAnalysis: StageStatus;
    strategicIntent: StageStatus;
    marketInsight: StageStatus;
    strategicOptions: StageStatus;
    businessDesign: StageStatus;
    strategyMap: StageStatus;
    strategyTopics: StageStatus;
    strategyReview: StageStatus;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

interface StageStatus {
  status: 'not_started' | 'in_progress' | 'completed' | 'needs_review';
  completedAt?: string;
  completedBy?: string;
  itemCount: number;
}
```

---

### 4.2 差距分析（新增）

**定位**：战略规划的起点，识别"我们在哪里"和"我们应该在哪里"之间的缺口。

**方法论**：BLM 差距分析 = 业绩差距（Performance Gap）+ 机会差距（Opportunity Gap）

**核心功能**：

1. **业绩差距分析**
   - 维度选择：收入、利润、市场份额、客户数、NPS 等
   - 实际值 vs 目标值对比（支持多年度趋势线）
   - 差距值自动计算
   - 差距根因分析（5 Whys 结构化输入）
   - 根因分类：外部因素 / 内部能力 / 执行问题 / 战略偏差

2. **机会差距分析**
   - 对标对象选择（竞品 / 行业标杆 / 理论最优）
   - 我方现状 vs 对标方对比
   - 机会值量化
   - 机会窗口时间评估

3. **差距汇总视图**
   - 差距矩阵（影响程度 × 紧急程度）
   - 差距趋势图（历史对比）
   - 关键差距 TOP N 列表

4. **差距 → 洞察关联**
   - 将差距与"看自己"的洞察自动关联
   - 标记哪些差距需要通过战略调整来弥补

**页面布局**：
```
┌────────────────────────────────────────────────────────────┐
│ 差距分析                              [+ 新增差距分析]      │
├────────────────────────────────────────────────────────────┤
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│ │ 业绩差距 5项 │  │ 机会差距 3项 │  │ 待根因分析 2项│          │
│ │ ¥2.3亿缺口  │  │ ¥1.8亿机会  │  │             │          │
│ └─────────────┘  └─────────────┘  └─────────────┘          │
├────────────────────────────────────────────────────────────┤
│ [业绩差距] [机会差距] [差距矩阵]                            │
│                                                            │
│ 差距列表                                                    │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 指标        目标值    实际值    差距      根因        │   │
│ │ 销售收入    15亿      12.7亿    -2.3亿    ⚠️ 待分析  │   │
│ │ 毛利率      35%       32%       -3pp      ✅ 已分析   │   │
│ └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**数据模型**：
```typescript
interface GapAnalysis {
  id: string;
  type: 'performance' | 'opportunity';
  metric: string;              // 指标名称
  metricUnit: string;          // 单位（亿、%、个等）
  targetValue: number;
  actualValue: number;
  gapValue: number;
  gapRate: number;             // 差距率

  // 业绩差距特有
  period: string;              // 分析周期
  historyData: { year: number; target: number; actual: number }[];

  // 机会差距特有
  benchmarkSource: string;     // 对标来源
  benchmarkValue: number;
  opportunityWindow: string;   // 机会窗口期

  // 根因分析
  rootCause?: {
    category: 'external' | 'capability' | 'execution' | 'strategy';
    analysis: string;          // 5 Whys 分析文本
    keyFactors: string[];      // 关键因素
    linkedInsightIds: string[];
  };

  // 是否需要战略调整来弥补
  needsStrategicAction: boolean;
  priority: 'high' | 'medium' | 'low';
}
```

---

### 4.3 战略意图（新增）

**定位**：明确"我们要去哪里"，回答方向性问题。

**方法论**：BLM 战略意图 = 使命（Mission）+ 愿景（Vision）+ 战略目标（Strategic Objectives）

**核心功能**：

1. **使命愿景（MVV）**
   - 使命（Mission）：我们为什么存在
   - 愿景（Vision）：我们要成为什么
   - 价值观（Values）：支撑行为准则
   - 支持 Markdown 富文本编辑
   - 版本历史对比

2. **战略目标设定**
   - 财务目标：收入、利润、ROI、EVA 等
   - 市场目标：市场份额、客户数、区域覆盖等
   - 能力目标：技术领先度、组织效能、人才密度等
   - 每个目标关联 BSC 维度

3. **战略目标里程碑**
   - 三年规划时间线（如 2026-2028）
   - 年度分解目标
   - 里程碑节点标注
   - 甘特图可视化

4. **战略意图健康度评估**
   - SMART 原则检查（具体、可衡量、可达成、相关、有时限）
   - 一致性检查（目标间是否冲突）
   - 挑战性评估（是否足够 ambitious）

**页面布局**：
```
┌────────────────────────────────────────────────────────────┐
│ 战略意图                                                    │
├────────────────────────────────────────────────────────────┤
│ [使命愿景] [战略目标] [里程碑] [健康度检查]                  │
│                                                            │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 使命                                                   │   │
│ │ ┌─────────────────────────────────────────────────┐ │   │
│ │ │ 为客户提供领先的数字化转型解决方案，创造可持续   │ │   │
│ │ │ 的业务价值...                                      │ │   │
│ │ └─────────────────────────────────────────────────┘ │   │
│ │                                                        │   │
│ │ 愿景                                                   │   │
│ │ ┌─────────────────────────────────────────────────┐ │   │
│ │ │ 成为行业数字化转型的首选合作伙伴，2028年营收破50亿 │ │   │
│ │ └─────────────────────────────────────────────────┘ │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                            │
│ 战略目标（6项）                                            │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ BSC维度   目标              2026    2027    2028   │   │
│ │ ───────────────────────────────────────────────────  │   │
│ │ 财务      销售收入(亿)      18      24      35     │   │
│ │ 财务      毛利率            35%     38%     40%    │   │
│ │ 客户      客户续约率        85%     88%     90%    │   │
│ │ ...                                                │   │
│ └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**数据模型**：
```typescript
interface StrategicIntent {
  id: string;
  cycleId: string;             // 关联 SP 周期

  // 使命愿景
  mission: string;
  vision: string;
  values: string[];

  // 战略目标
  objectives: StrategicObjective[];

  // 健康度检查
  healthCheck?: {
    smartScore: number;        // SMART 得分 0-100
    consistencyScore: number;  // 一致性得分
    challengeScore: number;    // 挑战性得分
    issues: string[];
  };
}

interface StrategicObjective {
  id: string;
  name: string;
  description: string;
  bscDimension: 'financial' | 'customer' | 'process' | 'learning';
  targetUnit: string;
  annualTargets: {
    year: number;
    target: number;
    milestone?: string;
  }[];
  baseline: {                  // 基线数据
    year: number;
    value: number;
  };
  owner: string;
}
```

---

### 4.4 市场洞察（增强现有）

**定位**：系统性地扫描外部环境，为战略机会识别提供输入。

**方法论**：华为"五看" + PESTEL + SWOT

**核心功能（在现有基础上增强）**：

1. **五看洞察（已有，保留）**
   - 看趋势、看客户、看竞争、看自己、看机会
   - 增强：洞察关联差距分析、洞察影响力评分、洞察时间轴

2. **PESTEL 宏观分析（新增）**
   - Political（政治）、Economic（经济）、Social（社会）
   - Technological（技术）、Environmental（环境）、Legal（法律）
   - 每个维度结构化输入：因素描述 + 影响评估 + 战略启示

3. **SWOT 矩阵（新增）**
   - 自动从洞察生成 SWOT 初稿
   - 优势（S）、劣势（W）、机会（O）、威胁（T）
   - SO / WO / ST / WT 交叉策略建议

4. **洞察汇聚看板（新增）**
   - 洞察影响力 × 置信度矩阵
   - 洞察时间线（按发现时间排列）
   - 洞察来源分布统计
   - 洞察 → 机会点转化追踪

5. **洞察关联增强**
   - 洞察可关联差距分析项
   - 洞察可关联战略专题
   - 洞察可关联战略机会点

**页面布局**：
```
┌────────────────────────────────────────────────────────────┐
│ 市场洞察                                       [+ 新增洞察] │
├────────────────────────────────────────────────────────────┤
│ [五看洞察] [PESTEL] [SWOT] [洞察看板]                       │
│                                                            │
│ 五看卡片（保留现有设计，增加转化指标）                       │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│ │看趋势   │ │看客户   │ │看竞争   │ │看自己   │ │看机会   │   │
│ │  📈    │ │  👥    │ │  ⚔️    │ │  🔍    │ │  💡    │   │
│ │  5条   │ │  3条   │ │  2条   │ │  4条   │ │  6条   │   │
│ │→2机会  │ │→1机会  │ │→0机会  │ │→2差距  │ │→3机会  │   │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘   │
│                                                            │
│ 洞察影响力矩阵（新增）                                      │
│        影响高 │  ● 大客户定制需求增长                      │
│             │  ● 东南亚市场窗口期                          │
│        影响中 │     ● 竞品A低代码平台                      │
│             │                                            │
│        影响低 │     ● ...                                  │
│             └──────────────────────────────────────       │
│                低置信度              高置信度               │
└────────────────────────────────────────────────────────────┘
```

**数据模型（扩展）**：
```typescript
// 扩展现有 Insight 模型
interface Insight {
  id: string;
  type: 'trend' | 'customer' | 'competitor' | 'self' | 'opportunity';
  title: string;
  content: string;
  source: string;
  confidence: number;          // 0-100
  impact: 'high' | 'medium' | 'low';
  impactScore: number;         // 1-10 量化影响
  createdAt: string;

  // 新增字段
  linkedGapIds: string[];      // 关联差距分析
  linkedOptionIds: string[];   // 关联战略机会点
  linkedTopicIds: string[];    // 关联战略专题
  linkedInsightIds: string[];  // 关联其他洞察（推导关系）

  // PESTEL 分类（新增）
  pestelCategory?: 'political' | 'economic' | 'social' | 'technological' | 'environmental' | 'legal';

  // SWOT 分类（自动/手动）
  swotCategory?: 'strength' | 'weakness' | 'opportunity' | 'threat';

  // 转化追踪
  convertedToOption: boolean;
  convertedToTopic: boolean;
}
```

---

### 4.5 战略机会点（新增）

**定位**：从洞察中识别并筛选战略机会，回答"我们可以去哪里"。

**方法论**：SPAN 图（战略定位分析）= 细分市场吸引力 × 竞争地位

**核心功能**：

1. **机会点识别**
   - 从洞察一键生成机会点（带关联关系）
   - 手动创建机会点
   - 机会点描述模板：市场/客户/规模/窗口期/关键假设

2. **机会点评估矩阵（SPAN）**
   - 横轴：细分市场吸引力（市场规模、增长率、利润空间）
   - 纵轴：公司竞争地位（市场份额、核心能力匹配度、资源投入能力）
   - 气泡大小：预计收入规模
   - 四象限：明星 / 增长 / 收获 / 退出

3. **机会点详细评估**
   - 市场吸引力评分（多维度加权）
   - 竞争地位评分（多维度加权）
   - 风险与假设清单
   - 资源需求预估
   - 机会窗口期

4. **机会点筛选决策**
   - 投票/评分机制
   - 决策记录（选/不选/待定 + 理由）
   - 筛选结果汇总

5. **机会点 → VDBD 关联**
   - 选中的机会点直接进入 VDBD 画布
   - 机会点评估数据（市场吸引力、竞争地位、预估规模）自动带入 VDBD 价值量化字段

**页面布局**：
```
┌────────────────────────────────────────────────────────────┐
│ 战略机会点                                    [+ 新建机会点] │
├────────────────────────────────────────────────────────────┤
│ [机会列表] [SPAN矩阵] [筛选决策]                            │
│                                                            │
│ SPAN 战略定位分析图（新增）                                 │
│                                                            │
│     竞争地位高 │  ★明星      │  增长型                    │
│                │  ●核心产品升级                                    │
│                │  ●海外SaaS    │  ●AI智能化                  │
│                │                                    │                │
│     竞争地位中 │─────────────┼─────────────                │
│                │                                    │                │
│                │  收获型      │  ×退出                     │
│     竞争地位低 │  ●传统项目交付│  ●低端标准化产品            │
│                └──────────────────────────────────────      │
│                  吸引力低                  吸引力高          │
│                                                            │
│ 机会点列表                                                  │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 机会点              吸引力  竞争地位  预估规模  决策   │   │
│ │ ───────────────────────────────────────────────────  │   │
│ │ 海外SaaS市场拓展    9.2     7.5       ¥5亿/年  ✅ 选中│   │
│ │ AI智能化产品升级    8.8     8.0       ¥3亿/年  ✅ 选中│   │
│ │ 大客户定制化平台    6.5     7.0       ¥2亿/年  ⏳ 待定│   │
│ └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**数据模型**：
```typescript
interface StrategicOption {
  id: string;
  name: string;
  description: string;

  // 来源
  sourceInsightIds: string[];
  createdFrom: 'insight' | 'manual';

  // 市场评估
  marketAttractiveness: {
    marketSize: number;        // 市场规模（亿元）
    growthRate: number;        // 年增长率 %
    profitMargin: number;      // 行业平均利润率 %
    score: number;             // 综合得分 1-10
  };

  // 竞争地位评估
  competitivePosition: {
    marketShare: number;       // 当前市场份额 %
    capabilityMatch: number;   // 能力匹配度 1-10
    resourceAvailability: number; // 资源可得性 1-10
    score: number;             // 综合得分 1-10
  };

  // SPAN 定位
  spanQuadrant: 'star' | 'grow' | 'harvest' | 'exit';

  // 财务预估
  estimatedRevenue: number;    // 预估年收入（万元）
  estimatedInvestment: number; // 预估投入（万元）
  paybackPeriod: number;       // 回报周期（月）

  // 风险与假设
  keyAssumptions: string[];
  risks: { description: string; probability: 'high' | 'medium' | 'low'; impact: 'high' | 'medium' | 'low' }[];

  // 机会窗口
  opportunityWindow: { start: string; end: string; description: string };

  // 决策
  decision: {
    status: 'selected' | 'rejected' | 'pending';
    decidedAt?: string;
    decidedBy?: string;
    reason: string;
  };

  // 关联
  linkedBusinessDesignId?: string;
  linkedTopicIds: string[];
}
```

---

### 4.6 价值驱动业务设计（VDBD）

**定位**：针对选中的战略机会点，用 VDBD（Value-Driven Business Design）方法论设计"如何赢"的业务模式。强调以价值创造为主线，回答"为谁创造价值、创造什么价值、如何获取价值、如何持续创造价值"。

**方法论**：VDBD 六要素 = 客户选择 + 价值主张 + 价值获取 + 活动范围 + 持续价值 + 风险管理

> 设计原则：**显性框架 + 有机表达**。页面框架采用 VDBD 六要素，但引导语言自然化，避免方法论术语堆砌；每个要素内置价值量化字段，帮助用户从"定性描述"走向"定量验证"。

**核心功能**：

1. **VDBD 画布**
   - 六要素结构化输入界面
   - 每个要素提供自然化的引导问题（而非术语定义）
   - 画布可视化展示，中心突出"价值"主线

2. **六要素详细设计（含价值量化）**

   | VDBD 要素 | 引导问题 | 内容 | 价值量化字段 |
   |----------|---------|------|-------------|
   | **客户选择** | 我们要为哪些客户创造价值？ | 目标客户群体、选择标准、优先级 | 客户 LTV、客户规模、获客成本 |
   | **价值主张** | 我们为客户创造什么独特价值？ | 差异化优势、解决的核心痛点 | 价值量化指标、客户愿意支付溢价 |
   | **价值获取** | 我们如何获取合理的价值回报？ | 定价模式、收入来源、成本结构 | 单位经济模型（UE）、毛利率、ROI |
   | **活动范围** | 我们做什么、不做什么、和谁一起做？ | 价值链定位、自研/外包/合作 | 内部成本 vs 外部成本 |
   | **持续价值** | 我们如何保持长期领先？ | 战略控制点、护城河、壁垒 | 控制点价值贡献、竞争壁垒强度 |
   | **风险管理** | 哪些关键假设和风险会影响价值实现？ | 风险清单、应对预案 | 风险对价值的潜在影响金额 |

3. **价值流视图（新增）**
   - 横向展示：客户价值 → 产品/服务价值 → 公司价值
   - 自动汇总各要素的价值量化数据
   - 价值传导路径可视化
   - 价值缺口提醒（如价值主张强但价值获取弱）

4. **VDBD 画布对比**
   - 多个机会点的 VDBD 画布并列对比
   - 当前 vs 未来 VDBD 对比
   - 价值量化指标对比雷达图

5. **VDBD → 关键任务**
   - 从 VDBD 自动提取关键任务清单
   - 任务关联 VDBD 要素
   - 任务进入战略专题管理

6. **VDBD 帮助入口**
   - 页面右上角提供"VDBD 方法说明"入口
   - 默认折叠，点击后展开方法论简介和每个要素的解释
   - 不干扰主流程

**页面布局**：
```
┌─────────────────────────────────────────────────────────────────────┐
│ 价值驱动业务设计（VDBD）                          [? VDBD 方法说明]  │
├─────────────────────────────────────────────────────────────────────┤
│ 当前机会点：海外 SaaS 市场拓展、AI 智能化产品升级                    │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │                      VDBD 价值主线                              │  │
│ │  为谁创造价值  →  创造什么价值  →  获取什么价值  →  持续创造价值  │  │
│ │     客户选择   →   价值主张    →   价值获取    →   持续价值     │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │                      VDBD 六要素画布                            │  │
│ │                                                               │  │
│ │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │  │
│ │  │ 客户选择     │  │ 价值主张     │  │ 价值获取     │           │  │
│ │  │ 东南亚中小   │  │ 本地化+低   │  │ 订阅制+增值 │           │  │
│ │  │ 企业        │  │ 门槛+生态   │  │ 服务        │           │  │
│ │  │ LTV: ¥8万   │  │ 溢价: 20%   │  │ UE: 正向    │           │  │
│ │  └─────────────┘  └─────────────┘  └─────────────┘           │  │
│ │                                                               │  │
│ │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │  │
│ │  │ 活动范围     │  │ 持续价值     │  │ 风险管理     │           │  │
│ │  │ 聚焦产品     │  │ 本地化生态  │  │ 政策变化    │           │  │
│ │  │ 本地运营    │  │ 壁垒+数据   │  │ 汇率波动    │           │  │
│ │  │ 伙伴交付    │  │ 网络效应   │  │ 竞争加剧    │           │  │
│ │  │ 内部成本    │  │ 控制点强度  │  │ 潜在影响    │           │  │
│ │  └─────────────┘  └─────────────┘  └─────────────┘           │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ 价值流视图（新增）                                                   │
│ ┌──────────────┬──────────────┬──────────────┬──────────────┐     │
│ │ 客户获得价值  │ 产品创造价值  │ 公司获取价值  │ 长期持续价值  │     │
│ │ 效率提升 30% │ 订阅收入 ¥5亿│ 毛利率 45%   │ 壁垒强度 8/10│     │
│ └──────────────┴──────────────┴──────────────┴──────────────┘     │
│                                                                     │
│ 关键任务（从 VDBD 提取）                                             │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ 任务                  来源要素        优先级   状态           │   │
│ │ ──────────────────────────────────────────────────────────   │   │
│ │ 建立本地化数据中心     活动范围        P0      待启动         │   │
│ │ 签约3家本地渠道伙伴    客户选择        P0      进行中         │   │
│ │ 开发多语言版本        价值主张        P1      规划中         │   │
│ └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

**数据模型**：
```typescript
interface VDBDDesign {
  id: string;
  name: string;
  linkedOptionId: string;      // 关联的战略机会点

  // VDBD 六要素 + 价值量化
  customerSelection: {
    targetSegments: string[];
    selectionCriteria: string;
    priorityRanking: string;
    valueQuantification: {
      totalAddressableMarket: number;  // TAM（万元）
      customerLifetimeValue: number;   // LTV（元/客户）
      customerAcquisitionCost: number; // CAC（元/客户）
      targetCustomerCount: number;     // 目标客户数
    };
  };

  valueProposition: {
    uniqueValue: string;
    painPointsSolved: string[];
    differentiation: string;
    valueQuantification: {
      customerValueMetrics: string[];  // 客户价值量化指标，如"效率提升30%"
      willingnessToPayPremium: number; // 客户愿意支付的溢价比例 %
      valueProofPoints: string[];      // 价值证明点
    };
  };

  valueCapture: {
    pricingModel: string;
    revenueStreams: string[];
    costStructure: string;
    profitModel: string;
    valueQuantification: {
      unitEconomics: {                 // 单位经济模型
        arpu: number;                  // 客单价（元）
        grossMargin: number;           // 毛利率 %
        paybackPeriod: number;         // CAC 回收周期（月）
        ltvCacRatio: number;           // LTV/CAC 比值
      };
      projectedRevenue: number;        // 预计年收入（万元）
      projectedRoi: number;            // 预计 ROI %
    };
  };

  activityScope: {
    valueChainPosition: string;
    inHouseActivities: string[];
    outsourcedActivities: string[];
    partnershipActivities: string[];
    valueQuantification: {
      inHouseCost: number;             // 内部成本（万元）
      outsourcedCost: number;          // 外包成本（万元）
      partnershipInvestment: number;   // 合作投入（万元）
    };
  };

  sustainableAdvantage: {
    strategicControlPoints: string[];  // 战略控制点
    moatDescription: string;           // 护城河描述
    barrierToEntry: string[];
    valueQuantification: {
      controlPointStrength: number;    // 控制点强度 1-10
      valueContribution: number;       // 控制点价值贡献（万元/年）
      sustainabilityYears: number;     // 可持续年限
    };
  };

  riskManagement: {
    risks: { description: string; probability: string; impact: string; mitigation: string }[];
    contingencyPlans: string[];
    valueQuantification: {
      maxPotentialValueLoss: number;   // 风险可能导致的最大价值损失（万元）
      keyAssumptions: string[];        // 关键假设清单
      assumptionValidationPlan: string; // 假设验证计划
    };
  };

  // 价值流汇总（自动计算）
  valueFlowSummary?: {
    customerValue: string;
    productValue: string;
    companyValue: string;
    sustainableValue: string;
    overallValueScore: number;         // 综合价值得分 0-100
  };

  // 提取的关键任务
  keyTasks: KeyTask[];
}

interface KeyTask {
  id: string;
  name: string;
  sourceElement: string;       // 来源 VDBD 要素
  priority: 'P0' | 'P1' | 'P2';
  status: 'pending' | 'planning' | 'in_progress' | 'completed';
  owner: string;
  dueDate: string;
}
```

---

### 4.7 战略地图（增强现有）

**定位**：将战略规划成果转化为 BSC 四维度战略目标体系，建立目标间的因果链。

**方法论**：BSC 平衡计分卡 + 战略地图因果链

**核心功能（在现有基础上增强）**：

1. **BSC 四维度目标（已有，保留并增强）**
   - 保留现有四维度展示
   - 增强：目标关联战略机会点、目标关联 VDBD
   - 增强：目标支持多级分解（公司级 → 部门级）

2. **因果链增强（增强）**
   - 现有 SVG 贝塞尔曲线连接保留
   - 新增：因果链编辑模式（拖拽连接）
   - 新增：因果链验证（检测循环依赖、断链）
   - 新增：因果链影响力模拟（调整某目标，预测对其他目标的影响）

3. **战略举措映射（新增）**
   - 每个目标关联具体的战略举措/关键任务
   - 举措来自 VDBD 的关键任务
   - 举措进度自动汇总到目标

4. **KPI 预关联（新增）**
   - 目标与 KPI 指标预关联（为 BP 模块做准备）
   - 显示 KPI 指标的建议列表
   - 支持从目标一键生成 KPI 指标

5. **战略地图版本（新增）**
   - 支持多版本战略地图（年度对比）
   - 版本差异高亮显示

**数据模型（扩展）**：
```typescript
// 扩展现有 StrategyMap/StrategyObjective 模型
interface StrategyObjective {
  id: string;
  name: string;
  description: string;
  dim: 'fin' | 'cus' | 'int' | 'lea';
  level: 'primary' | 'secondary';
  parentId?: string;
  milestones: {
    [year: number]: {
      target: string;
      actual: string | null;
      status: 'on_track' | 'at_risk' | 'not_started' | 'achieved' | 'in_progress';
      focusLevel: 'primary' | 'secondary' | 'none';
    }
  };
  owner: string;

  // 新增字段
  linkedOptionIds: string[];     // 关联战略机会点
  linkedVDBDDesignId?: string;   // 关联 VDBD 价值驱动业务设计
  linkedInsightIds: string[];    // 关联洞察

  // 战略举措
  strategicInitiatives: StrategicInitiative[];

  // KPI 预关联
  proposedKpis: { name: string; unit: string; target: string }[];
  linkedKpiIds: string[];        // 关联到 KPI 库中的实际指标
}

interface StrategicInitiative {
  id: string;
  name: string;
  description: string;
  sourceTaskId?: string;         // 来源 VDBD 的关键任务
  owner: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: string;
}
```

---

### 4.8 战略专题（增强现有）

**定位**：将战略规划落地的关键工作以专题形式进行管理。

**核心功能（在现有基础上增强）**：

1. **专题来源增强**
   - 专题可来源于：洞察 / 机会点 / VDBD 关键任务 / 差距分析
   - 自动关联上游数据

2. **专题类型扩展**
   - 突破型 / 增量型 / 维持型（已有）
   - 新增：差距弥补型、能力建设型、风险应对型

3. **专题与战略地图关联（新增）**
   - 专题关联战略地图目标
   - 专题进展自动反映到目标进度

4. **资源匹配（新增）**
   - 专题预算与年度预算池关联
   - 人力资源需求标注
   - 资源冲突检测

5. **专题看板（新增）**
   - Kanban 看板视图（洞察阶段 → 规划阶段 → 执行阶段 → 已闭环）
   - 甘特图视图（时间线）

**数据模型（扩展）**：
```typescript
// 扩展现有 StrategyTopic 模型
interface StrategyTopic {
  id: string;
  name: string;
  year: number;
  type: 'breakthrough' | 'incremental' | 'maintenance' | 'gap_fix' | 'capability' | 'risk_response';
  dimension: string;
  priority: 'P0' | 'P1' | 'P2';
  status: 'insight' | 'planning' | 'execution' | 'closed';
  owner: string;
  startDate: string;
  endDate: string;
  progress: number;
  budget: number;
  actualCost: number;
  milestones: { title: string; date: string; completed: boolean }[];
  summary: string;

  // 新增关联字段
  sourceType: 'insight' | 'option' | 'key_task' | 'gap' | 'manual';
  sourceIds: string[];           // 来源对象ID数组
  linkedObjectiveIds: string[];  // 关联战略目标
  linkedKpiIds: string[];        // 关联 KPI

  // 资源
  resourceRequirements: {
    headcount: number;
    skills: string[];
    budgetPool: string;
  };
}
```

---

### 4.9 战略评审（新增）

**定位**：战略规划的质量 gate，确保规划质量并达成组织共识。

**核心功能**：

1. **评审检查清单**
   - 按阶段自动生成检查项
   - 检查项分类：完整性 / 逻辑性 / 可行性 / 挑战性
   - 每项通过/不通过/待确认
   - 评审得分自动计算

2. **评审会议管理**
   - 评审会议安排
   - 参会人员与角色
   - 评审材料汇总（自动收集各阶段产出）
   - 会议纪要

3. **评审意见管理**
   - 按模块收集评审意见
   - 意见分类：修改 / 补充 / 质疑 / 确认
   - 意见闭环追踪（谁提出的 → 谁负责 → 什么时候完成）

4. **战略版本管理**
   - 版本发布（草稿 → 评审中 → 已发布 → 已归档）
   - 版本变更记录
   - 版本对比（差异高亮）
   - 发布审批流

5. **共识达成记录**
   - 关键决策记录（Decision Log）
   - 共识达成签字/确认
   - 异议记录与处理

**评审检查清单示例**：

| 阶段 | 检查项 | 权重 | 标准 |
|------|--------|------|------|
| 差距分析 | 关键差距是否识别完整 | 高 | 覆盖财务/客户/流程/学习四维度 |
| 差距分析 | 差距根因分析是否到位 | 高 | 至少追问3层 why |
| 战略意图 | 目标是否符合 SMART | 高 | 具体、可衡量、有时限 |
| 战略意图 | 目标是否足够挑战 | 中 | 与行业增速对比 |
| 市场洞察 | 五看是否全面覆盖 | 高 | 每个维度至少3条洞察 |
| 机会点 | SPAN 评估是否客观 | 中 | 有数据支撑 |
| VDBD | 六要素是否完整 | 高 | 无遗漏要素，且有清晰的价值量化 |
| VDBD | 价值主张是否差异化且可量化 | 高 | 客户价值有明确量化指标 |
| VDBD | 价值获取（盈利模式）是否清晰 | 高 | 单位经济模型 UE 可计算 |
| VDBD | 战略控制点是否明确 | 高 | 有明确的护城河描述和控制点强度评估 |
| 战略地图 | 因果链是否完整 | 中 | 从学习到财务有完整链路 |
| 战略专题 | 资源匹配是否可行 | 高 | 预算+人力+时间在可承受范围 |

**数据模型**：
```typescript
interface StrategyReview {
  id: string;
  cycleId: string;
  version: number;
  status: 'draft' | 'in_review' | 'approved' | 'rejected';

  // 检查清单
  checklist: ReviewChecklistItem[];

  // 评审会议
  meetings: ReviewMeeting[];

  // 评审意见
  feedbacks: ReviewFeedback[];

  // 决策记录
  decisions: ReviewDecision[];

  // 审批流
  approvals: {
    stage: string;
    approver: string;
    status: 'pending' | 'approved' | 'rejected';
    comment: string;
    timestamp: string;
  }[];
}

interface ReviewChecklistItem {
  id: string;
  stage: string;
  item: string;
  weight: 'high' | 'medium' | 'low';
  criteria: string;
  status: 'pass' | 'fail' | 'pending';
  checkedBy?: string;
  checkedAt?: string;
  comment?: string;
}

interface ReviewMeeting {
  id: string;
  title: string;
  scheduledAt: string;
  attendees: { name: string; role: string }[];
  materials: string[];
  minutes: string;
}

interface ReviewFeedback {
  id: string;
  stage: string;
  type: 'modify' | 'supplement' | 'question' | 'confirm';
  content: string;
  raisedBy: string;
  raisedAt: string;
  status: 'open' | 'resolved';
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
}

interface ReviewDecision {
  id: string;
  topic: string;
  decision: string;
  alternatives: string[];
  rationale: string;
  decidedBy: string[];
  decidedAt: string;
  dissent?: string;            // 异议记录
}
```

---

## 五、数据流转与关联关系

### 5.1 实体关系图

```
┌──────────────────────────────────────────────────────────────────┐
│                        SP 周期 (SPWorkflow)                       │
│                        (2026-2028 规划周期)                       │
└──────────────┬─────────────────────────────────────┬─────────────┘
               │                                     │
    ┌──────────▼──────────┐               ┌─────────▼──────────┐
    │   差距分析          │               │    战略意图         │
    │   (GapAnalysis)     │               │   (StrategicIntent) │
    │   业绩/机会差距      │               │   使命/愿景/目标    │
    └──────────┬──────────┘               └─────────┬──────────┘
               │                                     │
               │ 关联                                │
               ▼                                     ▼
    ┌─────────────────────────────────────────────────────────┐
    │                    市场洞察 (Insight)                     │
    │              五看 / PESTEL / SWOT                        │
    └────────────────────────┬────────────────────────────────┘
                             │ 转化
                             ▼
    ┌─────────────────────────────────────────────────────────┐
    │                  战略机会点 (StrategicOption)              │
    │                     SPAN 评估 / 筛选                       │
    └────────────────────────┬────────────────────────────────┘
                             │ 选中
                             ▼
    ┌─────────────────────────────────────────────────────────┐
    │            价值驱动业务设计 (VDBDDesign)                    │
    │        VDBD 六要素画布 + 价值量化 + 关键任务提取             │
    └──────────────┬───────────────────────┬────────────────────┘
                   │                       │
                   │ 目标映射              │ 任务映射
                   ▼                       ▼
    ┌─────────────────────────┐   ┌─────────────────────────┐
    │     战略地图             │   │      战略专题            │
    │  (StrategyMap/Objective) │   │   (StrategyTopic)        │
    │     BSC 四维度 + 因果链   │   │   突破/增量/维持/能力/差距 │
    └────────────┬────────────┘   └───────────┬─────────────┘
                 │                            │
                 │ KPI预关联                   │ 执行跟踪
                 ▼                            ▼
    ┌─────────────────────────────────────────────────────────┐
    │                     BP 战略解码模块                        │
    │        KPI指标库 / BEM解码 / 年度经营计划                   │
    └─────────────────────────────────────────────────────────┘
```

### 5.2 数据流汇总

| 源模块 | 目标模块 | 数据内容 | 触发方式 |
|--------|---------|---------|---------|
| 差距分析 | 市场洞察 | 差距项关联洞察 | 手动关联 |
| 市场洞察 | 战略机会点 | 洞察 → 机会点 | 一键生成/手动 |
| 战略机会点 | VDBD | 选中的机会点 | 自动创建 |
| VDBD | 战略地图 | 战略目标映射 | 手动关联 |
| VDBD | 战略专题 | 关键任务 → 专题 | 一键生成/手动 |
| 战略地图 | BP/KPI | 目标 → KPI 预关联 | 手动确认 |
| 战略专题 | EXE/重点工作 | 专题 → 年度重点工作 | 年度分解时 |
| 全部模块 | 战略评审 | 各阶段产出汇总 | 自动收集 |

---

## 六、页面交互设计

### 6.1 页面状态流转

```
┌──────────────┐
│  SP 流程总览  │ ◄── 入口页面，流程导航
└──────┬───────┘
       │ 点击阶段节点
       ▼
┌────────────────────────────────────────────────────────────────────┐
│ 各阶段页面：差距分析 → 战略意图 → 市场洞察 → 机会点 → VDBD → 战略地图 → 专题 → 评审 │
│                                                                    │
│ 每个页面内：                                               │
│ • 顶部：阶段进度条 + 前后阶段快捷导航                        │
│ • 左侧/主体：该阶段的核心工作区                              │
│ • 右侧：关联信息面板（上游输出 / 下游输入 / 关联数据）         │
│ • 底部：操作按钮（保存 / 下一步 / 返回 / 提交评审）           │
└────────────────────────────────────────────────────────────┘
```

### 6.2 通用交互模式

1. **阶段导航栏**
   - 固定在页面顶部
   - 显示 8 个阶段的名称和状态
   - 当前阶段高亮
   - 已完成阶段可点击跳转回顾
   - 未开始阶段置灰（前置未完成时）

2. **关联信息面板**
   - 可折叠的右侧面板
   - 显示：上游输出摘要、已关联的数据、下游待办
   - 支持拖拽关联（如从洞察面板拖拽到机会点）

3. **智能提示**
   - 每个阶段有方法论引导提示
   - 必填项校验提示
   - 数据质量评分提示

4. **版本对比**
   - 支持当前编辑版本与已发布版本的对比
   - 新增/修改/删除内容高亮

---

## 七、技术实现建议

### 7.1 存储方案

```
localStorage Key 命名规范：
├── dste_sp_workflow_{cycleId}          SP 周期主数据
├── dste_sp_gaps_{cycleId}              差距分析
├── dste_sp_intent_{cycleId}            战略意图
├── dste_sp_insights_{cycleId}          市场洞察（替代现有 dste_insights_v1）
├── dste_sp_options_{cycleId}           战略机会点
├── dste_sp_designs_{cycleId}           VDBD 价值驱动业务设计
├── dste_sp_map_{cycleId}               战略地图（替代现有 strategy-map 数据）
├── dste_sp_topics_{cycleId}            战略专题（替代现有 dste_strategy_topics_v2）
├── dste_sp_review_{cycleId}            战略评审
└── dste_sp_relations_{cycleId}         实体关联关系索引
```

### 7.2 代码组织

建议将 SP 模块从 `cockpit.html` 中逐步拆分为独立的页面文件：

```
src/
├── sp/
│   ├── sp-workflow.html          # SP 流程总览（新增独立页面）
│   ├── sp-gap.html               # 差距分析（新增）
│   ├── sp-intent.html            # 战略意图（新增）
│   ├── sp-insights.html          # 市场洞察（从 cockpit 迁移 + 增强）
│   ├── sp-options.html           # 战略机会点（新增）
│   ├── sp-design.html            # 价值驱动业务设计 VDBD（新增）
│   ├── strategy-map.html         # 战略地图（现有，增强）
│   ├── sp-topics.html            # 战略专题（从 cockpit 迁移 + 增强）
│   └── sp-review.html            # 战略评审（新增）
```

### 7.3 复用现有组件

| 现有组件/模式 | 在新模块中复用 |
|--------------|---------------|
| 五看洞察卡片 | 市场洞察页面 |
| 战略专题 CRUD | 战略专题页面 |
| BSC 四维度颜色 | 全模块统一 |
| 弹窗/抽屉模式 | 全模块统一 |
| 数据表格 | 差距分析、机会点、专题 |
| KPI 卡片 | 流程总览、战略意图 |
| 进度条 | 全模块统一 |
| localStorage CRUD 模式 | 全模块统一 |

---

## 八、实施路线图

### Phase 1: 基础设施（v0.5.0）— 预计 2 周

1. **SP 流程总览页**
   - 流程管线图 + 阶段状态仪表盘
   - SP 版本管理基础
   - 作为 SP 模块新入口

2. **市场洞察增强**
   - PESTEL 分析模块
   - SWOT 矩阵（自动从洞察生成）
   - 洞察影响力矩阵
   - 洞察关联增强

3. **导航重构**
   - 侧边栏更新为 9 个子模块
   - 新增页面路由支持

### Phase 2: 核心规划工具（v0.5.1）— 预计 2 周

1. **差距分析**
   - 业绩差距 + 机会差距
   - 根因分析（5 Whys）
   - 差距矩阵

2. **战略意图**
   - 使命愿景编辑
   - 战略目标设定
   - 里程碑时间线
   - SMART 检查

3. **战略地图增强**
   - 因果链编辑模式
   - 战略举措映射
   - KPI 预关联
   - 版本对比

### Phase 3: VDBD 价值驱动业务设计（v0.5.2）— 预计 2 周

1. **战略机会点**
   - 机会识别与评估
   - SPAN 矩阵可视化
   - 机会筛选决策

2. **VDBD 画布**
   - 六要素结构化输入
   - 画布可视化
   - 关键任务提取
   - VDBD 画布对比

### Phase 4: 评审与闭环（v0.6.0）— 预计 2 周

1. **战略专题增强**
   - 与机会点/VDBD 强关联
   - Kanban 看板 + 甘特图
   - 资源匹配

2. **战略评审**
   - 评审检查清单
   - 评审会议管理
   - 意见闭环追踪
   - 版本发布审批

3. **数据贯通**
   - 全模块数据关联验证
   - SP → BP 数据导出
   - 战略地图 → KPI 一键同步

---

## 九、关键设计原则

1. **方法论显性化**：每个页面都要体现背后的方法论（BLM/DSTE/BSC/VDBD），通过引导问题、检查清单、模板等方式帮助用户正确使用方法论。VDBD 采用"显性框架 + 有机表达"，保留方法论识别度的同时降低使用门槛。

2. **过程可追溯**：从差距→洞察→机会→设计→地图→专题的完整链路要可追溯，任意节点都能看到上下游关联。

3. **数据一致性**：同一数据只在一个地方维护，其他地方引用。如战略目标在战略意图中定义，在战略地图中引用。

4. **渐进式引导**：SP 是复杂的，对新手要提供引导模式（wizard），对专家要提供自由模式。

5. **与现有模块无缝衔接**：SP 的输出要能自然流入 BP（战略解码）和 EXE（执行）模块，不重复录入。

---

## 十、附录

### 10.1 与现有功能对比

| 功能 | 当前（v0.4.x） | 优化后（v0.5.x） |
|------|---------------|-----------------|
| SP 页面数 | 2 个 | 9 个 |
| 方法论覆盖 | BSC + 五看（隐性） | BLM + DSTE + BSC + 五看 + PESTEL + SWOT + SPAN（显性） |
| 规划流程 | 无流程引导 | 8 阶段流程管线 |
| 差距分析 | 无（仅在 REV 有） | 完整的业绩/机会差距分析 |
| 战略意图 | 无 | 使命愿景 + 战略目标 + 里程碑 |
| 机会筛选 | 无 | SPAN 矩阵 + 筛选决策 |
| 业务设计 | 无 | 价值驱动业务设计（VDBD）六要素画布 + 价值量化 |
| 因果链 | 静态展示 | 编辑模式 + 验证 + 模拟 |
| KPI 关联 | 无 | 预关联 + 一键同步 |
| 评审机制 | 无 | 检查清单 + 会议 + 意见闭环 |
| 版本管理 | 无 | 版本发布 + 对比 + 审批 |

### 10.2 术语对照表

| 中文术语 | 英文术语 | 说明 |
|---------|---------|------|
| 战略规划 | Strategy Planning (SP) | DSTE 流程第一阶段 |
| 差距分析 | Gap Analysis | 业绩差距 + 机会差距 |
| 战略意图 | Strategic Intent | 使命 + 愿景 + 战略目标 |
| 市场洞察 | Market Insight | 五看 + PESTEL + SWOT |
| 战略机会点 | Strategic Option | 可选择的战略方向 |
| 价值驱动业务设计 | VDBD (Value-Driven Business Design) | 以价值创造为主线的业务设计六要素画布 |
| 业务设计 | Business Design | BLM 中的通用概念，VDBD 是其价值化具象 |
| 战略地图 | Strategy Map | BSC 四维度 + 因果链 |
| 战略专题 | Strategy Topic | 关键战略工作专题 |
| 战略评审 | Strategy Review | 规划质量评审 |
| 战略控制点 | Strategic Control Point | 持续竞争优势的来源 |
| SPAN 矩阵 | Strategic Positioning Analysis | 细分市场吸引力 × 竞争地位 |

---

*文档结束*
