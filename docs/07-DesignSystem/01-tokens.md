# DSTE 设计 Token 规范

Token 是 DSTE 设计系统的原子值。所有颜色、间距、字体、圆角、阴影、动效都必须通过 token 引用，禁止在组件中写死数值。

## 文件位置

- `assets/css/tokens.css` — 唯一 token 源文件
- `assets/css/main.css` — 兼容层，将旧变量别名到新 token

## Token 分层

```
Primitive（原始色板）
  └── Semantic（语义 token：背景、文字、边框）
        └── Component（组件 token：按钮背景、卡片阴影）
```

## 颜色

### Primitive — 蓝色阶

| Token | 色值 | 用途 |
|-------|------|------|
| `--color-blue-50` | `#E6F4FF` | 极浅背景、选中态 |
| `--color-blue-100` | `#BAE0FF` | hover 背景 |
| `--color-blue-200` | `#91CAFF` | — |
| `--color-blue-300` | `#69B1FF` | — |
| `--color-blue-400` | `#4096FF` | — |
| `--color-blue-500` | `#1677FF` | **品牌主色** |
| `--color-blue-600` | `#0958D9` | primary hover |
| `--color-blue-700` | `#074BAF` | primary active / emphasis |
| `--color-blue-800` | `#053885` | — |
| `--color-blue-900` | `#03255A` | — |

### Primitive — 灰色阶

| Token | Light | Dark 语义映射 |
|-------|-------|---------------|
| `--color-gray-0` | `#FFFFFF` | 主文字 |
| `--color-gray-50` | `#F7F8FA` | hover 背景 |
| `--color-gray-100` | `#F0F2F5` | 页面背景 |
| `--color-gray-200` | `#E4E6EB` | 默认边框 |
| `--color-gray-300` | `#D1D5DB` | 强边框 |
| `--color-gray-400` | `#9CA3AF` | 禁用文字 |
| `--color-gray-500` | `#6B7280` | 三级文字 |
| `--color-gray-600` | `#4B5563` | dark 禁用 |
| `--color-gray-700` | `#374151` | dark 二级文字 / light 二级文字 |
| `--color-gray-800` | `#1F2937` | dark 浮层背景 |
| `--color-gray-900` | `#111827` | dark 卡片背景 |
| `--color-gray-950` | `#0B0F19` | dark 页面背景 |
| `--color-gray-1000` | `#000000` | light 主文字 |

### Semantic — 主题色

| Token | Light | Dark |
|-------|-------|------|
| `--color-primary` | `#1677FF` | `#3C9AFF` |
| `--color-primary-hover` | `#0958D9` | `#69B1FF` |
| `--color-primary-active` | `#074BAF` | `#91CAFF` |
| `--color-primary-subtle` | `#E6F4FF` | `rgba(22,119,255,0.15)` |
| `--color-primary-emphasis` | `#074BAF` | `#BAE0FF` |

### Semantic — 状态色

| Token | 色值 | 用途 |
|-------|------|------|
| `--color-success` | `#52C41A` | 成功、达成、正常 |
| `--color-success-hover` | `#389E0D` | — |
| `--color-success-active` | `#237804` | — |
| `--color-success-subtle` | `#F6FFED` | 成功背景 |
| `--color-warning` | `#FAAD14` | 警告、风险 |
| `--color-warning-hover` | `#D48806` | — |
| `--color-warning-active` | `#AD6800` | — |
| `--color-warning-subtle` | `#FFFBE6` | 警告背景 |
| `--color-danger` | `#F5222D` | 错误、阻塞 |
| `--color-danger-hover` | `#CF1322` | — |
| `--color-danger-active` | `#A8071A` | — |
| `--color-danger-subtle` | `#FFF1F0` | 错误背景 |
| `--color-info` | `#1677FF` | 信息提示 |
| `--color-info-hover` | `#0958D9` | — |
| `--color-info-subtle` | `#E6F4FF` | 信息背景 |

### Semantic — 背景/文字/边框

#### Light

```css
--color-bg-page: var(--color-gray-100);
--color-bg-surface: var(--color-gray-0);
--color-bg-surface-elevated: var(--color-gray-0);
--color-bg-hover: var(--color-gray-50);
--color-bg-active: var(--color-blue-50);
--color-bg-selected: var(--color-blue-50);
--color-bg-mask: rgba(0, 0, 0, 0.45);
--color-bg-tooltip: var(--color-gray-900);
--color-bg-backdrop: rgba(0, 0, 0, 0.45);

--color-text-primary: var(--color-gray-1000);
--color-text-secondary: var(--color-gray-700);
--color-text-tertiary: var(--color-gray-500);
--color-text-disabled: var(--color-gray-400);
--color-text-inverse: var(--color-gray-0);
--color-text-on-primary: var(--color-gray-0);
--color-text-on-success: var(--color-gray-0);
--color-text-on-warning: var(--color-gray-1000);
--color-text-on-danger: var(--color-gray-0);

--color-border-default: var(--color-gray-200);
--color-border-subtle: var(--color-gray-100);
--color-border-strong: var(--color-gray-300);
--color-border-focus: var(--color-blue-500);
```

