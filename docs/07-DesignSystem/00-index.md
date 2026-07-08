# DSTE 设计系统

DSTE 设计系统定义了帆软 DSTE 战略管理平台的视觉语言与交互规范，目标是让每一个页面看起来专业、权威、统一，给观众留下“非常牛逼”的第一印象。

## 设计原则

1. **权威专业（Authoritative）**
   - 色彩克制、层级清晰、间距规整，符合企业级战略管理工具的气质。
   - 参考 IBM Carbon 的正式感、Material Design 3 的 token 体系、Atlassian 的 SaaS 协作模式。

2. **信息密度与可读性平衡**
   - 数据密集的仪表盘需要紧凑；阅读型页面需要留白。
   - 通过 8px 基线网格和统一字号阶梯建立节奏。

3. **一致性优先**
   - 同一组件在所有页面表现一致。
   - 颜色、圆角、阴影、图标全部通过 token 控制，禁止硬编码。

4. **可访问性**
   - 满足 WCAG 2.1 AA 对比度标准。
   - 状态不能只用颜色，必须配合图标+文字。
   - 支持键盘导航与减少动画偏好。

## 文档结构

| 文档 | 内容 |
|------|------|
| `01-tokens.md` | 颜色、字体、间距、圆角、阴影、动效 token 完整参考 |
| `02-components.md` | 按钮、卡片、表格、导航、标签、输入框、弹窗等组件规范 |
| `03-icons.md` | Phosphor 图标映射、emoji 替换规则、使用方式 |
| `04-shell.md` | 顶部导航、侧边栏、面包屑、页面框架统一规范 |
| `05-a11y.md` | 对比度、焦点、ARIA、减少动画、键盘导航 |
| `06-migration.md` | 迁移顺序、旧变量兼容映射、废弃 emoji 清单 |
| `07-visual-regression.md` | 视觉回归测试范围、截图基线、验收标准 |

## 核心文件

- `assets/css/tokens.css` — 设计 token 源文件
- `assets/css/components.css` — 组件样式基线
- `assets/css/main.css` — 兼容层，保留旧变量别名
- `assets/js/icon-mapping.js` — DSTE 标识 → Phosphor 图标名
- `assets/js/icons.js` — 图标渲染工具
- `assets/js/phosphor-icons.js` — 由 `scripts/build-icon-sprite.js` 自动生成的图标路径数据

## 快速使用

```html
<!-- 页面入口只需引入 main.css -->
<link rel="stylesheet" href="../assets/css/main.css" />
```

```javascript
// 渲染图标
import { icon } from '../assets/js/icons.js';

const svg = icon('add', { size: 16, ariaLabel: '新增' });
element.innerHTML = svg;
```

## 视觉方向

- **主色**：帆软蓝 `#1677FF`
- **中性色**：冷灰阶，从 `#FFFFFF` 到 `#000000`
- **圆角**：小（4px）/ 中（8px）/ 大（12px）
- **阴影**：4 档 elevation，克制柔和
- **图标**：Phosphor Icons Regular，1.5px 统一描边
- **字体**：Inter + PingFang SC + system-ui fallback

## 例外

`index.html` 登录页保持独立的“战争室”暗色科幻风格，作为品牌记忆点，但底层颜色、字体、阴影使用同一套 token。
