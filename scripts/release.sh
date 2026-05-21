#!/bin/bash
# DSTE 战略管理平台 — 一键发布脚本
# 用法: ./scripts/release.sh v0.2.0

set -e  # 遇到错误立即退出

VERSION=$1

# ─── 颜色定义 ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── 1. 参数校验 ───
if [ -z "$VERSION" ]; then
    echo -e "${RED}❌ 错误: 请提供版本号${NC}"
    echo -e "用法: ${YELLOW}./scripts/release.sh v0.2.0${NC}"
    exit 1
fi

if ! [[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}❌ 错误: 版本号格式不正确${NC}"
    echo -e "正确格式: ${YELLOW}v1.2.3${NC} (v主版本.次版本.修订号)"
    exit 1
fi

echo -e "${BLUE}🚀 DSTE 发布流程开始: $VERSION${NC}"
echo ""

# ─── 2. 检查工作区是否干净 ───
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ 错误: 工作区有未提交的修改${NC}"
    echo "请先提交或暂存当前修改:"
    echo -e "  ${YELLOW}git add . && git commit -m \"chore: 准备发布 $VERSION\"${NC}"
    git status --short
    exit 1
fi

# ─── 3. 运行回归测试 ───
echo -e "${BLUE}📋 步骤 1/5: 运行回归测试...${NC}"
if ! python3 -m pytest tests/ -v; then
    echo -e "${RED}❌ 测试未通过，终止发布${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 测试全部通过${NC}"
echo ""

# ─── 4. 检查 CHANGELOG ───
echo -e "${BLUE}📝 步骤 2/5: 检查 CHANGELOG.md...${NC}"
if ! grep -q "$VERSION" CHANGELOG.md; then
    echo -e "${RED}❌ 错误: CHANGELOG.md 中未找到版本 $VERSION${NC}"
    echo -e "请先更新 ${YELLOW}CHANGELOG.md${NC}，添加 [$VERSION] 的变更记录"
    exit 1
fi
echo -e "${GREEN}✅ CHANGELOG 已更新${NC}"
echo ""

# ─── 5. 提交 CHANGELOG 更新（如果有）───
if [ -n "$(git status --porcelain CHANGELOG.md)" ]; then
    git add CHANGELOG.md
    git commit -m "docs: 更新 CHANGELOG for $VERSION"
    echo -e "${GREEN}✅ CHANGELOG 修改已提交${NC}"
fi

# ─── 6. 打 Tag ───
echo -e "${BLUE}🏷️  步骤 3/5: 创建版本标签...${NC}"
if git tag | grep -q "^$VERSION$"; then
    echo -e "${RED}❌ 错误: 标签 $VERSION 已存在${NC}"
    echo -e "现有标签: ${YELLOW}$(git tag | grep '^v')${NC}"
    exit 1
fi

git tag -a "$VERSION" -m "release: DSTE $VERSION"
echo -e "${GREEN}✅ 标签 $VERSION 已创建${NC}"
echo ""

# ─── 7. 推送到远程（如果有配置）───
echo -e "${BLUE}📤 步骤 4/5: 推送到远程仓库...${NC}"
if git remote | grep -q origin; then
    git push origin main
    git push origin "$VERSION"
    echo -e "${GREEN}✅ 已推送到远程仓库${NC}"
else
    echo -e "${YELLOW}⚠️  未配置远程仓库，跳过推送${NC}"
    echo -e "如需配置: ${YELLOW}git remote add origin <你的仓库地址>${NC}"
fi
echo ""

# ─── 8. 生成发布摘要 ───
echo -e "${BLUE}📦 步骤 5/5: 生成发布摘要...${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ DSTE $VERSION 发布准备完成${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📋 请手动完成以下部署步骤:${NC}"
echo ""
echo "  1. 部署到生产服务器:"
echo -e "     ${BLUE}scp src/*.html root@47.101.197.187:/opt/meeting-reviewer/src/${NC}"
echo ""
echo "  2. 刷新 nginx 配置:"
echo -e "     ${BLUE}ssh root@47.101.197.187 'nginx -s reload'${NC}"
echo ""
echo "  3. 线上验证:"
echo -e "     ${BLUE}https://Dste.fineres.com/${NC}"
echo ""
echo -e "${YELLOW}📌 当前版本历史:${NC}"
git log --oneline --decorate | head -5
echo ""
echo -e "${YELLOW}🏷️  所有标签:${NC}"
git tag -n1 | head -5
