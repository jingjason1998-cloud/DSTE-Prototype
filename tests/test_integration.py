"""
DSTE 整合测试 — 会议审核助手 + 专题管理
验证新增功能不破坏现有架构
"""

import re
from pathlib import Path

PROJECT_ROOT = Path("/Users/jasonjing/DSTE-Prototype")
SRC = PROJECT_ROOT / "src"


def _meetings_combined():
    """读取 meetings.html 及其拆分模块的合并内容，用于跨文件架构检查。"""
    files = [
        SRC / "meetings.html",
        SRC / "meetings" / "data-store.js",
        SRC / "meetings" / "utils" / "helpers.js",
        SRC / "meetings" / "utils" / "resolution-helpers.js",
        SRC / "meetings" / "renderers" / "meeting-detail.js",
        SRC / "meetings" / "renderers" / "meeting-prep.js",
        SRC / "meetings" / "renderers" / "eval-form.js",
        SRC / "meetings" / "renderers" / "pending-actions.js",
        SRC / "meetings" / "renderers" / "report-asset-manager.js",
    ]
    return "\n".join(f.read_text(encoding="utf-8") for f in files if f.exists())


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
    assert 'class="top-nav"' in content, "缺少统一顶部导航"
    assert "会议材料审核" in content, "缺少侧边栏当前页"
    assert "cockpit.html" in content, "缺少驾驶舱返回链接"
    assert "../assets/css/main.css" in content, "未引入DSTE主样式"

def test_reviewer_html_theme_sync():
    """审核页面支持与DSTE主题同步"""
    content = (SRC / "reviewer.html").read_text(encoding="utf-8")
    # reviewer.html 引用了外部 JS，需要同时搜索
    js_content = (SRC / "pages" / "reviewer" / "main.js").read_text(encoding="utf-8")
    main_js = (PROJECT_ROOT / "assets" / "js" / "main.js").read_text(encoding="utf-8")
    combined = content + js_content + main_js
    assert "dste-theme" in combined, "未使用 dste-theme 键同步主题"
    # 项目已统一使用 DSTE.Storage 封装 localStorage
    assert "DSTE.Storage.getString('dste-theme')" in combined or "localStorage.getItem('dste-theme')" in combined, "未读取DSTE主题"
    assert "Storage.setString(this.key, theme)" in combined or "DSTE.Storage.setString('dste-theme'" in combined or "localStorage.setItem('dste-theme'" in combined, "未设置DSTE主题"
    assert "ThemeManager" in combined, "缺少 ThemeManager 统一主题管理"

def test_cockpit_has_strategy_topics_renderer():
    """驾驶舱包含战略洞察与专题渲染函数"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    assert "function renderInsightsTopics()" in content, "缺少 renderInsightsTopics"
    assert "'sp/insights-topics': renderInsightsTopics" in content, "PAGES未映射战略洞察与专题"

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
    """驾驶舱支持外部页面跳转（映射已抽离到 src/lib/config.js）"""
    cockpit_content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    config_content = (SRC / "lib" / "config.js").read_text(encoding="utf-8")
    combined = cockpit_content + config_content
    assert "EXTERNAL_PAGES" in combined, "缺少外部页面映射机制"
    assert "'exe/meeting-review': 'reviewer.html'" in combined, "未映射到 reviewer.html"

def test_cockpit_meetings_has_review_link():
    """经营分析会页面包含审核入口"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
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
    cockpit_content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    config_content = (SRC / "lib" / "config.js").read_text(encoding="utf-8")
    combined = cockpit_content + config_content
    assert "'sp/insights-topics': renderInsightsTopics," in combined
    # 业务专题现在是独立页面，通过外部映射跳转（配置在 src/lib/config.js）
    assert "'exe/business-topics': 'business-topics.html'" in combined
    page_lines = [l for l in combined.splitlines() if "'sp/insights-topics'" in l or "'exe/business-topics'" in l]
    for line in page_lines:
        assert "renderPlaceholder" not in line, f"专题管理仍是占位页: {line.strip()}"


