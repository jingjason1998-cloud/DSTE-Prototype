# DSTE 版本管理与路标管理 PRD

> 文档版本：v2.0（整合版）
> 创建日期：2026-05-21
> 整合更新：2026-06-15
> 状态：待评审
> 关联项目：DSTE 战略管理平台

---

## 1. 背景与目标

### 1.1 为什么需要版本管理与路标管理

DSTE 平台目前处于快速迭代期，已从 v0.1.0 演进至 v0.4.10。随着模块增多、协作 AI 变多、环境变复杂，团队需要：

- **对内**：清晰看到产品演进节奏，明确每个模块的开发状态与负责人
- **对外**：向领导/客户展示开发进度，建立信任感
- **规划**：将未来开发计划可视化，便于优先级管理
- **运维**：一键判断本地/Git/生产三个环境的版本一致性，降低部署事故风险

### 1.2 设计目标

| 目标 | 说明 |
|------|------|
| 清晰 | 一眼看懂版本历史、当前进度、未来计划、环境一致性 |
| 简洁 | 不引入外部图表库，纯 CSS/JS 实现，与现有 DSTE 风格一致 |
| 可维护 | 版本历史自动生成；开发计划人工维护；数据单点 truth 在 `roadmap-data.json` |
| 可验证 | 提供版本审计能力，3 秒内判断本地/Git/生产是否一致 |

### 1.3 范围界定

本 PRD 整合两类功能：

1. **开发路线图（Road Map）**：已部分实现，用于展示版本历史、模块进度、未来计划、开发计划看板
2. **版本审计看板（Version Audit）**：仅 RFC 设计，未实现，用于对比本地/Git/生产三个环境的版本一致性

---

## 2. 页面定位

### 2.1 开发路线图

| 属性 | 值 |
|------|-----|
| **页面名称** | 开发路线图 |
| **路由** | `dashboard/roadmap` |
| **导航位置** | 驾驶舱侧边栏 → 系统管理 → 开发路线图 Road Map |
| **图标** | 📊 |
| **面包屑** | 驾驶舱 / 开发路线图 |
| **访问权限** | 暂不区分，登录后可见 |

### 2.2 版本审计看板

| 属性 | 值 |
|------|-----|
| **页面名称** | 版本审计 |
| **路由** | `dashboard/version-audit` |
| **导航位置** | 驾驶舱侧边栏 → 系统管理 → 版本审计 Version Audit |
| **图标** | 🔍 |
| **面包屑** | 驾驶舱 / 版本审计 |
| **访问权限** | 暂不区分，登录后可见 |

### 2.3 导航配置

在 `src/lib/config.js` 的 `SIDEBAR_CONFIG.dashboard` 中，将"系统管理"分组扩展为：

```javascript
{ type: 'group', title: '系统管理', items: [
  { id: 'dashboard/roadmap', icon: '📊', label: '开发路线图 Road Map' },
  { id: 'dashboard/version-audit', icon: '🔍', label: '版本审计 Version Audit' }
]}
```

---

