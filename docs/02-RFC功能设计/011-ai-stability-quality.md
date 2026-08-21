# RFC-011: AI 助手稳定性与质量提升（对标业界 Copilot 工程实践）

> 状态：`approved` | 作者：Kimi | 日期：2026-08-21

---

## 摘要

基于 12 起 AI 生产事故的根因分析，对标业界 copilot 工程实践，分 P0/P1/P2 三批提升 AI 助手的稳定性（错误语义透传、超时/重试对齐、提示词单一来源、反馈闭环）与智能水平（多轮工具调用、工具服务端取数、eval 回归集、模型路由）。

## 背景

2026-07-13 至 2026-08-21 共发生 12 起 AI 相关生产事故，根因分布：

| 根因类别 | 次数 | 典型版本 |
|---|---|---|
| 工具调用协议 | 5 | v0.7.0 / v0.7.19 / v0.7.20 / v0.7.31 / v0.7.32 |
| 上游链路/部署 | 3 | 00869bc / v0.7.6 / v0.7.26 |
| 鉴权 | 2 | v0.6.9 / 102c08f |
| 会话管理（污染持久化） | 2 | v0.7.22 / v0.7.32 |
| 提示词/幻觉 | 1 | v0.7.31（部分） |
| 前端渲染 | 1 | v0.6.8 |

三个反复出现的模式：

1. **同一症状复发 4 次**：Worker 把 Kimi 所有错误（400/401/429/5xx）一律映射为 502（`worker.js handleChat`），前端不区分，每次都要 `wrangler tail` 现抓日志才能诊断。
2. **一次性错误被 localStorage 放大成永久故障**：污染会话历史反复重发（v0.7.22 清 key、v0.7.32 清洗自愈，均已修）。
3. **协议类 bug 全靠用户发现**：所有测试 mock 网络层，真实 Kimi 的协议校验（空 content、tool_call 配对、id 唯一）无回归守护。

### 现状关键事实（代码调查 2026-08-21）

- Worker 错误响应一律 502，上游状态码与错误详情被抹平（仅日志可见）。
- 超时被吞：UI 层把 `AbortError` 一律当用户取消静默 return（GlobalAiDrawer.js、MeetingAiAssistant.js），60s 超时后用户无任何提示。
- 超时错配：前端 chat 60s / agenda 29s；Worker 单次 29s × 最多 4 次 ≈ 116s，前端放弃后 Worker 仍在重试（重复扣费）。
- 前端 `fetchWithRetry` 不重试 AbortError → 超时永不重试。
- 前端传的 `temperature` 被 Worker 静默丢弃（handleChat body 未透传）。
- 降级/mock 为死代码：`response.mock` 与「【mock 模式】」检测无真实触发路径。
- 提示词 4 处重复且已漂移：`ai-prompts.js` vs `worker.js AI_AGENDA_PROMPT` vs `TopicAiChat.js` 硬编码 vs `MeetingAiAssistant.js` 死代码。
- 👍/👎 反馈只写 localStorage 从不上报，`promptHash` 恒为 `h_0`（调用方未传 prompt）。
- telemetry 日志写 KV 只进不出，无聚合/读取端点。
- `callWithTools` 第二轮 `tools: []`，多轮工具调用断裂；GlobalAiDrawer 与 MeetingAiAssistant 两套工具轮实现不一致。
- queryMeeting* 工具回显前端 localStorage 缓存（`context.meeting`），不查 KV。
- marketing-budget AI 分析读 `res.content || res.text || res.message`，但 Worker 非流式返回 `{success, ...Kimi原始响应}`（choices 嵌套），疑似恒显示「AI 未返回有效内容」并污染 1h 缓存。
- 生产环境 AI 端点无鉴权（`AI_AUTH_REQUIRED=false` + Origin 白名单），属既有遗留，恢复 CAS 时一并回改，不在本 RFC 范围。

## 目标

1. **错误可诊断**：上游错误分类透传到 UI，同类事故诊断时间从「抓 tail」降到「看界面」。
2. **失败可恢复**：超时/限流自动重试且对用户可见；不再出现静默失败。
3. **质量可度量**：用户反馈真实上报，沉淀 bad case 数据集，为 eval 与提示词迭代提供输入。
4. **能力更完整**：多轮工具调用不断裂；工具数据来自服务端权威存储。

