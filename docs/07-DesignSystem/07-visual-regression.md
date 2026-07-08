# DSTE 视觉回归测试规范

视觉回归测试保证 UI 升级不会意外破坏现有页面视觉效果。

## 范围

### 必测页面

以下页面必须在每次视觉相关改动后截图对比：

1. `src/cockpit.html` — 驾驶舱首页
2. `src/cockpit.html#exe/tasks` — 重点工作管理
3. `src/cockpit.html#bp/kpi` — KPI 指标体系
4. `src/meetings.html` — 经营分析会
5. `src/strategy-map-list.html` — 战略地图列表
6. `src/strategy-map.html` — 战略地图详情
7. `src/business-topics.html` — 业务专题管理
8. `src/requirement-pool.html` — 需求管理中心
9. `src/reviewer.html` — 会议材料审核
10. `src/employee-directory.html` — 人员与组织管理
11. `index.html` — 登录页

### 必测主题

- Light 主题
- Dark 主题

## 测试文件

- `tests/e2e/visual-regression.spec.js`

## 截图规范

- 视口：1920×1080（桌面）、375×812（移动端关键页面）
- 截取整页（fullPage: true）
- 忽略动态内容（时间、版本号）可使用 `mask` 覆盖
- 命名规则：`{page}-{theme}-{viewport}.png`

## 基线管理

- 基线截图保存在 `tests/e2e/visual-regression-snapshots/`
- 基线首次建立后纳入版本控制
- 每次发布前更新基线

## 阈值

- 默认像素差异阈值：0.2%
- 关键页面（cockpit 首页、meetings）：0.1%

## 验收标准

- 无 emoji 残留
- 图标无错位、无拉伸
- 主题切换后颜色正确
- 表格、按钮、弹窗状态正常
- 移动端 sidebar 为抽屉
- 嵌入模式 `?embed=1` 正常隐藏 chrome

## 工具

- Playwright `toHaveScreenshot()` API
- 本地运行：`npx playwright test tests/e2e/visual-regression.spec.js`
- 更新基线：`npx playwright test --update-snapshots`

## 人工走查清单

自动化测试之外，必须人工检查：

- [ ] 打开页面第一感受是否“正式、专业”
- [ ] 导航是否清晰，层级是否分明
- [ ] 间距是否统一、不拥挤
- [ ] 字体是否清晰、无锯齿
- [ ] 按钮和链接状态是否明确
- [ ] 暗色模式是否舒适
- [ ] 加载/空状态是否美观
