# DSTE 组件规范

本文件定义 DSTE 核心组件的样式与行为。所有组件样式基于 `assets/css/components.css`，并通过 `assets/css/tokens.css` 中的 token 控制。

## 按钮 Button

### 变体

| 类名 | 用途 | 示例 |
|------|------|------|
| `.btn-primary` | 主要操作 | 保存、提交、确认 |
| `.btn-secondary` | 次要操作 | 取消、返回 |
| `.btn-ghost` | 低强调操作 | 工具栏、链接式按钮 |
| `.btn-danger` | 破坏性操作 | 删除、移除 |

### 尺寸

| 类名 | 高度 | 用途 |
|------|------|------|
| `.btn-sm` | 28px | 表格内、紧凑工具栏 |
| `.btn` | 34px | 默认 |
| `.btn-lg` | 40px | 强调操作、CTA |

### 图标按钮

```html
<button class="btn btn-icon">${icon('search')}</button>
<button class="btn btn-icon btn-sm">${icon('more', { size: 16 })}</button>
```

### 状态

- Default、Hover、Active、Focus-visible、Disabled
- Focus-visible 使用 2px 外描边：白色内环 + 主题色外环
- Disabled 使用 `opacity: 0.5` 且 `cursor: not-allowed`

## 卡片 Card

### 变体

| 类名 | 用途 |
|------|------|
| `.card` | 默认卡片，带阴影 |
| `.card-flat` | 扁平卡片，弱边框 |
| `.card-elevated` | 强调卡片，带 hover 阴影 |

### 结构

```html
<div class="card">
  <div class="card-header">
    <span class="card-title">卡片标题</span>
    <div class="card-actions">...</div>
  </div>
  <div class="card-body">...</div>
</div>
```

### 规范

- 内边距：默认 20px（`--space-5`）
- 圆角：12px（`--radius-lg`）
- 边框：1px `--color-border-default`
- 阴影：`--shadow-1`，hover 时 `--shadow-2`

## 表格 Data Table

### 基础样式

```html
<table class="data-table">
  <thead>...</thead>
  <tbody>...</tbody>
</table>
```

### 规范

- 表头：12px，600 字重，灰色背景，底部 1px 边框
- 单元格：14px，垂直居中，行高 40–48px
- 行 hover：背景变 `--color-bg-hover`
- 数字右对齐，文本左对齐
- 操作列宽度固定，内容居中

### 密度

- 默认：行高 48px
- 紧凑 `.data-table-compact`：行高 40px

## 状态标签 Status Badge

| 类名 | 含义 | 颜色 |
|------|------|------|
| `.status-success` | 正常/完成/达成 | 绿色 |
| `.status-warning` | 警告/风险/延期 | 橙色 |
| `.status-danger` | 错误/阻塞/严重偏离 | 红色 |
| `.status-info` | 信息/进行中 | 蓝色 |
| `.status-neutral` | 默认/未开始 | 灰色 |

### 规范

- 圆角全圆（胶囊形）
- 必须包含颜色点前缀（::before）
- 文字与颜色点同时存在，不单独使用颜色

## 输入框 Form Input

```html
<label class="form-label">字段名</label>
<input class="form-input" type="text" placeholder="请输入" />
```

### 规范

- 高度 34px，左右内边距 12px
- 圆角 8px，边框 1px `--color-border-default`
- Focus：边框变主色，外环 2px 主色浅色阴影
- Disabled：背景 `--color-bg-hover`，文字 `--color-text-disabled`

## 弹窗 Modal

### 结构

```html
<div class="modal-backdrop">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">标题</span>
      <button class="btn btn-icon btn-sm">${icon('close')}</button>
    </div>
    <div class="modal-body">...</div>
    <div class="modal-footer">
      <button class="btn btn-secondary">取消</button>
      <button class="btn btn-primary">确认</button>
    </div>
  </div>
</div>
```

### 规范

- 最大宽度 560px（可扩展 `.modal-lg` 720px）
- 圆角 12px，阴影 `--shadow-4`
- 点击 backdrop 关闭（可选）
- ESC 关闭，focus trap

## KPI 卡片

```html
<div class="kpi-card">
  <div class="kpi-label">营收完成率</div>
  <div class="kpi-value">87.4%</div>
  <div class="kpi-delta positive">${icon('trend-up')} +5.2%</div>
</div>
```

### 规范

- 数值 28px 600 字重
- 标签 13px `--color-text-tertiary`
- 变化量使用图标 + 颜色 + 数字

## 空状态 Placeholder

```html
<div class="placeholder-page">
  <div class="placeholder-icon">${icon('folder-open', { size: 48 })}</div>
  <div class="placeholder-title">暂无数据</div>
  <div class="placeholder-desc">点击右上角按钮新增一条记录</div>
</div>
```

## 图标 Icon

所有图标使用 `.icon` 基类，通过父元素字号控制大小。

```html
<span class="icon-md">${icon('search')}</span>
```

## 组件优先级

改造过程中遵循：
1. 优先复用 `components.css` 已有类
2. 旧页面已有的同名类保留兼容，逐步收敛
3. 新增组件必须先在此文档登记，再落地代码
