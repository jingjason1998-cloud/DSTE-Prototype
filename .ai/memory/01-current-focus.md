# 当前开发焦点

> 更新时间: 2026-06-16 08:08

## 状态
**经营分析会模块 — 评分评价功能已完成**。当前有另一个并行的开发线：
- **经分会-决议中心**：开发到一半，核心状态机与单测已完成，UI 抽屉与旧组件存在状态体系不一致，待继续。
- **会议材料审核功能**：尚未开始，待开发。

## 进行中的开发线

### 经分会-决议中心（高优先级 / 功能主体已完成）
- 状态体系已精简为 3 状态：pending（待审批）/ approved（已通过）/ closed（已闭环），旧状态自动迁移
- `src/meetings/utils/resolution-helpers.js` + 29 个单元测试已通过
- `src/meetings.html` 编辑表单、右侧抽屉 `#decisions-drawer` 均使用 3 状态
- 抽屉内联渲染：3 状态筛选、统计摘要、决议卡片、执行进度、状态流转、审批日志、KMS 链接、跳转源会议
- E2E 测试：`tests/e2e/meeting-decision-edit.spec.js` 已更新，`tests/e2e/resolution-center.spec.js` 新增 3 个用例全部通过
- 断点/恢复见 `08-checkpoint.md`，任务配方见 `.ai/tasks/active/T030-resolution-center.md`

## 刚完成

### RoadMap 新一版迭代 + 周视图看板（Claude 会话，2026-06-16）
- `src/cockpit.html` 的 `renderDevTimeline()` 已按 `docs/01-Product产品/roadmap-优化方案.md` 完成 P0 + P1
- 新增执行摘要 KPI、双栏/单栏布局、版本详情折叠、纵向/横向/周视图三态时间线、全局筛选联动、搜索过滤、优化看板卡片
- 新增「按周看开发进度」看板：按 ISO 自然周展示版本节点、开发计划、upcoming 里程碑
- 更新 `tests/e2e/roadmap.spec.js` 至 14 个用例，全部通过；`npm run build` 通过

## 刚完成 (Kimi 会话)
- **会议评分评价功能（方案 B：AI 推荐 + 人工确认）**
  1. 自动评分算法 `calculateAutoScore(meeting)` — 基于客观数据（metrics/pipeline/decisions/actions）自动计算四项维度推荐分（会前准备/会议讨论/决议质量/执行落地）
  2. 评估录入浮层 — 居中 modal，预填 AI 推荐分，支持逐项滑块微调（0-100）、11 个快捷标签多选、文字评价 textarea
  3. 详情页评估入口 — 左侧信息面板显示评估状态 + 「⭐ 评估会议/重新评估」按钮；内容区新增「⭐ 评估」可折叠 section（综合分大数字 + 4 维度进度条 + 标签 pills + 引用块文字评价）
  4. 列表卡片评估状态 — 已评估显示 ⭐ 分数+等级（颜色区分），未评估显示灰色「未评估」标签
  5. 数据持久化 — `meeting.effectiveness` 字段（overallScore/dimensions/feedback/comment/evaluatedAt），随会议数据一起 localStorage + 后端同步
  6. Playwright E2E 测试 — 新增 `tests/e2e/meeting-evaluation.spec.js`（5 个测试用例全部通过）
  7. 修复既有测试 — `meeting-save-todo.spec.js` 中 `button:has-text("保存")` 因新增「保存评估」按钮导致 strict mode violation，改为 `button[onclick="saveMeeting()"]`

## 已知问题
- `meeting-detail.spec.js` 部分测试偶发失败（元素不可见/点击超时）— 与预览服务器渲染时序有关，非代码回归
- `indicator-system` / `omp-*` / `kpi-tree*` 等测试因硬编码端口 `localhost:4173` 与当前 `vite preview` 端口不一致导致失败 — 已有问题，与本次修改无关

## 下一步
1. **继续经分会-决议中心开发** — 统一抽屉状态体系、补全抽屉交互、更新 E2E 测试（详见 T030）
2. **会议材料审核功能** — 用户提到此前已中断开发，需恢复上下文继续开发
   - 会议材料审核 = 对会议召开前的材料（议程、报告、PPT 等）进行质量审核/打分
   - 与会议评分评价的区别：材料审核是「会前」，评分评价是「会后」
3. **运行全量 Playwright 回归测试确认无新增回归**

## 评分评价数据结构
```javascript
meeting.effectiveness = {
  overallScore: 92,           // 综合分 0-100
  dimensions: {
    preparation: 95,          // 会前准备
    discussion: 90,           // 会议讨论
    decision: 95,             // 决议质量
    execution: 88             // 执行落地
  },
  feedback: ['议程合理', '数据充分', '决议明确'],  // 快捷标签
  comment: '具体评价文字...',                      // 文字评价
  evaluatedAt: '2026-06-10T08:00:00Z'             // 评估时间
}
```

## 关联文档
- 会议评分评价实现文件：`src/meetings.html`（~3440 行）
- 自动评分算法位置：`calculateAutoScore()`（在 `getScoreColor` 之后，`renderMeetingDetail` 之前）
- 评估浮层 DOM：`#meeting-eval-overlay`（body 末尾，z-index 3300）
- 评估 JS 函数：`openMeetingEvalModal` / `closeMeetingEvalModal` / `saveMeetingEvaluation` / `renderEvalForm`
