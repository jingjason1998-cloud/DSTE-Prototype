# RFC-004: 议程材料链接与审核评分展示

## 背景

经营分析会的议程项目前仅包含类型、标题、时长、负责人4个字段。实际业务中，每个议程项往往对应一份会议材料（如财务复盘PPT、KPI追踪表等），且这些材料在会前需要通过「会议材料审核助手」进行质量审核。需要在议程中直观展示材料链接及其审核得分，便于会前快速识别材料准备质量。

---

## 需求

### 需求1：议程材料链接

在议程项中增加「材料链接」字段，支持：
- 编辑时填写/修改材料URL
- 详情页中可点击跳转
- 链接可为空（兼容无材料的议程项）

### 需求2：材料审核评分展示

对于已填写材料链接的议程项，自动展示该材料在「会议材料审核助手」中的**历史最高审核得分**。

---

## 现状分析

### 议程项数据结构

```javascript
// 当前（4个字段）
{ type: 'financial_review', title: 'Q1 财务整体复盘', duration: 45, owner: 'CFO' }
```

### 审核系统数据流

```
reviewer.html
  → 用户输入材料URL + 选择场景
  → 调用 /api/review → Kimi API 生成审核报告
  → parseDimensionScores() 提取总分（满分100）
  → 调用 /api/history (POST) 保存到后端 IndexedDB
  → 历史记录按 URL 分组，支持多版本
```

审核记录结构：
```javascript
{
  url: 'https://...',
  title: '...',
  scene_id: 'general-topic-review',
  total_score: 85,
  dimension_scores: {...},
  timestamp: 1714108800000,
  version: 3
}
```

---

## 方案设计

### 一、数据模型扩展

#### 1. 议程项新增字段

```javascript
// 新议程项结构（6个字段）
{
  type: 'financial_review',
  title: 'Q1 财务整体复盘',
  duration: 45,
  owner: 'CFO',
  material_link: 'https://docs.example.com/finance-q1',  // ← 新增
  material_score: null                                     // ← 新增（运行时填充）
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `material_link` | string | **否** | 材料URL，支持任何合法链接 |
| `material_score` | number \| null | 否 | 审核最高得分（运行时从审核系统查询填充，不持久化在会议数据中） |

**设计原则**：`material_score` 不写入会议数据，每次加载时实时从审核系统查询。避免两份数据不同步。

#### 2. 向后兼容

旧数据无 `material_link` 字段 → 渲染时按空值处理，不影响现有功能。

---

### 二、编辑表单UI

在议程项编辑行的「时长」输入框之后、「负责人」输入框之前增加「材料链接」输入框。

```
┌────┬────────┬─────────────┬──────┬─────────────┬────────┬────┬────┬────┐
│ 1. │ 财务复盘 │ Q1财务整体复盘 │ 45分钟 │ [材料链接...] │ CFO    │ ↑  │ ↓  │ ×  │
└────┴────────┴─────────────┴──────┴─────────────┴────────┴────┴────┴────┘
                                    ↑ 新增，placeholder="https://..."
