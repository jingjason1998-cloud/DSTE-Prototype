# RFC-005: 版本审计看板（Version Audit Dashboard）

## 背景与问题

当前项目存在"三个环境版本不一致"的管理风险：

| 环境 | 位置 | 当前状态 |
|------|------|---------|
| **本地开发** | `/Users/jasonjing/DSTE-Prototype/src/` | main 分支 + Roadmap Kanban 未提交修改 |
| **Git 仓库** | GitHub `origin/main` + `v0.3.3` tag | v0.3.3 已推送，main 分支有 2 个未推送 commit |
| **生产环境** | `47.101.197.187:/opt/meeting-reviewer/src/` | 前端 v0.3.3，后端 prompt 已移除 self-check |

运维过程中多次出现：
- 前端已部署但后端未同步（或反之）
- 本地修改忘记提交/部署
- 生产环境实际运行的版本与预期不符
- 需要手动 SSH + `md5sum` 才能确认一致性

## 目标

在驾驶舱内提供**一键可见**的三个环境版本对比看板，让任何开发者/运维人员在 3 秒内判断：
1. 生产环境当前运行的是什么版本
2. 本地与生产是否一致
3. Git 最新 tag 与生产是否一致
4. 哪些文件存在差异（精确到 MD5）

## 方案概述

```
┌─────────────────────────────────────────────────────────────┐
│                    版本审计看板                                │
├─────────────────────────────────────────────────────────────┤
│  环境对比表                                                   │
│  ┌──────────┬─────────────┬─────────────┬─────────────────┐ │
│  │ 对比项    │ 本地开发      │ Git 仓库      │ 生产环境          │ │
│  ├──────────┼─────────────┼─────────────┼─────────────────┤ │
│  │ 前端版本  │ v0.3.3+M    │ v0.3.3      │ v0.3.3 ✅       │ │
│  │ prompt    │ a971fce7    │ ?           │ a971fce7 ✅     │ │
│  │ proxy     │ 1460b4b4    │ ?           │ 1460b4b4 ✅     │ │
│  └──────────┴─────────────┴─────────────┴─────────────────┘ │
│                                                              │
│  [🔄 刷新对比]  [📋 复制报告]                                 │
└─────────────────────────────────────────────────────────────┘
```

## 三个环境的定义

| 环境 | 标识 | 数据来源 |
|------|------|---------|
| **本地 (Local)** | 💻 | 浏览器当前加载的页面 + `package.json` + `roadmap-data.json` |
| **Git** | 🐙 | GitHub API / 本地 `git` 命令生成的 `version-audit.json` |
| **生产 (Production)** | 🌐 | 后端 `/api/version-audit` 端点实时读取服务器文件 |

## 对比维度

### 1. 版本号（粗粒度）
- 前端：从 `cockpit.html` 提取 `v0.x.x`
- 后端：无独立版本号，以文件 MD5 标识

### 2. 文件级 MD5（细粒度）
必追踪的关键文件：

| 文件 | 类型 | 说明 |
|------|------|------|
| `cockpit.html` | 前端主入口 | SPA 壳 + 所有页面渲染函数 |
| `reviewer.html` | 前端 | 会议材料审核助手 |
| `business-topics.html` | 前端 | 业务专题管理 |
| `prompt_templates.py` | 后端 | AI Prompt 模板（评分漂移修复在此） |
| `proxy_server.py` | 后端 | Flask API 服务入口 |

### 3. 时间戳
- 文件最后修改时间（辅助判断部署时机）

## 后端 API 设计

### `GET /api/version-audit`

返回生产环境当前文件状态。

**响应格式：**
```json
{
  "success": true,
  "environment": "production",
  "hostname": "iZbp1xxxxxxZ",
  "timestamp": "2026-05-23 16:30:00",
  "frontend": {
    "version_tag": "v0.3.3",
    "cockpit_html": {
      "md5": "1460b4b41ce843d6",
      "mtime": "2026-05-23 08:07:04",
      "size": 148202
    },
    "reviewer_html": { "md5": "...", "mtime": "...", "size": 195552 },
    "business_topics_html": { "md5": "...", "mtime": "...", "size": 205440 }
  },
  "backend": {
    "proxy_server": { "md5": "1460b4b4...", "mtime": "...", "size": 33097 },
    "prompt_templates": { "md5": "a971fce7...", "mtime": "...", "size": 36534 }
  }
}
```

**实现位置：** `proxy_server.py` 新增端点（文件末尾，主路由之前）。

**依赖：** 需导入 `hashlib`（用于 MD5 计算）。

## 前端页面设计