## 3. 功能架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    DSTE 版本管理与路标管理                        │
├──────────────────────────────┬──────────────────────────────────┤
│      开发路线图 Road Map      │      版本审计 Version Audit      │
├──────────────────────────────┼──────────────────────────────────┤
│ ① 版本时间线轴（横向）        │ ① 环境状态卡片                  │
│ ② 模块开发进度（甘特图）      │ ② 三环境对比表格                │
│ ③ 版本统计卡片               │ ③ 部署检查清单                 │
│ ④ 版本详情卡片（纵向）        │ ④ 刷新 / 复制报告操作           │
│ ⑤ 战略目标卡片               │                                  │
│ ⑥ 开发计划看板（Kanban）     │                                  │
└──────────────────────────────┴──────────────────────────────────┘
```

---

## 4. 开发路线图 Road Map

### 4.1 整体布局

```
┌─────────────────────────────────────────────────────────────────────┐
│  开发路线图 Road Map                  [全部|已达成|攻坚中|战略必争]   │
├─────────────────────────────────────────────────────────────────────┤
│  🎯 战略态势横幅：已达成 X 个版本 / 攻坚中 Y 个模块 / 战略必争 Z 项   │
├─────────────────────────────────────────────────────────────────────┤
│  ① 版本时间线轴                                                      │
│  ●────●────●────●────○────○                                          │
│ v0.4  v0.3.5 v0.3.4 ...            v1.0                              │
│ 已发布 已发布  已发布             战略目标                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐  ┌──────────────────────────────────┐  │
│  │ ② 模块开发进度（甘特图） │  │ ③ 版本统计卡片                   │  │
│  │ 驾驶舱首页  ████████░░ │  │  已发布版本    17               │  │
│  │ 会议审核    ██████████ │  │  功能数        56               │  │
│  │ 业务专题    ██████████ │  │  Bug 修复      23               │  │
│  │ 经营分析会  ██████████ │  │  计划中        4                │  │
│  │ ...                    │  │                                  │  │
│  └────────────────────────┘  └──────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│  ④ 版本详情卡片                                                      │
│  ━━━ v0.4.10 ━━━  2026-06-10                                        │
│   [新增] 经营分析会会议效果评估                                       │
│   [修复] 经营分析会保存失败                                           │
│  ━━━ v0.4.9  ━━━  2026-06-10                                        │
│   ...                                                                │
├─────────────────────────────────────────────────────────────────────┤
│  ⑤ 开发计划看板（Kanban）                                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │ 待评审   │ │ 设计中   │ │ 开发中   │ │ 测试中   │                   │
│  │ PLAN-00X│ │ PLAN-00Y│ │ PLAN-00Z│ │ PLAN-00W│                   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 模块说明

#### ① 版本时间线轴（横向）

- 横向排列所有版本节点，最新版本在左侧，旧版本向右递减
- 节点之间用线连接，表示时间演进
- 节点样式区分状态：
  - **已发布**：实心圆，`var(--success)` 绿色，带版本号和日期
  - **开发中**：脉冲动画圆，`var(--warning)` 黄色
  - **里程碑**：空心圆，`var(--primary)` 蓝色边框加粗，表示重要目标（v1.0.0）
- 每个节点展示最多 2 条关键变更标签
- **交互**：点击节点平滑滚动到对应版本详情卡片

#### ② 模块开发进度（甘特图）

- 纵向列表展示各功能模块
- 每个模块一行：名称 + 进度条 + 百分比 + 状态标签 + 目标版本
- 进度条分段着色：
  - 已完成段：`var(--success)` 绿色
  - 进行中段：`var(--primary)` 蓝色
  - 未开始段：`var(--border-color)` 灰色
- 状态标签：已达成 / 攻坚中 / 战略必争
- **交互**：悬停显示 Tooltip（目标版本、预计完成时间）

#### ③ 版本统计卡片

2×2 网格展示关键指标：
- 已发布版本数
- 累计功能数（`Added` 类型变更数）
- 累计 Bug 修复数（`Fixed` 类型变更数）
- 计划中功能数（`upcoming` 数量）

#### ④ 版本详情卡片（纵向时间线）

- 按时间倒序排列版本
- 每个版本一张卡片：
  - 左侧彩色竖线（与状态对应）
  - 版本号 + 发布日期（真实数据，来自 Git tag）
  - 变更列表（带类型标签：新增/修复/变更/安全）
- 最底部附加"战略必争"虚线卡片，展示未来计划

#### ⑤ 战略目标卡片

- 展示下一个战略目标版本
- 当前目标：v0.5.0
- 附简短描述（如"经营分析会深化版"）

#### ⑥ 开发计划看板（Kanban）

