# 会话历史

> 记录最近几次 AI 会话的摘要，方便快速恢复上下文。

## 2026-07-24（Claude，发布 v0.7.11 修复纪要 tab 默认展开）
- **主题**：修复会议卡片「纪要」tab 页面加载时默认展开
- **根因**：`src/meetings.html` 的 `renderTabs` 生成的「纪要」panel 没有 `display: none`，而其他 tab 均有，导致默认状态下纪要 panel 可见
- **修复**：给「纪要」panel 补上 `style="display: none;"`，与其他 tab 统一默认收起
- **操作**：版本号 `0.7.10 → 0.7.11`，更新 CHANGELOG、sonar-project.properties，build 生成 roadmap-data.json，打 tag `v0.7.11` 并 push
- **验证**：`npm run check:scope` ✓ / 受影响 E2E 15 passed / `npm run build` ✓ / GitHub Actions `Deploy to Production` success / 生产 200
- **状态**：complete（已发布生产）
- **下一步**：服务器更新 Flask KMS_API_TOKEN 后端到端确认；继续督办中心阶段 2、决议中心可选优化、T080 排期

## 2026-07-24（Claude，发布 v0.7.10 修复会议卡片 tab 收起）
- **主题**：修复会议卡片底部 tab 再次点击不能收起
- **根因**：`src/meetings.html` 的 `switchMeetingCardTab` 无论当前 tab 是否已展开都会重新打开目标 tab，缺少 toggle 逻辑
- **修复**：在重置所有 panel 为隐藏前，先判断目标 panel 是否已经是 `display: block`；若是则只隐藏并取消高亮，直接返回；否则再展开目标 tab
- **操作**：版本号 `0.7.9 → 0.7.10`，更新 CHANGELOG、sonar-project.properties，build 生成 roadmap-data.json，打 tag `v0.7.10` 并 push
- **验证**：`npm run check:scope` ✓ / 受影响 E2E 15 passed / `npm run build` ✓ / GitHub Actions `Deploy to Production` success / 生产 200
- **状态**：complete（已发布生产）
- **下一步**：服务器更新 Flask KMS_API_TOKEN 后端到端确认；继续督办中心阶段 2、决议中心可选优化、T080 排期

## 2026-07-24（Claude，发布 v0.7.9 修复纪要 tab 显示 bug）
- **主题**：修复会议卡片「纪要」tab 显示「暂无纪要」但实际有内容
- **根因**：`src/meetings.html` 的 `renderTabs` 仅依据 `m.hasMinutes` 判断，未展示 `m.minutes_content` 实际内容；旧数据可能存在 `minutes_content` 有内容但 `hasMinutes` 标志未同步的情况
- **修复**：
  - `src/meetings.html` 的纪要 tab 改为直接判断 `m.minutes_content?.trim()`，并渲染纪要正文（保留状态徽标）
  - 顶部「纪要」统计与首页纪要卡片改为按 `minutes_content` 是否存在计数/筛选，并展示内容摘要
  - `src/meetings/data-store.js` 的 `migrateMeetingsData` 增加同步逻辑：`minutes_content` 非空则补齐 `hasMinutes=true` 与 `minutesStatus='draft'`；为空则清空标志
  - 同步更新 `tests/unit/meetings-data-store.test.js` 迁移断言
- **操作**：版本号 `0.7.8 → 0.7.9`，更新 CHANGELOG、sonar-project.properties，build 生成 roadmap-data.json，打 tag `v0.7.9` 并 push
- **验证**：`npm run check:scope` ✓ / `npm run test:unit` 509 passed / 受影响 E2E 36 passed / `npm run build` ✓ / GitHub Actions `Deploy to Production` success / 生产 200
- **状态**：complete（已发布生产）
- **下一步**：服务器更新 Flask KMS_API_TOKEN 后端到端确认；继续督办中心阶段 2、决议中心可选优化、T080 排期

## 2026-07-24（Claude，发布 v0.7.3 修复 iframe 宽度 bug）
- **主题**：修复 `cockpit.html#exe/meetings` 经分会页面在 iframe 嵌入模式下被挤成一团
- **根因**：`src/cockpit.html` 的 `.content-area--tabs .page-content` 仅设置 `flex: 1`，未声明宽度；iframe 默认宽度 300px，导致 `#page-content` 收缩至 300px
- **修复**：给 `.content-area--tabs .page-content` 添加 `width: 100%`
- **操作**：
  - 本地用 Playwright 复现并测量（iframe 宽度 300px）
  - 修改 `src/cockpit.html` 一行 CSS
  - 验证修复后 iframe 宽度 1180px，布局正常
  - 运行受影响 E2E（workspace-tabs/navigation/test-sp-nav-verify）22 个用例全部通过
  - 版本号 `0.7.2 → 0.7.3`，更新 CHANGELOG、sonar-project.properties，build 生成 roadmap-data.json
  - 手动打 tag `v0.7.3` 并 push main，GitHub Actions `Deploy to Production` success
- **验证**：`npm run check:scope` ✓ / 本地 preview 截图确认布局正常 / 生产 `https://dste.fineres.com/` 200
- **状态**：complete（已发布生产）
- **下一步**：服务器更新 Flask KMS_API_TOKEN 后端到端确认；继续督办中心阶段 2、决议中心可选优化、T080 排期

