# DSTE 前端开发规范 — AI 执行版

> **位置**: `DSTE-Prototype/.ai/SKILL.md`
> **版本**: v1.1.0
> **更新**: 2026-05-23

---

## 快速开始（每次开发前读这段）

```
1. 声明范围 → 2. 改代码 → 3. 跑测试 → 4. 构建 → 5. 发布 → 6. 线上验证
```

**底线：测试不过不能发布。发布后再测试 = 用户当小白鼠。**

---

## 第一步：声明变更范围（必须！）

AI 必须先回答：

```
本次变更范围：
- 修改：src/xxx.html（具体功能）
- 新增：tests/e2e/xxx.spec.js（测试）
- 不修改：src/cockpit.html, src/lib/config.js, assets/css/main.css
```

**未声明范围 = 不能开始修改**

---

## 第二步：文件范围检查

```bash
# 检查是否碰了不该碰的文件
node scripts/check-file-scope.js "reviewer" "reviewer.spec.js"

# 如果改了多个模块
node scripts/check-file-scope.js "reviewer" "theme" "cockpit"
```

**阻断规则**：
- 🚨 `config.js`, `vite.config.js`, `package.json` 等 → **不能改**
- ⚠️ `cockpit.html`, `main.css`, `main.js` → **警告，需确认**

---

## 第三步：跑测试（必须看终端输出）

### 3.1 基线测试（Python）

```bash
python3 -m pytest tests/ -v
```

**期望输出**：
```
======================== 30 passed ========================
```

**失败 = 停止，修复后再继续**

### 3.2 E2E 测试（Playwright）

```bash
# 全部跑一遍（推荐）
npx playwright test

# 或只跑相关模块
npx playwright test tests/e2e/reviewer.spec.js
npx playwright test tests/e2e/theme.spec.js
npx playwright test tests/e2e/navigation.spec.js
```

**期望输出**：
```
Running 34 tests using 4 workers
  ✓  reviewer.spec.js:3:1 › ... (2.1s)
  ...
  34 passed (15.3s)
```

**失败 = 停止，修复后再继续**

---

## 第四步：构建验证

```bash
npm run build

# 检查产物
ls dist/
# 应有：index.html, cockpit.html, reviewer.html, business-topics.html, assets/
```

---

## 第五步：自动版本管理 + 发布

**AI 自动执行，无需用户手动操作：**

```bash
# 1. AI 根据功能类型自动选择版本升级
#    - 小功能/修复 → patch (0.3.1 → 0.3.2)
#    - 大功能 → minor (0.3.1 → 0.4.0)
#    - 重大重构 → major (0.3.1 → 1.0.0)

# AI 自动执行：
npm version patch   # 自动修改 package.json + 创建 git tag

# 2. 自动构建（版本号注入页面）
npm run build

# 3. 自动提交
git add -A
git commit -m "[verified] feat: 功能描述"
git push origin main --tags

# 4. 自动部署
npm run deploy
```

**版本号自动显示在页面右下角**（构建时注入）

---

## 第六步：线上验证（2分钟）

打开 https://Dste.fineres.com 检查：

- [ ] 页面能正常打开（无 404/500）
- [ ] 新功能正常工作
- [ ] 导航正常（顶部 + 侧边栏）
- [ ] 主题切换正常（light/dark）
- [ ] 无浏览器控制台报错（F12 → Console）
- [ ] 关键旧功能正常（抽查 2-3 个）

**有问题 → 立即回滚**：

```bash
git revert HEAD
git push origin main
npm run deploy
```

---

## 发布原则

| 功能类型 | 版本升级 | 流程 | 时间 |
|---------|---------|------|------|
| **小功能/修复** | patch (0.3.1 → 0.3.2) | 本地测试 → AI自动升版本 → 发布 | 5分钟 |
| **大功能** | minor (0.3.1 → 0.4.0) | 本地测试 → 多测几遍 → AI自动升版本 → 发布 | 10-15分钟 |
| **紧急修复** | patch | 本地快速验证 → AI自动升版本 → 发布 → 线上确认 | 3-5分钟 |

**用户只需说"发布"，AI 自动：**
1. 判断功能类型 → 选择版本升级策略
2. 执行 `npm version patch/minor`
3. 构建、提交、打 tag、推送、部署
4. 线上验证

**用户不需要手动改版本号。**

---

## 不可妥协

- ✗ 不声明范围就开始修改
- ✗ 修改 `config.js` / `vite.config.js` / `package.json`
- ✗ 顺便修改 `cockpit.html` / `main.css` / `main.js`
- ✗ 不跑全部测试就发布
- ✗ 发布后再测试
- ✗ 接受 AI 口头报告"测试通过了"（必须看终端输出）

---

## 文件位置速查

| 文件 | 位置 |
|-----|------|
| 本规范 | `.ai/SKILL.md` |
| 完整版 Skill | Obsidian: `AI- Skill 文件管理/dste-frontend-testing.md` |
| 文件范围检查脚本 | `scripts/check-file-scope.js` |
| 基线测试 | `tests/` (Python pytest) |
| E2E 测试 | `tests/e2e/` (Playwright) |
| CI 配置 | `.github/workflows/ci.yml` |

---

## 遇到问题？

1. 测试失败 → 看错误信息 → 修复 → 重跑
2. 文件范围检查失败 → 确认是否改了不该改的文件 → 回滚或确认
3. 线上验证失败 → `git revert HEAD` → 重新部署
4. 不确定 → 问用户，不要猜
