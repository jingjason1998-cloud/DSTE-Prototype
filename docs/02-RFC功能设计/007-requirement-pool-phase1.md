# RFC-007: 需求管理中心 Phase 1 MVP（DSTE 产品迭代版）

> 状态：`approved` | 作者：Claude Code | 日期：2026-06-24

---

## 摘要

将「系统管理 / 需求管理中心」从占位页升级为 DSTE 平台自身的产品需求池，支持需求收集、分析、版本规划和状态跟踪，形成「需求 → RoadMap → 版本 → 开发 → 发布 → 验证」闭环。

---

## 背景

DSTE 战略管理平台 v0.5.5 的侧边栏已预留「需求管理中心」入口（`admin/requirement-pool`），但当前 `cockpit.html` 中仅渲染为占位页，无实际功能。

随着 DSTE 平台功能模块增多（SP、BP、Execute、Review、AI、Admin），产品团队需要一个统一的入口来管理 DSTE 自身的迭代需求：
- 收集内部用户反馈和优化建议
- 跟踪 Bug 和技术债
- 将需求关联到 RoadMap 和版本发布
- 形成产品迭代闭环

本 RFC 聚焦 Phase 1 MVP：实现需求池核心能力。

---

## 目标

1. 提供 DSTE 产品需求的统一收集入口
2. 支持需求的 CRUD、筛选、排序、分页
3. 支持需求状态推进（已收集 → 分析中 → 已规划）
4. 支持需求与目标版本、RoadMap 阶段的关联
5. 提供总览看板，展示需求分布
6. 与现有导航、构建、测试体系无缝集成

---

## 方案设计

### 用户界面

```
┌─────────────────────────────────────────────────────────────┐
│  顶部导航（与 cockpit.html 一致）                            │
├──────────────┬──────────────────────────────────────────────┤
│ 侧边栏       │  需求管理中心                                 │
│              │  ┌────────────────────────────────────────┐  │
│              │  │ 总览看板：总数/待分析/已规划/开发中/待发布│  │
│              │  └────────────────────────────────────────┘  │
│              │  ┌────────────────────────────────────────┐  │
│              │  │ Tab：需求池 | 我的需求 | 版本规划 | 回收站│  │
│              │  └────────────────────────────────────────┘  │
│              │  ┌────────────────────────────────────────┐  │
│              │  │ 筛选栏：状态/类型/来源/优先级/模块/版本/关键词│ │
│              │  └────────────────────────────────────────┘  │
│              │  ┌────────────────────────────────────────┐  │
│              │  │ + 新建需求  需求列表表格  分页器          │  │
│              │  └────────────────────────────────────────┘  │
└──────────────┴──────────────────────────────────────────────┘
```

### 数据结构

```javascript
// 单条需求
{
  id: 'req_abcdef123456',
  reqCode: 'REQ-2026-001',
  title: '优化战略地图画布交互',
  description: '...',
  type: 'OPTIMIZATION',
  source: 'USER_FEEDBACK',
  priority: 'P1',
  status: 'COLLECTED',
  affectedModules: ['SP'],
  targetVersion: '',
  roadmapPhase: '',
  productOwner: '',
  techOwner: '',
  reporter: '张总',
  reporterDept: '战略运营部',
  problem: '当前画布缩放体验不够流畅',
  value: '提升高管使用体验',
  acceptanceCriteria: '画布缩放流畅度达到 60fps',
  businessValue: 4,
  technicalEffort: 3,
  urgency: 3,
  devTaskLink: '',
  releaseNote: '',
  verifiedBy: '',
  verifiedAt: null,
  attachments: [],
  reviews: [],
  createdBy: '张总',
  createdAt: '2026-06-24T10:00:00Z',
  updatedAt: '2026-06-24T10:00:00Z',
  closedAt: null
}
```

### 枚举定义

