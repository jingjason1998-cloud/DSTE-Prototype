# 项目启动上下文

## 项目一句话
DSTE 战略管理平台，Vanilla JS + Vite，部署在 Dste.fineres.com。

## 技术事实（不可违背）
- 前端：HTML/CSS/JS，Vite 构建，多页面应用
- 主页面是 cockpit.html（SPA 模式，PAGES{} 渲染函数）
- 独立页面在 vite.config.js 注册入口
- 导航配置在 src/lib/config.js 的 SIDEBAR_CONFIG
- 测试：pytest 30+ + Playwright 8+，提交前必须全过

## 关键约束（经常犯错）
1. cockpit.html 的 JS 在 IIFE 中，局部函数不能被 onclick 访问
2. 事件处理用 data-action + 事件委托，或暴露 window.foo
3. CSS 用变量 var(--primary)，禁止硬编码颜色
4. 修改 reviewer.html 后必须跑 E2E：reviewer-parser.spec.js + reviewer-report-render.spec.js