- 四列：待评审 / 设计中 / 开发中 / 测试中
- 每列纵向排列计划卡片
- 卡片内容：
  - 计划编号（PLAN-XXX）+ 名称
  - 负责人（AI-1 / AI-2 / 待分配）
  - 目标版本
- **未来交互**（本版本仅展示）：
  - 卡片拖拽变更状态
  - 点击展开详情面板
  - 「只看我的」筛选

### 4.3 筛选功能

顶部提供筛选按钮组：

| 筛选项 | 作用范围 |
|--------|---------|
| 全部（默认） | 显示所有模块 |
| 已达成 | 只显示 `status='done'` 的模块 |
| 攻坚中 | 只显示 `status='doing'` 的模块 |
| 战略必争 | 只显示 `status='todo'` 的模块和 upcoming 计划 |

**当前实现**：筛选仅联动甘特图模块行。下一步需扩展至版本详情、开发计划看板。

---

## 5. 版本审计看板 Version Audit

### 5.1 背景与问题

当前项目存在"三个环境版本不一致"的管理风险：

| 环境 | 位置 | 风险 |
|------|------|------|
| **本地开发** | `/Users/jasonjing/DSTE-Prototype/src/` | 修改忘记提交/部署 |
| **Git 仓库** | GitHub `origin/main` + tags | tag 未推送 |
| **生产环境** | `47.101.197.187:/opt/meeting-reviewer/src/` | 实际运行版本与预期不符 |

### 5.2 页面结构

```
┌─────────────────────────────────────────────────────────────────────┐
│  版本审计 Version Audit                                             │
├─────────────────────────────────────────────────────────────────────┤
│  🌐 生产环境状态卡片                                                  │
│  hostname: iZbp1xxxxxxZ  |  timestamp: 2026-06-15 16:30:00          │
├─────────────────────────────────────────────────────────────────────┤
│  📊 三环境对比表格                                                    │
│  ┌──────────────┬─────────────┬─────────────┬─────────────────┐    │
│  │ 对比项        │ 本地 💻      │ Git 🐙      │ 生产 🌐          │    │
│  ├──────────────┼─────────────┼─────────────┼─────────────────┤    │
│  │ 前端版本      │ v0.4.10+M   │ v0.4.10     │ v0.4.10 ✅      │    │
│  │ cockpit.html  │ ?           │ ?           │ a971fce7 ✅     │    │
│  │ reviewer.html │ ?           │ ?           │ 1460b4b4 ✅     │    │
│  │ prompt_templates.py | ?    │ ?           │ a971fce7 ✅     │    │
│  │ proxy_server.py     | ?    │ ?           │ 1460b4b4 ✅     │    │
│  └──────────────┴─────────────┴─────────────┴─────────────────┘    │
├─────────────────────────────────────────────────────────────────────┤
│  🔄 [刷新对比]  [复制报告]                                            │
├─────────────────────────────────────────────────────────────────────┤
│  📋 部署检查清单                                                      │
│  □ 前端文件已构建（npm run build）                                    │
│  □ Cloudflare Worker 已部署                                           │
│  □ 版本审计数据已更新（POST /api/version-audit）                       │
│  □ Git tag 已推送（git push origin v0.x.x）                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 三个环境定义

| 环境 | 标识 | 数据来源 |
|------|------|---------|
| **本地 (Local)** | 💻 | `package.json` + `src/data/roadmap-data.json` |
| **Git** | 🐙 | `roadmap-data.json` 中的 `versions[0].version` |
| **生产 (Production)** | 🌐 | 后端 `/api/version-audit` 端点实时读取 |

### 5.4 后端 API（生产环境：Python Flask `proxy_server.py`）

DSTE 生产环境的 `/api/` 路由由 nginx 代理到本机的 Python Flask 服务 `proxy_server.py`（端口 8766）。版本审计接口实现并部署在该服务中，数据存储在 `version-audit.json` 文件。

**实现位置**：`proxy_server.py`（生产部署于 `/opt/meeting-reviewer/src/proxy_server.py`）

**`GET /api/version-audit`**

读取本地 `version-audit.json`：

```json
{
  "success": true,
  "environment": "production",
  "hostname": "iZuf60anmcq9kl7qn6o99xZ",
  "timestamp": "2026-06-15T20:27:23.912323",
  "version_tag": "v0.4.9",
  "frontend": {
    "version_tag": "v0.4.9",
    "cockpit_html": { "md5": "454748d5", "size": 354631 },
    "reviewer_html": { "md5": "d2ad22a5", "size": 25279 },
    "business_topics_html": { "md5": "b1f95245", "size": 42098 }
  },
  "backend": {}
}
```

若 `version-audit.json` 不存在，返回默认提示：

```json
{
  "success": true,
  "environment": "production",
  "hostname": "unknown",
  "timestamp": "...",
  "frontend": { "version_tag": "unknown" },
  "backend": {},
  "note": "尚未部署版本审计数据，请调用 POST /api/version-audit 更新"
}
```

**`POST /api/version-audit`**

用于部署时更新生产环境版本审计数据。可携带完整 JSON；若省略文件信息，服务端会自动从 `../dist/` 计算前端文件 MD5：

```bash
curl -X POST https://dste.fineres.com/api/version-audit \
  -H "Content-Type: application/json" \
  -d @version-audit.json
