"""
DSTE 战略专题年份维度测试
验证专题按年份管理的数据模型和UI展示
TDD: 先写测试，再写实现
"""

import re
from pathlib import Path

PROJECT_ROOT = Path("/Users/jasonjing/DSTE-Prototype")
SRC = PROJECT_ROOT / "src"


# ========== 数据模型测试 ==========

def test_topic_has_year_field():
    """专题数据对象必须包含 year 字段"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    # 在 loadTopics 的初始数据中，每条专题应有 year 字段
    topics_section = content.split("function loadTopics()")[1] if "function loadTopics()" in content else ""
    # 检查初始数据中的 year 字段
    assert "year:" in topics_section, "专题初始数据缺少 year 字段"
    # 至少有一条数据的 year 不为空
    year_matches = re.findall(r"year:\s*(\d{4})", topics_section)
    assert len(year_matches) >= 1, "专题初始数据中未找到有效的 year 值"


def test_topic_year_values_reasonable():
    """专题年份值应在合理范围内（2020-2030）"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    topics_section = content.split("function loadTopics()")[1] if "function loadTopics()" in content else ""
    year_matches = re.findall(r"year:\s*(\d{4})", topics_section)
    for year in year_matches:
        y = int(year)
        assert 2020 <= y <= 2030, f"专题年份 {y} 不在合理范围 2020-2030"


def test_storage_key_upgraded_to_v2():
    """专题存储键应升级到 v2 以支持 year 字段"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    assert "dste_strategy_topics_v2" in insights_section, "专题存储未升级到 v2 键名"


def test_v1_migration_logic_exists():
    """应有 v1 到 v2 的迁移逻辑，自动为旧数据添加 year 字段"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    # 迁移逻辑应检测 v1 数据
    assert "dste_strategy_topics_v1" in insights_section, "缺少 v1 数据检测逻辑"
    # 迁移后应删除 v1 数据（通过变量或硬编码）
    assert "removeItem" in insights_section and "STORAGE_KEY_TOPICS_LEGACY" in insights_section, "迁移后未清理 v1 数据"


def test_migration_infers_year_from_startDate():
    """迁移时应根据 startDate 推断年份，无日期默认当年"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    # 应有从 startDate 提取年份的逻辑
    assert "startDate" in insights_section, "迁移逻辑未使用 startDate"
    # 应有默认年份处理（new Date().getFullYear() 或硬编码）
    assert "getFullYear" in insights_section or "2026" in insights_section, "迁移逻辑缺少默认年份"


# ========== UI 测试 ==========

def test_year_selector_exists():
    """专题列表Tab应包含年份选择器"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    # 年份选择器应为 select 元素或按钮组
    assert "year-selector" in insights_section or "data-year" in insights_section, "缺少年份选择器"
    # 应有年份选项（2024-2028）
    assert "2024" in insights_section or "2025" in insights_section or "2026" in insights_section, "年份选择器缺少选项"


def test_topics_grouped_by_year():
    """专题列表应按年份分组展示"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    # 应有按年份分组的渲染逻辑
    assert "groupByYear" in insights_section or "yearGroup" in insights_section or "按年份" in insights_section, "缺少按年份分组逻辑"
    # 或者通过检查是否有年份标题来判断
    year_header_pattern = re.compile(r"\d{4}[^\d]*年|year.*header|group.*year", re.IGNORECASE)
    assert year_header_pattern.search(insights_section), "未找到年份分组标题的渲染逻辑"


def test_year_filter_affects_topic_table():
    """切换年份应过滤专题表格数据"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    # 应有 filter 逻辑按 year 筛选
    assert "filter" in insights_section and "year" in insights_section, "缺少按年份过滤逻辑"
    # 或者通过检查 onchange/onclick 事件处理
    assert "onchange" in insights_section or "switchYear" in insights_section or "filterTopicsByYear" in insights_section, "年份切换缺少事件处理"


def test_kpi_stats_filtered_by_year():
    """KPI统计卡片应按当前选中年份过滤"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    # KPI统计应在过滤后的数据上计算
    # 检查是否有 currentYear 或 selectedYear 变量参与统计计算
    assert "currentYear" in insights_section or "selectedYear" in insights_section, "KPI统计未使用年份过滤变量"


def test_new_topic_form_has_year_field():
    """新建专题表单应包含年份选择字段"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    # 新建专题按钮或表单应有年份输入
    assert "btn-new-topic" in insights_section, "缺少新建专题按钮"
    # 由于新建专题可能是弹窗形式，检查是否有年份相关的表单元素
    # 至少应有 year 在表单相关代码中被引用
    form_section = insights_section.split("btn-new-topic")[1] if "btn-new-topic" in insights_section else insights_section
    assert "year" in form_section, "新建专题表单缺少 year 字段"


# ========== 回归测试 ==========

def test_insights_tab_not_affected_by_year():
    """洞察视图Tab不应被年份选择器影响（方案A轻量版）"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    # 年份选择器应只在专题列表Tab中
    # 检查 panel-insights 区域没有年份选择器
    panel_insights = insights_section.split('id="panel-insights"')[1] if 'id="panel-insights"' in insights_section else ""
    panel_insights_end = panel_insights.split('id="panel-topics"')[0] if 'id="panel-topics"' in panel_insights else panel_insights
    # 洞察视图不应有年份过滤逻辑
    assert "year-selector" not in panel_insights_end, "洞察视图不应包含年份选择器"


def test_existing_topic_fields_preserved():
    """现有专题字段应完整保留，year 是新增字段"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    topics_section = content.split("function loadTopics()")[1] if "function loadTopics()" in content else ""
    # 检查原有字段仍然存在
    required_fields = ["id:", "name:", "type:", "dimension:", "priority:", "status:", "owner:", "progress:"]
    for field in required_fields:
        assert field in topics_section, f"专题数据缺少原有字段 {field}"
