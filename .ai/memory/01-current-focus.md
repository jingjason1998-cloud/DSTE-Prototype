# 当前开发焦点

> 更新时间: 2026-07-07 17:02

## 状态
**新增高优先级开发线：人员与组织目录（第一阶段已完成）**。已建立员工/组织架构数据层、Excel 导入能力、管理页入口，支持在系统内统一维护真实人员名单与组织架构。后续阶段将逐步把人员选择器接入会议、OMP、业务专题、战略地图等模块。
现有并行开发线仍保留：
- **经分会-决议中心**：核心状态机与单测已完成，UI 抽屉与旧组件状态体系已统一，剩余可选优化。
- **DSTE 完整功能框架搭建**：方案已完成，待用户确认是否开始第一阶段实施。
- **会议材料审核功能**：状态需与本次框架方案对齐。

## 进行中的开发线

### 经分会-督办中心（新增 / 阶段 1 完成）
- 行动项 3 状态配置：`pending` / `in_progress` / `completed`
- 修复 IIFE 与 ES Module 时序问题：将决议中心相关纯函数（`normalizeResolution`、`advanceResolutionStatus`、`canTransitionResolutionStatus`、`createDefaultResolution`）直接内联到 `src/meetings.html` 的 IIFE 中，移除 `<script type="module">` 桥接，彻底消除 `normalizeResolution is not defined/function` 错误
- 抽屉内状态切换直接生效，选中即保存；切为 `completed` 后自动从抽屉移除，标题计数同步减少（函数签名 `updatePendingActionStatus(meetingId, actionIdx, newStatus)`）
- progressNote 行内编辑：每条行动项支持「编辑/保存/取消」（`openActionNoteEditor(meetingId, actionIdx)` 等），作为进度说明与闭环说明的统一小字段
- 会议详情页行动项下方展示 `📝 progressNote`
- E2E 测试：`tests/e2e/meeting-pending-actions.spec.js` 11 个用例全部通过
- 任务配方见 `.ai/tasks/active/T050-supervision-center.md`

### 人员与组织目录（新增 / 第一阶段完成）
- 建立统一员工/组织架构数据层：`src/lib/employee-directory.js`（员工模型、ldap 组织树构建、搜索索引、PersonRef 兼容层）
- 建立导入能力：`src/lib/employee-import.js`（Excel/CSV 解析、校验、预览、写入）
- 新增管理页：`src/employee-directory.html` + `src/pages/admin/employee-directory.js`，提供导入入口、统计卡片、组织树浏览、员工搜索
- 新增驾驶舱导航：「系统管理」→「人员与组织管理」
- Excel 作为唯一来源，系统内目录只读，重新导入覆盖更新
- 验证：`npm run test:unit` 227 passed，E2E 4 passed（含真实 Excel 上传导入），`npm run build` 与 `check:scope` 通过
- commit：`2c5bdd9` feat(employee-directory): 第一阶段 — 人员与组织目录数据层及管理入口

## 进行中的开发线

### DSTE 完整功能框架搭建（高优先级 / 文档与占位导航已更新）
- 功能全景图与 T040 任务已更新：补入 **规则引擎中心**、**预警中心**、**全面预算管理**、**需求管理中心** 四个遗漏模块
- 明确 **全面预算管理** 为跨阶段业财融合能力（SP 战略投资预算 → BP 年度经营预算 → Execute 预算执行监控 → Review 预算分析评估），不拆独立一级导航
- 新增独立 PRD：`docs/01-Product产品/需求管理中心-产品设计文档.md`
- 新增占位页与导航入口：`cockpit.html#admin/rule-engine`、`cockpit.html#admin/alert-hub`、`cockpit.html#admin/requirement-pool`，放在驾驶舱侧边栏「系统管理」分组
- P0 保留 BEM/年度经营计划闭环/AI 助手/经营分析会智能闭环；P1 新增规则引擎中心、预警中心、需求管理中心、全面预算管理；P2 保留绩效/干部/复盘/差距/预算分析评估/数据集成
- 修复文档错误：P1 Backlog 编号重复、3.2 导航代码块中 BEM 错放到 SP 分组、BP 模块顺序统一为「战略指标库 → BEM → 年度经营计划」
- 验证：`npm run build` 通过，`navigation.spec.js` 11 passed（含新增 3 个占位页用例），单元测试 110 passed，`check:scope` 通过
- 任务配方见 `.ai/tasks/active/T040-functional-framework.md`

