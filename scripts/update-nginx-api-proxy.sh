#!/usr/bin/env bash
# 更新 nginx /api/ 代理到 DSTE 本地 shim
# 通过 GitHub Actions 调用，需要 SSH_PRIVATE_KEY / SSH_USER / SSH_HOST 环境变量

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

# 通过命令行参数把配置文件路径传给 Python，避免 heredoc 引号导致变量不展开
python3 - "$CONFIG_FILE" <<PY
import re
import sys

config_file = sys.argv[1]

with open(config_file, "r") as f:
    content = f.read()

api_block = """    location /api/ {
        proxy_pass http://127.0.0.1:8766/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
"""

start_marker = "# === DSTE API PROXY START ==="
end_marker = "# === DSTE API PROXY END ==="


def find_blocks(text, keyword):
    """按大括号深度查找 keyword { ... } 块，返回 [(start, end, block)]"""
    blocks = []
    i = 0
    kw_re = re.compile(re.escape(keyword) + r"\\s*\\{")
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


def replace_or_insert_api(server_block):
    """在 server 块内替换/插入 /api/ 代理块"""
    # 1. 若已有标记，替换标记间内容
    if start_marker in server_block and end_marker in server_block:
        pattern = re.escape(start_marker) + r".*?" + re.escape(end_marker)
        replacement = start_marker + "\n" + api_block + "    " + end_marker
        return re.sub(pattern, replacement, server_block, flags=re.DOTALL)

    # 2. 若已有 /api/ location（无标记），替换整个 location 块
    for _, _, loc_block in find_blocks(server_block, "location /api/"):
        insert_block = "    " + start_marker + "\n" + api_block + "    " + end_marker + "\n"
        return server_block.replace(loc_block, insert_block)

    # 3. 否则在 server 块结束前插入
    insert_pos = server_block.rfind("}")
    if insert_pos == -1:
        raise RuntimeError("未找到 server 块结束符 }")
    insert_block = "    " + start_marker + "\n" + api_block + "    " + end_marker + "\n"
    return server_block[:insert_pos] + insert_block + server_block[insert_pos:]


main_start, main_end, main_server = find_main_server(content)
new_main_server = replace_or_insert_api(main_server)
content = content[:main_start] + new_main_server + content[main_end:]

with open(config_file, "w") as f:
    f.write(content)
PY

echo "=== 更新后的 /api/ 配置 ==="
grep -A 12 "DSTE API PROXY" "$CONFIG_FILE" || true

echo "测试 nginx 配置..."
nginx -t

echo "重载 nginx..."
nginx -s reload

echo "✅ nginx /api/ 代理更新完成"
'
