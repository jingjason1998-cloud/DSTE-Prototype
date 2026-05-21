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
    { id: 'sp/strategy-map', icon: '🗺️', label: '战略地图' },
    { id: 'sp/my-new-page', icon: '✨', label: '我的新页面' },  // 新增
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

---

## 方式二：独立 HTML 页面

适合：功能复杂、需要独立 URL 的页面（如 reviewer.html）

### 步骤

1. **新建 `src/my-page.html`**
2. **复制现有独立页面的头部结构**（参考 `src/reviewer.html`）
3. **引用样式**：`<link rel="stylesheet" href="../assets/css/main.css">`
4. **写页面内容**
5. **在 `vite.config.js` 的 `rollupOptions.input` 中添加入口**（如果需要 Vite 构建）
6. **在 `src/cockpit.html` 的 `EXTERNAL_PAGES` 中映射跳转**：

```javascript
const EXTERNAL_PAGES = {
  'exe/meeting-review': 'reviewer.html',
  'exe/my-page': 'my-page.html',  // 新增
};
```

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
