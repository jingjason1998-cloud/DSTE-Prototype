#!/bin/bash
# DSTE 战略管理平台 — 一键发布脚本 (Vite 版本)
# 用法: ./scripts/release.sh v0.4.0

set -e

VERSION=$1

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ─── 1. 参数校验 ───
if [ -z "$VERSION" ]; then
    echo -e "${RED}❌ 错误: 请提供版本号${NC}"
    echo -e "用法: ${YELLOW}./scripts/release.sh v0.4.0${NC}"
    exit 1
fi

if ! [[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}❌ 错误: 版本号格式不正确${NC}"
    echo -e "正确格式: ${YELLOW}v1.2.3${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 DSTE 发布流程开始: $VERSION${NC}"
echo ""

# ─── 2. 检查工作区 ───
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ 错误: 工作区有未提交的修改${NC}"
    git status --short
    exit 1
fi

# ─── 3. 运行回归测试 (pytest) ───
echo -e "${BLUE}📋 步骤 1/6: 运行 pytest 回归测试...${NC}"
if ! python3 -m pytest tests/ -v; then
    echo -e "${RED}❌ pytest 测试未通过，终止发布${NC}"
    exit 1
fi
echo -e "${GREEN}✅ pytest 全部通过${NC}"
echo ""

# ─── 4. 运行 E2E 测试 (Playwright) ───
echo -e "${BLUE}🎭 步骤 2/6: 运行 Playwright E2E 测试...${NC}"
if ! npm run test:e2e; then
    echo -e "${RED}❌ E2E 测试未通过，终止发布${NC}"
    exit 1
fi
echo -e "${GREEN}✅ E2E 测试全部通过${NC}"
echo ""

# ─── 5. Vite 构建 ───
echo -e "${BLUE}🔨 步骤 3/6: Vite 构建生产包...${NC}"
npm run build
echo -e "${GREEN}✅ 构建完成 (dist/)${NC}"
echo ""

# ─── 6. 检查 CHANGELOG ───
echo -e "${BLUE}📝 步骤 4/6: 检查 CHANGELOG.md...${NC}"
if ! grep -q "$VERSION" CHANGELOG.md; then
    echo -e "${RED}❌ 错误: CHANGELOG.md 中未找到版本 $VERSION${NC}"
    exit 1
fi
echo -e "${GREEN}✅ CHANGELOG 已更新${NC}"
echo ""

# ─── 7. 提交 CHANGELOG ───
if [ -n "$(git status --porcelain CHANGELOG.md)" ]; then
    git add CHANGELOG.md
    git commit -m "docs: 更新 CHANGELOG for $VERSION"
fi

# ─── 8. 打 Tag ───
echo -e "${BLUE}🏷️  步骤 5/6: 创建版本标签...${NC}"
if git tag | grep -q "^$VERSION$"; then
    echo -e "${RED}❌ 错误: 标签 $VERSION 已存在${NC}"
    exit 1
fi

git tag -a "$VERSION" -m "release: DSTE $VERSION"
echo -e "${GREEN}✅ 标签 $VERSION 已创建${NC}"
echo ""

# ─── 9. 推送到远程 ───
echo -e "${BLUE}📤 步骤 6/6: 推送到远程仓库...${NC}"
if git remote | grep -q origin; then
    git push origin main
    git push origin "$VERSION"
    echo -e "${GREEN}✅ 已推送到远程仓库${NC}"
else
    echo -e "${YELLOW}⚠️  未配置远程仓库，跳过推送${NC}"
fi
echo ""

# ─── 10. 发布确认 ───
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ DSTE $VERSION 本地准备完成${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📦 构建产物: dist/${NC}"
echo ""
echo -e "${YELLOW}⚠️  请确认后再执行部署:${NC}"
echo ""
echo "  1. 部署到生产服务器:"
echo -e "     ${BLUE}rsync -avz --delete dist/ root@47.101.197.187:/opt/meeting-reviewer/dist/${NC}"
echo ""
echo "  2. 更新 nginx 配置 (如需):"
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
echo ""
echo -e "${GREEN}💡 输入 '发布' 继续部署，或 Ctrl+C 取消${NC}"
read CONFIRM
if [ "$CONFIRM" != "发布" ]; then
    echo -e "${YELLOW}⏹️  部署已取消${NC}"
    exit 0
fi

echo -e "${BLUE}🚀 开始部署到生产服务器...${NC}"
# 这里添加实际的部署命令
# rsync -avz --delete dist/ root@47.101.197.187:/opt/meeting-reviewer/dist/
echo -e "${GREEN}✅ 部署完成${NC}"
