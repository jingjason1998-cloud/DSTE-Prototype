import { test, expect } from '@playwright/test';

/**
 * AI 议程推荐 E2E 测试（左右并列布局）
 * 使用 Playwright 拦截 /api/ai/agenda，验证面板交互与议程采纳。
 */

const MOCK_CANDIDATES = {
  success: true,
  candidates: [
    {
      id: 'ai_c1',
      title: 'Q2 回款进度滞后跟进',
      type: 'budget_finance',
      duration: 20,
      owner: '财务部',
      reason: '上一期顺延，且相关行动项 6/30 到期',
      sourceType: 'postponed_agenda',
      sourceId: 'ag_001',
      confidence: 0.92,
    },
    {
      id: 'ai_c2',
      title: '华东区客户满意度整改',
      type: 'business_special',
      duration: 25,
      owner: '客户成功部',
      reason: 'OMP 重点工作风险等级高，建议本月讨论',
      sourceType: 'key_work',
      sourceId: 'kw_001',
      confidence: 0.78,
    },
    {
      id: 'ai_c3',
      title: '产品 V3.0 上线风险评审',
      type: 'key_task_management',
      duration: 30,
      owner: '产品部',
      reason: '历史会议中多次出现，且当前行动项未闭环',
      sourceType: 'historical',
      sourceId: '',
      confidence: 0.65,
    },
  ],
};

