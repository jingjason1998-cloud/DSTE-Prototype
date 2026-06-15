# DSTE v0.4.11 升级清单

> 基于当前工作区改动整理，区分「本次发布」与「下一期」。
> 制定原则：本次发布以「稳定性修复 + 已完整验证的新功能」为主；原型、设计文档、大文件重构等放到下一期。

---

## ✅ 本次发布 v0.4.11

### 1. 关键 Bug 修复（6 项，已验证）

| # | 问题 | 文件 | 验证方式 |
|---|------|------|----------|
| 1 | `showToast` 在 Node/SSR 环境访问 `document` 抛 `ReferenceError` | `src/lib/utils.js` | `npm run lint` / `npm run test:unit` |
| 2 | `health-check.cjs` 只识别 `.eslintrc.js`，误报 ESLint 配置不存在 | `scripts/health-check.cjs` | `npm run health:check` |
| 3 | 保存新会议后详情浮层不显示：`openMeetingDetail` 使用旧副本 `meetings` | `src/meetings.html:1200` | `meeting-create` / `meeting-clone` E2E |
| 4 | SP 导航测试期望与实际 URL 不符 | `tests/e2e/test-sp-nav-verify.spec.js` | E2E |
| 5 | `strategy-map-list` 测试间未清理 localStorage，状态串扰 | `tests/e2e/strategy-map-list.spec.js` | E2E |
| 6 | 详情页「编辑」按钮调用不存在的 `openEditMeeting` | `src/meetings.html:1372` | `meeting-preparation` E2E |

### 2. 稳定性与工程化改进

- **统一本地存储封装 `DSTE.Storage`**（`assets/js/main.js` + `src/lib/utils.js`）
  - 全站 `localStorage` 直接调用迁移到封装接口
  - 统一 JSON 序列化、错误兜底、空值默认值
- **导航渲染安全化**：`src/lib/shell.js` 从 `innerHTML` 改为 DOM 创建
- **提示方式统一**：多处 `alert()` 替换为 `showToast()`
- **OMP 数据清理**：版本升级后不再强制刷新页面，避免首次加载/E2E 不稳定

### 3. 已完整验证的新功能

- **战略地图模块**
  - `src/strategy-map-list.html` + `src/lib/strategy-map-list.js`：地图列表、搜索/筛选/新建/编辑/删除
  - `src/strategy-map.html` + `src/lib/strategy-map-data.js` / `strategy-map-render.js` / `strategy-map-ui.js`：BSC 四维度可视化、因果链、CRUD、导出
  - 顶部/侧边栏路由接入 `sp/strategy-map`
  - E2E 覆盖：`tests/e2e/strategy-map.spec.js` / `strategy-map-list.spec.js`
- **会前准备度**
  - 会议卡片与详情页展示准备度百分比
  - 会前准备弹窗与检查清单
  - `computeMeetingReadiness` 计算会前报告、议题报表、材料诊断
  - E2E 覆盖：`tests/e2e/meeting-preparation.spec.js`
- **经营分析会工具模块拆分**
  - `src/meetings/utils/helpers.js`：材料评分、报表资产、准备度
  - `src/meetings/utils/reviewer.js`：评审 API 封装、批量评审
  - 单元测试覆盖：`tests/unit/reviewer.test.js` / `meeting-readiness.test.js`

### 4. 发布元数据

- `package.json`: `0.4.10` → `0.4.11`
- `.github/workflows/deploy.yml`: 通知版本号同步
- `CHANGELOG.md`: 新增 v0.4.11 变更记录

---

## ⏳ 下一期 v0.4.12（或独立清理）

### 1. 原型/演示文件清理

以下目录是开发过程中的原型/演示页面，不应进入生产发布包：

- `src/prototype/strategy-map.html`（早期单文件原型）
- `src/prototypes/abp-indicator-tree-demo.html`（指标树演示）

**建议处理方案（二选一）：**
- A. 直接删除，功能已由正式页面替代
- B. 迁移到 `docs/prototypes/` 或独立 archive 分支保留参考

### 2. 设计文档整理

以下文档是 PRD/RFC/设计稿，可随仓库提交，但不作为 v0.4.11 功能发布：

- `docs/SP-Module-Redesign-v0.5.md`
- `docs/rfc-agenda-material-review.md`
- `docs/01-Product/年度业务规划-升级方案-v1.1.md`
- `docs/01-Product/版本管理与路标管理-PRD.md`
- `docs/01-Product/经营分析会-运营中枢-产品设计文档.md`

### 3. 大文件与架构重构

`npm run health:check` 中仍未通过的结构性问题，适合单独一期专项处理：

- `src/cockpit.html` 5378 行 → 拆分为模块/组件
- 按钮/卡片样式重复代码收敛
- `innerHTML` / `sessionStorage` 等代码异味治理
- cockpit.html 模块耦合度降低

### 4. AI 记忆/会话文件

- `.ai/memory/01-current-focus.md` 为开发过程文件，不进入发布。

---

## 🚀 建议的发布操作

### 方案 A：干净发布（推荐）

1. **先提交 v0.4.11 功能与修复**（不包含原型、设计文档、.ai/memory）
2. 打 tag `v0.4.11`
3. 触发 GitHub Actions 部署
4. **再单独提交**原型/设计文档（或删除/归档原型）

### 方案 B：一次性提交

如果原型和设计文档保留在主分支也无妨，可以一次性提交，但 tag `v0.4.11` 只对应「已发布功能」，原型文件不参与发布包（Vite 构建不会自动包含它们，只要不被 `vite.config.js` 引用）。

> 注意：`src/prototype/` 和 `src/prototypes/` 当前未被 `vite.config.js` 引用，因此即使保留也不会被打包进 `dist/`。

---

## 📋 发布前最终确认

- [x] `npm run lint` 无 error
- [x] `npm run check:scope` 通过
- [x] `npm run build` 成功，`dist/index.html` 存在
- [x] `npm run test:unit` 通过
- [x] `npx playwright test --retries=1` 通过
- [x] `package.json` 版本 = `0.4.11`
- [x] `CHANGELOG.md` 已更新
- [x] `deploy.yml` 通知版本号已同步
- [ ] 确认原型文件处理方式（删除 / 归档 / 保留）
- [ ] 确认是否本次一起提交设计文档
