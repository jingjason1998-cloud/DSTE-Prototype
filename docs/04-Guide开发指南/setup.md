# 环境搭建

## 前置依赖

- Node.js 20+
- Python 3.11+
- Git

## 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/jingjason1998-cloud/DSTE-Prototype.git
cd DSTE-Prototype

# 2. 安装 Node.js 依赖
npm install

# 3. 安装 Playwright 浏览器
npx playwright install chromium

# 4. 安装 Python 依赖（如有）
pip install pytest

# 5. 启动开发服务器
npm run dev
# 打开 http://localhost:3456/src/cockpit.html
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览构建产物 |
| `npm run check:scope` | 内联事件作用域检查（提交前必跑） |
| `npm run test:unit` | vitest 单元测试 |
| `npm run test:e2e` | 运行 Playwright E2E 测试 |
| `npm run test:e2e:ui` | Playwright UI 模式 |
| `python3 -m pytest tests/` | pytest 回归测试 |
| `npm run health:check` | 日常健康检查脚本 |
| `npm run lint` | ESLint 代码检查 |
| `npx wrangler dev/deploy` | Cloudflare Worker 开发/部署（`api-worker/`，配置见 `api-worker/wrangler.toml`） |

## 项目结构速览

```
├── index.html              # 登录页
├── src/
│   ├── cockpit.html        # SPA Shell / 工作区（主要入口，iframe keep-alive 嵌入外部页）
│   ├── bp.html / meetings.html / knowledge.html / strategy-map.html 等
│   │                       # 独立页面（vite.config.js 共注册 18 个入口，架构见 ADR-004）
│   ├── styles/shell.css    # 共享框架样式
│   ├── lib/
│   │   ├── config.js       # 导航/侧边栏/PAGE_META/EXTERNAL_PAGES 配置
│   │   ├── shell.js        # 共享 DOM 操作
│   │   └── shell-injector.js # 独立页统一 shell 注入 + ?embed=1 嵌入桥
│   ├── meetings/           # 经营分析会模块（renderers/utils/components）
│   └── pages/              # 各独立页的页面模块（bp/、business-topics/、knowledge/、
│                           #   marketing-budget/、requirement-pool/、reviewer/、rule-engine/ 等）
├── scripts/                # 构建/检查/发布脚本（40+ 个，含 check-onclick-scope.js、health-check.cjs）
├── api-worker/             # Cloudflare Worker 后端（worker.js + wrangler.toml）
├── tests/
│   ├── unit/               # vitest 单元测试
│   ├── e2e/                # Playwright E2E 测试
│   ├── fixtures/           # 测试夹具
│   ├── test_baseline.py    # 结构/内容测试
│   └── test_integration.py # 集成测试
├── docs/                   # 产品文档（本文档）
└── assets/                 # 静态资源（CSS/JS/图片）
```
