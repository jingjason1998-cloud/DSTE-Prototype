#!/bin/bash
# 将仓库 docs/ 单向同步到 Obsidian iCloud 库（我的笔记/DSTE-docs）
# 用法: bash scripts/sync-docs-to-obsidian.sh
# 注意: 单向同步（仓库 → Obsidian）。在 Obsidian 侧对 DSTE-docs 的修改会在下次同步时被覆盖。
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)/docs/"
DST="$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/我的笔记/DSTE-docs/"

rsync -a --delete --exclude='.DS_Store' "$SRC" "$DST"
echo "已同步: $SRC -> $DST"
