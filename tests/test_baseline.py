"""
DSTE 战略管理平台 - 基线测试
确保原型文件结构完整、HTML有效、CSS/JS无语法错误
"""

import os
import re
from pathlib import Path

PROJECT_ROOT = Path("/Users/jasonjing/DSTE-Prototype")


def test_project_structure_exists():
    """验证项目目录结构"""
    dirs = ["src", "tests", "assets/css", "assets/js", "assets/images"]
    for d in dirs:
        assert (PROJECT_ROOT / d).exists(), f"目录缺失: {d}"


def test_main_html_exists():
    """验证主入口文件存在"""
    main_file = PROJECT_ROOT / "src" / "index.html"
    assert main_file.exists(), "主入口 index.html 不存在"
    content = main_file.read_text(encoding="utf-8")
    assert "<!DOCTYPE html>" in content, "HTML 声明缺失"
    assert "<html" in content, "html 标签缺失"
    assert "<head>" in content, "head 标签缺失"
    assert "<body>" in content, "body 标签缺失"


def test_css_file_exists():
    """验证主CSS文件存在且语法基本正确"""
    css_file = PROJECT_ROOT / "assets" / "css" / "main.css"
    assert css_file.exists(), "主CSS文件不存在"
    content = css_file.read_text(encoding="utf-8")
    # 检查基本CSS结构
    assert "{" in content and "}" in content, "CSS 规则格式错误"
    # 检查无未闭合的大括号
    open_count = content.count("{")
    close_count = content.count("}")
    assert open_count == close_count, f"CSS 大括号不匹配: {open_count} vs {close_count}"


def test_js_file_exists():
    """验证主JS文件存在"""
    js_file = PROJECT_ROOT / "assets" / "js" / "main.js"
    assert js_file.exists(), "主JS文件不存在"
    content = js_file.read_text(encoding="utf-8")
    # 基本语法检查：括号匹配
    assert content.count("(") == content.count(")"), "JS 圆括号不匹配"
    assert content.count("[") == content.count("]"), "JS 方括号不匹配"
    assert content.count("{") == content.count("}"), "JS 花括号不匹配"


def test_main_html_is_login_page():
    """验证首页是平台登录入口页"""
    main_file = PROJECT_ROOT / "src" / "index.html"
    if not main_file.exists():
        return
    content = main_file.read_text(encoding="utf-8")
    # 登录页特征
    login_indicators = ["登录", "用户名", "密码", "记住我", "忘记密码", "sso", "cockpit"]
    found = sum(1 for ind in login_indicators if ind.lower() in content.lower())
    assert found >= 2, f"首页不是登录页，缺少登录表单元素"


def test_main_html_has_login_form():
    """验证首页包含登录表单"""
    main_file = PROJECT_ROOT / "src" / "index.html"
    if not main_file.exists():
        return
    content = main_file.read_text(encoding="utf-8")
    # 登录表单特征
    assert "<form" in content.lower(), "缺少登录表单"
    assert "type=\"password\"" in content.lower() or "type='password'" in content.lower(), "缺少密码输入框"
    assert "type=\"submit\"" in content.lower() or "type='submit'" in content.lower(), "缺少提交按钮"


def test_cockpit_page_exists():
    """验证驾驶舱作为独立页面存在"""
    cockpit_file = PROJECT_ROOT / "src" / "cockpit.html"
    assert cockpit_file.exists(), "驾驶舱页面 cockpit.html 不存在"
    content = cockpit_file.read_text(encoding="utf-8")
    assert "驾驶舱" in content, "驾驶舱页面内容不正确"


def test_theme_switch_support():
    """验证支持主题切换"""
    css_file = PROJECT_ROOT / "assets" / "css" / "main.css"
    if not css_file.exists():
        return
    content = css_file.read_text(encoding="utf-8")
    has_dark = "dark" in content.lower() or "[data-theme" in content
    js_file = PROJECT_ROOT / "assets" / "js" / "main.js"
    if js_file.exists():
        js_content = js_file.read_text(encoding="utf-8")
        has_toggle = "theme" in js_content.lower() or "dark" in js_content.lower()
    else:
        has_toggle = False
    assert has_dark or has_toggle, "主题切换功能未实现"


def test_responsive_meta_tag():
    """验证包含响应式meta标签"""
    main_file = PROJECT_ROOT / "src" / "index.html"
    if not main_file.exists():
        return
    content = main_file.read_text(encoding="utf-8")
    assert "viewport" in content, "缺少 viewport meta 标签"


def test_no_hardcoded_secrets():
    """安全检查：无硬编码密钥"""
    for ext in ["*.html", "*.css", "*.js"]:
        for f in PROJECT_ROOT.rglob(ext):
            content = f.read_text(encoding="utf-8")
            # 检查常见的密钥模式
            secret_patterns = [
                r"api[_-]?key\s*[=:]\s*['\"][a-zA-Z0-9]{16,}['\"]",
                r"secret\s*[=:]\s*['\"][a-zA-Z0-9]{16,}['\"]",
                r"password\s*[=:]\s*['\"][^'\"]{8,}['\"]",
                r"token\s*[=:]\s*['\"][a-zA-Z0-9]{20,}['\"]",
            ]
            for pattern in secret_patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                assert len(matches) == 0, f"文件 {f} 可能包含硬编码密钥"
