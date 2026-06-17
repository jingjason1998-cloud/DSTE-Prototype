# T030: 经分会-决议中心

> 在经营分析会模块内实现「决议中心」功能，对会议产生的决议进行全生命周期管理（状态流转、审批、执行跟踪、逾期提醒、跨会议聚合）。
> 当前功能主体已完成，状态体系已精简为 3 个状态。

---

## 当前状态

**已完成**:
- [x] 新状态机设计：3 状态体系（pending / approved / closed），旧 9 状态自动迁移到这 3 个状态
- [x] 纯函数工具模块 `src/meetings/utils/resolution-helpers.js`
- [x] 单元测试 `tests/unit/resolution-helpers.test.js`（31 个用例全部通过）
- [x] `src/meetings.html` 内联引入新状态机逻辑（已移动到 IIFE 顶部，line ~169 附近）
- [x] 决议编辑表单升级到 9 状态体系，新增来源议题 ID / 审批人字段
- [x] 新增决议后自动迁移 + 同步到 `dste_resolutions_v2`
- [x] 右侧决议中心抽屉 HTML 结构（`#decisions-drawer`），顶部 KPI「决议总数」可打开抽屉
- [x] 抽屉内联渲染逻辑：3 状态筛选 pills、统计摘要、决议卡片列表、执行进度条、状态 badge 切换、KMS 链接、跳转源会议
- [x] 删除会议详情页原「✅ 决议跟踪」全量表格，避免与决议中心抽屉功能重复
- [x] 状态推进功能：点击状态 badge 出现下拉选择，选中即调用 `advanceResolutionStatus` 自动保存并同步（只保留一个状态变更入口）
- [x] 审批日志展示：可折叠查看每条决议的审批历史
- [x] 废弃旧组件 `public/meetings-components/DecisionsDrawer.js` 引用
- [x] E2E 测试：`meeting-decision-edit.spec.js` placeholder 从「决策人」改为「责任人」
- [x] 新增 E2E 测试 `tests/e2e/resolution-center.spec.js`（3 个用例全部通过）

**待完成 / 待修复**:
- [ ] 让 meetings.html 真正以 `<script type="module">` 引入 `resolution-helpers.js`，消除内联副本的代码重复（当前为兼容 IIFE 先内联，后续可重构）
- [ ] 确认旧 localStorage 数据迁移在实际用户数据中无异常
- [ ] 版本号升级（如需要）

---

## 技术约束

1. **IIFE 限制**: `src/meetings.html` 主脚本在 IIFE 中，局部函数不能被 `onclick` 访问
2. **事件委托优先**: 列表/表格按钮用 `data-action`，在 bindPageEvents 中分发
3. **弹窗/抽屉内 onclick**: 动态插入的弹窗/抽屉，使用 `window.fnName` 暴露函数
4. **CSS 变量**: 必须用 `var(--primary)` 等，禁止硬编码颜色
5. **localStorage**: 决议聚合存储键为 `dste_resolutions_v2`，单条决议随会议数据一起 localStorage + 后端同步
6. **模块引用**: `resolution-helpers.js` 是 ES Module，非 module 脚本无法直接 import，需处理兼容性

---

## 代码位置速查

| 内容 | 文件/位置 | 说明 |
|------|----------|------|
| 状态机工具模块 | `src/meetings/utils/resolution-helpers.js` | 纯函数 ES Module，31 个单测覆盖 |
| 单元测试 | `tests/unit/resolution-helpers.test.js` | vitest |
| 内联状态机函数 | `src/meetings.html` ~line 169 | 与模块几乎一致的副本，已移到 IIFE 顶部 |
| 决议编辑表单 | `src/meetings.html` ~line 2880 | 9 状态选项、来源议题、审批人 |
| 决议中心抽屉 DOM + 渲染 | `src/meetings.html` ~line 3260 | `#decisions-drawer`、状态筛选、卡片、流转、日志 |
| 旧抽屉组件（public） | `public/meetings-components/DecisionsDrawer.js` | **已废弃引用**，保留文件但不再加载 |
| 旧抽屉组件（src） | `src/meetings/components/DecisionsDrawer.js` | 保留文件但不再加载 |
| E2E 测试（编辑） | `tests/e2e/meeting-decision-edit.spec.js` | `决策人` → `责任人` |
| E2E 测试（抽屉） | `tests/e2e/resolution-center.spec.js` | 9 状态筛选、状态流转 |
| 设计文档 | `docs/01-Product产品/经营分析会-功能设计文档.md` | 产品背景 |
| 设计文档 | `docs/01-Product产品/经营分析会-运营中枢-产品设计文档.md` | 运营中枢背景 |

---

## 3 状态体系

```javascript
// 正常流转
pending → approved → closed

// 终止态
TERMINAL_STATUSES = ['closed']

// 旧状态迁移
pending / pending_approval / draft → pending
approved / executing → approved
closed / archived / rejected / vetoed / aborted / implemented → closed
```

---

## 核心数据结构

### 单条决议（normalized）

```javascript
{
  id: 'res_xxx',
  title: '决议标题',
  content: '决议内容',
  status: 'executing',           // 9 状态之一
  owner: '责任人',
  approver: '审批人',
  sourceMeetingId: 'mtg_xxx',
  sourceMeetingTitle: '经营分析会 6月',
  sourceTopicId: 'topic_xxx',    // 来源议题 ID
  dueDate: '2026-06-30',
  actions: ['act_xxx'],          // 关联行动项 ID 列表
  progress: 65,                  // 0-100
  approvalLogs: [
    { action: 'submit', from: 'draft', to: 'pending_approval', user: '张三', comment: '', timestamp: '...' }
  ],
  createdAt: '...',
  updatedAt: '...'
}
```

### 聚合存储

```javascript
// localStorage key: dste_resolutions_v2
{
  resolutions: { [resId]: resolution },
  version: 2,
  syncedAt: '...'
}
```

---

## 下一步建议（按优先级）

1. **决策抽屉架构**：先决定是升级旧组件还是废弃它内联到 meetings.html。
   - 推荐：废弃旧组件，将抽屉渲染逻辑内联到 meetings.html，与现有内联状态机函数保持一致，避免两处维护。
2. **统一状态标签**：抽屉内的状态筛选、列表渲染、操作按钮全部切换到 9 状态。
3. **补全抽屉交互**：状态筛选 tabs、状态推进按钮（需校验 `canTransitionResolutionStatus`）、审批日志折叠展示、跳转源会议。
4. **模块引用改造**：把 meetings.html 的内联副本替换为 `<script type="module">` 引入 `resolution-helpers.js`，注意 IIFE 与 module 的兼容。
5. **更新 E2E 测试**：修复 `meeting-decision-edit.spec.js`，新增状态流转测试。
6. **跑全量回归**：`npm run test:unit && npm run test:e2e`。
