# 给AI的指令（复制即用）

## 示例1：开发经营分析会

```
继续开发 DSTE 经营分析会模块。项目路径 /Users/jasonjing/DSTE-Prototype。

遵循以下规范：
1. 代码写在 src/cockpit.html 的 renderMeetings() 函数内
2. 样式用现成的 CSS 变量，不要重新定义颜色
3. 写完后运行 npx playwright test && python3 -m pytest tests/ 验证
4. 不要改 vite.config.js、playwright.config.js、package.json
```

## 示例2：开发战略地图

```
开发 DSTE 战略地图可视化模块。项目路径 /Users/jasonjing/DSTE-Prototype。

遵循以下规范：
1. 代码写在 src/cockpit.html 的 renderStrategyMap() 函数内
2. 参考 renderDashboard() 的卡片布局风格
3. 写完后运行 npx playwright test && python3 -m pytest tests/ 验证
4. 不要改 vite.config.js、playwright.config.js、package.json
```

## 示例3：开发独立页面（如会议审核的某个子功能）

```
开发会议审核的 XXX 功能。项目路径 /Users/jasonjing/DSTE-Prototype。

遵循以下规范：
1. 代码写在 src/reviewer.html 内
2. 保持现有的筛选栏+表格交互风格
3. 写完后运行 npx playwright test && python3 -m pytest tests/ 验证
4. 不要改 vite.config.js、playwright.config.js、package.json
```
