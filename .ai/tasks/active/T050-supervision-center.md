# T050: 督办中心

> 在经营分析会模块内实现「督办中心」功能，对会议产生的行动项进行全生命周期跟踪（状态管理、进度/闭环说明、逾期催办、跨会议聚合）。
> 当前已完成阶段 1：行动项状态切换与 progressNote 行内编辑。

---

## 当前状态

**已完成 (阶段 1)**:
- [x] 行动项状态配置：`ACTION_STATUS_CONFIG` / `getActionStatusConfig`，支持 3 状态 `pending / in_progress / completed`
- [x] 修复 IIFE 与 ES Module 时序问题：将 `normalizeResolution` / `advanceResolutionStatus` / `canTransitionResolutionStatus` / `createDefaultResolution` 内联到 IIFE，移除对 `<script type="module">` 暴露 `window.fn` 的依赖，避免 `normalizeResolution is not defined/function` 运行时错误
- [x] 修复空占位行动项污染：保存会议时过滤无内容/无负责人的行动项；页面启动迁移时自动清理已持久化的空占位行动项并回写 localStorage
- [x] 「待闭环行动」抽屉静态 badge 替换为 `<select>`，绑定 `updatePendingActionStatus(meetingId, actionIdx, newStatus)`
- [x] 每条行动项增加 progressNote（进度/闭环说明）行内编辑：
  - `openActionNoteEditor(meetingId, actionIdx)` / `saveActionProgressNote(meetingId, actionIdx)` / `cancelActionNoteEdit(meetingId, actionIdx)`
  - 编辑区包含 textarea、取消、保存按钮
- [x] 状态变更后实时刷新：新增 `renderPendingActionsList()` + `refreshPendingActionsList()`，同步更新抽屉列表与标题计数
- [x] 会议详情页行动项下方只读展示 `📝 progressNote`
- [x] XSS 加固：详情页行动项 `content/owner/deadline` 及会议卡片摘要中的行动项字段补充 `escapeHtml`
- [x] E2E 测试：`tests/e2e/meeting-pending-actions.spec.js` 新增 3 个写操作用例（状态切换、编辑进度说明、详情页展示），并增加 afterEach 清理本用例创建的测试行动项

**待完成 / 待修复**:
- [ ] 逾期催办：按 deadline 计算逾期天数，抽屉内增加催办入口（本次不做）
- [ ] 督办工作台独立页面（可选）：将聚合视图从抽屉扩展为独立督办中心页面
- [ ] 版本号升级（如需要）

---

## 技术约束

1. **IIFE 限制**: `src/meetings.html` 主脚本在 IIFE 中，局部函数不能被 `onclick` 访问
2. **事件委托优先**: 列表/表格按钮用 `data-action`，在 `bindPageEvents` 中分发
3. **弹窗/抽屉内 onclick**: 动态插入的弹窗/抽屉，使用 `window.fnName` 暴露函数
4. **CSS 变量**: 必须用 `var(--primary)` 等，禁止硬编码颜色
5. **localStorage**: 会议数据 localStorage + 后端同步，单条行动项作为 `meeting.actions[]` 元素持久化

---

## 代码位置速查

| 内容 | 文件/位置 | 说明 |
|------|----------|------|
| 状态配置与抽屉函数 | `src/meetings.html` ~line 160 | `ACTION_STATUS_CONFIG`、`getActionStatusConfig`、状态/说明编辑函数 |
| 抽屉列表渲染 | `src/meetings.html` ~line 3349 | `renderPendingActionsList()`、状态 `<select>`、progressNote 编辑区 |
| 抽屉 DOM | `src/meetings.html` ~line 3418 | `#pending-actions-drawer`、`#pending-actions-list` |
| 会议详情行动项展示 | `src/meetings.html` ~line 2046 | 详情页行动项卡片，展示进度说明 |
| E2E 测试 | `tests/e2e/meeting-pending-actions.spec.js` | 8 个只读用例 + 3 个写操作用例 |
| 设计文档 | `docs/01-Product产品/经营分析会-功能设计文档.md` | 产品背景 |
| 设计文档 | `docs/01-Product产品/经营分析会-运营中枢-产品设计文档.md` | 运营中枢背景 |

---

## 3 状态体系

```javascript
// 行动项状态
pending      // 待办
in_progress  // 进行中
completed    // 已完成（会从抽屉列表中移除）
```

## 核心数据结构

### 单条行动项

```javascript
{
  id: 'act_xxx',
  content: '行动内容',
  owner: '责任人',
  deadline: '2026-06-30',
  status: 'in_progress',           // pending / in_progress / completed
  progressNote: '进度说明/闭环说明',
  updatedAt: '2026-06-15T10:00:00Z',
  completedAt: '2026-06-15T10:00:00Z',  // 仅 completed 状态有值
  createdAt: '2026-06-01T09:00:00Z'
}
```

---

## 验证结果

- `npx playwright test tests/e2e/meeting-pending-actions.spec.js` → 11 passed
- 会议相关回归 E2E → 21 passed
- `npm run test:unit` → 110 passed
- `npm run build` → 构建通过

## 下一步建议（按优先级）

1. **逾期催办**：根据 deadline 计算逾期天数，抽屉内增加一键催办（发送通知/标记逾期）。
2. **独立督办中心页面**：将聚合视图升级为独立页面，支持更多筛选维度（按负责人、按会议、按逾期状态）。
3. **数据看板**：在驾驶舱或督办中心展示行动项完成率、逾期率等 KPI。
