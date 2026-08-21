# ADR-004: 混合架构（SPA 壳 + 独立 HTML 页 + iframe keep-alive）

> 状态：`accepted` | 日期：2026-08-21

---

## 上下文

ADR-001 选择了 SPA Shell 架构（`cockpit.html` 单文件 + hash 路由）。此后大模块逐个拆为独立 HTML 页面：`vite.config.js` 的 `rollupOptions.input` 现注册 18 个入口，BP（`bp.html`）、经营分析会（`meetings.html`）、十五五知识库（`knowledge.html`）、战略地图（`strategy-map.html` 等）均为独立页，驾驶舱不再是唯一的页面载体。

ADR-001 当初否决多页应用（MPA）的两条核心理由，已被后来的机制消解：

1. **"顶部导航 + 侧边栏需要在每个页面重复"** → `src/lib/shell-injector.js` 给每个独立页注入统一 shell，导航只维护一份。
2. **"整页刷新，切换有白屏 / 状态丢失"** → 独立页在 cockpit 内以 iframe keep-alive 嵌入：容器常驻 `#workspace-panes`，切页只切显隐；超出上限（`src/cockpit.html` 的 `WORKSPACE_IFRAME_KEEPALIVE_MAX = 5`）时按 LRU 销毁最久未激活的容器。

同时，ADR-003 预留的微前端接口 `window.DSTEPage` 从未实现——大模块没有走"提取 render 函数 → 暴露 DSTEPage"的路线，而是直接拆成独立页。需要一篇 ADR 把事实上的架构固化下来。

## 决策

接受**混合架构**为正式架构：`cockpit.html` 作为 SPA 壳与工作区，轻量页面仍在壳内以 `PAGES{}` 渲染函数实现，大型模块拆为独立 HTML 页面、经 iframe keep-alive 嵌入工作区。ADR-003 的微前端路线（`window.DSTEPage`）废弃，标记为 `superseded`。

## 考虑的选项

### 选项 A：坚持纯 SPA，所有页面回收到 cockpit.html

- ✅ 架构概念单一
- ❌ cockpit.html 已膨胀到 8000+ 行，继续回收不可维护
- ❌ 多 AI 并行开发在同一文件上必然冲突

### 选项 B：引入完整微前端框架（qiankun / Module Federation）

- ✅ 完整的隔离与生命周期管理
- ❌ 与纯 HTML + Vite 多入口的现状不匹配，过度设计（同 ADR-003 的结论）

### 选项 C：混合架构（SPA 壳 + 独立页 + iframe keep-alive）（推荐）

- ✅ 独立页各自构建、独立部署节奏，多 AI 并行无冲突
- ✅ shell-injector 统一导航，iframe keep-alive 保住切换体验
- ✅ 零新依赖，机制已在生产验证
- ⚠️ 两套页面形态并存，需要 `PAGE_META` 明确登记每个页面的归属

## 为什么选这个？

1. **它已经是现实**——18 个 Vite 入口、15 个 `isExternal` 页面在生产运行，本文是把事实架构追认为正式决策
2. **ADR-001 的否决理由已不成立**，继续声称"纯 SPA"只会误导新开发者
3. **比微前端框架轻得多**，与项目 Vanilla JS 的技术取向一致

## 现状机制

| 机制 | 位置 |
|------|------|
| 页面元数据（`isExternal` / `externalFile`） | `src/lib/config.js` 的 `PAGE_META` |
| 外部页跳转映射 | `src/lib/config.js` 的 `EXTERNAL_PAGES` |
| 统一 shell 注入（独立页 standalone 访问时） | `src/lib/shell-injector.js` |
| 嵌入模式（`?embed=1` 隐藏自身 shell） | `src/lib/shell-injector.js` |
| iframe keep-alive + LRU 缓存（上限 5） | `src/cockpit.html` 的 `#workspace-panes` 与 keep-alive 段 |
| 父子页 postMessage 桥 | `dste-navigate` / `dste-open-palette`（shell-injector.js）、`dste-open-record`（cockpit.html） |

## 后果

### 积极的

- 架构文档与代码现实一致，新页面该走哪条路有章可循（见 `docs/04-Guide开发指南/new-page.md`）
- 大模块独立演进，cockpit.html 停止膨胀
- 多 AI 并行开发按文件边界分工，冲突大幅减少

### 消极的 / 风险

- 内部页（`PAGES{}`）与外部页（iframe）两套生命周期并存，跨页通信只能靠 postMessage 桥
- keep-alive 有上限（5），超出后最久未用的外部页会重载，状态丢失
- 新增外部页需要同时登记 `vite.config.js`、`PAGE_META`、（按需）`EXTERNAL_PAGES`，步骤比内部页多

## 参考

- ADR-001: 单页应用 vs 多页应用（历史决策，本文加注保留）
- ADR-003: 微前端架构（`superseded by ADR-004`）
- RFC-001: 导航架构 V2（`docs/02-RFC功能设计/001-navigation-arch.md`）
- RFC-010: 工作区页签 keep-alive（`docs/02-RFC功能设计/010-workspace-tab-keepalive.md`）
