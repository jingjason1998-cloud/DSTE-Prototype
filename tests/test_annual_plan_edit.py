"""
年度经营计划 — 编辑功能测试
"""

from pathlib import Path

SRC = Path(__file__).parent.parent / "src"
COCKPIT = SRC / "cockpit.html"


def _read_cockpit() -> str:
    return COCKPIT.read_text(encoding="utf-8")


def test_kpi_detail_panel_exists():
    """点击 KPI 行后右侧面板存在"""
    content = _read_cockpit()
    plan_section = content.split("function renderAnnualPlan()")[1] if "function renderAnnualPlan()" in content else ""
    assert "selectedKpiId" in plan_section, "未找到选中 KPI 的状态管理"
    # 右侧面板应该有表单输入
    assert "<input" in plan_section or "<textarea" in plan_section or "<select" in plan_section, \
        "未找到表单输入元素"


def test_kpi_edit_form_has_target_value():
    """编辑表单包含目标值输入"""
    content = _read_cockpit()
    plan_section = content.split("function renderAnnualPlan()")[1] if "function renderAnnualPlan()" in content else ""
    assert "targetValue" in plan_section or "target_value" in plan_section or "目标值" in plan_section, \
        "编辑表单未包含目标值字段"


def test_kpi_edit_form_has_weight():
    """编辑表单包含权重输入"""
    content = _read_cockpit()
    plan_section = content.split("function renderAnnualPlan()")[1] if "function renderAnnualPlan()" in content else ""
    assert "weight" in plan_section or "权重" in plan_section, \
        "编辑表单未包含权重字段"


def test_kpi_edit_save_action_exists():
    """存在保存编辑的事件 action"""
    content = _read_cockpit()
    assert "ap-save-kpi" in content or "ap-kpi-save" in content, \
        "未找到保存 KPI 编辑的事件 action"


def test_kpi_decompose_action_exists():
    """存在分解 KPI 的事件 action"""
    content = _read_cockpit()
    assert "ap-decompose" in content, \
        "未找到分解 KPI 的事件 action"


def test_add_kpi_action_exists():
    """存在添加 KPI 的事件 action"""
    content = _read_cockpit()
    assert "ap-add-kpi" in content, \
        "未找到添加 KPI 的事件 action"


def test_add_kpi_form_has_owner_field():
    """添加 KPI 表单包含负责人字段"""
    content = _read_cockpit()
    add_section = content.split("window.ap_addKpi = function()")[1] if "window.ap_addKpi = function()" in content else ""
    assert "ap-add-owner" in add_section, "未找到负责人输入框"


def test_add_kpi_form_has_dept_field():
    """添加 KPI 表单包含责任部门字段"""
    content = _read_cockpit()
    add_section = content.split("window.ap_addKpi = function()")[1] if "window.ap_addKpi = function()" in content else ""
    assert "ap-add-dept" in add_section, "未找到责任部门输入框"


def test_add_kpi_form_has_unit_field():
    """添加 KPI 表单包含计量单位字段"""
    content = _read_cockpit()
    add_section = content.split("window.ap_addKpi = function()")[1] if "window.ap_addKpi = function()" in content else ""
    assert "ap-add-unit" in add_section, "未找到计量单位输入框"