### 路由
`#dashboard/version-audit`

### 页面结构

```
版本审计 Version Audit
├── 🌐 生产环境状态卡片（调用 /api/version-audit）
│   └── 显示 hostname、timestamp、各文件 MD5
│
├── 📊 三环境对比表格
│   ├── 表头：对比项 | 本地 💻 | Git 🐙 | 生产 🌐
│   ├── 行1：前端版本
│   ├── 行2：cockpit.html MD5
│   ├── 行3：reviewer.html MD5
│   ├── 行4：business-topics.html MD5
│   ├── 行5：prompt_templates.py MD5
│   └── 行6：proxy_server.py MD5
│   └── 状态图标：✅ 一致 / ❌ 不一致 / ⚠️ 未知
│
├── 🔄 操作区
│   ├── [刷新对比] 按钮 → 重新调用 API + 读取本地数据
│   └── [复制报告] 按钮 → 复制 Markdown 格式对比表到剪贴板
│
└── 📋 部署检查清单
    ├── □ 前端文件已构建（npm run build）
    ├── □ 后端文件已同步（rsync prompt_templates.py）
    ├── □ 后端服务已重启（proxy_server.py）
    └── □ Git tag 已推送（git push origin v0.x.x）
```

### 数据流

```
┌─────────────┐     fetch      ┌────────────────────┐
│ 前端页面     │ ─────────────→ │ /api/version-audit │
│ (浏览器)     │                │ (proxy_server.py)  │
└─────────────┘                └────────────────────┘
       │                                │
       │ 读取本地数据                    │ 读取服务器文件
       │ (package.json /                │ (md5 / mtime)
       │  roadmap-data.json)            │
       ▼                                ▼
   本地版本号                      生产版本号
       │                                │
       └──────────→ 对比渲染 ←──────────┘
```

### 本地数据来源

| 信息 | 来源文件 | 读取方式 |
|------|---------|---------|
| 前端版本号 | `package.json` | `fetch('../package.json')` |
| Git 最新 tag | `src/data/roadmap-data.json` | `fetch('data/roadmap-data.json')` → `versions[0].version` |
| 本地文件 MD5 | 不可直接获取 | **Phase 1 跳过**，Phase 2 通过构建时注入 |

> **Phase 1（MVP）**：仅对比**版本号**（本地 vs Git vs 生产），文件 MD5 仅显示生产环境。
> **Phase 2（增强）**：构建时生成 `version-audit.json`，包含本地文件 MD5。

## 侧边栏入口

在 `SIDEBAR_CONFIG.dashboard` 的"系统管理"分组下新增：

```javascript
{ id: 'dashboard/version-audit', icon: '🔍', label: '版本审计 Version Audit' }
```

## 测试计划

| 测试项 | 预期结果 |
|--------|---------|
| `/api/version-audit` 返回 JSON | success=true，包含 frontend/backend 对象 |
| 页面渲染对比表格 | 至少显示生产环境数据 |
| 本地与生产版本一致时 | 显示绿色 ✅ |
| 本地与生产版本不一致时 | 显示红色 ❌ |
| 刷新按钮 | 重新调用 API，更新时间戳 |

## 实现步骤（开发顺序）

1. **后端**：`proxy_server.py` 增加 `/api/version-audit` 端点
2. **前端**：`cockpit.html` 增加 `renderVersionAudit()` 函数
3. **路由**：`PAGES` 注册 `dashboard/version-audit`
4. **侧边栏**：`SIDEBAR_CONFIG.dashboard` 增加入口
5. **测试**：Playwright E2E 测试（页面加载 + API 响应）
6. **部署**：同步 proxy_server.py + 重启后端

## 影响范围

| 文件 | 变更类型 | 风险 |
|------|---------|------|
| `proxy_server.py` | 新增端点 | 低（只读操作，不影响现有 API） |
| `cockpit.html` | 新增页面函数 + 侧边栏项 | 低（纯新增，不修改现有逻辑） |
| `tests/e2e/` | 新增测试 | 无 |

## 待确认决策

1. **是否需要在构建时生成本地 MD5？**
   - 方案 A：Phase 1 不做，仅对比版本号
   - 方案 B：增加 `scripts/generate-version-audit.js`，构建时生成 `src/data/version-audit.json`

2. **Git 版本信息来源？**
   - 方案 A：读取 `roadmap-data.json`（已有 Git tag 数据）
   - 方案 B：前端直接调用 GitHub API（需处理 CORS/Token）

3. **是否显示文件大小（size）？**
   - 建议显示，便于快速判断是否同一版本（不同构建大小通常不同）
