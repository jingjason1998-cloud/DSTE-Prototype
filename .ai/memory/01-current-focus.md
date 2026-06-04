# 当前开发焦点

> 更新时间: 2026-06-02 10:00

## 状态
meetings-cleanup-done — 经营分析会独立页面 + 死代码清理完成

## 刚完成
- 将经营分析会模块从 cockpit.html 提取到独立的 `src/meetings.html`
- 注册 `meetings` 入口到 `vite.config.js`
- 更新 `src/lib/config.js` 和 cockpit.html 的 `EXTERNAL_PAGES`，点击经营分析会跳转独立页面
- 更新驾驶舱首页快捷入口，链接到 `meetings.html`
- 为 meetings.html 添加 `bindPageEvents` 和简化版 `navigate()`，支持独立页面内部路由
- 清理 cockpit.html 中约 1800 行经营分析会死代码（构建产物从 261KB 降至 129KB）
- 更新 pytest 测试（test_calendar_view.py + test_integration.py）使其检查 meetings.html
- 将 meetings.html 加入 `check:scope`
- 构建通过，scope check 通过，91 个 pytest 通过（5 个 reviewer 测试为历史遗留失败）

## 下一步
- T010 需求管理中心 — 需求池列表页（任务配方在 .ai/tasks/active/T010-requirement-pool.md）
- 或修复 reviewer.html 相关测试（5 个历史遗留失败）
- 或部署当前版本到生产环境验证