## 2026-07-23（Claude，发布 v0.7.2）
- **主题**：发布 DSTE v0.7.2
- **操作**：
  - 合并并提交未发布改动：驾驶舱持久化多标签工作区（`src/lib/workspace-tabs.js` + `cockpit.html` iframe 嵌入 + `shell.js`/`shell-injector.js`/`config.js`）、设计系统 tokens/组件/样式迁移、会议待办面板精简、AGENTS/规则引擎/执行链路文档
  - 修复因导航配置抽离而失败的 `tests/test_integration.py::test_cockpit_has_meeting_review_nav`
  - 修复因工作区标签系统改变 URL 行为而失败的 `tests/e2e/test-sp-nav-verify.spec.js`
  - 版本号 `0.7.1 → 0.7.2`，更新 `CHANGELOG.md`、`sonar-project.properties`，`npm run build` 生成 `roadmap-data.json`
  - `release.sh v0.7.2` 打 tag 并推送 main
  - GitHub Actions `Deploy to Production` success；生产 `https://dste.fineres.com/`、`/src/cockpit.html`、`/src/meetings.html` 均 200
- **修改文件**：`package.json`、`package-lock.json`、`CHANGELOG.md`、`sonar-project.properties`、`public/roadmap-data.json`、`src/data/roadmap-data.json`、`.ai/memory/01-current-focus.md`、`.ai/memory/06-session-log.md`
- **验证**：`npm run lint` 0 error / `npm run check:scope` ✓ / pytest 184 passed / `npm run test:unit` 509 passed / `npx playwright test` 382 passed, 25 skipped / `npm run build` ✓
- **注意**：GitHub Actions `DSTE CI` baseline 与 Sonar 显示 failure，但 Deploy 成功、生产 200，判断为 CI 环境/权限问题而非代码回归
- **状态**：complete（已发布生产）
- **下一步**：服务器更新 Flask KMS_API_TOKEN 后端到端确认；继续督办中心阶段 2、决议中心可选优化、T080 排期

- **主题**：会议列表紧凑化 + AI 交互 UI 升级（Kimi 风）+ 会议材料审核功能修复
- **操作**：
  - `src/meetings.html` 会议卡片纵向间距压缩（padding/margins/列表 gap），构建与 check:scope 通过
  - **AI 交互 UI 升级（对标 Kimi 网页版，功能不变）**：新增 `src/styles/ai-chat.css`（dste-ai-* 共享样式，已引入 10 个 HTML 页面）+ `src/lib/markdown-lite.js`（轻量 markdown 渲染，先 escape 防 XSS）+ `tests/unit/markdown-lite.test.js` 14 用例；全局 AI 抽屉 / 会议 AI 助手（含 AiAgendaDrawer）/ cockpit 专题 AI 问答 / 规则型 AI（business-topics 匹配弹窗 + mock 浮窗、requirement-pool）统一换肤：AI 消息无气泡带头像、用户右侧浅灰气泡、思考态 spinner → shimmer 流光、流式竖线光标 → 呼吸圆点、输入区 → 大圆角 composer + 圆形发送按钮（空输入置灰）、AI 回复 markdown 渲染（流式期间 textContent，结束后一次性渲染）；删除 `shell.css` 与 `meetings.html` 中互相覆盖的旧 `.ai-message` 定义；修复 GlobalAiDrawer 事件委托 `e.target.id` 命中 SVG 子元素导致发送失效（改 `closest()`）
  - **会议材料审核修复（已发布 commit `00869bc`）**：诊断确认 v0.6.7（`604f65f`）把 nginx `/api/` 反代从 Flask(8766) 切到 Worker，审核 7 端点全 404（生产实测，`/api/health` 200 属误导性正常）；修复 `scripts/update-nginx-api-proxy.sh` 按路径分流（`^/api/(review|batch|scenes|history|summary|config)` → Flask，其余 → Worker），推送后生产验证：`/api/scenes` 200、`/api/review` 400 参数校验、Worker AI 链路不受影响；**遗留**：Flask 侧 `KMS_API_TOKEN` 失效致 KMS 拉取 404（Worker 的 `KMS_PAT_TOKEN` 同页面可取），需用户在服务器更新 `/opt/meeting-reviewer/src/.env` 并 `systemctl restart meeting-reviewer`
  - 方案 B（审核端点移植 Worker）登记为 `.ai/tasks/active/T080-review-worker-migration.md`（含完整迁移契约），用户决定暂缓
- **修改文件**：`src/styles/ai-chat.css`、`src/lib/markdown-lite.js`、`src/components/GlobalAiDrawer.js`、`src/meetings.html`、`src/meetings/components/{MeetingAiAssistant,AiAgendaDrawer}.js`、`src/cockpit.html`、`src/styles/shell.css`、`src/business-topics.html`、`src/pages/business-topics/{main,style}.*`、`src/pages/requirement-pool/{main,style}.*`、`scripts/update-nginx-api-proxy.sh`、10 个 HTML 引入 ai-chat.css
- **验证**：build / check:scope ✓；unit 466 ✓（含新增 14）；E2E ai-assistant 6 + ai-agenda-recommend/business-topics/meeting-pending-actions 54 ✓；视觉走查截图 ✓；pytest 183 过 1 失败（`test_score_color_rules`，并行会话 todo-panel 改动所致，非本会话）
- **状态**：complete（AI UI 改动未提交，攒着；审核链路已恢复，待用户更新 Flask token 后端到端确认）
- **下一步**：用户更新服务器 KMS_API_TOKEN 后跑一次真实材料审核；AI UI 改动随下次发布提交；T080 后续排期