```

### 5.5 对比维度

| 维度 | 说明 |
|------|------|
| 版本号 | 粗粒度，前端从 `package.json` / `roadmap-data.json` 提取 |
| 文件 MD5 | 细粒度，追踪 `cockpit.html`、`reviewer.html`、`business-topics.html`、`prompt_templates.py`、`proxy_server.py` |
| 时间戳 | 辅助判断部署时机 |
| 状态图标 | ✅ 一致 / ❌ 不一致 / ⚠️ 未知（本地/Git MD5 在 Phase 1 可能未知） |

### 5.6 实现阶段

- **Phase 1（MVP）**：仅对比版本号；文件 MD5 仅显示生产环境
- **Phase 2（增强）**：构建时生成 `src/data/version-audit.json`，支持本地文件 MD5 对比

---

## 6. 数据模型

### 6.1 统一数据源

所有路标与版本相关数据的单一真相来源为 `src/data/roadmap-data.json`。

```json
{
  "versions": [...],
  "modules": [...],
  "upcoming": [...],
  "plans": [...]
}
```

### 6.2 versions（版本历史）

```typescript
interface Version {
  version: string;      // 语义化版本号，如 "v0.4.10"
  date: string;         // 发布日期，ISO 8601，如 "2026-06-10"
  status: "released" | "developing";
  changes: Change[];
}

