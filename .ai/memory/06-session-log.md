# 会话历史

> 记录最近几次 AI 会话的摘要，方便快速恢复上下文。

## 2026-06-17
- **主题**：重构会议效果评分模型（四维度 → 三段式）
- **操作**：
  - 修复 `updateEvalSlider` NaN 根因（`dims.resolution` → `dims.decision`）
  - 将会议效果评估从 `preparation/discussion/decision/execution` 四维度改为 `before/during/after` 三段式模型
  - 新增 9 项子分与会议级议程延期扣 `-5` 分机制
  - 同步更新 `src/meetings/utils/scoring.js` 与 `src/meetings.html` 内联算法
  - 更新 `tests/unit/scoring.test.js`（19 用例）与 `tests/e2e/meeting-evaluation.spec.js`
  - 更新产品设计文档 M4 评分算法 v2.0 与 `Effectiveness` 接口
- **修改文件**：`src/meetings.html`、`src/meetings/utils/scoring.js`、`tests/unit/scoring.test.js`、`tests/e2e/meeting-evaluation.spec.js`、`docs/01-Product产品/经营分析会-功能设计文档.md`
- **验证**：
  - `npm run test:unit` → 112 passed（基线 110）
  - `npx playwright test` → 227 passed / 20 skipped
  - `npm run build` → 通过
  - `npm run check:scope` → 通过
- **状态**：complete

## 2026-06-17
- **主题**：修复年度经营计划分解保存失败
- **操作**：
  - 定位根因：`ap_confirmDecompose` 中权重合计校验过于严格（`Math.abs(totalWeight - 100) > 1`），用户修改单个战区权重后合计往往不为 100，导致保存被拦截
  - 修复：保存前自动归一化子 KPI 权重，使合计保持 100%；若权重全为 0，则均分 100%
  - 新增 E2E 用例 `分解 KPI 保存成功` 覆盖修改后保存场景
- **修改文件**：`src/cockpit.html`、`tests/e2e/annual-plan.spec.js`
- **验证**：
  - `npx playwright test tests/e2e/annual-plan.spec.js` → 8 passed
  - `npm run build` → 通过
  - `npm run check:scope` → 通过
- **状态**：complete

## 2026-06-17 (Claude)
- **主题**：统一子页面切换效果与导航一致性 Phase 1
- **操作**：
  - 诊断 SPA Shell + 独立 HTML 页面混合架构下的切换效果与导航不一致问题
  - 制定三阶段渐进式统一方案（Phase 1 动画+链接 / Phase 2 统一 Shell 渲染 / Phase 3 逐步 SPA 化）
  - Phase 1 实施：
    - `src/pages/business-topics/style.css`：为 `.content-area` 增加 `fadeIn` 关键帧动画
    - `src/meetings.html`：顶部导航、面包屑、侧边栏链接统一为 `cockpit.html#<phase/page>` 格式
    - `src/cockpit.html`：侧边栏外部页面链接增加 `data-external="true"` 钩子
  - 创建任务配方 `.ai/tasks/active/T060-navigation-unification.md`，完整记录三阶段方案、风险与缓解、关键文件
  - 更新当前焦点 `.ai/memory/01-current-focus.md` 与断点 `.ai/memory/08-checkpoint.md`
- **修改文件**：`src/pages/business-topics/style.css`、`src/meetings.html`、`src/cockpit.html`
- **验证**：
  - `npm run build` → 通过
  - `npx playwright test tests/e2e/navigation.spec.js` → 11 passed
  - `npx playwright test tests/e2e/business-topics.spec.js` → 29 passed
  - `npm run test:unit` → 110 passed
  - `npm run check:scope` → 通过
- **状态**：Phase 1 complete，Phase 2/3 待实施

## 2026-06-17
- **主题**：会议评分算法 v2.0（三段式模型） refactor
- **操作**：
  - 重构 `src/meetings/utils/scoring.js`：从四维度模型（preparation/discussion/decision/execution）改为三阶段模型（before/during/after）
  - 会前 35 分：材料完整性、议程类型覆盖、会议材料评分
  - 会中 30 分：有效讨论、参与人员、时间控制
  - 会后 35 分：决议&待办数量、评分及时性
  - 会议级扣分：议程顺延 -5 分
  - 新增 `reviewScores` 参数支持材料审核评分映射
  - 同步更新 `tests/unit/scoring.test.js` 为 v2.0 断言
