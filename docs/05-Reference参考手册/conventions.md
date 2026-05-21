# 代码规范

## 命名

| 类型 | 规范 | 示例 |
|------|------|------|
| CSS 类 | kebab-case | `.page-header`, `.kpi-card` |
| JS 函数 | camelCase | `renderDashboard()`, `navigate()` |
| JS 常量 | UPPER_SNAKE_CASE | `TOP_NAV`, `SIDEBAR_CONFIG` |
| 文件 | kebab-case | `shell.css`, `new-page.spec.js` |

## HTML

- 语义化标签：`<nav>`、`<main>`、`<aside>`、`<header>`
- 属性用双引号：`class="card"`
- 自闭合标签：`meta`, `link`, `img`

## CSS

- 优先用现有变量，不硬编码颜色
- 类选择器优先，不用 ID 选择器写样式
- 移动端优先：`@media (min-width: 768px)` 而非 `max-width`

## JavaScript

- 全局函数挂载到 `window`（SPA 内联脚本需要）
- 模块文件用 ESM：`import/export`
- 字符串拼接用模板字面量：`` `...${var}...` ``

## Git Commit

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat: 新增经营分析会效果评估
fix: 修复 Light 模式下表格背景色
refactor: 提取 renderMeetings 为独立函数
docs: 更新 AI 协作规范
test: 新增会议筛选 E2E 测试
chore: 升级 vite 到 5.x
```