```

- 样式与负责人输入框一致（`width: 120px`，`placeholder: "材料链接"`）
- 变更时同步到 `window._meetingEditData.agenda_items[idx].material_link`
- `saveMeeting` 时自动保存

---

### 三、详情页展示UI

#### 1. 议程卡片（列表页卡片中的 tab 内容）

当前议程标签只展示文字标签。有材料链接时，在标签旁增加 🔗 图标（可点击跳转）：

```
财务复盘  [🔗]  ← 有材料链接时显示，hover 提示"查看材料"
KPI 追踪
```

#### 2. 详情弹窗 → 纪要 Tab → 议程列表

在每行议程项的右侧增加材料相关信息：

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 09:00  Q1 财务整体复盘    财务复盘                    [🔗 材料]  [⭐ 85分]  │
│ ~                                                               ↑ 审核得分 │
│ 09:30  45分钟                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

- **材料链接**：有链接时显示 🔗，点击新标签页打开
- **审核得分**：
  - 有链接且有审核记录 → 显示 `⭐ xx分`，颜色按分数段区分
  - 有链接但无审核记录 → 显示灰色「未审核」
  - 无链接 → 不显示任何内容

#### 3. 得分颜色规则

| 分数段 | 颜色 | 说明 |
|--------|------|------|
| ≥ 80 | 绿色 `var(--success)` | 优秀/良好 |
| 60-79 | 橙色 `var(--warning)` | 及格/待改进 |
| < 60 | 红色 `var(--danger)` | 不及格 |
| 无记录 | 灰色 `var(--text-tertiary)` | 未审核 |

---

### 四、审核评分查询机制

#### 核心问题

审核数据存储在 reviewer 的后端 IndexedDB（通过 `/api/history`），而会议数据在 cockpit 页面。两个页面同源但独立，需要跨页面共享审核数据。

#### 方案对比

| 方案 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| **A. localStorage 共享** | reviewer 保存审核结果时同时写入 `localStorage.setItem('dste_review_scores', {...})`，cockpit 读取 | 实现简单，实时性好 | 数据量大时 localStorage 可能超限（5MB） |
| **B. 后端 API 查询** | cockpit 调用 `/api/history` 按 URL 查询最高得分 | 数据源唯一，无同步问题 | 需要异步请求，增加加载时间 |
| **C. IndexedDB 直连** | cockpit 直接读取 reviewer 使用的 IndexedDB | 数据实时 | 实现复杂，依赖具体库实现 |

**推荐方案：A + B 降级**

1. **主路径（A）**：reviewer 完成审核后将 `{url: highestScore}` 映射写入 `localStorage.setItem('dste_review_scores', JSON.stringify(scoresMap))`
2. **降级路径（B）**：cockpit 加载时若 localStorage 中无某 URL 的得分，可异步调用 `/api/history?url=xxx` 补充查询
3. **时效性**：localStorage 中的映射在 reviewer 每次审核后自动更新

#### 数据映射结构

```javascript
// localStorage key: dste_review_scores
{
  "https://docs.example.com/finance-q1": { maxScore: 85, lastReviewAt: 1714108800000 },
  "https://docs.example.com/kpi-track":  { maxScore: 92, lastReviewAt: 1714195200000 }
}
```

#### cockpit 读取逻辑

```javascript
function getMaterialScore(url) {
  if (!url) return null;
  const map = JSON.parse(localStorage.getItem('dste_review_scores') || '{}');
  return map[url]?.maxScore || null;
}
```

---

### 五、 reviewer 端改造

在 `saveReviewRecord()` 成功后，将本次审核的 URL 和得分更新到 localStorage：

```javascript
async function saveReviewRecord(record) {
  // 原有保存逻辑...
  
  // 新增：同步到 localStorage 供 cockpit 读取
  try {
    const map = JSON.parse(localStorage.getItem('dste_review_scores') || '{}');
    const url = record.url;
    const current = map[url];
    if (!current || record.total_score > current.maxScore) {
      map[url] = { maxScore: record.total_score, lastReviewAt: record.timestamp };
      localStorage.setItem('dste_review_scores', JSON.stringify(map));
    }
  } catch (e) { /* ignore */ }
}
```

---

### 六、变更范围汇总

| 文件 | 变更内容 |
|------|----------|
| `src/cockpit.html` | ①议程项数据结构增加 `material_link`；②`renderAgendaList` 增加材料链接输入框；③`renderAgendaList`/`renderMeetingDetail` 展示材料链接和审核得分；④`saveMeeting` 保存 `material_link`；⑤新增 `updateAgendaMaterialLink` 函数 |
| `src/reviewer.html` | `saveReviewRecord` 中增加 localStorage 同步逻辑 |
| `dist/src/cockpit.html` | 同步上述 cockpit 变更 |
| `dist/src/reviewer.html` | 同步上述 reviewer 变更（如适用） |

---

### 七、测试策略

| 测试项 | 验证点 |
|--------|--------|
| 编辑表单增加材料链接输入框 | 静态代码检查 `material_link` 输入框存在 |
| 材料链接保存后持久化 | 保存会议后刷新，材料链接不丢失 |
| 详情页展示材料链接 | 有链接时显示 🔗 且可点击 |
| 审核得分颜色规则 | 不同分数段显示正确颜色 |
| reviewer 同步到 localStorage | 审核后 cockpit 能读取到得分 |
| 无链接/无审核的兼容性 | 旧数据、无链接数据展示正常 |

---

## 待确认问题

### 已确认项 ✅

| 项 | 确认结果 |
|---|---------|
| 材料链接是否必填 | **否**（兼容历史数据） |
| 审核得分展示 | 只展示**最高分** |
| 得分颜色规则 | ≥80 绿色 / 60-79 橙色 / <60 红色 / 无记录灰色 |
| 材料链接输入框位置 | 位于**时长之后、负责人之前** |

### 待确认项 ❓

1. **审核得分展示位置偏好？** 当前设计在详情弹窗议程列表行尾展示，是否 OK？
2. **reviewer 是否也需要同步改造？** 本方案需要 reviewer 在保存审核结果时同步到 localStorage，如 reviewer 由其他团队维护需协调
3. **方案是否可行？** 确认后按 Safe-coding 流程开发