## 2026-07-21（Kimi，记忆机制修复）
- **主题**：排查记忆版本过期（v0.6.13 vs 实际 v0.6.17）并修补机制
- **操作**：
  - 定位根因：07-16（v0.6.14）与 07-20（v0.6.15/16/17，性能优化 + defer 白屏 hotfix）的发布/救火会话未回写 `.ai/memory/`；结构性原因是机制无强制力、`AGENTS.md` 未提及 `.ai/memory/`、`docs/04-Guide开发指南/ai-memory-workflow.md` 已被删除
  - 修正 `01-current-focus.md`：生产版本号 → v0.6.17，标注 07-14~07-21 记忆空白（以 git log 为准）
  - `AGENTS.md` 新增「会话记忆（每个会话必须执行）」一节：开始读 bootstrap + current-focus，结束更新 current-focus + session log（发布/救火会话无一例外），判定标准"有提交/发布但 memory 无变化 = 没做完"
- **修改文件**：`.ai/memory/01-current-focus.md`、`.ai/memory/06-session-log.md`、`AGENTS.md`（均未提交）
- **状态**：complete
- **下一步**：改动随下次发布一起提交；工作区仍有规则引擎 + 会议待办面板 + 全局 AI 抽屉未提交开发线（用户表示暂不处理）

## 2026-07-21
- **主题**：接手并完成规则引擎中心测试验证
- **操作**：
  - 接手隔壁会话中断的规则引擎开发任务，当前仅剩「运行测试并验证规则引擎」
  - 定位并修复规则引擎保存新规则不生效的 bug：新建规则时 `state.editingRule` 带有默认规则 id，保存时误走 `updateRule` 分支但 localStorage 中无此 id，导致规则未写入
  - 修复 `src/pages/rule-engine/main.js`：新建规则时将 `id` 重置为空；保存时通过 `findRuleById(id)` 判断是更新还是新增
  - 更新 `tests/e2e/navigation.spec.js`：规则引擎已改为独立页面 `rule-engine.html`，测试从占位页断言改为跳转独立页面断言
  - 顺手修复 cockpit.html 构建后 roadmap/version-audit 页面无法渲染的问题：Vite 构建后 cockpit 主逻辑 module 提前执行，`PAGES['dashboard/roadmap']` 直接引用 `window.renderDevTimeline` 时未定义；改为 `() => window.renderDevTimeline()` / `() => window.renderVersionAudit()` 延迟访问
- **修改文件**：`src/pages/rule-engine/main.js`、`tests/e2e/navigation.spec.js`、`src/cockpit.html`
- **验证**：`npm run test:unit` 509 passed；`npx playwright test tests/e2e/rule-engine.spec.js` 3 passed；`npx playwright test tests/e2e/navigation.spec.js` 14 passed；`npm run build` / `npm run check:scope` ✅
- **状态**：complete（规则引擎验证通过，改动未提交/未发布）
- **下一步**：用户决定是否将规则引擎改动随下一版本发布；继续其他并行开发线

## 2026-07-14
- **主题**：发布 v0.6.13 —— 纳入上一会话遗留的 AI 改动并修复 4 个过期 E2E
- **操作**：
  - 纳入 4 组 AI 改动并发布：①决议中心「决议执行趋势」月度闭环率迷你柱状图+点击柱联动筛选（resolution-helpers.js + DecisionsDrawer.js）；②meetings.html 场景图标 ⚠️/⏰→Phosphor、场景卡片改用 icon()；③移除会议详情「原则」tab、议程编辑器 status 下拉；④vite.config.js 本地代理 /api/ai 到生产 Worker
  - 版本号 0.6.12→0.6.13，CHANGELOG 新增 v0.6.13，roadmap-data.json 由 build 自动再生成
  - 修复 4 个过期 E2E（非本次回归，历史 stale test 卡住 release.sh 全量门禁）：roadmap.spec.js 硬编码 v0.6.7→动态读 versions[0]；calendar-view.spec.js 移除已并入抽屉的「决议执行趋势」侧栏断言；omp-tasks.spec.js DATA_VERSION canvas-v11→canvas-v18 + 源头任务断言改 v0.6.12 派生语义（恰好一行无重复）
  - `backups/` 加入 .gitignore（本地 OMP 数据快照，不入库）；新增 docs↔Obsidian 单向同步脚本
- **修改文件**：`src/meetings.html`、`src/meetings/utils/resolution-helpers.js`、`src/meetings/components/DecisionsDrawer.js`、`src/meetings/renderers/meeting-editor.js`、`vite.config.js`、`package.json`、`CHANGELOG.md`、`tests/e2e/{roadmap,calendar-view,omp-tasks}.spec.js`、`.gitignore`、`scripts/sync-docs-*.sh`
- **验证**：pytest 184 passed；全量 E2E 350 passed / 25 skipped（修复后 0 failed）；build/check:scope ✅；release.sh 全门禁通过并打 tag v0.6.13 推送；GitHub Actions deploy success；生产 4 个 URL 全 200、roadmap-data.json 最新版本 v0.6.13
- **状态**：complete（已发布生产）
- **下一步**：回到并行开发线 —— 设计系统 JS 模块残留 emoji 清理、督办中心阶段 2、决议中心可选优化

