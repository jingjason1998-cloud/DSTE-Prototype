# 断点与恢复

> 记录复杂任务的中间状态，方便中断后恢复。

## 组织绩效管理模块 (OMP) — 开发中

- **当前步骤**：Tab 1 总览看板缺失 + 删除功能缺失 + CSS 变量违规待修复
- **代码位置**：`src/cockpit.html` 内，约 line 389~2937（OMP 数据层 + 渲染 + 弹窗 + 事件）
- **数据存储**：localStorage 键 `dste_omp_*_v1`
- **页面路由**：`cockpit.html#exe/tasks`
- **Mock 数据**：8 指标 + 8 KPI 实例 + 6 重点工作 + 18 里程碑 + 4 进度记录
- **已完成**：Tab 2(KPI管理) / Tab 3(重点工作) / Tab 4(甘特图) / 弹窗 / 导出
- **未完成**：Tab 1(总览看板) / 删除功能 / CSS 变量修复
- **注意**：所有 OMP 函数加 `omp_` 前缀；事件委托在 bindPageEvents 中处理；弹窗内 onclick 使用 window 全局函数

## 经分会-决议中心 — 功能主体已完成

- **当前步骤**：核心状态机、单测、抽屉 UI/交互、E2E 测试均已完成；剩余可选优化：以 ES Module 方式真正引用 `resolution-helpers.js`、确认生产数据迁移、版本号升级
- **代码位置**：`src/meetings.html`（内联状态机函数 ~line 169、编辑表单 ~line 2880、抽屉 DOM+渲染 ~line 3260）、`src/meetings/utils/resolution-helpers.js`
- **数据存储**：localStorage 键 `dste_resolutions_v2`；单条决议随会议数据 localStorage + 后端同步
- **页面路由**：无独立页面，目前作为 `src/meetings.html` 右侧抽屉 `#decisions-drawer` 存在
- **状态体系**：3 状态（pending → approved → closed），旧 9 状态已迁移映射到这 3 个状态
- **已完成**：新状态机设计、`resolution-helpers.js` 工具模块、31 个单元测试全部通过、meetings.html 内联函数（已移至 IIFE 顶部）、编辑表单升级、新增决议后迁移同步、抽屉 HTML 结构、抽屉内联渲染（筛选/统计/卡片/进度/状态badge切换/日志/KMS/跳转）、旧组件引用废弃、E2E 测试新增/更新
- **验证**：vitest 112 passed；meeting + resolution-center E2E 39 passed, 3 skipped；`npx vite build` 通过
- **注意**：meetings.html 主脚本在 IIFE 中，局部函数不能被 onclick 访问；抽屉/弹窗内 onclick 需用 window 全局函数；事件委托在 bindPageEvents 中处理
- **任务文件**：`.ai/tasks/active/T030-resolution-center.md`

## T010 需求管理中心 — 需求池列表页

- **当前步骤**：未开始（Step 1: 页面骨架与路由注册）
- **任务文件**：`.ai/tasks/active/T010-requirement-pool.md`
- **前置条件**：无强依赖，可独立开发
- **注意**： cockpit.html 的 JS 在 IIFE 中，但独立页面不受此限制
- **状态**：已暂停，优先完成 OMP
