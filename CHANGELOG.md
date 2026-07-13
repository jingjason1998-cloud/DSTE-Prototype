# Changelog

所有 DSTE 战略管理平台的版本变更记录。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [v0.6.10] - 2026-07-13

### Fixed
- **统一收尾「401 静默丢数据」隐患（全部云端同步模块）**：将共享 `per-record-sync.js` 的 `createPerItemExecutor`、`reviewer.js`（评审评分）、`employee-directory.js`（人员/组织 bulk）中 401（登录过期）时的「静默 return」统一改为抛出 `authExpired` 错误。此前 token 过期会导致 topics/OMP/洞察/议题/评审/人员组织等模块的变更被同步队列误判「完成」后悄悄丢弃（与 v0.6.9 会议模块同类问题）。
- **`SyncQueue` 识别登录过期**：`processQueue` 对 `authExpired` 错误不消耗重试次数、保持 `pending`，一次性提示「登录已过期，请重新登录，数据将自动补传」；重新登录后由 `bindAutoProcess`（可见性/在线）或 `nextRetry` 自动补传，无需手动干预。其余错误维持原有指数退避 + 达上限标记 failed + `retryFailed()` 重试。

> 说明：各模块的「读取」路径（`apiLoadArray` 等）401 仍返回 null（读失败不丢数据），本次只统一「写入」路径。cockpit.html 的 `apiSave` 经确认为无调用的死代码，未改动。

---

## [v0.6.9] - 2026-07-13

### Fixed
- **修复经营分析会在生产环境云端同步被静默禁用的严重 bug**：`src/meetings/data-store.js` 自带的 executor 与 `_apiLoad` 把「生产环境 `apiBase` 为空字符串（同域 `/api/` 代理）」误判为「未配置」，分别在 `if (!apiBase) return` / `if (apiBase)` 处直接跳过，导致会议模块在生产上**从不真正推送/拉取云端**，各设备仅凭 localStorage 各自为政（表现为同一类会议不同设备条数不一致）。改为与其它模块共享的 `per-record-sync.js` 一致：空 `apiBase` 视为相对路径照常 `fetch`。
- **401 不再静默丢弃**：executor 收到 401（登录过期）时改为抛出错误，使变更保留在同步队列重试并在页面可见，而非被队列误判「完成」后悄悄丢弃。
- **会议加载与云端对账**：`loadRemoteMeetings` 记录云端快照，新增「本地未同步」检测——本地存在而云端没有的会议会在页面顶部提示「N 条会议仅保存在本机、未同步到云端」，可一键上传到云端，避免换设备丢失；云端不可达/登录过期有明确提示。
- **同步状态可见化 + 重试**：会议页顶部显示同步队列 pending/failed 状态；`SyncQueue` 新增 `retryFailed()`，失败项可一键重置重试。

---

## [v0.6.8] - 2026-07-13

### Added
- **议题/洞察/评审评分接入 per-record 云端同步**：
  - `api-worker/worker.js` 新增 KV `dste_insights_v1` / `dste_review_scores`；新增 `/api/insights`（bulk+item）与 `/api/review-scores`（map）端点；`handleEntityItem/findItemById/getItem/setItem` 增加 `idField`，议题单条路由按 `issueId` 解析；item 路由正则加入 `insights`。
  - 议题导入（`issue-import.js`）新增 `loadRemoteIssues()` 启动合并，归一化 `id`↔`issueId`，`buildIssueFromRow` 写入 `id = issueId` 并确保 `lastModified`。
  - 评审（`reviewer.js`）新增 `persistReviewScores`/`loadRemoteReviewScores` 并接入 sync-queue；`meeting-editor`/`reviewer-page` 写库统一走 `persistReviewScores`；`meetings.html` 启动调用 `loadRemoteReviewScores()`。
- **OMP 重点工作「月度关键进展」视图**（`src/cockpit.html`）：顶部新增「月度进展」页签；按当前周期年份取 4–12 月网格，末尾含「H1 总结」「年终总结」列；月份筛选、弹窗 CRUD、复用 `progressRecords` store 并联动 `omp_syncTaskProgressFromRecords`（总结记录不覆盖逐月聚合）。新增 E2E `tests/e2e/omp-monthly-progress.spec.js`。
- **战略专题成员从人员目录选择**：`siPickPersonToAddMember` 覆盖层 +「⊕ 选择」按钮，替代手工输入。

### Changed
- **战略专题移除 `dimension`/`progress` 字段**：`siMigrateRemoveDeprecatedFields` 迁移老数据；从 14 个种子专题及筛选/列/排序/搜索/统计/详情/编辑/创建/甘特全链路清除；筛选由多选改单选，列表由 1 列改 2 列。
- **OMP `cycles` 纳入 per-record 同步**；`insights` 接入 `siPersistInsights`/`siLoadRemoteInsights`（6 处 `siSaveInsights`→`siPersistInsights`）；删除已无调用的 `apiSaveOmp`。
- **战略专题管理表格 UI 优化**：操作列由文字改为图标按钮（eye/edit/delete），表格更紧凑（padding/行高/字重/垂直居中），年份卡片内容区限高滚动 + 表头 sticky。
- **SonarQube 版本号**：`sonar-project.properties` 的 `sonar.projectVersion` 从 `0.6.7` 更新为 `0.6.8`。

### Fixed
- 修复会议 AI 助手消息整段转义导致内联 `icon('...')` SVG 被显示为文本的问题：`renderMessage` 改为按角色渲染（用户消息仍转义防注入，助手消息按可信 HTML 渲染），`buildResponse` 动态片段逐一 escape 后再拼接。
- 修复议题导入调用未定义的 `window.apiSave`：改用 `enqueuePerRecordSync('issues', …)`。
- 修复人员选择器重开弹窗未绑定新 input：当缓存 api ≠ `input._personInputApi` 时重新增强。

### Docs
- 拆分战略洞察与专题设计文档：删除 `战略洞察与专题-完整设计方案.md`，拆为 `战略洞察-完整设计方案.md` 与 `战略专题管理-完整设计方案.md`，并更新相关引用与 `[[...]]` 链接。

---

## [v0.6.7] - 2026-07-09

