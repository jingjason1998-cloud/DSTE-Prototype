# DSTE UI 迁移规范

本文件记录从旧视觉系统迁移到新设计系统的规则、顺序和兼容性处理。

## 迁移顺序

1. **Phase 0** — 设计系统基线
   - 输出设计文档
   - 创建 tokens.css / components.css
   - 生成 Phosphor 图标数据
   - main.css 改为兼容层

2. **Phase 1** — 统一 Shell
   - shell.css 使用新 token 和统一尺寸
   - config.js emoji → icon key
   - shell.js 渲染 SVG 图标

3. **Phase 2** — 独立页面
   - strategy-map / meetings / business-topics / requirement-pool / reviewer / employee-directory / issue-tracking
   - 删除页面级 :root token 重新定义
   - 内联样式迁移为 class

4. **Phase 3** — cockpit.html 精修
   - dashboard / OMP / KPI tree / roadmap / version-audit
   - 按模块逐步迁移

5. **Phase 4** — 图表、动效、a11y

6. **Phase 5** — 回归、基线、发布

## 旧变量 → 新 Token 映射

| 旧变量 | 新 Token | 备注 |
|--------|----------|------|
| `--primary` | `--color-primary` | |
| `--primary-light` | `--color-primary-subtle` | |
| `--primary-dark` | `--color-primary-active` | |
| `--success` | `--color-success` | |
| `--warning` | `--color-warning` | |
| `--danger` | `--color-danger` | |
| `--info` | `--color-info` | |
| `--bg-page` | `--color-bg-page` | |
| `--bg-card` | `--color-bg-surface` | |
| `--bg-sidebar` | `--color-bg-surface` | |
| `--bg-hover` | `--color-bg-hover` | |
| `--bg-active` | `--color-bg-active` | |
| `--text-primary` | `--color-text-primary` | |
| `--text-secondary` | `--color-text-secondary` | |
| `--text-tertiary` | `--color-text-tertiary` | |
| `--text-disabled` | `--color-text-disabled` | |
| `--text-inverse` | `--color-text-inverse` | |
| `--border-color` | `--color-border-default` | |
| `--border-light` | `--color-border-subtle` | |
| `--shadow-sm` | `--shadow-1` | |
| `--shadow-md` | `--shadow-2` | |
| `--shadow-lg` | `--shadow-3` | |
| `--spacing-xs` | `--space-1` | |
| `--spacing-sm` | `--space-2` | |
| `--spacing-md` | `--space-4` | |
| `--spacing-lg` | `--space-6` | |
| `--spacing-xl` | `--space-7` | |
| `--topbar-height` | `--shell-topbar-height` | 值从 64px/56px 统一为 60px |
| `--sidebar-width` | `--shell-sidebar-width` | 值统一为 240px |
| `--sidebar-collapsed` | `--shell-sidebar-collapsed` | 64px |
| `--font-family` | `--font-sans` | |
| `--font-mono` | `--font-mono` | |
| `--radius-sm` | `--radius-sm` | 同名 |
| `--radius-md` | `--radius-md` | 同名 |
| `--radius-lg` | `--radius-lg` | 同名 |
| `--transition-fast` | `--duration-fast` | 注意需加 ease |
| `--transition-normal` | `--duration-normal` | 注意需加 ease |

## 废弃 Emoji 清单

所有以下 emoji 必须从 UI 中移除：

🎛️ 🎯 🔧 🚀 📊 🤖 🗺️ 🔭 📋 📈 ✅ 🏢 🏛️ 👥 ⚙️ 🔔 🔍 🌙 📤 📥 ✂️ 📅 📍 👤 📝 📂 🏆 👔 🔄 📉 🛡️ 🗑️ ✏️ ➕ ❌ ⚠️ ℹ️ ✅ ❓

替换方式：
- 导航/侧边栏：使用 `icon(key)` 渲染 Phosphor SVG
- 按钮内：使用 `icon(key, { size: 16 })`
- 状态/提示：使用 Phosphor 图标 + 文字

## 页面级 :root 重定义处理

旧页面常常在 `<style>` 或页面 CSS 中重新定义 :root 变量。迁移时：

1. 删除与全局冲突的 :root 重定义
2. 如需页面特殊色，使用 component token 或局部 CSS 变量
3. 局部变量命名必须带页面前缀，如 `--sm-fin`（strategy-map financial）

## 内联样式处理

优先级：
1. 如果内联样式是 one-off 布局，抽成 class
2. 如果是通用模式，加入 components.css
3. 如果暂时无法抽取，保留内联但使用 token：`style="padding: var(--space-4)"`
4. 严禁硬编码颜色和 px 间距

## 兼容性层 main.css

`main.css` 在升级期间作为兼容层存在：
- 导入 `tokens.css` 和 `components.css`
- 旧变量别名到新 token
- 保留旧组件类（如 `.btn`、`.card`）避免页面崩溃

升级完成后，评估是否继续保留兼容层或合并回 components.css。

## 回归测试要求

每改造一个模块必须：
1. `npm run build` 通过
2. `npx playwright test` 通过
3. 视觉回归截图对比通过
4. 人工检查无 emoji、无错位、无颜色异常

## 新增页面规范

新页面必须：
1. 引入 `main.css`
2. 使用 icon key 而非 emoji
3. 使用语义 token 而非硬编码颜色
4. 遵循 Shell 布局规范
5. 通过 a11y 检查