### 统一子页面切换效果与导航一致性（Phase 2 已完成）
- 诊断结果：项目采用 SPA Shell + 独立 HTML 页面混合架构，切换效果不一致的根因是
  - `cockpit.html` 内部路由有 fadeIn 动画；独立页面走完整刷新，无统一过渡
  - 各独立页面的 top nav/sidebar 存在硬编码复制或动态重实现
  - `src/lib/config.js`、`src/lib/shell.js` 共享框架未被实际使用
- Phase 1 已完成：
  - 为 `business-topics.html` 的 `.content-area` 补齐 `fadeIn` 动画
  - 统一 `meetings.html` 顶部导航、面包屑、侧边栏回链格式为 `cockpit.html#<phase/page>`
  - 为 `cockpit.html` 侧边栏外部页面链接增加 `data-external="true"` 钩子
- Phase 2 已完成：
  - 改造 `src/lib/shell.js`：新增 `external` 模式，支持生成真实 HTML 文件链接
  - 补全 `src/lib/config.js`：与 `cockpit.html` 内联配置对齐
  - 新建 `src/lib/shell-injector.js`：独立页面 shell 注入器
  - 迁移 `business-topics.html`、`reviewer.html`、`strategy-map-list.html`、`strategy-map.html` 使用注入器
  - 迁移 `meetings.html` shell：动态 `import()` 引入共享模块，保留内部业务逻辑
  - 改造 `cockpit.html`：主脚本改为 module，import 共享 `shell.js`，移除内联配置与渲染函数
- 后续 Phase 3：逐步 SPA 化，将独立页面提取为 cockpit 内部路由
- 验证：`npm run build` 通过；核心 E2E（navigation/business-topics/reviewer/strategy-map/meeting-detail/clone/pipeline/resolution/calendar-view）全部通过；`npm run test:unit` 115 passed；`python3 -m pytest tests/` 166 passed；`npm run check:scope` 通过
- 任务配方见 `.ai/tasks/active/T060-navigation-unification.md`

### 经分会-决议中心（高优先级 / 功能主体已完成）
- 状态体系已精简为 3 状态：pending（待审批）/ approved（已通过）/ closed（已闭环），旧状态自动迁移
- `src/meetings/utils/resolution-helpers.js` + 31 个单元测试已通过
- `src/meetings.html` 编辑表单、右侧抽屉 `#decisions-drawer` 均使用 3 状态
- 抽屉内联渲染：3 状态筛选、统计摘要、决议卡片、执行进度、状态流转、审批日志、KMS 链接、跳转源会议
- E2E 测试：`tests/e2e/meeting-decision-edit.spec.js` 已更新，`tests/e2e/resolution-center.spec.js` 新增 3 个用例全部通过
- 断点/恢复见 `08-checkpoint.md`，任务配方见 `.ai/tasks/active/T030-resolution-center.md`

## 刚完成

### 5 模块 per-record 单条同步迁移（Claude 会话，2026-06-29）
- 目标：把会议模块已落地的 per-record 单条同步模式推广到业务专题、需求池、OMP、战略地图、人员/组织目录
- 实施：
  - 提取公共库 `src/lib/per-record-sync.js`（`computeEntityDiff` / `mergeEntities` / `enqueuePerRecordSync` / `createPerItemExecutor` / `apiLoadArray`）
  - 后端 `api-worker/worker.js` 新增单条端点：`/api/requirements/:id`、OMP `/api/omp/:entity/:id`、战略地图 3 类单条端点；`DELETE` 改为硬删除
  - 业务专题 `src/pages/business-topics/main.js`：version 4，`saveTopics` 单条同步
  - 需求池 `src/pages/requirement-pool/requirement-store.js`：version 2，CRUD 收口到 `persistRequirements`
  - OMP `src/cockpit.html`：`DATA_VERSION` canvas-v15，`omp_save` 按实体单条同步
  - 战略地图 `src/lib/strategy-map-data.js`：version 5，map/objective/link 单条同步，link 新增 `id` 字段
  - 人员目录 `src/lib/employee-directory.js`：employees version 2，导入/清空 per-record，orgUnits/importMeta 保持批量
- 验证：
  - `npm run build` / `npm run check:scope` 通过
  - `npm run test:unit` → 23 files, 372 passed
  - `python3 -m pytest tests/` → 177 passed, 1 failed（reviewer pre-existing）
  - E2E：business-topics 29 passed、requirement-pool + strategy-map-list 26 passed、employee-directory 7 passed