### Added
- **OMP 重点工作云端同步**：重点工作管理（`exe/tasks`）从仅本地存储升级为 per-record 云端同步。
  - 前端 `src/cockpit.html` 中 `omp_save('tasks', ...)` 改为通过 `enqueuePerRecordSync` 发送 `PUT /api/omp/tasks/{id}`（新增/更新）与 `DELETE /api/omp/tasks/{id}`（删除）。
  - `ompSyncFromApi()` 在检测到当前用户云端重点工作为空、但本地有数据时，自动将本地任务推送到云端。
  - `omp_initData()` 升级 `DATA_VERSION` 到 `canvas-v18`，为老任务补齐 `version` 字段，支撑冲突判断。
  - 新增/更新 E2E 测试：`tests/e2e/omp-tasks.spec.js` 增加「重点工作变更触发 per-record 云端同步」用例；`tests/e2e/omp-migration-safety.spec.js` 增加 version 字段回填断言。

### Changed
- **OMP 数据共享存储**：`api-worker/worker.js` 中 `/api/omp/{entity}`、`/api/omp/{entity}/{id}`、`/api/omp/tasks/{id}/members`、`/api/omp/tasks/reorder` 统一使用共享 KV key，确保所有登录用户看到同一份 OMP 数据。
- **SonarQube 版本号**：`sonar-project.properties` 的 `sonar.projectVersion` 从 `0.6.6` 更新为 `0.6.7`。

---

## [v0.6.6] - 2026-07-08

### Added
- **设计系统 Phase 1**：引入 Phosphor 图标体系替换 emoji 图标，新增 `assets/css/tokens.css`、`assets/css/components.css`、`assets/js/icons.js`、`assets/js/icon-mapping.js`、`assets/js/phosphor-icons.js`、图标构建脚本 `scripts/build-icon-sprite.js` / `scripts/gen-icon-map.mjs`，以及 `docs/07-DesignSystem/` 设计系统文档；`package.json` 新增 `@phosphor-icons/core` 依赖与 `build:icons` 脚本。
- **战略洞察与战略专题管理拆分**：将原「战略洞察与专题」页拆分为「战略洞察」(`sp/insights`) 与「战略专题管理」(`sp/strategy-topics`) 两个独立页面，更新 `src/lib/config.js` 路由配置与驾驶舱渲染逻辑，新增 `tests/e2e/strategy-topics.spec.js` 覆盖新页面。
- **OMP 子任务回归测试**：新增 `tests/e2e/omp-subtasks.spec.js` 覆盖编辑子任务、添加多个子任务、非子任务标签页保存等场景。

### Changed
- **统一图标语义键**：`src/lib/config.js` 中顶部导航、侧边栏、快捷入口的图标从 emoji 改为设计系统图标键（如 `dashboard`、`sp`、`bp`、`chart-line-up` 等），驾驶舱与各独立页面同步适配。
- **Shell 与导航一致性**：`src/lib/shell.js`、`src/lib/shell-injector.js`、`src/styles/shell.css` 适配设计系统 token 与图标；独立页面顶部导航、侧边栏、外部页面链接统一渲染。
- **OMP 重点工作交互**：子任务编辑/保存体验与样式随设计系统迁移同步调整；非「子任务」标签页保存时严格保留已有子任务。
- **SonarQube 版本号**：`sonar-project.properties` 的 `sonar.projectVersion` 从 `0.3.2` 更新为 `0.6.6`。

### Fixed
- 修复 OMP 重点工作编辑子任务时，添加第二个子任务会导致对已有子任务的修改丢失的问题：保存父任务时用收集到的最新子任务对象替换任务数组中的旧对象，避免旧对象覆盖编辑。
- 修复 OMP 父任务在「基本信息」等标签页保存时误删所有子任务的严重 bug：子任务增删改逻辑只在「子任务」标签页保存时执行，其他标签页保存时保留已有子任务。
- 修复生产环境 CAS 登录循环：在服务器 `/opt/meeting-reviewer/src/proxy_server.py` 增加 DSTE 认证 shim（`/api/auth/cas/login`、`/api/auth/me`、`/api/auth/logout`），处理 CAS ticket 校验与 token 签发；前端生产环境 API_BASE 统一恢复为同域 `/api/` 代理，绕开部分电脑无法访问 `workers.dev` 的问题。
- 修复 `src/meetings.html` 生产环境 API_BASE 仍指向 `workers.dev` 的问题，与 `index.html`、`cockpit.html` 等其他页面对齐，统一走同域 `/api/`。
- 修复 `scripts/update-nginx-api-proxy.sh` 在 CI 中把 `/api/` 指向 `workers.dev` 的问题，改为指向服务器本地 DSTE shim (`http://127.0.0.1:8766/api/`)，避免覆盖生产认证代理。

---

## [v0.6.5] - 2026-07-01

### Added
- **片联议题跟踪表入口**：新增 `src/st-issue-tracking.html`（片联 ST 议题跟踪表）与 `src/at-issue-tracking.html`（片联 AT 议题跟踪表）占位页面，侧边栏与驾驶舱路由同步增加入口。
- **战略洞察与专题历史数据**：驾驶舱「战略洞察与专题」页追加 2025-2027 SP 历史专题 mock 数据（大客户拓展、ARR 三年规划、财务域/数字人才/烟草/汽车制造行业规划、上海/华南战区 SP 等），本地已有数据时自动合并缺失项。
- **知识沉淀区**：重写「知识沉淀」面板，按年份分组展示已闭环专题，展示累计闭环数、有总结报告数、覆盖年份等统计卡片。
- **OMP 重点工作扩展字段**：任务表单新增 `annualTarget`（年度目标）、`spLink`（SP 链接）、`biDashboard`（BI 看板）字段。
- **E2E 测试**：新增 `tests/e2e/cockpit-insights-topics.spec.js`，覆盖战略洞察与专题页基本结构。

### Changed
- 战略洞察与专题年份筛选支持「全部年份」，切换后同时影响列表统计与分组展示。
- `public/roadmap-data.json` 与 `src/data/roadmap-data.json` 更新开发路线图数据。
- AI 助手迭代：`src/lib/ai-client.js`、`src/meetings/components/MeetingAiAssistant.js`、`api-worker/worker.js` 同步更新。
- 设计文档 `docs/01-Product产品/战略洞察与专题-完整设计方案.md` 拆分为 `战略洞察-完整设计方案.md` 与 `战略专题管理-完整设计方案.md`。

### Fixed
- 清理 OMP 历史上因后端无 per-record 接口而失败的 `omp/tasks` 同步队列残留项，避免页面加载时继续弹出「已达最大重试次数」红条。
- 明确 OMP `tasks` 继续走批量同步，其他 OMP 实体走 per-record 单条同步。

