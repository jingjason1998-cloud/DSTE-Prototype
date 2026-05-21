# 测试参考

## 测试金字塔

```
     /\
    /  \  E2E (Playwright) — 用户流程
   /----\
  /      \  Integration (pytest) — 页面结构
 /--------\
/          \  Unit (Vitest) — 工具函数
------------
```

当前覆盖：pytest 30 + E2E 8 = 38 个测试

---

## pytest 测试

### 写什么？

- 文件是否存在
- HTML 关键元素是否存在
- 导航链接是否完整
- 安全配置是否到位

### 示例

```python
def test_new_page_has_title():
    with open('src/cockpit.html', 'r', encoding='utf-8') as f:
        content = f.read()
    assert '我的新页面' in content

def test_new_page_has_navigation():
    with open('src/cockpit.html', 'r', encoding='utf-8') as f:
        content = f.read()
    assert 'sp/my-new-page' in content
```

### 运行

```bash
python3 -m pytest tests/ -v
```

---

## Playwright E2E 测试

### 写什么？

- 页面能正常加载
- 用户交互流程（点击、输入、筛选）
- 数据是否正确显示
- 主题切换是否正常

### 示例

```javascript
import { test, expect } from '@playwright/test';

test('new page loads', async ({ page }) => {
  await page.goto('/src/cockpit.html#sp/my-new-page');
  await expect(page.locator('.page-title')).toContainText('我的新页面');
});

test('new page filter works', async ({ page }) => {
  await page.goto('/src/cockpit.html#sp/my-new-page');
  await page.locator('#filter-input').fill('keyword');
  await expect(page.locator('.item')).toHaveCount(2);
});
```

### 运行

```bash
npx playwright test              # 全部测试
npx playwright test --ui        # UI 模式
npx playwright test --headed    # 有头模式（看浏览器）
```

---

## 测试 checklist（新页面上线前）

- [ ] pytest：页面 HTML 包含关键元素
- [ ] pytest：导航配置正确
- [ ] E2E：页面能正常加载
- [ ] E2E：主要交互功能正常
- [ ] E2E：主题切换（Light/Dark）样式正常
- [ ] E2E：从侧边栏能正常跳转
- [ ] `npm run build` 构建成功
- [ ] `npx playwright test` 全部通过
- [ ] `python3 -m pytest tests/` 全部通过