- 已修复：OMP E2E 全部 21 个用例（串行/并行）均通过。根因并非测试隔离/数据污染，而是本次改动引入的 3 类失效：
  1. `omp-migration-safety.spec.js` 期望版本号仍为 canvas-v14，但 per-record 同步已将 OMP `DATA_VERSION` 升级到 canvas-v15 → 更新断言
  2. `omp-tasks.spec.js` 人员配置台 3 个用例仍按旧 UI 断言人员嵌套在组织架构树内，但同一次提交已把人员拆到独立 `#omp-staffing-person-list` 面板 → 改用右侧人员列表断言
  3. `omp-subtasks.spec.js` 保存子任务后断言前固定等待 500ms，在 per-record 同步路径下偶发不够，导致点击详情时被未关闭的编辑弹窗拦截 → 改为等待弹窗消失后再继续

### 统一子页面切换效果 Phase 2：统一 Shell 渲染（Claude 会话，2026-06-17）
- 目标：消除各独立页面顶部导航/侧边栏的硬编码复制，让 cockpit 与独立页面共享同一套 `shell.js`/`config.js`
- 实施：
  - `src/lib/shell.js`：新增 `external` 模式，生成真实 HTML 文件链接；保留 SPA 模式的 hash 导航回调
  - `src/lib/config.js`：补全 `dashboard/version-audit`、`admin/requirement-pool`、`exe/report-center` 等条目，与 cockpit 对齐
  - `src/lib/shell-injector.js`：新建零依赖注入器，根据文件名反查 `pageId`，处理 `?embed=1` 跳过与移动端菜单绑定
  - `src/business-topics.html`、`src/reviewer.html`、`src/strategy-map-list.html`、`src/strategy-map.html`：移除硬编码 shell，改为注入器渲染
  - `src/meetings.html`：通过动态 `import()` 引入 `shell.js`/`config.js`，替换原内联 shell，保留 4,400+ 行业务逻辑
  - `src/cockpit.html`：主脚本改为 `<script type="module">`，import 共享 `shell.js`，移除内联 `TOP_NAV`/`SIDEBAR_CONFIG`/`EXTERNAL_PAGES`/`renderTopNav`/`renderSidebar`
- 测试适配：更新 `tests/test_integration.py` 与 `tests/test_omp_kpi_tree_v3.py` 中依赖旧内联常量的断言
- 验证：`npm run build` 通过；核心 E2E 全部通过；`npm run test:unit` 115 passed；`python3 -m pytest tests/` 166 passed；`npm run check:scope` 通过

### 统一子页面切换效果 Phase 1（Claude 会话，2026-06-17）
- 诊断：SPA 内部切换有 fadeIn 动画，独立页面完整刷新且无统一过渡；`business-topics.html` 未引入 `shell.css`
- 实施：
  - `src/pages/business-topics/style.css`：为 `.content-area` 增加 `fadeIn` 关键帧动画
  - `src/meetings.html`：顶部导航、面包屑、侧边栏链接统一为 `cockpit.html#<phase/page>` 格式
  - `src/cockpit.html`：侧边栏外部页面链接增加 `data-external="true"` 钩子
- 验证：`npm run build` 通过；`navigation.spec.js` 11 passed；`business-topics.spec.js` 29 passed；单元测试 110 passed；`check:scope` 通过

### DSTE 需求管理中心 PRD 与框架纳入（Claude 会话，2026-06-16）
- 创建独立 PRD：`docs/01-Product产品/需求管理中心-产品设计文档.md`
- 将需求管理中心纳入 `docs/00-功能全景图.md` 与 `.ai/tasks/active/T040-functional-framework.md`：归入公共支撑/系统管理，P1 优先级
- 新增占位页与导航：`src/cockpit.html` 内联 `SIDEBAR_CONFIG` 系统管理分组增加「需求管理中心」；`PAGES` map 增加占位渲染；`src/lib/config.js` 同步 `PAGE_NAMES`
- 新增 E2E 测试：`tests/e2e/navigation.spec.js` 增加 `#admin/requirement-pool` 占位页可访问性用例
- 验证：`npm run build` 通过；`npx playwright test tests/e2e/navigation.spec.js` 11 passed；单元测试 110 passed；`npm run check:scope` 通过

### DSTE 主体功能架构完善（Claude 会话，2026-06-16）
- 用户指出功能全景图遗漏 **预警中心**、**规则引擎中心**、**全面预算管理**
- 更新 `docs/00-功能全景图.md` 与 `.ai/tasks/active/T040-functional-framework.md`：补入三个模块、调整 P0/P1/P2、明确预算跨阶段定位
- 新增导航与占位页：`src/cockpit.html` 内联 `SIDEBAR_CONFIG` 系统管理分组增加规则引擎中心、预警中心；`PAGES` map 增加对应占位渲染；`src/lib/config.js` 同步 `PAGE_NAMES`
- 新增 E2E 测试：`tests/e2e/navigation.spec.js` 增加 `#admin/rule-engine`、`#admin/alert-hub` 占位页可访问性用例
- 验证：`npm run build` 通过；`npx playwright test tests/e2e/navigation.spec.js` 10 passed；单元测试 110 passed；`npm run check:scope` 通过