## 方案设计

### P0 稳定性快充（本 RFC 执行范围）

#### P0-1 错误分类透传

Worker `handleChat` / `handleAiAgendaRecommend` / `handleToolsExecute` 错误响应改为：

```json
{
  "error": "人类可读信息",
  "errorType": "auth | ratelimit | invalid_request | upstream | timeout | internal",
  "upstreamStatus": 400
}
```

分类规则：Kimi 401/403 → `auth`；429 → `ratelimit`；400/422 → `invalid_request`；5xx → `upstream`；AbortError → `timeout`；其余 → `internal`。HTTP 状态码保持 502/504 不变（兼容旧前端）。

前端 `AIError` 增加 `errorType` 字段；`AIClient._post`/`streamChat` 解析响应体填入。UI 层按分类显示可操作建议：

| errorType | 用户提示 |
|---|---|
| auth | AI 服务鉴权失效，请联系管理员 |
| ratelimit | AI 服务繁忙，请稍后重试 |
| invalid_request | 会话内容异常，已自动开启新会话 |
| upstream / timeout | AI 服务响应异常，请重试 |

`invalid_request` 时前端自动新建会话并重试一次（坏历史不再反复重发）。

#### P0-2 超时对齐 + 超时可重试

- Worker `fetchWithRetry`（调 Kimi）：单次超时 29s → 25s，重试 3 → 2，总预算 ≤ ~55s < 前端 60s。
- 前端区分「用户主动取消」与「超时」：`AIClient` 内部超时用独立 AbortController，外部 signal 仅表示用户取消；`fetchWithRetry` 对内部超时触发的 abort 按 5xx 同等策略重试，对用户取消立即抛出。
- UI 层只在「用户取消」时静默；超时走完重试仍失败的，按 errorType=timeout 提示。

#### P0-3 temperature 透传 + 提示词收敛

- Worker `handleChat` 透传 `temperature`（白名单 0~1.5，越界回退默认 0.6）。
- 删除 `MeetingAiAssistant.js` 死代码 `buildMeetingSystemPrompt`（未被调用，与 ai-prompts.js 重复）。
- `TopicAiChat.js` 硬编码 `SYSTEM_PROMPT` 改用 `ai-prompts.js buildTopicAiPrompt`。
- Worker `AI_AGENDA_PROMPT` 与 `ai-prompts.js buildAgendaRecommendPrompt` 对齐为同一内容（Worker 为权威执行方，前端版本标注「仅供查阅，以 Worker 为准」或删除前端版本，视调用方实际情况定）。
- `ai-context.js buildSystemPrompt` 与 `buildGlobalSystemPrompt` 二选一，删除未被引用者。

#### P0-4 反馈上报 + promptHash 修复

- `AiFeedbackBar` 提交时经 `/api/ai/log` 上报（复用 telemetry 批次通道，事件 type=`feedback`），localStorage 保留作本地副本。
- 两个调用方（GlobalAiDrawer、MeetingAiAssistant）传入 `prompt`（用户最后一条消息），`promptHash` 用简易 hash（djb2）计算，不再恒为 `h_0`。

#### P0-5 marketing-budget 响应解析修复

- 复现确认后修复 `src/pages/marketing-budget/main.js` AI 分析响应解析：兼容 Worker 非流式真实返回结构（`choices[0].message.content`）；解析失败不写缓存，避免空结果污染 1h/24h 缓存。

### P1 结构性提升（本 RFC 登记，后续排期）

- **P1-1 多轮工具调用 loop**：`callWithTools` 支持最多 3~5 轮工具调用直至模型给出最终回答；统一 GlobalAiDrawer 手写流式工具轮与 MeetingAiAssistant `callWithTools` 两套实现。
- **P1-2 工具服务端取数**：queryMeeting* 改读 Worker KV（meetingId → KV 查询），前端 `context.meeting` 仅作无 KV 数据时的 fallback。
- **P1-3 日志聚合端点 + 极简看板**：`/api/ai/stats` 聚合 KV 日志（成功率、P95 延迟、errorType Top N），挂到系统管理分组。
- **P1-4 Eval 回归集**：把 12 起事故固化成真实调用 Kimi 的 smoke eval（脚本化，发版前手动/CI 跑），覆盖：空 content、tool_call 配对、id 唯一、多轮工具调用、agenda JSON schema。

