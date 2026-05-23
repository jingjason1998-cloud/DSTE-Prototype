# DSTE 战略管理平台 — Agent 指引

> 本文档是给 AI 开发助手看的，不是给人类开发者看的。

---

## 项目速览

- **名称**：DSTE 战略管理平台
- **技术栈**：HTML + CSS + JS（Vanilla），Vite 构建
- **测试**：pytest 30 + Playwright E2E 8
- **部署**：nginx + SSL，生产环境 `Dste.fineres.com`

---

## 文档在哪？

**所有文档在 `docs/` 目录下**，用 Diátaxis 框架组织：

```
docs/
├── 00-index.md          ← 从这儿开始看
├── 01-Product产品/          # PRD、路线图、变更日志
├── 02-RFC功能设计/              # 功能设计文档（开发前写）
├── 03-ADR架构决策/              # 架构决策记录
├── 04-Guide开发指南/            # 开发指南（How-to）
├── 05-Reference参考手册/        # 组件、API、规范参考
└── 06-Explanation架构解释/      # 架构、技术栈说明
```

**新功能开发前**，先看 `docs/02-RFC功能设计/000-template.md` 写设计文档。

---

## 开发规范

### 页面开发

1. **SPA 内页面**：代码写在 `src/cockpit.html` 的 `PAGES{}` 渲染函数里
2. **独立页面**：新建 `src/xxx.html`，在 `vite.config.js` 注册入口
3. **样式**：用 CSS 变量（`var(--primary)`），不要硬编码颜色
4. **导航**：在 `src/lib/config.js` 的 `SIDEBAR_CONFIG` 添加项

### cockpit.html 内联事件规范（重要）

`cockpit.html` 的全部 JS 包裹在 IIFE 中，**局部函数无法被 HTML `onclick` 访问**。

**禁止**：
```javascript
function foo() { ... }          // 局部函数
return `<button onclick="foo()">`;  // 运行时报错：foo is not defined
```

**允许的方式（按优先级）**：

1. **优先：事件委托（推荐）**
   ```javascript
   html += `<button data-action="edit" data-id="${id}">编辑</button>`;
   // 渲染后统一绑定
   container.querySelectorAll('[data-action]').forEach(btn => {
     btn.addEventListener('click', handleAction);
   });
   ```

2. **次选：暴露到全局**
   ```javascript
   window.foo = function() { ... };
   return `<button onclick="foo()">`;
   ```

3. **提交前必须运行检查**
   ```bash
   npm run check:scope
   ```

### 测试要求

每个变更必须通过：
```bash
python3 -m pytest tests/          # 结构/内容测试
npx playwright test               # E2E 测试
npm run build                     # 构建测试
```

### 发布前检查清单（v0.3.2 教训）

**自动化测试不够。以下必须人工/脚本验证：**

1. **端到端功能测试**
   -  reviewer.html：实际输入 KMS 链接跑审核，检查评分、打分理由、改进建议、亮点、审核结论是否完整显示
   -  cockpit.html：增删改查会议/议题，检查数据同步
   -  business-topics.html：AI 匹配弹窗是否正常

2. **报告解析函数测试（关键！）**
   ```bash
   npx playwright test tests/e2e/reviewer-parser.spec.js
   ```
   -  测试 `parseDimensionScores`、`parseIssues`、`parseSuggestions`、`parseHighlights`、`parseConclusion` 用模拟报告文本解析
   -  覆盖 markdown 表格、HTML 标签包裹、纯文本列表等多种格式
   -  覆盖通用议题和述职两种场景
   -  **修改维度配置（`getDimensionConfig`）后必须跑这个测试**

3. **报告渲染 E2E 测试（关键！）**
   ```bash
   npx playwright test tests/e2e/reviewer-report-render.spec.js
   ```
   -  mock 后端返回报告，验证前端 DOM 渲染结果
   -  断言：总分、维度得分、改进建议条数、亮点条数、审核结论文字
   -  **任何修改 reviewer.html 报告渲染逻辑后必须跑这个测试**

4. **git diff 全量审查**
   -  修改/删除任何变量或函数后，用 `git diff` 检查所有调用点是否同步更新
   -  特别注意：解析类函数的正则表达式、配置类数据的结构变化

5. **本地 vs 线上对比**
   -  部署后，用同一份测试材料在本地（`npm run preview`）和线上各跑一次
   -  对比评分、报告内容、页面渲染是否完全一致

### 测试文件清单

| 文件 | 类型 | 覆盖范围 | 运行命令 |
|------|------|---------|---------|
| `tests/test_integration.py` | pytest | 结构/内容/导航 | `python3 -m pytest tests/` |
| `tests/e2e/navigation.spec.js` | Playwright | 页面导航、主题切换 | `npx playwright test tests/e2e/navigation.spec.js` |
| `tests/e2e/theme.spec.js` | Playwright | 主题跨页面同步、样式断言 | `npx playwright test tests/e2e/theme.spec.js` |
| `tests/e2e/reviewer.spec.js` | Playwright | reviewer 页面基础功能 | `npx playwright test tests/e2e/reviewer.spec.js` |
| `tests/e2e/reviewer-parser.spec.js` | Playwright | **解析函数单元测试** | `npx playwright test tests/e2e/reviewer-parser.spec.js` |
| `tests/e2e/reviewer-report-render.spec.js` | Playwright | **报告渲染 E2E 测试** | `npx playwright test tests/e2e/reviewer-report-render.spec.js` |

### 历史教训记录

**v0.3.2 reviewer.html 发布事故**
- **原因**：将固定 `DIMENSION_CONFIG` 改为动态 `getDimensionConfig` 时，`parseDimensionScores` 正则仍用 `dim.max` 匹配满分列，但新配置的满分值和报告中的不一致，导致所有维度评分为 0
- **后果**：用户审核后所有维度显示"未识别到评分"，改进建议/亮点/结论全部缺失，报告质量严重下降
- **修复**：正则不再匹配满分列，从报告中提取实际满分；补齐所有场景的 `getDimensionConfig` 配置；修复 `parseIssues` 表头误匹配和 `parseHighlights` 重复触发

### Git 规范

遵循 Conventional Commits：
```
feat: 新增功能
fix: 修复 bug
refactor: 重构
docs: 文档更新
test: 测试更新
```

---

## 多 AI 协作

| 角色 | 职责 | 约束 |
|------|------|------|
| 架构 AI | 集成、路由、部署、审查 | 可以改配置文件 |
| 功能 AI | 独立页面开发 | **不要改** vite.config.js / playwright.config.js / package.json / src/lib/config.js |

给功能 AI 的任务模板见 `docs/04-Guide开发指南/ai-collaboration.md`

---

## 常见问题

**Q：怎么添加一个新页面？**
→ `docs/04-Guide开发指南/new-page.md`

**Q：组件怎么用？**
→ `docs/05-Reference参考手册/components.md`

**Q：测试怎么写？**
→ `docs/05-Reference参考手册/testing.md`

**Q：为什么要这样设计？**
→ `docs/06-Explanation架构解释/architecture.md`
