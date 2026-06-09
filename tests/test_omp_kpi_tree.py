"""
KPI 指标树功能测试
验证 KPI 管理支持树形视图和分解功能
"""

from pathlib import Path

PROJECT_ROOT = Path("/Users/jasonjing/DSTE-Prototype")
SRC = PROJECT_ROOT / "src"


def test_cockpit_has_kpi_tree_renderer():
    """驾驶舱 KPI 管理支持树形视图渲染函数"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "function omp_renderKpiTree" in content, "缺少 omp_renderKpiTree 树形渲染函数"


def test_cockpit_kpi_data_has_parent_id():
    """KPI 实例数据模型包含 parentId 字段"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "parentId" in content, "KPI 数据模型缺少 parentId 字段"


def test_cockpit_kpi_data_has_level():
    """KPI 实例数据模型包含 level 层级字段"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "level" in content, "KPI 数据模型缺少 level 层级字段"


def test_cockpit_kpi_mock_has_hierarchy():
    """Mock KPI 数据包含至少 3 层层级结构"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    # 查找 mock 数据初始化区域
    assert "level: 0" in content or "level:0" in content, "缺少公司级(level=0) KPI"
    assert "level: 1" in content or "level:1" in content, "缺少部门级(level=1) KPI"
    assert "level: 2" in content or "level:2" in content, "缺少团队级(level=2) KPI"


def test_cockpit_has_decompose_modal():
    """驾驶舱包含 KPI 分解弹窗函数"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "function omp_openDecomposeModal" in content, "缺少 omp_openDecomposeModal 分解弹窗函数"


def test_cockpit_has_tree_view_toggle():
    """KPI 管理 Tab 支持列表/树形视图切换"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "kpiViewMode" in content, "缺少 kpiViewMode 视图模式状态"
    assert "omp-toggle-view" in content, "缺少 omp-toggle-view 切换按钮 action"


def test_cockpit_has_expand_collapse():
    """树形视图支持展开/折叠"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "kpiExpandedIds" in content, "缺少 kpiExpandedIds 展开状态"
    assert "window.omp_toggleExpand" in content, "缺少 omp_toggleExpand 展开/折叠函数"
