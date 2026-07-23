#!/bin/bash
# sync-obsidian-docs.sh
# 同步 Obsidian DSTE-docs 与项目代码库 docs/01-Product产品
# 基于文件修改时间双向同步，不自动删除任一侧文件

set -e

OBSIDIAN_DIR="/Users/jasonjing/Library/Mobile Documents/iCloud~md~obsidian/Documents/我的笔记/DSTE-docs/01-Product产品"
PROJECT_DIR="/Users/jasonjing/DSTE-Prototype/docs/01-Product产品"

if [ ! -d "$OBSIDIAN_DIR" ]; then
  echo "❌ Obsidian 目录不存在: $OBSIDIAN_DIR"
  exit 1
fi

if [ ! -d "$PROJECT_DIR" ]; then
  echo "❌ 项目目录不存在: $PROJECT_DIR"
  exit 1
fi

echo "🔄 同步 Obsidian → 项目代码库..."
# -a: 归档模式，保留权限和时间戳
# -v: 显示详细过程
# -u: 仅当源文件比目标文件新，或目标文件不存在时才复制
rsync -avu "$OBSIDIAN_DIR/" "$PROJECT_DIR/"

echo "🔄 同步项目代码库 → Obsidian..."
rsync -avu "$PROJECT_DIR/" "$OBSIDIAN_DIR/"

echo "✅ 同步完成"
echo ""
echo "提示："
echo "- 本脚本不会删除任一侧的文件，如需删除同步请手动处理"
echo "- 若两侧同一文件都被修改且时间戳接近，请以最新修改时间为准"