- **注意**：`src/meetings.html` 仍内联旧版四维度 `calculateAutoScore`，评估 UI 尚未迁移到三阶段模型，存在数据模型不一致风险
- **验证**：
  - `npm run test:unit` → 110 passed（含 scoring.test.js）
- **状态**：算法模块已完成，待与 meetings.html 评估 UI 打通

## 2026-06-17
- **主题**：年度经营计划重构提质（方案 C）
- **操作**：
  - 修复 P0 bug：删除重点工作存错 storage key、新增重点工作 cycleId 为 undefined、编辑 KPI 后三档目标未同步、新增 KPI 字段硬编码
  - 拆分 `renderAnnualPlan` 为 `ap_renderOverviewTab` / `ap_renderDecompositionTab`，分解视图改为按实际父级 KPI 动态渲染
  - 新增 KPI 表单增加负责人/责任部门/计量单位字段，指标切换自动回填单位
  - 实现「发布到执行」：将当前 cycle phase 改为 execution，页面阶段标签动态显示
  - 统一弹窗事件委托：`omp_openModal` 关闭按钮和年度经营计划弹窗按钮全部改为 `data-modal-action`，由全局 body 事件委托处理
  - 年度经营计划模板中用户输入插值统一使用 `escapeHtml()` 防 XSS
  - 抽取 `.ap-card` / `.ap-table` / `.ap-dim-badge` / `.ap-status-pill` / `.ap-edit-panel` / `.ap-section-title` 等公用 CSS class
  - 新增 Playwright E2E 测试 `tests/e2e/annual-plan.spec.js`（7 个用例全部通过），更新 `tests/test_annual_plan.py` / `tests/test_annual_plan_edit.py`
- **修改文件**：`src/cockpit.html`、`tests/e2e/annual-plan.spec.js`、`tests/test_annual_plan.py`、`tests/test_annual_plan_edit.py`
- **验证**：
  - `python3 -m pytest tests/test_annual_plan.py tests/test_annual_plan_edit.py -v` → 20 passed
  - `npx playwright test tests/e2e/annual-plan.spec.js` → 7 passed
  - `npm run test:e2e` → 226 passed, 20 skipped
  - `npm run build` → 通过
  - `npm run check:scope` → 通过
  - `npm run lint` → 无新增 error（既有 error/warning 与本次改动无关）
- **状态**：complete

## 2026-06-16 (Claude)
- **主题**：DSTE 功能框架布局与优先级优化
- **操作**：
  - 检查 `docs/00-功能全景图.md` 和 `.ai/tasks/active/T040-functional-framework.md` 的主功能模块布局、顺序、优先级
  - 修复 2 个明显错误：P1 Backlog 编号重复、3.2 导航代码块中 BEM 战略解码错放到 SP 分组
  - 应用 3 项优化：规则引擎中心 P0→P1、全面预算管理 P2→P1、BP 模块顺序统一为「战略指标库 → BEM → 年度经营计划」
  - Review 阶段模块顺序暂不调整（按用户要求）
  - 更新 `.ai/memory/01-current-focus.md` 与本次会话摘要
- **验证**：
  - `npm run build` → 构建通过
  - `npx playwright test tests/e2e/navigation.spec.js` → 11 passed
- **状态**：框架布局和优先级已优化

## 2026-06-16 (Claude)
- **主题**：经营分析会页面诊断与重构规划
- **操作**：
  - 诊断 `src/meetings.html`：4,407 行 / 296 KB，59 函数、14 个超 100 行、`renderMeetingDetail` 627 行
  - 定位三大问题：单文件巨石、无 ES Module、大量模板字符串/内联 onclick/内联 style
  - 输出完整诊断与重构计划到桌面：`/Users/jasonjing/Desktop/DSTE-经营分析会页面重构诊断与计划.md`
  - 制定 7 阶段渐进式重构方案：Phase 1 抽工具函数 → Phase 5 整体 ES Module 化 → Phase 7 提取 CSS
  - 明确保留 DOM / localStorage / window shim 以保证 E2E 兼容
- **决策**：
  - 采用 `src/pages/business-topics/main.js` 模式改造 meetings.html
  - 按阶段推进，每阶段可独立构建和测试
- **下一步**：
  - 用户确认后从 Phase 1 开始实施，或直接进入 Phase 5 整体模块化解耦
- **状态**：诊断与规划完成，未改动源码

