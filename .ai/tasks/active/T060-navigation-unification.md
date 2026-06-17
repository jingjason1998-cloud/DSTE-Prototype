# T060: 统一子页面切换效果与导航一致性

> 目标：消除 SPA 内部切换与独立页面完整刷新之间的视觉不一致，统一顶部导航、侧边栏、面包屑的实现与回链格式，最终让所有页面共享同一套 Shell 配置。

## 状态
- **当前阶段**：Phase 2 已完成，Phase 3 待实施
- **优先级**：中（体验优化，为后续 SPA 化打基础）

---

## 一、现存问题

### 1. 切换效果不一致
- `cockpit.html` 内部：内容区 `fadeIn` 动画
- `cockpit → 独立页面`：完整刷新，无动画
- `独立页面 → 独立页面 / cockpit`：完整刷新，无动画
- `meetings.html` 内部子页面（列表/编辑）是 SPA 式切换，但切到外部页面又变成完整刷新

### 2. Shell 实现不一致
- `cockpit.html`：内联 `renderTopNav()` / `renderSidebar()`，动态渲染
- `meetings.html`：内联另一套 `renderTopNav()` / `renderSidebar()`，链接缺少 hash 锚点
- `business-topics.html`、`reviewer.html`、`strategy-map-list.html`：纯静态硬编码 HTML，`active` 状态写死

### 3. 导航结构漂移
- 各独立页面的侧边栏条目与 cockpit 不完全一致（如 `exe/finereport`、`admin/*` 在静态页面缺失）
- 面包屑回链格式不统一：有的用 `cockpit.html#dashboard`，有的用 `cockpit.html`

### 4. 共享框架未使用
- `src/lib/config.js`、`src/lib/shell.js` 已存在但无页面引用

---

## 二、推荐方案：渐进式统一

### Phase 1：统一外部页面进入动画（1-2 天）✅ 已完成

**目标**：让完整刷新页面在加载后也有与 cockpit 内部接近的 fadeIn 效果。

**已完成**：
- 在 `src/styles/shell.css` 或 `assets/css/main.css` 中新增 `.page-external` / `.content-area` 的进入动画标准
- 在每个独立页面（`business-topics.html`、`meetings.html`、`reviewer.html`、`strategy-map-list.html`）的 `<main>` 或内容容器上添加统一的进入动画
- 修正最明显的链接不一致：
  - 统一顶部导航回 cockpit 的链接格式为 `cockpit.html#<phase>`
  - 统一面包屑链接格式
- 为从 cockpit 跳转到外部页面的 `<a>` 增加 `data-transition="page"`，预留后续做离场遮罩的钩子

**实际改动**：
- `src/pages/business-topics/style.css`：为 `.content-area` 增加 `fadeIn` 关键帧动画
- `src/meetings.html`：顶部导航、面包屑、侧边栏链接统一为 `cockpit.html#<phase/page>` 格式
- `src/cockpit.html`：侧边栏外部页面链接增加 `data-external="true"` 钩子

**验证**：
- `npm run build` 通过
- `npx playwright test tests/e2e/navigation.spec.js` → 11 passed
- `npx playwright test tests/e2e/business-topics.spec.js` → 29 passed
- `npm run test:unit` → 110 passed
- `npm run check:scope` 通过

### Phase 2：统一 Shell 渲染（2-3 天）✅ 已完成

**目标**：消除顶部导航和侧边栏的硬编码复制，让所有页面从同一套配置渲染。