async function openFirstMeetingEditor(page) {
  await page.goto('/src/meetings.html');
  await page.evaluate(() => {
    localStorage.removeItem('dste_meetings');
    localStorage.removeItem('dste_resolutions_v2');
    localStorage.removeItem('dste_review_scores');
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.waitForSelector('[data-edit-meeting]', { state: 'visible' });
  await page.locator('[data-edit-meeting]').first().click();
  await page.waitForSelector('#edit-title', { state: 'visible' });
}

async function openAiAgendaPanel(page) {
  // 新版 UI：议程推荐在会议 AI 助手抽屉的「议程推荐」标签页内
  // openMeetingAiAssistantFromEditor 默认打开 agenda 标签
  await page.evaluate(() => {
    if (typeof openMeetingAiAssistantFromEditor === 'function') {
      openMeetingAiAssistantFromEditor();
    } else {
      throw new Error('openMeetingAiAssistantFromEditor is not defined');
    }
  });
  await page.waitForTimeout(200);
  await expect(page.locator('#meeting-ai-agenda-content')).toBeVisible();
  await expect(page.locator('#meeting-ai-agenda-content').locator('text=AI 推荐议程').first()).toBeVisible();
}

function getAgendaPanel(page) {
  return page.locator('#meeting-ai-agenda-content');
}

async function interceptAiApi(page, responseBody, status = 200) {
  await page.route('**/api/ai/agenda', async (route, request) => {
    if (request.method() !== 'POST') {
      await route.fulfill({ status: 405, body: JSON.stringify({ error: 'Method not allowed' }) });
      return;
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(responseBody),
    });
  });
}

test.describe.serial('AI Agenda Recommendation Panel', () => {
  test.beforeEach(async ({ page }) => {
    await interceptAiApi(page, MOCK_CANDIDATES);
  });

  test('shows AI agenda panel inside meeting AI assistant drawer', async ({ page }) => {
    await openFirstMeetingEditor(page);
    await openAiAgendaPanel(page);

    const panel = getAgendaPanel(page);
    await expect(panel.locator('text=AI 推荐议程').first()).toBeVisible();
    await expect(panel.locator('text=候选挑选，人工确认后采纳').first()).toBeVisible();
    await expect(panel.locator('button:has-text("生成候选议程")')).toBeVisible();
  });

  test('generates and displays candidate agendas', async ({ page }) => {
    await openFirstMeetingEditor(page);
    await openAiAgendaPanel(page);

    const panel = getAgendaPanel(page);
    await panel.locator('#ai-agenda-theme-input').fill('降本增效');
    await panel.locator('button:has-text("生成候选议程")').click();

    await expect(panel.locator('.ai-agenda-candidate').first()).toBeVisible();
    await expect(panel.locator('.ai-agenda-candidate')).toHaveCount(3);
    await expect(panel.locator('text=Q2 回款进度滞后跟进')).toBeVisible();
    await expect(panel.locator('text=华东区客户满意度整改')).toBeVisible();
  });

  test('selects high-confidence candidates by default', async ({ page }) => {
    await openFirstMeetingEditor(page);
    await openAiAgendaPanel(page);

    const panel = getAgendaPanel(page);
    await panel.locator('button:has-text("生成候选议程")').click();

    await expect(panel.locator('#ai-agenda-candidates-list')).toBeVisible();
    // confidence >= 0.85 auto-selected
    const checked = panel.locator('input[type="checkbox"]:checked');
    await expect(checked).toHaveCount(1);
  });

  test('applies selected candidates to agenda list', async ({ page }) => {
    await openFirstMeetingEditor(page);
    await openAiAgendaPanel(page);

    const beforeCount = await page.locator('#edit-agenda-list > div').count();
    const panel = getAgendaPanel(page);

    await panel.locator('button:has-text("生成候选议程")').click();

    await expect(panel.locator('#ai-cb-ai_c1')).toBeVisible();
    // ai_c1 is auto-selected (confidence 0.92); manually select ai_c2
    await panel.locator('#ai-cb-ai_c2').check();

    await panel.locator('button:has-text("采纳选中")').click();

    // Agenda list should grow
    const afterCount = await page.locator('#edit-agenda-list > div').count();
    expect(afterCount).toBe(beforeCount + 2);

    // New items visible
    await expect(page.locator('#edit-agenda-list input[value="Q2 回款进度滞后跟进"]')).toBeVisible();
    await expect(page.locator('#edit-agenda-list input[value="华东区客户满意度整改"]')).toBeVisible();
  });

  test('select all toggles candidate selection', async ({ page }) => {
    await openFirstMeetingEditor(page);
    await openAiAgendaPanel(page);

    const panel = getAgendaPanel(page);
    await panel.locator('button:has-text("生成候选议程")').click();

    await expect(panel.locator('#ai-agenda-candidates-list')).toBeVisible();

    const selectAllBtn = panel.locator('button:has-text("全选")');
    await selectAllBtn.click();

    const checked = panel.locator('input[type="checkbox"]:checked');
    await expect(checked).toHaveCount(3);

    await selectAllBtn.click();
    await expect(checked).toHaveCount(0);
  });

  test('shows empty state before generating', async ({ page }) => {
    await openFirstMeetingEditor(page);
    await openAiAgendaPanel(page);

    const panel = getAgendaPanel(page);
    await expect(panel.locator('text=点击上方按钮').first()).toBeVisible();
  });

  test('shows error state when AI service fails', async ({ page }) => {
    await page.route('**/api/ai/agenda', async (route, request) => {
      if (request.method() !== 'POST') {
        await route.fulfill({ status: 405, body: JSON.stringify({ error: 'Method not allowed' }) });
        return;
      }
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'AI service unavailable' }),
      });
    });
    await openFirstMeetingEditor(page);
    await openAiAgendaPanel(page);

    const panel = getAgendaPanel(page);
    await panel.locator('button:has-text("生成候选议程")').click();

    await expect(panel.locator('text=AI service unavailable')).toBeVisible();
  });

  test('no JavaScript errors during interaction', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await openFirstMeetingEditor(page);
    await openAiAgendaPanel(page);
    const panel = getAgendaPanel(page);
    await panel.locator('#ai-agenda-theme-input').fill('专题会');
    await panel.locator('button:has-text("生成候选议程")').click();
    await page.waitForTimeout(300);

    expect(errors).toEqual([]);
  });
});
