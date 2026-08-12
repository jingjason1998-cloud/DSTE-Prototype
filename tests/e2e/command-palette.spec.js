import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Command Palette (Cmd+K)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.evaluate(() => localStorage.removeItem('dste-workspace-tabs-v1'));
    await page.reload();
    await page.waitForSelector('.sidebar');
  });

  test('Cmd+K 打开面板，Esc 关闭', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await expect(page.locator('#dste-command-palette')).toHaveClass(/open/);
    await expect(page.locator('.cmdk-input')).toBeFocused();

    // 空查询展示页面索引
    await expect(page.locator('.cmdk-group-label').first()).toHaveText('页面');

    await page.keyboard.press('Escape');
    await expect(page.locator('#dste-command-palette')).not.toHaveClass(/open/);
  });

  test('搜索页面并回车跳转', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await page.fill('.cmdk-input', '经营分析会');
    const first = page.locator('.cmdk-item').first();
    await expect(first).toContainText('经营分析会');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/cockpit\.html#exe\/meetings/);
    await expect(page.locator('.workspace-iframe')).toHaveAttribute('src', /meetings\.html\?embed=1/);
  });

  test('搜索会议记录并定位详情弹窗', async ({ page }) => {
    // 先进入经营分析会，让本地 mock 数据落盘并读取一条真实会议
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    await page.locator('.sidebar-item[data-page="exe/meetings"]').click();
    const frame = page.frameLocator('.workspace-iframe');
    await expect(frame.locator('[data-open-meeting-detail]').first()).toBeVisible({ timeout: 10000 });
    const meeting = await page.evaluate(() => {
      const ms = JSON.parse(localStorage.getItem('dste_meetings') || '[]');
      return ms[0] ? { id: ms[0].id, title: ms[0].title } : null;
    });
    expect(meeting).toBeTruthy();

    // 离开 meetings 页，验证「跳转 + iframe load 后投递记录」链路
    await page.locator('.top-nav-item[data-phase="dashboard"]').click();

    await page.keyboard.press('Meta+k');
    await page.fill('.cmdk-input', meeting.title);
    const item = page.locator('.cmdk-item', { hasText: meeting.title }).first();
    await expect(item).toBeVisible();
    await item.click();

    // 跳回经营分析会标签，iframe 加载后收到 dste-open-record 并打开详情
    await expect(page).toHaveURL(/cockpit\.html#exe\/meetings/);
    await expect(frame.locator('#meeting-detail-overlay')).toBeVisible({ timeout: 10000 });
    await expect(frame.locator('#meeting-detail-overlay')).toContainText(meeting.title);
  });

  test('iframe 内嵌页里 Cmd+K 桥接打开父窗口面板', async ({ page }) => {
    // 先进入经营分析会（iframe 页）
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    await page.locator('.sidebar-item[data-page="exe/meetings"]').click();
    await expect(page.locator('.workspace-iframe')).toBeVisible();

    // 在 iframe 内按 Cmd+K
    const frame = page.frameLocator('.workspace-iframe');
    await frame.locator('body').click();
    await page.keyboard.press('Meta+k');
    await expect(page.locator('#dste-command-palette')).toHaveClass(/open/);
  });

  test('键盘上下选择 + Enter 执行', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await page.fill('.cmdk-input', 'KPI');
    const items = page.locator('.cmdk-item');
    await expect(items.first()).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toHaveClass(/active/);
    await page.keyboard.press('ArrowUp');
    await expect(items.first()).toHaveClass(/active/);
  });
});
