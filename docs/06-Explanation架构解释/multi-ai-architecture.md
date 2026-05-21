# 多 AI 协作架构图

## 整体架构

```mermaid
graph TB
    subgraph User["👤 用户（你）"]
        U1["分配任务"]
        U2["审查代码"]
        U3["确认发布"]
    end

    subgraph AI_Team["🤖 AI 团队"]
        direction TB
        Arch["🏗️ 架构 AI<br/>本窗口"]
        FuncA["⚙️ 功能 AI A<br/>经营分析会"]
        FuncB["⚙️ 功能 AI B<br/>战略地图"]
        FuncC["⚙️ 功能 AI C<br/>..."]
    end

    subgraph Infra["🛠️ 基础设施"]
        Git["📦 GitHub 仓库"]
        CI["🔄 GitHub Actions<br/>CI/CD"]
        Server["🌐 生产服务器<br/>Dste.fineres.com"]
    end

    subgraph Docs["📚 文档中心"]
        PRD["PRD / 设计文档"]
        RFC["RFC 功能设计"]
        ADR["ADR 架构决策"]
        Guide["开发指南"]
    end

    %% 用户与 AI 交互
    U1 -->|"布置任务 + 发 ai-prompt.md"| FuncA
    U1 -->|"布置任务 + 发 ai-prompt.md"| FuncB
    U1 -->|"调整架构 / 审查"| Arch
    U2 -->|"Code Review"| Arch

    %% AI 内部协作
    Arch -->|"提供模板 + 规范"| FuncA
    Arch -->|"提供模板 + 规范"| FuncB
    FuncA -->|"PR 请求合并"| Arch
    FuncB -->|"PR 请求合并"| Arch

    %% AI 与文档
    FuncA -->|"开发前阅读"| RFC
    FuncA -->|"遵循设计"| PRD
    FuncB -->|"开发前阅读"| RFC
    Arch -->|"制定规范"| Guide
    Arch -->|"记录决策"| ADR

    %% AI 与代码
    FuncA -->|"修改 cockpit.html"| Git
    FuncB -->|"修改 cockpit.html"| Git
    Arch -->|"改配置 + 部署"| Git

    %% CI/CD 流程
    Git -->|"push 触发"| CI
    CI -->|"测试通过"| Server

    %% 样式
    style Arch fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    style FuncA fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style FuncB fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style User fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style Git fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style Server fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

## 工作流时序

```mermaid
sequenceDiagram
    participant U as 👤 用户
    participant Arch as 🏗️ 架构AI
    participant Func as ⚙️ 功能AI
    participant Git as 📦 GitHub
    participant CI as 🔄 CI/CD

    U->>Arch: "我要开发经营分析会"
    Arch->>Git: 创建 feature/meetings 分支
    Arch->>U: "已准备就绪，可以派任务了"

    U->>Func: 发 ai-prompt.md + PRD链接
    Func->>Func: 读 docs/01-Product产品/prd.md
    Func->>Func: 读 docs/04-Guide开发指南/new-page.md
    Func->>Func: 开发 renderMeetings()
    Func->>Func: 写 E2E 测试
    Func->>U: "开发完成，请检查"

    U->>Arch: "帮我审查代码"
    Arch->>Git: git diff
    Arch->>Arch: 运行 pytest + Playwright
    Arch->>U: "测试通过，可以合并"

    U->>Arch: "合并到 main"
    Arch->>Git: git merge
    Git->>CI: push 触发 Actions
    CI->>CI: pytest + Playwright
    CI->>U: "测试通过，准备部署"

    U->>Arch: "发布"
    Arch->>CI: npm run build
    Arch->>CI: rsync 到服务器
    CI->>U: "部署完成"
```

## 职责边界

| | 🏗️ 架构 AI | ⚙️ 功能 AI |
|--|-----------|-----------|
| **代码范围** | 配置文件、路由、部署脚本、代码审查 | `cockpit.html` 内渲染函数 |
| **文档维护** | `docs/02-RFC/`, `docs/03-ADR/`, `docs/04-Guide/` | `docs/02-RFC/001-xxx.md`（开发前写） |
| **测试** | 确保全部测试通过 | 写自己模块的 E2E 测试 |
| **Git 操作** | merge, tag, release | 不操作 Git |
| **部署** | 一键发布 | 不参与 |

## 防冲突机制

```mermaid
graph LR
    A["功能AI A<br/>改 cockpit.html<br/>renderMeetings()"] -->|"不碰"| B["功能AI B<br/>改 cockpit.html<br/>renderStrategyMap()"]
    A -->|"不碰"| C["架构AI<br/>改 vite.config.js"]
    B -->|"不碰"| C
```

**核心规则**：每个 AI 只改自己的代码区域，公共配置由架构 AI 统一管理。

## 文件锁（建议）

```
cockpit.html 内的规则：
├─ renderDashboard()      ← AI A 负责
├─ renderMeetings()       ← AI B 负责  
├─ renderStrategyMap()    ← AI C 负责
├─ renderTasks()          ← AI D 负责
└─ PAGES{} / 路由逻辑      ← 架构 AI 负责（注册新页面）
```
