/**
 * 知识库内容管线:扫描 fyp-kb(只读)→ public/kb/
 * 产物:docs/*.html(预渲染,保留子目录)+ manifest.json + dashboard.json + assets/(图片)
 * 用法: node scripts/build-knowledge.cjs
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const sanitizeHtml = require('sanitize-html');

// marked v18 为纯 ESM,CJS 下用动态 import 加载(见文件底部 boot)
let marked;

const KB_ROOT = path.join(__dirname, '..', '..', 'fyp-kb');
const KNOWLEDGE_DIR = path.join(KB_ROOT, 'knowledge');
const INSIGHTS_DIR = path.join(KB_ROOT, 'insights');
const IMAGES_DIR = path.join(KB_ROOT, 'raw', 't0-gangyao', 'images');
const OUT_ROOT = path.join(__dirname, '..', 'public', 'kb');
const OUT_DOCS = path.join(OUT_ROOT, 'docs');
const OUT_ASSETS = path.join(OUT_ROOT, 'assets');

// fyp-kb 是外部只读仓库，CI/其他机器上可能不存在；
// 此时保留已提交的 public/kb/ 产物，直接跳过重新构建。
if (!fs.existsSync(KB_ROOT)) {
  console.warn(`[build-knowledge] Source directory ${KB_ROOT} not found; skipping knowledge rebuild.`);
  process.exit(0);
}

const GROUP_LABELS = {
  core: '顶层文献',
  topics: '纲要主题',
  regions: '省级纲要',
  policies: '专项规划',
  indicators: '指标体系',
  insights: 'PEST 洞察',
  cross: '横向文件',
};
const GROUP_ORDER = Object.keys(GROUP_LABELS);

// ---------- 校验计数器 ----------
const stats = {
  imageRefsRewritten: 0,
  imageRefsFailed: 0,
  linksRewritten: 0,
  linksFailed: 0,
};
const failedLinks = [];
const failedImages = [];

// ---------- 工具函数 ----------
function walkMd(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMd(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
  }
  return out.sort();
}

/** 源文件绝对路径 → 文档 id(无扩展名,knowledge 下为相对路径,insights 下加 insights/ 前缀) */
function fileToId(absPath) {
  if (absPath.startsWith(KNOWLEDGE_DIR + path.sep)) {
    return path.relative(KNOWLEDGE_DIR, absPath).replace(/\.md$/, '').split(path.sep).join('/');
  }
  if (absPath.startsWith(INSIGHTS_DIR + path.sep)) {
    return 'insights/' + path.relative(INSIGHTS_DIR, absPath).replace(/\.md$/, '').split(path.sep).join('/');
  }
  return null;
}

function idToGroup(id) {
  const seg = id.split('/')[0];
  if (['core', 'topics', 'regions', 'policies', 'indicators'].includes(seg)) {
    // 目录内的 README 索引页归入横向文件
    if (id.split('/').pop() === 'README') return 'cross';
    return seg;
  }
  if (seg === 'insights') {
    // insights/reports/* 归入横向文件,顶层 PEST 文件归 insights
    return id.startsWith('insights/reports/') ? 'cross' : 'insights';
  }
  return 'cross';
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return v == null ? undefined : String(v);
}

// 仅在内容变化时写入，避免无意义地刷新 generatedAt 时间戳
function writeIfChanged(filePath, content) {
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf8');
    if (existing === content) return;
  }
  fs.writeFileSync(filePath, content);
}

// 部分源文件 frontmatter 存在未加引号却含双引号的 title(如 GLOSSARY.md),
// js-yaml 严格解析会失败;fyp-kb 只读,故退化到宽松解析(仅支持 key: value 与 [a, b] 列表)。
function parseFrontmatterLenient(raw, relFile) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, content: raw };
  const data = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      data[kv[1]] = v.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      data[kv[1]] = v.replace(/^"(.*)"$/, '$1');
    }
  }
  console.warn(`  [warn] frontmatter 严格解析失败,已宽松处理: ${relFile}`);
  return { data, content: raw.slice(m[0].length) };
}

function parseFrontmatter(raw, relFile) {
  try {
    return matter(raw);
  } catch (e) {
    return parseFrontmatterLenient(raw, relFile);
  }
}

// ---------- Markdown 预处理:图片引用修复 ----------
// 形式:（图：images/xxx.jpg）或（图：images/xxx.jpg,说明)——正文文本引用,
// 图片实际位于 raw/t0-gangyao/images/。替换为真实 <img>,前面说明文字保留并作 alt。
const IMG_REF_RE = /([^\n（(]+)[（(]图：images\/([^\s,，)）]+\.(?:jpe?g|png|gif|webp|JPG|JPEG|PNG|GIF|WEBP))[^)）]*[)）]/g;

