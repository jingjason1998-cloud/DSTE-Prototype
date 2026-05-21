/**
 * DSTE 页面模板
 * 复制此目录创建新页面
 */

const PAGE_CONFIG = {
  name: '新页面',
  phase: 'dashboard',
  breadcrumb: [
    { label: '驾驶舱', href: '#dashboard' },
    { label: '新页面', href: null }
  ]
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
        <button class="btn btn-primary">+ 新增</button>
      </div>
    </div>
    <div class="card">
      <div class="placeholder-page">
        <div class="placeholder-icon">🚧</div>
        <div class="placeholder-title">页面开发中</div>
        <div class="placeholder-desc">此页面正在开发中，敬请期待。</div>
      </div>
    </div>
  `;
}

window.DSTEPage = {
  name: PAGE_CONFIG.name,
  phase: PAGE_CONFIG.phase,
  breadcrumb: PAGE_CONFIG.breadcrumb,
  init(container) {
    container.innerHTML = render();
  },
  destroy() {
    // 清理事件监听、定时器等
  }
};