## [v0.6.4] - 2026-06-30

### Fixed
- 进一步加强年度计划与 OMP 数据的隔离：
  - 提升 OMP `DATA_VERSION` 到 `canvas-v16`，触发老任务/老 KPI 的 `source` 字段迁移。
  - 将 OMP 列表、甘特图、人员配置矩阵、KPI 管理、总览看板等视图的过滤条件从 `source !== 'annual_plan'` 改为 `source === 'omp'`，即使源头数据未标记也不会混入 OMP。
  - 年度计划向 OMP 派生 KPI 时，同步标记源头 KPI 的 `source: 'annual_plan'`。

## [v0.6.3] - 2026-06-30

### Fixed
- 修复「重点工作管理」列表出现重复行的问题：老任务缺少 `source` 字段，导致年度计划源头任务与 OMP 派生任务同时显示。
- 修复删除 OMP 派生重点工作后又被自动同步重新创建的问题：删除时同步删除年度计划源头任务。
- 年度计划向 OMP 派生任务时，自动将源头任务标记为 `source: 'annual_plan'`。

## [v0.6.2] - 2026-06-30

### Fixed
- 修复生产环境「重点工作管理」页面打不开的问题：老任务数据可能缺少 `relatedKpiIds` 或 `members` 字段，导致 `renderTasks` 抛异常、页面空白。
- 修复重点工作列表出现重复行的问题：为老任务迁移 `source` 字段，年度计划源头任务标记为 `annual_plan`，OMP 派生任务标记为 `omp`。
- 修复删除 OMP 派生重点工作后又被年度计划同步重新创建的问题：删除 OMP 派生任务时同步删除其年度计划源头任务。
- 增加 `omp_load('tasks')` 返回值兜底为数组，避免 API 同步异常时后续数组操作报错。

## [v0.6.1] - 2026-06-30

### Added
- **AI 助手接入真实 Kimi 模型**：`src/lib/ai-client.js` 统一封装聊天、流式输出、工具调用、会话管理与降级策略；`src/meetings/components/MeetingAiAssistant.js` 侧滑面板接入真实 Kimi `k2.6` 模型，支持自然语言对话、快捷提问、工具调用可视化。
- **AI 工具调用（最小 Agent 闭环）**：会议 AI 助手支持「总结议程/生成纪要/列出未闭环行动项/查看决议」等工具调用，自动解析并执行后返回结果。
- **AI 创建行动项草案**：AI 助手可根据会议内容生成行动项草案，支持人在回路确认后保存。
- **AI 议程推荐增强**：`src/meetings/utils/agenda-recommender.js` 接入统一 `AIClient`，后端迁移至 Kimi `k2.6`，支持指数退避重试与 JSON 格式强制输出。
- **Knip 死代码检测**：新增 `knip.json` 配置，集成 `npm run check:deadcode` 与 `npm run check:deadcode:ci`（`--max-issues 0` 门禁）。

### Changed
- **RFC-008 更新**：AI 战略伙伴架构更新为 1+N+统一工具层设计文档。
- **AI 助手跟随会议切换**：侧滑面板内容随左侧会议列表切换自动更新上下文。

### Removed
- 删除未使用模块：`src/components/person-selector.js`、`src/lib/kms-vectorizer.js`、`src/meetings/components/CalendarView.js`。
- 删除一次性恢复页面：`public/restore-meetings.html`。
- 删除重复 `src/assets` 符号链接。
- 删除孤儿模板文件：`src/pages/_template/external-page.js`、`src/pages/_template/index.js`。
- 删除 reviewer 备份文件：`src/pages/reviewer/main.js.bak`。

### Fixed
- 详情页采纳 AI 议程后自动打开编辑器。
- API Worker 强制议程推荐输出 JSON 格式，避免解析失败。
- API Worker Kimi 请求增加指数退避重试，提升稳定性。

## [v0.6.0] - 2026-06-29

### Added
- **需求管理中心（Requirement Pool）**：全新独立页面 `src/requirement-pool.html`，支持 DSTE 产品需求的收集、分析、规划与状态跟踪。包含总览看板、状态管道（已收集 → 分析中 → 已规划 → 开发中 → 待发布 → 已验证/已关闭）、筛选栏、需求列表表格与分页。数据层使用 localStorage + Repository 本地存储，后端 API 接口预留。（`src/pages/requirement-pool/`, `src/requirement-pool.html`, RFC-007）
- **AI 统一底座**：新增 `src/lib/ai-client.js`（统一 AI 客户端，封装聊天、流式输出、工具调用、会话管理与降级策略）、`src/lib/ai-context.js`（业务上下文构造器，自动聚合会议/OMP/专题/KPI/年度计划/人员目录等数据）、`src/lib/kms-vectorizer.js`（KMS 知识库前端接入，支持搜索与片段注入）。所有前端 AI 调用统一走 Kimi `k2.6` 模型，替代原有分散的 fetch 调用。
- **会议 AI 助手侧滑面板**：`src/meetings/components/MeetingAiAssistant.js`，参考 Chrome Gemini side panel 交互，支持在会议详情页右侧打开 AI 对话，提供「总结议程/生成纪要/列出未闭环行动项/查看决议」等快捷提问，当前前端模拟回复，预留真实 AI 接口。
- **会议编辑器独立模块**：`src/meetings/renderers/meeting-editor.js`，将原内嵌在 `meetings.html` 中的会议编辑逻辑抽离为独立模块，支持智能填充（根据会议名称自动匹配历史模板/关键词规则/日期推断）、材料审核状态缓存、议程时长自动计算。
- **会议通知系统**：`src/meetings/renderers/notification-system.js`，支持企业微信群 Webhook 多目标配置、决议/待办/预警/议程推送、@所有人开关、发送历史记录。
- **人员输入增强组件**：`src/components/person-input.js`，为现有 `<input>` 添加人员搜索与选择能力，支持姓名/英文名/工号模糊搜索，不破坏原表单结构，支持自由文本回退。
- **驾驶舱 AI 战略助手**：`cockpit.html#ai` 页面重写为全局 AI 助手入口，支持自然语言问答、快捷操作（生成本月经营分析报告/查看逾期行动项/拆解年度目标等）、工具调用可视化、会话管理。
- **KMS 知识库接入**：帆软 KMS（Confluence）作为企业知识库，支持文档索引、向量检索、引用溯源，AI 回答可标注来源页面标题与链接。（RFC-008）
- **人员与组织目录增强**：`employee-directory.html` 新增组织树浏览（一级组织 → 一级团队 → 二级团队 → 三级团队），支持展开/收起、人员挂载显示、组织选中高亮；移除独立搜索面板，搜索能力由 `person-input` 组件统一提供。
- **OMP 人员配置视图**：`cockpit.html` 重点工作管理新增「人员配置」视图（`staffing`），支持按组织架构浏览人员、拖拽分配任务、人员卡片渲染。
- **E2E 测试**：`tests/e2e/ai-assistant.spec.js`（AI 战略助手交互与聊天流程）、`tests/e2e/requirement-pool.spec.js`（需求管理中心页面结构、状态管道筛选、新建需求弹窗）。
- **单元测试**：`tests/unit/ai-client.test.js`（AI 客户端网关地址解析、会话创建、消息发送、流式解析）、`tests/unit/meeting-editor.test.js`（会议编辑器标题关键词提取、日期推断、智能填充）、`tests/unit/notification-system.test.js`（通知配置加载、Webhook 多目标迁移、发送逻辑）。

