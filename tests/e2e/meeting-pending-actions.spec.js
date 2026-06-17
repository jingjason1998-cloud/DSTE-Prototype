import { test, expect } from '@playwright/test';

async function createTestAction(page, content) {
  await page.locator('[data-edit-meeting]').first().click();
  await page.waitForSelector('#edit-title', { state: 'visible' });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  await page.locator('button:has-text("+ 添加行动项")').first().click();
  const actionInputs = page.locator('#edit-action-list input[placeholder="行动内容"]');
  await actionInputs.last().fill(content);

  await page.locator('button[onclick="saveMeeting()"]').click();
  await page.waitForSelector('.meeting-card', { state: 'visible' });
}

test.describe('Pending Actions Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/meetings.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
  });

  test('clicking pending actions stat opens drawer', async ({ page }) => {
    const statCard = page.locator('[data-stat="pending-actions"]');
    await expect(statCard).toBeVisible();
    await statCard.click();

    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();
  });

  test('drawer shows pending action items', async ({ page }) => {
    const statCard = page.locator('[data-stat="pending-actions"]');
    await statCard.click();

    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();

    // Should contain at least one action item row
    const items = drawer.locator('[data-pending-action]');
    expect(await items.count()).toBeGreaterThan(0);
  });

  test('clicking close button hides drawer', async ({ page }) => {
    const statCard = page.locator('[data-stat="pending-actions"]');
    await statCard.click();

    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();

    await page.locator('#pending-actions-drawer button[onclick="closePendingActionsDrawer()"]').click();
    await expect(drawer).toBeHidden();
  });

  test('clicking overlay hides drawer', async ({ page }) => {
    const statCard = page.locator('[data-stat="pending-actions"]');
    await statCard.click();

    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();

    await page.locator('#pending-actions-overlay').click();
    await expect(drawer).toBeHidden();
  });

  test('no JavaScript errors when opening drawer', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const statCard = page.locator('[data-stat="pending-actions"]');
    await statCard.click();
    await page.waitForTimeout(300);

    expect(errors).toEqual([]);
  });
});

test.describe.serial('Pending Actions Drawer - Write Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/meetings.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
  });

  test.afterEach(async ({ page }) => {
    // 清理本用例创建的测试行动项，避免污染数据
    await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('dste_meetings');
        if (!raw) return;
        const meetings = JSON.parse(raw);
        const prefixes = ['状态切换测试_', '进度说明测试_', '详情页进度测试_', '详情页进度说明_'];
        let changed = false;
        meetings.forEach(m => {
          if (!Array.isArray(m.actions)) return;
          const before = m.actions.length;
          m.actions = m.actions.filter(a => !prefixes.some(p => (a.content || '').startsWith(p) || (a.progressNote || '').startsWith(p)));
          if (m.actions.length !== before) changed = true;
        });
        if (changed) localStorage.setItem('dste_meetings', JSON.stringify(meetings));
      } catch (e) {
        console.warn('cleanup failed:', e);
      }
    });
  });

  test('changes action status in drawer', async ({ page }) => {
    const testContent = '状态切换测试_' + Date.now();
    await createTestAction(page, testContent);

    const statCard = page.locator('[data-stat="pending-actions"]');
    await statCard.click();

    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();

    const card = drawer.locator('[data-pending-action]').filter({ hasText: testContent }).first();
    await expect(card).toBeVisible();

    const statusSelect = card.locator('select[data-action-status]');
    await expect(statusSelect).toHaveValue('pending');

    await statusSelect.selectOption('in_progress');
    await expect(statusSelect).toHaveValue('in_progress');

    await statusSelect.selectOption('completed');
    // 已完成的行动项会从抽屉列表中移除
    await expect(drawer.locator('[data-pending-action]').filter({ hasText: testContent })).toHaveCount(0);
  });

  test('edits progress note in drawer', async ({ page }) => {
    const testContent = '进度说明测试_' + Date.now();
    await createTestAction(page, testContent);

    const statCard = page.locator('[data-stat="pending-actions"]');
    await statCard.click();

    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();

    const card = drawer.locator('[data-pending-action]').filter({ hasText: testContent }).first();
    await expect(card).toBeVisible();

    const testNote = '测试进度说明_' + Date.now();
    await card.locator('button[data-action-edit]').click();
    await card.locator('textarea[data-action-note-input]').fill(testNote);
    await card.locator('button[data-action-save]').click();

    await expect(card.locator('[data-action-note]')).toContainText(testNote);
  });

  test('progress note is shown in meeting detail', async ({ page }) => {
    const testContent = '详情页进度测试_' + Date.now();
    const testNote = '详情页进度说明_' + Date.now();
    await createTestAction(page, testContent);

    // 在抽屉中填写进度说明
    await page.locator('[data-stat="pending-actions"]').click();
    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();
    const card = drawer.locator('[data-pending-action]').filter({ hasText: testContent }).first();
    await card.locator('button[data-action-edit]').click();
    await card.locator('textarea[data-action-note-input]').fill(testNote);
    await card.locator('button[data-action-save]').click();
    await expect(card.locator('[data-action-note]')).toContainText(testNote);

    // 关闭抽屉并打开第一个会议详情
    await page.locator('#pending-actions-drawer button[onclick="closePendingActionsDrawer()"]').click();
    await page.locator('.meeting-card').first().click();
    const detailOverlay = page.locator('#meeting-detail-overlay');
    await expect(detailOverlay).toBeVisible();

    // 断言详情页行动项区域显示 progressNote
    await expect(detailOverlay.locator('#detail-actions')).toContainText(testNote);
  });
});