```javascript
const REQUIREMENT_TYPES = {
  FEATURE: '功能需求',
  OPTIMIZATION: '优化改进',
  BUG: '缺陷修复',
  TECH_DEBT: '技术债',
  COMPETITOR: '竞品对标',
  SECURITY: '安全合规',
  OTHER: '其他'
};

const REQUIREMENT_SOURCES = {
  USER_FEEDBACK: '用户反馈',
  INTERNAL_USER: '内部用户',
  PRODUCT_PLAN: '产品规划',
  TECH_TEAM: '技术团队',
  COMPETITOR: '竞品分析',
  VERSION_AUDIT: '版本审计',
  DATA_DRIVEN: '数据驱动',
  OTHER: '其他'
};

const REQUIREMENT_STATUS = {
  COLLECTED: '已收集',
  ANALYZING: '分析中',
  PLANNED: '已规划',
  DEVELOPING: '开发中',
  PENDING_RELEASE: '待发布',
  RELEASED: '已发布',
  VERIFIED: '已验证',
  CLOSED: '已关闭',
  REJECTED: '已拒绝',
  SUSPENDED: '已挂起'
};

const DSTE_MODULES = {
  dashboard: '驾驶舱',
  sp: '战略制定 (SP)',
  bp: '战略解码 (BP)',
  exe: '战略执行 (Execute)',
  rev: '战略评估 (Review)',
  ai: 'AI 战略助手',
  admin: '系统管理'
};
```

### API 接口（预留）

Phase 1 使用 localStorage + Repository 本地存储，API 接口为后续后端对接预留：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/requirements | 获取需求列表 |
| POST | /api/requirements | 创建需求 |
| PUT | /api/requirements/:id | 更新需求 |
| DELETE | /api/requirements/:id | 删除需求 |
| POST | /api/requirements/:id/reviews | 添加评审记录 |

---

## 替代方案

### 方案 A：在 cockpit.html 内嵌实现

直接在 `cockpit.html` 的 `PAGES` 对象中实现 `renderRequirementPool()`。

**未选原因**：
- `cockpit.html` 已超 4700 行，继续膨胀不利于维护
- 产品需求管理是复杂模块，独立页面更利于代码组织
- 产品文档和功能全景图规划为独立页面 `requirement-pool.html`

### 方案 B：使用现有 OMP 数据体系

复用 `omp_load` / `omp_save` 存储需求数据。

**未选原因**：
- OMP 数据体系面向组织绩效（KPI/重点工作），与产品需求生命周期不同
- 需求管理需要独立的数据版本控制和迁移策略
- 独立 Repository 更清晰，避免污染 OMP 数据

---

## 影响范围

### 新增文件

- `src/requirement-pool.html`
- `src/pages/requirement-pool/main.js`
- `src/pages/requirement-pool/requirement-store.js`
- `src/pages/requirement-pool/requirement-renderer.js`
- `src/pages/requirement-pool/style.css`
- `tests/e2e/requirement-pool.spec.js`
- `docs/02-RFC功能设计/007-requirement-pool-phase1.md`

### 修改文件

- `src/lib/config.js` — `EXTERNAL_PAGES` 增加映射
- `vite.config.js` — 构建入口增加 `requirement-pool`
- `tests/test_integration.py` — 增加导航与结构断言
- `docs/01-Product产品/需求管理中心-产品设计文档.md` — 已更新

### 无影响文件

- `src/cockpit.html` 保持现状，仅通过 `EXTERNAL_PAGES` 跳转
- 现有各阶段模块（SP/BP/Execute/Review/AI）不受影响

---

## 任务拆分

- [x] 更新 PRD `docs/01-Product产品/需求管理中心-产品设计文档.md`
- [x] 编写 RFC-007 `docs/02-RFC功能设计/007-requirement-pool-phase1.md`
- [ ] 创建 `src/requirement-pool.html` 页面骨架
- [ ] 创建 `src/pages/requirement-pool/requirement-store.js` 数据层
- [ ] 创建 `src/pages/requirement-pool/requirement-renderer.js` 渲染层
- [ ] 创建 `src/pages/requirement-pool/main.js` 交互层
- [ ] 创建 `src/pages/requirement-pool/style.css` 样式
- [ ] 更新 `src/lib/config.js` 导航映射
- [ ] 更新 `vite.config.js` 构建入口
- [ ] 编写 E2E 测试 `tests/e2e/requirement-pool.spec.js`
- [ ] 更新 `tests/test_integration.py`
- [ ] 运行回归测试：`npm run build`、`npm run check:scope`、pytest、Playwright

---

## 参考

- `docs/01-Product产品/需求管理中心-产品设计文档.md`
- `docs/01-Product产品/业务专题管理-完整设计方案.md`
- `src/pages/business-topics/main.js`
- `src/business-topics.html`
- `src/lib/repository.js`
- `src/lib/utils.js`
- `docs/04-Guide开发指南/new-page.md`
- `docs/05-Reference参考手册/components.md`
- `docs/05-Reference参考手册/testing.md`
