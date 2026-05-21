# DSTE 页面模块规范

## 微前端接口 (window.DSTEPage)

每个独立页面模块必须暴露以下接口：

```javascript
window.DSTEPage = {
  // 页面标识
  name: '页面名称',
  
  // 所属 DSTE 阶段 (dashboard/sp/bp/exe/rev/ai)
  phase: 'dashboard',
  
  // 面包屑路径 [{label, href}]
  breadcrumb: [
    { label: '驾驶舱', href: '#dashboard' },
    { label: '页面名称', href: null }
  ],
  
  // 初始化页面，接收容器元素
  init(container) {
    container.innerHTML = '<div>页面内容</div>';
  },
  
  // 销毁页面（清理事件监听、定时器等）
  destroy() {
    // 清理逻辑
  }
};
```

## 目录结构

```
src/pages/
├── README.md           # 本文件
├── _template/          # 页面模板
│   ├── index.js        # 页面逻辑
│   └── style.css       # 页面样式
├── dashboard/          # 驾驶舱概览
├── roadmap/            # 开发路线图
├── meetings/           # 经营分析会
└── ...
```

## 创建新页面步骤

1. 复制 `_template/` 目录
2. 修改 `index.js` 中的页面逻辑
3. 在 `src/lib/config.js` 的 `SIDEBAR_CONFIG` 中添加导航项
4. 在 `src/cockpit.html` 的 `PAGES` 对象中注册渲染函数
5. 编写对应的 E2E 测试 (`tests/e2e/xxx.spec.js`)

## 独立页面 (External Pages)

以下页面是独立的 HTML 文件，不嵌入 SPA shell：
- `reviewer.html` — 会议材料审核
- `business-topics.html` — 业务专题管理

独立页面需要自行包含完整的 HTML 结构，但应引用共享的 `shell.css` 保持一致样式。