### P2 聪明的上限（方向登记）

- 模型路由：简单问答走快模型、复杂分析走 k2.7；RFC-008 Phase 2 多 Agent 编排。
- 会话存服务端 KV（跨设备连续，杜绝 localStorage 污染类问题）。
- `#admin/ai-stats` 侧边栏入口（P1-3 页面已可经 hash 直达，入口待 `src/lib/config.js` 无并行改动后补登）。

## 替代方案

- **直接上 LangSmith/Helicone 等第三方观测**：需要外发 prompt 数据到第三方，涉内部经营数据，暂不接受；先用自建 KV 日志聚合（P1-3）覆盖核心需求。
- **会话立即迁服务端 KV**：收益明确但改动面大（会话管理、迁移、多端同步），放 P2；P0 的清洗+自动新会话已消除永久故障模式。
- **提示词集中到 Worker 统一管理**：前端流式场景需要本地拼 system prompt，完全收拢不现实；P0-3 先消除重复与漂移。

## 影响范围

- 修改：`api-worker/worker.js`、`src/lib/ai-client.js`、`src/lib/fetch-retry.js`、`src/lib/ai-error.js`、`src/lib/ai-telemetry.js`、`src/components/GlobalAiDrawer.js`、`src/components/AiFeedbackBar.js`、`src/meetings/components/MeetingAiAssistant.js`、`src/strategy-topics/components/TopicAiChat.js`、`src/lib/ai-prompts.js`、`src/pages/marketing-budget/main.js`
- 测试：`tests/unit/ai-client.test.js`、`tests/unit/fetch-retry.test.js` 等补用例；相关 E2E 回归
- 不修改：`vite.config.js`、`package.json`、`src/lib/config.js`、cockpit.html（RFC-010 未提交改动不受影响）
- 导航/侧边栏：P0 无变化；P1-3 看板后续加系统管理入口

## 任务拆分

- [x] T1 P0-1 Worker 错误分类 + 前端 AIError/errorType + UI 分类提示 + invalid_request 自动新会话
- [x] T2 P0-2 超时对齐（Worker 25s×2）+ 前端超时/取消区分 + 超时可重试
- [x] T3 P0-3 temperature 透传 + 提示词收敛（删死代码、TopicAiChat 接共享库）
- [x] T4 P0-4 反馈上报 + promptHash 修复
- [x] T5 P0-5 marketing-budget 响应解析修复（已确认为真 bug：Worker 返回 choices 嵌套结构，原代码恒读不到正文且污染缓存）
- [x] T6 单元测试补齐 + pytest/lint/check:scope/build 全套验证（unit 622 / pytest 221 / lint 0 error / AI 相关 E2E 18/18）
- [x] T7 发版（P0 已随 v0.7.34 发布；P1 随 v0.7.35）
- [x] T8 P1-1 多轮工具调用 loop（`AIClient.runToolLoop`，callWithTools 与 GlobalAiDrawer 共用；maxToolRounds=4，最后一轮强制收尾）
- [x] T8 P1-2 工具服务端取数（queryMeeting* 优先读 KV `dste_meetings_v1`，context.meeting 回退，返回 `source` 字段标识来源）
- [x] T8 P1-3 `/api/ai/stats` 聚合端点（成功率/P95/errorType 分布/端点分布/14 天趋势/反馈计数）+ cockpit 内部页 `#admin/ai-stats`（侧边栏入口待 config.js 无并行改动后补）
- [x] T8 P1-4 smoke eval：`scripts/ai-smoke-eval.mjs` 10 用例真实调 Kimi（覆盖 v0.7.0/0.7.19/0.7.32/0.7.34 事故回归 + 契约用例），用法 `node scripts/ai-smoke-eval.mjs [baseUrl]`，发版前手动跑

## 参考

- 事故史汇总：`.ai/memory/06-session-log.md`（2026-07-13 ~ 2026-08-21 共 12 起）
- 统一 AI 底座设计：`docs/02-RFC功能设计/008-ai-strategic-partner-global-design.md`
- 业界对标：LangSmith/Helicone 全链路追踪、OpenAI function calling 协议校验语义、GitHub Copilot 错误分类 UX
