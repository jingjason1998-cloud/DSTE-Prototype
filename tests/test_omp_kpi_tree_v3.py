"""
KPI 指标树 v3 — 卡片式层级视图测试
验证新的卡片式渲染、环形进度、状态动效、DOM 操作展开
"""

from pathlib import Path

PROJECT_ROOT = Path("/Users/jasonjing/DSTE-Prototype")
SRC = PROJECT_ROOT / "src"


def test_cockpit_has_kpi_tree_container_css():
    """树形容器 CSS 类存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert ".omp-kpi-tree" in content or ".omp-kpi-canvas" in content, "缺少树形容器样式"


def test_cockpit_has_kpi_card_css():
    """卡片基础样式存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert ".omp-kpi-card" in content, "缺少 .omp-kpi-card 卡片样式"


def test_cockpit_has_kpi_card_level_styles():
    """三级层级差异化样式存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert '[data-level="0"]' in content, "缺少 Level 0 公司级样式"
    assert '[data-level="1"]' in content, "缺少 Level 1 部门级样式"
    assert '[data-level="2"]' in content, "缺少 Level 2 团队级样式"


def test_cockpit_has_kpi_ring_css():
    """环形进度 SVG 样式存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert ".omp-kpi-ring" in content or "stroke-dasharray" in content, "缺少环形进度样式"


def test_cockpit_has_expand_btn_css():
    """展开按钮旋转动效存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert ".omp-expand-btn" in content, "缺少 .omp-expand-btn 展开按钮样式"


def test_cockpit_has_status_pill_css():
    """状态药丸标签样式存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert ".omp-status-pill" in content, "缺少 .omp-status-pill 状态标签样式"


def test_cockpit_has_status_animations():
    """状态动效（呼吸/脉冲/闪烁）存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert ".status-achieved" in content, "缺少达成状态样式"
    assert ".status-warning" in content, "缺少预警状态样式"
    assert ".status-lagging" in content, "缺少落后状态样式"
    assert "@keyframes" in content, "缺少 CSS 动画定义"


def test_cockpit_has_kpi_tree_helper_functions():
    """KPI 树辅助函数拆分存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "function omp_kpiBuildTree" in content, "缺少 omp_kpiBuildTree 树构建函数"
    assert "function omp_kpiRenderRing" in content, "缺少 omp_kpiRenderRing 环形渲染函数"


def test_cockpit_toggle_expand_uses_dom_not_navigate():
    """展开折叠使用 DOM 操作而非重新渲染"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    # 检查 omp_toggleExpand 中是否包含 DOM 操作关键字
    toggle_func = content[content.find("window.omp_toggleExpand ="):content.find("window.omp_toggleExpand =") + 800]
    assert "querySelector" in toggle_func or "classList" in toggle_func or "collapsed" in toggle_func, \
        "omp_toggleExpand 应使用 DOM 操作而非仅调用 navigate()"


def test_cockpit_kpi_card_rendering():
    """卡片渲染使用 div 而非 table tr"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    # 搜索整个 omp_renderKpiTree 函数体（到下一个函数定义为止）
    start = content.find("function omp_renderKpiTree")
    end = content.find("// ===== Tab 3: 重点工作 =====", start)
    tree_func = content[start:end] if end > start else content[start:start + 6000]
    assert 'omp-kpi-card' in tree_func or 'omp-canvas-node' in tree_func, "树形渲染应生成卡片节点"
    # 确认不再是 table 行
    assert "<tr" not in tree_func or tree_func.count("<tr") < 2, "树形视图不应使用 table 行"