## 2026-06-16 (Claude)
- **主题**：DSTE 需求管理中心 PRD 与框架纳入
- **操作**：
  - 创建独立 PRD：`docs/01-Product产品/需求管理中心-产品设计文档.md`
  - 将需求管理中心定位为公共支撑/系统管理模块，P1 优先级
  - 更新 `docs/00-功能全景图.md` 与 `.ai/tasks/active/T040-functional-framework.md`
  - 新增占位页与导航：`src/cockpit.html` 内联 `SIDEBAR_CONFIG` 系统管理分组增加「需求管理中心」；`PAGES` map 增加占位渲染；`src/lib/config.js` 同步 `PAGE_NAMES`
  - 新增 E2E 测试：`tests/e2e/navigation.spec.js` 增加 `#admin/requirement-pool` 占位页可访问性用例
  - 更新 `.ai/memory/01-current-focus.md` 与本次会话摘要
- **验证**：
  - `npm run build` → 构建通过
  - `npx playwright test tests/e2e/navigation.spec.js` → 11 passed
  - `npm run test:unit` → 110 passed
  - `npm run check:scope` → 29/6 onclick 全局可访问
- **状态**：PRD 与框架纳入完成，独立页面实现见 T010

## 2026-06-16 (Claude)
- **主题**：DSTE 主体功能架构完善：补齐预警中心、规则引擎中心、全面预算管理
- **操作**：
  - 用户指出功能全景图遗漏 **预警中心**、**规则引擎中心**、**全面预算管理**
  - 按 Plan 模式制定实施计划，明确规则引擎/预警中心纳入公共支撑占位页，全面预算管理作为跨阶段业财融合能力
  - 更新 `docs/00-功能全景图.md` 与 `.ai/tasks/active/T040-functional-framework.md`：功能清单、P0/P1/P2、导航结构、实施阶段
  - 新增导航与占位页：`src/cockpit.html` 内联 `SIDEBAR_CONFIG` 增加 `admin/rule-engine`、`admin/alert-hub`；`PAGES` map 增加占位渲染；`src/lib/config.js` 同步 `PAGE_NAMES`
  - 新增 E2E 测试：`tests/e2e/navigation.spec.js` 增加两个占位页可访问性用例
  - 更新 `.ai/memory/01-current-focus.md` 与本次会话摘要
- **验证**：
  - `npm run build` → 构建通过
  - `npx playwright test tests/e2e/navigation.spec.js` → 10 passed
  - `npm run test:unit` → 110 passed
  - `npm run check:scope` → 29/6 onclick 全局可访问
- **状态**：文档与占位导航已更新，待继续第一阶段其余占位页/骨架实现

## 2026-06-16 20:45 (Kimi)
- **主题**：经分会-督办中心阶段 1：行动项状态切换与 progressNote 行内编辑
- **操作**：
  - 在 `src/meetings.html` 新增 `ACTION_STATUS_CONFIG` / `getActionStatusConfig` 3 状态配置
  - 「待闭环行动」抽屉将状态 badge 替换为 `<select>`，绑定 `window.updatePendingActionStatus(meetingId, actionIdx, newStatus)`
  - 实现 progressNote 行内编辑：`openActionNoteEditor(meetingId, actionIdx)` / `saveActionProgressNote(meetingId, actionIdx)` / `cancelActionNoteEdit(meetingId, actionIdx)`
  - 修复运行时错误：IIFE 与 `<script type="module">` 执行时序不确定导致 `normalizeResolution is not defined/function`；将 `normalizeResolution`、`advanceResolutionStatus`、`canTransitionResolutionStatus`、`createDefaultResolution` 内联到 IIFE，移除模块桥接
  - 修复空占位行动项污染：保存会议时过滤无内容且无负责人的行动项；页面启动迁移时自动清理已持久化的空占位行动项并回写 localStorage；E2E 测试增加 afterEach 清理本用例创建的测试行动项
  - 优化会议编辑弹窗 UI：决议与行动项位置互换（决议在上，行动项在下）；决议卡片的「来源议题 ID」「审批人」「KMS 链接」字段改为紧凑内联布局，缩短输入框宽度
  - 优化会议详情/卡片视图：详情页折叠面板顺序改为决议在前、行动项在后；会议卡片 Tab 顺序同步改为「纪要 → 决策 → 行动项 → ...」
  - 完善决议「来源议题」关联逻辑：议程项新增稳定 ID，决议的 sourceTopicId 改为下拉选择当前会议的议程项；删除议程时自动清理关联决议的来源
  - 决议与行动项自动编号：编辑表单、详情页、卡片 Tab 均显示连续序号；顺手修复了卡片「行动项」Tab 错误显示决议内容的 bug
  - 行动项支持关联议程与关联决议：编辑表单新增「关联议程」「关联决议」下拉；详情页与卡片 Tab 显示来源标签；删除议程/决议时自动清理关联的行动项来源
  - 新增 `renderPendingActionsList()` + `refreshPendingActionsList()`，状态变更后实时重绘列表与标题计数
  - 会议详情页行动项下方只读展示 `📝 progressNote`
  - XSS 加固：会议卡片摘要及详情页行动项字段补充 `escapeHtml`
  - 创建任务配方 `.ai/tasks/active/T050-supervision-center.md`
  - 更新当前焦点 `.ai/memory/01-current-focus.md`、断点 `.ai/memory/08-checkpoint.md`、会话摘要
