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

## [v0.4.0] - 2026-05-26

### Security
- **事件委托改造**：移除 business-topics.html 中全部 79 个内联事件属性（onclick/onchange/oninput/onsubmit/ondrop/ondragover/ondragleave），改为统一的事件委托处理器
- 消除 XSS 注入风险点，彻底摆脱对内联 `onclick` 的依赖

### Changed
- **CSS 抽离**：内联 1500 行样式迁移至 `src/pages/business-topics/style.css`，HTML 仅保留结构
- **JS 模块化拆分**：内联 2614 行脚本按功能拆分为 4 个 ES 模块：
  - `main.js`（1420 行）：核心逻辑（数据层、渲染、表单、筛选排序、事件委托、初始化）
  - `issue-import.js`（360 行）：ST/AT 议题导入（CSV/Excel 解析、拖拽上传、数据校验）
  - `ai-analysis.js`（740 行）：AI 智能匹配与全局分析报告
  - `topic-issues.js`（141 行）：议题关联管理
- `business-topics.html` 从 4326 行降至约 500 行（-88%），可维护性显著提升
- Vite 自动打包 JS 模块为独立 chunk，首屏加载优化

### Engineering
- ESLint `max-lines` 警告消除（原 4326 行超标 → 最大模块 1420 行）
- 测试更新：pytest 基线测试适配模块化结构（54 个全部通过）
- Playwright E2E 测试全部通过（8 个）

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
