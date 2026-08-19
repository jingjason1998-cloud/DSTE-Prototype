"""
十五五规划知识库(knowledge.html)结构与产物测试
- 页面文件存在且含关键挂载点 / 主题同步 / 返回驾驶舱链接
- public/kb 构建产物完整(manifest + dashboard + docs)
"""

import json
import re
from pathlib import Path

PROJECT_ROOT = Path("/Users/jasonjing/DSTE-Prototype")
SRC = PROJECT_ROOT / "src"
KB = PROJECT_ROOT / "public" / "kb"


# ========== 页面结构 ==========

def test_knowledge_html_exists():
    """知识库独立页面存在且为基本 HTML 结构"""
    f = SRC / "knowledge.html"
    assert f.exists(), "knowledge.html 不存在"
    content = f.read_text(encoding="utf-8")
    assert "<!DOCTYPE html>" in content
    assert 'data-theme' in content


def test_knowledge_html_has_dste_nav():
    """知识库页面包含 DSTE 导航条与返回驾驶舱链接"""
    content = (SRC / "knowledge.html").read_text(encoding="utf-8")
    assert "DSTE 战略管理平台" in content, "缺少 DSTE 品牌标识"
    assert 'class="top-nav"' in content, "缺少统一顶部导航"
    assert "cockpit.html" in content, "缺少驾驶舱返回链接"
    assert "../assets/css/main.css" in content, "未引入 DSTE 主样式"
    assert "shell-injector" in content, "未引入统一 shell 注入器"


def test_knowledge_html_theme_sync():
    """知识库页面支持与 DSTE 主题同步"""
    content = (SRC / "knowledge.html").read_text(encoding="utf-8")
    assert "dste-theme" in content, "未使用 dste-theme 键同步主题"
    assert "DSTE.Storage.getString('dste-theme')" in content, "未读取 DSTE 主题"


def test_knowledge_html_mount_points():
    """知识库页面包含关键挂载点"""
    content = (SRC / "knowledge.html").read_text(encoding="utf-8")
    assert 'id="kb-app"' in content, "缺少 #kb-app 挂载点"
    assert 'id="kb-topbar"' in content, "缺少 #kb-topbar 面包屑/搜索挂载点"
    assert 'id="kb-main"' in content, "缺少 #kb-main 主视图挂载点"
    assert "pages/knowledge.js" in content, "未引入页面主逻辑"
    assert "pages/knowledge/style.css" in content, "未引入页面样式"


def test_knowledge_no_inline_onclick():
    """知识库页面不使用内联 onclick(统一事件委托)"""
    content = (SRC / "knowledge.html").read_text(encoding="utf-8")
    assert "onclick=" not in content, "knowledge.html 存在 inline onclick"


def test_knowledge_js_uses_event_delegation():
    """主逻辑使用事件委托而非内联事件"""
    js = (SRC / "pages" / "knowledge.js").read_text(encoding="utf-8")
    assert "data-kb-doc" in js, "未使用 data-kb-doc 事件委托"
    assert "data-kb-toggle" in js, "未使用 data-kb-toggle 折叠委托"
    assert "addEventListener('click'" in js, "未绑定 click 事件委托"
    assert "hashchange" in js, "未监听 hashchange 路由"
    assert "onclick=" not in js, "knowledge.js 生成了内联 onclick"


def test_knowledge_css_uses_variables():
    """页面样式使用 CSS 变量,不硬编码颜色"""
    css = (SRC / "pages" / "knowledge" / "style.css").read_text(encoding="utf-8")
    assert "var(--primary)" in css
    assert "var(--bg-card)" in css
    assert "var(--text-primary)" in css
    # 不允许出现硬编码 hex 颜色(#fff/#1677FF 等)
    hex_colors = re.findall(r"#[0-9a-fA-F]{3,8}\b", css)
    assert not hex_colors, f"style.css 存在硬编码颜色: {hex_colors}"


# ========== 构建产物 ==========

def test_kb_artifacts_exist():
    """public/kb 构建产物存在"""
    assert (KB / "manifest.json").exists(), "manifest.json 不存在,请运行 node scripts/build-knowledge.cjs"
    assert (KB / "dashboard.json").exists(), "dashboard.json 不存在"
    assert (KB / "docs").is_dir(), "docs/ 目录不存在"


def test_kb_manifest_docs_count():
    """manifest 收录文档 ≥ 100 篇,HTML 产物数量一致"""
    manifest = json.loads((KB / "manifest.json").read_text(encoding="utf-8"))
    groups = manifest["groups"]
    total = sum(len(g["docs"]) for g in groups.values())
    assert total >= 100, f"manifest 文档数不足: {total}"
    html_files = list((KB / "docs").rglob("*.html"))
    assert len(html_files) >= 100, f"docs HTML 数不足: {len(html_files)}"
    assert len(html_files) == total, "HTML 产物数量与 manifest 不一致"


def test_kb_manifest_required_groups():
    """manifest 包含全部分组"""
    manifest = json.loads((KB / "manifest.json").read_text(encoding="utf-8"))
    for key in ["core", "topics", "regions", "policies", "indicators", "insights", "research", "cross"]:
        assert key in manifest["groups"], f"缺少分组: {key}"
    for dim in ["P-political", "E-economic", "S-social", "T-technological"]:
        ids = [d["id"] for d in manifest["groups"]["insights"]["docs"]]
        assert f"insights/{dim}" in ids, f"缺少 PEST 洞察文档: {dim}"


def test_kb_research_group():
    """research 专题研究分组:主报告 + 赛道小节 + CSV 表格页"""
    manifest = json.loads((KB / "manifest.json").read_text(encoding="utf-8"))
    group = manifest["groups"]["research"]
    assert group["label"] == "专题研究"
    ids = [d["id"] for d in group["docs"]]
    topic = "research/2026-08-新兴产业与未来产业"
    assert f"{topic}/README" in ids, "缺少专题主报告"
    assert sum(1 for i in ids if "/tracks/" in i) >= 10, "赛道小节不足 10 篇"
    # CSV 表格页
    tables = [d for d in group["docs"] if d.get("type") == "table"]
    assert len(tables) == 1, f"表格页数量不为 1: {len(tables)}"
    assert tables[0]["title"] == "公司清单(companies.csv)"
    table_html = KB / "docs" / topic / "companies.html"
    assert table_html.exists(), "表格页 HTML 不存在"
    content = table_html.read_text(encoding="utf-8")
    assert 'class="kb-csv-header"' in content, "表头缺少样式 class"
    assert content.count("<tr>") == 113, "表格数据行数不为 113"
    # 原始 CSV 拷贝到 assets 供下载
    assert (KB / "assets" / "research" / topic.split("/", 1)[1] / "companies.csv").exists()


def test_kb_dashboard_structure():
    """dashboard.json 结构完整:指标 21 行 / PEST 四维各 4 条 / changelog"""
    dashboard = json.loads((KB / "dashboard.json").read_text(encoding="utf-8"))
    assert len(dashboard["indicators"]) >= 20, "指标表行数不足"
    pest = {p["dimension"]: p for p in dashboard["pest"]}
    for dim in ["P", "E", "S", "T"]:
        assert dim in pest, f"PEST 缺少维度: {dim}"
        assert len(pest[dim]["judgments"]) == 4, f"PEST {dim} 判断条数不为 4"
    assert dashboard["changelog"], "changelog 为空"
    assert dashboard["stats"]["totalDocs"] >= 100
    # 约束性指标必须存在(徽标依赖)
    attributes = {row["attribute"] for row in dashboard["indicators"]}
    assert "约束性" in attributes, "指标缺少约束性属性"
