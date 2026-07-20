#!/usr/bin/env bash
# 更新 nginx 静态资源压缩与缓存头配置
# 仿照 scripts/update-nginx-api-proxy.sh，通过 GitHub Actions 调用
# 需要 SSH_PRIVATE_KEY / SSH_USER / SSH_HOST 环境变量

set -euo pipefail

: "${SSH_PRIVATE_KEY:?SSH_PRIVATE_KEY is required}"
: "${SSH_USER:?SSH_USER is required}"
: "${SSH_HOST:?SSH_HOST is required}"

mkdir -p ~/.ssh
echo "$SSH_PRIVATE_KEY" > ~/.ssh/deploy_key
chmod 600 ~/.ssh/deploy_key

ssh -i ~/.ssh/deploy_key \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  "${SSH_USER}@${SSH_HOST}" '
set -e

# 优先选择包含主域名的站点配置，避免选中备份文件
CONFIG_FILE=$(grep -Rl "server_name .*Dste\\.fineres\\.com" /etc/nginx/sites-enabled /etc/nginx/sites-available 2>/dev/null | head -1)
if [ -z "$CONFIG_FILE" ]; then
  CONFIG_FILE=$(find /etc/nginx/sites-enabled -maxdepth 1 -type f | head -1)
fi
if [ -z "$CONFIG_FILE" ]; then
  echo "❌ 未找到 /etc/nginx/sites-enabled 下的站点配置"
  exit 1
fi
echo "找到 nginx 配置: $CONFIG_FILE"

# 备份到独立目录，避免备份文件被 nginx include 导致重复 server_name 警告
BACKUP_DIR="/etc/nginx/backups"
mkdir -p "$BACKUP_DIR"
cp "$CONFIG_FILE" "$BACKUP_DIR/$(basename "$CONFIG_FILE").bak.$(date +%Y%m%d%H%M%S)"

# 检测 nginx 是否支持 brotli
BROTLI_SUPPORTED=false
if nginx -V 2>&1 | grep -qi "brotli"; then
  BROTLI_SUPPORTED=true
fi
echo "brotli 支持: $BROTLI_SUPPORTED"

# 通过命令行参数把配置文件路径传给 Python，避免 heredoc 引号导致变量不展开。
# 注意：本远端脚本整体被外层单引号包裹传给 ssh，不能用 <<'PY'（其单引号会提前
# 闭合外层引号）。因此 heredoc 保持 <<PY。
python3 - "$CONFIG_FILE" "$BROTLI_SUPPORTED" <<PY
import re
import sys

config_file = sys.argv[1]
brotli_supported = sys.argv[2].lower() == "true"

with open(config_file, "r") as f:
    content = f.read()

# === 压缩块 ===
compression_block_lines = [
    "gzip on;",
    "gzip_vary on;",
    "gzip_proxied any;",
    "gzip_comp_level 6;",
    "gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;",
]
if brotli_supported:
    compression_block_lines.extend([
        "",
        "brotli on;",
        "brotli_comp_level 6;",
        "brotli_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;",
    ])
compression_block = "\n".join("        " + line if line else "        " for line in compression_block_lines)
compression_block = compression_block.rstrip()

compression_markers = ("# === DSTE STATIC COMPRESSION START ===", "# === DSTE STATIC COMPRESSION END ===")

# === 缓存块 ===
cache_block = """        # Vite 哈希资源：1 年 immutable
        location ~* "-[0-9a-zA-Z_-]{8,}\\.(js|css)$" {
            expires 1y;
            add_header Cache-Control "public, max-age=31536000, immutable";
            access_log off;
        }

        # 非哈希静态资源：1 小时
        location ~* "\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp4|webm)$" {
            expires 1h;
            add_header Cache-Control "public, max-age=3600, must-revalidate";
            access_log off;
        }

        # HTML 永不缓存
        location ~* "\\.html$" {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
        }"""

cache_markers = ("# === DSTE STATIC CACHE START ===", "# === DSTE STATIC CACHE END ===")


def find_blocks(text, keyword):
    """按大括号深度查找 keyword { ... } 块，返回 [(start, end, block)]"""
    blocks = []
    i = 0
    kw_re = re.compile(re.escape(keyword) + r"\s*\{")
    while i < len(text):
        m = kw_re.search(text[i:])
        if not m:
            break
        start = i + m.start()
        brace_start = i + m.end()
        depth = 1
        j = brace_start
        while j < len(text) and depth > 0:
            if text[j] == "{":
                depth += 1
            elif text[j] == "}":
                depth -= 1
            j += 1
        end = j
        blocks.append((start, end, text[start:end]))
        i = end
    return blocks


def find_main_server(text):
    """查找主站点 server 块：包含 listen 443 ssl 和 server_name Dste.fineres.com"""
    for start, end, block in find_blocks(text, "server"):
        if "listen 443 ssl" in block and re.search(r"server_name\s+Dste\.fineres\.com", block):
            return start, end, block
    raise RuntimeError("未找到主站点 server 块（listen 443 ssl + server_name Dste.fineres.com）")


def replace_or_insert(server_block, start_marker, end_marker, new_content):
    """在 server 块内替换/插入标记块"""
    if start_marker in server_block and end_marker in server_block:
        pattern = re.escape(start_marker) + r".*?" + re.escape(end_marker)
        replacement = start_marker + "\n" + new_content + "\n    " + end_marker
        return re.sub(pattern, replacement, server_block, flags=re.DOTALL)

    # 无标记则插入到 server 块结束之前
    insert_pos = server_block.rfind("}")
    if insert_pos == -1:
        raise RuntimeError("未找到 server 块结束符 }")
    insert_block = "    " + start_marker + "\n" + new_content + "\n    " + end_marker + "\n"
    return server_block[:insert_pos] + insert_block + server_block[insert_pos:]


main_start, main_end, main_server = find_main_server(content)
new_main_server = replace_or_insert(main_server, *compression_markers, compression_block)
new_main_server = replace_or_insert(new_main_server, *cache_markers, cache_block)
content = content[:main_start] + new_main_server + content[main_end:]

with open(config_file, "w") as f:
    f.write(content)
PY

echo "=== 更新后的静态压缩配置 ==="
grep -A 8 "DSTE STATIC COMPRESSION" "$CONFIG_FILE" || true

echo "=== 更新后的静态缓存配置 ==="
grep -A 18 "DSTE STATIC CACHE" "$CONFIG_FILE" || true

echo "测试 nginx 配置..."
nginx -t

echo "重载 nginx..."
nginx -s reload

echo "✅ nginx 静态资源压缩与缓存配置更新完成"
'
