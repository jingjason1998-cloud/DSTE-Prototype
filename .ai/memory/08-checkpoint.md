# 断点与恢复

> 记录复杂任务的中间状态，方便中断后恢复。

## T010 需求管理中心 — 需求池列表页

- **当前步骤**：未开始（Step 1: 页面骨架与路由注册）
- **任务文件**：`.ai/tasks/active/T010-requirement-pool.md`
- **前置条件**：无强依赖，可独立开发
- **注意**： cockpit.html 的 JS 在 IIFE 中，但独立页面不受此限制

## 经营分析会独立页面提取 + v0.4.4 功能增强

- **当前状态**：已完成提取到 `src/meetings.html`，新增决策编辑 + 待闭环行动抽屉
- **构建验证**：通过，meetings.html 产物 164KB（gzip 31KB）
- **测试验证**：91 通过 / 5 失败（reviewer 历史遗留）
- **浏览器验证**：会议列表、详情、日历视图、新建会议、决策编辑、待办抽屉全部正常
- **生产部署**：v0.4.4 已上线 https://dste.fineres.com
- **自动部署**：GitHub Actions Run #23 首次成功

## GitHub Actions 自动部署修复

- **修复内容**：
  - 服务器 `/root/.ssh/authorized_keys` 添加 RSA 公钥
  - deploy.yml 改用 `rsync + ssh` 替代 `appleboy/scp-action`
  - 配置缺失的 `SSH_HOST`（47.101.197.187）和 `SSH_USER`（root）Secrets
- **验证状态**：Run #23 success，push 到 main 自动触发部署

## T010 需求管理中心 — 需求池列表页

- **当前步骤**：未开始（Step 1: 页面骨架与路由注册）
- **任务文件**：`.ai/tasks/active/T010-requirement-pool.md`
- **前置条件**：无强依赖，可独立开发
- **注意**： cockpit.html 的 JS 在 IIFE 中，但独立页面不受此限制
