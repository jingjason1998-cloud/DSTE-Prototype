# AI 协作规范

> 多 AI 并行开发时的协作规则

---

## 分工原则

| 角色 | 职责 | 示例 |
|------|------|------|
| **架构 AI**（本窗口） | 集成、路由、导航、部署 | 你正在聊天的这个 |
| **功能 AI**（其他窗口） | 独立页面开发 | 开发经营分析会、战略地图等 |

架构 AI 负责**整合**，功能 AI 负责**实现**。

---

## 给功能 AI 的任务模板

直接复制这段发给 AI：

```
开发 DSTE [模块名] 模块，项目路径 /Users/jasonjing/DSTE-Prototype。

遵循以下规范：
1. 代码写在 src/cockpit.html 的 [render函数名]() 函数内
2. 返回 HTML 字符串（参考现有 renderDashboard() 写法）
3. 样式用现成的 CSS 变量，不要重新定义颜色
4. 写完后运行 npx playwright test && python3 -m pytest tests/ 验证
5. 不要改 vite.config.js、playwright.config.js、package.json、src/lib/config.js
```

---

## 关键约束

### ✅ 功能 AI 可以做的

- 修改 `src/cockpit.html` 内的渲染函数
- 在渲染函数里写 HTML + CSS + JS
- 添加新的 `<style>` 标签（页面级样式）
- 写 E2E 测试 `tests/e2e/xxx.spec.js`
- 写 pytest 测试

### ❌ 功能 AI 不能做的

- 修改 `vite.config.js`
- 修改 `playwright.config.js`
- 修改 `package.json`
- 修改 `src/lib/config.js`（导航配置）
- 修改 `src/styles/shell.css`（共享样式）
- 新建独立的 `.html` 文件（除非你先批准）
- 运行 `git commit` / `git push`

---

## 集成流程

```
[功能 AI 开发完成]
    ↓
[你检查代码质量]
    ↓
[运行测试: pytest + Playwright]
    ↓
[通过？] ──否──→ [打回修改]
    ↓ 是
[git add + git commit]
    ↓
[推送到 GitHub]
    ↓
[运行 ./scripts/release.sh 发布]
```

---

## 常见陷阱

| 陷阱 | 说明 | 预防 |
|------|------|------|
| 全局样式污染 | AI 在 `<style>` 里写 `body { ... }` 影响所有页面 | 检查 `<style>` 作用域，只用类选择器 |
| 内联 onclick 失效 | SPA 中 `onclick="navigate(...)"` 需要 `event.preventDefault()` | 参考现有代码写法 |
| 主题不同步 | 新页面没响应 Light/Dark 切换 | 使用 CSS 变量 `var(--xxx)`，不要用硬编码颜色 |
| 测试遗漏 | AI 忘写测试 | 任务描述里明确要求"写完运行测试" |
| 路径错误 | 独立页面引用 `../assets/` 路径不对 | 检查文件层级 |