## 2026-07-14（续）
- **主题**：设计系统 JS 模块残留 emoji 清理（设计系统 emoji 迁移收尾）
- **操作**：扫描 `src/lib`/`src/meetings`/`src/pages`/`assets/js`，仅象形状态 emoji 需清——6 文件 14 处：⏳→hourglass（pending-actions/meeting-editor/meeting-detail/AiAgendaDrawer/reviewer）、⏸→pause（meeting-prep/meeting-detail）、⏱→timer（AiAgendaDrawer）。顺手修：meeting-editor 重评按钮 textContent→innerHTML；reviewer 局部变量 icon→statusIcon（消除对导入 icon() 的遮蔽）。**刻意保留 →/↔**（行文流程箭头/注释/正则字符类 `[→\-\~]`/data-link-id，非 emoji）
- **修改文件**：`src/meetings/renderers/{pending-actions,meeting-editor,meeting-detail,meeting-prep}.js`、`src/meetings/components/AiAgendaDrawer.js`、`src/pages/reviewer/main.js`
- **验证**：build/check:scope ✅；unit 414 passed；meetings E2E 28、reviewer E2E 39 全过；hourglass/pause/timer 确认在 sprite 且 SVG 数据非空
- **状态**：complete（已提交本地 `1ed5536`，**未发布**——用户决定攒着，等下一批一起发）
- **下一步**：本地领先 origin 两个提交（emoji 清理 + checkpoint），生产仍 v0.6.13；下次发布时一并带上。可继续督办中心阶段 2 / 决议中心可选优化

## 2026-07-10
- **主题**：战略专题管理列表展示密度与操作优化（承接 `0b177d4`「移除维度/进度」后的进一步精简）
- **操作**：
  - 确认列表已不含「战略维度/进度/更新/成员」列、筛选区仅状态/类型下拉（继承自 `0b177d4`），新建/编辑表单亦无维度/进度字段
  - 紧凑化：`.st-compact-table` padding `6px 10px` → `4px 8px`、`line-height:1.35`
  - 内容区滚动：年份卡片表身 `max-height:min(58vh,560px)` + `overflow-y:auto`、表头 sticky，页头/筛选条不动
  - 操作列简洁化：查看/编辑/删除由文字链接改为 Phosphor 图标按钮（eye / pencil-simple / trash），保留 `view/edit/delete-topic-btn` class 与 `data-topic-id`
- **修改文件**：`src/cockpit.html`
- **验证**：`npm run build` / `check:scope` ✅；`tests/e2e/strategy-topics.spec.js` 8 passed / 1 skipped（既有「下一年深化」用例）；实测每行 3 按钮齐全（14×3=42 个 SVG 全部 hydrate）、2025 卡片 `scrollHeight 953 > clientHeight 522` 可内部滚动
- **状态**：complete（改动未提交，待用户浏览器确认）
- **下一步**：用户确认是否连详情/表单也去掉成员；决定是否 commit（另有一个非本次的 `vite.config.js` `/api/ai` 本地代理改动悬而未决）

## 2026-07-10
- **主题**：推进「全部数据云端同步」—— 业务专题议题修复 + 战略洞察/评审评分/OMP cycles 接入 + 年度计划源数据确认
- **操作**：
  - 业务专题议题（issues）：修复 `issue-import.js` 调用未定义 `window.apiSave` 的 bug，改为 `enqueuePerRecordSync('issues', ...)` per-record 同步；新增 `loadRemoteIssues()` 合并；Worker `handleEntityItem` 系列支持 `idField`，议题端点按 `issueId` 查找
  - 战略洞察（insights）：Worker 新增 `/api/insights` 批量 + `/api/insights/{id}` 单条端点；前端 `src/cockpit.html` 新增 `siPersistInsights`/`siLoadRemoteInsights`，6 处 `siSaveInsights` 改为 persist
  - 会议材料审核评分（review scores）：Worker 新增 `/api/review-scores` map 端点；前端 `reviewer.js` 新增 `persistReviewScores`/`loadRemoteReviewScores`，`meeting-editor.js` 3 处、`pages/reviewer/main.js` 1 处改为 persist；`meetings.html` init 调用 loadRemote
  - OMP cycles：加入 `OMP_STORAGE`/`ompRepos`/`OMP_API_ENTITY_NAMES`，删除已无人调用的 `apiSaveOmp`（约 35 行死代码），3 处直接读写 `dste_cycles_v1` 改 `omp_load`/`omp_save`
  - 年度计划源数据：核查后确认已随 OMP per-record 同步覆盖（cycles/kpiInstances/tasks，`source: 'annual_plan'`），无需新增代码
- **修改文件**：
  - `api-worker/worker.js`（insights + review-scores 端点，handleEntityItem idField 支持）
  - `src/cockpit.html`（insights persist + cycles per-record）
  - `src/meetings.html`、`src/meetings/utils/reviewer.js`、`src/meetings/renderers/meeting-editor.js`、`src/pages/reviewer/main.js`
  - `src/pages/business-topics/issue-import.js`、`src/pages/business-topics/main.js`
  - `tests/unit/issue-import.test.js`、`tests/unit/reviewer.test.js`
