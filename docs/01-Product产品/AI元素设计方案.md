# DSTE AI 元素设计方案 v1.0

> **文档版本**: v1.0  
> **更新日期**: 2026-07-01  
> **覆盖模块**: 战略洞察、战略专题管理、知识中心、年度深化链  
> **状态**: 🆕 方案草稿，待评审  

---

## 一、设计目标

在保持「用户为最终决策者」的前提下，通过 AI 减少信息录入、整理、分析的人力成本，让战略管理员把精力集中在判断与决策上。

核心原则：
- **辅助而非替代**：所有 AI 生成内容必须经用户确认后才能写入系统；
- **来源可追溯**：AI 结论必须标注来源（KMS 页面、洞察、专题、会议纪要）；
- **可控成本**：AI 调用按需触发，避免后台静默消耗 token；
- **渐进落地**：优先做「低风控、高频价值」的 AI 能力，复杂能力分阶段实现。

---

## 二、AI 能力矩阵

| 能力 | 场景 | 触发方式 | 输出 | 优先级 |
|------|------|---------|------|--------|
| **AI 洞察推荐** | 从 KMS 页面/粘贴文本中自动提取五看洞察 | 用户粘贴文本或输入 KMS URL 后点击「AI 提取」 | 候选洞察列表 | P0 |
| **洞察去重/聚类** | 发现相似洞察，提示合并 | 页面加载后后台扫描 | 相似洞察组 | P1 |
| **洞察 → 专题 AI 推荐** | 从高影响洞察推荐生成战略专题 | 洞察列表顶部「AI 推荐专题」 | 推荐专题清单 | P0 |
| **专题报告质量分析** | 评估专题 summary、researchObjectives、deliverables 的完整性与清晰度 | 专题详情页「AI 报告质量分析」 | 质量报告 + 改进建议 | P1 |
| **年度深化 AI 建议** | 基于 2025 专题内容生成 2026 深化目标 | 下一年深化弹窗「AI 生成目标」 | researchObjectives 建议 | P0 |
| **知识中心智能摘要** | 为长篇专题总结生成 TL;DR | 知识资产卡片/详情自动展示 | 一句话摘要 | P1 |
| **知识中心问答** | 基于历史专题/洞察回答战略问题 | 知识中心搜索框输入问题 | 带来源引用的答案 | P2 |

---

## 三、战略洞察 AI 辅助

### 3.1 AI 洞察推荐

#### 触发位置

战略洞察页面新增「AI 提取洞察」入口：
- 按钮：「🤖 从文本提取洞察」
- 输入方式：
  - 文本粘贴框（支持 KMS 页面正文、会议纪要、报告片段）
  - KMS URL 输入框（未来 v1.1：自动抓取页面内容，需后端代理）

#### AI 处理流程

```
用户输入文本
    ↓
前端调用 Kimi API（通过后端代理或已有 AI 服务）
Prompt: "请根据华为 DSTE 五看模型（看趋势/看客户/看竞争/看自己/看机会）
        从以下文本中提取 3-10 条战略洞察。每条包含：类型、标题、内容、
        来源、置信度（0-100）、影响程度（high/medium/low）。"
    ↓
返回结构化 JSON
    ↓
前端渲染候选洞察卡片
    ↓
用户选择采纳/编辑/丢弃
```

#### 候选洞察卡片

每张卡片展示：
- 五看类型标签
- 标题（可编辑）
- 内容（可编辑）
- 来源（自动提取或用户补充）
- 置信度、影响程度
- 操作按钮：「采纳并新建」「编辑后采纳」「丢弃」「全部采纳」

#### 数据写入

用户点击采纳后，调用 `saveInsightEdit()` 将候选洞察保存到 `dste_insights_v1`，并标记 `createdFromAI: true`（可选扩展字段）。

### 3.2 洞察去重与聚类

#### 触发时机

战略洞察页面加载完成后，对当前洞察列表进行本地相似度分析 + 可选 AI 聚类。

#### 处理逻辑

1. 本地初筛：对标题和内容做简单文本相似度计算（如 Jaccard / Levenshtein），找出候选相似组；
2. AI 精筛：对候选组调用 Kimi 判断「是否为同一洞察的不同表述」；
3. 展示：在相似洞察卡片上显示「🔁 疑似重复」提示，提供「合并」入口。

#### 合并流程

用户确认合并后：
- 保留一条主洞察；
- 将被合并洞察的内容摘要补充到主洞察的 `content` 或备注中；
- 被合并洞察物理删除或标记为 `mergedInto: insightId`。