# ========== 独立审查修复验证 ==========
def test_reviewer_xss_protection():
    """审核页面关键 URL 输出已做安全处理"""
    content = (SRC / "reviewer.html").read_text(encoding="utf-8")
    js_content = (SRC / "pages" / "reviewer" / "main.js").read_text(encoding="utf-8")
    combined = content + js_content
    # sanitizeUrl 函数存在
    assert "function sanitizeUrl(url)" in combined, "缺少 sanitizeUrl 函数"
    assert "javascript:" in combined or "protocol === 'http:" in combined, "sanitizeUrl 未校验协议"
    # directReview 和 showHistoryDetail 中 href 使用 sanitizeUrl
    assert 'href="${sanitizeUrl(data.url)}"' in combined, "directReview URL 未使用 sanitizeUrl"
    assert 'href="${sanitizeUrl(rec.url)}"' in combined, "showHistoryDetail URL 未使用 sanitizeUrl"

def test_reviewer_empty_matrix_guard():
    """renderCompareMatrix 已添加空数组防护"""
    js_content = (SRC / "pages" / "reviewer" / "main.js").read_text(encoding="utf-8")
    assert "data.matrix.length === 0" in js_content, "未添加空矩阵防护"

def test_reviewer_app_build_defined():
    """__APP_BUILD__ 已定义避免 undefined"""
    content = (SRC / "reviewer.html").read_text(encoding="utf-8")
    assert "window.__APP_BUILD__" in content, "未定义 __APP_BUILD__"

def test_reviewer_vertical_segment_mapping():
    """vertical-segment-review 场景映射已补充"""
    js_content = (SRC / "pages" / "reviewer" / "main.js").read_text(encoding="utf-8")
    assert "'vertical-segment-review'" in js_content, "缺少 vertical-segment-review 场景定义"
    # 检查 getLocalFocusDimensions 映射
    assert "'vertical-segment-review':" in js_content, "getLocalFocusDimensions 缺少该场景映射"

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
    """业务专题页面支持与DSTE主题同步（主题切换由 assets/js/main.js 统一处理）"""
    html = (SRC / "business-topics.html").read_text(encoding="utf-8")
    assert "dste-theme" in html, "未使用 dste-theme 键同步主题"
    # 主题读取在HTML头部内联script中（避免FOUC），项目已统一使用 DSTE.Storage 封装
    assert "DSTE.Storage.getString('dste-theme')" in html or "localStorage.getItem('dste-theme')" in html, "未读取DSTE主题"
    # 主题写入和storage监听在 assets/js/main.js 的 ThemeManager 中
    main_js = (PROJECT_ROOT / "assets" / "js" / "main.js").read_text(encoding="utf-8")
    assert "ThemeManager" in main_js, "缺少 ThemeManager"
    assert "key: 'dste-theme'" in main_js, "ThemeManager 未使用 dste-theme 键"
    assert "Storage.setString(this.key, theme)" in main_js, "ThemeManager 未设置主题"

def test_business_topics_light_override():
    """业务专题页面包含Light主题覆盖（在外部CSS文件中）"""
    css_file = SRC / "pages" / "business-topics" / "style.css"
    assert css_file.exists(), "业务专题CSS文件不存在"
    content = css_file.read_text(encoding="utf-8")
    assert '[data-theme="light"] .topic-workspace' in content, "未覆盖workspace背景"
    assert '[data-theme="light"] .modal-content' in content, "未覆盖弹窗背景"
    assert '[data-theme="light"] .data-table th' in content, "未覆盖表格表头"
    # HTML中应通过link引入外部CSS
    html = (SRC / "business-topics.html").read_text(encoding="utf-8")
    assert "business-topics/style.css" in html, "HTML未引入外部CSS"

def test_cockpit_links_to_business_topics():
    """驾驶舱导航正确链接到业务专题页面（外部页面映射在 src/lib/config.js）"""
    cockpit_content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    config_content = (SRC / "lib" / "config.js").read_text(encoding="utf-8")
    combined = cockpit_content + config_content
    assert "business-topics.html" in combined, "驾驶舱未链接到 business-topics.html"
    assert "'exe/business-topics': 'business-topics.html'" in combined, "外部页面映射不正确"

