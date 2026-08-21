# 架构说明

## 整体架构

```
┌──────────────────────────────────────────────────────┐
│                    用户浏览器                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ index.html  │  │cockpit.html │  │reviewer.html│  │
│  │   登录页     │  │  SPA Shell  │  │  独立页面    │  │
│  └─────────────┘  └──────┬──────┘  └─────────────┘  │
│                          │                          │
│                    ┌─────┴─────┐                     │
│                    │  Hash 路由 │                     │
│                    │ #dashboard │                     │
│                    │ #sp/...    │                     │
│                    │ #exe/...   │                     │
│                    └─────┬─────┘                     │
│                    ┌─────┴─────┐                     │
│                    │ PAGES{}    │                     │
│                    │ 渲染函数   │                     │
│                    └───────────┘                     │
└──────────────────────────────────────────────────────┘
                          │
                    ┌─────┴─────┐
                    │  nginx    │
                    │  SSL 443  │
                    │ /api/代理  │
                    └─────┬─────┘
          ┌───────────────┼───────────────┐
    ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐
    │ 服务器    │   │Cloudflare │   │CAS 认证   │
    │ 静态资源  │   │  Worker   │   │passport.  │
    │ + Flask   │   │AI 网关+KV │   │fanruan.com│
    │ 审核:8766 │   │api.dste.* │   │           │
    └───────────┘   └───────────┘   └───────────┘
```

> **注**：会议材料审核 Flask 服务（端口 8766）属独立仓库 `meeting-material-reviewer`，生产环境 nginx 将 `/api/` 按路径分流：审核端点回 Flask，其余走 Cloudflare Worker。

## SPA Shell 模式

`cockpit.html` 采用 SPA Shell 架构：

- **顶部导航栏**：固定，6 个 DSTE 阶段
- **左侧边栏**：根据当前阶段动态渲染
- **内容区**：根据 hash 路由渲染不同页面内容
- **外部页面**：多数功能模块已拆为独立页面（`vite.config.js` 共 18 个构建入口，如 bp、meetings、strategy-map、knowledge、rule-engine、marketing-budget 等），通过跳转离开 SPA

### 路由机制

```javascript
// URL: cockpit.html#exe/meetings
const hash = window.location.hash.slice(1); // "exe/meetings"
const pageFn = PAGES[hash];                  // renderMeetings
content.innerHTML = pageFn();                // 渲染内容
```

### 数据流

```
用户点击 → hashchange 事件 → navigate() → 更新导航状态 → 渲染内容
```

## 多 AI 协作架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   架构 AI       │     │   功能 AI A     │     │   功能 AI B     │
│  (本窗口)       │     │  (经营分析会)   │     │  (战略地图)     │
│                 │     │                 │     │                 │
│ • 路由/导航     │◄────│ • renderMeetings│     │ • renderStrategy│
│ • 部署/CI       │     │ • 测试          │     │ • 测试          │
│ • 代码审查      │◄────┘                 │     │                 │
│ • 合并发布      │◄──────────────────────┘     │                 │
└─────────────────┘                             │                 │
        │                                       │                 │
        ▼                                       ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub 仓库                                  │
│              jingjason1998-cloud/DSTE-Prototype                 │
└─────────────────────────────────────────────────────────────────┘
```

## 微前端接口（预留）

未来每个页面模块可独立开发，通过 `window.DSTEPage` 接口挂载：

```javascript
window.DSTEPage = {
  name: '经营分析会',
  phase: 'exe',
  init(container) { /* 渲染 */ },
  destroy() { /* 清理 */ }
};
```

当前阶段：接口已定义，解耦进行中——BP 模块已拆出为独立页面 `src/bp.html` + `src/pages/bp/`（`ap_saveKeyTask`、`omp_buildYearSeed` 等函数已移至 `src/pages/bp/main.js` 与 `src/lib/omp-store.js`），其余模块的渲染函数仍在 cockpit.html 内。