interface Change {
  type: "Added" | "Fixed" | "Changed" | "Security";
  desc: string;         // 变更描述，支持 Markdown 加粗
}
```

### 6.3 modules（模块进度）

```typescript
interface Module {
  name: string;         // 模块名称
  progress: number;     // 完成百分比 0-100
  status: "done" | "doing" | "todo";
  targetVersion: string;
  owner?: string;       // 负责人，如 "AI-1"
}
```

### 6.4 upcoming（未来计划）

```typescript
interface Upcoming {
  name: string;         // 计划名称
  priority: "高" | "中" | "低";
  eta: string;          // 预计版本或"待定"
}
```

### 6.5 plans（开发计划看板）

```typescript
interface Plan {
  id: string;           // 计划编号，如 "PLAN-001"
  name: string;         // 计划名称
  priority?: "高" | "中" | "低";
  status: "待评审" | "设计中" | "开发中" | "测试中" | "已发布";
  owner: string;        // 负责人
  targetVersion: string;
  eta?: string;         // 预计完成日期
  progress?: number;    // 0-100
  issues?: string[];    // 关联 Issue 编号
  description?: string; // 详细描述
}
```

### 6.6 数据更新方式

#### 自动更新（版本历史）

每次打 tag 发布时，触发 `scripts/generate-roadmap-data.js`：

```bash
node scripts/generate-roadmap-data.js
```

脚本逻辑：
1. `git tag -l 'v*' --sort=-v:refname` 获取所有版本 tag
2. 读取 `CHANGELOG.md`，按版本解析 `Added/Fixed/Changed/Security` 分类
3. 读取 `docs/01-Product产品/开发计划.yml` 获取 plans 和 modules
4. 生成 `src/data/roadmap-data.json`
5. （可选）自动 commit：`chore(roadmap): auto-update for $(git describe --tags)`

#### 手动更新（开发计划）

开发计划需人工维护，更新文件 `docs/01-Product产品/开发计划.yml`：

```yaml
plans:
  - id: PLAN-001
    name: 战略地图可视化
    priority: 高
    status: 设计中
    owner: AI-1
    targetVersion: v0.5.0
    eta: "2026-06-30"
    progress: 15
    issues: ["#45", "#46"]
    description: 基于平衡计分卡四维度构建战略目标体系可视化
```

计划状态流转：

```
待评审 → 设计中 → 开发中 → 测试中 → 已发布
   ↑___________________________________|
   （测试不通过回退到开发中）
```

---

## 7. 视觉设计规范

### 7.1 色彩体系（复用 DSTE 现有变量）

| 元素 | 颜色变量 | 说明 |
|------|---------|------|
| 已发布节点 | `var(--success)` | 实心圆 |
| 开发中节点 | `var(--warning)` | 脉冲动画 |
| 里程碑节点 | `var(--primary)` | 空心圆+粗边框 |
| 进度条-已完成 | `var(--success)` | 绿色段 |
| 进度条-进行中 | `var(--primary)` | 蓝色段 |
| 进度条-未开始 | `var(--border-color)` | 灰色段 |
| 版本卡片竖线 | 与节点颜色一致 | 左侧 3px 边框 |
| 计划中卡片 | `var(--border-color)` 虚线 | 虚线边框区分 |
| 计划卡片-高优先级 | `var(--danger)` | 顶部红色标签 |
| 计划卡片-中优先级 | `var(--warning)` | 顶部黄色标签 |
| 计划卡片-低优先级 | `var(--success)` | 顶部绿色标签 |
| Kanban 列背景 | `var(--bg-secondary)` | 浅灰背景区分 |
| 一致状态 | `var(--success)` | 绿色 ✅ |
| 不一致状态 | `var(--danger)` | 红色 ❌ |
| 未知状态 | `var(--warning)` | 黄色 ⚠️ |

### 7.2 布局规范

| 模块 | 布局 | 间距 |
|------|------|------|
| 时间线轴 | 横向 flex，居中对齐 | 节点间距 80px |
| 甘特图+统计 | 左侧 2fr + 右侧 1fr grid | gap: 16px |
| 版本详情 | 纵向 flex，单列 | gap: 12px |
| 审计表格 | 表格，100% 宽度 | 单元格 padding 12px |
| 卡片内边距 | 16px | 与现有 card 一致 |
| 圆角 | 8px | 与现有设计一致 |

### 7.3 动画效果

| 交互 | 动画 | 时长 |
|------|------|------|
| 页面加载 | fadeIn + translateY(6px) | 0.25s ease |
| 进度条加载 | width 从 0% 到实际值 | 0.8s ease-out |
| 节点脉冲 | box-shadow 缩放循环 | 2s infinite |
| 卡片悬停 | translateX(4px) | 0.2s ease |

---

## 8. 交互设计

### 8.1 开发路线图操作流程

```
用户进入开发路线图页面
    │
    ▼