#### Dark

```css
--color-bg-page: var(--color-gray-950);
--color-bg-surface: var(--color-gray-900);
--color-bg-surface-elevated: var(--color-gray-800);
--color-bg-hover: var(--color-gray-800);
--color-bg-active: rgba(22, 119, 255, 0.15);
--color-bg-selected: rgba(22, 119, 255, 0.2);
--color-bg-mask: rgba(0, 0, 0, 0.65);
--color-bg-tooltip: var(--color-gray-50);
--color-bg-backdrop: rgba(0, 0, 0, 0.65);

--color-text-primary: var(--color-gray-0);
--color-text-secondary: var(--color-gray-300);
--color-text-tertiary: var(--color-gray-500);
--color-text-disabled: var(--color-gray-600);
--color-text-inverse: var(--color-gray-1000);

--color-border-default: var(--color-gray-700);
--color-border-subtle: var(--color-gray-800);
--color-border-strong: var(--color-gray-600);
--color-border-focus: var(--color-blue-400);
```

## 间距

基于 8px 网格，4px 为半步。

| Token | 值 |
|-------|-----|
| `--space-0` | 0px |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-7` | 32px |
| `--space-8` | 40px |
| `--space-9` | 48px |
| `--space-10` | 64px |
| `--space-11` | 80px |

**使用建议**：
- 组件内部间隙：8–16px
- 卡片内边距：16–24px
- 模块/区块间距：24–48px
- 页面级间距：32–64px

## 字体

```css
--font-sans: 'Inter', 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-mono: 'SF Mono', 'JetBrains Mono', Monaco, 'Cascadia Code', monospace;
```

| Token | 字号 | 行高 | 用途 |
|-------|------|------|------|
| `--text-xs` | 12px | 18px | 标签、辅助文字、时间 |
| `--text-sm` | 13px | 20px | 表格表头、侧边栏文字 |
| `--text-base` | 14px | 22px | 正文、按钮、输入框 |
| `--text-md` | 16px | 24px | 卡片标题、强调正文 |
| `--text-lg` | 20px | 28px | 页面小标题 |
| `--text-xl` | 28px | 36px | 页面大标题、KPI 数值 |

| Token | 值 |
|-------|-----|
| `--font-normal` | 400 |
| `--font-medium` | 500 |
| `--font-semibold` | 600 |

## 圆角

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-sm` | 4px | 输入框、小标签、状态点 |
| `--radius-md` | 8px | 按钮、卡片、弹窗、表格单元格 |
| `--radius-lg` | 12px | 大卡片、浮层面板 |
| `--radius-full` | 9999px | 头像、状态点、胶囊标签 |

## 阴影 / Elevation

| Token | 值 | 用途 |
|-------|-----|------|
| `--shadow-1` | `0 1px 2px rgba(0,0,0,0.05)` | 默认 resting（卡片、按钮） |
| `--shadow-2` | `0 4px 12px rgba(0,0,0,0.08)` | hover、轻浮层 |
| `--shadow-3` | `0 8px 24px rgba(0,0,0,0.12)` | dropdown、popover、drawer |
| `--shadow-4` | `0 16px 48px rgba(0,0,0,0.18)` | modal、toast |

Dark 模式下阴影透明度提高，避免阴影在暗色背景上消失。

## 动效

| Token | 值 |
|-------|-----|
| `--duration-instant` | 0ms |
| `--duration-fast` | 150ms |
| `--duration-normal` | 250ms |
| `--duration-slow` | 350ms |
| `--ease-productive` | `cubic-bezier(0.2, 0, 0.38, 0.9)` |
| `--ease-entrance` | `cubic-bezier(0, 0, 0.2, 1)` |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` |

**使用建议**：
- hover、焦点：150ms
- 展开/收起、弹窗：250ms
- 页面切换、复杂动画：350ms
- 优先使用 `transform` 和 `opacity`，避免触发重排

## Shell 尺寸

```css
--shell-topbar-height: 60px;
--shell-sidebar-width: 240px;
--shell-sidebar-collapsed: 64px;
--shell-content-max-width: 1440px;
--shell-content-padding: var(--space-6); /* 24px */
```

## Z-Index

| Token | 值 |
|-------|-----|
| `--z-base` | 0 |
| `--z-dropdown` | 100 |
| `--z-sticky` | 200 |
| `--z-fixed` | 300 |
| `--z-modal-backdrop` | 400 |
| `--z-modal` | 500 |
| `--z-popover` | 600 |
| `--z-toast` | 700 |

## 兼容性映射

旧变量 → 新 token：

| 旧变量 | 新 token |
|--------|----------|
| `--primary` | `--color-primary` |
| `--bg-page` | `--color-bg-page` |
| `--text-secondary` | `--color-text-secondary` |
| `--spacing-md` | `--space-4` |
| `--shadow-md` | `--shadow-2` |
| `--radius-md` | `--radius-md` |

完整映射见 `06-migration.md`。
