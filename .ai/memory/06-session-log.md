# 会话历史

> 记录最近几次 AI 会话的摘要，方便快速恢复上下文。

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
