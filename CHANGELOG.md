# Changelog

所有 DSTE 战略管理平台的版本变更记录。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [v0.5.2] - 2026-06-22

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
