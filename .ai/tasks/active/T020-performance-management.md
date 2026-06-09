# T020: 组织绩效管理模块 (OMP)

> 在 `cockpit.html#exe/tasks` 页面实现组织绩效管理 MVP
> 由 Claude 启动开发，Kimi 续盘完成剩余工作

---

## 当前状态

**已完成** (Claude):
- [x] 数据层: OMP_STORAGE, omp_initData, omp_load, omp_save
- [x] Mock 数据: 8 指标 + 8 KPI + 6 工作 + 18 里程碑 + 4 进度记录
- [x] Tab 2: KPI 管理 — 列表/筛选/新建/编辑/详情/迷你趋势图
- [x] Tab 3: 重点工作 — 列表/筛选/新建/编辑/详情/里程碑/进度记录
- [x] Tab 4: 甘特图 — CSS Grid 实现
- [x] 弹窗系统: omp_openModal + 各详情/编辑弹窗
- [x] 事件委托: bindPageEvents 中 omp-* action 分发
- [x] 导出功能: JSON 导出

**待完成** (Kimi):
- [ ] Tab 1: 总览看板 (`omp_renderDashboard`) — 统计卡片 + KPI 热力图 + 工作状态分布 + 预警清单
- [ ] 删除功能 — KPI 删除 + 工作删除 + 二次确认弹窗
- [ ] CSS 变量修复 — 甘特图/statusColors 硬编码颜色改为 var(--*)
- [ ] 构建验证 + 浏览器测试
- [ ] 版本号升级 v0.4.5

---

## 技术约束

1. **IIFE 内运行**: cockpit.html 所有 JS 在 IIFE 中，局部函数不能被 onclick 访问
2. **事件委托优先**: 列表按钮用 `data-action`，在 bindPageEvents 中分发
3. **弹窗内 onclick**: 动态插入 body 的弹窗，使用 `window.fnName` 暴露
4. **CSS 变量**: 必须用 `var(--primary)` 等，禁止硬编码颜色
5. **localStorage**: 先存 localStorage，有 API 时再同步
6. **函数前缀**: 所有 OMP 函数加 `omp_` 前缀，状态挂 `window._ompState`

---

## 代码位置速查

| 内容 | 行号范围 | 函数/变量名 |
|------|---------|------------|
| 数据层 + Mock | ~389-489 | OMP_STORAGE, _ompState, omp_initData, omp_load, omp_save |
| 页面入口 | ~1122-1168 | renderTasks |
| Tab 1 总览 | **缺失** | omp_renderDashboard |
| Tab 2 KPI | ~1170-1281 | omp_renderKPITab |
| Tab 3 工作 | ~1283-1366 | omp_renderTaskTab |
| Tab 4 甘特图 | ~1368-1412 | omp_renderGanttTab |
| 弹窗系统 | ~2662-2930 | omp_openModal, *_Modal 系列 |
| 全局事件 | ~2904-2937 | window.omp_switchTab, saveKpi, saveTask, exportData |
| 事件委托 | ~718-732 | bindPageEvents 中 omp-* case |

---

## Tab 1: 总览看板设计

### 统计卡片 (6 个)
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ KPI平均达成率 │ │  预警KPI数   │ │  工作总数   │ │  工作完成率  │ │  延期工作数  │ │  进行中工作  │
│    91.2%    │ │     3      │ │     6      │ │    33%     │ │     1      │ │     5      │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### KPI 热力图
- 行：部门（销售部、市场部、研发部、客户成功部、HR部）
- 列：BSC 四维度（财务、客户、流程、学习成长）
- 单元格颜色：达成(≥95%)绿色、预警(80-95%)黄色、落后(<80%)红色

### 工作状态分布
- 条形图/饼图展示各状态工作数量

### 预警清单
- 落后 KPI + 延期工作，点击可跳转到对应 Tab

---

## 删除功能设计

1. 在 KPI 表格和操作按钮行添加「删除」按钮
2. 在重点工作表格和操作按钮行添加「删除」按钮
3. 点击删除 → 二次确认弹窗
4. 确认后从 localStorage 移除，刷新当前 Tab
