# 断点与恢复

> 记录复杂任务的中间状态，方便中断后恢复。

## UI/UX 设计系统升级 — Phase 0~2 HTML 页面完成

- **当前步骤**：全部 `src/*.html` 页面 emoji 已替换为 Phosphor 图标，待继续清理 JS 模块（`src/lib/*`、`src/meetings/**/*`、`src/pages/**/*`、`assets/js/main.js`）
- **代码位置**：
  - 设计系统：`assets/css/tokens.css`、`assets/css/components.css`、`assets/css/main.css`
  - 图标体系：`assets/js/icon-mapping.js`、`assets/js/icons.js`、`assets/js/phosphor-icons.js`、`scripts/build-icon-sprite.js`
  - 设计文档：`docs/07-DesignSystem/`
  - Shell：`src/styles/shell.css`、`src/lib/config.js`、`src/lib/shell.js`、`src/lib/shell-injector.js`
  - 已清理 emoji 的页面：`src/business-topics.html`、`src/meetings.html`、`src/reviewer.html`、`src/requirement-pool.html`、`src/employee-directory.html`、`src/st-issue-tracking.html`、`src/at-issue-tracking.html`、`src/strategy-map-list.html`、`src/strategy-map.html`、`src/cockpit.html`
- **关键决策**：
  - 独立 HTML 静态内容使用 `<span class="icon" data-icon="key" data-icon-size="14"></span>`，由 `shell-injector.js` 或 `cockpit.html` 调用 `hydrateIcons()` 渲染
  - `meetings.html`、`strategy-map.html` 等内联模块脚本使用 `import { icon } from '../assets/js/icons.js'` 并在模板字符串中直接调用 `${icon('key', {size: 14})}`
  - `icon-mapping.js` 同时保留业务语义 key（如 `sp/strategy-map`）和 camelCase 别名（如 `mapTrifold`），方便不同模块按需使用
- **验证**：`npm run build` 通过；`npm run check:scope` 通过；`npm run test:unit` 396 passed；核心 E2E 86 passed
- **注意**：批量替换后需检查嵌套模板字符串/单引号字符串中的 icon 调用是否被错误地字符串化；已修复 `tabLabels`、决策/行动状态 ternary、上下游箭头空状态等 case
- **任务文件**：暂无（通过 Task 工具跟踪：#1~#5）

## 经分会-督办中心 — 阶段 1 完成

- **当前步骤**：行动项状态切换与 progressNote 行内编辑已完成，待阶段 2（逾期催办/独立督办工作台）
- **代码位置**：`src/meetings.html` 内，状态配置与抽屉函数 ~line 160，抽屉列表渲染 ~line 3349，抽屉 DOM ~line 3418，详情页展示 ~line 2046
- **数据存储**：会议数据 localStorage + 后端同步，行动项为 `meeting.actions[]` 元素，新增字段 `progressNote` / `updatedAt` / `completedAt`
- **页面路由**：`src/meetings.html`，右侧抽屉 `#pending-actions-drawer`
- **状态体系**：3 状态（pending / in_progress / completed），completed 自动从抽屉列表移除
- **已完成**：状态配置、抽屉状态 `<select>` 切换、progressNote 行内编辑、列表实时刷新、标题计数同步、详情页只读展示、XSS 加固、决议中心函数内联消除模块时序问题、空占位行动项自动清理、E2E 测试
- **验证**：`meeting-pending-actions.spec.js` 8 passed；会议相关回归 42 passed, 3 skipped；`npm run test:unit` 110 passed；`npm run build` 通过
- **注意**：meetings.html 主脚本在 IIFE 中，抽屉内联 `onclick/onchange` 使用 `window.fnName`；旧数据缺失新字段时按空值处理
- **任务文件**：`.ai/tasks/active/T050-supervision-center.md`

## 经分会-决议中心 — 功能主体已完成