def test_meeting_detail_view_exists():
    """会议详情弹窗存在且可打开"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    assert "window.openMeetingDetail = function(" in content, "缺少 openMeetingDetail 函数"
    assert "meeting-detail-overlay" in content, "缺少会议详情弹窗 HTML"
    assert "closeMeetingDetail" in content, "缺少关闭详情函数"

def test_meeting_card_opens_detail_not_editor():
    """点击会议卡片进入详情而非直接编辑"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    # 卡片 onclick 应调用 openMeetingDetail
    assert 'onclick="openMeetingDetail(' in content, "会议卡片未绑定 openMeetingDetail"
    # 卡片不应直接调用 openMeetingEditor
    card_pattern = re.compile(r'class="meeting-card".*onclick="openMeetingEditor')
    assert not card_pattern.search(content), "会议卡片仍直接绑定 openMeetingEditor"

def test_meeting_detail_has_edit_button():
    """详情弹窗包含编辑按钮"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    # 详情弹窗内应有编辑按钮
    assert "openMeetingEditor" in content, "详情弹窗缺少编辑按钮触发"
    # 编辑按钮应在详情弹窗内部（通过overlay id判断）
    detail_section = content.split('id="meeting-detail-overlay"')[1] if 'id="meeting-detail-overlay"' in content else content
    assert "编辑" in detail_section or "✏️" in detail_section, "详情弹窗缺少编辑按钮"

def test_meeting_host_save_persisted():
    """会议主持人修改通过 window._meetingsData 持久化"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    combined = _meetings_combined()
    assert "window._meetingsData" in combined, "缺少 meetings 数据持久化机制"
    # saveMeeting 中应修改 meetings 数组（搜索整个文件，函数可能在 renderMeetings 外部）
    save_section = content.split("window.saveMeeting = function()")[1] if "window.saveMeeting = function()" in content else ""
    assert "edit-host" in save_section, "saveMeeting 未读取主持人输入"
    assert ".host" in save_section, "saveMeeting 未保存主持人"


# ========== 会议列表编辑按钮 + 独立编辑页面 ==========
def test_meeting_list_has_edit_button():
    """会议列表卡片包含独立编辑按钮"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    # 卡片内应有编辑按钮（通过 data-edit-id 属性标识）
    assert "data-edit-id" in content, "会议卡片缺少 data-edit-id 编辑按钮属性"
    # 编辑按钮点击事件应渲染独立编辑页面而非打开弹窗
    assert "renderMeetingEditPage()" in content, "编辑按钮未导航到独立编辑页面"

def test_meeting_edit_page_route_exists():
    """经营分析会独立页面存在且包含编辑功能"""
    # 经营分析会已提取为独立页面 meetings.html
    meetings_file = SRC / "meetings.html"
    assert meetings_file.exists(), "meetings.html 独立页面不存在"
    content = meetings_file.read_text(encoding="utf-8")
    assert "function renderMeetingEditPage()" in content, "缺少 renderMeetingEditPage 函数"
    # cockpit 中应通过 EXTERNAL_PAGES 映射到独立页面（配置在 src/lib/config.js）
    cockpit_content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    config_content = (SRC / "lib" / "config.js").read_text(encoding="utf-8")
    combined = cockpit_content + config_content
    assert "'exe/meetings': 'meetings.html'" in combined, "cockpit 未映射 meetings 到独立页面"

def test_meeting_edit_page_has_form():
    """独立编辑页面包含完整的会议表单"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    edit_section = content.split("function renderMeetingEditPage()")[1] if "function renderMeetingEditPage()" in content else ""
    assert "edit-title" in edit_section, "编辑页面缺少会议名称输入框"
    assert "edit-date" in edit_section, "编辑页面缺少会议日期输入框"
    assert "edit-scenario" in edit_section, "编辑页面缺少场景选择器"
    assert "edit-status" in edit_section, "编辑页面缺少状态选择器"
    assert "edit-agenda-list" in edit_section, "编辑页面缺少议程列表"
    assert "saveMeeting()" in edit_section, "编辑页面缺少保存按钮"
    assert "deleteMeeting()" in edit_section, "编辑页面缺少删除按钮"