- **验证**：`npx vitest run` → 414 passed；`npx eslint` 修改文件 0 error
- **部署提示**：Worker 必须先于前端部署，否则 `/api/insights`、`/api/review-scores`、`/api/issues/{id}` 会 404
- **状态**：complete
- **下一步**：用户隔离方案（`user:{id}:{key}`）→ AI 助手会话历史 → 业务专题 AI 报告缓存 → 版本审计前端接入

## 2026-07-08
- **主题**：继续 UI/UX 设计系统升级（承接前序会话已创建的 Phase 0 基线）
- **操作**：
  - 完成 Phase 1 Shell 统一收尾：修复 `src/lib/config.js` 中「经营分析会 ⭐」残留 emoji；补齐 `icon-mapping.js` 中 sidebar group icon key 映射（`chart-line-up`、`users-three`、`chart-pie-slice`）
  - 完成 Phase 2 全部独立 HTML 页面 emoji 替换为 Phosphor 图标：
    - `src/business-topics.html`、`src/meetings.html`、`src/reviewer.html`、`src/requirement-pool.html`、`src/employee-directory.html`
    - `src/st-issue-tracking.html`、`src/at-issue-tracking.html`、`src/strategy-map-list.html`、`src/strategy-map.html`
  - 为 `src/meetings.html`、`src/strategy-map.html` 模块脚本补充 `import { icon } from '../assets/js/icons.js'`
  - 扩展 `assets/js/icon-mapping.js`：新增 `mapTrifold`、`siren`、`handshake`、`tray` 等图标 key 及常用 camelCase 别名
  - 修复批量替换引入的嵌套模板字符串语法问题（`tabLabels`、状态图标 ternary、上下游箭头空状态）
- **修改文件**：
  - `assets/js/icon-mapping.js`
  - `src/lib/config.js`
  - `src/business-topics.html`、`src/meetings.html`、`src/reviewer.html`、`src/requirement-pool.html`、`src/employee-directory.html`
  - `src/st-issue-tracking.html`、`src/at-issue-tracking.html`、`src/strategy-map-list.html`、`src/strategy-map.html`
- **验证**：
  - `npm run build` 通过
  - `npm run check:scope` 通过
  - `npm run test:unit` → 396 passed
  - E2E：navigation + business-topics + meetings-smoke + strategy-map-list + strategy-map + reviewer-embed → 86 passed
- **状态**：Phase 0~2 HTML 页面完成，待继续清理 JS 模块中的残留 emoji
- **下一步**：继续 Task #5，替换 `src/lib/*`、`src/meetings/**/*`、`src/pages/**/*`、`assets/js/main.js` 中的 emoji

## 2026-07-07
- **主题**：修复生产环境 CAS 登录循环 + OMP 子任务相关 bug + 准备 v0.6.6 发布
- **操作**：
  - 修复 OMP 重点工作编辑子任务时，添加第二个子任务会导致对已有子任务的修改丢失
  - 修复 OMP 父任务在「基本信息」等标签页保存时误删所有子任务的严重 bug
  - 准备 v0.6.6 版本升级：更新 package.json 版本号与 CHANGELOG
  - 排查生产环境 `dste.fineres.com` 登录循环：根因为服务器 8766 端口运行 meeting-reviewer 代理，无 DSTE 认证接口
  - 尝试部署 `api-worker/worker.js` 到 Cloudflare Workers，因部分电脑/服务器无法访问 `workers.dev` 而放弃
  - 在服务器 `/opt/meeting-reviewer/src/proxy_server.py` 增加 DSTE 认证 shim（`/api/auth/cas/login`、`/api/auth/me`、`/api/auth/logout`），前端恢复同域 `/api/` 代理
  - 登录问题解决后，协助用户排查 OMP 子任务丢失，提供 localStorage 恢复脚本；确认当前仅存 2 个子任务，无自动备份可恢复
  - 新增回归测试覆盖子任务保存场景
- **修改文件**：
  - `src/cockpit.html`
  - `src/meetings.html`
  - `src/business-topics.html`
  - `src/requirement-pool.html`
  - `src/lib/per-record-sync.js`
  - `src/lib/employee-directory.js`
  - `src/meetings/data-store.js`
  - `src/lib/ai-client.js`
  - `src/meetings/utils/agenda-recommender.js`
  - `index.html`
  - `package.json`
  - `CHANGELOG.md`
  - `tests/e2e/omp-subtasks.spec.js`
  - `api-worker/wrangler.toml`
- **验证**：
  - `npm run build` 通过
  - `npm run check:scope` 通过
  - `tests/e2e/omp-subtasks.spec.js` → 7 passed
  - 生产 `/api/auth/cas/login` 与 `/api/auth/me` 可访问
- **状态**：complete（登录问题解决；子任务丢失 bug 修复；丢失数据需用户重新录入）
- **下一步**：
  - 用户重新录入丢失的 OMP 子任务
  - 继续完成 v0.6.6 其他功能后发布

## 2026-07-02
- **主题**：尝试自动化读取 report-center 利润表数据 + 修复 cockpit 初始化 bug
- **操作**：
  - 启动本地 dev server，用 Playwright 访问 `cockpit.html#exe/report-center`
  - 发现 `cockpit.html` 初始化报错：`renderInsightsPage` 未定义、`renderStrategyTopicsPage` 未定义，导致页面白屏
  - 修复：`PAGES['sp/insights']` → `PAGES['sp/insights-topics']: renderInsightsTopics`，并新增 `renderStrategyTopicsPage` 占位函数
  - 多次尝试自动化点击 FineReport「查询」按钮、直接带参数访问 FineReport URL、调用 FR 内部 API，均无法触发报表数据渲染
  - 临时脚本与截图已清理
