"""
KPI 指标树 — 自由画布版测试
验证：画布容器、可拖拽节点、SVG 连接线、位置持久化、维度色标
以及 null/NaN 坐标的防御性处理
"""

import re
from pathlib import Path

PROJECT_ROOT = Path("/Users/jasonjing/DSTE-Prototype")
SRC = PROJECT_ROOT / "src"


def _get_render_func():
    """提取 omp_renderKpiTree 函数的完整源码"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    start = content.find("function omp_renderKpiTree(kpis, indicators, statusBadge, miniTrend)")
    end = content.find("// ===== Tab 3: 重点工作 =====", start)
    return content[start:end]


def test_cockpit_has_canvas_container():
    """画布容器存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "omp-kpi-canvas" in content, "缺少 .omp-kpi-canvas 画布容器"


def test_cockpit_has_canvas_node():
    """画布节点卡片存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "omp-canvas-node" in content, "缺少 .omp-canvas-node 画布节点"


def test_cockpit_has_svg_connections():
    """SVG 连接线层存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "omp-canvas-svg" in content, "缺少 .omp-canvas-svg SVG 连接线层"


def test_cockpit_has_drag_capability():
    """拖拽功能代码存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "mousedown" in content, "缺少拖拽交互代码"
    assert "mousemove" in content, "缺少拖拽交互代码"


def test_cockpit_has_position_persistence():
    """位置持久化逻辑存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "x:" in content or "'x'" in content, "缺少位置字段 x"
    assert "y:" in content or "'y'" in content, "缺少位置字段 y"


def test_cockpit_has_dimension_badge():
    """维度色标/角标存在（替代 BSC 框）"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    # 检查有维度相关的样式或标记，且没有 BSC 维度区块头
    assert "bsc-dimension-header" not in content, "不应有 BSC 维度头"
    assert "omp-dim-badge" in content or "data-dim" in content, "缺少维度标识"


def test_cockpit_has_resize_capability():
    """resize 功能代码存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "resize" in content.lower() or "width" in content, "缺少 resize 相关代码"


def test_cockpit_has_zoom_capability():
    """缩放功能代码存在"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "wheel" in content or "scale" in content, "缺少缩放交互代码"


# ========== 防御性检查测试 ==========

def test_node_position_null_guard():
    """nodePositions 计算必须对 null/undefined/NaN/0 进行严格判断，避免生成无效坐标"""
    func = _get_render_func()
    # 必须有 != null 检查（同时过滤 null 和 undefined）
    assert "kpi.x != null" in func or "kpi.y != null" in func, \
        "必须使用 != null 判断坐标有效性（同时覆盖 null 和 undefined）"
    # 不应使用 !== undefined（null 会误通过）
    assert "kpi.x !== undefined" not in func and "kpi.y !== undefined" not in func, \
        "不应使用 !== undefined 判断坐标（会导致 null 误通过）"


def test_node_position_number_validation():
    """保存位置和动态更新时，必须验证坐标是有效数字"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    # 检查保存位置时使用了 isNaN 防御
    assert "isNaN(newX)" in content or "isNaN(newY)" in content, \
        "保存位置时必须使用 isNaN 检查"
    # 检查动态更新 SVG 时使用了 parseFloat + fallback
    assert "parseFloat(node.style.left)" in content, \
        "动态获取节点位置时必须使用 parseFloat"


def test_svg_path_no_null_or_nan():
    """SVG path 生成必须过滤无效坐标，避免生成含 null/NaN 的 d 属性"""
    func = _get_render_func()
    # 检查初始渲染的 SVG path 生成有防御性判断
    assert "if (!fromPos || !toPos)" in func, \
        "SVG path 生成前必须检查 fromPos/toPos 是否存在"
    # 检查有数值校验（避免 NaN 混入）
    assert "isFinite" in func or "!isNaN" in func or "typeof" in func, \
        "SVG path 坐标应进行数值有效性校验"


def test_node_positions_sanitized():
    """nodePositions 对象在计算后，所有坐标必须被净化为有效数字"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    func = _get_render_func()
    # 检查对 nodePositions 的值有防御性处理
    # 要么在设置时确保有效，要么在使用时 fallback
    has_sanitize = (
        "Math.max(0" in func or
        "|| 0" in func or
        "isFinite" in func
    )
    assert has_sanitize, "nodePositions 的坐标应有兜底或净化处理"


def test_data_version_force_reset():
    """DATA_VERSION 必须递增以触发 localStorage 强制清理"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "DATA_VERSION" in content, "必须有 DATA_VERSION 版本控制"
    # 提取当前版本号
    m = re.search(r"DATA_VERSION\s*=\s*['\"]([^'\"]+)['\"]", content)
    assert m, "必须能提取到 DATA_VERSION"
    version = m.group(1)
    assert version.startswith("canvas-"), f"DATA_VERSION 应使用 canvas- 前缀，当前: {version}"
    # 版本号应包含数字
    num_match = re.search(r"\d+", version)
    assert num_match, f"DATA_VERSION 应包含版本数字，当前: {version}"
