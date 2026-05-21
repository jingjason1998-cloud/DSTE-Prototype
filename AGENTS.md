# DSTE 战略管理平台 — Agent 指引

> 本文档是给 AI 开发助手看的，不是给人类开发者看的。

---

## 项目速览

- **名称**：DSTE 战略管理平台
- **技术栈**：HTML + CSS + JS（Vanilla），Vite 构建
- **测试**：pytest 30 + Playwright E2E 8
- **部署**：nginx + SSL，生产环境 `Dste.fineres.com`

---

## 文档在哪？

**所有文档在 `docs/` 目录下**，用 Diátaxis 框架组织：

```
docs/
├── 00-index.md          ← 从这儿开始看
├── 01-product/          # PRD、路线图、变更日志
├── 02-rfc/              # 功能设计文档（开发前写）
├── 03-adr/              # 架构决策记录
├── 04-guide/            # 开发指南（How-to）
├── 05-reference/        # 组件、API、规范参考
└── 06-explanation/      # 架构、技术栈说明
```

**新功能开发前**，先看 `docs/02-rfc/000-template.md` 写设计文档。

---

## 开发规范

### 页面开发

1. **SPA 内页面**：代码写在 `src/cockpit.html` 的 `PAGES{}` 渲染函数里
2. **独立页面**：新建 `src/xxx.html`，在 `vite.config.js` 注册入口
3. **样式**：用 CSS 变量（`var(--primary)`），不要硬编码颜色
4. **导航**：在 `src/lib/config.js` 的 `SIDEBAR_CONFIG` 添加项

### 测试要求

每个变更必须通过：
```bash
python3 -m pytest tests/          # 结构/内容测试
npx playwright test               # E2E 测试
npm run build                     # 构建测试
```

### Git 规范

遵循 Conventional Commits：
```
feat: 新增功能
fix: 修复 bug
refactor: 重构
docs: 文档更新
test: 测试更新
```

---

## 多 AI 协作

| 角色 | 职责 | 约束 |
|------|------|------|
| 架构 AI | 集成、路由、部署、审查 | 可以改配置文件 |
| 功能 AI | 独立页面开发 | **不要改** vite.config.js / playwright.config.js / package.json / src/lib/config.js |

给功能 AI 的任务模板见 `docs/04-guide/ai-collaboration.md`

---

## 常见问题

**Q：怎么添加一个新页面？**
→ `docs/04-guide/new-page.md`

**Q：组件怎么用？**
→ `docs/05-reference/components.md`

**Q：测试怎么写？**
→ `docs/05-reference/testing.md`

**Q：为什么要这样设计？**
→ `docs/06-explanation/architecture.md`
