# 组件参考

## 布局组件

### 页面容器

```html
<div class="app">
  <nav class="top-nav">...</nav>
  <div class="app-body">
    <aside class="sidebar">...</aside>
    <main class="content-area">
      <div class="page-content">...</div>
    </main>
  </div>
</div>
```

### 面包屑

```html
<div class="breadcrumb">
  <a href="#dashboard">驾驶舱</a>
  <span class="breadcrumb-separator">/</span>
  <span>当前页面</span>
</div>
```

### 页面标题栏

```html
<div class="page-header">
  <h1 class="page-title">页面标题</h1>
  <div class="page-actions">
    <button class="btn btn-primary">+ 新增</button>
  </div>
</div>
```

---

## 卡片

```html
<div class="card">
  <div class="card-header">
    <div class="card-title">卡片标题</div>
    <a href="...">查看更多 →</a>
  </div>
  <!-- 内容 -->
</div>
```

---

## 按钮

| 类名 | 用途 |
|------|------|
| `btn btn-primary` | 主要操作 |
| `btn btn-secondary` | 次要操作 |
| `btn btn-danger` | 危险操作 |
| `btn btn-ghost` | 幽灵按钮 |
| `icon-btn` | 图标按钮 |

---

## 状态标签

| 类名 | 用途 |
|------|------|
| `status-badge status-success` | 正常/完成 |
| `status-badge status-warning` | 警告/风险 |
| `status-badge status-danger` | 错误/逾期 |
| `status-badge status-info` | 信息/进行中 |

---

## 进度条

```html
<div class="progress-bar" style="width:120px">
  <div class="progress-bar-fill" style="width:85%"></div>
</div>
```

---

## 表格

```html
<table class="data-table">
  <thead><tr><th>...</th></tr></thead>
  <tbody><tr><td>...</td></tr></tbody>
</table>
```

---

## KPI 卡片

```html
<div class="kpi-grid">
  <div class="kpi-card">
    <div class="kpi-label">指标名</div>
    <div class="kpi-value" style="color: var(--success);">99%</div>
    <div class="kpi-trend up"><span>↑</span><span>说明文字</span></div>
  </div>
</div>
```

趋势类：`.kpi-trend.up` / `.down` / `.warning`

---

## 空状态 / 占位

```html
<div class="placeholder-page">
  <div class="placeholder-icon">🚧</div>
  <div class="placeholder-title">开发中</div>
  <div class="placeholder-desc">描述文字</div>
</div>
```

---

## 关联功能入口

```html
<div class="related-links">
  <div class="related-links-label">关联功能</div>
  <div class="related-links-row">
    <a class="related-link" href="#xxx">功能A</a>
    <a class="related-link" href="#xxx">功能B</a>
  </div>
</div>
```
