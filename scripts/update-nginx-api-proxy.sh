#!/usr/bin/env bash
# 更新 nginx /api/ 代理到 Cloudflare Worker
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

CONFIG_FILE=$(find /etc/nginx/sites-enabled -maxdepth 1 -type f | head -1)
if [ -z "$CONFIG_FILE" ]; then
  echo "❌ 未找到 /etc/nginx/sites-enabled 下的站点配置"
  exit 1
fi
echo "找到 nginx 配置: $CONFIG_FILE"

# 备份
cp "$CONFIG_FILE" "$CONFIG_FILE.bak.$(date +%Y%m%d%H%M%S)"

python3 - <<"PY"
import re

with open("""$CONFIG_FILE""", "r") as f:
    content = f.read()

api_block = """    location /api/ {
        proxy_pass http://127.0.0.1:8766/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
"""

# 如果已有 DSTE API 代理标记，替换标记间内容
start_marker = "# === DSTE API PROXY START ==="
end_marker = "# === DSTE API PROXY END ==="

if start_marker in content and end_marker in content:
    pattern = re.escape(start_marker) + r".*?" + re.escape(end_marker)
    replacement = start_marker + "\n" + api_block + "    " + end_marker
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
else:
    # 在 server 块最后一个 } 之前插入
    # 从后往前找第一个独立的 }
    insert_pos = content.rfind("}")
    if insert_pos == -1:
        raise RuntimeError("未找到 server 块结束符 }")
    insert_block = "    " + start_marker + "\n" + api_block + "    " + end_marker + "\n"
    content = content[:insert_pos] + insert_block + content[insert_pos:]

with open("""$CONFIG_FILE""", "w") as f:
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
