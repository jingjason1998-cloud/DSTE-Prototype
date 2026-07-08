# DSTE 图标规范

DSTE 使用 **Phosphor Icons** 作为唯一图标来源，替代原有的 emoji 图标，提升专业感和一致性。

## 选择理由

- 线条统一、风格中性，符合 executive SaaS 审美
- 支持 weight / fill / duotone，后续可按需扩展
- 开源（MIT），可商用
- SVG 格式，任意尺寸清晰，颜色由 CSS `currentColor` 控制

## 技术实现

### 文件

- `assets/js/icon-mapping.js` — DSTE 内部标识到 Phosphor 图标名的映射
- `assets/js/icons.js` — 图标渲染工具 `icon()` 与 `iconElement()`
- `assets/js/phosphor-icons.js` — 由 `scripts/build-icon-sprite.js` 自动生成的 SVG 路径数据
- `scripts/build-icon-sprite.js` — 构建脚本，从 `@phosphor-icons/core` 提取所需图标

### 渲染方式

图标以 inline SVG 形式渲染，便于通过 CSS 控制颜色和尺寸。

```javascript
import { icon } from '../assets/js/icons.js';

// 基础用法
icon('add');

// 指定尺寸与无障碍标签
icon('delete', { size: 16, ariaLabel: '删除', className: 'icon icon-danger' });
```

输出示例：

```html
<svg class="icon" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" role="presentation">...</svg>
```

### 在 HTML 字符串中使用

```javascript
const html = `
  <button class="btn btn-primary">
    ${icon('add', { size: 16 })}
    <span>新增</span>
  </button>
`;
```

### 尺寸类

```css
.icon-xs { font-size: 12px; }
.icon-sm { font-size: 14px; }
.icon-md { font-size: 16px; }
.icon-lg { font-size: 20px; }
.icon-xl { font-size: 24px; }
.icon-2xl { font-size: 32px; }
```

使用时给父元素加尺寸类，内部 SVG 通过 `width: 100%; height: 100%;` 跟随父元素字号：

```html
<span class="icon-lg">${icon('search')}</span>
```

## 映射表

### 顶部导航（DSTE 阶段）

| DSTE 标识 | Phosphor 图标 | 用途 |
|-----------|---------------|------|
| `dashboard` | `gauge` | 驾驶舱 |
| `sp` | `strategy` | 战略制定 |
| `bp` | `gear` | 战略解码 |
| `exe` | `rocket-launch` | 战略执行 |
| `rev` | `chart-bar` | 战略评估 |
| `ai` | `robot` | AI 助手 |

### 侧边栏模块

| DSTE 标识 | Phosphor 图标 | 用途 |
|-----------|---------------|------|
| `sp/strategy-map` | `map-trifold` | 战略地图 |
| `sp/insights` | `binoculars` | 战略洞察 |
| `sp/strategy-topics` | `bookmarks` | 战略专题管理 |
| `bp/kpi` | `chart-line-up` | KPI 指标体系 |
| `bp/bem` | `tree-structure` | BEM 战略解码 |
| `bp/annual-plan` | `calendar-check` | 年度经营计划 |
| `exe/kpi` | `chart-line-up` | KPI 管理 |
| `exe/tasks` | `check-square` | 重点工作管理 |
| `exe/meetings` | `users-three` | 经营分析会 |
| `exe/meeting-review` | `clipboard-text` | 会议材料审核 |
| `exe/business-topics` | `folders` | 业务专题管理 |
| `exe/st-issue-tracking` | `building` | 片联 ST 议题跟踪 |
| `exe/at-issue-tracking` | `buildings` | 片联 AT 议题跟踪 |
| `exe/report-center` | `chart-pie-slice` | 经营分析报表中心 |
| `rev/performance` | `trophy` | 绩效与激励 |
| `rev/cadre` | `user-gear` | 干部管理 |
| `rev/review` | `arrows-clockwise` | 战略复盘 |
| `rev/gap-analysis` | `trend-down` | 差距分析 |
| `dashboard/roadmap` | `map-pin-line` | 开发路线图 |
| `dashboard/version-audit` | `shield-check` | 版本审计 |
| `admin/employee-directory` | `users` | 人员与组织管理 |
| `admin/rule-engine` | `gear` | 规则引擎中心 |
| `admin/alert-hub` | `bell` | 预警中心 |
| `admin/requirement-pool` | `list-checks` | 需求管理中心 |

