"""
DSTE 整合测试 — 会议审核助手 + 专题管理
验证新增功能不破坏现有架构
"""

import re
from pathlib import Path

PROJECT_ROOT = Path("/Users/jasonjing/DSTE-Prototype")
SRC = PROJECT_ROOT / "src"


def test_reviewer_html_exists():
    """会议审核助手整合页面存在"""
    f = SRC / "reviewer.html"
    assert f.exists(), "reviewer.html 不存在"
    content = f.read_text(encoding="utf-8")
    assert "<!DOCTYPE html>" in content
    assert 'data-theme="light"' in content or 'data-theme' in content


def test_reviewer_html_has_dste_nav():
    """审核页面包含DSTE导航条"""
    content = (SRC / "reviewer.html").read_text(encoding="utf-8")
    assert "DSTE 战略管理平台" in content, "缺少DSTE品牌标识"
    assert ".top-nav" in content, "缺少统一顶部导航"
    assert "会议材料审核" in content, "缺少侧边栏当前页"
    assert "cockpit.html" in content, "缺少驾驶舱返回链接"
    assert "../assets/css/main.css" in content, "未引入DSTE主样式"


def test_reviewer_html_theme_sync():
    """审核页面支持与DSTE主题同步"""
    content = (SRC / "reviewer.html").read_text(encoding="utf-8")
    assert "dste-theme" in content, "未使用 dste-theme 键同步主题"
    assert "localStorage.getItem('dste-theme')" in content, "未读取DSTE主题"
    assert "localStorage.setItem('dste-theme'" in content, "未设置DSTE主题"
    assert "storage" in content, "未监听 storage 事件跨页面同步"


def test_cockpit_has_strategy_topics_renderer():
    """驾驶舱包含战略专题渲染函数"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "function renderStrategyTopics()" in content, "缺少 renderStrategyTopics"
    assert "'sp/strategy-topics': renderStrategyTopics" in content, "PAGES未映射战略专题"


def test_cockpit_has_business_topics_link():
    """驾驶舱链接到业务专题管理独立页面"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "business-topics.html" in content, "未链接到业务专题页面"


def test_cockpit_has_meeting_review_nav():
    """驾驶舱导航中包含会议审核入口"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "'exe/meeting-review'" in content, "导航中缺少会议审核入口"
    assert "会议材料审核" in content or "会议审核" in content, "导航标签不正确"


def test_cockpit_has_external_page_mapping():
    """驾驶舱支持外部页面跳转"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "EXTERNAL_PAGES" in content, "缺少外部页面映射机制"
    assert "'exe/meeting-review': 'reviewer.html'" in content, "未映射到 reviewer.html"


def test_cockpit_meetings_has_review_link():
    """经营分析会页面包含审核入口"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "待审核材料" in content, "经营分析会缺少待审核材料统计"
    assert "审核会议材料" in content or "reviewer.html" in content, "经营分析会缺少审核链接"


def test_navigation_arch_document_updated():
    """设计文档已整合到 docs"""
    doc = PROJECT_ROOT / "docs" / "02-RFC功能设计" / "001-navigation-arch.md"
    assert doc.exists(), "导航架构文档不存在"
    content = doc.read_text(encoding="utf-8")
    assert "reviewer.html" in content, "文档未记录 reviewer.html"
    assert "会议材料审核" in content, "文档未记录会议审核"
    assert "2026-05-20" in content, "文档缺少更新日期"


def test_no_placeholder_for_topics():
    """专题管理不再是占位页面"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "'sp/strategy-topics': renderStrategyTopics," in content
    # 业务专题现在是独立页面，通过外部映射跳转
    assert "'exe/business-topics': 'business-topics.html'" in content
    page_lines = [l for l in content.splitlines() if "'sp/strategy-topics'" in l or "'exe/business-topics'" in l]
    for line in page_lines:
        assert "renderPlaceholder" not in line, f"专题管理仍是占位页: {line.strip()}"


# ========== 独立审查修复验证 ==========

def test_reviewer_xss_protection():
    """审核页面关键 URL 输出已做安全处理"""
    content = (SRC / "reviewer.html").read_text(encoding="utf-8")
    # sanitizeUrl 函数存在
    assert "function sanitizeUrl(url)" in content, "缺少 sanitizeUrl 函数"
    assert "javascript:" in content or "protocol === 'http:" in content, "sanitizeUrl 未校验协议"
    # directReview 和 showHistoryDetail 中 href 使用 sanitizeUrl
    assert 'href="${sanitizeUrl(data.url)}"' in content, "directReview URL 未使用 sanitizeUrl"
    assert 'href="${sanitizeUrl(rec.url)}"' in content, "showHistoryDetail URL 未使用 sanitizeUrl"


def test_reviewer_empty_matrix_guard():
    """renderCompareMatrix 已添加空数组防护"""
    content = (SRC / "reviewer.html").read_text(encoding="utf-8")
    assert "data.matrix.length === 0" in content, "未添加空矩阵防护"