- **验证**：
  - `npx playwright test tests/e2e/meeting-pending-actions.spec.js` → 11 passed
  - 会议相关回归 E2E → 21 passed
  - `npm run test:unit` → 110 passed
  - `npm run build` → 构建通过
- **状态**：阶段 1 complete，待阶段 2（逾期催办/独立督办工作台）

## 2026-06-16 (Kimi)
- **主题**：DSTE 完整功能框架设计（隔壁会话中断后补充归档）
- **操作**：
  - 梳理 DSTE 五阶段功能清单（驾驶舱/SP/BP/Execute/Review/公共支撑），标注实现状态
  - 按 P0/P1/P2 排序缺失功能，明确战略主流程阻塞项
  - 制定框架搭建方案：占位页标准化、补齐页面/模块、导航结构补全
  - 创建任务配方 `.ai/tasks/active/T040-functional-framework.md`
  - 更新当前焦点 `.ai/memory/01-current-focus.md` 与本次会话摘要
  - 规划三阶段实施：占位页+导航 → 主流程骨架 → 数据打通标记
- **状态**：方案已归档，待用户确认是否开始第一阶段实施

## 2026-06-16 (Claude)
- **主题**：修复经营分析会测试数据污染生产系统
- **操作**：
  - 定位污染根因：`src/meetings.html` 无环境判断注入 mock、localhost 默认写生产 Worker、Playwright E2E 无隔离、Worker POST 未鉴权
  - 前端隔离：localhost 默认不回退生产 API；`getMockMeetings()` 与业务专题默认 demo 仅本地注入
  - E2E 隔离：新增 `tests/e2e/storage-state.json`，Playwright 上下文默认 `dste_api_base=''`
  - 新增 `scripts/cleanup-kv-mock-data.cjs`，清理生产 KV 中 7 条 mock 会议、9 条 demo 专题及测试行动项/决议
  - Worker 鉴权：`api-worker/worker.js` 新增 `requireAuth`；`/api/topics`、`/api/issues`、`/api/meetings`、`/api/omp/*`、`/api/version-audit` POST 均校验 Bearer token
  - `scripts/generate-version-audit.cjs` 新增 `--publish` 直接写 KV
  - 提交推送 `main`（`aeb948a`），GitHub Actions Deploy #39 成功；Worker 与前端均已部署
- **验证**：
  - `npm run build` / `npm run test:unit`（110 passed）/ `npx playwright test`（215 passed, 20 skipped）
  - 生产 meetings 接口仅剩 6 条真实会议，无 mock ID
  - Worker 未鉴权 `POST /api/meetings` 返回 401
- **状态**：complete

## 2026-06-16 (Claude)
- **主题**：RoadMap 新一版迭代 + 按周展示开发进度的看板
- **操作**：
  - 按 `docs/01-Product产品/roadmap-优化方案.md` 完成 P0 + P1：执行摘要 KPI、双栏/单栏布局、版本详情折叠、纵向/横向时间线、全局筛选联动、搜索过滤、看板卡片优化
  - 新增「周视图」看板：按 ISO 自然周展示版本节点、开发计划、upcoming 里程碑
  - 更新 `tests/e2e/roadmap.spec.js`：14 个用例覆盖新布局与周视图
  - 修复数据预加载路径为 `/roadmap-data.json`，确保 dev/preview 双模式可用
  - 更新 Claude 记忆：`roadmap-iteration-weekly-view.md`
