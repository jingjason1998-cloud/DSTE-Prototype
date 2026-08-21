# RFC-010: 工作区页签切换状态保持（keep-alive）

> 状态：`implemented` | 作者：Kimi | 日期：2026-08-20

---

## 摘要

驾驶舱多标签工作区切换页签时不再整页重建：外部页 iframe 常驻 DOM（keep-alive，切走仅 `display:none`），SPA 内部页在切换前做轻量状态快照（滚动位置 + 表单值）、切回后恢复。

## 背景

v0.7.2 引入的持久化多标签工作区（`src/lib/workspace-tabs.js` + `cockpit.html` 页签栏）只持久化「开了哪些标签」，不保持页面运行时状态：

- `switchTab()` → `_renderPage(tab.pageId, true)` 无条件整页重渲染；
- 外部页每次 `contentEl.innerHTML = ...` 新建 iframe 并重设 `src`，旧 iframe 销毁 → 页面整页重载；
- SPA 内部页 `contentEl.innerHTML = PAGES[pageId]()`，DOM 整体重写。

用户痛点：页签栏切换标签（如 经营分析会 → 干部管理 → 切回）时页面整页刷新，滚动位置、筛选、展开状态、输入内容全部丢失。

## 目标

1. 外部页页签切走再切回 **零重载**（iframe 不重建、不重新设置 src）；
2. SPA 内部页切回后恢复滚动位置与表单输入值；
3. 内存可控：keep-alive iframe 数量有上限（LRU 淘汰）；
4. 嵌入页（iframe 内部）零改动。

## 方案设计

采用方案 D = A（外部页 iframe keep-alive）+ C（内部页轻量状态快照）混合。

### A. 外部页 iframe keep-alive

#### DOM 结构

在 `#page-content` 同级新增 `#workspace-panes` 容器，专放外部页 keep-alive 容器，避免内部页 `innerHTML` 重渲染误销 iframe：

```html
<main class="content-area content-area--tabs" id="content-area">
  <div class="page-tabs" id="page-tabs"></div>
  <div class="page-content" id="page-content"></div>      <!-- SPA 内部页 -->
  <div class="workspace-panes" id="workspace-panes"></div> <!-- 外部页 iframe keep-alive -->
</main>
```

每个外部页页签对应一个 `.workspace-iframe-wrap[data-page-id]`，切换页签只切换 `display:none/block`：

```
#workspace-panes
├── .workspace-iframe-wrap[data-page-id="exe/meetings"]   (display:block)
├── .workspace-iframe-wrap[data-page-id="sp/strategy-map"] (display:none)
└── ...
```

#### 行为规则

- iframe **只在首次激活该页签时创建**并设置 `src`（沿用 `${meta.externalFile}?embed=1&pageId=...`），骨架屏只在首次加载时显示；切回已加载页签直接 `display:block`，零重载；
- 渲染内部页时 `#workspace-panes` 整体 `display:none`（容器与 iframe 全部保留），`#page-content` 恢复显示；
- 渲染外部页时 `#page-content` 隐藏、`#workspace-panes` 显示，对应 wrap 显示、其余 wrap 隐藏；
- 关闭外部页页签 → 移除对应 wrap 节点；页签内 `navigate()` 从外部页跳到其他页 → 旧 pageId 的 wrap 移除；
- iframe 与 wrap 均带 `data-page-id`，所有运行时查询按 pageId 定位。

#### postMessage 路由

- `dste-embed-resize`：按 `event.source` 匹配到具体 iframe（遍历 `.workspace-iframe` 比较 `contentWindow`），只调整该 iframe 高度；隐藏中的 iframe 高度同样生效，下次显示即为正确高度；
- `_postPendingRecordToIframe`（命令面板记录级跳转）：按当前活动 pageId 定位 wrap 内的 iframe，不再用单数 `querySelector('.workspace-iframe')`。

#### LRU 内存兜底

- 常量 `WORKSPACE_IFRAME_KEEPALIVE_MAX = 5`：keep-alive iframe 上限；
- 每次激活某 wrap 时刷新其 `data-last-active` 时间戳；
- 新建 wrap 前若已上限，销毁 `data-last-active` 最小（最久未激活）的非活动 wrap；下次激活该页时按首次加载重建（骨架屏 + 重载）。

### C. SPA 内部页轻量状态快照

- 切换离开一个内部页页签前（`switchTab`），记录到内存 Map（key = tabId，不写 localStorage）：
  - `#page-content.scrollTop` 与 `window.scrollY`；
  - 页面内 `input/select/textarea` 的值（按元素 `id` 为 key，无 id 跳过；checkbox/radio 记 `checked`）；
- 切回该页签、`PAGES[pageId]()` 重渲染后恢复上述值（不触发 change 事件，避免副作用）；
- 页签关闭时删除对应快照；
- 明确不做：组件态恢复（展开卡片等）；OMP 页面已有 `window._ompState` 自行处理。

```javascript
// tabId -> 快照
const _tabSnapshots = new Map();
// { pageId, scrollTop, windowScrollY, fields: { [elementId]: { value } | { checked } } }
```

### 用户界面

页签栏外观与交互不变，仅切换体验从「白屏重载」变为「瞬时呈现」。

## 替代方案

- **方案 B：内部页也 keep-alive（DOM 缓存）**：内部页 DOM 与全局状态耦合深（事件委托、定时器、全局变量），缓存 DOM 风险高、收益低，放弃；
- **快照写 localStorage**：跨刷新恢复表单草稿易与用户预期冲突（陈旧数据），且隐私敏感，放弃——快照仅内存级；
- **无上限 keep-alive**：iframe 页面（meetings/bp 等）内存占用可观，不加限制会随页签增长失控，故加 LRU 上限 5。

## 影响范围

- `src/cockpit.html`：`#workspace-panes` 结构 + CSS、`_renderPage` 外部/内部分支、`switchTab`/`closeTab`/LRU、`dste-embed-resize` 与 `_postPendingRecordToIframe` 的 iframe 定位；
- `src/styles/shell.css`：`#workspace-panes` 布局样式；
- 嵌入页（meetings.html 等）零改动；
- 测试：`tests/e2e/workspace-tabs.spec.js` 扩展（keep-alive 不重建、状态保留、关闭清理、LRU、内部页滚动恢复）；受影响的 `external-pages-embed.spec.js`、`command-palette.spec.js` 等选择器适配。

## 任务拆分

- [x] `#workspace-panes` 容器 + CSS
- [x] `_renderPage` 外部页 keep-alive 分支（首次创建 + LRU 淘汰）
- [x] 内部页快照/恢复 + `switchTab`/`closeTab` 钩子
- [x] `dste-embed-resize` / `_postPendingRecordToIframe` 按 pageId/event.source 定位
- [x] E2E 测试
- [x] 文档更新（本 RFC）

## 参考

- `src/lib/workspace-tabs.js`（标签状态层）
- RFC 相关工作区初版：v0.7.2「驾驶舱持久化多标签工作区」