- **修改文件**：
  - `src/cockpit.html`
- **状态**：blocked（FineReport 在 headless 浏览器中不渲染数据）
- **下一步**：如需继续，可尝试 Cloudflare Tunnel 公网访问，或用户在浏览器控制台运行提取脚本

## 2026-06-29
- **主题**：接手排查并修复 OMP E2E 失败
- **操作**：
  - 复现：串行/并行运行全部 `tests/e2e/omp-*.spec.js`，稳定复现 5 个失败，排除“并行测试隔离/localStorage 污染”结论
  - 根因分析：
    1. `omp-migration-safety.spec.js`：per-record 同步将 OMP `DATA_VERSION` 升级到 canvas-v15，测试仍断言 canvas-v14
    2. `omp-tasks.spec.js` 人员配置台 3 个用例：同一次提交把人员从组织架构树内嵌展示改为独立 `#omp-staffing-person-list` 面板，测试仍断言人员出现在 `#omp-staffing-org-tree`
    3. `omp-subtasks.spec.js` 第一个用例：保存后固定等待 500ms，per-record 同步路径下偶发不够，点击详情时被未关闭编辑弹窗拦截
  - 修复：
    - `tests/e2e/omp-migration-safety.spec.js`：`canvas-v14` → `canvas-v15`
    - `tests/e2e/omp-tasks.spec.js`：选中部门后断言 `#omp-staffing-person-list`；搜索后直接断言人员列表
    - `tests/e2e/omp-subtasks.spec.js`：保存后改为 `await expect(#omp-active-modal).toHaveCount(0)`
  - 删除临时 debug 文件 `tests/e2e/omp-staffing-debug.spec.js`、`tests/e2e/omp-subtask-debug.spec.js`
  - 更新 `.ai/memory/01-current-focus.md` 中 OMP E2E 状态说明
- **修改文件**：
  - `tests/e2e/omp-migration-safety.spec.js`
  - `tests/e2e/omp-tasks.spec.js`
  - `tests/e2e/omp-subtasks.spec.js`
  - `.ai/memory/01-current-focus.md`
- **验证**：
  - `npx playwright test tests/e2e/omp-*.spec.js --workers=1` → 21 passed
  - `npx playwright test tests/e2e/omp-*.spec.js --workers=4` → 21 passed
  - `npx playwright test --workers=4` → 319 passed / 2 failed / 20 skipped
    - 失败 1：`roadmap.spec.js` 期望 v0.5.5，但 `package.json` 已是 0.6.0（与本次无关，pre-existing）
    - 失败 2：`strategy-map.spec.js` delete objective UI 超时（与本次无关，pre-existing，已在记忆中记录）
- **状态**：complete
- **下一步**：提交 per-record 同步相关改动；如需可顺手修复 roadmap 版本断言

## 2026-06-29
- **主题**：5 模块 per-record 单条同步迁移
- **操作**：
  - 按会议模块已落地的模式，将 per-record 单条同步推广到业务专题、需求池、OMP、战略地图、人员/组织目录
  - 提取公共库 `src/lib/per-record-sync.js`（diff/merge/enqueue/executor/apiLoad）
  - 后端 `api-worker/worker.js`：新增 requirements、OMP 单条、战略地图 map/objective/link 单条端点；DELETE 改为硬删除
  - 前端改造：
    - 业务专题 `src/pages/business-topics/main.js`：version 4，saveTopics 单条同步
    - 需求池 `src/pages/requirement-pool/requirement-store.js`：version 2，CRUD 收口到 persistRequirements
    - OMP `src/cockpit.html`：DATA_VERSION canvas-v15，omp_save 按实体单条同步
    - 战略地图 `src/lib/strategy-map-data.js`：version 5，map/objective/link 单条同步，link 新增 id
    - 人员目录 `src/lib/employee-directory.js`：employees version 2，导入/清空 per-record，orgUnits/importMeta 保持批量
  - 更新相关单元测试与 E2E 测试
- **修改文件**（本次新增/关键改动）：
  - 新增：`src/lib/per-record-sync.js`、`tests/unit/per-record-sync.test.js`
  - 后端：`api-worker/worker.js`
  - 前端：`src/pages/business-topics/main.js`、`src/pages/requirement-pool/requirement-store.js`、`src/pages/requirement-pool/main.js`、`src/cockpit.html`、`src/lib/strategy-map-data.js`、`src/lib/strategy-map-list.js`、`src/strategy-map.html`、`src/lib/employee-directory.js`
  - 测试：`tests/unit/employee-directory.test.js`、`tests/unit/strategy-map-data.test.js`、`tests/e2e/employee-directory.spec.js`
