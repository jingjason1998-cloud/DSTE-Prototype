# 当前开发焦点

> 更新时间: 2026-06-05 14:37

## 状态
v0.4.4-deployed — 决策编辑 + 待闭环行动抽屉已上线，GitHub Actions 自动部署已修复

## 刚完成
- 项目全面诊断：测试覆盖、代码质量、构建、架构问题梳理
- 经营分析会模块增强：
  - 会议编辑弹窗新增决议管理（添加/编辑/删除/状态跟踪）
  - 新增待闭环行动抽屉，右侧滑出聚合所有会议待办
  - 一报一会流程交互优化（阻止事件冒泡 + 自动刷新）
  - 修复保存会议时数据完整性（actions/decisions/pipeline/metrics）
- 4 个 Playwright E2E 测试覆盖新功能
- 版本号升级: 0.4.3 → 0.4.4
- 手动部署到生产环境验证通过
- 修复 GitHub Actions 自动部署：
  - 服务器 `/root/.ssh/authorized_keys` 添加 RSA 公钥
  - 改用 `rsync + ssh` 替代 `appleboy/scp-action@v0.1.7`
  - 配置缺失的 `SSH_HOST` 和 `SSH_USER` Secrets
  - Run #23 首次成功自动部署

## 下一步
- T010 需求管理中心 — 需求池列表页（任务配方在 .ai/tasks/active/T010-requirement-pool.md）
- 或修复 reviewer.html 相关 pytest 测试（5 个历史遗留失败）
- 或提取 HTML 公共模板（减少独立页面重复代码 30%+）