┌─────────────────┐
│ ① 看到时间线轴   │ ← 了解已发布/开发中/里程碑版本
│ ② 看到甘特图     │ ← 了解各模块完成度
│ ③ 看到统计卡片   │ ← 了解整体数据
│ ④ 看到版本详情   │ ← 了解每个版本具体改了什么
│ ⑤ 看到开发计划看板│ ← 了解当前进行中的计划
└─────────────────┘
    │
    ▼
用户点击时间线节点 / 筛选按钮
    │
    ▼
页面自动滚动到对应版本详情卡片 / 甘特图模块联动过滤
```

### 8.2 版本审计操作流程

```
用户进入版本审计页面
    │
    ▼
页面自动调用 /api/version-audit 读取生产环境状态
    │
    ▼
页面同时读取本地 package.json 和 roadmap-data.json
    │
    ▼
渲染三环境对比表格，标记 ✅/❌/⚠️
    │
    ▼
用户点击 [刷新对比] → 重新拉取所有数据
用户点击 [复制报告] → 复制 Markdown 格式报告到剪贴板
```

### 8.3 开发计划看板交互（未来版本）

**拖拽流转**：
- 计划卡片可在 Kanban 列之间拖拽
- 拖拽后自动更新 `docs/01-Product产品/开发计划.yml` 中的 `status` 字段
- 从"测试中"拖到"已发布"时，弹出确认对话框："确认计划已发布？将自动关联到对应版本。"

**卡片点击**：
- 点击展开右侧详情面板
- 面板显示：完整描述、关联 Issues、历史状态变更记录、操作日志

**快捷操作**：
- 卡片右上角「...」菜单：编辑 / 删除 / 标记阻塞 / 关联 Issue
- 阻塞状态：卡片变灰，显示阻塞原因标签

---

## 9. 技术实现方案

### 9.1 修改文件清单

| # | 文件 | 修改内容 |
|---|------|---------|
| 1 | `src/lib/config.js` | 系统管理分组新增"版本审计"入口；`PAGE_NAMES` 新增映射 |
| 2 | `src/cockpit.html` | 注册 `dashboard/version-audit`；`renderDevTimeline` 改为读取 `roadmap-data.json` |
| 3 | `src/cockpit.html` | 新增 `renderVersionAudit()` 函数及数据加载/事件处理函数 |
| 4 | `proxy_server.py` | 新增 `GET/POST /api/version-audit` 端点，数据持久化到 `version-audit.json` |
| 5 | `api-worker/worker.js` | 可选：同样新增 `/api/version-audit` 端点（供 Cloudflare Worker 场景使用） |
| 6 | `scripts/generate-version-audit.cjs` | 新增：从 dist 计算文件 MD5，输出版本审计 JSON |
| 7 | `scripts/generate-roadmap-data.js` | 确保稳定生成 `roadmap-data.json` |
| 8 | `.github/workflows/update-roadmap.yml` | tag push 时触发自动生成 |
| 9 | `docs/01-Product产品/开发计划.yml` | 新增/维护开发计划数据源 |
| 10 | `tests/e2e/version-audit.spec.js` | 新增版本审计 E2E 测试 |

### 9.2 renderDevTimeline 数据加载改造

当前 `renderDevTimeline()` 使用硬编码数据，需改造为：

```javascript
async function renderDevTimeline() {
  let roadmapData;
  try {
    const res = await fetch('data/roadmap-data.json');
    roadmapData = await res.json();
  } catch (e) {
    console.warn('无法加载 roadmap-data.json，使用兜底数据', e);
    roadmapData = getFallbackRoadmapData();
  }
  // ... 后续渲染逻辑不变
}
```

### 9.3 renderVersionAudit 实现要点

```javascript
async function renderVersionAudit() {
  const [pkg, roadmap, audit] = await Promise.all([
    fetch('../package.json').then(r => r.json()).catch(() => ({ version: 'unknown' })),
    fetch('data/roadmap-data.json').then(r => r.json()).catch(() => ({ versions: [] })),
    fetch('/api/version-audit').then(r => r.json()).catch(() => ({ success: false }))
  ]);

  const localVersion = pkg.version || roadmap.versions[0]?.version || 'unknown';
  const gitVersion = roadmap.versions[0]?.version || 'unknown';
  const prodVersion = audit.success ? audit.frontend.version_tag : 'unknown';

  // 渲染对比表格...
}
```

### 9.4 后端 `/api/version-audit` 实现要点

```python
import hashlib
import os

