---
status: 已批准
author: jasonjing
date: 2026-05-26
---

# RFC-001: 战略洞察与专题（混合架构）

## 背景

SP（战略制定）阶段当前有3个入口：
- 战略地图：占位页面
- 战略专题：静态表格（8条数据，只读）
- 市场洞察：占位页面

需要整合为2个入口：战略地图 + 战略洞察与专题。

## 目标

1. 将"市场洞察"和"战略专题"合并为一个页面
2. 支持Tab切换：洞察视图 / 专题列表 / 知识沉淀
3. 专题管理达到 business-topics.html 的交互水平（CRUD + 详情）
4. 洞察与专题可关联（洞察可生成专题）

## 非目标

- 不实现战略地图（独立页面，后续单独开发）
- 不实现AI辅助洞察分析（后续迭代）
- 不实现复杂权限控制

## 方案

### 页面结构

```
sp/insights-topics（替换现有的 sp/strategy-topics 和 sp/market-insight）

顶部Tab: [洞察视图] [专题列表] [知识沉淀]

洞察视图（默认）：
  - 五看模型卡片（趋势/客户/竞争/自己/机会）
  - 点击卡片展开洞察列表
  - 每条洞察可编辑/删除/生成专题
  - 差距分析面板

专题列表：
  - 统计卡片（进行中/已完成/平均进度/高风险）
  - 专题表格（CRUD操作）
  - 专题详情弹窗（里程碑/资源/成果）

知识沉淀：
  - 专题成果列表
  - 复盘报告
  - 方法论模板
```

### 数据模型

```typescript
interface Insight {
  id: string;
  type: 'trend' | 'customer' | 'competitor' | 'self' | 'opportunity';
  title: string;
  content: string;
  source: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  createdAt: string;
  linkedTopicId: string | null;
}

interface StrategyTopic {
  id: string;
  name: string;
  type: 'transformation' | 'expansion' | 'innovation' | 'efficiency' | 'other';
  dimension: '财务' | '客户' | '流程' | '学习成长';
  priority: 'P0' | 'P1' | 'P2';
  status: 'insight' | 'design' | 'review' | 'execution' | 'closed';
  owner: string;
  startDate: string;
  endDate: string;
  progress: number;
  budget: number;
  actualCost: number;
  milestones: Milestone[];
  insights: string[]; // 关联洞察ID
  summary: string;
  createdAt: string;
  updatedAt: string;
}

interface Milestone {
  id: string;
  name: string;
  date: string;
  status: 'pending' | 'completed';
}
```

### 导航变更

```javascript
// 修改 SIDEBAR_CONFIG.sp
sp: [
  { type: 'group', title: '战略制定 (SP)', items: [
    { id: 'sp/strategy-map', icon: '🗺️', label: '战略地图' },
    { id: 'sp/insights-topics', icon: '🔭', label: '战略洞察与专题' }
  ]},
  // ...
]

// 移除 sp/strategy-topics 和 sp/market-insight
```

### 实现步骤

1. 修改 config.js：合并导航项
2. 修改 cockpit.html：
   - 移除 renderStrategyTopics 和 renderMarketInsight
   - 新增 renderInsightsTopics 函数
   - 实现洞察视图Tab
   - 实现专题列表Tab（参考 business-topics 交互）
   - 实现知识沉淀Tab
3. 数据层：localStorage 读写
4. 测试：pytest + Playwright

## 工作量估算

| 任务 | 时间 |
|------|------|
| 修改导航配置 | 10分钟 |
| 洞察视图Tab | 40分钟 |
| 专题列表Tab（CRUD） | 60分钟 |
| 知识沉淀Tab | 20分钟 |
| 数据持久化 | 20分钟 |
| 测试验证 | 20分钟 |
| **总计** | **约170分钟** |

## 验收标准

- [ ] 侧边栏显示"战略洞察与专题"，不再显示"战略专题"和"市场洞察"
- [ ] 洞察视图：五看卡片可点击展开，支持新增/编辑/删除洞察
- [ ] 专题列表：支持新建/编辑/删除/查看详情，有里程碑和进度
- [ ] 洞察可生成专题（点击"生成专题"按钮）
- [ ] 数据刷新不丢失（localStorage）
- [ ] pytest 全部通过
- [ ] Playwright E2E 全部通过