### Changed
- **AI 议程推荐接入统一客户端**：`src/meetings/utils/agenda-recommender.js` 从直接 `fetch` 改为通过 `AIClient` 调用，后端从 Claude（Cloudflare Worker）迁移至 Kimi `k2.6`，统一走 `/api/ai/agenda`。（RFC-008）
- **会议数据存储升级**：`src/meetings/data-store.js` 存储版本从 v4 升级到 v5，新增议程材料审核状态字段（`reviewReportUrl`, `reviewScore`, `reviewStatus`, `lastReviewedAt`）的迁移与初始化。
- **会议详情页增强**：`src/meetings/renderers/meeting-detail.js` 新增材料审核状态摘要（已审核/审核中/失败/均分），议程项新增审核状态徽标，议程时长计算抽离为公共工具 `computeAgendaTimeSlots`。
- **AI 议程推荐面板**：`src/meetings/components/AiAgendaDrawer.js` 支持从会议详情页打开时基于当前查看会议生成推荐，与 `MeetingAiAssistant` 共享会议上下文。
- **人员目录数据层**：`src/lib/employee-directory.js` 新增云端同步基础设施（`syncQueue` + API 执行器），支持员工/组织/导入元数据的后端同步；重构组织层级构建逻辑，以「一级组织 → 一级团队 → 二级团队 → 三级团队」为层级，支持多级结构；`normalizePerson` 升级为 `normalizePersonField`，统一处理人员字段标准化。
- **人员导入**：`src/lib/employee-import.js` 导入后自动触发 `rebuildPersonRefs`，重建人员引用关系。
- **导航与构建配置**：`src/lib/config.js` 侧边栏「战略执行」分组更名为「经营分析会」，新增 `admin/requirement-pool` 外部页面映射；`vite.config.js` 构建入口新增 `requirement-pool`。
- **驾驶舱页面**：`cockpit.html` 大量重构：年度经营计划 KPI 编辑归属改为 `person-input` 组件选择；Roadmap 时间线响应式优化；新增 AI 助手页面脚本与样式；OMP 任务视图支持人员配置。
- **会议页面**：`meetings.html` 引入 `MeetingAiAssistant.js`、`meeting-editor.js`、`notification-system.js` 模块，新增 AI 助手侧滑面板 DOM 结构与样式，移除内嵌编辑逻辑（改为引用独立模块）。
- **员工目录页**：`src/pages/admin/employee-directory.js` 移除搜索面板，聚焦组织树浏览；新增组织节点展开/收起/选中交互。
- **业务专题页**：`src/pages/business-topics/main.js` 与 `src/business-topics.html` 适配人员输入组件。
- **策略地图数据**：`src/lib/strategy-map-data.js` 适配人员字段标准化。
- **测试覆盖**：大量 E2E 与单元测试更新以适配新组件与数据格式（`ai-agenda-recommend`, `annual-plan`, `business-topics`, `calendar-view`, `employee-directory`, `indicator-system`, `meeting-decision-edit`, `meeting-detail`, `meeting-person-selector`, `meetings-corruption`, `navigation`, `omp-migration-safety`, `omp-tasks`, `resolution-center`, `roadmap`, `strategy-map`, `test_integration.py`, `agenda-recommender.test.js`, `employee-directory.test.js`, `employee-import.test.js`, `meetings-data-store.test.js`）。

### Fixed
- 人员选择器输入框在会议编辑/决议/行动项/议程负责人字段中统一替换为 `person-input` 组件，解决自由文本与标准化人员对象混用导致的显示与搜索不一致问题。
- 组织路径解析从 `ldap` 链分段回退改为优先使用「一级组织/一级团队/二级团队/三级团队」字段拼接，解决旧数据组织层级显示错误问题。
- 会议数据迁移 v4→v5 确保 `normalizePersonField` 正确应用于 `host`, `recorder`, `actions[].owner`, `decisions[].owner/decider`, `agenda_items[].owner`。
- Webhook 配置从单 URL 字符串迁移为数组结构，兼容旧配置自动升级。

---

## [v0.5.5] - 2026-06-24

### Added
- **人员与组织目录第二阶段**：
  - 新增人员/组织选择器组件：`src/components/person-selector.js`、`src/components/org-selector.js`
  - 新增人员输入增强组件：`src/components/person-input.js`，支持异步搜索、键盘导航、自由文本回退
  - 会议编辑器全面接入人员目录：主持人、记录人、议程负责人、行动项负责人、决议责任人/审批人均支持从目录选择
  - 新增 E2E 测试：`tests/e2e/meeting-person-selector.spec.js`

### Changed
- `src/lib/employee-import.js` 改为通过 npm 引入 `xlsx`，移除对 CDN 的依赖，提升构建与测试稳定性
- `vite.config.js` 增加 `employee-directory` 构建入口，确保管理页在 preview 环境可访问

---

## [v0.5.4] - 2026-06-23