- **验证**：
  - `npm run build` → 通过
  - `npx playwright test tests/e2e/roadmap.spec.js` → 14 passed
  - `npx playwright test tests/e2e/navigation.spec.js tests/e2e/prod-verify.spec.js` → 10 passed
  - `npx eslint src/cockpit.html tests/e2e/roadmap.spec.js` → 0 errors

## 2026-06-15 18:55 ~ 20:20 (Kimi)
- **主题**：继续开发经分会-决议中心功能
- **操作**：
  - 先补充项目记忆：创建 `.ai/tasks/active/T030-resolution-center.md`，更新 current-focus / checkpoint / session-log
  - 决策采用「方案 A」：废弃旧组件 `/meetings-components/DecisionsDrawer.js`，把抽屉渲染逻辑内联到 `src/meetings.html`
  - 修复关键作用域 bug：内联状态机/抽屉函数原本被插在某个嵌套函数内部，导致 `init()` 中调用 `normalizeResolution` 报 `is not defined`；用脚本将整段函数移动到 IIFE 顶部
  - 实现抽屉内联渲染：9 状态筛选 pills、统计摘要、决议卡片、执行进度条、状态流转下拉 + 确定按钮、审批日志折叠、KMS 链接、跳转源会议
  - 移除旧 `DecisionsDrawer.js` 的 `<script>` 引用
  - 更新 E2E：`meeting-decision-edit.spec.js` placeholder「决策人」→「责任人」
  - 新增 E2E：`tests/e2e/resolution-center.spec.js`（打开抽屉/9 状态筛选/状态流转）
- **后续精简**：
  - 用户要求状态精简，从 9 状态改为 3 状态：pending（待审批）/ approved（已通过）/ closed（已闭环）
  - 同步修改 `resolution-helpers.js`、meetings.html 内联函数、编辑表单、抽屉渲染、单元测试、E2E 测试
  - 用户要求抽屉卡片只保留一个状态变更入口：去掉「选择流转...」下拉 +「确定」按钮，改为点击状态 badge 本身出现下拉选择，选中即生效
  - 用户要求删除会议详情页里的「✅ 决议跟踪」全量表格（与决议中心抽屉功能重复），已删除并同步更新 `tests/e2e/calendar-view.spec.js`
- **验证**：
  - `npx vitest run tests/unit/resolution-helpers.test.js` → 29 passed
  - `npx playwright test tests/e2e/meeting-*.spec.js tests/e2e/resolution-center.spec.js tests/e2e/calendar-view.spec.js` → 39 passed, 3 skipped
  - `npx vite build` 构建通过
- **状态**：complete，决议中心功能主体已完成（3 状态精简版）

## 2026-06-09 17:30 (Claude)
- **主题**：年度计划 vs OMP 边界厘清 + CSS 硬编码颜色全修复
- **操作**：
  - **厘清年度计划与 OMP 边界**：年度计划 = 只读目标一览表，OMP = 执行监控
  - 年度计划页移除 KPI 卡片中的达成率进度条（执行数据不展示）
  - OMP KPI 编辑弹窗：目标值/挑战值/权重设为 disabled（计划锁定），保存逻辑不覆盖计划字段
  - OMP 移除「新建 KPI」按钮，替换为提示「KPI 目标请前往年度经营计划维护」
  - **修复全部 CSS 硬编码颜色**（20+ 处）：
    - 新增 CSS 变量：--dim-*/--kpi-level-*/--accent-pink/--canvas-*
    - BSC 维度徽章、canvas 节点状态、进度条、状态 pill、KPI 卡片层级、SVG 环形图等全部替换
    - JS 中 dtypeColors、dimColors、deptColors、BSC_DIMENSIONS 等对象值替换为 var() 引用
  - 更新 `.ai/memory/01-current-focus.md` 反映真实状态
- **验证**：
  - `npx vite build` 构建通过（229ms）
- **状态**：complete，待 pytest + Playwright 回归测试

