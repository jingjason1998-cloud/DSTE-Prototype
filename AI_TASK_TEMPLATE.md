# 给另一个 AI 布置任务模板

## 直接复制这段发给 AI

---

**任务：开发 DSTE 经营分析会模块 (exe/meetings)**

### 项目位置
`/Users/jasonjing/DSTE-Prototype`

### 技术栈
- 纯 HTML + CSS + JS（无框架）
- Vite 构建（已配置好，不要改 vite.config.js）
- 样式引用 `../assets/css/main.css` + `./styles/shell.css`

### 你要做的

1. **新建页面文件**：`src/pages/meetings/index.js`
   - 复制 `src/pages/_template/index.js` 作为起点
   - 修改 `phase: 'exe'`

2. **页面内容**（替换占位符）：
   - 会议列表（带筛选：按时间/状态/负责人）
   - 会议详情卡片（议题、决议、跟踪项）
   - 新增功能：**会议效果评估**（评分表单）
   - 新增功能：**会议纪要生成**（模板化输出）

3. **注册到系统**：
   - 在 `src/cockpit.html` 的 `PAGES` 对象中，把 `exe/meetings` 指向你的渲染函数
   - 或者直接把渲染逻辑写在 cockpit.html 的 `renderMeetings()` 函数里

4. **写 E2E 测试**：`tests/e2e/meetings.spec.js`
   - 至少测：页面加载、筛选功能、评估表单提交

5. **运行测试确认通过**：
   ```bash
   cd /Users/jasonjing/DSTE-Prototype
   npx playwright test
   python3 -m pytest tests/
   ```

### 不要碰的文件
- `vite.config.js`
- `playwright.config.js`
- `src/lib/config.js`（只读，看导航配置用）
- `src/styles/shell.css`（只读，看样式用）

### 参考代码
- 现有经营分析会占位页面：`src/cockpit.html` 搜 `renderMeetings`
- 会议审核页面参考：`src/reviewer.html`（表格+筛选+状态标签的交互风格）
- 页面模板：`src/pages/_template/index.js`

---

## 当前 renderMeetings 占位代码位置

在 `src/cockpit.html` 中搜索 `function renderMeetings`，目前是个简单占位，你要把它替换成完整实现。

## 检查清单（AI 做完后你自己验证）

- [ ] `npm run build` 能成功
- [ ] `npx playwright test` 全部通过
- [ ] `python3 -m pytest tests/` 全部通过
- [ ] 从驾驶舱侧边栏「经营分析会」能正常打开
- [ ] 主题切换（🌙/☀️）样式正常
