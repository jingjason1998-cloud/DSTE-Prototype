import { test, expect } from '@playwright/test';

/**
 * 战略专题管理 — KMS 内容 AI 问答 E2E 测试
 */

const STRATEGY_TOPICS_URL = '/src/cockpit.html#sp/strategy-topics';

const MOCK_KMS_PAGE_RESULT = {
  success: true,
  result: {
    success: true,
    pageId: '1333002613',
    title: '帆软大客户拓展工作的三年业务规划',
    url: 'https://kms.fineres.com/pages/viewpage.action?pageId=1333002613',
    version: 1,
    text: '一、战略目标\n\n未来三年聚焦 Top20 大客户，建立铁三角作战机制，打造标杆客户并沉淀方法论。\n\n二、关键举措\n\n1. 大客户分层标准：按收入贡献与战略价值将客户分为 S/A/B 三级。\n2. 铁三角机制：销售、解决方案、交付组成虚拟团队，按季度复盘。\n3. 标杆案例库：每年打造 5 个行业标杆并沉淀案例。',
    charCount: 156,
    truncated: false,
    cached: false,
  },
};

const MOCK_CHAT_STREAM = [
  'data: {"choices":[{"delta":{"content":"根据"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"KMS"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"页面"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"，"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"核心"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"结论"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"是"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"聚焦大客户。"}}]}\n\n',
  'data: [DONE]\n\n',
].join('');

async function interceptAiTools(page) {
  await page.route('**/api/ai/tools/execute', async (route, request) => {
    if (request.method() !== 'POST') {
      await route.fulfill({ status: 405, body: JSON.stringify({ error: 'Method not allowed' }) });
      return;
    }
    const body = JSON.parse(request.postData() || '{}');
    if (body.name === 'getKmsPage') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_KMS_PAGE_RESULT),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'Tool not mocked' }),
    });
  });
}

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

test.describe('战略专题 KMS AI 问答', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STRATEGY_TOPICS_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      localStorage.setItem('meetingReviewerProxyUrl', 'http://localhost:8766');
    });
    await interceptAiTools(page);
    await interceptAiChat(page);
  });

  test('有 KMS 链接的专题详情显示 AI 问答按钮，打开后可对话', async ({ page }) => {
    // 点击「帆软大客户拓展工作的三年业务规划」的查看按钮
    const viewBtn = page.locator('tr[data-topic-id]:has-text("帆软大客户拓展工作的三年业务规划") .view-topic-btn').first();
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();

    const detailOverlay = page.locator('#topic-detail-overlay');
    await expect(detailOverlay).toBeVisible();

    const aiChatBtn = detailOverlay.locator('button:has-text("AI 问答")');
    await expect(aiChatBtn).toBeVisible();
    await aiChatBtn.click();

    const chatOverlay = page.locator('#topic-ai-chat-overlay');
    await expect(chatOverlay).toBeVisible();

    // 等待 KMS 提取完成
    await expect(chatOverlay.locator('#topic-ai-status')).toContainText('已加载 KMS 页面');
    await expect(chatOverlay.locator('#topic-ai-status')).toContainText('帆软大客户拓展工作的三年业务规划');

    // 输入问题并发送
    const input = chatOverlay.locator('#topic-ai-chat-input');
    await input.fill('这个专题的核心结论是什么？');
    await chatOverlay.locator('#topic-ai-chat-send').click();

    // 等待流式回答渲染
    await expect(chatOverlay.locator('#topic-ai-chat-area')).toContainText('根据KMS页面，核心结论是聚焦大客户。', { timeout: 5000 });
  });

  test('无 KMS 链接的专题详情不显示 AI 问答按钮', async ({ page }) => {
    const viewBtn = page.locator('tr[data-topic-id]:has-text("海外市场拓展战略研究") .view-topic-btn').first();
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();

    const detailOverlay = page.locator('#topic-detail-overlay');
    await expect(detailOverlay).toBeVisible();
    await expect(detailOverlay.locator('button:has-text("AI 问答")')).not.toBeVisible();
  });

  test('快捷问题芯片可直接发送问题', async ({ page }) => {
    const viewBtn = page.locator('tr[data-topic-id]:has-text("帆软大客户拓展工作的三年业务规划") .view-topic-btn').first();
    await viewBtn.click();
    await page.locator('#topic-detail-overlay button:has-text("AI 问答")').click();

    const chatOverlay = page.locator('#topic-ai-chat-overlay');
    await expect(chatOverlay.locator('#topic-ai-status')).toContainText('已加载 KMS 页面');

    await chatOverlay.locator('[data-ai-topic-prompt="这个专题的核心结论是什么？"]').click();
    await expect(chatOverlay.locator('#topic-ai-chat-area')).toContainText('根据KMS页面，核心结论是聚焦大客户。', { timeout: 5000 });
  });
});
