# DSTE Shell 布局规范

Shell 是 DSTE 的页面框架，包括顶部导航、左侧边栏、面包屑、页面标题和内容区。统一 Shell 是消除“目录间距、字体、大小不正规”问题的关键。

## 文件位置

- `src/styles/shell.css` — Shell 样式
- `src/lib/config.js` — 导航配置
- `src/lib/shell.js` — Shell 渲染逻辑

## 整体结构

```
┌─────────────────────────────────────────┐
│  Topbar (60px)                          │
├──────────┬──────────────────────────────┤
│          │                              │
│ Sidebar  │  Content Area                │
│ (240px)  │  padding: 24px               │
│          │                              │
└──────────┴──────────────────────────────┘
```

## 顶部导航 Topbar

### 尺寸

- 高度：`--shell-topbar-height` = 60px
- 背景：`--color-bg-surface`
- 底部边框：1px `--color-border-default`
- 左右内边距：20px
- z-index：`--z-fixed` = 300

### 结构

从左到右：
1. Logo + 产品名
2. DSTE 阶段 Tab（驾驶舱 / SP / BP / 执行 / 评估 / AI）
3. 全局搜索
4. 主题切换、通知、用户头像

### 阶段 Tab

- 默认状态：13px，500 字重，`--color-text-tertiary`
- Hover：背景 `--color-bg-hover`，文字 `--color-text-secondary`
- Active：文字 `--color-primary`，背景 `--color-bg-active`，底部 2px 主色指示条
- Tab 间距：2px

### 图标按钮

- 尺寸 36px × 36px
- 圆角 8px
- 图标尺寸 18px

## 左侧边栏 Sidebar

### 尺寸

- 宽度：`--shell-sidebar-width` = 240px
- 收起宽度：`--shell-sidebar-collapsed` = 64px
- 背景：`--color-bg-surface`
- 右边框：1px `--color-border-default`
- 组间距：4px
- 项内边距：9px 16px，左右边距 8px

### 分组标题

- 11px，600 字重，大写
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
- Active：背景 `--color-bg-active`，文字 `--color-primary`，500 字重
- 图标与文字间距：10px
- 圆角：6px

### 收起状态

- 只显示图标，隐藏文字和分组标题
- 宽度 64px
- 项水平居中

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
- 内边距：24px
- 最大内容宽度：1440px，居中

## 响应式

### ≥1440px

- 侧边栏展开 240px
- 内容区最大宽度 1440px

### ≥1280px

- 侧边栏展开 240px
- 内容区自适应

### ≥768px

- 侧边栏可收起为 64px

### <768px

- 侧边栏变为抽屉（drawer），默认隐藏
- 顶部显示汉堡菜单按钮
- 面包屑隐藏
- 内容区内边距 16px

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

- [ ] Topbar 高度在所有页面一致 60px
- [ ] Sidebar 宽度一致 240px
- [ ] 导航图标全部使用 Phosphor，无 emoji
- [ ] Active 状态使用统一主色背景 + 文字
- [ ] 内容区内边距统一 24px
- [ ] 页面标题字号统一 22px
- [ ] 移动端 sidebar 为抽屉
- [ ] 嵌入模式隐藏 chrome