### Added
- **统一存储架构基础层**：
  - `src/lib/repository.js` Repository 抽象层，支持版本化、schema 校验、迁移、备份、恢复、健康检查
  - `src/lib/migration-utils.js` 统一备份键管理与版本链迁移
  - `src/lib/backup-manager.js` 全量导出/导入、下载/上传、自动排除敏感键
  - `src/lib/sync-queue.js` 离线同步队列，支持指数退避重试与网络恢复自动处理
  - `src/lib/conflict-resolver.js` 基于 `lastModified` 的冲突检测与解决 UI
- 会议数据 Store 接入 Repository：`src/meetings/data-store.js` 统一数据初始化、持久化、API 同步
- OMP 数据接入 Repository：`src/cockpit.html` OMP 实体存储统一版本管理
- `Storage` 工具增强：配额检测 `checkQuota()`、数据大小估算 `estimateSize()`、配额不足时用户提示
- 存储韧性测试：
  - 单元测试 52 个（repository / backup-manager / sync-queue / conflict-resolver / migration-utils / storage）
  - E2E 测试 4 个（meetings-corruption / omp-migration-safety）

### Changed
- `.ai/tasks/active/T070-storage-optimization.md` 新增存储架构优化任务配方

---

## [v0.5.3] - 2026-06-22

### Added
- **年度经营计划**：多周期支持、考核层级筛选、种子数据工厂与 E2E/单元测试覆盖
- **组织绩效管理 (OMP)**：重点工作管理、OMP 任务 E2E
- **经营分析会组件化拆分**：
  - `src/meetings/agenda-postpone.js` 议程顺延与「事不过三」警示
  - `src/meetings/data-store.js` 统一数据存储层
  - `src/meetings/renderers/` 渲染器模块（eval-form / meeting-detail / meeting-prep / pending-actions / report-asset-manager）
- **决议中心（Resolution Center）**：
  - 会议决议三态状态机（pending / approved / closed）
  - 旧版状态自动迁移
  - 聚合抽屉 UI、筛选、统计、审批日志、KMS 链接
  - 31 个单元测试与 E2E 测试
- **督办中心 Phase 1**：
  - 行动项 pending / in_progress / completed 状态切换
  - progressNote 行内编辑与会议详情页只读展示
  - E2E 测试
- **统一子页面切换效果与导航一致性 Phase 1+2**：
  - 共享 `shell.js` / `config.js` 架构
  - `shell-injector.js` 零依赖注入器
  - `cockpit.html` 改为 ES Module 引入共享 shell
  - 独立页面统一使用注入器，消除硬编码导航
- **会议议程顺延 + "事不过三" 警示**
- **会议评分算法 v2.0**：会前 / 会中 / 会后三阶段模型
- **DSTE 完整功能框架搭建**：功能全景图与规则引擎 / 预警中心 / 需求管理中心占位导航
- **测试覆盖增强**：
  - `tests/e2e/annual-plan-multi-year.spec.js`
  - `tests/e2e/meetings-smoke.spec.js`
  - `tests/e2e/omp-tasks.spec.js`
  - `tests/unit/meetings-data-store.test.js`

### Changed
- `vite.config.js` 增加 `allowedHosts: ['dste.jasonxspace.cc']` 以支持 Cloudflare Tunnel 本地开发
- `src/business-topics.html`、`src/meetings.html`、`src/meetings/data-store.js`、`src/pages/business-topics/main.js` 将 `dste.jasonxspace.cc` 加入 `isLocalDev` 白名单，避免通过隧道访问时触发 CAS 登录循环
- `src/meetings.html` 通过动态 `import()` 引入 `resolution-helpers.js` 与 `scoring.js`
- 多处独立页面顶部导航 / 侧边栏由 `shell-injector.js` 统一渲染

### Fixed
- **OMP API token key 统一**：`src/cockpit.html` 中所有 OMP API 调用统一使用 `dste-token` 作为 Authorization header，修复生产环境重点工作保存失败
- 空占位行动项污染：保存时过滤无内容 / 无负责人行动项，启动迁移时自动清理
- 会议卡片摘要与详情页行动项字段增加 `escapeHtml` XSS 加固

### Removed
- `.gitignore` 排除临时 PPT 生成物（`*.pptx`、`generate_ppt.py`）

---

## [v0.5.1] - 2026-06-16

### Added
- **版本审计看板**：在驾驶舱系统管理中新增 `#dashboard/version-audit` 入口
  - 生产环境状态卡片与三环境（本地/Git/生产）版本对比表格
  - 部署检查清单（构建/tag/生产/测试）
  - 刷新与复制报告按钮
  - 配套数据生成脚本 `scripts/generate-version-audit.cjs` 与 E2E 测试
- **RoadMap 周视图看板**：按 ISO 自然周展示版本节点、开发计划与 upcoming 里程碑

### Changed
- **决议中心架构收尾**：`src/meetings.html` 改为通过 `<script type="module">` 引入 `src/meetings/utils/resolution-helpers.js`，删除内联副本，消除双源维护
- 升级构建工具链：`vite` 5.4.21 → 6.4.3，`esbuild` 0.25.x → 0.28.1，`js-yaml` 4.1.1 → 4.2.0

### Security
- 修复 `npm audit` 报告的 2 high + 1 moderate 漏洞（Vite/esbuild/JS-YAML）

### Removed
- 删除误放到项目根目录的 `proxy_server.py`

---

## [v0.4.9] - 2026-06-10

### Added
- **经营分析会会议效果评估**：
  - 会议评估弹窗（`openMeetingEvalModal`），支持人工评估与重新评估
  - 自动评分算法（`calculateAutoScore`）：基于流程完成度、材料准备、讨论充分性、决策质量、行动项执行等 5 个维度
  - 评分可视化（overallScore + 维度雷达图 + 等级标签）
- **OMP 重点工作管理（驾驶舱）**：
  - 周期选择器（`renderCycleSelector` / `getCurrentCycle`），支持年度/半年度/季度切换
  - 重点工作 CRUD（新增/编辑/保存/删除）
  - BEM 战略解码维度切换（财务/客户/流程/学习成长）
  - OMP API 对接（`apiLoadOmp` / `apiSaveOmp` / `ompSyncFromApi`）
- **经营分析会组件化拆分**（`src/meetings/`）：
  - `CalendarView.js` — 日历视图组件
  - `DecisionsDrawer.js` — 决策抽屉组件
  - `helpers.js` / `notifications.js` / `scoring.js` — 工具函数
- **单元测试框架搭建**：
  - Vitest 配置（`vitest.config.js`）
  - 3 个单元测试：`helpers.test.js` / `notifications.test.js` / `scoring.test.js`
