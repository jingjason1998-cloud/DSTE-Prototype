"""
KPI 指标树 v4 — BSC 维度分区 + 思维导图式横向展开
验证：维度区块、思维导图卡片、连接线、横向子树展开
"""

from pathlib import Path

PROJECT_ROOT = Path("/Users/jasonjing/DSTE-Prototype")
SRC = PROJECT_ROOT / "src"


def test_cockpit_has_bsc_dimension_css():
    """BSC 维度区块样式存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert ".omp-bsc-dimension" in content, "缺少 .omp-bsc-dimension 维度区块样式"


def test_cockpit_has_mindmap_card_css():
    """思维导图卡片样式存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert ".omp-kpi-card.mindmap-node" in content, "缺少 .mindmap-node 思维导图卡片样式"


def test_cockpit_has_tree_node_structure():
    """树形节点 DOM 结构存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert ".omp-kpi-tree-node" in content or ".omp-canvas-node" in content, "缺少树节点结构"


def test_cockpit_has_tree_line_css():
    """思维导图连接线样式存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    # v4: CSS 伪元素; 画布版: SVG path
    assert ".omp-kpi-children-row::before" in content or ".omp-canvas-svg" in content, "缺少连接线样式"


def test_cockpit_has_bsc_dimension_data():
    """mock 数据包含 bscDimension 字段"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "bscDimension" in content, "mock 数据缺少 bscDimension 字段"


def test_cockpit_has_dimension_rendering():
    """渲染逻辑按 BSC 维度分组"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "omp_renderKpiTree" in content, "缺少 omp_renderKpiTree 函数"
    # 检查函数内是否有维度分组逻辑
    func_start = content.find("function omp_renderKpiTree")
    func_end = content.find("function omp_renderTaskTab")
    func_body = content[func_start:func_end]
    assert "financial" in func_body or "customer" in func_body or "bscDimension" in func_body, "渲染函数未按 BSC 维度分组"


def test_cockpit_has_expand_toggle():
    """展开/折叠函数适配新 DOM"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "window.omp_toggleExpand" in content, "缺少全局 omp_toggleExpand 函数"


def test_cockpit_has_status_top_bar():
    """卡片顶部状态色条样式"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "status-achieved" in content, "缺少 status-achieved 状态样式"
    assert "status-warning" in content, "缺少 status-warning 状态样式"
    assert "status-lagging" in content, "缺少 status-lagging 状态样式"