function rewriteImageRefs(md, relFile) {
  return md.replace(IMG_REF_RE, (whole, caption, filename) => {
    const alt = caption.replace(/^[-*>\s]+/, '').trim() || filename;
    if (!fs.existsSync(path.join(IMAGES_DIR, filename))) {
      stats.imageRefsFailed++;
      failedImages.push(`${relFile} -> images/${filename}(源图缺失)`);
      return whole;
    }
    stats.imageRefsRewritten++;
    return `${caption}<img src="/kb/assets/${filename}" alt="${escapeAttr(alt)}">`;
  });
}

// ---------- Markdown 预处理:文档互链重写 ----------
// 相对 .md 链接 → 前端路由 #/doc/<id>;外部 http 链接不动。
function rewriteDocLinks(md, absFile) {
  const relFile = path.relative(KB_ROOT, absFile);
  return md.replace(/\]\(([^)\s]+)\)/g, (whole, target) => {
    if (/^(https?:|mailto:|#|\/)/.test(target)) return whole;
    if (!target.endsWith('.md')) return whole;
    const resolved = path.resolve(path.dirname(absFile), target);
    const id = fileToId(resolved);
    if (id && fs.existsSync(resolved)) {
      stats.linksRewritten++;
      return `](#/doc/${id})`;
    }
    stats.linksFailed++;
    failedLinks.push(`${relFile} -> ${target}`);
    return whole;
  });
}

// ---------- 渲染 + 清洗 ----------
const SANITIZE_OPTS = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
    'img', 'strong', 'em', 'b', 'i', 'code', 'pre', 'blockquote',
    'hr', 'br', 'del', 'sup', 'sub', 'span',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt'],
    th: ['colspan', 'rowspan', 'align'],
    td: ['colspan', 'rowspan', 'align'],
  },
  // 外部链接新窗口打开;站内 #/doc 路由链接保持当前页导航
  transformTags: {
    a: (tagName, attribs) => {
      if (/^https?:\/\//.test(attribs.href || '')) {
        return { tagName, attribs: { ...attribs, target: '_blank', rel: 'noopener' } };
      }
      return { tagName, attribs };
    },
  },
};

function renderHtml(md) {
  const raw = marked.parse(md, { gfm: true, breaks: false });
  const clean = sanitizeHtml(raw, SANITIZE_OPTS);
  // marked 会对 href 做百分号编码,站内路由链接还原为可读的中文格式 #/doc/<id>
  return clean.replace(/href="(#\/doc\/[^"]*)"/g, (m, p) => `href="${decodeURI(p)}"`);
}

function htmlToText(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ---------- dashboard:指标表解析 ----------
function parseIndicators(md) {
  const rows = [];
  for (const line of md.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('|')) continue;
    const cells = t.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 6) continue;
    if (cells[0] === '类别' || /^-+$/.test(cells[0].replace(/\s/g, ''))) continue;
    rows.push({
      category: cells[0],
      indicator: cells[1],
      base2025: cells[2],
      target2030: cells[3],
      average: cells[4],
      attribute: cells[5].replace(/\*\*/g, ''),
    });
  }
  return rows;
}

// ---------- dashboard:PEST 判断提取 ----------
function parsePest(md) {
  const m = md.match(/##\s*当前关键判断\s*\n([\s\S]*?)(?=\n##\s|$)/);
  if (!m) return [];
  const judgments = [];
  const itemRe = /^\s*\d+\.\s+(.+)$/gm;
  let im;
  while ((im = itemRe.exec(m[1])) !== null && judgments.length < 4) {
    const bold = im[1].match(/\*\*([^*]+)\*\*/);
    if (bold) judgments.push(bold[1].replace(/。$/, ''));
  }
  return judgments;
}

// ---------- dashboard:CHANGELOG 解析 ----------
function parseChangelog(content) {
  const sections = [];
  const re = /##\s*(\d{8})\s*刷新\s*\n([\s\S]*?)(?=\n##\s|$)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const d = m[1];
    const items = [];
    const itemRe = /^-\s+(.+)$/gm;
    let im;
    while ((im = itemRe.exec(m[2])) !== null) items.push(im[1].trim());
    sections.push({ date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, items });
  }
  return sections.slice(-2);
}