- **代码规范工具链**：
  - ESLint 配置（`eslint.config.js`）：安全规则 + 最佳实践 + 复杂度控制
  - Prettier 配置（`.prettierrc` / `.prettierignore`）
- **Reviewer 材料审核增强**：审核标准可视化、场景切换优化
- **AI 语义关联优化**：`diagnose-ai-match.js` 诊断工具
- **PR 模板**：`.github/pull_request_template.md`

### Changed
- 经营分析会审核标准文档归档至 `docs/.archive/`
- `api-worker` 新增 OMP 数据接口
- `package.json` 新增 devDependencies：`@eslint/js`、`eslint-config-prettier`、`globals`、`prettier`、`vitest`

## [v0.4.10] - 2026-06-10

### Fixed
- **经营分析会保存失败**：`saveMeeting`/`deleteMeeting` 函数在全局作用域定义，但引用了 `renderMeetings` 内部的局部变量 `meetings`，导致 `ReferenceError: meetings is not defined`
  - 修复：在 `saveMeeting` 和 `deleteMeeting` 函数开头添加 `const meetings = window._meetingsData`

## [v0.4.11] - 2026-06-15

### Added
- **战略地图模块**：
  - 战略地图列表页（`src/strategy-map-list.html` + `src/lib/strategy-map-list.js`）：支持地图卡片展示、搜索/筛选/新建/编辑/删除
  - 战略地图可视化详情页（`src/strategy-map.html` + `src/lib/strategy-map-data.js` / `strategy-map-render.js` / `strategy-map-ui.js`）：BSC 四维度战略目标、因果链高亮、CRUD、导出 JSON
  - 顶部导航与侧边栏接入 `sp/strategy-map` 路由
- **会前准备度**：
  - 会议卡片与详情页展示准备度百分比
  - 会前准备弹窗（`#meeting-preparation-overlay`）展示检查清单
  - `computeMeetingReadiness` 计算会前报告、议题报表、材料诊断等维度
- **统一本地存储封装 `DSTE.Storage`**（`assets/js/main.js` + `src/lib/utils.js`）：
  - 提供 `get` / `set` / `remove` / `getString` / `setString` / `getKeys`
  - 支持 JSON 自动序列化与容错兜底
- **会议材料评审 API 封装**（`src/meetings/utils/reviewer.js`）：
  - `reviewMaterial` / `createBatchReview` / `getBatchReviewProgress` / `getBatchReviewResults`
  - 与 reviewer 后端代理统一交互，自动同步 `dste_review_scores`
- **经营分析会通用辅助函数**（`src/meetings/utils/helpers.js`）：
  - `getMaterialScore` / `getReportAssets` / `saveReportAssets` / `computeMeetingReadiness`
- **测试补充**：
  - E2E：`strategy-map.spec.js` / `strategy-map-list.spec.js` / `meeting-preparation.spec.js`
  - 单元测试：`tests/unit/reviewer.test.js` / `tests/unit/meeting-readiness.test.js`

### Changed
- 全站 `localStorage` 直接调用迁移到 `DSTE.Storage`，统一错误处理与兜底值
- `src/lib/shell.js` 的 `renderTopNav` / `renderSidebar` 从 `innerHTML` 改为 DOM 创建，提升安全性
- 多处 `alert()` 替换为 `showToast()` 提示（登录页、经营分析会等）
- `cockpit.html` OMP 数据版本清理后不再强制刷新页面，避免 E2E/首次加载不稳定

### Fixed
- **会议保存后详情浮层不显示**：`saveMeeting` 写入 `window._meetingsData`，但 `openMeetingDetail` 仍使用 `renderMeetings` 内的旧副本 `meetings`，导致新建/复制会议后找不到会议对象
- **详情页编辑按钮失效**：详情页「编辑」按钮调用不存在的 `openEditMeeting`，改为 `openMeetingEditor`
- **`src/lib/utils.js` SSR 兼容性**：`showToast` 中 `!document` 在 Node 环境会抛 `ReferenceError`，改为 `typeof document === 'undefined'`
- **`scripts/health-check.cjs` 误报**：ESLint 配置检查只识别 `.eslintrc.js`，已兼容 `eslint.config.js`
- **E2E 测试稳定性**：`test-sp-nav-verify.spec.js` 期望更新；`strategy-map-list.spec.js` 增加测试隔离，避免状态串扰

## [v0.5.0] - 2026-06-16

### Added
- **决议中心（Resolution Center）**：
  - 会议决议全生命周期管理：状态流转、审批跟踪、执行进度、逾期提醒
  - 三态模型（`pending` → `approved` → `closed`），自动迁移旧版 9 态数据
  - 聚合视图抽屉（`#decisions-drawer`）支持跨会议筛选与统计
  - 工具模块 `src/meetings/utils/resolution-helpers.js` + 31 个单元测试
  - E2E 覆盖：`tests/e2e/resolution-center.spec.js`
- **战略地图 Strategy Map 增强**：
  - 战略目标父子下钻：主目标展开显示子目标，带动画过渡
  - 因果链编辑：新增/编辑/删除目标间因果链接，含环路检测 `hasCycle()`
  - 宣贯 PPT 附件：支持 URL 或 base64 文件上传
  - 视图/编辑模式切换
  - 列表页主题化：使用 CSS 变量统一主题
  - E2E 与单元测试补充：`strategy-map.spec.js` / `strategy-map-list.spec.js` / `strategy-map-data.test.js`
- **开发路线图 Roadmap 重构**：
  - `renderDevTimeline()` 从 `roadmap-data.json` 动态加载数据，不再硬编码
  - 新增执行摘要 KPI 卡片、版本对比、发布跟踪
  - 支持横向/纵向时间轴布局
- **经营分析会改进**：决策编辑、待闭环行动抽屉、会前准备度整合

### Changed
- `api-worker/worker.js` 新增决议中心、战略地图相关接口
- `src/lib/config.js` 侧边栏与页面名称配置更新
- `public/roadmap-data.json` / `src/data/roadmap-data.json` 更新至 v0.4.11 状态

### Deferred to v0.5.1
- **版本审计看板**：`dashboard/version-audit` 侧边栏入口已移除；前端页面尚未实现，相关测试与脚本（`tests/e2e/version-audit.spec.js`、`scripts/generate-version-audit.cjs`）本次不发布

## [Unreleased]

