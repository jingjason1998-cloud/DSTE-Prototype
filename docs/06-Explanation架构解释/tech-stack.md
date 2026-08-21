# 技术栈说明

## 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| HTML5 | - | 页面结构 |
| CSS3 | - | 样式（CSS 变量实现主题系统） |
| Vanilla JS | ES6+ | 交互逻辑（无框架，保持简单） |
| Vite | ^6.4.3 | 构建工具（多页面、HMR、代码压缩） |
| Phosphor Icons | ^2.1.1 | 图标体系（`scripts/build-icon-sprite.js` 生成 sprite） |

### 为什么不用 React/Vue？

1. **项目规模可控**：当前 18 个构建入口（见 `vite.config.js` 的 `rollupOptions.input`），仍不需要组件框架的复杂度
2. **AI 协作友好**：纯 HTML/JS 更容易让 AI 理解和生成
3. **零运行时成本**：没有框架 bundle，加载更快
4. **渐进式**：未来如果需要，随时可以迁移

## 测试

| 技术 | 版本 | 用途 |
|------|------|------|
| pytest | 8.x | 结构/内容回归测试 |
| Playwright | 1.40+ | E2E 端到端测试 |
| Vitest | ^4.1.8 | 单元测试（`tests/unit/`，`npm run test:unit`） |

### 为什么选 Playwright？

- **跨浏览器**：Chromium/Firefox/WebKit
- **自动等待**：不需要手动 sleep
- **Trace 调试**：失败时自动截图+录像
- **CI 友好**：GitHub Actions 原生支持

## 后端 / AI 服务

| 技术 | 用途 |
|------|------|
| Cloudflare Worker（`api-worker/`，wrangler ^3.80） | AI 网关（Kimi）+ KV 存储，生产域名 `api.dste.jasonxspace.cc` |
| 会议材料审核 Flask 服务（端口 8766） | 材料智能审核后端，独立仓库 `meeting-material-reviewer`，生产部署在服务器 `/opt/meeting-reviewer`，nginx 按路径分流 `/api/` |
| CAS 认证（`passport.fanruan.com`） | 统一登录（rule-engine 等页面接入） |

## 代码质量

| 技术 | 版本 | 用途 |
|------|------|------|
| ESLint | 8.x | 代码质量检查（`npm run lint`） |
| knip | ^5.88 | 死代码 / 未用依赖检查（`npm run check:deadcode`） |

## CI/CD

| 技术 | 用途 |
|------|------|
| GitHub Actions | 自动化测试 + 部署 |
| Git | 版本控制 |
| npm scripts | 任务编排 |

## 部署

| 技术 | 用途 |
|------|------|
| nginx | 反向代理 + 静态资源服务（`/api/` 按路径分流到 Worker 与 Flask 8766） |
| SSL (Let's Encrypt) | HTTPS |
| rsync/scp | 文件同步 |
| wrangler deploy | Cloudflare Worker 发布 |