def test_meeting_edit_page_uses_global_edit_id():
    """独立编辑页面通过 window._editMeetingId 加载会议数据"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    combined = _meetings_combined()
    # window._editMeetingId 的读取在 navigate 函数中的页面初始化逻辑里
    assert "window._editMeetingId" in content, "未使用 window._editMeetingId"
    assert "window._meetingsData" in combined, "未从 meetingsData 查找会议"
    # 确认 navigate 函数中有对 exe/meetings/edit 的初始化处理
    nav_section = content.split("function navigate(")[1] if "function navigate(" in content else ""
    assert "exe/meetings/edit" in nav_section, "navigate 函数未处理编辑页面初始化"

def test_meeting_edit_page_fallback_invalid_id():
    """独立编辑页面在 _editMeetingId 无效时回退到会议列表"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    nav_section = content.split("function navigate(")[1] if "function navigate(" in content else ""
    # 确认无效 ID 时调用 navigate('exe/meetings') 回退
    assert "navigate('exe/meetings')" in nav_section, "navigate 未在无效 ID 时回退到会议列表"

def test_meeting_edit_button_uses_event_delegation():
    """编辑按钮使用事件委托绑定，避免 HTML/JS 注入"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    # 确认编辑按钮使用 data-edit-meeting 属性（无内联 onclick）
    assert "data-edit-meeting" in content, "编辑按钮未使用 data-edit-meeting 属性"
    # 确认 bindPageEvents 中处理了 data-edit-meeting
    assert "data-edit-meeting" in content.split("function bindPageEvents(")[1], "bindPageEvents 未处理编辑按钮事件委托"
    # 确认没有将 m.id 直接拼接到 onclick 中
    card_section = content.split("function renderMeetings()")[1] if "function renderMeetings()" in content else ""
    edit_btn_pattern = re.compile(r'data-edit-id="\$\{m\.id\}".*onclick')
    assert not edit_btn_pattern.search(card_section), "编辑按钮仍使用内联 onclick，存在注入风险"

def test_meeting_card_pipeline_hidden_when_not_enabled():
    """pipelineEnabled=false 的场景不显示一报一会区域"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    meetings_section = content.split("function renderMeetings()")[1] if "function renderMeetings()" in content else ""
    # renderPipeline 在 pipelineEnabled=false 时应返回空字符串（不显示任何内容）
    assert "一报一会：不适用" not in meetings_section, "pipeline 不适用时不应显示'一报一会：不适用'"

def test_renderEditorForm_is_global():
    """renderEditorForm 必须暴露为全局函数，供 navigate 中的编辑页面初始化调用"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    # 确认 renderEditorForm 被附加到 window（函数可能在 renderMeetings 外部）
    assert "window.renderEditorForm" in content or "function renderEditorForm()" in content, "renderEditorForm 未暴露为全局函数"
    # 确认 navigate 函数中调用了 renderEditorForm
    nav_section = content.split("function navigate(")[1] if "function navigate(" in content else ""
    assert "renderEditorForm()" in nav_section, "navigate 函数未调用 renderEditorForm"


# ========== 层级与场景映射关系 ==========
def test_level_scenario_mapping():
    """L1/L2/L3 与场景的映射关系正确：region_routine=L2, lagging_region=L3, lagging_vertical=L3"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    
    # 提取所有 mock 数据中的 scenario 和 level（按行匹配，mock 数据可能在 getMockMeetings 中）
    lines = content.splitlines()
    scenario_levels = []
    current_scenario = None
    for line in lines:
        s_match = re.search(r"scenario:\s*['\"]([^'\"]+)['\"]", line)
        if s_match:
            current_scenario = s_match.group(1)
        l_match = re.search(r"level:\s*['\"](L\d)['\"]", line)
        if l_match and current_scenario:
            scenario_levels.append((current_scenario, l_match.group(1)))
            current_scenario = None  # 重置，避免跨记录污染
    
    # region_routine（战区常规）应为 L2
    region_levels = [lvl for sc, lvl in scenario_levels if sc == 'region_routine']
    assert region_levels, "未找到 region_routine 的 level 数据"
    assert all(l == 'L2' for l in region_levels), f"region_routine 应为 L2，实际为 {region_levels}"
    
    # lagging_region 应为 L3
    lag_region_levels = [lvl for sc, lvl in scenario_levels if sc == 'lagging_region']
    assert lag_region_levels, "未找到 lagging_region 的 level 数据"
    assert all(l == 'L3' for l in lag_region_levels), f"lagging_region 应为 L3，实际为 {lag_region_levels}"
    
    # lagging_vertical 应为 L3
    lag_vert_levels = [lvl for sc, lvl in scenario_levels if sc == 'lagging_vertical']
    assert lag_vert_levels, "未找到 lagging_vertical 的 level 数据"
    assert all(l == 'L3' for l in lag_vert_levels), f"lagging_vertical 应为 L3，实际为 {lag_vert_levels}"

def test_level_options_reflect_mapping():
    """编辑表单中层级选项文字反映新的场景映射"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    # L2 选项应体现"战区常规"
    assert "战区常规" in content or "本部" in content, "L2 选项未体现本部/战区常规"
    # L3 选项应体现"落后整改"
    assert "落后整改" in content or "落后" in content, "L3 选项未体现落后整改"


# ========== 会议数据持久化（修复新建会议内容丢失） ==========
def test_apiSave_persists_to_localStorage():
    """apiSave 必须在 API 不可用时保存到 localStorage 作为兜底，防止数据丢失"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    apiSave_section = content.split("async function apiSave(")[1] if "async function apiSave(" in content else ""
    # 无论 API_BASE 是否为空，都应先保存到 dste_meetings（通过 DSTE.Storage 封装）
    assert "DSTE.Storage.set('dste_meetings'" in apiSave_section, "apiSave 未保存到 dste_meetings"
    # 保存操作应在 API 调用之前执行
    apiSave_body = apiSave_section.split("async function apiLoad(")[0] if "async function apiLoad(" in apiSave_section else apiSave_section
    storage_idx = apiSave_body.find("DSTE.Storage.set('dste_meetings'")
    api_base_return_idx = apiSave_body.find("if (!API_BASE) return")
    assert storage_idx != -1, "apiSave 中未找到 dste_meetings 保存逻辑"
    assert api_base_return_idx == -1 or storage_idx < api_base_return_idx, "dste_meetings 保存应在 API_BASE 检查之前执行"

def test_apiLoad_fallback_to_localStorage():
    """apiLoad 在 API 失败或无数据时应 fallback 到 localStorage"""
    content = (SRC / "cockpit.html").read_text(encoding="utf-8")
    apiLoad_section = content.split("async function apiLoad(")[1] if "async function apiLoad(" in content else ""
    apiLoad_body = apiLoad_section.split("async function init(")[0] if "async function init(" in apiLoad_section else apiLoad_section
    assert "DSTE.Storage.getString('dste_meetings')" in apiLoad_body or "localStorage.getItem('dste_meetings')" in apiLoad_body, "apiLoad 未从 localStorage fallback"
    assert "JSON.parse" in apiLoad_body, "apiLoad 未解析 localStorage 数据"

def test_init_sets_window_meetingsData():
    """init() 应将加载的数据设置到 window._meetingsData，而非孤立的外层 meetings 变量"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    combined = _meetings_combined()
    init_section = content.split("async function init(")[1] if "async function init(" in content else ""
    init_body = init_section.split("function initFineReportSSO(")[0] if "function initFineReportSSO(" in init_section else init_section
    # init 中应设置 window._meetingsData（或通过 data-store.js 的 initDataStore 间接设置）
    assert "window._meetingsData" in init_body or "initDataStore" in init_body, "init() 未设置 window._meetingsData"
    assert "window._meetingsData" in combined, "整体架构中缺少 window._meetingsData 设置"
    # 不应再使用孤立的外层 meetings 变量
    assert "meetings = remoteMeetings" not in init_body, "init() 仍在使用孤立的外层 meetings 变量"

def test_renderMeetings_uses_localStorage_fallback():
    """renderMeetings 初始化时应优先从 localStorage 加载，避免刷新后数据丢失"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    meetings_section = content.split("function renderMeetings()")[1] if "function renderMeetings()" in content else ""
    # 在 if (!window._meetingsData) 分支中应有 localStorage 读取逻辑（通过 DSTE.Storage 封装）
    # 或调用 data-store.js 的 getMeetings() 间接获取已初始化的 localStorage 数据
    data_model_section = meetings_section.split("// ---- 数据模型 ----")[1] if "// ---- 数据模型 ----" in meetings_section else meetings_section
    assert (
        "DSTE.Storage.getString('dste_meetings')" in data_model_section
        or "localStorage.getItem('dste_meetings')" in data_model_section
        or "getMeetings()" in data_model_section
    ), "renderMeetings 未从 localStorage fallback"
    assert "JSON.parse" in data_model_section or "getMeetings()" in data_model_section, "renderMeetings 未解析 localStorage 数据"

def test_renderEditorForm_auto_save_draft():
    """renderEditorForm 应绑定 input 事件，实时同步表单值到 _meetingEditData（草稿自动保存）"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    editor_form_section = content.split("function renderEditorForm()")[1] if "function renderEditorForm()" in content else ""
    if not editor_form_section:
        editor_form_section = content.split("window.renderEditorForm = function()")[1] if "window.renderEditorForm = function()" in content else ""
    # 应有 input/change 事件绑定
    assert "oninput" in editor_form_section or "addEventListener" in editor_form_section, "renderEditorForm 未绑定表单变化事件"
    # 应同步到 window._meetingEditData
    assert "window._meetingEditData" in editor_form_section, "renderEditorForm 未同步到 _meetingEditData"


# ========== 行动项编辑功能 ==========
def test_edit_form_has_action_section():
    """编辑表单应包含行动项编辑区域"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    # 整个文件都应包含行动项编辑相关元素
    assert "edit-action-list" in content, "缺少行动项列表容器"
    assert "addActionItem()" in content, "缺少添加行动项按钮"
    assert "removeActionItem(" in content, "缺少删除行动项功能"
    assert "updateActionContent(" in content, "缺少更新行动内容功能"

def test_action_edit_functions_exist():
    """行动项编辑相关函数必须存在"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    assert "function renderActionList()" in content or "window.renderActionList = function" in content, "缺少 renderActionList 函数"
    assert "window.addActionItem" in content, "缺少 addActionItem 函数"
    assert "window.removeActionItem" in content, "缺少 removeActionItem 函数"
    assert "window.updateAction" in content, "缺少 updateAction 相关函数"

def test_saveMeeting_preserves_actions():
    """saveMeeting 应保存行动项数据到 meetings"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    save_section = content.split("window.saveMeeting = function()")[1] if "window.saveMeeting = function()" in content else ""
    # 新建会议时保存 actions
    assert "actions: (d.actions || [])" in save_section or "actions: d.actions" in save_section, "saveMeeting 未保存 actions"
    # 编辑现有会议时保存 actions
    assert "meetings[idx].actions" in save_section or ".actions = d.actions" in save_section, "saveMeeting 中缺少 actions 处理"


# ========== 议程材料链接与审核评分 ==========
def test_agenda_has_material_link_field():
    """编辑表单的议程项应包含材料链接输入框，位于负责人之前"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    # renderAgendaList 中应有 material_link 输入框
    assert "material_link" in content, "缺少 material_link 字段定义"
    agenda_section = content.split("function renderAgendaList()")[1] if "function renderAgendaList()" in content else ""
    assert "material_link" in agenda_section, "renderAgendaList 未渲染 material_link"
    assert "updateAgendaMaterialLink" in content, "缺少 updateAgendaMaterialLink 函数"

def test_agenda_material_link_in_detail():
    """详情弹窗中应展示材料链接和审核得分"""
    combined = _meetings_combined()
    detail_section = combined.split("function renderMeetingDetail(")[1] if "function renderMeetingDetail(" in combined else ""
    # 应展示材料链接
    assert "material_link" in detail_section, "renderMeetingDetail 未展示 material_link"
    # 应展示审核得分
    assert "material_score" in detail_section or "getMaterialScore" in detail_section, "renderMeetingDetail 未展示审核得分"

def test_getMaterialScore_function_exists():
    """getMaterialScore 函数必须存在，用于读取审核得分"""
    combined = _meetings_combined()
    assert "getMaterialScore" in combined, "缺少 getMaterialScore 函数"
    assert "dste_review_scores" in combined, "未读取 dste_review_scores localStorage"

def test_score_color_rules():
    """得分颜色规则应符合设计：≥80绿色 / 60-79橙色 / <60红色 / 无灰色"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    meetings_section = content.split("function renderMeetings()")[1] if "function renderMeetings()" in content else ""
    # 至少应有 80 分的判断逻辑
    assert ">= 80" in meetings_section or ">=80" in meetings_section or "80 " in meetings_section, "未找到 80 分颜色分界逻辑"
    # 至少应有 60 分的判断逻辑
    assert ">= 60" in meetings_section or ">=60" in meetings_section or "60 " in meetings_section, "未找到 60 分颜色分界逻辑"

def test_reviewer_syncs_score_to_localStorage():
    """reviewer 保存审核结果时应同步最高分到 localStorage"""
    js_content = (SRC / "pages" / "reviewer" / "main.js").read_text(encoding="utf-8")
    save_section = js_content.split("async function saveReviewRecord(")[1] if "async function saveReviewRecord(" in js_content else ""
    assert "dste_review_scores" in save_section, "saveReviewRecord 未同步到 dste_review_scores"
    # 项目已统一使用 DSTE.Storage 封装 localStorage
    assert "DSTE.Storage.set('dste_review_scores'" in save_section or "localStorage.setItem" in save_section, "saveReviewRecord 未写入 localStorage"
    assert "total_score" in save_section, "saveReviewRecord 未读取 total_score"


# ========== 会议详情查看 ==========
def test_agenda_type_colors_defined():
    """AGENDA_TYPE_COLORS 必须在 renderMeetingDetail 使用前定义，否则详情页会抛出 ReferenceError"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    # AGENDA_TYPE_COLORS 必须存在（可能在 renderMeetings 外部）
    assert "AGENDA_TYPE_COLORS" in content, "AGENDA_TYPE_COLORS 未定义"
    # 必须有实际的映射对象，而不是仅仅在模板字符串中被引用
    assert "const AGENDA_TYPE_COLORS" in content or "let AGENDA_TYPE_COLORS" in content, "AGENDA_TYPE_COLORS 未作为变量声明"

def test_agenda_type_colors_covers_all_types():
    """AGENDA_TYPE_COLORS 的键必须覆盖 AGENDA_TYPE_LABELS 中所有类型"""
    content = (SRC / "meetings.html").read_text(encoding="utf-8")
    # 提取 AGENDA_TYPE_LABELS 的键（可能在 renderMeetings 外部）
    labels_match = re.search(r"const\s+AGENDA_TYPE_LABELS\s*=\s*\{([^}]+)\}", content, re.DOTALL)
    assert labels_match, "未找到 AGENDA_TYPE_LABELS 定义"
    labels_text = labels_match.group(1)
    label_keys = set(re.findall(r"(\w+):\s*['\"]", labels_text))
    # 提取 AGENDA_TYPE_COLORS 的键
    colors_match = re.search(r"const\s+AGENDA_TYPE_COLORS\s*=\s*\{([^}]+)\}", content, re.DOTALL)
    assert colors_match, "未找到 AGENDA_TYPE_COLORS 定义"
    colors_text = colors_match.group(1)
    color_keys = set(re.findall(r"(\w+):\s*['\"#var(]", colors_text))
    # 确保所有 label 键都有对应颜色
    missing = label_keys - color_keys
    assert not missing, f"AGENDA_TYPE_COLORS 缺少以下议程类型颜色: {missing}"
