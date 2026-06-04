# 会话历史

> 记录最近几次 AI 会话的摘要，方便快速恢复上下文。

## 2026-06-02 09:51
- **主题**：生产环境回滚
- **操作**：
  - SSH 连接到 47.101.197.187，诊断 cockpit.html 白屏问题
  - 确认根因：v0.4.2 代码拆分后 `src/js/` 目录未部署到服务器
  - 回滚到 6月1日备份，系统恢复
  - 重命名备份文件为 `dste-*`
- **决策**：记录服务器目录命名问题为技术债务 DEBT-001，计划维护时处理
- **状态**：complete

## 2026-06-01 22:28
- **修改文件**: .ai/memory/01-current-focus.md, AGENTS.md, docs/04-Guide开发指南/ai-memory-workflow.md
- **决策**: 建立了文件化记忆系统解决 AI 会话无状态问题
- **下一步**: 验证闭环后提交到 Git
- **状态**: partial

## 2026-06-01 22:45
- **修改文件**: src/cockpit.html, src/js/dashboard.js, src/js/cockpit.js, src/js/shell.js, src/js/cockpit-version.js
- **决策**: 将 cockpit.html 的内联 JS 提取到独立文件（dashboard.js 等），但 Agent token 超限中断
- **下一步**: 跑测试验证当前状态，决定是继续修复还是回滚备份
- **状态**: partial
