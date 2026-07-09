import { test, expect } from '@playwright/test';

test.describe('Meeting Agenda Postponement', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/meetings.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.evaluate(() => localStorage.removeItem('dste_meetings'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
  });

  async function postponeFirstAgendaFromEditor(page) {
    // 注入一个未来日期的目标会议，确保顺延目标列表不为空
    await page.evaluate(() => {
      const meetings = window._meetingsData || [];
      const template = meetings[0] ? JSON.parse(JSON.stringify(meetings[0])) : null;
      if (template) {
        const today = new Date();
        const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const futureDateStr = [
          futureDate.getFullYear(),
          String(futureDate.getMonth() + 1).padStart(2, '0'),
          String(futureDate.getDate()).padStart(2, '0'),
        ].join('-');
        template.id = 'future-target-' + Date.now();
        template.title = '未来目标会议';
        template.date = futureDateStr;
        template.month = futureDateStr.slice(0, 7);
        template.status = 'planned';
        template.scenario = 'hq_routine';
        template.upstreamMeeting = null;
        template.downstreamMeeting = null;
        template.effectiveness = null;
        meetings.push(template);
        localStorage.setItem('dste_meetings', JSON.stringify(meetings));
      }
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    // Wait for meeting cards to render, then pick a completed one
    await page.waitForSelector('.meeting-card', { timeout: 15000 });
    const card = page.locator('.meeting-card').filter({ hasText: /已完成/ }).first();
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.locator('button:has-text("✏️ 编辑")').click();
    await expect(page.locator('h1.page-title:has-text("编辑会议")')).toBeVisible();
    await expect(page.locator('#edit-agenda-list')).toBeVisible();

    const postponeBtn = page.locator('#edit-agenda-list button:has-text("顺延")').first();
    await expect(postponeBtn).toBeVisible();
    await postponeBtn.click();

    const overlay = page.locator('#postpone-target-overlay');
    await expect(overlay).toBeVisible();

    const targetCards = overlay.locator('#postpone-target-list > div');
    await expect(targetCards.first()).toBeVisible();
    await targetCards.first().click();

    const confirmBtn = overlay.locator('#postpone-target-confirm-btn');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    await expect(overlay).toBeHidden();
    await expect(page.locator('#dste-toast-container')).toContainText('议程已顺延');
  }

  test('can postpone an agenda to another existing meeting from the editor', async ({ page }) => {
    await postponeFirstAgendaFromEditor(page);

    // 返回列表并打开详情，验证议程状态已持久化为已顺延
    await page.locator('button:has-text("取消")').first().click();
    await expect(page.locator('h1.page-title:has-text("经营分析会")')).toBeVisible();

    const card = page.locator('.meeting-card').filter({ hasText: /已完成/ }).first();
    await card.click();
    await page.locator('#meeting-detail-overlay').waitFor({ state: 'visible' });
    await expect(page.locator('#meeting-detail-content')).toContainText('已顺延');
  });

  test('shows warning when an agenda has been postponed 3 times', async ({ page }) => {
    // Seed the first completed meeting with an agenda that has already been postponed 3 times
    await page.evaluate(() => {
      const target = (window._meetingsData || []).find(m => m.status === 'completed');
      if (target && target.agenda_items?.[0]) {
        target.agenda_items[0].status = 'postponed';
        target.agenda_items[0].postponedCount = 3;
        target.agenda_items[0].originalAgendaId = target.agenda_items[0].id;
        target.agenda_items[0].carriedFromMeetingId = 'seed';
        localStorage.setItem('dste_meetings', JSON.stringify(window._meetingsData));
      }
    });

    // Wait for meeting cards to render, then pick a completed one
    await page.waitForSelector('.meeting-card', { timeout: 15000 });
    const card = page.locator('.meeting-card').filter({ hasText: /已完成/ }).first();
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();
    await page.locator('#meeting-detail-overlay').waitFor({ state: 'visible' });

    await expect(page.locator('#meeting-detail-content')).toContainText('已顺延 3 次');
  });

  test('applies postponement deduction to meeting effectiveness score', async ({ page }) => {
    await postponeFirstAgendaFromEditor(page);

    // 返回列表并打开详情，重新评估会议
    await page.locator('button:has-text("取消")').first().click();
    await expect(page.locator('h1.page-title:has-text("经营分析会")')).toBeVisible();

    const card = page.locator('.meeting-card').filter({ hasText: /已完成/ }).first();
    await card.click();
    await page.locator('#meeting-detail-overlay').waitFor({ state: 'visible' });

    await page.locator('#meeting-detail-content button:has-text("评估会议"), #meeting-detail-content button:has-text("重新评估")').first().click();
    await page.locator('#meeting-eval-overlay').waitFor({ state: 'visible' });

    // The eval modal should show the postponement deduction
    await expect(page.locator('#meeting-eval-overlay')).toContainText('议程顺延扣分：-5 分');
  });
});