**已完成**：
1. 改造 `src/lib/shell.js`：新增 `external` 模式，支持生成真实 HTML 文件链接，同时保留 SPA 模式的 hash 导航回调。
2. 补全 `src/lib/config.js`：与 `cockpit.html` 内联配置对齐，新增 `dashboard/version-audit`、`admin/requirement-pool`、`exe/report-center` 等条目。
3. 创建 `src/lib/shell-injector.js`：零依赖注入器，根据当前页面文件名反查 `pageId`，注入统一导航，处理 `?embed=1` 跳过与移动端菜单绑定。
4. 以 `business-topics.html` 为试点，移除硬编码 top nav/sidebar，改为注入器渲染。
5. 依次迁移 `reviewer.html`、`strategy-map-list.html`、`strategy-map.html`。
6. 迁移 `meetings.html` shell：通过动态 `import()` 引入 `shell.js`/`config.js`，保留内部 4,400+ 行业务逻辑与内部路由。
7. 改造 `cockpit.html`：将主脚本改为 `<script type="module">`，移除内联 `TOP_NAV`/`SIDEBAR_CONFIG`/`EXTERNAL_PAGES`/`renderTopNav`/`renderSidebar`，改为 import 共享模块；报表中心特殊 sidebar 保留为 wrapper。

**验证**：
- `npm run build` 通过
- `npx playwright test tests/e2e/navigation.spec.js` → 11 passed
- `npx playwright test tests/e2e/business-topics.spec.js` → 29 passed
- `npx playwright test tests/e2e/reviewer.spec.js tests/e2e/reviewer-parser.spec.js tests/e2e/reviewer-report-render.spec.js tests/e2e/reviewer-embed.spec.js` → 46 passed
- `npx playwright test tests/e2e/strategy-map-list.spec.js tests/e2e/strategy-map.spec.js` → 29 passed
- `npx playwright test tests/e2e/calendar-view.spec.js tests/e2e/meeting-detail.spec.js tests/e2e/meeting-clone.spec.js tests/e2e/meeting-pipeline-toggle.spec.js tests/e2e/resolution-center.spec.js` → 全部通过
- `npm run test:unit` → 115 passed
- `python3 -m pytest tests/` → 166 passed
- `npm run check:scope` 通过

**注意**：
- 全量 E2E 并行运行时仍有偶发超时（与预览服务器负载相关），单独重跑可 pass。
- `meeting-agenda-postpone.spec.js`、`indicator-system.spec.cjs` 存在与本次修改无关的既有失败/不稳定用例。

### Phase 3：逐步 SPA 化（长期）

**目标**：减少完整刷新，最终让大部分功能在 cockpit 内部完成切换。

**步骤**：
1. 业务专题管理 → 提取为 `src/pages/business-topics/index.js`，注册到 `cockpit.html` 的 `PAGES` map
2. 会议材料审核 → 同样提取为 cockpit 路由
3. 战略地图列表/详情 → 已有独立 JS 模块，较容易整合
4. 经营分析会 → 待 `meetings.html` 分阶段重构完成后再做整体迁移

---

## 三、风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| E2E 测试因选择器变化失败 | 注入器生成的 DOM 结构与现有硬编码 HTML 保持一致，必要时加 `data-testid` |
| `?embed=1` 嵌入模式破坏 | 注入器在嵌入模式下直接返回，不注入 shell |
| 主题闪烁 | 注入器内联脚本在 DOM 渲染前设置 `data-theme` |
| `meetings.html` 巨石文件风险 | Phase 2 只替换 shell 标记，不动内部状态机 |
| 配置单点故障 | `config.js` 变更后同步更新所有页面，E2E navigation 用例覆盖 |

---

## 四、验证标准

1. **手动验证**：cockpit → 业务专题 → 经营分析会 → cockpit 往返切换，观察动画和导航 active 状态
2. **E2E**：`npx playwright test tests/e2e/navigation.spec.js` 及独立页面相关用例全部通过
3. **移动端**：验证侧边栏、主题切换、用户下拉在迁移后的页面正常工作
4. **嵌入模式**：`?embed=1` 下各页面仍能隐藏 shell

---

## 五、安全编码原则

- Phase 1 只加 CSS 动画和修正链接，不改动业务逻辑，风险最低
- Phase 2 每次只迁移一个独立页面，迁移后立即跑对应 E2E
- 保留现有 id、class、事件委托约定，避免测试失效
- 不提前重构 `meetings.html` 内部逻辑，等待已规划的分阶段重构

---

## 六、关联文档

- 当前焦点：`.ai/memory/01-current-focus.md`
- 会话摘要：`.ai/memory/06-session-log.md`
- 断点/恢复：`.ai/memory/08-checkpoint.md`