---

## 四、战略专题管理 AI 辅助

### 4.1 洞察 → 专题 AI 推荐

#### 触发位置

战略洞察页面顶部新增「🤖 AI 推荐专题」按钮。

#### 推荐逻辑

1. 筛选 `impact === 'high'` 且未关联专题的洞察；
2. 调用 Kimi：
   - 输入：筛选出的洞察列表
   - Prompt: "请基于以下高影响洞察，推荐应转化为战略专题的条目组合。
           对每组推荐，输出：专题名称、研究目标、建议交付件、战略维度、类型。"
3. 前端展示推荐结果；
4. 用户点击「生成专题」后，打开专题创建弹窗并预填充；
5. 保存后回写 `linkedTopicId`。

#### 展示形式

```
┌─────────────────────────────────────────┐
│ 🤖 AI 推荐生成 3 个战略专题              │
├─────────────────────────────────────────┤
│ 专题 1: 云原生技术落地                   │
│ 依据洞察: 云原生技术成熟、容器化趋势...   │
│ 研究目标: 评估云原生技术对现有架构的影响...│
│ [生成专题] [忽略]                        │
└─────────────────────────────────────────┘
```

### 4.2 专题报告质量分析

#### 触发位置

专题详情页新增「🤖 AI 报告质量分析」按钮。

#### 分析维度

| 维度 | 输入 | AI 判断 |
|------|------|--------|
| 总结完整性 | `summary` | 是否说明背景、过程、结论、下一步 |
| 目标清晰度 | `researchObjectives` | 是否具体、可衡量、与主题强相关 |
| 交付件匹配度 | `deliverables` vs `summary` | 交付件是否支撑研究目标达成 |
| 内容一致性 | `name`、`summary`、`researchObjectives`、`deliverables` | 各字段是否围绕同一主题，无矛盾 |
| 可沉淀价值 | `summary`、`kmsUrl` | 是否具备知识复用价值，是否关联 KMS |

#### 输出示例

```markdown
## 报告质量评分: 72/100

- ⚠️ 总结不完整：缺少明确的下一步行动计划
- ✅ 目标清晰：研究目标包含可衡量的指标
- 💡 建议：在 deliverables 中补充「三年业务规划终稿」
- 💡 建议：summary 中增加对关键决策的说明
```

### 4.3 甘特图 AI 风险标注

在甘特图视图中，AI 识别：
- 时间重叠过多的专题（同一负责人并行过多）；
- 已逾期但仍为 execution 状态的专题；
- 无明确里程碑的专题。

用红色虚线框或 🚨 图标标注，hover 显示 AI 风险提示。

---

## 五、年度深化链 AI 辅助

### 5.1 下一年目标 AI 生成

#### 触发位置

「下一年深化」弹窗中，在 `researchObjectives` 字段旁增加「🤖 AI 生成」按钮。

#### 输入

- 原专题 `summary`
- 原专题 `researchObjectives`
- 原专题 `deliverables`
- 原专题 `milestones`
- 原专题 `insights` 关联洞察

#### Prompt

"基于以下 2025 年战略专题的总结、目标、交付件和里程碑，
 生成 2026 年继续深化的研究目标。要求：
 1. 与 2025 年目标衔接；
 2. 比 2025 年更具体、更可衡量；
 3. 控制在 200 字以内。"

#### 输出

用户可将 AI 生成的目标一键填入 `researchObjectives` 字段，或编辑后使用。

### 5.2 链上综合摘要

在详情页年度深化链区域，提供「🤖 生成链上摘要」按钮：
- 输入：链上所有专题的 `summary`、`researchObjectives`、`deliverables`
- 输出：一段跨年度发展脉络描述
- 用途：帮助高管快速理解该战略议题的历年演进

---

## 六、知识中心 AI 辅助

### 6.1 智能摘要

#### 自动摘要

知识资产卡片默认展示 AI 生成的一句话摘要（首次生成后缓存）：
- 输入：`title` + `summary` + `content`
- 输出：≤ 60 字摘要
- 缓存：存储在 `KnowledgeAsset.aiSummary` 字段，避免重复调用

#### 链上综合摘要

对属于同一年度深化链的知识资产，提供「🤖 生成链路摘要」：
- 输入：链上所有资产 `summary`
- 输出：多年演进脉络

### 6.2 知识问答

#### 触发位置

知识中心首页搜索框支持自然语言提问，识别为问题时切换为问答模式。

