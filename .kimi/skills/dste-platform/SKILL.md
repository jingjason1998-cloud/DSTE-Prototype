---
name: dste-platform
description: DSTE 战略管理平台前端项目。用于开发 DSTE（Develop Strategy To Execute）战略管理平台的 Web 前端。当用户要求开发/修改/调试 DSTE 平台的页面、组件、样式、测试、文档时触发。包含驾驶舱、经营分析会、会议审核、业务专题、战略地图等模块。
---

# DSTE 战略管理平台 — 项目技能

## 项目速览

- **名称**: DSTE 战略管理平台
- **路径**: `/Users/jasonjing/DSTE-Prototype`
- **技术栈**: HTML + CSS + JS (Vanilla), Vite 构建
- **测试**: pytest 30 + Playwright E2E 8
- **部署**: nginx + SSL, `Dste.fineres.com`

## 核心原则

1. **纯 HTML/JS，无框架** — 保持简单，AI 友好
2. **样式用 CSS 变量** — `var(--primary)`, `var(--success)` 等，不硬编码颜色
3. **所有变更必须通过测试** — pytest + Playwright
4. **文档即代码** — 变更同步更新 `docs/`

## 项目结构

```
├── index.html              # 登录页
├── src/
│   ├── cockpit.html        # SPA Shell（主入口）
│   ├── reviewer.html       # 会议审核（独立页面）
│   ├── business-topics.html # 业务专题（独立页面）
│   ├── styles/shell.css    # 共享框架样式
│   ├── lib/
│   │   ├── config.js       # 导航/侧边栏配置
│   │   └── shell.js        # 共享 DOM 操作
│   └── pages/              # 页面模块模板
├── tests/
│   ├── e2e/                # Playwright E2E 测试
│   └── *.py                # pytest 回归测试
├── docs/                   # 产品文档（Diátaxis + RFC/ADR）
├── assets/                 # 静态资源（CSS/JS/图片）
└── .kimi/skills/           # 本项目 Skill
```

## 开发规范

### 页面开发

**SPA 内页面**（驾驶舱内的功能页面）：
- 代码写在 `src/cockpit.html` 的 `PAGES{}` 渲染函数里
- 返回 HTML 字符串（参考 `renderDashboard()`）
- 在 `src/lib/config.js` 的 `SIDEBAR_CONFIG` 添加导航项

**独立页面**（如 reviewer.html）：
- 新建 `src/xxx.html`
- 引用 `../assets/css/main.css`

### 样式规范

- 不重新定义 CSS 变量
- 卡片: `<div class="card">...</div>`
- 按钮: `btn btn-primary` / `btn-secondary` / `btn-danger`
- 状态标签: `status-badge status-success`

### Git Commit

遵循 Conventional Commits:
```
feat: 新增功能
fix: 修复 bug
refactor: 重构
docs: 文档更新
test: 测试更新
```

## 常用命令

```bash
npm run dev              # 开发服务器 localhost:8080
npm run build            # 生产构建
npm run test:e2e         # Playwright E2E 测试
python3 -m pytest tests/ # pytest 回归测试
```

## 多 AI 协作

| 角色 | 可修改 | 不可修改 |
|------|--------|----------|
| **功能 AI** | `cockpit.html` 内渲染函数、测试文件 | `vite.config.js`, `playwright.config.js`, `package.json`, `src/lib/config.js` |
| **架构 AI** | 配置文件、路由、部署脚本 | — |

## 详细参考

- 产品需求: `docs/01-Product产品/prd.md` (1769行完整版)
- 新页面开发: `docs/04-Guide开发指南/new-page.md`
- AI 协作规范: `docs/04-Guide开发指南/ai-collaboration.md`
- 组件参考: `docs/05-Reference参考手册/components.md`
- 测试参考: `docs/05-Reference参考手册/testing.md`
- 技术栈说明: `docs/06-Explanation架构解释/tech-stack.md`
