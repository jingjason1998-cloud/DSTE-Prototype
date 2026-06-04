#!/bin/bash
# DSTE 战略管理平台 — AI 会话结束脚本
# 用法: ./end-session.sh

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "========================================"
echo "   DSTE 战略管理平台 — AI 会话结束"
echo "========================================"
echo ""

# 获取当前时间
NOW=$(date '+%Y-%m-%d %H:%M')
TODAY=$(date '+%Y-%m-%d')

echo "📝 正在整理会话记录..."
echo ""

# 检查是否有未提交的变更
echo "--- 本次会话修改的文件 ---"
git diff --name-only || true
git ls-files --others --exclude-standard | grep -v node_modules | grep -v dist/ || true
echo ""

# 更新当前焦点时间戳
if [ -f ".ai/memory/01-current-focus.md" ]; then
    sed -i.bak "s/> 更新时间:.*/> 更新时间: $NOW/" .ai/memory/01-current-focus.md
    rm -f .ai/memory/01-current-focus.md.bak
    echo "✅ 已更新 01-current-focus.md 时间戳"
fi

# 更新会话日志
echo ""
echo "💡 会话日志需要手动补充，请在 .ai/memory/06-session-log.md 顶部添加："
echo ""
echo "## $TODAY"
echo "- **主题**: （本次做了什么）"
echo "- **修改文件**: （列出关键文件）"
echo "- **决策**: （如果有）"
echo "- **下一步**: （接下来做什么）"
echo "- **状态**: complete / partial / blocked"
echo ""

# 提交记忆文件
read -p "是否提交记忆文件到 Git? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add .ai/memory/
    git diff --cached --quiet .ai/memory/ && {
        echo "记忆文件无变更，跳过提交"
    } || {
        git commit -m "docs: 更新 AI 记忆 ($(date '+%Y-%m-%d'))" --no-verify
        echo "✅ 记忆文件已提交"
    }
fi

echo ""
echo "========================================"
echo "✅ 会话结束，记忆已保存"
echo "========================================"