- **验证**：
  - `npm run build` → 通过
  - `npm run test:unit` → 23 files, 372 passed
  - `npm run check:scope` → 通过
  - `python3 -m pytest tests/` → 177 passed, 1 failed（reviewer 同步 pre-existing）
  - `npx playwright test tests/e2e/business-topics.spec.js` → 29 passed
  - `npx playwright test tests/e2e/requirement-pool.spec.js tests/e2e/strategy-map-list.spec.js` → 26 passed
  - `npx playwright test tests/e2e/employee-directory.spec.js` → 7 passed
  - `npx playwright test tests/e2e/strategy-map.spec.js` → 15 passed, 1 failed（delete objective UI 超时）
  - OMP E2E 大面积失败，待确认是本次引入还是前序已坏
- **状态**：partial
- **下一步**：排查 OMP E2E 失败根因；补齐 per-record 同步的 E2E 覆盖（并发编辑、删除清 pending、离线恢复）

## 2026-06-29
- **主题**：隔壁会话接手 — 将 AI 工具执行迁移到 Worker
- **操作**：
  - 读取 `.ai/tasks/active/`、设计文档 `docs/01-Product产品/经营分析会AI辅助能力-开发计划.md` 与 `docs/02-RFC功能设计/008-ai-strategic-partner-global-design.md`，确认迁移目标
  - 发现 `api-worker/worker.js` 中 `/api/ai/tools/execute` 与 `executeTool`/`handleToolsExecute` 已由前序会话实现，前端 `src/lib/ai-client.js` 仍本地执行
  - 改造 `src/lib/ai-client.js`：
    - `callWithTools()` 透传 `options.toolContext`
    - `_executeTool()` 仅 `navigateTo` 保留本地执行，其余统一 POST 到 Worker `/api/ai/tools/execute`
    - 移除对 `window.findMeetingById` 和旧 `/api/ai/kms-search` 的依赖
  - 改造 `src/meetings/components/MeetingAiAssistant.js`：调用 `callWithTools` 时传入 `toolContext: { meeting }`
  - 扩展 `tests/unit/ai-client.test.js`：新增 `_executeTool` 与 `callWithTools` 单测共 5 个
  - 运行回归验证
- **修改文件**：
  - `src/lib/ai-client.js`
  - `src/meetings/components/MeetingAiAssistant.js`
  - `tests/unit/ai-client.test.js`
- **验证**：
  - `npx vitest run tests/unit/ai-client.test.js` → 21 passed
  - `npm run test:unit` → 22 files, 362 passed
  - `npm run build` → 通过
  - `npx playwright test tests/e2e/ai-assistant.spec.js tests/e2e/ai-agenda-recommend.spec.js` → 12 passed
  - `npx playwright test tests/e2e/meeting-detail.spec.js tests/e2e/meeting-detail-dist.spec.js` → 6 passed, 1 skipped
  - `npm run check:scope` → 通过
  - `python3 -m pytest tests/` → 177 passed, 1 failed（`test_reviewer_syncs_score_to_localStorage`，与本次修改无关）
- **状态**：complete
- **下一步**：如需让 cockpit.html 的全局 AI 助手在流式输出中也执行工具，需在 UI 消费端补齐 `toolCalls` 处理

## 2026-06-23（下半场）
- **主题**：启动人员与组织目录接入（第一阶段）
- **操作**：
  - 读取用户提供的 `/Users/jasonjing/Desktop/人员信息明细表-对外_20260623181105.xlsx`，分析字段结构（1031 人、ldap 组织链、经理覆盖率仅 13%）
  - 进入 Plan Mode，设计分阶段方案，确认：分阶段实施、Excel 为唯一来源、不接入 CAS
  - 第一阶段实现：
    - `src/lib/employee-directory.js`：员工/组织模型、Repository、ldap 组织树构建、搜索索引、PersonRef 兼容层
    - `src/lib/employee-import.js`：Excel/CSV 解析、校验、预览、导入写入
    - `src/employee-directory.html` + `src/pages/admin/employee-directory.js`：管理页（导入、统计、组织树、搜索）
    - `src/lib/config.js`：新增「人员与组织管理」导航
    - `tests/unit/employee-directory.test.js`、`employee-import.test.js`：14 个单测
    - `tests/e2e/employee-directory.spec.js`、`tests/fixtures/test-employees.xlsx`：4 个 E2E（含真实 Excel 上传）
  - 保持模块职责单一，避免巨石文件；管理页逻辑拆分到独立模块
  - commit `2c5bdd9` 并推送到 GitHub `main`
  - 更新 `.ai/memory/01-current-focus.md`
- **修改文件**：
  - 新增：`src/lib/employee-directory.js`、`src/lib/employee-import.js`、`src/employee-directory.html`、`src/pages/admin/employee-directory.js`
  - 新增测试：`tests/unit/employee-directory.test.js`、`tests/unit/employee-import.test.js`、`tests/e2e/employee-directory.spec.js`、`tests/fixtures/test-employees.xlsx`
  - 修改：`src/lib/config.js`
- **验证**：
  - `npm run test:unit` → 227 passed
  - `npx playwright test tests/e2e/employee-directory.spec.js tests/e2e/navigation.spec.js` → 17 passed
  - `npm run build`、`npm run check:scope` → 通过
  - `git push origin main` → 成功
- **状态**：complete（第一阶段）
- **下一步**：第二阶段，把人员选择器接入会议模块

