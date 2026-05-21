# DSTE A级架构升级记录

## 升级内容

### 工具链
- **Vite** — 现代构建工具，支持多页面入口、HMR、代码分割
- **Playwright** — E2E 端到端测试（Chromium）
- **Vitest** — 单元测试框架
- **ESLint** — 代码质量检查
- **GitHub Actions** — CI/CD 自动化

### 项目结构

```
DSTE-Prototype/
├── package.json              # 依赖 + scripts
├── vite.config.js            # 多页面构建配置
├── playwright.config.js      # E2E 测试配置
├── index.html                # 登录页 (根入口)
├── src/
│   ├── cockpit.html          # SPA Shell (驾驶舱)
│   ├── reviewer.html         # 会议审核 (独立页面)
│   ├── business-topics.html  # 业务专题 (独立页面)
│   ├── styles/
│   │   └── shell.css         # 共享框架样式
│   ├── lib/
│   │   ├── config.js         # 导航/侧边栏配置
│   │   └── shell.js          # 共享 DOM 操作
│   ├── pages/
│   │   ├── README.md         # 微前端接口规范
│   │   └── _template/
│   │       └── index.js      # 页面模块模板
│   └── components/           # (预留) 共享组件
├── tests/
│   ├── e2e/
│   │   └── navigation.spec.js # 8 个 E2E 测试
│   ├── test_baseline.py      # 30 个 pytest 测试
│   └── test_integration.py
├── .github/workflows/ci.yml  # GitHub Actions
└── scripts/release.sh        # 一键发布 (Vite 版本)
```

### 构建配置

vite.config.js 配置 4 个入口：
- `main` → `index.html` (登录页)
- `cockpit` → `src/cockpit.html`
- `reviewer` → `src/reviewer.html`
- `business-topics` → `src/business-topics.html`

### 测试矩阵

| 测试类型 | 数量 | 状态 |
|---------|------|------|
| pytest (结构/内容) | 30 | ✅ 通过 |
| Playwright E2E | 8 | ✅ 通过 |

E2E 测试覆盖：
- 顶部导航 6 个阶段
- 侧边栏渲染与切换
- 主题切换
- KPI 卡片显示
- Roadmap 页面访问
- reviewer / business-topics 独立页面加载

### 微前端接口 (window.DSTEPage)

每个页面模块暴露：
```javascript
window.DSTEPage = {
  name: '页面名称',
  phase: 'dashboard',  // 所属阶段
  breadcrumb: [...],   // 面包屑路径
  init(container) {},   // 初始化
  destroy() {}          // 清理
};
```

### 发布流程

```bash
./scripts/release.sh v0.4.0
# 1. pytest 回归测试
# 2. Playwright E2E 测试
# 3. Vite 构建
# 4. 检查 CHANGELOG
# 5. 打 Tag
# 6. 推送到 GitHub
# 7. 等待确认 "发布" 后部署
```

### CI/CD (GitHub Actions)

- push 到 `main` / `dev` 触发测试
- PR 到 `main` 触发测试
- `main` 分支测试通过后自动部署 (需配置 SSH)

## 已知问题

1. `assets/js/main.js` 未模块化 — Vite 无法打包非 module 脚本
2. cockpit.html 路由逻辑仍内联 — 渐进式迁移中
3. reviewer.html / business-topics.html 未引用 shell.css — 后续统一
