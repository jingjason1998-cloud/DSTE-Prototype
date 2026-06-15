/**
 * 外部页面挂载模板
 * 在 iframe 中嵌入外部系统，保留全部数据与效果
 * 通过 postMessage 实现父子页面双向通信
 */

const PAGE_CONFIG = {
  name: '外部系统',
  phase: 'dashboard',
  breadcrumb: [
    { label: '驾驶舱', href: '#dashboard' },
    { label: '外部系统', href: null }
  ]
};

// 外部页面配置
const EXTERNAL_CONFIG = {
  url: 'https://你的地址.com',
  allowFullscreen: true,
  allowPayment: false,
};

function render() {
  return `
    <div class="breadcrumb">
      ${PAGE_CONFIG.breadcrumb.map((item) => {
        if (item.href) {
          return `<a href="${item.href}" onclick="event.preventDefault(); navigate('${item.href.slice(1)}')">${item.label}</a>`;
        }
        return `<span>${item.label}</span>`;
      }).join('<span class="breadcrumb-separator">/</span>')}
    </div>
    <div class="page-header">
      <h1 class="page-title">${PAGE_CONFIG.name}</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="window.open('${EXTERNAL_CONFIG.url}', '_blank')">↗ 新窗口打开</button>
        <button class="btn btn-primary" onclick="refreshIframe()">⟳ 刷新</button>
      </div>
    </div>
    <div class="card" style="padding:0;height:calc(100vh - 200px);position:relative;">
      <iframe
        id="external-iframe"
        src="${EXTERNAL_CONFIG.url}"
        style="width:100%;height:100%;border:none;border-radius:8px;"
        allow="fullscreen ${EXTERNAL_CONFIG.allowPayment ? 'payment' : ''}"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      ></iframe>
      <!-- 加载状态 -->
      <div id="iframe-loading" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg-card);border-radius:8px;z-index:1;">
        <div style="text-align:center;color:var(--text-tertiary);">
          <div style="font-size:24px;margin-bottom:8px;">⏳</div>
          <div>加载外部系统中...</div>
        </div>
      </div>
    </div>
  `;
}

// 全局函数（挂载到 window 供内联 onclick 调用）
window.refreshIframe = function() {
  const iframe = document.getElementById('external-iframe');
  if (iframe) {
    iframe.src = iframe.src;
  }
};

// postMessage 通信处理
function initPostMessage() {
  const iframe = document.getElementById('external-iframe');
  if (!iframe) return;

  // iframe 加载完成
  iframe.onload = function() {
    const loading = document.getElementById('iframe-loading');
    if (loading) loading.style.display = 'none';

    // 向子页面发送主题信息
    const theme = DSTE.Storage.getString('dste-theme');
    iframe.contentWindow.postMessage({
      type: 'dste-theme',
      theme: theme
    }, '*');

    // 向子页面发送用户信息
    const user = sessionStorage.getItem('dste-user') || '张总';
    iframe.contentWindow.postMessage({
      type: 'dste-user',
      user: user
    }, '*');
  };

  // 接收子页面消息
  window.addEventListener('message', function(e) {
    // 安全校验：验证来源域名
    // if (e.origin !== 'https://你的地址.com') return;

    switch (e.data.type) {
      case 'external-ready':
        console.log('外部系统就绪');
        break;
      case 'external-navigate':
        // 子页面请求导航到 DSTE 其他模块
        if (e.data.page) navigate(e.data.page);
        break;
      case 'external-title':
        // 子页面更新标题
        document.title = (e.data.title || '外部系统') + ' - DSTE 战略管理平台';
        break;
      default:
        break;
    }
  });
}

// 暴露 DSTEPage 接口
window.DSTEPage = {
  name: PAGE_CONFIG.name,
  phase: PAGE_CONFIG.phase,
  breadcrumb: PAGE_CONFIG.breadcrumb,
  init(container) {
    container.innerHTML = render();
    // 延迟初始化 postMessage，等 DOM 渲染完成
    setTimeout(initPostMessage, 0);
  },
  destroy() {
    window.removeEventListener('message', initPostMessage);
  }
};
