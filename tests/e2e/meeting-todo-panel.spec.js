import { test, expect } from '@playwright/test';

/**
 * 全局待办面板 E2E 测试
 */

test.describe('Meeting Global Todo Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/meetings.html');
    await page.evaluate(() => {
      localStorage.removeItem('dste_meetings');
      localStorage.removeItem('dste_resolutions_v2');
      localStorage.removeItem('dste_review_scores');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
  });

  test('todo panel is visible on page load', async ({ page }) => {
    const panel = page.locator('#global-todo-panel');
    await expect(panel).toBeVisible();
    await expect(page.locator('text=待办提醒').first()).toBeVisible();
  });

  test('todo panel renders todo items from mock data', async ({ page }) => {
    const items = page.locator('#global-todo-panel .todo-item');
    expect(await items.count()).toBeGreaterThan(0);
  });

  test('clicking a non-action todo opens meeting detail overlay', async ({ page }) => {
    const nonActionTodo = page.locator('#global-todo-panel .todo-item:not([data-todo-section="actions"])').first();
    await expect(nonActionTodo).toBeVisible();
    await nonActionTodo.click();

    const overlay = page.locator('#meeting-detail-overlay');
    await expect(overlay).toBeVisible();
    await expect(page.locator('#meeting-detail-header-left')).not.toBeEmpty();
  });

  test('clicking an action todo opens pending actions drawer and highlights the action', async ({ page }) => {
    const actionTodo = page.locator('#global-todo-panel .todo-item[data-todo-section="actions"]').first();
    await expect(actionTodo).toBeVisible();
    await actionTodo.click();

    const drawer = page.locator('#pending-actions-drawer');
    await expect(drawer).toBeVisible();
    await expect(page.locator('#pending-actions-list [data-meeting-id][data-action-idx]').first()).toBeVisible();
  });

  test('filter and group pills switch without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.locator('#global-todo-panel [data-todo-filter="critical"]').click();
    await page.waitForTimeout(150);

    await page.locator('#global-todo-panel [data-todo-group="type"]').click();
    await page.waitForTimeout(150);

    await page.locator('#global-todo-panel [data-todo-group="urgency"]').click();
    await page.waitForTimeout(150);

    await page.locator('#global-todo-panel [data-todo-filter="all"]').click();
    await page.waitForTimeout(150);

    expect(errors).toEqual([]);
  });

  test('group by type shows type headers', async ({ page }) => {
    await page.locator('#global-todo-panel [data-todo-group="type"]').click();
    await page.waitForTimeout(150);

    await expect(page.locator('#global-todo-panel .todo-group').first()).toBeVisible();
  });

  test('type pills filter todos by type and toggle off', async ({ page }) => {
    const typeBtn = page.locator('#global-todo-panel [data-todo-type]:not([data-todo-type="all"])').first();
    await expect(typeBtn).toBeVisible();
    const typeKey = await typeBtn.getAttribute('data-todo-type');

    await typeBtn.click();
    await page.waitForTimeout(150);

    const items = page.locator('#global-todo-panel .todo-item');
    expect(await items.count()).toBeGreaterThan(0);
    const types = await items.evaluateAll(els => els.map(e => e.getAttribute('data-todo-type')));
    expect([...new Set(types)]).toEqual([typeKey]);

    // 再次点击同一类型取消筛选，恢复全部待办
    await typeBtn.click();
    await page.waitForTimeout(150);
    const allTypes = await page.locator('#global-todo-panel .todo-item')
      .evaluateAll(els => els.map(e => e.getAttribute('data-todo-type')));
    expect(new Set(allTypes).size).toBeGreaterThan(1);
  });

  test('agenda material todos are no longer tracked', async ({ page }) => {
    await expect(page.locator('#global-todo-panel [data-todo-type="agendaMaterial"]')).toHaveCount(0);
    await expect(page.locator('#global-todo-panel .todo-item[data-todo-section="agenda"]')).toHaveCount(0);
  });

  test('empty state appears when no todos', async ({ page }) => {
    await page.evaluate(() => {
      const cleared = (window._meetingsData || []).map(m => ({
        ...m,
        status: 'completed',
        pipeline: {
          reportGenerated: true,
          preReviewDone: true,
          meetingHeld: true,
          minutesDrafted: true,
          minutesApproved: true,
          actionsTracked: true,
        },
        hasMinutes: true,
        actions: (m.actions || []).map(a => ({ ...a, status: 'completed' })),
        decisions: (m.decisions || []).map(d => ({ ...d, status: 'closed' })),
        agenda_items: (m.agenda_items || []).map(a => ({ ...a, material_link: 'http://example.com', reviewStatus: 'reviewed' })),
        effectiveness: { overallScore: 85 },
      }));
      window._meetingsData = cleared;
      if (typeof window.refreshTodoPanel === 'function') {
        window.refreshTodoPanel();
      }
    });

    await page.waitForTimeout(300);
    await expect(page.locator('#global-todo-panel .todo-item-empty')).toBeVisible();
    await expect(page.locator('text=当前暂无待办事项').first()).toBeVisible();
  });
});