@app.route('/api/version-audit', methods=['GET'])
def version_audit():
    base = '/opt/meeting-reviewer/src/'
    files = {
        'cockpit_html': os.path.join(base, 'cockpit.html'),
        'reviewer_html': os.path.join(base, 'reviewer.html'),
        'business_topics_html': os.path.join(base, 'business-topics.html'),
        'proxy_server': os.path.join(base, 'proxy_server.py'),
        'prompt_templates': os.path.join(base, 'prompt_templates.py'),
    }
    result = {'success': True, 'environment': 'production', 'frontend': {}, 'backend': {}}
    for key, path in files.items():
        if os.path.exists(path):
            with open(path, 'rb') as f:
                md5 = hashlib.md5(f.read()).hexdigest()[:8]
            stat = os.stat(path)
            info = {'md5': md5, 'mtime': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S'), 'size': stat.st_size}
            if key.endswith('_html'):
                result['frontend'][key] = info
            else:
                result['backend'][key] = info
    return jsonify(result)
```

### 9.5 不引入的新依赖

- 不使用 ECharts、D3 等图表库
- 不使用额外 CSS 框架
- YAML 解析使用 Node.js 内置或轻量级库
- 全部用内联样式 + 现有 CSS 变量实现

---

## 10. 验收标准

### 10.1 开发路线图

- [ ] 侧边栏正确显示"开发路线图"入口
- [ ] 点击后进入页面，面包屑显示"驾驶舱 / 开发路线图"
- [ ] 时间线轴显示真实版本节点（来自 `roadmap-data.json`）
- [ ] 甘特图显示所有模块的进度条 + 状态标签 + 目标版本
- [ ] 统计卡片显示正确数字（来自真实数据）
- [ ] 版本详情卡片显示真实 CHANGELOG 内容
- [ ] 开发计划看板四列正确显示
- [ ] 筛选按钮可用，至少联动甘特图

### 10.2 版本审计看板

- [ ] 侧边栏正确显示"版本审计"入口
- [ ] 点击后进入页面，面包屑显示"驾驶舱 / 版本审计"
- [ ] `/api/version-audit` 返回 JSON，包含 frontend/backend 对象
- [ ] 页面渲染对比表格，至少显示生产环境数据
- [ ] 本地与生产版本一致时显示绿色 ✅
- [ ] 本地与生产版本不一致时显示红色 ❌
- [ ] 刷新按钮重新调用 API，更新时间戳
- [ ] 复制报告按钮生成 Markdown 格式报告

### 10.3 数据与自动化

- [ ] 打新 tag 后，`scripts/generate-roadmap-data.js` 正确生成 `roadmap-data.json`
- [ ] `roadmap-data.json` 包含最新版本数据
- [ ] 页面刷新后显示最新版本信息

### 10.4 回归测试

- [ ] pytest 回归测试 30/30 通过
- [ ] Playwright E2E 测试通过（含 `roadmap.spec.js` 和新增 `version-audit.spec.js`）
- [ ] Light/Dark 主题切换正常
- [ ] 移动端响应式正常

---

## 11. 当前实现缺口与 TODO

| 优先级 | 缺口 | 说明 | 计划版本 |
|-------|------|------|---------|
| **高** | **数据未从 JSON 加载** | `renderDevTimeline()` 已改造为读取 `window._roadmapData`，在 `init()` 中预加载 `roadmap-data.json`，保留硬编码兜底 | ✅ 已修复 |
| **高** | **数据不同步** | `roadmap-data.json` 现在由 `scripts/generate-roadmap.cjs` 从 CHANGELOG 生成，页面实时加载最新数据 | ✅ 已修复 |
| **高** | **版本审计看板未实现** | 已实现：Cloudflare Worker 提供 `/api/version-audit`，前端 `renderVersionAudit()` 渲染对比表格 | ✅ 已修复 |
| **中** | **筛选联动不完整** | 筛选仅影响甘特图，时间线、统计、版本详情、看板不参与联动 | v0.5.0 |
| **中** | **看板卡片无详情面板** | 点击计划卡片无法展开详情 | v0.5.0 |
| **中** | **无"只看我的"筛选** | PRD 设计，未实现 | v0.5.0 |
| **中** | **看板拖拽未实现** | 计划卡片无法在 Kanban 列间拖拽流转 | v0.6.0 |
| **低** | **无导出功能** | PRD 建议"暂不实现" | 后续 |
| **低** | **数据生成脚本未集成 CI** | `scripts/generate-roadmap-data.js` 存在，但无 `.github/workflows/update-roadmap.yml` | 后续 |
| **低** | **开发计划 YAML 不存在** | `docs/01-Product产品/开发计划.yml` 被 PRD 引用，但文件不存在 | 后续 |

---

## 12. 待确认事项

| #   | 问题               | 建议方案                                          | 状态    |
| --- | ---------------- | --------------------------------------------- | ----- |
| 1   | 页面放驾驶舱下还是独立导航？   | 放驾驶舱下，作为驾驶舱子页面                                | ✅ 已确认 |
| 2   | 数据更新方式           | 自动生成：Git tag + CHANGELOG 解析 + CI 自动提交         | ✅ 已确认 |
| 3   | 甘特图是否支持拖拽调整？     | 纯展示，模块进度由开发计划状态自动计算                           | ✅ 已确认 |
| 4   | 计划中功能是否显示负责人？    | 显示负责人，从开发计划 YAML 中读取                          | ✅ 已确认 |
| 5   | 是否需要导出功能？        | 暂不实现                                          | ✅ 已确认 |
| 6   | 版本审计本地 MD5 如何获取？ | Phase 1 不做；Phase 2 构建时生成 `version-audit.json` | 待确认   |
| 7   | 开发计划数据源          | 本地 YAML，不依赖 GitHub Issues                     | 待确认   |
| 8   | 拖拽状态变更后如何持久化？    | 写入 YAML 文件，通过脚本回写                             | 待确认   |
| 9   | 多 AI 协作负责人标识     | 用 AI-1 / AI-2 代号，与 AGENTS.md 对齐               | 待确认   |

---

## 13. 附录

### 13.1 参考截图

当前 DSTE 驾驶舱页面风格：
- 顶部导航：56px 高度，深色/浅色自适应
- 侧边栏：220px 宽度，白色背景
- 卡片：白色背景，8px 圆角，1px 边框
- 按钮：8px 圆角，primary/secondary 两种风格

### 13.2 相关文档

- [[DSTE 项目 README]]
- [[CHANGELOG]]
- [[RFC-005 版本审计看板]]
- [[开发路线图原始 PRD]]

### 13.3 术语表

| 术语 | 说明 |
|------|------|
| Road Map | 开发路线图，展示版本历史与未来计划 |
| Version Audit | 版本审计，对比本地/Git/生产环境一致性 |
| Kanban | 看板，用于展示开发计划状态流转 |
| CHANGELOG | 版本变更日志，遵循 Keep a Changelog 格式 |
| SemVer | 语义化版本控制，v0.4.10 格式 |

---

> **确认方式**：修改"待确认事项"表格的"状态"列，或直接在对话中确认。确认后开始开发。
