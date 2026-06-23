# T070: 存储架构优化

> 为 DSTE 前端数据提供统一的存储抽象层：版本化 Repository、自动备份/恢复、离线同步队列、冲突解决，逐步替换各页面散落的 `localStorage` 直接读写。

---

## 当前状态

**已完成（基础层）**：
- [x] 统一 Storage 工具增强：`src/lib/utils.js` 增加配额检测 `checkQuota()`、数据大小估算 `estimateSize()`、配额不足时 `showToast` 提示
- [x] Repository 抽象层：`src/lib/repository.js`
  - 统一的 `get/getRaw/set/migrate/backup/restore/pruneBackups/getHealth`
  - schema 校验（array/object），损坏数据安全回退到 default
  - 版本迁移链 + 自动备份
  - 工厂函数：`createMeetingsRepository`、`createOmpRepository`、`createStrategyMapRepository`
- [x] 迁移与备份工具：`src/lib/migration-utils.js`
  - `createBackup` / `restoreFromBackup` / `cleanupOldBackups`
  - `attemptMigration` / `migrateWithBackup`
  - 统一备份键命名：`dste_backup_{namespace}__{version}__{timestamp}_{seq}`
- [x] 备份管理器：`src/lib/backup-manager.js`
  - 全量 `exportAll` / `importAll`（支持 overwrite/merge 模式）
  - `downloadBackup` / `importFromFile`
  - `autoBackup` / `restoreLatest` / `listBackups`
  - 自动排除敏感键：`dste-token`、`dste-user`、`dste_api_base`
- [x] 离线同步队列：`src/lib/sync-queue.js`
  - `enqueue` + 最近同 endpoint 操作合并
  - 指数退避重试：`retryDelays = [1s, 5s, 15s, 60s, 300s]`
  - `bindAutoProcess`：自动监听 `online` / `visibilitychange` / `beforeunload`
  - `getStatus` / `clearFailed` / `clear`
- [x] 冲突解决器：`src/lib/conflict-resolver.js`
  - 基于 `lastModified` 的 `detectArrayConflicts`
  - `promptConflictResolution` 弹窗 UI
  - `resolveArrayConflict`：local/remote/merge 策略
  - `ensureLastModified`
- [x] 会议数据 Store 重构：`src/meetings/data-store.js`
  - 使用 `createMeetingsRepository` 管理 `dste_meetings`
  - 使用 `SyncQueue` 推送 `/api/meetings`
  - 使用冲突解决器合并本地与远程数据
  - `initDataStore`：损坏回退 → 备份恢复 → 版本迁移 → mock/空数据
  - `migrateMeetingsData`：补齐 agenda 新字段、决议状态迁移、清理旧评分模型、规范化 action
- [x] OMP 数据接入 Repository：`src/cockpit.html` 使用 `createOmpRepository` 管理 OMP 实体存储与版本
- [x] 单测：`tests/unit/storage.test.js`、`repository.test.js`、`backup-manager.test.js`、`sync-queue.test.js`、`conflict-resolver.test.js`、`migration-utils.test.js` 共 52 个全部通过
- [x] E2E：`tests/e2e/meetings-corruption.spec.js`、`tests/e2e/omp-migration-safety.spec.js` 共 4 个全部通过

**待完成 / 下一步**：
- [ ] 将 Repository 模式扩展到 `strategy-map`、`business-topics`、`reviewer` 等模块，替换散落 localStorage 操作
- [ ] 在驾驶舱或系统管理增加「存储健康/备份管理」入口：显示配额使用、备份列表、手动导出/导入
- [ ] SyncQueue 真正接入 Worker API，验证离线→在线端到端同步
- [ ] 评估是否需要统一的存储健康后台任务（定时清理过期备份、配额预警）

---

## 技术约束

