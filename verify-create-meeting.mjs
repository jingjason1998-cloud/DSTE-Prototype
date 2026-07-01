/* eslint-env node, browser */
import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3458/src/meetings.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Open AI assistant
    await page.locator('.page-header button:has-text("AI 助手")').click();
    await page.waitForTimeout(800);

    // Call applyAiMeeting directly with a mock meeting draft
    await page.evaluate(() => {
      const meeting = {
        id: 'new_1234567890',
        title: '华东战区 7 月经营分析会',
        date: '2026-07-15',
        month: '2026-07',
        scenario: 'region_routine',
        level: 'L2',
        status: 'planned',
        startTime: '09:00',
        location: '上海办公室',
        host: '刘战区总',
        recorder: '待定',
        meeting_link: '',
        pre_report_id: '',
        minutes_report_id: '',
        minutes_content: '',
        hasMinutes: false,
        minutesStatus: null,
        pipeline: {
          reportGenerated: false,
          preReviewDone: false,
          meetingHeld: false,
          minutesDrafted: false,
          minutesApproved: false,
          actionsTracked: false,
        },
        upstreamMeeting: null,
        downstreamMeeting: null,
        agenda_items: [{
          id: 'ag_test_123',
          type: 'goal_management',
          title: '',
          duration: 30,
          owner: '',
          material_link: '',
          data_views: [],
          pre_report_section: '',
          status: 'planned',
          originalAgendaId: '',
          postponedCount: 0,
          carriedFromAgendaId: null,
          carriedFromMeetingId: null,
          postponedHistory: [],
        }],
        actions: [],
        decisions: [],
        metrics: { materialTimeliness: 0, resolutionTimeliness: 0, actionClosure: 0, satisfaction: 0 },
        effectiveness: null,
      };

      if (typeof window.applyAiMeeting === 'function') {
        window.applyAiMeeting(meeting);
      } else {
        throw new Error('applyAiMeeting not exposed on window');
      }
    });

    await page.waitForTimeout(800);

    // Verify editor opened
    const editor = page.locator('#meeting-editor-overlay');
    const editorVisible = await editor.isVisible();
    console.log(`Editor visible: ${editorVisible}`);

    if (!editorVisible) {
      console.error('FAIL: Editor did not open');
      await browser.close();
      process.exit(1);
    }

    // Verify form fields pre-filled
    const titleValue = await page.inputValue('#edit-title');
    const dateValue = await page.inputValue('#edit-date');
    const scenarioText = await page.locator('#edit-scenario').evaluate(el => el.options[el.selectedIndex].text);
    console.log(`Editor title: ${titleValue}`);
    console.log(`Editor date: ${dateValue}`);
    console.log(`Editor scenario: ${scenarioText}`);

    if (titleValue !== '华东战区 7 月经营分析会') {
      console.error('FAIL: Title not pre-filled correctly');
      await browser.close();
      process.exit(1);
    }

    if (dateValue !== '2026-07-15') {
      console.error('FAIL: Date not pre-filled correctly');
      await browser.close();
      process.exit(1);
    }

    await page.screenshot({ path: '/tmp/meeting-editor-prefilled.png' });
    console.log('Screenshot saved: /tmp/meeting-editor-prefilled.png');

    await browser.close();
  } catch (err) {
    console.error('ERROR:', err);
    await browser.close();
    process.exit(1);
  }
})();
