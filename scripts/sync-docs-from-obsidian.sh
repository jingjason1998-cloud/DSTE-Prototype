#!/bin/bash
# 将 Obsidian iCloud 库中的 DSTE-docs 单向同步回仓库 docs/
# 用法: bash scripts/sync-docs-from-obsidian.sh
# 注意: 单向同步（Obsidian → 仓库），以 Obsidian 侧为准。
#       仓库 docs/ 里尚未提交的本地修改会被覆盖，执行前请确认。
set -euo pipefail

SRC="$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/我的笔记/DSTE-docs/"
DST="$(cd "$(dirname "$0")/.." && pwd)/docs/"

rsync -a --delete --stats --exclude='.DS_Store' "$SRC" "$DST"
echo ""
echo "已同步: $SRC -> $DST"
echo "下一步: cd 仓库 && git add docs && git commit"
