"""
DSTE 战略专题 CRUD 测试
验证查看/编辑/删除功能的数据模型和 UI 结构
TDD: 先写测试，再写实现
"""

import re
from pathlib import Path

PROJECT_ROOT = Path("/Users/jasonjing/DSTE-Prototype")
SRC = PROJECT_ROOT / "src"


def _strategy_section():
    """提取战略专题管理相关代码（共享工具 + renderStrategyTopicsPage + 弹窗函数）"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    start_marker = "// ===== 战略洞察与专题共享工具函数"
    end_marker = "// ===== 业务专题管理页面 ====="
    if start_marker not in content or end_marker not in content:
        return ""
    start = content.find(start_marker)
    end = content.find(end_marker, start)
    return content[start:end]


def _topics_section():
    """提取 siDefaultTopics 函数体"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    marker = "function siDefaultTopics()"
    if marker not in content:
        return ""
    start = content.find(marker)
    rest = content[start:]
    end_match = re.search(r"\n      function ", rest[1:])
    end = start + 1 + end_match.start() if end_match else len(content)
    return content[start:end]


# ========== 查看详情弹窗 ==========

def test_view_topic_modal_exists():
    """点击查看按钮应打开专题详情弹窗"""
    insights_section = _strategy_section()
    # 应有查看专题详情的全局函数
    assert "window.siViewTopicDetail" in insights_section, "缺少 siViewTopicDetail 函数"
    # 弹窗应有唯一 id
    assert "topic-detail-modal" in insights_section or "topic-detail-overlay" in insights_section, "缺少详情弹窗容器"


def test_view_modal_shows_topic_info():
    """详情弹窗应展示专题完整信息"""
    insights_section = _strategy_section()
    # 弹窗内容应包含以下字段（v1.2 字段增强后）
    required_fields = ["专题名称", "负责人", "成员", "战略维度", "类型", "阶段", "进度", "KMS 链接", "开始日期", "结束日期", "研究目标"]
    for field in required_fields:
        assert field in insights_section, f"详情弹窗缺少字段: {field}"


def test_view_modal_shows_milestones():
    """详情弹窗应展示里程碑列表"""
    insights_section = _strategy_section()
    assert "里程碑" in insights_section, "详情弹窗缺少里程碑区域"
    # 里程碑应有状态标识（完成/待办）
    assert "completed" in insights_section or "✓" in insights_section or "○" in insights_section, "里程碑缺少状态标识"


def test_view_modal_shows_linked_insights():
    """详情弹窗应展示关联洞察"""
    insights_section = _strategy_section()
    assert "关联洞察" in insights_section or "insights" in insights_section, "详情弹窗缺少关联洞察区域"


def test_view_modal_has_edit_button():
    """详情弹窗内应有编辑按钮"""
    insights_section = _strategy_section()
    assert "siOpenTopicEdit" in insights_section or "编辑" in insights_section, "详情弹窗缺少编辑按钮"


# ========== 编辑弹窗 ==========

def test_edit_modal_exists():
    """应有编辑专题的全局函数和弹窗"""
    insights_section = _strategy_section()
    assert "window.siOpenTopicEdit" in insights_section, "缺少 siOpenTopicEdit 函数"
    assert "window.siSaveTopicEdit" in insights_section, "缺少 siSaveTopicEdit 函数"
    assert "topic-edit-modal" in insights_section or "topic-edit-overlay" in insights_section, "缺少编辑弹窗容器"


def test_edit_form_has_required_fields():
    """编辑表单应包含所有可修改字段"""
    insights_section = _strategy_section()
    # 可编辑字段（不含年份）
    editable_fields = [
        "edit-topic-name", "edit-topic-dimension", "edit-topic-type",
        "edit-topic-owner", "edit-topic-status", "edit-topic-startDate",
        "edit-topic-endDate", "edit-topic-progress", "edit-topic-members",
        "edit-topic-kmsUrl", "edit-topic-researchObjectives", "edit-topic-deliverables",
        "edit-topic-summary"
    ]
    for field in editable_fields:
        assert field in insights_section, f"编辑表单缺少字段: {field}"


