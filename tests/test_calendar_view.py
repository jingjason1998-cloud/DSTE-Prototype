"""
日历视图功能测试 — 月视图 + 年视图纵览
验证新增日历功能不破坏现有架构
"""

import re
from pathlib import Path

PROJECT_ROOT = Path("/Users/jasonjing/DSTE-Prototype")
SRC = PROJECT_ROOT / "src"


def test_calendar_month_renderer_exists():
    """驾驶舱包含月视图渲染函数"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    assert "function renderCalendarMonth(" in content or "window.renderCalendarMonth = function(" in content, "缺少 renderCalendarMonth 函数"


def test_calendar_year_renderer_exists():
    """驾驶舱包含年视图渲染函数"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    assert "function renderCalendarYear(" in content or "window.renderCalendarYear = function(" in content, "缺少 renderCalendarYear 函数"


def test_calendar_view_switcher_exists():
    """驾驶舱包含日历视图切换函数（月/年）"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    assert "window.switchCalendarView = function(" in content or "function switchCalendarView(" in content, "缺少 switchCalendarView 函数"


def test_calendar_month_navigation_exists():
    """月视图包含月份导航按钮（上一月/下一月/今天）"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    calendar_section = content.split("function renderCalendarMonth(")[1] if "function renderCalendarMonth(" in content else ""
    if not calendar_section:
        calendar_section = content.split("window.renderCalendarMonth = function(")[1] if "window.renderCalendarMonth = function(" in content else ""
    # 月份导航按钮
    assert "上一月" in calendar_section or "prev-month" in calendar_section or "←" in calendar_section, "月视图缺少上一月按钮"
    assert "下一月" in calendar_section or "next-month" in calendar_section or "→" in calendar_section, "月视图缺少下一月按钮"
    assert "今天" in calendar_section or "today" in calendar_section, "月视图缺少今天按钮"


def test_calendar_year_navigation_exists():
    """年视图包含年份导航按钮（上一年/下一年/今天）"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    calendar_section = content.split("function renderCalendarYear(")[1] if "function renderCalendarYear(" in content else ""
    if not calendar_section:
        calendar_section = content.split("window.renderCalendarYear = function(")[1] if "window.renderCalendarYear = function(" in content else ""
    # 年份导航按钮
    assert "上一年" in calendar_section or "prev-year" in calendar_section or "←" in calendar_section, "年视图缺少上一年按钮"
    assert "下一年" in calendar_section or "next-year" in calendar_section or "→" in calendar_section, "年视图缺少下一年按钮"


def test_calendar_view_mode_buttons_exist():
    """日历视图头部包含月视图/年视图切换按钮"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    calendar_panel = content.split('id="meetings-calendar-panel"')[1] if 'id="meetings-calendar-panel"' in content else ""
    assert "月视图" in calendar_panel or "month" in calendar_panel, "日历视图缺少月视图切换按钮"
    assert "年视图" in calendar_panel or "year" in calendar_panel, "日历视图缺少年视图切换按钮"


def test_calendar_header_is_compact():
    """日历视图采用局部切换：只替换左侧会议列表面板，右侧模块保留"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    toggle_section = content.split("window.toggleMeetingsView = function(")[1] if "window.toggleMeetingsView = function(" in content else ""
    # 局部切换：只切换 meetings-list-panel 和 meetings-calendar-panel
    assert "meetings-list-panel" in toggle_section, "toggleMeetingsView 未处理 meetings-list-panel"
    assert "meetings-calendar-panel" in toggle_section, "toggleMeetingsView 未处理 meetings-calendar-panel"
    # 右侧模块（执行概览、决议执行趋势、待办提醒）始终显示
    assert "card-header" in content, "缺少 card-header 头部区域"


def test_calendar_meeting_list_footer_exists():
    """月视图底部包含当月会议清单区域"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    calendar_section = content.split("function renderCalendarMonth(")[1] if "function renderCalendarMonth(" in content else ""
    if not calendar_section:
        calendar_section = content.split("window.renderCalendarMonth = function(")[1] if "window.renderCalendarMonth = function(" in content else ""
    # 底部会议清单
    assert "calendar-meeting-list" in calendar_section or "会议清单" in calendar_section or "当月会议" in calendar_section, "月视图缺少底部会议清单"


def test_calendar_meeting_color_bar():
    """日历日期格子中用场景色显示会议"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    calendar_section = content.split("function renderCalendarMonth(")[1] if "function renderCalendarMonth(" in content else ""
    if not calendar_section:
        calendar_section = content.split("window.renderCalendarMonth = function(")[1] if "window.renderCalendarMonth = function(" in content else ""
    # 会议应使用场景颜色
    assert "SCENARIO_CONFIG" in calendar_section, "日历未使用 SCENARIO_CONFIG 颜色"
    assert "openMeetingDetail" in calendar_section, "日历格子未绑定点击打开详情"


def test_calendar_year_mini_calendar_grid():
    """年视图包含 12 个迷你月历网格"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    calendar_section = content.split("function renderCalendarYear(")[1] if "function renderCalendarYear(" in content else ""
    if not calendar_section:
        calendar_section = content.split("window.renderCalendarYear = function(")[1] if "window.renderCalendarYear = function(" in content else ""
    # 12 个月份
    assert "1月" in calendar_section or "January" in calendar_section, "年视图缺少月份标题"
    # 迷你日历应有日期网格
    assert "grid-template-columns: repeat(7" in calendar_section or "日一二三四五六" in calendar_section, "年视图迷你月历缺少日期网格"
