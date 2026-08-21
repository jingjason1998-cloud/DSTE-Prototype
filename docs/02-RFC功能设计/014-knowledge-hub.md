> **状态：已实现（v0.7.27 发布，v0.7.28 扩容专题研究分组，文档 97 → 109 篇）**。实现：src/knowledge.html + src/pages/knowledge.js + scripts/build-knowledge.cjs。2026-08-21 补编号 014。

# RFC: fyp-kb 知识库网页版(knowledge.html)

> 状态:已批准(用户选定方案 A:独立页面) · 2026-08-11

## 背景

fyp-kb(`/Users/jasonjing/fyp-kb`)是"十五五"规划知识库:109 篇 Markdown
(顶层文献/纲要 18 篇主题/29 份专项规划/31 省纲要/PEST 洞察)+ 专栏图片。
需做成网页版,继承在 DSTE 洞察模块。

## 方案(方案 A:独立页面)

- **内容管线**:`scripts/build-knowledge.cjs`(仿 generate-roadmap.cjs 先例),
  构建时扫描 fyp-kb → `public/kb/`(manifest.json + docs/*.html 预渲染 +
  dashboard.json + assets/ 图片)。marked + gray-matter + sanitize-html 仅构建依赖
- **页面**:`src/knowledge.html` + `src/pages/knowledge.js`(参照 reviewer.html 先例)
  - 洞察首页:核心指标卡 / PEST 四象限摘要 / 最新变更 / 收录统计
  - 文档树 + 阅读窗 + 面包屑 + frontmatter 元数据条(可跳官方原文)
  - 全文搜索(manifest 索引,前端即时过滤)
- **注册(架构侧)**:vite input、EXTERNAL_PAGES、SIDEBAR_CONFIG(sp 组)、
  PAGE_NAMES/PAGE_META;sp/insights 页关联链接区加入口
- **样式**:CSS 变量,禁硬编码颜色,支持 data-theme 明暗主题

## 测试

pytest 结构测试 + Playwright E2E(首页渲染/树导航/搜索/文档打开)+
check:scope + 全量回归。

## 数据准确性约束

构建脚本输出校验日志;20 项指标等关键数字必须与 fyp-kb 源文件一致;
fyp-kb 侧只读,不改动。
