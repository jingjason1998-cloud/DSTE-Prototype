# 失败记录与教训

> 记录踩过的坑，防止 AI 重复犯同样错误。

## 格式

```
## [YYYY-MM-DD] 事故标题
- **影响**：严重程度
- **症状**：表现是什么
- **根因**：为什么会发生
- **修复**：怎么修的
- **预防**：以后怎么避免
```

## 事故记录

### 2025-05-28 v0.3.2 reviewer.html 发布事故

- **影响**：严重 — 用户审核报告全部维度评分为 0
- **症状**：
  - 所有维度显示"未识别到评分"
  - 改进建议、亮点、结论全部缺失
- **根因**：
  - 将固定 `DIMENSION_CONFIG` 改为动态 `getDimensionConfig`
  - `parseDimensionScores` 正则仍用 `dim.max` 匹配满分列
  - 新配置的满分值和报告中的实际满分不一致
- **修复**：
  - 正则不再匹配满分列，从报告中提取实际满分
  - 补齐所有场景的 `getDimensionConfig` 配置
  - 修复 `parseIssues` 表头误匹配
  - 修复 `parseHighlights` 重复触发
- **预防**：
  - **修改维度配置后必须跑** `npx playwright test tests/e2e/reviewer-parser.spec.js`
  - **修改 reviewer.html 渲染逻辑后必须跑** `npx playwright test tests/e2e/reviewer-report-render.spec.js`
  - 部署前本地 vs 线上对比验证

### 2026-06-02 v0.4.2 cockpit.html 代码拆分导致生产环境白屏

- **影响**：严重 — 驾驶舱首页白屏，所有用户无法访问核心功能
- **症状**：
  - 打开 `https://dste.fineres.com/src/cockpit.html` 页面空白
  - 浏览器控制台报 404：`/src/js/shell.js` 和 `/src/js/dashboard.js` 找不到
  - Nginx 访问日志确认连续的 404 错误
- **根因**：
  - v0.4.2 将 `cockpit.html` 内联 JS（4000+ 行）提取为外部模块：`shell.js`、`dashboard.js`、`cockpit-version.js`
  - 但构建/部署流程没有将 `src/js/` 目录同步到服务器
  - 服务器上的 `cockpit.html`（66 行）引用 `./js/shell.js` 和 `./js/dashboard.js`，文件不存在
- **修复**：
  - 回滚到 6 月 1 日备份（`dste-stable-v0.3.5-backup-20260601.tar.gz`）
  - 恢复 4059 行内联 JS 版本的 `cockpit.html`
  - Nginx 重启，验证 HTTP 200 且无 404
- **预防**：
  - **多页面 Vite 构建后必须检查 dist 完整性** — `dist/src/js/` 是否存在、路径是否正确
  - **部署脚本需同步新增目录** — 如果源代码新增了 `src/js/`、`src/pages/` 等，deploy 流程必须包含
  - **部署后立刻验证核心页面** — cockpit.html、reviewer.html、index.html 都要打开检查
  - **保留回滚备份** — 每次部署前自动打包当前版本备份

### 2026-06-09 弹窗 CSS 作用域错误导致页面级功能不可见

- **影响**：中等 — 战略指标库页面编辑/新建弹窗完全不可见，用户无法编辑指标
- **症状**：
  - 点击编辑按钮无任何视觉反馈
  - 浏览器控制台无报错
  - DOM 检查确认 `#omp-active-modal` 元素已添加到 `<body>`
- **根因**：
  - `.omp-modal-overlay`、`.omp-modal`、`.omp-modal-wide` 的 CSS 被定义在 `renderTasks()` 函数返回的 HTML 字符串中的 `<style>` 标签内
  - 只有访问 `exe/tasks`（重点工作管理）页面时，这些 CSS 才会被插入到 DOM
  - 其他页面（如 `#bp/kpi` 战略指标库）调用 `omp_openModal()` 时，弹窗 DOM 被创建但缺少 CSS 样式，因此不可见
- **修复**：
  - 将弹窗 CSS 从 `renderTasks()` 中移除
  - 添加到全局 `<style>` 标签中（`<head>` 内），确保所有页面共享
- **预防**：
  - **共享组件的 CSS 必须放在全局 `<style>` 或外部 CSS 文件中** — 不要放在某个页面渲染函数的局部 `<style>` 内
  - **弹窗/遮罩/抽屉等全局组件的样式需全局可用** — 这些组件可能在任何页面被调用
  - **修改共享组件后跨页面验证** — 不只测试当前页面，要检查所有可能调用该组件的页面

### 通用教训

1. **配置和解析必须同步更新** — 改配置数据结构时，检查所有解析该配置的函数
2. **正则表达式改动要格外谨慎** — 用小数据验证后再全量测试
3. **部署前必须跑完整 E2E** — 自动化测试不够时，人工补充端到端验证
4. **提取外部模块时检查构建产物** — 不是改了源码就完事，要确认构建后文件在正确位置
5. **共享组件 CSS 必须全局化** — 弹窗、遮罩、通知等全局组件的样式不能绑定到特定页面
