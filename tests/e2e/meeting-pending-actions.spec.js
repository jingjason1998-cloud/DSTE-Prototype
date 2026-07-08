import { test, expect } from '@playwright/test';

async function createTestAction(page, content) {
  await page.locator('[data-edit-meeting]').first().click();
  await page.waitForSelector('#edit-title', { state: 'visible' });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  await page.locator('button:has-text("添加行动项")').first().click();
  const actionInputs = page.locator('#edit-action-list input[placeholder="行动内容"]');
  await actionInputs.last().fill(content);

  await page.locator('button[onclick="saveMeeting()"]').click();
  await page.waitForSelector('.meeting-card', { state: 'visible' });
}

async function createTestActionWithDeadline(page, content, deadline) {
  await page.locator('[data-edit-meeting]').first().click();
  await page.waitForSelector('#edit-title', { state: 'visible' });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  await page.locator('button:has-text("添加行动项")').first().click();
  const actionRows = page.locator('#edit-action-list > div');
  const lastRow = actionRows.last();
  await lastRow.locator('input[placeholder="行动内容"]').fill(content);
  await lastRow.locator('input[type="date"]').fill(deadline);

  await page.locator('button[onclick="saveMeeting()"]').click();
  await page.waitForSelector('.meeting-card', { state: 'visible' });
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
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
        const prefixes = ['状态切换测试_', '进度说明测试_', '详情页进度测试_', '详情页进度说明_', '标签页已完成测试_', '标签页全部测试_', '逾期催办测试_'];
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

  test('switching to completed tab shows completed actions', async ({ page }) => {
    const testContent = '标签页已完成测试_' + Date.now();
    await createTestAction(page, testContent);

    await page.locator('[data-stat="pending-actions"]').click();
    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();

    const card = drawer.locator('[data-pending-action]').filter({ hasText: testContent }).first();
    await expect(card).toBeVisible();
    await card.locator('select[data-action-status]').selectOption('completed');

    // 从「待闭环」标签页消失
    await expect(drawer.locator('[data-pending-action]').filter({ hasText: testContent })).toHaveCount(0);

    // 切换到「已完成」标签页应能看到
    await drawer.locator('button:has-text("已完成")').click();
    const completedCard = drawer.locator('[data-pending-action]').filter({ hasText: testContent }).first();
    await expect(completedCard).toBeVisible();
    await expect(completedCard).toContainText('已完成');
  });

  test('all tab shows both pending and completed actions', async ({ page }) => {
    const testContent = '标签页全部测试_' + Date.now();
    await createTestAction(page, testContent);

    await page.locator('[data-stat="pending-actions"]').click();
    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();

    await drawer.locator('button:has-text("全部")').click();
    const items = drawer.locator('[data-pending-action]');
    expect(await items.count()).toBeGreaterThan(0);
  });

  test.skip('overdue action shows urge button in drawer', async ({ page }) => {
    await page.locator('[data-stat="pending-actions"]').click();
    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();

    // 依赖 mock 数据中存在逾期行动项（A001 deadline 2026-04-30）
    const overdueCard = drawer.locator('[data-pending-action]').filter({ hasText: '已逾期' }).first();
    await expect(overdueCard).toBeVisible();

    const urgeBtn = overdueCard.locator('button:has-text("催办")');
    await expect(urgeBtn).toBeVisible();
  });

  test.skip('clicking urge button opens reminder dialog', async ({ page }) => {
    await page.locator('[data-stat="pending-actions"]').click();
    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();

    const overdueCard = drawer.locator('[data-pending-action]').filter({ hasText: '已逾期' }).first();
    await overdueCard.locator('button:has-text("催办")').click();

    const dialog = page.locator('#action-reminder-overlay');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#action-reminder-message')).toContainText('已逾期');

    await dialog.locator('button:has-text("取消")').click();
    await expect(dialog).toBeHidden();
  });

  test.skip('confirming reminder increments count and shows badge', async ({ page }) => {
    const testContent = '逾期催办测试_' + Date.now();
    await createTestActionWithDeadline(page, testContent, getYesterday());

    await page.locator('[data-stat="pending-actions"]').click();
    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();

    const card = drawer.locator('[data-pending-action]').filter({ hasText: testContent }).first();
    await expect(card).toBeVisible();
    await expect(card.locator('button:has-text("催办")')).toBeVisible();

    await card.locator('button:has-text("催办")').click();
    const dialog = page.locator('#action-reminder-overlay');
    await expect(dialog).toBeVisible();
    await dialog.locator('button:has-text("确认催办")').click();

    await expect(dialog).toBeHidden();
    await expect(page.locator('text=催办已记录')).toBeVisible();

    // 抽屉刷新后显示已催办徽章
    const refreshedCard = drawer.locator('[data-pending-action]').filter({ hasText: testContent }).first();
    await expect(refreshedCard).toContainText('已催办 1 次');
  });

  test.skip('canceling reminder does not change state', async ({ page }) => {
    const testContent = '逾期催办测试_取消_' + Date.now();
    await createTestActionWithDeadline(page, testContent, getYesterday());

    await page.locator('[data-stat="pending-actions"]').click();
    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();

    const card = drawer.locator('[data-pending-action]').filter({ hasText: testContent }).first();
    await card.locator('button:has-text("催办")').click();

    const dialog = page.locator('#action-reminder-overlay');
    await expect(dialog).toBeVisible();
    await dialog.locator('button:has-text("取消")').click();

    await expect(dialog).toBeHidden();
    await expect(card.locator('text=已催办')).toHaveCount(0);
  });
});
