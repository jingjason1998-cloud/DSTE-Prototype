# T080: 会议材料审核端点迁移到 Cloudflare Worker(方案 B)

> 把会议材料审核的 7 个后端端点从服务器 Flask 服务(meeting-reviewer)迁移到 `api-worker/worker.js`,废弃 Flask 常驻进程依赖,统一后端与密钥管理。
> **状态:已立项,暂缓实施(2026-07-21 用户决定作为后续计划)。**

---

## 背景与动机

- 现状:两套后端并存 —— Cloudflare Worker(`api.dste.jasonxspace.cc`,AI 助手/数据同步)+ 生产服务器 Flask 服务(`127.0.0.1:8766`,材料审核),nginx 按路径分流(见 commit `00869bc`)。
- 痛点:
  - 两份 KMS/Kimi 密钥(Worker `KMS_PAT_TOKEN` vs Flask `.env` 的 `KMS_API_TOKEN`/`KIMI_API_KEY`),Flask 侧 token 过期即功能失效(2026-07-21 已发生一次:KMS 拉取 404)
  - Flask 依赖 systemd 常驻 + `/opt/meeting-reviewer/src/.env`,重启易丢配置
  - Worker 侧 KMS 提取(getKmsPage,带 KV 版本缓存)已更完善
- 迁移收益:一套后端、一份密钥、无需维护服务器进程;上线后 nginx 分流规则可移除,回归整段 `/api/ → Worker`。

---

## 迁移契约(已调研,源自 meeting-material-reviewer/src/proxy_server.py)

前端 `src/pages/reviewer/main.js` 调用以下端点,**响应结构必须逐字段保持一致**:

| 端点 | 逻辑要点 |
|------|---------|
| `POST /api/review` | url + scene → `extract_page_id` → 拉 KMS(`rest/api/content/{id}?expand=body.view,space`,Bearer token,正文截 12000 字)→ FactChecker 事实检查 → 按场景选 prompt 模板 → Kimi → `parse_report` 提取总分/维度分/问题 + 满分截断 + 总分强制等于维度分之和 + `_fix_report_total` 修正报告文本 |
| `POST /api/summary` | KMS 内容 → 300-500 字内容提要 prompt → Kimi |
| `GET /api/scenes` / `GET /api/scenes/<id>` | `scenes.json` + `skills/<scene_id>.md` 作为 prompt_suffix;4 场景:general-topic-review / lagging-region-review / annual-leader-review / 默认 6 维度述职(vertical-segment-review) |
| `POST/GET /api/history`、`DELETE /api/history/<id>`、`DELETE /api/history/clear` | SQLite `review_history` 表;POST 按 url 计数自动递增 version;limit 参数默认 50 |
| `POST /api/batch`、`GET /api/batch/<id>`、`GET /api/batch/<id>/results`、`GET /api/batch/<id>/compare` | SQLite 三表(tasks/results);后台线程串行审核;服务启动时恢复 running 任务;compare 输出 dimension×url 矩阵 |
| `GET/POST /api/config` | kimi_api_key/url/model、api_timeout、max_tokens、temperature;GET 时 API Key 脱敏;持久化到 `api_config.json` |
| `GET /api/health` | `{'status': 'ok', 'service': 'kms-proxy'}`(Worker 已有 /api/health,注意共存) |

Kimi 调用参数:`moonshot-v1-128k`、`max_tokens 12000`、`timeout 120s`、`temperature 0.5`、429 指数退避重试 3 次(20s 起步);报告提取 `<报告>` 标签内容。

---

## 关键设计决策(实施时确认)

- **存储**:history/batch 从 SQLite 迁移到 Worker KV,建议 key 前缀 `review:history:*`、`review:batch:*`;config 存 `review:config`
- **批量任务**:Worker 无后台线程 —— 用 `ctx.waitUntil` + KV 状态机,或 Cloudflare Queues;需保留"中断恢复"语义
- **代码翻译**:`prompt_templates.py`、`fact_checker.py` 需翻译为 JS 模块(放 `api-worker/` 下)
- **时长限制**:Worker 单次请求对 120s Kimi 调用的影响需实测;必要时把 /api/review 也改成异步任务 + 轮询(前端需配合改)
- **场景/Skill 配置**:scenes.json 与 skills/*.md 内置到 Worker 代码或存 KV

## 实施前提

- Worker secrets:`KMS_PAT_TOKEN`(已有)、`KIMI_API_KEY`(已有)
- 响应契约与 Flask 逐字段对齐后,前端 `main.js` 零改动
- 上线步骤:Worker 部署 → 生产实测 7 端点 → 移除 nginx 分流(commit `00869bc` 的 review 分流块)→ 停用 Flask 服务

## 验证清单(实施时)

- 同一份 KMS 材料在 Flask 与 Worker 各跑一次,对比总分/维度分/报告文本一致性
- 批量审核 50 条上限、中断恢复、compare 矩阵
- reviewer E2E:`reviewer-parser.spec.js`、`reviewer-report-render.spec.js` 全过
- 生产 nginx 移除分流后 `/api/review` 仍 200

---

## 关联

- 应急修复(已完成):commit `00869bc` nginx 按路径分流恢复审核
- 故障记录:2026-07-21 KMS_API_TOKEN 失效致 KMS 拉取 404
- Flask 源码:`/Users/jasonjing/meeting-material-reviewer/src/proxy_server.py`(+ `prompt_templates.py`、`fact_checker.py`、`scenes.json`、`skills/`)
