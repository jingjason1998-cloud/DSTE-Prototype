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
| `npm run test:e2e` | 运行 Playwright E2E 测试 |
| `npm run test:e2e:ui` | Playwright UI 模式 |
| `python3 -m pytest tests/` | pytest 回归测试 |
| `npm run lint` | ESLint 代码检查 |

## 项目结构速览

```
├── index.html              # 登录页
├── src/
│   ├── cockpit.html        # SPA Shell（主要入口）
│   ├── reviewer.html       # 会议审核（独立页面）
│   ├── business-topics.html # 业务专题（独立页面）
│   ├── styles/shell.css    # 共享框架样式
│   ├── lib/
│   │   ├── config.js       # 导航/侧边栏配置
│   │   └── shell.js        # 共享 DOM 操作
│   └── pages/              # 页面模块（预留）
├── tests/
│   ├── e2e/                # Playwright E2E 测试
│   ├── test_baseline.py    # 结构/内容测试
│   └── test_integration.py # 集成测试
├── docs/                   # 产品文档（本文档）
└── assets/                 # 静态资源（CSS/JS/图片）
```