- **当前步骤**：核心状态机、单测、抽屉 UI/交互、E2E 测试均已完成；剩余可选优化：以 ES Module 方式真正引用 `resolution-helpers.js`、确认生产数据迁移、版本号升级
- **代码位置**：`src/meetings.html`（内联状态机函数 ~line 169、编辑表单 ~line 2880、抽屉 DOM+渲染 ~line 3260）、`src/meetings/utils/resolution-helpers.js`
- **数据存储**：localStorage 键 `dste_resolutions_v2`；单条决议随会议数据 localStorage + 后端同步
- **页面路由**：无独立页面，目前作为 `src/meetings.html` 右侧抽屉 `#decisions-drawer` 存在
- **状态体系**：3 状态（pending → approved → closed），旧 9 状态已迁移映射到这 3 个状态
- **已完成**：新状态机设计、`resolution-helpers.js` 工具模块、31 个单元测试全部通过、meetings.html 内联函数（已移至 IIFE 顶部）、编辑表单升级、新增决议后迁移同步、抽屉 HTML 结构、抽屉内联渲染（筛选/统计/卡片/进度/状态badge切换/日志/KMS/跳转）、删除会议详情页原决议跟踪表格、旧组件引用废弃、E2E 测试新增/更新
- **验证**：vitest 112 passed；meeting + resolution-center E2E 39 passed, 3 skipped；`npx vite build` 通过
- **注意**：meetings.html 主脚本在 IIFE 中，局部函数不能被 onclick 访问；抽屉/弹窗内 onclick 需用 window 全局函数；事件委托在 bindPageEvents 中处理
- **任务文件**：`.ai/tasks/active/T030-resolution-center.md`

## 组织绩效管理模块 (OMP) — 开发中

- **当前步骤**：Tab 1 总览看板缺失 + 删除功能缺失 + CSS 变量违规待修复
- **代码位置**：`src/cockpit.html` 内，约 line 389~2937（OMP 数据层 + 渲染 + 弹窗 + 事件）
- **数据存储**：localStorage 键 `dste_omp_*_v1`
- **页面路由**：`cockpit.html#exe/tasks`
- **Mock 数据**：8 指标 + 8 KPI 实例 + 6 重点工作 + 18 里程碑 + 4 进度记录
- **已完成**：Tab 2(KPI管理) / Tab 3(重点工作) / Tab 4(甘特图) / 弹窗 / 导出
- **未完成**：Tab 1(总览看板) / 删除功能 / CSS 变量修复
- **注意**：所有 OMP 函数加 `omp_` 前缀；事件委托在 bindPageEvents 中处理；弹窗内 onclick 使用 window 全局函数

## 统一子页面切换效果与导航一致性 — Phase 2 完成

- **当前步骤**：Phase 2 已完成（统一 Shell 渲染），待 Phase 3（逐步 SPA 化）
- **代码位置**：
  - `src/lib/shell.js`：新增 `external` 模式，支持生成真实 HTML 文件链接
  - `src/lib/config.js`：补全与 cockpit 对齐的 `SIDEBAR_CONFIG`/`EXTERNAL_PAGES`/`PAGE_NAMES`
  - `src/lib/shell-injector.js`：独立页面 shell 注入器
  - `src/business-topics.html`、`src/reviewer.html`、`src/strategy-map-list.html`、`src/strategy-map.html`：移除硬编码 shell，引入注入器
  - `src/meetings.html`：通过动态 `import()` 引入 `shell.js`/`config.js`，保留内部业务逻辑
  - `src/cockpit.html`：主脚本改为 module，import 共享 shell.js，移除内联配置与渲染函数
- **方案**：三阶段渐进式统一
  - Phase 1：统一外部页面进入动画 + 修正链接格式（已完成）
  - Phase 2：统一 Shell 渲染（已完成）
  - Phase 3：逐步 SPA 化，将独立页面提取为 cockpit 内部路由
- **关键风险**：E2E 选择器变化、`?embed=1` 嵌入模式、主题闪烁、meetings.html 巨石文件 — 均已验证无回归
- **已完成**：
  - business-topics.html / reviewer.html / strategy-map-list.html / strategy-map.html 统一使用 shell-injector
  - meetings.html 使用共享 shell.js 渲染顶部导航与侧边栏，内部路由保留
  - cockpit.html 引用共享 shell.js，配置单点维护
  - 相关 integration/pytest 用例更新以适配新的代码组织
- **验证**：`npm run build` 通过；核心 E2E（navigation/business-topics/reviewer/strategy-map/meeting-detail/clone/pipeline/resolution/calendar-view）全部通过；`npm run test:unit` 115 passed；`python3 -m pytest tests/` 166 passed；`npm run check:scope` 通过
- **任务文件**：`.ai/tasks/active/T060-navigation-unification.md`

## T010 需求管理中心 — 需求池列表页

- **当前步骤**：未开始（Step 1: 页面骨架与路由注册）
- **任务文件**：`.ai/tasks/active/T010-requirement-pool.md`
- **前置条件**：无强依赖，可独立开发
- **注意**： cockpit.html 的 JS 在 IIFE 中，但独立页面不受此限制
- **状态**：已暂停，优先完成 OMP
