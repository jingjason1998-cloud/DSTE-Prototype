import { test, expect } from '@playwright/test';

/**
 * 主题切换与样式回归测试
 * 核心目标：防止AI修改导致主题切换失效或样式降质
 * 覆盖：light/dark切换、CSS变量、关键组件样式、报表渲染
 */

test.describe('主题切换 - 全局功能', () => {
  test('cockpit 默认 light 主题', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('点击主题切换按钮切换到 dark', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('#theme-toggle').click();
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('主题切换持久化到 localStorage', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('#theme-toggle').click();
    const theme = await page.evaluate(() => localStorage.getItem('dste-theme'));
    expect(theme).toBe('dark');
  });

  test('刷新后主题保持', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('#theme-toggle').click();
    await page.reload();
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('主题切换 - 跨页面同步', () => {
  test('reviewer 页面读取 cockpit 设置的主题', async ({ page }) => {
    // 先在 cockpit 设置 dark
    await page.goto('/src/cockpit.html');
    await page.locator('#theme-toggle').click();

    // 再打开 reviewer
    await page.goto('/src/reviewer.html');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('business-topics 页面主题同步', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('#theme-toggle').click();

    await page.goto('/src/business-topics.html');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('主题切换 - 关键组件样式', () => {
  test('dark 模式下导航栏背景色正确', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('#theme-toggle').click();

    const topNav = page.locator('.top-nav');
    const bgColor = await topNav.evaluate(el => getComputedStyle(el).backgroundColor);
    // dark 模式下应该是深色背景（rgb 值都较小）
    const rgb = bgColor.match(/\d+/g)?.map(Number) || [0, 0, 0];
    const isDark = rgb[0] < 100 && rgb[1] < 100 && rgb[2] < 100;
    expect(isDark).toBeTruthy();
  });

  test('dark 模式下侧边栏文字可读', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.locator('#theme-toggle').click();

    const sidebar = page.locator('#sidebar');
    const color = await sidebar.evaluate(el => getComputedStyle(el).color);
    const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
    // 文字应该是亮色（rgb 值较大）
    const isLightText = rgb[0] > 200 && rgb[1] > 200 && rgb[2] > 200;
    expect(isLightText).toBeTruthy();
  });

  test('light 模式下表格表头样式正确', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    // 确保是 light
    await page.evaluate(() => {
      localStorage.setItem('dste-theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.reload();

    // 导航到包含表格的页面（使用更通用的选择器）
    const sidebarItems = page.locator('.sidebar-item');
    const count = await sidebarItems.count();
    let clicked = false;
    for (let i = 0; i < count; i++) {
      const item = sidebarItems.nth(i);
      const text = await item.textContent();
      if (text && (text.includes('战略专题') || text.includes('KPI') || text.includes('经营分析'))) {
        await item.click();
        clicked = true;
        break;
      }
    }

    if (clicked) {
      await page.waitForTimeout(500);
      const th = page.locator('table th, .data-table th').first();
      if (await th.isVisible().catch(() => false)) {
        const bgColor = await th.evaluate(el => getComputedStyle(el).backgroundColor);
        // light 模式下表头应该有明显背景色
        expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
      }
    }
  });
});

test.describe('主题切换 - 业务专题页面覆盖', () => {
  test('business-topics light 模式 workspace 背景正确', async ({ page }) => {
    await page.goto('/src/business-topics.html');
    await page.evaluate(() => {
      localStorage.setItem('dste-theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.reload();

    const workspace = page.locator('.topic-workspace, .workspace').first();
    if (await workspace.isVisible().catch(() => false)) {
      const bgColor = await workspace.evaluate(el => getComputedStyle(el).backgroundColor);
      // light 模式下 workspace 应该是浅色背景
      const rgb = bgColor.match(/\d+/g)?.map(Number) || [0, 0, 0];
      const isLightBg = rgb[0] > 200 && rgb[1] > 200 && rgb[2] > 200;
      expect(isLightBg).toBeTruthy();
    }
  });

  test('business-topics light 模式 modal 背景正确', async ({ page }) => {
    await page.goto('/src/business-topics.html');
    await page.evaluate(() => {
      localStorage.setItem('dste-theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.reload();

    // 尝试触发弹窗（如果有新增按钮）
    const addBtn = page.locator('button:has-text("新增"), button:has-text("添加"), .add-btn').first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(300);

      const modal = page.locator('.modal-content, .modal, [class*="modal"]').first();
      if (await modal.isVisible().catch(() => false)) {
        const bgColor = await modal.evaluate(el => getComputedStyle(el).backgroundColor);
        const rgb = bgColor.match(/\d+/g)?.map(Number) || [0, 0, 0];
        // light 模式下弹窗应该是白色/浅色背景
        const isLightBg = rgb[0] > 240 && rgb[1] > 240 && rgb[2] > 240;
        expect(isLightBg).toBeTruthy();
      }
    }
  });
});