### 计划中
- KPI 详情下钻
- 用户权限系统（替换当前模拟登录）
- ST/AT 议题 Excel 模板下载

---

## [v0.4.8] - 2026-06-09

### Added
- **战略指标库（KPI 指标体系）**：
  - 10+ 核心指标定义（销售额-D、回款额-K、营销线贡献利润率、ARR、JDY/FDL 销售额、有效商机数等）
  - KPI 层级结构（parentId/level），支持从公司级下钻到大区/产品线
  - BSC 四维度分类（财务/客户/流程/学习成长）
  - 目标值/挑战值/实际值/达成率/权重/负责人完整数据模型
  - 历史趋势数据（支持折线图展示）
  - Canvas 绘制支持（思维导图式 KPI 树）
- **OMP 组织绩效管理增强**：
  - OMP 模态框交互（详情/编辑/趋势分析）
  - KPI 卡片脉动效果（状态驱动动画）
- **Reviewer 模块重构**：
  - 7 个分散文件合并为单一 `main.js`
  - 删除冗余的 api.js/history.js/parser.js/renderer.js/scenes.js/ui.js/utils.js
- **年度经营计划 PRD**：产品设计方案文档

### Changed
- cockpit.html 规模增长至 4500+ 行
- 导航新增「战略指标库」入口
- api-worker 新增指标数据接口

## [v0.4.7] - 2026-06-09

### Added
- **KPI 指标体系**（驾驶舱新增模块）：
  - 指标分类管理（财务/客户/流程/学习成长）
  - 指标 CRUD（新建/编辑/删除/导出）
  - 指标搜索与筛选
- **KPI 指标树 v3/v4**：
  - 卡片式层级视图（数字孪生设计）
  - 思维导图式层级树（Canvas 绘制）
  - 状态驱动的脉动效果、连接线动画
- **业务专题管理增强**：
  - AI 语义关联匹配：新增语义映射表（20+ 组同义词），支持精确匹配 + 语义匹配双维度
  - 关键词提取算法升级：英文/数字词提取 + 中文 2-4 字 n-gram
  - 年度筛选默认填充后自动触发筛选
  - 修复跨模块调用：全局暴露 `linkIssueToTopic` / `unlinkIssueFromTopic`
- **OMP 组织绩效管理仪表板**：
  - 绩效看板、趋势分析
  - KPI 树下钻与关联分析
- **企业微信通知代理**（Cloudflare Worker）：
  - 后端安全代理 Webhook 消息推送
  - 支持决议/TODO/告警三类通知
- **经营分析会增强**：
  - 会议材料评分展示
  - 通知配置管理（Webhooks/启用类型/ mentionAll）

### Changed
- cockpit.html 规模增长至 3800+ 行（承载 KPI/OMP 模块）
- api-worker 新增 `/api/notify/proxy` 接口

## [v0.4.6] - 2026-06-05

### Added
- **经营分析会模块升级**：
  - 会议复制功能（快速创建同类型会议）
  - 新增 5 种会议场景配置：片联季度会议、营销本部月/双周会、战区月度经营分析会、落后战区业绩承诺会、落后垂直客群经分会
  - 议程类型标签化（目标管理、重点工作、预算财经、人力资源、业务专项）
  - 流程步骤细化（报告生成→会前评审→会议召开→纪要起草→纪要定稿→行动追踪）
- **业务专题管理升级**：
  - 年度维度数据迁移（为旧数据自动补 year 字段）
  - 新增 KMS 知识库链接字段
  - 移除预算/实际成本字段（简化模型）
- **驾驶舱增强**：组织绩效管理模块入口

### Changed
- **议题导入格式升级**：兼容帆软 ST/AT 真实 Excel 导出格式（议题主题/片联议题类型/议题分类/提交人姓名）
- 议题编号规则放宽，支持自动编号

## [v0.4.5] - 2026-06-04

### Fixed
- **业务专题模块构建修复**：修复 `ISSUE_STORAGE_KEY` 未导出导致 Vite 构建失败的问题
  - `issue-import.js`: 添加 `export` 并加注释防止 linter 误删
  - `main.js`: 导入 `ISSUE_STORAGE_KEY`

## [v0.4.3] - 2026-06-04

### Changed
- **reviewer.html 代码重构**：
  - 提取 1412 行内联 CSS 到 `src/pages/reviewer/style.css`
  - 提取 2407 行内联 JS 到 `src/pages/reviewer/main.js`
  - reviewer.html 从 4229 行降至 408 行
  - 保持所有功能和 onclick 绑定不变

### Fixed
- **cockpit.html scope 修复**：
  - `renderCalendarMonth` 添加 `window.renderCalendarMonth` 全局暴露，修复 scope check 报错

---

## [v0.4.2] - 2026-06-04

### Fixed
- **业务专题管理 CRUD 修复**：
  - 修复 `issue-import.js` 中 `loadIssues` / `saveIssues` / `loadAllIssues` 未导出导致的运行时错误
  - 修复 `ai-analysis.js` 中 `escapeHtml` 未定义导致的渲染错误
  - 修复议题详情查看、编辑、删除功能不可用的问题

---

## [v0.4.1] - 2026-05-28

### Added
- **帆软 CAS 通行证单点登录**：
  - 登录页 (`index.html`)：生产环境强制跳转帆软 CAS (`passport.fanruan.com`)，本地开发保留快速入口
  - 登录回调处理：自动提取 CAS ticket，换取应用 token 并存储
  - 用户状态持久化：token 存储于 localStorage，支持页面刷新后保持登录
  - 用户下拉菜单：顶部导航头像点击展开，显示用户名与「退出登录」
  - 登出功能：清除 token 并调用后端登出 API
  - 嵌入模式免登录：`business-topics.html` 在 `?embed=1` iframe 模式下不强制跳转 CAS
- **API 鉴权准备**：所有 API 请求（`cockpit.html` / `business-topics.html` / `main.js`）统一携带 `Authorization: Bearer token`，401 时自动跳转 CAS

### Security
- 生产环境禁用本地模拟登录，必须通过帆软 CAS 认证

---

## [v0.4.0] - 2026-05-27

### Added
- **战略洞察与专题整合页面** (`sp/insights-topics`)：
  - 战略洞察数据看板：市场趋势、竞争格局、内部能力评估
  - 业务专题管理：专题 CRUD（查看/编辑/软删除）、ST/AT 议题关联
  - AI 智能匹配：议题自动分类、关联推荐、全局分析报告
