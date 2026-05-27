"""
DSTE 战略专题 CRUD 测试
验证查看/编辑/删除功能的数据模型和 UI 结构
TDD: 先写测试，再写实现
"""

import re
from pathlib import Path

PROJECT_ROOT = Path("/Users/jasonjing/DSTE-Prototype")
SRC = PROJECT_ROOT / "src"


# ========== 查看详情弹窗 ==========

def test_view_topic_modal_exists():
    """点击查看按钮应打开专题详情弹窗"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    # 应有查看专题详情的全局函数
    assert "window.viewTopicDetail" in insights_section, "缺少 viewTopicDetail 函数"
    # 弹窗应有唯一 id
    assert "topic-detail-modal" in insights_section or "topic-detail-overlay" in insights_section, "缺少详情弹窗容器"


def test_view_modal_shows_topic_info():
    """详情弹窗应展示专题完整信息"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    # 弹窗内容应包含以下字段
    required_fields = ["专题名称", "负责人", "战略维度", "类型", "优先级", "阶段", "进度", "预算", "实际成本", "开始日期", "结束日期"]
    for field in required_fields:
        assert field in insights_section, f"详情弹窗缺少字段: {field}"


def test_view_modal_shows_milestones():
    """详情弹窗应展示里程碑列表"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    assert "里程碑" in insights_section, "详情弹窗缺少里程碑区域"
    # 里程碑应有状态标识（完成/待办）
    assert "completed" in insights_section or "✓" in insights_section or "○" in insights_section, "里程碑缺少状态标识"


def test_view_modal_shows_linked_insights():
    """详情弹窗应展示关联洞察"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    assert "关联洞察" in insights_section or "insights" in insights_section, "详情弹窗缺少关联洞察区域"


def test_view_modal_has_edit_button():
    """详情弹窗内应有编辑按钮"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    assert "openTopicEdit" in insights_section or "编辑" in insights_section, "详情弹窗缺少编辑按钮"


# ========== 编辑弹窗 ==========

def test_edit_modal_exists():
    """应有编辑专题的全局函数和弹窗"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    assert "window.openTopicEdit" in insights_section, "缺少 openTopicEdit 函数"
    assert "window.saveTopicEdit" in insights_section, "缺少 saveTopicEdit 函数"
    assert "topic-edit-modal" in insights_section or "topic-edit-overlay" in insights_section, "缺少编辑弹窗容器"


def test_edit_form_has_required_fields():
    """编辑表单应包含所有可修改字段"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    # 可编辑字段（不含年份）
    editable_fields = ["edit-topic-name", "edit-topic-dimension", "edit-topic-type", "edit-topic-priority", "edit-topic-owner", "edit-topic-status", "edit-topic-startDate", "edit-topic-endDate", "edit-topic-budget", "edit-topic-progress"]
    for field in editable_fields:
        assert field in insights_section, f"编辑表单缺少字段: {field}"


def test_edit_form_no_year_field():
    """编辑表单不应包含年份字段（不允许修改年份）"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    # 编辑表单区域内不应有年份输入
    edit_section = insights_section.split("topic-edit")[1] if "topic-edit" in insights_section else insights_section
    assert "edit-topic-year" not in edit_section, "编辑表单不应包含年份字段"


def test_edit_form_has_milestone_management():
    """编辑表单应包含里程碑增删功能"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    assert "edit-topic-milestones" in insights_section or "milestone-list" in insights_section, "编辑表单缺少里程碑列表"
    assert "addMilestone" in insights_section or "add-milestone" in insights_section, "编辑表单缺少添加里程碑功能"
    assert "removeMilestone" in insights_section or "remove-milestone" in insights_section or "this.parentElement.remove()" in insights_section, "编辑表单缺少删除里程碑功能"


def test_edit_form_has_insight_selector():
    """编辑表单应包含关联洞察选择器"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    assert "edit-topic-insights" in insights_section or "linked-insights" in insights_section, "编辑表单缺少关联洞察选择"


# ========== 删除功能 ==========

def test_delete_has_confirm_modal():
    """删除应有确认弹窗"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    assert "window.confirmDeleteTopic" in insights_section, "缺少 confirmDeleteTopic 函数"
    assert "delete-confirm" in insights_section or "confirm-delete" in insights_section, "缺少删除确认弹窗"


def test_delete_is_soft_delete():
    """删除应为软删除，标记 deleted 字段而非物理删除"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    # saveTopics 或 delete 逻辑中应设置 deleted: true
    assert "deleted" in insights_section, "缺少软删除逻辑"
    assert "deleted = true" in insights_section, "软删除未标记 deleted = true"


def test_soft_delete_excluded_from_list():
    """软删除的专题不应出现在列表中"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    # 过滤逻辑中应排除 deleted
    assert "t.deleted" in insights_section or "!t.deleted" in insights_section or "deleted !== true" in insights_section, "列表未排除已删除专题"


# ========== 数据持久化 ==========

def test_save_topics_after_edit():
    """编辑保存后应调用 saveTopics 持久化到 localStorage"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    assert "saveTopics" in insights_section, "缺少 saveTopics 调用"


def test_edit_updates_timestamp():
    """编辑保存时应更新 updatedAt 时间戳"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    insights_section = content.split("function renderInsightsTopics()")[1] if "function renderInsightsTopics()" in content else ""
    assert "updatedAt" in insights_section, "编辑保存未更新 updatedAt"
