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

## [0.1.0] - 2026-05-21

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
