# 代码模式库

> 记录项目中反复出现的代码模式，让 AI 不用每次重新推理。

## 页面渲染模式（cockpit.html）

```javascript
// PAGES 对象的固定结构
PAGES.pageName = {
  init() { /* 初始化数据、绑定事件 */ },
  render() { /* 返回 HTML 字符串 */ },
  cleanup() { /* 清理事件监听、定时器 */ }
};
```

## 事件委托模式（优先）

```javascript
// 渲染时
html += `<button data-action="edit" data-id="${id}">编辑</button>`;

// init 中绑定
container.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  // 分发处理
});
```

## CSS 变量规范

```css
/* 必须使用变量，禁止硬编码 */
color: var(--primary);
background: var(--bg-primary);
border-color: var(--border);
```

## 独立页面模式

非 cockpit 的独立页面（如 reviewer.html、business-topics.html）：
- 在 `vite.config.js` 的 `build.rollupOptions.input` 注册入口
- 不受 cockpit IIFE 限制，但建议保持事件委托风格一致

## 全局弹窗 CSS 模式

**共享弹窗/遮罩组件的 CSS 必须全局化**：

```css
/* ❌ 错误：放在某个页面渲染函数内部 */
function renderTasks() {
  return `
    ...页面内容...
    <style>
      .omp-modal-overlay { ... }  /* 只在 exe/tasks 页面可用 */
    </style>
  `;
}

/* ✅ 正确：放在全局 <style> 标签中 */
/* 在 <head> 内的全局 <style> 中定义 */
.omp-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
.omp-modal { background: var(--bg-card); border-radius: 12px; max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
```

**原则**：任何可能被多个页面调用的组件（弹窗、通知中心、抽屉、遮罩），其 CSS 必须在全局作用域中定义。