### 通用 UI 控件

| DSTE 标识 | Phosphor 图标 | 用途 |
|-----------|---------------|------|
| `search` | `magnifying-glass` | 搜索 |
| `notification` | `bell` | 通知 |
| `themeLight` | `sun` | 浅色主题 |
| `themeDark` | `moon` | 深色主题 |
| `user` | `user-circle` | 用户 |
| `menuCollapse` | `caret-left` | 收起菜单 |
| `menuExpand` | `caret-right` | 展开菜单 |
| `settings` | `gear` | 设置 |
| `logout` | `sign-out` | 退出 |
| `close` | `x` | 关闭 |
| `add` | `plus` | 新增 |
| `edit` | `pencil-simple` | 编辑 |
| `delete` | `trash` | 删除 |
| `download` | `download` | 下载 |
| `upload` | `upload` | 上传 |
| `filter` | `faders` | 筛选 |
| `more` | `dots-three` | 更多 |
| `check` | `check` | 勾选 |
| `chevronDown` | `caret-down` | 展开 |
| `chevronRight` | `caret-right` | 向右 |
| `external` | `arrow-square-out` | 外部链接 |
| `info` | `info` | 信息 |
| `warning` | `warning` | 警告 |
| `danger` | `warning-octagon` | 危险 |
| `success` | `check-circle` | 成功 |

## Emoji 替换清单（废弃）

以下 emoji 必须在升级过程中全部替换为 Phosphor 图标：

| Emoji | 旧用途 | 替换图标 key |
|-------|--------|--------------|
| 🎛️ | 驾驶舱 | `dashboard` |
| 🎯 | SP / 经营分析会 | `sp` / `exe/meetings` |
| 🔧 | BP | `bp` |
| 🚀 | 执行 | `exe` |
| 📊 | 评估 / 报表 | `rev` / `exe/report-center` |
| 🤖 | AI | `ai` |
| 🗺️ | 战略地图 | `sp/strategy-map` |
| 🔭 | 战略洞察 | `sp/insights` |
| 📋 | 议题 / 审核 / 需求 | `sp/strategy-topics` / `exe/meeting-review` / `admin/requirement-pool` |
| 📈 | KPI | `bp/kpi` / `exe/kpi` |
| ✅ | 重点工作 | `exe/tasks` |
| 🏢 / 🏛️ | 议题跟踪 | `exe/at-issue-tracking` / `exe/st-issue-tracking` |
| 👥 | 人员管理 | `admin/employee-directory` |
| ⚙️ | 规则引擎 | `admin/rule-engine` |
| 🔔 | 预警中心 / 通知 | `admin/alert-hub` |
| 🔍 | 版本审计 / 搜索 | `dashboard/version-audit` / `search` |

## 新增图标流程

1. 在 `assets/js/icon-mapping.js` 的 `ICONS` 对象中添加新的 `{ key: 'phosphor-name' }`
2. 运行 `npm run build:icons` 重新生成 `assets/js/phosphor-icons.js`
3. 在页面中使用 `icon('your-new-key')`

## 设计原则

1. **统一尺寸**：同一层级图标使用同一尺寸（导航 20px，按钮内 16px，行内 14px）
2. **统一颜色**：图标继承父元素 `color`，不单独设置 fill
3. **语义明确**：一个业务概念只对应一个图标，不混用
4. **无障碍**：有交互含义的图标必须提供 `ariaLabel`；装饰性图标使用 `aria-hidden`
5. **不旋转 emoji**：所有表情符号退出 UI