## 2026-06-09 14:45
- **主题**：战略指标库编辑按钮无反应排查 + meetings.html 事件委托修复
- **操作**：
  - 排查战略指标库（`#bp/kpi`）页面编辑按钮点击无反应问题
  - 添加调试日志追踪：事件委托正常 → `ind_openModal` 正常 → `omp_openModal` 正常 → DOM 元素存在
  - **根因定位**：`.omp-modal-overlay` / `.omp-modal` / `.omp-modal-wide` CSS 被错误地定义在 `renderTasks()` 函数内部的 `<style>` 标签中，只在 `exe/tasks` 页面插入 DOM；战略指标库页面弹窗 DOM 被创建但完全无样式
  - **修复**：将弹窗 CSS 移至全局 `<style>` 标签（第12行），所有页面共享
  - 修复 meetings.html 编辑按钮内联 `onclick` 导致测试失败：移除内联事件，卡片点击改为 `data-open-meeting-detail` 事件委托
  - 升级 `DATA_VERSION`：`canvas-v6` → `canvas-v7`
- **验证**：
  - pytest 161 passed / 0 failed
  - 浏览器端验证：战略指标库编辑弹窗正常显示
- **状态**：complete

## 2026-06-05 14:45
- **主题**：组织绩效管理模块 (OMP) — Claude 续盘 + 关键缺失修复
- **操作**：
  - 更新记忆系统：将 OMP 设为当前开发焦点，T010 需求池暂停
  - 创建 T020 任务配方文件，记录代码位置和待办清单
  - **修复关键缺失** (Claude 遗留)：
    1. 补充 Tab 1: 总览看板 (`omp_renderDashboard`) — 统计卡片 ×6 + KPI 热力图 + 工作状态分布 + 预警清单
    2. 补充删除功能 — KPI 删除 + 工作删除（含级联删除里程碑/进度记录）+ 二次确认弹窗
    3. 修复 CSS 变量违规 — 甘特图 legend 和 bar track 的硬编码十六进制色值改为 `var(--primary)` 等
- **状态**：进行中，待构建验证

## 2026-06-04 20:00
- **主题**：项目诊断 + v0.4.4 升级 + GitHub Actions 自动部署修复
- **操作**：
  - 项目全面诊断：测试覆盖（pytest 91/96、vitest 全失败）、代码质量（957 内联 style、249 硬编码颜色）、构建产物分析
  - 经营分析会模块增强并升级 v0.4.4：
    - 新增决策编辑功能（会议弹窗内添加/编辑/删除决议）
    - 新增待闭环行动抽屉（右侧滑出面板聚合所有待办）
    - 一报一会流程交互优化 + 保存数据完整性修复
    - 4 个 Playwright E2E 测试覆盖新功能
  - 版本号升级 0.4.3 → 0.4.4，commit 并 push
  - GitHub Actions 部署失败排查与修复：
    - 诊断：服务器 `/root/.ssh/authorized_keys` 为空，`SSH_HOST`/`SSH_USER` Secrets 从未配置
    - 生成 RSA 密钥对，公钥添加到服务器，私钥更新到 GitHub Secrets
    - deploy.yml 改用 `rsync + ssh` 替代 `appleboy/scp-action@v0.1.7`
    - 配置缺失的 `SSH_HOST`（47.101.197.187）和 `SSH_USER`（root）Secrets
    - Run #23 首次成功自动部署
  - 手动部署作为 fallback 确保生产环境及时更新
- **验证**：
  - scope check 通过（28/28 onclick 全局可访问）
  - pytest 91 passed / 5 failed（reviewer 历史遗留）
  - `npm run build` 构建通过
  - 生产环境 https://dste.fineres.com/ 返回 200，meetings.html 171KB
  - GitHub Actions Run #23 状态 success
- **状态**：complete

## 2026-06-04 16:30
- **主题**：v0.4.3 部署修复 + E2E 测试修复 + 生产环境首页 403 修复
- **操作**：
  - 完成 v0.4.3 release commit（reviewer.html 重构、meetings.html 新增、cockpit.html scope 修复）
  - 修复 ESLint 配置（移除不兼容的 html processor，添加 ignorePatterns）
  - 修复 pre-commit hook（check-js-syntax.cjs 支持 ES module）
  - 修复 deploy.yml：改为 GitHub Actions 构建 + SCP 上传，修正目标路径为 /opt/dste-v042/
  - SSH 到生产服务器，修复 nginx root 配置（/opt/dste-v042/src → /opt/dste-v042/），首页恢复 200
  - 修复 E2E 测试：21 失败 → 122 全部通过
    - 修正 business-topics 选择器（data-ms-action、data-modal-close 等不存在属性）
    - 修正 meeting-detail URL（cockpit.html#exe/meetings → meetings.html）
    - 修正 verify-business-topics 端口（4173 → baseURL）
  - 修复业务专题 JS 模块：
    - issue-import.js：补充 _importRows、_importFileName、openModal、closeModal 声明
    - ai-analysis.js：补充 _currentReportType、simpleHash、openModal、closeModal + 12 个缺失分析函数
  - 写入记忆系统：deploy-incident-lessons、server-infrastructure、deploy-checklist