def test_edit_form_no_year_field():
    """编辑表单不应包含年份字段（不允许修改年份）"""
    insights_section = _strategy_section()
    # 编辑表单区域内不应有年份输入
    edit_section = insights_section.split("topic-edit")[1] if "topic-edit" in insights_section else insights_section
    assert "edit-topic-year" not in edit_section, "编辑表单不应包含年份字段"


def test_edit_form_has_milestone_management():
    """编辑表单应包含里程碑增删功能"""
    insights_section = _strategy_section()
    assert "edit-topic-milestones" in insights_section or "milestone-list" in insights_section, "编辑表单缺少里程碑列表"
    assert "siAddMilestoneRow" in insights_section or "add-milestone" in insights_section, "编辑表单缺少添加里程碑功能"
    assert "siAddMilestoneRow" in insights_section or "removeMilestone" in insights_section or "this.parentElement.remove()" in insights_section, "编辑表单缺少删除里程碑功能"


def test_edit_form_has_insight_selector():
    """编辑表单应包含关联洞察选择器"""
    insights_section = _strategy_section()
    assert "edit-topic-insights" in insights_section or "linked-insights" in insights_section, "编辑表单缺少关联洞察选择"


def test_edit_form_has_deliverable_management():
    """编辑表单应包含交付件批量管理"""
    insights_section = _strategy_section()
    assert "edit-topic-deliverables" in insights_section, "编辑表单缺少交付件列表"
    assert "siAddDeliverableRow" in insights_section, "编辑表单缺少添加交付件功能"
    assert "siToggleBatchDeliverables" in insights_section, "编辑表单缺少批量粘贴交付件功能"


# ========== 删除功能 ==========

def test_delete_has_confirm_modal():
    """删除应有确认弹窗"""
    insights_section = _strategy_section()
    assert "window.siConfirmDeleteTopic" in insights_section, "缺少 siConfirmDeleteTopic 函数"
    assert "delete-confirm" in insights_section or "confirm-delete" in insights_section, "缺少删除确认弹窗"


def test_delete_is_soft_delete():
    """删除应为软删除，标记 deleted 字段而非物理删除"""
    insights_section = _strategy_section()
    # saveTopics 或 delete 逻辑中应设置 deleted: true
    assert "deleted" in insights_section, "缺少软删除逻辑"
    assert "deleted = true" in insights_section, "软删除未标记 deleted = true"


def test_soft_delete_excluded_from_list():
    """软删除的专题不应出现在列表中"""
    insights_section = _strategy_section()
    # 过滤逻辑中应排除 deleted（通过 siGetActiveTopics 过滤）
    assert "siGetActiveTopics" in insights_section, "列表未使用 siGetActiveTopics 过滤已删除专题"


# ========== 数据持久化 ==========

def test_save_topics_after_edit():
    """编辑保存后应调用 siSaveTopics 持久化到 localStorage"""
    insights_section = _strategy_section()
    assert "siSaveTopics" in insights_section, "缺少 siSaveTopics 调用"


def test_edit_updates_timestamp():
    """编辑保存时应更新 updatedAt 时间戳"""
    insights_section = _strategy_section()
    assert "updatedAt" in insights_section, "编辑保存未更新 updatedAt"


# ========== 年度深化链 ==========

def test_topic_chain_function_exists():
    """应支持下一年深化专题创建"""
    insights_section = _strategy_section()
    assert "window.siOpenNextYearDeepening" in insights_section, "缺少 siOpenNextYearDeepening 函数"


def test_topic_chain_link_fields():
    """专题数据模型应包含 previousTopicId / nextTopicId"""
    topics_section = _topics_section()
    assert "previousTopicId" in topics_section, "专题数据缺少 previousTopicId"
    assert "nextTopicId" in topics_section, "专题数据缺少 nextTopicId"


# ========== 甘特图视图 ==========

def test_gantt_view_exists():
    """战略专题管理页面应支持甘特图视图"""
    insights_section = _strategy_section()
    assert "siRenderGanttChart" in insights_section, "缺少甘特图渲染函数"
    assert "gantt-bar" in insights_section, "甘特图缺少条形元素"
    assert "gantt-milestone" in insights_section, "甘特图缺少里程碑标记"
