/**
 * 十五五规划知识库 knowledge.html 主逻辑
 *
 * 数据来源（构建产物，scripts/build-knowledge.cjs 生成）：
 *   /kb/manifest.json   { groups: { key: { label, docs: [{id,title,path,group,meta,excerpt}] } } }
 *   /kb/dashboard.json  { indicators, pest: [{dimension,title,judgments[]}], changelog, stats }
 *   文档内容            /kb/docs/<id>.html
 *
 * 前端路由：#/ 洞察首页（默认），#/doc/<id> 文档浏览。
 * 交互统一走事件委托（data-kb-doc / data-kb-toggle / data-kb-home），不使用内联 onclick。
 */

(function () {
  'use strict';

  const KB_BASE = '/kb';

  // PEST 维度 → 洞察文档 / 中文名
  const PEST_DOCS = {
    P: { id: 'insights/P-political', name: '政策与治理' },
    E: { id: 'insights/E-economic', name: '经济' },
    S: { id: 'insights/S-social', name: '社会' },
    T: { id: 'insights/T-technological', name: '技术' },
  };

  // 省级纲要二级分组（manifest 无区域字段，按固定清单划分）
  const REGION_GROUPS = [
    ['华北', ['北京', '天津', '河北', '山西', '内蒙古']],
    ['东北', ['辽宁', '吉林', '黑龙江']],
    ['华东', ['上海', '江苏', '浙江', '安徽', '福建', '江西', '山东']],
    ['中南', ['河南', '湖北', '湖南', '广东', '广西', '海南']],
    ['西南', ['重庆', '四川', '贵州', '云南', '西藏']],
    ['西北', ['陕西', '甘肃', '青海', '宁夏', '新疆']],
  ];
  const PROVINCE_TO_REGION = new Map();
  REGION_GROUPS.forEach(([region, provinces]) => {
    provinces.forEach((p) => PROVINCE_TO_REGION.set(p, region));
  });

  const GROUP_ORDER = ['core', 'topics', 'regions', 'policies', 'indicators', 'insights', 'cross'];

  const state = {
    manifest: null,
    dashboard: null,
    docsIndex: [], // [{id,title,group,groupLabel,meta,excerpt}]
    docCache: new Map(), // id -> html
    collapsed: new Set(), // 'group:<key>' / 'sub:<region>'
    currentDocId: null,
    searchActiveIndex: -1,
  };

  const els = {};

  // ---------- 工具 ----------

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** changelog 条目中的 `代码` 片段转为 <code> */
  function renderChangelogItem(item) {
    return escapeHtml(item).replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function docUrl(id) {
    return KB_BASE + '/docs/' + id.split('/').map(encodeURIComponent).join('/') + '.html';
  }

  function docHash(id) {
    return '#/doc/' + id;
  }

  function findDoc(id) {
    return state.docsIndex.find((d) => d.id === id) || null;
  }

  function regionOfDoc(doc) {
    if (!doc) return '';
    if (doc.meta && doc.meta.region) return doc.meta.region;
    if (doc.group === 'regions') {
      const name = doc.id.split('/')[1] || '';
      return PROVINCE_TO_REGION.get(name) || '';
    }
    return '';
  }

  // ---------- 路由 ----------

  function parseHash() {
    const hash = location.hash || '';
    if (hash.startsWith('#/doc/')) {
      let id = hash.slice('#/doc/'.length);
      try {
        id = decodeURIComponent(id);
      } catch (e) {
        // id 未编码时 decodeURIComponent 可能抛错，保持原样
      }
      return { view: 'doc', id };
    }
    return { view: 'home' };
  }

  function navigateToDoc(id) {
    location.hash = docHash(id);
  }

  function route() {
    const r = parseHash();
    if (r.view === 'doc' && findDoc(r.id)) {
      renderDocView(r.id);
    } else if (r.view === 'doc') {
      renderDocError(r.id);
    } else {
      renderHome();
    }
  }

  // ---------- 顶部条（面包屑 + 搜索） ----------

  function renderTopbar(crumbs) {
    const crumbHtml = crumbs
      .map((c, i) => {
        const sep = i > 0 ? '<span class="breadcrumb-separator">/</span>' : '';
        const node = c.href
          ? `<a href="${escapeHtml(c.href)}">${escapeHtml(c.label)}</a>`
          : `<span>${escapeHtml(c.label)}</span>`;
        return sep + node;
      })
      .join('');
    els.topbar.innerHTML = `
      <div class="breadcrumb">${crumbHtml}</div>
      <div class="kb-search">
        <input type="search" class="kb-search-input" id="kb-search-input"
               placeholder="搜索文献标题 / 摘要…" autocomplete="off" />
        <div class="kb-search-results" id="kb-search-results" hidden></div>
      </div>`;
    // 顶栏每次渲染重建,搜索输入需在渲染后重新绑定
    bindSearch();
  }

  // ---------- 洞察首页 ----------

  function renderHome() {
    state.currentDocId = null;
    document.title = '十五五规划知识库 - DSTE 战略管理平台';
    renderTopbar([
      { label: '驾驶舱', href: 'cockpit.html#dashboard' },
      { label: '战略洞察', href: 'cockpit.html#sp/insights' },
      { label: '十五五规划知识库' },
    ]);

    const stats = state.dashboard.stats || { groups: {}, totalDocs: 0 };
    const groups = state.manifest.groups;

    const statCards = GROUP_ORDER.filter((k) => groups[k])
      .map((k) => {
        const firstDoc = groups[k].docs[0];
        return `
        <button type="button" class="kb-stat-card" data-kb-doc="${escapeHtml(firstDoc.id)}"
                title="进入阅读:${escapeHtml(firstDoc.title)}">
          <div class="kb-stat-value">${stats.groups[k] != null ? stats.groups[k] : groups[k].docs.length}</div>
          <div class="kb-stat-label">${escapeHtml(groups[k].label)}</div>
        </button>`;
      })
      .join('');

    const indicatorRows = (state.dashboard.indicators || [])
      .map((row) => {
        const isConstraint = row.attribute === '约束性';
        const badge = isConstraint
          ? '<span class="kb-badge kb-badge-constraint">约束性</span>'
          : `<span class="kb-badge kb-badge-expected">${escapeHtml(row.attribute || '')}</span>`;
        return `<tr>
          <td>${escapeHtml(row.category)}</td>
          <td>${escapeHtml(row.indicator)}</td>
          <td>${escapeHtml(row.base2025)}</td>
          <td>${escapeHtml(row.target2030)}</td>
          <td>${escapeHtml(row.average)}</td>
          <td>${badge}</td>
        </tr>`;
      })
      .join('');

    const pestCards = (state.dashboard.pest || [])
      .map((dim) => {
        const conf = PEST_DOCS[dim.dimension] || { id: '', name: dim.dimension };
        const items = (dim.judgments || [])
          .map((j) => `<li>${escapeHtml(j)}</li>`)
          .join('');
        return `
        <button type="button" class="kb-pest-card" data-kb-doc="${escapeHtml(conf.id)}"
                data-pest-dim="${escapeHtml(dim.dimension)}">
          <div class="kb-pest-heading">
            <span class="kb-pest-dim">${escapeHtml(dim.dimension)}</span>
            <span class="kb-pest-name">${escapeHtml(conf.name)}</span>
          </div>
          <ul>${items}</ul>
        </button>`;
      })
      .join('');

    const changelogHtml = (state.dashboard.changelog || [])
      .map((entry) => {
        const items = (entry.items || [])
          .map((it) => `<li>${renderChangelogItem(it)}</li>`)
          .join('');
        return `<div class="kb-changelog-date">${escapeHtml(entry.date)}</div><ul>${items}</ul>`;
      })
      .join('');

    els.main.innerHTML = `
      <div class="kb-home">
        <div class="kb-page-header">
          <h1>十五五规划知识库</h1>
          <p class="kb-subtitle">收录 ${stats.totalDocs} 篇文献 · ${stats.images || 0} 张专栏图片 · 点击统计卡或 PEST 象限进入阅读</p>
        </div>

        <div class="kb-stats-grid" id="kb-stats">
          <div class="kb-stat-card" style="cursor:default;">
            <div class="kb-stat-value">${stats.totalDocs}</div>
            <div class="kb-stat-label">收录文献总数</div>
          </div>
          ${statCards}
        </div>

        <h2 class="kb-section-title">核心指标("十五五"时期经济社会发展主要指标)</h2>
        <div class="kb-indicator-wrap" id="kb-indicators">
          <table class="kb-indicator-table">
            <thead>
              <tr><th>类别</th><th>指标</th><th>2025 年基期</th><th>2030 年目标</th><th>年均 / 累计</th><th>属性</th></tr>
            </thead>
            <tbody>${indicatorRows}</tbody>
          </table>
        </div>

        <h2 class="kb-section-title">PEST 洞察四象限</h2>
        <div class="kb-pest-grid" id="kb-pest">${pestCards}</div>

        <h2 class="kb-section-title">最新变更</h2>
        <div class="kb-changelog" id="kb-changelog">${changelogHtml}</div>
      </div>`;
  }

  // ---------- 文档浏览 ----------

  function renderDocView(id) {
    const doc = findDoc(id);
    state.currentDocId = id;
    document.title = doc.title + ' - 十五五规划知识库';
    renderTopbar([
      { label: '驾驶舱', href: 'cockpit.html#dashboard' },
      { label: '战略洞察', href: 'cockpit.html#sp/insights' },
      { label: '十五五规划知识库', href: '#/' },
      { label: doc.groupLabel },
      { label: doc.title },
    ]);

    els.main.innerHTML = `
      <div class="kb-doc-layout">
        <div class="kb-tree" id="kb-tree"></div>
        <div class="kb-reader">
          <div class="kb-doc-meta" id="kb-doc-meta">${renderMetaBar(doc)}</div>
          <div class="kb-doc-content" id="kb-reader-content">
            <div class="kb-doc-loading">文档加载中…</div>
          </div>
        </div>
      </div>`;

    renderTree();
    loadDocContent(id);
    window.scrollTo(0, 0);
  }

  function renderDocError(id) {
    state.currentDocId = null;
    renderTopbar([
      { label: '驾驶舱', href: 'cockpit.html#dashboard' },
      { label: '战略洞察', href: 'cockpit.html#sp/insights' },
      { label: '十五五规划知识库', href: '#/' },
      { label: '文档不存在' },
    ]);
    els.main.innerHTML = `<div class="kb-error">未找到文档:<code>${escapeHtml(id)}</code>。<a href="#/">返回知识库首页</a></div>`;
  }

  function renderMetaBar(doc) {
    const meta = doc.meta || {};
    const items = [];
    if (meta.source) items.push(`<span class="kb-meta-item">来源:<b>${escapeHtml(meta.source)}</b></span>`);
    if (meta.published) items.push(`<span class="kb-meta-item">发布:<b>${escapeHtml(meta.published)}</b></span>`);
    if (meta.tier) items.push(`<span class="kb-meta-item">层级:<b>${escapeHtml(meta.tier)}</b></span>`);
    const region = regionOfDoc(doc);
    if (region) items.push(`<span class="kb-meta-item">区域:<b>${escapeHtml(region)}</b></span>`);
    if (meta.pest) {
      const pest = Array.isArray(meta.pest) ? meta.pest.join(' / ') : meta.pest;
      items.push(`<span class="kb-meta-item">PEST:<b>${escapeHtml(pest)}</b></span>`);
    }
    const link = meta.url
      ? `<a class="btn btn-secondary kb-meta-source-link" href="${escapeHtml(meta.url)}"
            target="_blank" rel="noopener noreferrer">查看官方原文 ↗</a>`
      : '';
    return items.join('') + link;
  }

  async function loadDocContent(id) {
    const container = document.getElementById('kb-reader-content');
    if (!container) return;
    try {
      let html = state.docCache.get(id);
      if (!html) {
        const resp = await fetch(docUrl(id));
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        html = await resp.text();
        state.docCache.set(id, html);
      }
      // 路由可能已切换,确认仍在当前文档再注入
      if (state.currentDocId !== id) return;
      container.innerHTML = html;
      // 外链补 rel,图片懒加载
      container.querySelectorAll('a[target="_blank"]').forEach((a) => {
        a.setAttribute('rel', 'noopener noreferrer');
      });
      container.querySelectorAll('img').forEach((img) => {
        img.setAttribute('loading', 'lazy');
      });
    } catch (e) {
      if (state.currentDocId !== id) return;
      container.innerHTML = `<div class="kb-error">文档加载失败(${escapeHtml(e.message)}),请稍后重试。</div>`;
    }
  }

  // ---------- 目录树 ----------

  function renderTree() {
    const tree = document.getElementById('kb-tree');
    if (!tree) return;
    const groups = state.manifest.groups;

    const parts = [`<button type="button" class="kb-tree-home" data-kb-home>← 返回洞察首页</button>`];

    GROUP_ORDER.filter((k) => groups[k]).forEach((key) => {
      const group = groups[key];
      const groupCollapsed = state.collapsed.has('group:' + key);
      parts.push(`
        <div class="kb-tree-group" data-group="${escapeHtml(key)}">
          <button type="button" class="kb-tree-group-title" data-kb-toggle="group:${escapeHtml(key)}">
            <span><span class="kb-tree-arrow">${groupCollapsed ? '▸' : '▾'}</span>${escapeHtml(group.label)}</span>
            <span class="kb-tree-count">${group.docs.length}</span>
          </button>
          <ul class="kb-tree-items" ${groupCollapsed ? 'hidden' : ''}>
            ${key === 'regions' ? renderRegionItems(group.docs) : renderDocItems(group.docs)}
          </ul>
        </div>`);
    });

    tree.innerHTML = parts.join('');

    // 激活项滚动进可视区
    const active = tree.querySelector('.kb-tree-doc.active');
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ block: 'nearest' });
    }
  }

  function renderDocItems(docs) {
    return docs
      .map(
        (d) => `
        <li>
          <button type="button" class="kb-tree-doc${d.id === state.currentDocId ? ' active' : ''}"
                  data-kb-doc="${escapeHtml(d.id)}" title="${escapeHtml(d.title)}">
            ${escapeHtml(d.title)}
          </button>
        </li>`
      )
      .join('');
  }

  function renderRegionItems(docs) {
    const direct = []; // 非省份文档(如跨省对比矩阵)
    const byRegion = new Map(REGION_GROUPS.map(([r]) => [r, []]));
    docs.forEach((d) => {
      const region = PROVINCE_TO_REGION.get(d.id.split('/')[1] || '');
      if (region) {
        byRegion.get(region).push(d);
      } else {
        direct.push(d);
      }
    });

    let html = renderDocItems(direct);
    byRegion.forEach((regionDocs, region) => {
      if (!regionDocs.length) return;
      const collapsed =
        !state.collapsed.has('sub:' + region) &&
        !regionDocs.some((d) => d.id === state.currentDocId);
      html += `
        <li class="kb-tree-subgroup">
          <button type="button" class="kb-tree-subgroup-title" data-kb-toggle="sub:${escapeHtml(region)}">
            <span class="kb-tree-arrow">${collapsed ? '▸' : '▾'}</span>${escapeHtml(region)}
            <span class="kb-tree-count">(${regionDocs.length})</span>
          </button>
          <ul class="kb-tree-items" ${collapsed ? 'hidden' : ''}>${renderDocItems(regionDocs)}</ul>
        </li>`;
    });
    return html;
  }

  // ---------- 搜索 ----------

  function bindSearch() {
    const input = document.getElementById('kb-search-input');
    const results = document.getElementById('kb-search-results');
    if (!input || !results) return;

    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      state.searchActiveIndex = -1;
      if (!query) {
        results.hidden = true;
        results.innerHTML = '';
        return;
      }
      const matched = state.docsIndex
        .filter(
          (d) =>
            d.title.toLowerCase().includes(query) ||
            (d.excerpt || '').toLowerCase().includes(query)
        )
        .slice(0, 12);
      if (!matched.length) {
        results.innerHTML = '<div class="kb-search-empty">无匹配文献</div>';
      } else {
        results.innerHTML = matched
          .map(
            (d, i) => `
            <button type="button" class="kb-search-result" data-kb-doc="${escapeHtml(d.id)}" data-index="${i}">
              <span class="kb-result-group">[${escapeHtml(d.groupLabel)}]</span>${escapeHtml(d.title)}
              ${d.excerpt ? `<span class="kb-result-excerpt">${escapeHtml(d.excerpt)}</span>` : ''}
            </button>`
          )
          .join('');
      }
      results.hidden = false;
    });

    input.addEventListener('keydown', (e) => {
      const items = results.querySelectorAll('.kb-search-result');
      if (e.key === 'Escape') {
        results.hidden = true;
        input.blur();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!items.length) return;
        e.preventDefault();
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        state.searchActiveIndex = (state.searchActiveIndex + delta + items.length) % items.length;
        items.forEach((el, i) => el.classList.toggle('active', i === state.searchActiveIndex));
      } else if (e.key === 'Enter' && items.length) {
        e.preventDefault();
        const target = items[state.searchActiveIndex >= 0 ? state.searchActiveIndex : 0];
        if (target) target.click();
      }
    });
  }

  // ---------- 事件委托 ----------

  function bindEvents() {
    els.app.addEventListener('click', (e) => {
      // 阅读窗内的站内互链(#/doc/<id>)走前端路由
      const innerLink = e.target.closest('#kb-reader-content a[href^="#/doc/"]');
      if (innerLink) {
        e.preventDefault();
        const raw = innerLink.getAttribute('href');
        let id = raw.slice('#/doc/'.length);
        try {
          id = decodeURIComponent(id);
        } catch (err) {
          // 保持原样
        }
        if (findDoc(id)) {
          navigateToDoc(id);
        } else {
          location.hash = raw;
        }
        return;
      }

      const toggle = e.target.closest('[data-kb-toggle]');
      if (toggle) {
        const key = toggle.getAttribute('data-kb-toggle');
        if (state.collapsed.has(key)) {
          state.collapsed.delete(key);
        } else {
          state.collapsed.add(key);
        }
        renderTree();
        return;
      }

      if (e.target.closest('[data-kb-home]')) {
        location.hash = '#/';
        return;
      }

      const docBtn = e.target.closest('[data-kb-doc]');
      if (docBtn) {
        const id = docBtn.getAttribute('data-kb-doc');
        if (!id) return;
        // 搜索下拉点击后收起
        const results = document.getElementById('kb-search-results');
        if (results) results.hidden = true;
        const input = document.getElementById('kb-search-input');
        if (input && docBtn.classList.contains('kb-search-result')) input.value = '';
        navigateToDoc(id);
      }
    });

    window.addEventListener('hashchange', route);

    // 点击搜索框以外区域时收起结果下拉(全局只绑定一次)
    document.addEventListener('click', (e) => {
      if (e.target.closest('.kb-search')) return;
      const results = document.getElementById('kb-search-results');
      if (results) results.hidden = true;
    });
  }

  // ---------- 初始化 ----------

  async function init() {
    els.app = document.getElementById('kb-app');
    els.topbar = document.getElementById('kb-topbar');
    els.main = document.getElementById('kb-main');

    try {
      const [manifestResp, dashboardResp] = await Promise.all([
        fetch(KB_BASE + '/manifest.json'),
        fetch(KB_BASE + '/dashboard.json'),
      ]);
      if (!manifestResp.ok || !dashboardResp.ok) {
        throw new Error('知识库索引加载失败(HTTP ' + manifestResp.status + '/' + dashboardResp.status + ')');
      }
      state.manifest = await manifestResp.json();
      state.dashboard = await dashboardResp.json();
    } catch (e) {
      els.main.innerHTML = `<div class="kb-error">${escapeHtml(e.message)}。请先运行 <code>node scripts/build-knowledge.cjs</code> 生成知识库产物。</div>`;
      return;
    }

    // 扁平化文档索引
    state.docsIndex = [];
    GROUP_ORDER.forEach((key) => {
      const group = state.manifest.groups[key];
      if (!group) return;
      group.docs.forEach((d) => {
        state.docsIndex.push({
          id: d.id,
          title: d.title,
          group: key,
          groupLabel: group.label,
          meta: d.meta || {},
          excerpt: d.excerpt || d.summary || '',
        });
      });
    });

    bindEvents();
    route(); // route() 内渲染顶栏后会自动绑定搜索
  }

  init();
})();