#### 处理流程

```
用户输入问题
    ↓
检索相关 KnowledgeAsset（关键词匹配）
    ↓
将 top-5 相关资产作为上下文调用 Kimi
    ↓
返回答案 + 引用来源列表
```

#### 输出

- 答案正文
- 「参考来源」列表：资产标题 + 年份 + 可点击跳转
- 免责声明：「答案由 AI 生成，请以原始资料为准」

---

## 七、通用 AI 交互规范

### 7.1 AI 按钮统一样式

- 图标：🤖
- 文案：「AI 提取」「AI 推荐」「AI 分析」「AI 生成」
- 状态：
  - 默认：可点击
  - 加载中：旋转动画 + 「AI 思考中...」
  - 完成：展示结果
  - 失败：「生成失败，请重试」+ 重试按钮

### 7.2 AI 结果展示规范

- 必须明确标注「AI 生成」；
- 提供「采纳」「编辑」「重新生成」「丢弃」四种操作；
- 涉及数据写入时，必须二次确认；
- 保留 AI 生成记录：可扩展 `aiGeneratedLog` 字段记录 prompt 与结果摘要。

### 7.3 AI 调用成本控制

- 所有 AI 调用均由用户主动触发，禁止静默后台调用；
- 对可缓存的结果（如摘要）设置本地缓存，避免重复请求；
- 对长文本做截断或分段处理，控制单次 prompt token 数；
- 错误时降级：AI 服务不可用时，功能入口隐藏或提示「AI 服务暂不可用」。

---

## 八、数据模型扩展

### 8.1 Insight 扩展（可选）

```typescript
interface Insight {
  // ... 原有字段
  createdFromAI?: boolean;       // 是否由 AI 生成
  aiSourceText?: string;         // AI 提取时的原始文本摘要（可选）
}
```

### 8.2 StrategyTopic 扩展（可选）

```typescript
interface StrategyTopic {
  // ... 原有字段
  aiReportQualityScore?: number;   // AI 报告质量评分（缓存）
  aiReportQualityReport?: string;  // AI 报告质量分析摘要（缓存）
}
```

### 8.3 KnowledgeAsset 扩展（可选）

```typescript
interface KnowledgeAsset {
  // ... 原有字段
  aiSummary?: string;            // AI 一句话摘要（缓存）
}
```

---

## 九、接口设计

```javascript
// === AI 洞察提取 ===
function extractInsightsFromText(text: string): Promise<InsightCandidate[]>
function renderInsightCandidates(candidates: InsightCandidate[]): string
function adoptInsightCandidate(candidate: InsightCandidate): void

// === AI 洞察推荐专题 ===
function recommendTopicsFromInsights(insights: Insight[]): Promise<TopicRecommendation[]>

// === AI 专题报告质量分析 ===
function analyzeTopicReportQuality(topic: StrategyTopic): Promise<QualityReport>

// === AI 年度深化建议 ===
function generateNextYearObjectives(topic: StrategyTopic): Promise<string>
function generateChainSummary(topics: StrategyTopic[]): Promise<string>

// === 知识中心 AI ===
function generateAssetSummary(asset: KnowledgeAsset): Promise<string>
function answerKnowledgeQuestion(question: string, assets: KnowledgeAsset[]): Promise<QAResult>

// === 通用 ===
function callKimiAPI(prompt: string, context?: string): Promise<string>
function escapeAiOutput(text: string): string  // XSS 防护
```

---

## 十、实施建议

### Phase 1（P0）

1. **AI 洞察提取**：从粘贴文本提取五看洞察；
2. **洞察 → 专题 AI 推荐**：基于高影响洞察推荐专题；
3. **年度深化 AI 建议**：生成下一年研究目标。

### Phase 2（P1）

1. **专题报告质量分析**；
2. **洞察去重/聚类**；
3. **知识中心智能摘要**。

### Phase 3（P2）

1. **甘特图 AI 风险标注**；
2. **知识中心问答**；
3. **链上综合摘要**。

---

## 十一、与现有 PRD 的关联

- 《战略洞察与专题-完整设计方案.md》：AI 洞察提取、AI 专题推荐、专题报告质量分析、年度深化 AI 建议、甘特图 AI 标注；
- 《知识中心-完整设计方案.md》：AI 摘要、AI 问答。

---

> **文档结束**  
> 本方案为 DSTE 战略模块 AI 元素设计草稿，具体 prompt 和 API 接入细节需在开发阶段与 Kimi 服务接口对齐