def test_reviewer_app_build_defined():
    """__APP_BUILD__ 已定义避免 undefined"""
    content = (SRC / "reviewer.html").read_text(encoding="utf-8")
    assert "window.__APP_BUILD__" in content, "未定义 __APP_BUILD__"


def test_reviewer_vertical_segment_mapping():
    """vertical-segment-review 场景映射已补充"""
    content = (SRC / "reviewer.html").read_text(encoding="utf-8")
    assert "'vertical-segment-review'" in content, "缺少 vertical-segment-review 场景定义"
    # 检查 getLocalFocusDimensions 映射
    assert "'vertical-segment-review':" in content, "getLocalFocusDimensions 缺少该场景映射"


def test_strategy_topics_render_output():
    """战略专题渲染输出包含预期结构"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    # 验证表格列名
    assert "专题名称" in content, "战略专题表格缺少名称列"
    assert "战略维度" in content, "战略专题表格缺少维度列"
    assert "负责人" in content, "战略专题表格缺少负责人列"
    assert "进度" in content, "战略专题表格缺少进度列"
    # 验证 KPI 和状态数据存在（直接检查文件内容，这些关键字在 renderStrategyTopics 中首次出现）
    assert "进行中" in content, "战略专题缺少状态数据"
    assert "kpi-grid" in content, "战略专题缺少 KPI 卡片"


def test_business_topics_html_exists():
    """业务专题管理独立页面存在"""
    f = SRC / "business-topics.html"
    assert f.exists(), "business-topics.html 不存在"
    content = f.read_text(encoding="utf-8")
    assert "<!DOCTYPE html>" in content
    assert 'data-theme' in content


def test_business_topics_has_dste_nav():
    """业务专题页面包含DSTE导航条"""
    content = (SRC / "business-topics.html").read_text(encoding="utf-8")
    assert "DSTE 战略管理平台" in content, "缺少DSTE品牌标识"
    assert "cockpit.html" in content, "缺少返回驾驶舱链接"
    assert "../assets/css/main.css" in content, "未引入DSTE主样式"


def test_business_topics_theme_sync():
    """业务专题页面支持与DSTE主题同步"""
    content = (SRC / "business-topics.html").read_text(encoding="utf-8")
    assert "dste-theme" in content, "未使用 dste-theme 键同步主题"
    assert "localStorage.getItem('dste-theme')" in content, "未读取DSTE主题"
    assert "localStorage.setItem('dste-theme'" in content, "未设置DSTE主题"


def test_business_topics_light_override():
    """业务专题页面包含Light主题覆盖"""
    content = (SRC / "business-topics.html").read_text(encoding="utf-8")
    assert '[data-theme="light"] .topic-workspace' in content, "未覆盖workspace背景"
    assert '[data-theme="light"] .modal-content' in content, "未覆盖弹窗背景"
    assert '[data-theme="light"] .data-table th' in content, "未覆盖表格表头"


def test_cockpit_links_to_business_topics():
    """驾驶舱导航正确链接到业务专题页面"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "business-topics.html" in content, "驾驶舱未链接到 business-topics.html"
    assert "'exe/business-topics': 'business-topics.html'" in content, "外部页面映射不正确"


def test_meeting_detail_view_exists():
    """会议详情弹窗存在且可打开"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "window.openMeetingDetail = function(" in content, "缺少 openMeetingDetail 函数"
    assert "meeting-detail-overlay" in content, "缺少会议详情弹窗 HTML"
    assert "closeMeetingDetail" in content, "缺少关闭详情函数"


def test_meeting_card_opens_detail_not_editor():
    """点击会议卡片进入详情而非直接编辑"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    # 卡片 onclick 应调用 openMeetingDetail
    assert 'onclick="openMeetingDetail(' in content, "会议卡片未绑定 openMeetingDetail"
    # 卡片不应直接调用 openMeetingEditor
    card_pattern = re.compile(r'class="meeting-card".*onclick="openMeetingEditor')
    assert not card_pattern.search(content), "会议卡片仍直接绑定 openMeetingEditor"


def test_meeting_detail_has_edit_button():
    """详情弹窗包含编辑按钮"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    # 详情弹窗内应有编辑按钮
    assert "openMeetingEditor" in content, "详情弹窗缺少编辑按钮触发"
    # 编辑按钮应在详情弹窗内部（通过overlay id判断）
    detail_section = content.split('id="meeting-detail-overlay"')[1] if 'id="meeting-detail-overlay"' in content else content
    assert "编辑" in detail_section or "✏️" in detail_section, "详情弹窗缺少编辑按钮"


def test_meeting_host_save_persisted():
    """会议主持人修改通过 window._meetingsData 持久化"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "window._meetingsData" in content, "缺少 meetings 数据持久化机制"
    # saveMeeting 中应修改 meetings 数组
    save_section = content.split("window.saveMeeting = function()")[1] if "window.saveMeeting = function()" in content else ""
    assert "edit-host" in save_section, "saveMeeting 未读取主持人输入"
    assert "meetings[idx].host" in save_section, "saveMeeting 未保存主持人"