1. **localStorage 是主要存储介质**：所有设计围绕 localStorage 的容量/同步限制展开
2. **向后兼容**：任何版本升级必须通过 `migrators` 链完成，不能破坏旧数据
3. **破坏性操作先备份**：`migrateWithBackup`、`importAll(autoBackup=true)` 必须保留回退点
4. **敏感数据不导出**：`dste-token`、`dste-user`、`dste_api_base` 禁止进入备份包
5. **运行时单一事实来源**：`window._meetingsData` 仍作为会议页面运行时数据源

---

## 代码位置速查

| 内容 | 文件 | 说明 |
|------|------|------|
| Storage 工具 | `src/lib/utils.js` | `Storage.get/set/setString/remove/getKeys/checkQuota/estimateSize` |
| Repository 抽象 | `src/lib/repository.js` | 统一版本/迁移/备份/健康检查入口 |
| 迁移与备份 | `src/lib/migration-utils.js` | 备份键管理、迁移链、清理 |
| 备份管理器 | `src/lib/backup-manager.js` | 全量导出/导入、下载/上传 |
| 同步队列 | `src/lib/sync-queue.js` | 离线变更队列与自动重试 |
| 冲突解决 | `src/lib/conflict-resolver.js` | 本地/远程冲突检测与 UI |
| 会议数据 Store | `src/meetings/data-store.js` | 会议模块统一数据初始化与持久化 |
| OMP Repository 接入 | `src/cockpit.html` ~line 417 | `createOmpRepository` 导入与 OMP 初始化 |
| Repository 单测 | `tests/unit/repository.test.js` | 读写/迁移/备份/恢复/健康检查 |
| 备份管理单测 | `tests/unit/backup-manager.test.js` | 导出/导入/排除敏感键 |
| 同步队列单测 | `tests/unit/sync-queue.test.js` | 入队/合并/重试/自动处理 |
| 冲突解决单测 | `tests/unit/conflict-resolver.test.js` | 时间戳比较/冲突检测/合并策略 |
| 迁移工具单测 | `tests/unit/migration-utils.test.js` | 备份键解析/迁移链/清理 |
| Storage 单测 | `tests/unit/storage.test.js` | `Storage` 工具配额/大小估算 |
| E2E 存储韧性 | `tests/e2e/meetings-corruption.spec.js` | 损坏回退、版本持久化 |
| E2E OMP 迁移安全 | `tests/e2e/omp-migration-safety.spec.js` | 版本升级不丢数据、旧备份键清理 |

---

## 核心概念

### Repository 配置示例

```javascript
const repo = new Repository('meetings', {
  storageKey: 'dste_meetings',
  schema: 'array',
  version: 3,
  maxBackups: 5,
  migrators: {
    3: (data) => { /* ... */ return data; },
  },
});
```

### 备份键格式

```
dste_backup_{namespace}__{version}__{timestamp}_{seq}
// 示例
dste_backup_meetings__3__2026-06-23T17_30_00.000Z_1
```

### 同步队列使用

```javascript
import { getDefaultSyncQueue } from '../lib/sync-queue.js';

const queue = getDefaultSyncQueue();
queue.enqueue({
  endpoint: '/api/meetings',
  method: 'POST',
  payload: meetings,
  executor: async (op) => { /* fetch ... */ },
});
```

---

## 验证结果

- `npm run test:unit` → 213 passed
- `npx playwright test tests/e2e/meetings-corruption.spec.js tests/e2e/omp-migration-safety.spec.js` → 4 passed
- `npm run build` → 构建通过
- `npm run check:scope` → 通过

## 下一步建议（按优先级）

1. **Repository 接入 strategy-map / business-topics / reviewer**：替换现有直接 `localStorage` 读写，统一版本和迁移能力。
2. **存储健康管理 UI**：在驾驶舱「系统管理」分组新增「数据与备份」页面，展示配额、备份列表、一键导出/导入。
3. **端到端同步验证**：让 SyncQueue 真正调用 Worker API，测试离线编辑后恢复网络能否正确同步。
4. **定期清理策略**：评估备份保留时长、失败同步项上限，是否需要定时任务自动清理。
