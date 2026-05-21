# 外部页面挂载指南

> 在 DSTE 平台内嵌入外部系统，保留其全部数据与交互效果。

---

## 方案：iframe + postMessage

外部页面在 iframe 中**完整独立运行**，所有 JS/CSS/数据都保留。通过 `postMessage` 和父页面做最小必要的通信（主题同步、用户信息）。

---

## 快速使用

### 1. 修改模板配置

打开 `src/pages/_template/external-page.js`，改两个地方：

```javascript
const EXTERNAL_CONFIG = {
  url: 'https://你的地址.com',  // ← 改成你的地址
  allowFullscreen: true,
};
```

### 2. 注册到驾驶舱

在 `src/cockpit.html` 的 `PAGES` 对象中添加：

```javascript
const PAGES = {
  // ... 已有页面
  'dashboard/external-system': renderExternalSystem,  // 新增
};
```

### 3. 添加到侧边栏

在 `src/lib/config.js` 的 `SIDEBAR_CONFIG.dashboard` 中添加：

```javascript
dashboard: [
  { type: 'item', id: 'dashboard', icon: '🎛️', label: '驾驶舱概览' },
  // ...
  { type: 'group', title: '外部系统', items: [
    { id: 'dashboard/external-system', icon: '🔗', label: 'XXX系统' }
  ]},
]
```

### 4. 复制渲染函数到 cockpit.html

把 `external-page.js` 中的 `render()` 和 `initPostMessage()` 函数复制到 `cockpit.html` 的 `<script>` 标签内（和其他 render 函数放在一起）。

---

## 子页面需要做什么（被嵌入的页面）

如果你的外部页面可以修改代码，加一段 JS 即可实现双向通信：

```javascript
// 接收父页面消息
window.addEventListener('message', function(e) {
  // 安全校验：验证来源
  // if (e.origin !== 'https://Dste.fineres.com') return;

  switch (e.data.type) {
    case 'dste-theme':
      // 同步 DSTE 主题
      document.documentElement.setAttribute('data-theme', e.data.theme);
      break;
    case 'dste-user':
      // 接收用户信息
      window.__DSTE_USER__ = e.data.user;
      break;
  }
});

// 向父页面发送消息
window.parent.postMessage({
  type: 'external-ready'
}, '*');

// 需要跳转到 DSTE 其他模块时
window.parent.postMessage({
  type: 'external-navigate',
  page: 'exe/meetings'
}, '*');
```

---

## 安全注意事项

| 问题 | 方案 |
|------|------|
| 跨域限制 | iframe `sandbox` 属性已配置常用权限 |
| 来源校验 | 生产环境取消注释 `e.origin` 校验 |
| XSS 风险 | 不信任子页面的任何消息，只做白名单处理 |
| 敏感数据 | 不要通过 postMessage 传密码、Token |

---

## 如果外部页面不能改代码

如果外部页面是第三方系统，你无法修改它的代码：

1. **iframe 直接嵌入** — 保留全部效果，只是没有主题同步
2. **nginx 反向代理** — 让外部页面看起来是同源的，解决跨域问题

```nginx
# nginx 配置示例
location /external/ {
    proxy_pass https://第三方地址.com/;
    proxy_set_header Host $host;
}
```

然后 iframe 的 `src` 改成 `/external/`。