// ---------- 主流程 ----------
function main() {
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    console.error(`知识库源目录不存在: ${KNOWLEDGE_DIR}`);
    process.exit(1);
  }

  // 清空并重建输出目录
  fs.rmSync(OUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUT_DOCS, { recursive: true });
  fs.mkdirSync(OUT_ASSETS, { recursive: true });

  // 1. 拷贝图片
  let imageCount = 0;
  if (fs.existsSync(IMAGES_DIR)) {
    for (const f of fs.readdirSync(IMAGES_DIR)) {
      if (fs.statSync(path.join(IMAGES_DIR, f)).isFile()) {
        fs.copyFileSync(path.join(IMAGES_DIR, f), path.join(OUT_ASSETS, f));
        imageCount++;
      }
    }
  }

  // 2. 扫描并渲染全部文档
  const files = [...walkMd(KNOWLEDGE_DIR), ...walkMd(INSIGHTS_DIR)];
  const groups = {};
  for (const g of GROUP_ORDER) groups[g] = { label: GROUP_LABELS[g], docs: [] };

  let indicatorsRows = null;
  const pestDims = [];

  for (const absFile of files) {
    const id = fileToId(absFile);
    if (!id) continue;
    const group = idToGroup(id);
    const relFile = path.relative(KB_ROOT, absFile);
    const raw = fs.readFileSync(absFile, 'utf8');
    const { data: fm, content } = parseFrontmatter(raw, relFile);

    // 预处理:图片引用 + 互链重写
    let body = rewriteImageRefs(content, relFile);
    body = rewriteDocLinks(body, absFile);

    const html = renderHtml(body);
    const outPath = path.join(OUT_DOCS, `${id}.html`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html);

    // 标题:frontmatter.title → 首个 h1 → id
    const h1 = content.match(/^#\s+(.+)$/m);
    const title = fm.title || (h1 ? h1[1].trim() : id);

    const excerpt = htmlToText(html).slice(0, 200);
    const meta = {};
    for (const k of ['tier', 'region', 'pest', 'source', 'url']) {
      if (fm[k] != null) meta[k] = fm[k];
    }
    if (fm.published != null) meta.published = formatDate(fm.published);

    groups[group].docs.push({
      id,
      title: String(title),
      path: `docs/${id}.html`,
      group,
      meta,
      excerpt,
    });

    // dashboard 数据收集
    if (id === 'indicators/main-indicators') {
      indicatorsRows = parseIndicators(content);
    }
    const pestMatch = id.match(/^insights\/([PEST])-/);
    if (pestMatch) {
      pestDims.push({ dimension: pestMatch[1], title: String(title), judgments: parsePest(content) });
    }
  }

  // 3. 指标表校验:20 项必须全部解析到
  const indicatorNumbers = new Set(
    (indicatorsRows || []).map((r) => {
      const m = r.indicator.match(/^(\d+)\./);
      return m ? Number(m[1]) : null;
    }).filter((n) => n != null)
  );
  const missing = [];
  for (let i = 1; i <= 20; i++) if (!indicatorNumbers.has(i)) missing.push(i);
  if (!indicatorsRows || indicatorsRows.length < 20 || missing.length > 0) {
    console.error(`指标解析失败:解析到 ${indicatorsRows ? indicatorsRows.length : 0} 行,缺失编号: ${missing.join(',') || '无'}`);
    process.exit(1);
  }

  // 4. manifest.json
  const totalDocs = GROUP_ORDER.reduce((n, g) => n + groups[g].docs.length, 0);
  const manifest = {
    generatedAt: new Date().toISOString(),
    totalDocs,
    groups,
  };
  writeIfChanged(path.join(OUT_ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // 5. dashboard.json
  const changelogSrc = fs.readFileSync(path.join(KB_ROOT, 'CHANGELOG.md'), 'utf8');
  const groupStats = {};
  for (const g of GROUP_ORDER) groupStats[g] = groups[g].docs.length;
  const dashboard = {
    generatedAt: manifest.generatedAt,
    indicators: indicatorsRows,
    pest: pestDims.sort((a, b) => 'PEST'.indexOf(a.dimension) - 'PEST'.indexOf(b.dimension)),
    changelog: parseChangelog(changelogSrc),
    stats: { groups: groupStats, totalDocs, images: imageCount },
  };
  writeIfChanged(path.join(OUT_ROOT, 'dashboard.json'), JSON.stringify(dashboard, null, 2));

  // 6. 校验日志
  console.log('===== 知识库构建完成 =====');
  console.log(`输出目录: ${path.relative(process.cwd(), OUT_ROOT)}`);
  for (const g of GROUP_ORDER) {
    console.log(`  [${g}] ${GROUP_LABELS[g]}: ${groups[g].docs.length} 篇`);
  }
  console.log(`  文档总数: ${totalDocs}(HTML ${totalDocs} 个)`);
  console.log(`  图片: ${imageCount} 张 → assets/`);
  console.log(`  图片引用重写: ${stats.imageRefsRewritten} 处,失败: ${stats.imageRefsFailed} 处`);
  if (failedImages.length) console.log(`    ${failedImages.join('\n    ')}`);
  console.log(`  文档互链重写: ${stats.linksRewritten} 处,失败: ${stats.linksFailed} 处`);
  if (failedLinks.length) console.log(`    ${failedLinks.join('\n    ')}`);
  console.log(`  指标: ${indicatorsRows.length} 行(编号 1-20 齐全)`);
  console.log(`  PEST: ${pestDims.map((p) => `${p.dimension}=${p.judgments.length}条`).join(' ')}`);
  console.log(`  CHANGELOG: ${dashboard.changelog.length} 个刷新段落`);
}

async function boot() {
  ({ marked } = await import('marked'));
  main();
}

boot().catch((err) => {
  console.error(err);
  process.exit(1);
});
