# DSTE 前端测试规范 — 完整版

> **位置**: `DSTE-Prototype/.ai/skills/dste-frontend-testing.md`
> **版本**: v1.1.0
> **说明**: 完整版 Skill，包含详细规则、检查清单、陷阱对策

---

## 完整内容

参见 Obsidian 笔记库：`AI- Skill 文件管理/dste-frontend-testing.md`

或访问：`.ai/SKILL.md`（精简执行版）

---

## 核心保护文件（CRITICAL）

| 文件 | 原因 |
|------|------|
| `src/lib/config.js` | 导航配置、侧边栏、外部页面映射 |
| `src/lib/shell.js` | 共享 Shell 逻辑 |
| `vite.config.js` | 构建入口配置 |
| `package.json` | 依赖和脚本 |
| `playwright.config.js` | 测试配置 |
| `index.html` | 主入口 |

**触碰 = 阻断**

---

## 主线模块（HIGH）

| 文件 | 原因 |
|------|------|
| `cockpit.html` | 驾驶舱主页 |
| `assets/css/main.css` | 全局样式 |
| `assets/js/main.js` | 全局脚本 |

**触碰 = 警告，需用户确认**

---

## 检查清单

### 发布前检查清单

- [ ] 已声明变更范围
- [ ] 文件范围检查通过
- [ ] pytest 30+ 测试通过
- [ ] Playwright 34+ 测试通过
- [ ] 构建成功
- [ ] 已提交代码
- [ ] 已部署

### 线上验证检查清单

- [ ] 页面能正常打开
- [ ] 新功能正常工作
- [ ] 导航正常
- [ ] 主题切换正常
- [ ] 无控制台报错
- [ ] 关键旧功能正常

---

## 回滚命令

```bash
git log --oneline -5
git revert HEAD  # 或 git reset --hard HEAD~1
git push origin main --force
npm run deploy
```
