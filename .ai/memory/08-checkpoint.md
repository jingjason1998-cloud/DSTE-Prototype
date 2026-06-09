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

## T010 需求管理中心 — 需求池列表页

- **当前步骤**：未开始（Step 1: 页面骨架与路由注册）
- **任务文件**：`.ai/tasks/active/T010-requirement-pool.md`
- **前置条件**：无强依赖，可独立开发
- **注意**： cockpit.html 的 JS 在 IIFE 中，但独立页面不受此限制
- **状态**：已暂停，优先完成 OMP
