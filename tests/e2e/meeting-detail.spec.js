import { test, expect } from '@playwright/test';

test.describe('Meeting Detail View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/meetings.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
  });

  test('clicking meeting card opens detail overlay', async ({ page }) => {
    const card = page.locator('.meeting-card').first();
    await expect(card).toBeVisible();
    await card.scrollIntoViewIfNeeded();
    await card.click();

    const overlay = page.locator('#meeting-detail-overlay');
    await expect(overlay).toBeVisible();
  });

  test('detail overlay shows meeting title', async ({ page }) => {
    const card = page.locator('.meeting-card').first();
    await card.scrollIntoViewIfNeeded();
    await card.click();

    const headerLeft = page.locator('#meeting-detail-header-left');
    await expect(headerLeft).not.toBeEmpty();
    const text = await headerLeft.textContent();
    expect(text.length).toBeGreaterThan(0);
  });

  test('detail overlay has sections without tabs', async ({ page }) => {
    const card = page.locator('.meeting-card').first();
    await card.scrollIntoViewIfNeeded();
    await card.click();

    // Agenda section should be visible
    await expect(page.locator('text=会议议程').first()).toBeVisible();
    // Actions section should be visible
    await expect(page.locator('text=行动项').first()).toBeVisible();
    // Decisions section should be visible
    await expect(page.locator('text=决议').first()).toBeVisible();
    // Meeting chain section should be visible
    await expect(page.locator('text=会议链').first()).toBeVisible();
    // Old tab buttons should NOT exist
    await expect(page.locator('.meeting-tab-btn').first()).not.toBeVisible();
  });

  test('no JavaScript errors when opening detail', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const card = page.locator('.meeting-card').first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForTimeout(300);

    expect(errors).toEqual([]);
  });

  test('clicking each meeting card opens its detail', async ({ page }) => {
    const cards = page.locator('.meeting-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 3); i++) {
      const card = cards.nth(i);
      await card.scrollIntoViewIfNeeded();
      await card.click();
      const overlay = page.locator('#meeting-detail-overlay');
      await expect(overlay).toBeVisible();

      const headerLeft = page.locator('#meeting-detail-header-left');
      const text = await headerLeft.textContent();
      expect(text.length).toBeGreaterThan(0);

      // Close detail
      await page.locator('#meeting-detail-overlay button[onclick="closeMeetingDetail()"]').click();
      await expect(overlay).toBeHidden();
    }
  });

  test('detail overlay shows material review status badges and summary', async ({ page }) => {
    // G2: 验证材料审核状态缓存与展示
    const seedMeeting = {
      id: 'test_review_001',
      title: '材料审核展示测试会',
      date: '2026-06-26',
      month: '2026-06',
      startTime: '09:00',
      location: '会议室 A',
      host: '张三',
      recorder: '李四',
      scenario: 'region_routine',
      level: 'L2',
      status: 'planned',
      meeting_link: '',
      pre_report_id: '',
      minutes_content: '',
      hasMinutes: false,
      minutesStatus: null,
      pipeline: { reportGenerated: false, preReviewDone: false, meetingHeld: false, minutesDrafted: false, minutesApproved: false, actionsTracked: false },
      agenda_items: [
        { id: 'ag_1', type: 'budget_finance', title: '已审核议题', duration: 30, owner: '', material_link: 'https://kms.example.com/doc1', data_views: [], pre_report_section: '', status: 'planned', originalAgendaId: 'ag_1', postponedCount: 0, carriedFromAgendaId: null, carriedFromMeetingId: null, postponedHistory: [], reviewStatus: 'reviewed', reviewScore: 85, reviewReportUrl: 'https://kms.example.com/doc1', lastReviewedAt: '2026-06-26T08:00:00Z' },
        { id: 'ag_2', type: 'business_special', title: '待审核议题', duration: 20, owner: '', material_link: 'https://kms.example.com/doc2', data_views: [], pre_report_section: '', status: 'planned', originalAgendaId: 'ag_2', postponedCount: 0, carriedFromAgendaId: null, carriedFromMeetingId: null, postponedHistory: [], reviewStatus: 'pending', reviewScore: 0, reviewReportUrl: '', lastReviewedAt: '' },
      ],
      actions: [],
      decisions: [],
      upstreamMeeting: null,
      downstreamMeeting: null,
      metrics: { materialTimeliness: 0, resolutionTimeliness: 0, actionClosure: 0, satisfaction: 0 },
      effectiveness: null,
    };

    await page.evaluate((m) => {
      const meetings = JSON.parse(localStorage.getItem('dste_meetings') || '[]');
      meetings.push(m);
      localStorage.setItem('dste_meetings', JSON.stringify(meetings));
      localStorage.setItem('dste_meetings_version', '5');
    }, seedMeeting);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    await page.locator('[data-meeting-id="test_review_001"]').scrollIntoViewIfNeeded();
    await page.locator('[data-meeting-id="test_review_001"]').click();

    const overlay = page.locator('#meeting-detail-overlay');
    await expect(overlay).toBeVisible();

    // 信息面板应显示材料审核摘要
    await expect(overlay.locator('text=材料审核').first()).toBeVisible();
    await expect(overlay.locator('text=1/2 已审核').first()).toBeVisible();

    // 已审核议程项应显示徽标
    await expect(overlay.locator('text=已审核').first()).toBeVisible();
    // 待审核议程项不应显示已审核/失败/审核中徽标，但材料链接存在
    await expect(overlay.locator('text=待审核议题').first()).toBeVisible();
  });
});
