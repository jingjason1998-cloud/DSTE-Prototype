import { test, expect } from '@playwright/test';

/**
 * AI 战略助手 E2E 测试
 * 验证 cockpit.html#ai 页面基础交互与聊天流程。
 */

const MOCK_CHAT_STREAM = [
  'data: {"choices":[{"delta":{"content":"根据"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"当前"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"数据"}}]}\n\n',
  'data: [DONE]\n\n',
].join('');

const MOCK_CHAT_JSON = {
  success: true,
  mock: true,
  choices: [{ message: { role: 'assistant', content: '这是非流式 mock 回复。' } }],
};

async function interceptAiChat(page, mode = 'stream') {
  await page.route('**/api/ai/chat', async (route, request) => {
    if (request.method() !== 'POST') {
      await route.fulfill({ status: 405, body: JSON.stringify({ error: 'Method not allowed' }) });
      return;
    }
    const body = JSON.parse(request.postData() || '{}');
    if (mode === 'stream' || body.stream) {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: MOCK_CHAT_STREAM,
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CHAT_JSON),
      });
    }
  });
}

test.describe('AI 战略助手', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/cockpit.html#ai');
    await page.evaluate(() => {
      localStorage.setItem('meetingReviewerProxyUrl', 'http://localhost:8766');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('页面加载后显示欢迎消息与快捷操作', async ({ page }) => {
    await expect(page.locator('.ai-welcome')).toBeVisible();
    await expect(page.locator('[data-ai-prompt]')).toHaveCount(4);
    await expect(page.locator('#ai-chat-input')).toBeVisible();
    await expect(page.locator('#ai-chat-send')).toBeVisible();
  });

  test('发送消息后显示用户消息与 bot 回复', async ({ page }) => {
    await interceptAiChat(page, 'stream');
    await page.fill('#ai-chat-input', '分析当前季度 KPI 达成情况');
    await page.click('#ai-chat-send');

    await expect(page.locator('.ai-message.user')).toContainText('分析当前季度 KPI 达成情况');
    // 排除欢迎消息，取最后一个 bot 消息
    await expect(page.locator('.ai-message.bot').last()).toBeVisible();
    // 流式输出完成后应包含完整文字
    await expect(page.locator('.ai-message.bot').last().locator('.ai-message-content')).toContainText('根据当前数据', { timeout: 10000 });
  });

  test('快捷操作按钮可以发送预设问题', async ({ page }) => {
    await interceptAiChat(page, 'stream');
    const firstBtn = page.locator('[data-ai-prompt]').first();
    const prompt = await firstBtn.getAttribute('data-ai-prompt');
    await firstBtn.click();

    await expect(page.locator('.ai-message.user')).toContainText(prompt);
    await expect(page.locator('.ai-message.bot').last().locator('.ai-message-content')).toContainText('根据当前数据', { timeout: 10000 });
  });

  test('新建会话会清空聊天区并保留历史会话列表', async ({ page }) => {
    await interceptAiChat(page, 'stream');
    await page.fill('#ai-chat-input', '第一个问题');
    await page.click('#ai-chat-send');
    await expect(page.locator('.ai-message.bot').last().locator('.ai-message-content')).toContainText('根据当前数据', { timeout: 10000 });

    await page.click('#ai-new-session');
    // 刷新后应有两个会话，且聊天区回到欢迎页
    await expect(page.locator('.ai-session-item')).toHaveCount(2);
    await expect(page.locator('.ai-welcome')).toBeVisible();
  });
});
