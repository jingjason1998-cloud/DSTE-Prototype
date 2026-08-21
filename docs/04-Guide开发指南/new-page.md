# 开发新页面指南

## 方式一：嵌入 SPA（推荐）

适合：驾驶舱内的功能页面（dashboard/sp/bp/exe/rev/ai 下的页面）

### 步骤

1. **在 `src/cockpit.html` 中找到 `PAGES` 对象**，添加你的渲染函数：

```javascript
const PAGES = {
  // ... 已有页面
  'exe/meetings': renderMeetings,  // 已存在，替换实现
  'sp/my-new-page': renderMyNewPage,  // 新增
};
```

2. **在 `src/lib/config.js` 的 `SIDEBAR_CONFIG` 中添加导航项**：

```javascript
sp: [
  { type: 'group', title: '战略制定 (SP)', items: [
    { id: 'sp/strategy-map', icon: 'sp/strategy-map', label: '战略地图' },
    { id: 'sp/my-new-page', icon: 'star', label: '我的新页面' },  // 新增（图标用 Phosphor 图标键，不用 emoji）
  ]},
],
```

3. **写渲染函数**：

```javascript
function renderMyNewPage() {
  return `
    <div class="breadcrumb">
      <a href="#dashboard" onclick="event.preventDefault(); navigate('dashboard')">驾驶舱</a>
      <span class="breadcrumb-separator">/</span>
      <span>我的新页面</span>
    </div>
    <div class="page-header">
      <h1 class="page-title">我的新页面</h1>
    </div>
    <div class="card">
      <!-- 页面内容 -->
    </div>
  `;
}
```

4. **在 `src/lib/config.js` 的 `PAGE_NAMES` 中添加页面名称**：

```javascript
export const PAGE_NAMES = {
  // ...
  'sp/my-new-page': '我的新页面',
};
```

5. **写 E2E 测试**：`tests/e2e/my-new-page.spec.js`

6. **运行测试**：`npx playwright test && python3 -m pytest tests/`

7. **提交前运行作用域检查**：`npm run check:scope`（AGENTS.md 强制项，防止 IIFE 内局部函数被 `onclick` 引用）

---

## 方式二：独立 HTML 页面

适合：功能复杂、需要独立 URL 的页面（如 reviewer.html、bp.html、meetings.html）

> 架构背景见 [ADR-004 混合架构](../03-ADR架构决策/004-hybrid-architecture.md)：独立页在 cockpit 内以 iframe keep-alive 嵌入，standalone 访问时由 `src/lib/shell-injector.js` 注入统一 shell；嵌入时通过 `?embed=1` 隐藏自身 shell。

### 步骤

1. **新建 `src/my-page.html`**
2. **复制现有独立页面的头部结构**（参考 `src/reviewer.html`）
3. **引用样式**：`<link rel="stylesheet" href="../assets/css/main.css">`
4. **写页面内容**
5. **在 `vite.config.js` 的 `rollupOptions.input` 中注册入口**（必需，否则构建产物里没有这个页面）
6. **在 `src/lib/config.js` 的 `EXTERNAL_PAGES` 中映射跳转**（`cockpit.html` 只是 import 这个配置）：

```javascript
// src/lib/config.js
export const EXTERNAL_PAGES = {
  'exe/meeting-review': 'reviewer.html',
  'exe/my-page': 'my-page.html',  // 新增
};
```

7. **在 `src/lib/config.js` 的 `PAGE_META` 中登记外部页**，加 `isExternal` / `externalFile`，cockpit 才会以 iframe keep-alive 方式嵌入：

```javascript
// src/lib/config.js
export const PAGE_META = {
  // ...
  'exe/my-page': { title: '我的页面', icon: 'exe/my-page', phase: 'exe', isExternal: true, externalFile: 'my-page.html' },
};
```

8. **提交前运行 `npm run check:scope`**（检查范围覆盖 cockpit/business-topics/meetings/bp；新独立页如涉及内联事件，参照同一规范）

---

## 样式规范

- **不要重新定义 CSS 变量**，使用 `main.css` 中已有的：
  - `var(--primary)` — 主色
  - `var(--success)` / `var(--warning)` / `var(--danger)` — 状态色
  - `var(--bg-page)` / `var(--bg-card)` — 背景色
  - `var(--text-primary)` / `var(--text-secondary)` / `var(--text-tertiary)` — 文字色
- **框架样式**（导航栏、侧边栏、面包屑）统一引用 `shell.css`
- **卡片**用 `<div class="card">...</div>`
- **按钮**用 `<button class="btn btn-primary">` / `btn-secondary` / `btn-danger`
- **状态标签**用 `<span class="status-badge status-success">`

---

## 测试要求

每个新页面必须包含：

1. **pytest 测试**：验证 HTML 结构、关键元素存在
2. **Playwright E2E 测试**：验证交互流程

参考现有测试：
- `tests/test_integration.py` — pytest 示例
- `tests/e2e/navigation.spec.js` — E2E 示例