### 督办中心阶段 1：行动项状态与进度说明（Kimi 会话，2026-06-16）
- `src/meetings.html` 待闭环行动抽屉新增状态切换与 progressNote 行内编辑
- 数据模型扩展：`action.progressNote`、`action.updatedAt`、`action.completedAt`
- 会议详情页行动项展示 progressNote
- XSS 加固：会议卡片摘要与详情页行动项字段增加 `escapeHtml`
- E2E 测试 11 passed；会议相关回归 21 passed；单元测试 110 passed；`npm run build` 通过

### 会议议程顺延 + "事不过三" 警示（当前会话 / 已完成）
- 数据模型：`agenda_item` 新增 `status` / `originalAgendaId` / `postponedCount` / `carriedFromAgendaId` / `carriedFromMeetingId` / `postponedHistory`
- 评分算法：`src/meetings/utils/scoring.js` 按任一 `agenda.status === 'postponed'` 计算 -5 分，兼容旧 `hasPostponedAgenda`
- UI：会议详情页议程显示真实完成/顺延计数、状态徽章、来源提示；顺延 3 次显示 ⚠️ 警示
- 操作：详情页议程增加「顺延 →」按钮，弹出选择器选择系统已有会议，复制议程并标记原议程为 `postponed`；不依赖上下游链
- 编辑器：议程行增加 status 下拉，显示来源与警示
- 迁移：init 时补齐 agenda 新字段；`cloneMeeting` 重置顺延字段；`saveMeeting` 保存新字段
- 测试：`tests/unit/scoring.test.js` 新增 agenda status 扣分用例；`tests/e2e/meeting-agenda-postpone.spec.js` 3 个用例
- 验证：单元测试 115 passed；会议相关 E2E 23 passed；`npm run build` / `npm run check:scope` 通过

## 待对齐/待集成项
- ✅ **会议评分算法 v2.0（三段式模型）已打通**：`src/meetings.html` 改为通过动态 `import()` 引入 `src/meetings/utils/scoring.js`，复用 `calculateAutoScore` / `getScoreColor` / `getScoreLabel`，移除内联重复实现与旧四维度代码；`getReviewScores()` 在调用点注入材料评分数据。

## 已知问题
- `meeting-detail.spec.js` 部分测试偶发失败（元素不可见/点击超时）— 与预览服务器渲染时序有关，非代码回归
- 空占位行动项污染：已修复保存时过滤无内容/无负责人的行动项，并在启动迁移时自动清理；E2E 测试已增加 afterEach 清理
- `indicator-system` / `omp-*` / `kpi-tree*` 等测试因硬编码端口 `localhost:4173` 与当前 `vite preview` 端口不一致导致失败 — 已有问题，与本次修改无关
- 全量 E2E 并行运行时偶发 `page.goto` 超时（`business-topics.spec.js`、`navigation.spec.js`、`reviewer-embed.spec.js`），单独重跑可 pass

## 下一步
1. **继续经分会-督办中心阶段 2** — 逾期催办、独立督办工作台页面、数据看板（详见 T050）
2. **继续经分会-决议中心可选优化** — 真正以 ES Module 引入 `resolution-helpers.js`、确认生产数据迁移、版本号升级（详见 T030）
3. **会议材料审核功能** — 用户提到此前已中断开发，需恢复上下文继续开发
4. **运行全量 Playwright 回归测试确认无新增回归**

## 督办中心数据结构
```javascript
action = {
  id: 'act_xxx',
  content: '行动内容',
  owner: '责任人',
  deadline: '2026-06-30',
  status: 'in_progress',           // pending / in_progress / completed
  progressNote: '进度说明/闭环说明',
  updatedAt: '2026-06-15T10:00:00Z',
  completedAt: '2026-06-15T10:00:00Z',  // 仅 completed 状态有值
  createdAt: '2026-06-01T09:00:00Z'
}
```

## 关联文档
- 督办中心实现文件：`src/meetings.html`（内联状态配置与抽屉函数、抽屉渲染、详情页展示）
- 任务配方：`.ai/tasks/active/T050-supervision-center.md`
- E2E 测试：`tests/e2e/meeting-pending-actions.spec.js`
