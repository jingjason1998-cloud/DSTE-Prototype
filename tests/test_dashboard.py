"""
DSTE 驾驶舱首页（renderDashboard）真实数据改造验证
- 重点工作进度表 / 重点工作完成率：读 OMP tasks
- 战略地图概览 BSC 四维度 / 预警通知 / 欢迎卡预警徽章：读 OMP kpiInstances
- 经营分析会卡：读 dste_meetings
- 无真实数据源的指标保留硬编码，但必须带「演示数据」标注
"""

from pathlib import Path

PROJECT_ROOT = Path("/Users/jasonjing/DSTE-Prototype")
SRC = PROJECT_ROOT / "src"


def _dashboard_section():
    """提取 renderDashboard 函数体（到下一个函数 renderCatalogManagement 为止）"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    start = content.index("function renderDashboard()")
    end = content.index("function renderCatalogManagement()")
    return content[start:end]


# ========== 真实数据来源 ==========
def test_dashboard_initializes_omp_data():
    """renderDashboard 调用 omp_load 前必须先 omp_initData() 初始化"""
    section = _dashboard_section()
    assert "omp_initData()" in section, "renderDashboard 未调用 omp_initData()"
    assert section.index("omp_initData()") < section.index("omp_load('tasks')"), \
        "omp_initData() 必须先于 omp_load('tasks') 调用"


def test_dashboard_reads_omp_tasks():
    """重点工作进度表改读 OMP tasks"""
    section = _dashboard_section()
    assert "omp_load('tasks')" in section, "重点工作进度表未读取 OMP tasks"


def test_dashboard_reads_kpi_instances():
    """战略地图概览 / 预警通知改读 OMP kpiInstances"""
    section = _dashboard_section()
    assert "omp_load('kpiInstances')" in section, "未读取 OMP kpiInstances"


def test_dashboard_reads_meetings():
    """经营分析会卡改读 dste_meetings"""
    section = _dashboard_section()
    assert "dste_meetings" in section, "经营分析会卡未读取 dste_meetings"


# ========== 硬编码演示数据清理 ==========
def test_dashboard_no_hardcoded_task_rows():
    """重点工作进度表不再包含硬编码任务行"""
    section = _dashboard_section()
    for name in ["渠道拓展计划", "产品升级迭代", "供应链优化", "客户成功体系建设"]:
        assert name not in section, f"重点工作表仍硬编码任务: {name}"
    for owner in ["李经理", "王总监", "赵经理"]:
        assert owner not in section, f"重点工作表仍硬编码负责人: {owner}"


def test_dashboard_no_hardcoded_alerts():
    """预警通知不再包含硬编码预警与硬编码数量徽章"""
    section = _dashboard_section()
    assert "客户满意度下降" not in section, "预警通知仍硬编码「客户满意度下降」"
    assert "新产品推广滞后" not in section, "预警通知仍硬编码「新产品推广滞后」"
    assert "3 项预警" not in section, "欢迎卡仍硬编码「3 项预警」徽章"
    assert "3 条待处理" not in section, "预警卡仍硬编码「3 条待处理」"


def test_dashboard_no_hardcoded_completion_rate():
    """重点工作完成率 KPI 不再硬编码"""
    section = _dashboard_section()
    assert "18/20 完成" not in section, "重点工作完成率仍硬编码 18/20"


def test_dashboard_no_hardcoded_bsc_overview():
    """战略地图概览 BSC 四维度不再硬编码"""
    section = _dashboard_section()
    for text in ["增长 30%", "NPS &gt; 70", "NPS > 70", "效率 +20%", "培训 100%"]:
        assert text not in section, f"战略地图概览仍硬编码: {text}"


def test_dashboard_no_hardcoded_meetings():
    """经营分析会卡不再硬编码会议"""
    section = _dashboard_section()
    for text in ["月度经营会", "Q1 季度战略会", "Q2 季度战略会"]:
        assert text not in section, f"经营分析会卡仍硬编码: {text}"


# ========== 演示数据标注 ==========
def test_dashboard_demo_metrics_kept_but_annotated():
    """无真实数据源的指标保留硬编码，且必须带「演示数据」标注"""
    section = _dashboard_section()
    # 演示指标保留
    assert "27.6%" in section, "营收增长率演示值被误删"
    assert "28.4%" in section, "新产品收入占比演示值被误删"
    assert "本季度剩余 45 天" in section, "季度剩余天数演示文案被误删"
    assert "供应链成本上升" in section, "供应链成本演示预警被误删"
    # 演示标注存在且应用到多处（徽标常量定义 + 至少 4 处引用）
    assert "演示数据" in section, "缺少「演示数据」标注"
    assert section.count("DEMO_BADGE") >= 5, "演示数据标注未应用到全部演示指标（常量定义 + >=4 处引用）"


def test_dashboard_demo_badge_uses_css_variables():
    """演示标注使用 CSS 变量配色，不硬编码颜色"""
    section = _dashboard_section()
    # 找到 DEMO_BADGE 常量定义行
    const_lines = [l for l in section.splitlines() if "const DEMO_BADGE" in l]
    assert const_lines, "未找到 DEMO_BADGE 常量定义"
    assert "var(--" in const_lines[0], "演示标注未使用 CSS 变量配色"
    assert "演示数据" in const_lines[0], "DEMO_BADGE 常量未包含演示数据文案"


# ========== 空态处理 ==========
def test_dashboard_has_empty_states():
    """各真实数据区块无数据时提供空态提示"""
    section = _dashboard_section()
    assert "暂无" in section, "缺少空态提示文案"
