#!/bin/bash
# DSTE 战略管理平台 — AI 会话启动脚本
# 用法: ./start-session.sh

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "========================================"
echo "   DSTE 战略管理平台 — AI 会话启动"
echo "========================================"
echo ""

# 检查记忆文件目录
if [ ! -d ".ai/memory" ]; then
    echo "⚠️  .ai/memory/ 目录不存在，创建中..."
    mkdir -p .ai/memory
fi

# 读取项目上下文
echo "📖 正在加载项目记忆..."
echo ""

# 核心记忆（每次必读）
for f in 00-bootstrap.md 01-current-focus.md 08-checkpoint.md; do
    if [ -f ".ai/memory/$f" ]; then
        echo "--- $(head -1 .ai/memory/$f | sed 's/# //') ---"
        cat ".ai/memory/$f"
        echo ""
    fi
done

# 代码模式（前30行）
if [ -f ".ai/memory/03-patterns.md" ]; then
    echo "--- 代码模式（前 30 行）---"
    head -30 .ai/memory/03-patterns.md
    echo ""
fi

# 最近会话摘要
echo "--- 最近会话摘要 ---"
if [ -f ".ai/memory/06-session-log.md" ]; then
    # 提取最近的 2 条记录
    grep "^## " .ai/memory/06-session-log.md | head -2
    echo ""
fi

# Git 状态
echo "--- Git 状态 ---"
git status --short | head -20 || true
echo ""

# 检查进行中的任务
if [ -d ".ai/tasks/active" ] && [ "$(ls -A .ai/tasks/active/*.md 2>/dev/null)" ]; then
    echo "--- 进行中的任务 ---"
    for f in .ai/tasks/active/*.md; do
        basename "$f"
        grep "^# " "$f" | head -1 | sed 's/# /📋 /'
        grep "^## 目标" -A 2 "$f" | tail -2 | sed 's/^/   /'
        echo ""
    done
fi

echo "========================================"
echo "✅ 上下文加载完成"
echo ""
echo "💡 建议操作："
echo "   cat .ai/memory/*.md          # 查看完整记忆"
echo "   cat .ai/tasks/active/*.md    # 查看任务配方"
echo "   git diff                      # 查看当前代码状态"
echo ""
echo "📝 结束会话时，请运行 ./end-session.sh 保存记忆"
echo "========================================"
