# DSTE 平台健康度检查指南

> **位置**: `.ai/HEALTH-CHECK.md`
> **版本**: v1.0.0
> **更新**: 2026-05-23

---

## 体检体系架构

DSTE 平台采用**三层体检体系**，结合行业标准工具和定制化检查：

```
┌─────────────────────────────────────────────────────────────┐
│  第一层：自动化代码质量（每次提交）                            │
│  SonarQube Cloud + ESLint Security + GitHub Actions         │
│  → 代码质量评级、Bug、漏洞、技术债务                          │
├─────────────────────────────────────────────────────────────┤
│  第二层：定制化产品体检（每周/每月）                          │
│  scripts/health-check.cjs                                   │
│  → 功能覆盖度、架构健康度、AI协作规范                         │
├─────────────────────────────────────────────────────────────┤
│  第三层：人工架构审查（每季度）                               │
│  架构师/技术负责人                                           │
│  → 设计合理性、业务逻辑、长期规划                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 第一层：SonarQube 代码质量（自动化）

### 配置说明

- **配置文件**: `sonar-project.properties`
- **CI 配置**: `.github/workflows/sonar.yml`
- **质量门禁**（需在 SonarQube Cloud Web UI 配置）：
  - Bugs = 0
  - Vulnerabilities = 0
  - Code Smells < 50
  - Duplications < 5%
  - Cognitive Complexity < 15/函数
  - Coverage > 60%（长期目标）

### 查看报告

1. 访问 [SonarQube Cloud](https://sonarcloud.io)
2. 搜索项目 `dste-platform`
3. 查看质量评级（A-E）和技术债务天数

---

## 第二层：定制化产品体检（手动运行）

### 运行方式

```bash
# 运行定制化体检
node scripts/health-check.cjs

# 或添加到 package.json
npm run health:check
```

### 检查维度

| 维度 | 说明 | 阈值 |
|-----|------|------|
| **代码规模** | 文件行数检查 | HTML < 500行 |
| **功能覆盖度** | PRD功能实现比例 | > 80% |
| **架构耦合** | 模块引用频次 | < 50次/模块 |
| **重复代码** | 跨文件重复模式 | < 20次 |
| **代码异味** | alert/innerHTML等 | < 10处 |
| **AI协作规范** | Skill/脚本/CI存在性 | 全部存在 |
| **测试覆盖** | 测试文件数量 | 有单元测试 |
| **版本同步** | package.json与页面一致 | 一致 |

### 与 SonarQube 的分工

| 检查项 | SonarQube | 定制化体检 |
|-------|-----------|-----------|
| 代码质量评级 | ✅ A-F | ❌ |
| Bug检测 | ✅ 自动 | ❌ |
| 漏洞检测 | ✅ OWASP | ⚠️ ESLint Security |
| 技术债务 | ✅ 天数 | ❌ |
| 认知复杂度 | ✅ 精确 | ❌ 粗略 |
| 功能覆盖度 | ❌ | ✅ PRD对比 |
| Placeholder检测 | ❌ | ✅ |
| AI协作规范 | ❌ | ✅ |
| 版本同步 | ❌ | ✅ |
| 架构耦合 | ❌ | ✅ |

---

## 第三层：人工架构审查（每季度）

### 审查清单

- [ ] 技术栈是否仍适合业务需求
- [ ] 架构是否支持未来6个月的功能规划
- [ ] 性能瓶颈是否出现
- [ ] 安全策略是否需要更新
- [ ] 团队开发效率是否受影响

---

## 体检频率建议

| 层级 | 频率 | 触发条件 | 负责人 |
|-----|------|---------|--------|
| SonarQube | 每次提交 | push/PR | 自动 |
| ESLint Security | 每次提交 | push/PR | 自动 |
| 定制化体检 | 每周 | 手动/定时 | AI/开发者 |
| 人工审查 | 每季度 | 计划会议 | 技术负责人 |

---

## 质量门禁（Quality Gate）

### 新代码门禁（PR时必须通过）

```
✅ SonarQube 质量门禁通过
✅ ESLint 无 Error
✅ pytest 基线测试通过
✅ Playwright E2E 测试通过
✅ 定制化体检无 🔴 危险项
```

### 发布门禁（发布前必须通过）

```
✅ 所有PR门禁通过
✅ SonarQube 整体评级 >= C
✅ 定制化体检通过 >= 70%
✅ 功能覆盖度 >= 60%
✅ 线上验证通过
```

---

## 历史趋势追踪

建议每月记录以下指标，追踪质量变化：

```markdown
# DSTE 健康度历史记录

## 2026-05
- SonarQube 评级: ?
- 技术债务: ?天
- 功能覆盖度: 47%
- 代码异味: 87处 innerHTML
- 测试覆盖: 3.8%

## 2026-06（目标）
- SonarQube 评级: C
- 技术债务: <10天
- 功能覆盖度: 60%
- 代码异味: <50处
- 测试覆盖: 20%
```

---

## 问题排查

### SonarQube 扫描失败

```bash
# 检查 SONAR_TOKEN 是否配置
cat .github/workflows/sonar.yml

# 在 GitHub Settings → Secrets → Actions 中添加 SONAR_TOKEN
# 获取方式: https://sonarcloud.io → My Account → Security → Generate Tokens
```

### ESLint Security 报错

```bash
# 查看安全规则详情
npx eslint . --format stylish

# 自动修复部分问题
npx eslint . --fix
```

### 定制化体检失败

```bash
# 查看具体失败项
node scripts/health-check.cjs

# 根据输出逐项修复
```

---

## 相关文件

| 文件 | 作用 |
|-----|------|
| `sonar-project.properties` | SonarQube 配置 |
| `.github/workflows/sonar.yml` | SonarQube CI |
| `.eslintrc.js` | ESLint + Security 规则 |
| `scripts/health-check.cjs` | 定制化体检脚本 |
| `.ai/SKILL.md` | AI 开发规范 |
| `.ai/HEALTH-CHECK.md` | 本文件 |
