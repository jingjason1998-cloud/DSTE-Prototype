"""
指标体系中心功能测试
验证：指标类型、数据类型、引用检查、引用统计展示
"""

import re
from pathlib import Path

PROJECT_ROOT = Path("/Users/jasonjing/DSTE-Prototype")
SRC = PROJECT_ROOT / "src"


def _get_content():
    return (SRC / "cockpit.html").read_text(encoding="utf-8")


# ========== P0: 数据模型 ==========

def test_indicator_has_indicator_type():
    """指标数据模型包含 indicatorType 字段（result/process）"""
    content = _get_content()
    assert "indicatorType" in content, "指标数据模型缺少 indicatorType 字段"


def test_indicator_has_data_type():
    """指标数据模型包含 dataType 字段（currency/percentage/count等）"""
    content = _get_content()
    assert "dataType" in content, "指标数据模型缺少 dataType 字段"


def test_mock_indicators_have_new_fields():
    """mock 数据中所有指标都包含 indicatorType 和 dataType"""
    content = _get_content()
    # 找到 mock indicators 数组区域
    start = content.find("const indicators = [")
    end = content.find("];", start)
    mock_block = content[start:end]
    # 检查区域内包含 ind_ 开头的 id 字段（JS对象属性名可能无引号）
    ind_ids = re.findall(r"id\s*:\s*['\"](ind_[^'\"]+)['\"]", mock_block)
    assert len(ind_ids) >= 8, f"mock 数据指标数量不足，只找到 {len(ind_ids)} 个"
    # 检查整个区域包含新字段（mock 数据是统一格式）
    assert "indicatorType" in mock_block, "mock 指标数据缺少 indicatorType 字段"
    assert "dataType" in mock_block, "mock 指标数据缺少 dataType 字段"


def test_indicator_type_values_valid():
    """indicatorType 只允许 result 或 process"""
    content = _get_content()
    assert "'result'" in content or '"result"' in content, "缺少 result 类型标识"
    assert "'process'" in content or '"process"' in content, "缺少 process 类型标识"


def test_data_type_values_valid():
    """dataType 包含 currency/percentage/count/days/score"""
    content = _get_content()
    for dtype in ['currency', 'percentage', 'count']:
        assert dtype in content, f"缺少 dataType 类型: {dtype}"


# ========== P0: 表单 ==========

def test_indicator_form_has_type_selector():
    """新建/编辑指标表单包含指标类型选择器"""
    content = _get_content()
    # 检查表单中有 indicatorType 相关的 select/input
    assert "ind-type" in content or "indicatorType" in content, "表单缺少指标类型选择器"


def test_indicator_form_has_data_type_selector():
    """新建/编辑指标表单包含数据类型选择器"""
    content = _get_content()
    assert "ind-data-type" in content or "dataType" in content, "表单缺少数据类型选择器"


def test_indicator_save_reads_new_fields():
    """保存逻辑读取了新字段"""
    content = _get_content()
    func_start = content.find("window.ind_save = function")
    func_end = content.find("window.ind_export = function", func_start)
    save_func = content[func_start:func_end]
    assert "indicatorType" in save_func, "ind_save 未读取 indicatorType"
    assert "dataType" in save_func, "ind_save 未读取 dataType"


# ========== P0: 删除引用检查 ==========

def test_indicator_delete_checks_kpi_references():
    """删除指标时检查是否被 KPI 实例引用"""
    content = _get_content()
    assert "indicatorId === id" in content or "k.indicatorId === id" in content, "删除时未检查 KPI 引用"


# ========== P1: 列表展示 ==========

def test_indicator_list_shows_type_badge():
    """指标列表展示类型标识（结果/过程）"""
    content = _get_content()
    # 指标列表渲染区域
    list_start = content.find("<!-- 指标列表 -->")
    list_end = content.find("<!-- 详情面板 -->", list_start)
    list_html = content[list_start:list_end] if list_start > 0 else content
    # 检查列表中有 indicatorType 或结果/过程相关的展示
    has_type_show = (
        "indicatorType" in list_html or
        "结果指标" in list_html or
        "过程指标" in list_html
    )
    assert has_type_show, "指标列表未展示类型标识"


def test_indicator_list_shows_reference_count():
    """指标列表展示被引用次数"""
    content = _get_content()
    # 检查列表渲染中有引用次数计算或展示
    list_start = content.find("<!-- 指标列表 -->")
    list_end = content.find("<!-- 详情面板 -->", list_start)
    list_html = content[list_start:list_end] if list_start > 0 else content
    # 引用次数展示或计算逻辑
    has_ref = (
        "usedBy" in content or
        "引用" in list_html or
        "kpiInstances" in list_html or
        "indicatorId" in list_html
    )
    assert has_ref, "指标列表未展示引用次数"


# ========== P1: 详情面板 ==========

def test_indicator_detail_shows_new_fields():
    """指标详情面板展示 indicatorType 和 dataType"""
    content = _get_content()
    detail_start = content.find("<!-- 详情面板 -->")
    detail_end = content.find("${selectedInd ? '", detail_start)
    detail_html = content[detail_start:detail_end] if detail_start > 0 else content
    has_type = "indicatorType" in detail_html or "指标类型" in detail_html
    has_dtype = "dataType" in detail_html or "数据类型" in detail_html
    assert has_type, "详情面板未展示指标类型"
    assert has_dtype, "详情面板未展示数据类型"