- **经营分析会模块重构** (`exe/meetings`)：
  - 会议列表卡片增强：议题数、决议数、材料审核状态、议题标签云
  - 决议跟踪面板：编号、内容、负责人、截止日期、可视化进度条
  - 日历视图：月度/季度切换、会议日期高亮、快捷跳转
- **iframe 嵌入模式**（v0.3.5 功能纳入）：`?embed=1` 参数支持，自适应高度

### Changed
- **全局响应式自适应性改造**：
  - Shell 框架级：4 断点体系（1280/1024/768/480px），汉堡菜单 + 遮罩层
  - 页面级响应式：cockpit.html / reviewer.html / business-topics.html 全部适配
  - 导航栏响应式优化：1024px 以下隐藏长标签，标题简化
- **统一页面切换过渡效果**：所有页面共享 shell.css fadeIn 动画，消除切换跳变
- **CSS 抽离**：business-topics 内联样式迁移至独立 style.css

### Fixed
- Road Map 时间线显示顺序修复：v0.3.5 默认可见
- business-topics 事件委托容器修复

### Engineering
- 新增 Playwright E2E 测试（95 个全部通过）
- reviewer.html 引用 shell.css，删除 100+ 行重复 CSS
- Vite 构建配置：自动复制 shell.css 到 dist

---

## [v0.3.5] - 2026-05-26

### Added
- **iframe 嵌入模式**：`?embed=1` 参数支持，隐藏导航栏/侧边栏/面包屑
- **iframe 自适应高度**：`postMessage` 双向通信，ResizeObserver + 防抖，内容变化自动伸缩
- **通用嵌入架构**：`main.css` 统一管理嵌入样式，新增页面只需 copy 3 行检测脚本

### Changed
- 嵌入模式下 `.app` / `.content-area` 去除 `overflow: hidden`，允许内容自然撑开

---

## [v0.3.4] - 2026-05-25

### Fixed
- Road Map 页面补全 v0.3.1 / v0.3.2 版本历史记录（数据完整性修复）
- 版本标识统一为语义化版本 v0.3.4

---

## [v0.3.3] - 2026-05-23

### Added
- **reviewer 6维度述职场景**：vertical-segment-review 从4维度扩展为6维度
  - 新增：SP战略关联度（10分）、态度与反思（5分）
  - 调整权重：完整性35/差距根因20/业绩预测10/下一步计划20
- **SonarCloud 代码质量监控**：GitHub Actions 自动扫描，每次 push/PR 触发

### Fixed
- vertical-segment-review 维度配置与测试用例同步
- 6维度解析函数正则匹配满分值提取

### Security
- GitHub Actions CI 强制门禁（SonarCloud + 测试通过率检查）

---

## [v0.3.2] - 2026-05-22

### Fixed
- **reviewer.html 场景维度卡片缺失**：切换述职类场景时对应评价维度卡片动态渲染
- 通用议题评审保留原有4维度作为默认（目标-解决方案对齐度、决策支撑度、行动具体化、材料规范度）
- 垂直细分客群述职新增4维度：完整性、差距与根因分析、业绩预测达成概率分析、下一步计划

### Added
- 数据迁移工具页面 `migrate-data.html`（本地 → Cloudflare Worker KV 同步）

---

## [v0.3.1] - 2026-05-21

### Added
- **Road Map 交互增强**：
  - 时间线轴节点显示关键功能标签（每个版本2条）
  - 点击节点平滑滚动到对应版本详情卡片
  - 连接线区分已发布（实线绿色）/ 未发布（虚线灰色）
  - 节点悬停高亮反馈

## [v0.3.0] - 2026-05-21

### Added
- **开发路线图 Road Map 页面**：
  - 版本时间线轴：已发布/开发中/里程碑节点可视化
  - 模块开发进度甘特图：9 个模块进度条+状态标签
  - 版本统计卡片：2×2 网格（版本数/功能数/Bug/计划中）
  - 版本详情卡片：变更列表+计划中功能列表
  - 状态筛选功能：全部/已达成/攻坚中/战略必争
- 系统管理侧边栏分组
- 面包屑支持 dashboard 子页面

---

## [v0.2.0] - 2026-05-21

### Added
- **经营分析会页面全面升级**：
  - 顶部筛选栏（季度/状态筛选 + 全局统计）
  - 会议列表卡片增强：议题数、决议数、材料审核状态、议题标签云
  - 新增决议跟踪面板：编号、内容、负责人、截止日期、可视化进度条
  - 统计面板 2x2 网格布局 + 趋势图表占位
- 会议卡片悬停动效（translateX 滑动）

---

## [v0.1.0] - 2026-05-21

### Added
- **驾驶舱首页** (`cockpit.html`)：6 阶段顶部导航 + 左侧边栏 + SPA 路由系统
- **会议材料审核助手** (`reviewer.html`)：智能审核、摘要生成、雷达图、批量审核、历史记录、版本对比
- **业务专题管理** (`business-topics.html`)：CRUD 管理、ST/AT 议题导入（拖拽 Excel/CSV/粘贴）、里程碑跟踪
- **统一主题系统**：Light/Dark 双主题，跨页面 `localStorage` 同步
- **登录页** (`index.html`)：科技感网格背景 + 扫描线动画
- **全局导航统一**：所有页面共用 6 阶段导航 + 侧边栏布局 + 面包屑
- **pytest 回归测试**：30 个测试用例覆盖结构、导航、主题、安全
- **生产部署**：nginx SSL 配置 + assets 路径映射 + 域名重定向

### Fixed
- 修复 Light 模式下 CSS 变量被 `@media` 错误嵌套导致全部失效的 bug
- 修复会议审核 XSS 漏洞（新增 `sanitizeUrl` 协议白名单）
- 修复会议审核空矩阵崩溃（新增 `Array.isArray` 守卫）
- 修复移动端响应式布局错位

### Security
- 会议材料 URL 输入增加协议校验（仅允许 http/https）

---

## 版本号规则速查

| 版本位 | 升级时机 | 例子 |
|--------|---------|------|
| 主版本 | 大改版、架构重构、不兼容旧版 | `v1.x.x → v2.0.0` |
| 次版本 | 新增功能、新增页面、新增模块 | `v1.1.x → v1.2.0` |
| 修订号 | bug 修复、样式微调、文案调整 | `v1.2.0 → v1.2.1` |
