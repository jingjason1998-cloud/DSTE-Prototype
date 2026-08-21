# DSTE Shell 布局规范

> **尺寸与行为以 `src/styles/shell.css` 与 `assets/css/tokens.css` 为准，本文数值为 2026-08 快照。**

Shell 是 DSTE 的页面框架，包括顶部导航、左侧边栏、面包屑、页面标题和内容区。统一 Shell 是消除“目录间距、字体、大小不正规”问题的关键。

## 文件位置

- `src/styles/shell.css` — Shell 样式
- `src/lib/config.js` — 导航配置
- `src/lib/shell.js` — Shell 渲染逻辑

## 整体结构

```
┌─────────────────────────────────────────┐
│  Topbar (48px)                          │
├──────────┬──────────────────────────────┤
│          │                              │
│ Sidebar  │  Content Area                │
│ (220px)  │  padding: 20px               │
│          │                              │
└──────────┴──────────────────────────────┘
```

## 顶部导航 Topbar

### 尺寸

- 高度：`--shell-topbar-height` = 48px
- 背景：`--color-bg-surface`
- 底部边框：1px `--color-border-default`
- 左右内边距：16px（`var(--space-4)`）
- z-index：`--z-fixed` = 300

### 结构

从左到右：
1. Logo + 产品名
2. DSTE 阶段 Tab（驾驶舱 / SP / BP / 执行 / 评估 / AI）
3. 命令面板（Cmd+K / Ctrl+K，全局搜索页面与业务记录，见 `src/lib/command-palette.js`）
4. 主题切换、通知、用户头像

### 阶段 Tab

- 默认状态：13px，500 字重，`--color-text-tertiary`，圆角 `--radius-md`
- Hover：背景 `--color-bg-hover`，文字 `--color-text-secondary`
- Active：文字 `--color-primary`，圆角背景块 `--color-bg-active`，字重 600（无底部指示条）
- Tab 间距：2px

### 图标按钮

- 尺寸 32px × 32px（`.top-nav .icon-btn`）
- 图标尺寸 16px（`.top-nav-icon`）
- 用户头像 30px × 30px

## 左侧边栏 Sidebar

### 尺寸

- 宽度：`--shell-sidebar-width` = 220px（≤1280px 时缩至 180px）
- 收起状态：完全隐藏（`width: 0`，见下文「收起状态」）
- 背景：`--color-bg-surface`
- 右边框：1px `--color-border-default`
- 组间距：4px
- 项内边距：8px 16px，外边距 1px 8px

### 分组标题

- 12px（`--text-xs`），600 字重，字距 0.3px
- 颜色 `--color-text-tertiary`
- 内边距 8px 16px

### 菜单项

```html
<a class="sidebar-item active" href="...">
  <span class="icon">${icon('strategy-map')}</span>
  <span class="label">战略地图</span>
</a>
```

- 默认：13px，400 字重，`--color-text-tertiary`
- Hover：背景 `--color-bg-hover`，文字 `--color-text-secondary`
- Active：背景 `--color-bg-active`，文字 `--color-primary`，500 字重，左侧另有 3px 主色竖条（`.sidebar-item.active::before`）
- 图标与文字间距：8px（`var(--space-2)`）
- 圆角：8px（`--radius-md`）

### 收藏 / 最近访问

- 每个菜单项带收藏星标（`.sidebar-fav`），默认隐藏，悬停或已收藏时显示；点击切换收藏，不触发导航
- 侧边栏顶部渲染「收藏」「最近访问」快捷分组（`.sidebar-quick` / `.sidebar-quick-entry`，为空则不渲染），样式与菜单项一致
- 数据存于 localStorage，逻辑见 `src/lib/shell.js` 的 `renderSidebar`

### 收起状态

- 侧边栏**完全隐藏**：`width: 0; padding: 0; overflow: hidden`（`.sidebar.collapsed`），不是 64px 图标栏
- 注：`--shell-sidebar-collapsed: 64px` token 目前仍定义在 tokens.css 中，但 Shell 实际未使用

## 面包屑 Breadcrumb

- 位置：内容区顶部
- 字号：13px
- 颜色：`--color-text-tertiary`
- 分隔符：`>` 或 `/`，透明度 0.4
- 当前页不可点击

## 页面标题 Page Header

```html
<div class="page-header">
  <h1 class="page-title">重点工作管理</h1>
  <div class="page-actions">
    <button class="btn btn-secondary">导出</button>
    <button class="btn btn-primary">新增</button>
  </div>
</div>
```

- 标题：22px，600 字重，`--color-text-primary`
- 标题与操作按钮间距：16px
- 底部外边距：20px

## 内容区 Content Area

- flex: 1，overflow-y: auto
- 背景：`--color-bg-page`
- 内边距：20px（`--shell-content-padding` = `var(--space-5)`）
- 最大内容宽度：1440px，居中

## 工作区 iframe（keep-alive）

驾驶舱工作区的外部页面以 iframe 嵌入：

- `.workspace-panes` 容器与 `#page-content` 平级，切换页签只切显隐、不销毁 iframe（keep-alive，保留页面状态）
- iframe 加载前显示骨架屏（`.workspace-iframe-skeleton`），load 后移除
- 嵌入页内按 Cmd+K 会桥接给父窗口打开全局命令面板（见 `src/lib/shell-injector.js`）

## 响应式

实际断点以 `src/styles/shell.css` 末尾的 media query 为准：≤1280px / ≤1024px / ≤768px / ≤480px。

### ≤1280px（平板 / 窄桌面）

- 侧边栏缩至 180px
- 阶段 Tab 内边距与字号缩小
- 内容区最大宽度取消（100%）

### ≤1024px

- 隐藏产品名（`.top-nav-title`）与 Tab 副标签（`.nav-full-label`）
- 阶段 Tab 进一步收紧

### ≤768px（移动端）

- 侧边栏变为抽屉（drawer，fixed 定位），默认隐藏
- 顶部显示汉堡菜单按钮（`.mobile-menu-toggle`）
- 内容区内边距 16px

### ≤480px（小屏手机）

- 侧边栏抽屉全宽（100vw）
- 面包屑隐藏
- 内容区内边距 12px
- 页面标题降为 16px，`.page-header` 纵向排列

## 嵌入模式

URL 参数 `?embed=1` 或 `[data-embed="true"]` 时：
- 隐藏 Topbar
- 隐藏 Sidebar
- 隐藏 Breadcrumb
- 内容区占满整个视口

## 导航配置

导航项在 `src/lib/config.js` 中配置：

```javascript
{
  type: 'item',
  id: 'sp/strategy-map',
  icon: 'sp/strategy-map',  // 不再使用 emoji
  label: '战略地图'
}
```

`icon` 字段的值必须是 `assets/js/icon-mapping.js` 中 `ICONS` 对象的 key。

## 视觉检查清单

- [ ] Topbar 高度在所有页面一致 48px
- [ ] Sidebar 宽度一致 220px（≤1280px 时 180px）
- [ ] 导航图标全部使用 Phosphor，无 emoji
- [ ] Active 状态使用统一主色背景 + 文字
- [ ] 内容区内边距统一 20px
- [ ] 页面标题字号统一 22px
- [ ] 移动端 sidebar 为抽屉
- [ ] 嵌入模式隐藏 chrome
