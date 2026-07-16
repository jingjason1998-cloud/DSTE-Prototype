import { test, expect } from '@playwright/test';

/**
 * AI 战略助手 E2E 测试（右侧抽屉形态）
 * 验证全局 AI 抽屉从顶部导航打开、识别当前页面、发送消息与新建会话。
 */

const MOCK_CHAT_STREAM = [
  'data: {"choices":[{"delta":{"content":"根据"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"当前"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"数据"}}]}\n\n',
  'data: [DONE]\n\n',
].join('');

async function interceptAiChat(page) {
  await page.route('**/api/ai/chat', async (route, request) => {
    if (request.method() !== 'POST') {
      await route.fulfill({ status: 405, body: JSON.stringify({ error: 'Method not allowed' }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: MOCK_CHAT_STREAM,
    });
  });
}

async function openAiDrawer(page) {
  await page.locator('.top-nav-drawer-toggle[data-phase="ai"]').click();
  await expect(page.locator('#global-ai-drawer')).toBeVisible();
}

test.describe('AI 战略助手', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.evaluate(() => {
      localStorage.setItem('meetingReviewerProxyUrl', 'http://localhost:8766');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('点击顶部 AI 按钮打开右侧抽屉，显示欢迎消息与快捷操作', async ({ page }) => {
    await openAiDrawer(page);
    await expect(page.locator('.global-ai-welcome')).toBeVisible();
    await expect(page.locator('#global-ai-quick [data-ai-prompt]')).toHaveCount(4);
    await expect(page.locator('#global-ai-input')).toBeVisible();
    await expect(page.locator('#global-ai-send')).toBeVisible();
  });

  test('发送消息后显示用户消息与 bot 回复', async ({ page }) => {
    await interceptAiChat(page);
    await openAiDrawer(page);
    await page.fill('#global-ai-input', '分析当前季度 KPI 达成情况');
    await page.click('#global-ai-send');

    await expect(page.locator('.global-ai-message.user')).toContainText('分析当前季度 KPI 达成情况');
    await expect(page.locator('.global-ai-message.assistant').last()).toBeVisible();
    await expect(page.locator('.global-ai-message.assistant').last().locator('.global-ai-content')).toContainText('根据当前数据', { timeout: 10000 });
  });

  test('快捷操作按钮可以发送预设问题', async ({ page }) => {
    await interceptAiChat(page);
    await openAiDrawer(page);
    const firstBtn = page.locator('#global-ai-quick [data-ai-prompt]').first();
    const prompt = await firstBtn.getAttribute('data-ai-prompt');
    await firstBtn.click();

    await expect(page.locator('.global-ai-message.user')).toContainText(prompt);
    await expect(page.locator('.global-ai-message.assistant').last().locator('.global-ai-content')).toContainText('根据当前数据', { timeout: 10000 });
  });

  test('新建会话会清空聊天区并保留历史会话列表', async ({ page }) => {
    await interceptAiChat(page);
    await openAiDrawer(page);
    await page.fill('#global-ai-input', '第一个问题');
    await page.click('#global-ai-send');
    await expect(page.locator('.global-ai-message.assistant').last().locator('.global-ai-content')).toContainText('根据当前数据', { timeout: 10000 });

    await page.click('#global-ai-new-session');
    await expect(page.locator('.global-ai-welcome')).toBeVisible();
    // 会话下拉框应至少包含 2 个 option（当前空会话 + 刚才的会话）
    await expect(page.locator('#global-ai-session-select option')).toHaveCount(2);
  });

  test('抽屉能识别当前页面并展示上下文 chip', async ({ page }) => {
    await page.goto('/src/cockpit.html#sp/strategy-topics');
    await page.waitForLoadState('networkidle');
    await openAiDrawer(page);
    await expect(page.locator('#global-ai-context-chip')).toContainText('战略专题管理');
  });

  test('再次点击 AI 按钮关闭抽屉', async ({ page }) => {
    await openAiDrawer(page);
    await page.locator('.top-nav-drawer-toggle[data-phase="ai"]').click();
    await expect(page.locator('body')).not.toHaveClass(/ai-drawer-open/);
  });
});