## 2026-06-23
- **主题**：继续并落地 DSTE 存储架构优化基础层，升级 v0.5.4
- **操作**：
  - 恢复存储架构优化上下文，发现 `src/lib/repository.js` 等基础模块已实现但未提交
  - 创建任务配方 `.ai/tasks/active/T070-storage-optimization.md`
  - 运行回归验证：`npm run test:unit` 213 passed、聚焦 E2E 29 passed、`npm run build` 与 `check:scope` 通过
  - 提交存储基础层：Repository / BackupManager / SyncQueue / ConflictResolver / MigrationUtils + 52 单测 + 4 E2E
  - 升级版本到 v0.5.4：更新 `package.json`、`CHANGELOG.md`，重新生成 `roadmap-data.json` 与 `version-audit.json`
  - 推送两个 commit 到 GitHub `main`
  - 运行 `./end-session.sh`，更新 `01-current-focus.md` 时间戳
- **修改文件**：
  - `.ai/tasks/active/T070-storage-optimization.md`（新增）
  - `src/lib/repository.js`、`backup-manager.js`、`sync-queue.js`、`conflict-resolver.js`、`migration-utils.js`（新增）
  - `tests/unit/repository.test.js`、`backup-manager.test.js`、`sync-queue.test.js`、`conflict-resolver.test.js`、`migration-utils.test.js`、`storage.test.js`（新增）
  - `tests/e2e/meetings-corruption.spec.js`、`omp-migration-safety.spec.js`（新增）
  - `package.json`、`CHANGELOG.md`、`src/data/roadmap-data.json`、`public/roadmap-data.json`、`public/version-audit.json`
  - 更新用户记忆 `storage-architecture-optimization.md`
- **验证**：
  - `npm run test:unit` → 213 passed
  - `npx playwright test tests/e2e/meetings-corruption.spec.js tests/e2e/omp-migration-safety.spec.js tests/e2e/meeting-pending-actions.spec.js tests/e2e/meeting-create.spec.js tests/e2e/navigation.spec.js` → 29 passed
  - `npm run build`、`npm run check:scope` → 通过
  - `git push origin main` → 成功
- **状态**：complete

## 2026-06-22
- **主题**：DSTE v0.5.3 版本发布
- **操作**：
  - 提交当前工作区主要修改（年度经营计划、OMP、会议组件化、Tunnel 适配）
  - 补充并合并 CHANGELOG v0.5.3 章节
  - 重新生成 `public/roadmap-data.json`、`public/version-audit.json` 等产物
  - 修复 `tests/test_integration.py` 因 meetings 组件化拆分导致的跨文件断言失败
  - 运行 `npm run build`、pytest、E2E 验证
  - 因远程已存在 `v0.5.2` tag，按用户决定升级到 `v0.5.3`
  - 执行 `./scripts/release.sh v0.5.3`，创建并推送 tag 与 main 分支
- **修改文件**：`package.json`、`CHANGELOG.md`、`tests/test_integration.py`、`tests/e2e/roadmap.spec.js`、`public/roadmap-data.json`、`src/data/roadmap-data.json`、`public/version-audit.json` 等
- **验证**：
  - `python3 -m pytest tests/` 172 passed
  - `npx playwright test --workers=1` 251 passed（2 flaky 已通过 retry）
  - `npm run build` 成功
  - `git tag -l v0.5.3` 与远程 `refs/tags/v0.5.3` 已确认
- **状态**：complete

## 2026-06-18
- **主题**：本地 DSTE 通过 Cloudflare Tunnel 暴露到公网域名，支持异地访问
- **操作**：
  - 安装 `cloudflared` 客户端（macOS，直接下载二进制）
  - 在 Cloudflare Zero Trust 创建 Tunnel `dste-local` 并安装为系统服务
  - 绑定公网域名：`dste.jasonxspace.cc` → 本地 `localhost:3456`
  - 修改 `vite.config.js`，将 `dste.jasonxspace.cc` 加入 `preview.allowedHosts`
  - 修改 `src/cockpit.html`，将 `dste.jasonxspace.cc` 加入本地开发白名单，跳过 CAS 登录校验
  - 重新执行 `npm run build` 并重启 `npm run preview`（端口 3456）
- **修改文件**：`vite.config.js`、`src/cockpit.html`
- **验证**：
  - `https://dste.jasonxspace.cc/src/cockpit.html` 可正常加载，无 CAS 跳转循环
  - 页面内容正常显示
- **状态**：complete

## 2026-06-18
- **主题**：完善「经分会事不过三机制」宣讲 PPT
- **操作**：
  - 找回并预览已生成的 `经分会事不过三机制.pptx`
  - 使用 Keynote 将 PPT 导出为 PDF 到桌面
  - 修改 `generate_ppt.py`，新增第二页：场景示例、数据看板、产品功能给企业带来的价值
  - 重新生成 PPT 并再次导出 PDF 到桌面（2 页，107 KB）
  - 将 `.pptx-venv/` 加入 `.gitignore`，避免虚拟环境文件污染 Git
  - 更新 `.ai/memory/01-current-focus.md` 时间戳
- **修改文件**：`generate_ppt.py`、`.gitignore`、`.ai/memory/01-current-focus.md`、`.ai/memory/06-session-log.md`
- **决策**：
  - `.pptx-venv/` 作为临时 Python 虚拟环境，不纳入版本控制
  - `generate_ppt.py` 与 `经分会事不过三机制.pptx` 保留在工作区，本次不自动提交
- **下一步**：无（用户表示暂时不需要调整）
- **状态**：complete

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
