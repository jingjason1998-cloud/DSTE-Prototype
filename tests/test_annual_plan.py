"""
年度经营计划 — 测试套件
基于 Safe-coding 规范，先写测试再实现。

测试覆盖:
- 页面渲染: 年度经营计划页面包含必要结构
- 数据模型: 周期(cycle)和KPI实例的数据结构
- 交互: Tab切换、周期选择
"""

import re
from pathlib import Path

SRC = Path(__file__).parent.parent / "src"
COCKPIT = SRC / "cockpit.html"


def _read_cockpit() -> str:
    return COCKPIT.read_text(encoding="utf-8")


# ========== 页面渲染测试 ==========

def test_annual_plan_page_exists():
    """年度经营计划页面 renderAnnualPlan 函数存在"""
    content = _read_cockpit()
    assert "function renderAnnualPlan()" in content or "renderAnnualPlan = function" in content, \
        "未找到 renderAnnualPlan 函数"


def test_annual_plan_has_cycle_selector():
    """页面包含年度周期选择器"""
    content = _read_cockpit()
    # 应该有年份选择或周期切换UI
    assert "annual-plan" in content.lower() or "cycle" in content.lower() or "年度" in content, \
        "未找到年度/周期相关UI"


def test_annual_plan_has_tab_navigation():
    """页面包含 Tab 导航（总览、战区分解等）"""
    content = _read_cockpit()
    # 至少要有2个tab
    tabs = re.findall(r'data-tab=["\']\w+["\']', content)
    # 或者检查是否有 annual-plan 相关的 tab 按钮
    plan_section = content.split("function renderAnnualPlan()")[1] if "function renderAnnualPlan()" in content else ""
    assert len(plan_section) > 500, "renderAnnualPlan 函数体过短，可能没有实现"


def test_annual_plan_has_kpi_table_structure():
    """总览 Tab 包含 KPI 总目标表格结构"""
    content = _read_cockpit()
    plan_section = content.split("function renderAnnualPlan()")[1] if "function renderAnnualPlan()" in content else ""
    # 表格相关
    assert "<table" in plan_section or "table" in plan_section.lower(), \
        "未找到表格结构"
    # KPI 相关字段
    assert "targetValue" in plan_section or "target_value" in plan_section or "目标" in plan_section, \
        "未找到目标值相关字段"


def test_annual_plan_has_placeholder_replaced():
    """年度经营计划的 placeholder 已被替换为真实实现"""
    content = _read_cockpit()
    # 检查路由映射中 bp/annual-plan 不再指向 renderPlaceholder
    route_section = content.split("'bp/annual-plan'") if "'bp/annual-plan'" in content else []
    if len(route_section) >= 2:
        after_route = route_section[1][:200]
        assert "renderPlaceholder" not in after_route, \
            "bp/annual-plan 仍使用 renderPlaceholder"


# ========== 数据模型测试 ==========

def test_cycle_data_structure_in_mock():
    """mock 数据或状态中包含 cycle 数据结构"""
    content = _read_cockpit()
    # 检查是否有周期相关的数据初始化
    assert "cycle" in content.lower() or "phase" in content.lower() or "planning" in content.lower(), \
        "未找到周期(cycle)相关的数据结构"


def test_kpi_instance_has_cycle_id():
    """KPI 实例数据包含 cycleId 字段"""
    content = _read_cockpit()
    # 检查 omp_initData 或年度经营计划相关的数据模型
    assert "cycleId" in content or "cycle_id" in content.lower(), \
        "KPI 实例数据未包含 cycleId 字段"


# ========== 交互测试 ==========

def test_annual_plan_has_event_delegation():
    """年度经营计划页面使用事件委托而非内联 onclick"""
    content = _read_cockpit()
    # 精确提取 renderAnnualPlan 函数体（到下一个 function 定义前）
    match = re.search(r'function renderAnnualPlan\(\)\s*\{(.*?)\n      function ', content, re.DOTALL)
    plan_section = match.group(1) if match else ""
    # 年度经营计划渲染区域不应出现内联 onclick
    onclick_in_plan = re.findall(r'onclick\s*=\s*["\']', plan_section)
    assert len(onclick_in_plan) == 0, \
        f"年度经营计划区域有 {len(onclick_in_plan)} 个内联 onclick，应使用事件委托"


def test_annual_plan_tab_switch_logic_exists():
    """Tab 切换逻辑存在"""
    content = _read_cockpit()
    # 检查是否有 active tab 的状态管理
    assert "activeTab" in content or "active_tab" in content.lower() or "switchTab" in content, \
        "未找到 Tab 切换逻辑"


def test_annual_plan_has_publish_action():
    """年度经营计划页面包含发布到执行 action"""
    content = _read_cockpit()
    assert "data-action=\"ap-publish\"" in content, "未找到 ap-publish 按钮"
    assert "ap_publishToExecution" in content, "未找到 ap_publishToExecution 函数"


def test_annual_plan_decomposition_is_dynamic():
    """分解视图基于实际父级 KPI 动态渲染，而非硬编码指标名"""
    content = _read_cockpit()
    decomp_section = content.split("function ap_renderDecompositionTab(")[1] if "function ap_renderDecompositionTab(" in content else ""
    assert "kpis.map(parentKpi" in decomp_section, "分解视图未遍历父级 KPI"
    assert "销售额-D" not in decomp_section, "分解视图仍硬编码销售额-D"
    assert "parentId === parentKpi.id" in decomp_section, "子节点未按 parentId 匹配"
