# 工作区标签去重修复（v0.7.13 待发）

补丁：`workspace-tabs-dedup-v0.7.13.patch`（2026-07-27 Kimi 会话生成，已 dry-run 校验）

## 内容
修复驾驶舱工作区同一页面可打开多个重复标签的问题：
- `src/cockpit.html` `navigate()`：目标页已在其他标签打开时，激活并刷新该标签，不再复用当前标签造成重复
- `src/cockpit.html` `init()`：恢复会话时 hash 页面已存在于其他标签则直接激活
- `src/lib/workspace-tabs.js` `loadWorkspaceTabs()`：按 pageId 去重，清理历史遗留重复标签
- `tests/e2e/workspace-tabs.spec.js`：新增 2 个 E2E 用例
- `CHANGELOG.md` v0.7.13 条目、`package.json` / `sonar-project.properties` 版本号 0.7.13

## 背景
生成时仓库有并行会话频繁 `git reset --hard` / `git stash`，修复三次被回退，故 parked 为补丁。
用户决定：本次不推送，待后续与其他工作一起发布。

## 发布步骤
```bash
cd /Users/jasonjing/DSTE-Prototype
patch -p1 < .ai/patches/workspace-tabs-dedup-v0.7.13.patch
npm run build && npx playwright test tests/e2e/workspace-tabs.spec.js
git add src/cockpit.html src/lib/workspace-tabs.js tests/e2e/workspace-tabs.spec.js
git commit -m "fix(workspace-tabs): 同一页面只保留一个标签，重复打开时激活并刷新已有标签"
git add CHANGELOG.md package.json sonar-project.properties
git commit -m "chore(release): v0.7.13"
git tag -a v0.7.13 -m "release: DSTE v0.7.13"
git push origin main v0.7.13   # 触发 GitHub Actions 部署
```
若 `patch` 因周边代码变化失败，按补丁内容手动修改即可（每处改动都很小）。
注意：publish 前确认 v0.7.13 未被其他发布占用，否则整体顺延版本号。