- **验证**：
  - 生产环境 https://dste.fineres.com/ 返回 200
  - E2E 测试 122 passed / 0 failed
  - CI lint 通过
- **状态**：complete

## 2026-06-04
- **主题**：经营分析会模块独立页面提取 + 死代码清理
- **操作**：
  - 将 cockpit.html 中约 1800 行经营分析会代码提取到 `src/meetings.html`
  - 注册 vite.config.js 构建入口
  - 更新 config.js 和 cockpit.html 的 EXTERNAL_PAGES，实现点击跳转
  - 添加独立页面内部路由（bindPageEvents + 简化 navigate）
  - 修复独立页面运行时白屏（补充 renderTopNav/renderSidebar/EXTERNAL_PAGES/renderBreadcrumb）
  - 清理 cockpit.html 中约 1800 行已不用的经营分析会死代码
  - 更新 pytest 测试（test_calendar_view.py + test_integration.py）以检查 meetings.html
  - 将 meetings.html 加入 check:scope
- **验证**：
  - `npm run build` 构建通过，cockpit.html 产物从 261KB 降至 129KB
  - `npm run check:scope` 通过
  - pytest 91 通过 / 5 失败（ reviewer 历史遗留）
  - 浏览器自动化验证：会议列表、详情、日历视图、新建会议全部正常
- **状态**：complete

## 2026-06-02 09:51
- **主题**：生产环境回滚
- **操作**：
  - SSH 连接到 47.101.197.187，诊断 cockpit.html 白屏问题
  - 确认根因：v0.4.2 代码拆分后 `src/js/` 目录未部署到服务器
  - 回滚到 6月1日备份，系统恢复
  - 重命名备份文件为 `dste-*`
- **决策**：记录服务器目录命名问题为技术债务 DEBT-001，计划维护时处理
- **状态**：complete

## 2026-06-01 22:28
- **修改文件**: .ai/memory/01-current-focus.md, AGENTS.md, docs/04-Guide开发指南/ai-memory-workflow.md
- **决策**: 建立了文件化记忆系统解决 AI 会话无状态问题
- **下一步**: 验证闭环后提交到 Git
- **状态**: partial

## 2026-06-01 22:45
- **修改文件**: src/cockpit.html, src/js/dashboard.js, src/js/cockpit.js, src/js/shell.js, src/js/cockpit-version.js
- **决策**: 将 cockpit.html 的内联 JS 提取到独立文件（dashboard.js 等），但 Agent token 超限中断
- **下一步**: 跑测试验证当前状态，决定是继续修复还是回滚备份
- **状态**: partial


## 2026-06-10 (Kimi)
- **主题**：会议评分评价功能实现 + 补充会议材料审核项目记忆
- **操作**：
  - **经营分析会模块：会议评分评价功能（方案 B：AI 推荐 + 人工确认）**
    - 自动评分算法 `calculateAutoScore(meeting)` — 基于 metrics/pipeline/decisions/actions 计算四维推荐分
    - 评估录入浮层 — 居中 modal，预填 AI 推荐分，支持滑块微调、11 个快捷标签、文字评价
    - 详情页评估入口 + 评估 section（进度条、标签 pills、引用块）
    - 列表卡片评估状态展示
    - 新增 `tests/e2e/meeting-evaluation.spec.js`（5 个测试用例全部通过）
    - 修复既有测试 `meeting-save-todo.spec.js` 因新增「保存评估」按钮导致的 strict mode violation
  - **补充隔壁项目记忆**：`meeting-material-reviewer/.ai/memory/`
    - 记录了会议材料审核助手 v1.0.1 的完整状态（Flask 代理 + 前端 + SQLite）
    - 记录了 4 个审核场景、批量审核恢复机制、事实核查等关键决策
- **验证**：
  - `npm run build` 构建通过
  - 通知测试 9/9 passed，评估测试 5/5 passed，保存待办 2/2 passed
- **状态**：complete
