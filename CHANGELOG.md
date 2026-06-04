# Changelog

所有 DSTE 战略管理平台的版本变更记录。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### 计划中
- 战略地图可视化页面（BSC 四维度）
- KPI 详情下钻
- 用户权限系统（替换当前模拟登录）
- ST/AT 议题 Excel 模板下载

---

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
