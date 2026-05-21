# ADR-002: 引入 Vite + Playwright + GitHub Actions

> 状态：`accepted` | 日期：2026-05-21

---

## 上下文

项目从纯静态 HTML 页面发展到需要：
1. 代码压缩和优化
2. 自动化测试（防止回归）
3. CI/CD 自动化

需要选择构建工具、测试框架和 CI 平台。

## 决策

引入 **Vite**（构建）+ **Playwright**（E2E 测试）+ **GitHub Actions**（CI/CD）。

## 考虑的选项

### 构建工具

| 选项 | 评价 |
|------|------|
| 无构建工具 | ❌ 无法压缩、无 HMR、难以管理依赖 |
| Webpack | ❌ 配置复杂，过重 |
| Vite | ✅ 配置简单，HMR 快，原生 ESM |
| Parcel | ⚠️ 零配置但生态不如 Vite |

### E2E 测试

| 选项 | 评价 |
|------|------|
| Cypress | ⚠️ 流行但 Chrome-only（当时），性能一般 |
| Playwright | ✅ 跨浏览器，自动等待，Trace 调试，微软维护 |
| Selenium | ❌ 老旧，配置复杂，不稳定 |

### CI/CD

| 选项 | 评价 |
|------|------|
| GitHub Actions | ✅ 与代码仓库集成，免费额度足够 |
| Jenkins | ❌ 需要自建服务器，维护成本高 |
| Travis CI | ⚠️ 免费额度有限 |

## 为什么选这个组合？

1. **Vite**：零配置起步，多页面支持完美匹配项目结构
2. **Playwright**：自动等待机制减少 flaky 测试，UI 模式方便调试
3. **GitHub Actions**：push 即触发，测试报告自动上传

## 后果

### 积极的

- 构建产物优化（压缩、tree-shaking）
- E2E 测试覆盖核心用户流程
- CI 自动阻止有问题的代码合并
- 部署流程标准化

### 消极的

- 增加了 node_modules 依赖体积
- 需要学习 Playwright API
- CI 配置需要维护

## 参考

- docs/06-Explanation架构解释/tech-stack.md
