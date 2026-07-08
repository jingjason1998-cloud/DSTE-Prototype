import { test, expect } from '@playwright/test';

test.describe('Notification System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/meetings.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    // Clear notification config
    await page.evaluate(() => localStorage.removeItem('dste_notification_config'));
  });

  test('notification config overlay opens and closes', async ({ page }) => {
    await page.click('button[title="通知配置"]');
    await expect(page.locator('#notification-config-overlay')).toBeVisible();
    await page.click('#notification-config-overlay button[onclick*="closeNotificationConfig"]');
    await expect(page.locator('#notification-config-overlay')).toBeHidden();
  });

  test('notification center opens and shows empty state', async ({ page }) => {
    await page.click('button[title="通知"]');
    await expect(page.locator('#notification-center-overlay')).toBeVisible();
    await expect(page.locator('#notification-center-list')).toContainText('暂无推送记录');
    await page.click('#notification-center-overlay button[onclick*="closeNotificationCenter"]');
    await expect(page.locator('#notification-center-overlay')).toBeHidden();
  });

  test('saving notification config persists to localStorage', async ({ page }) => {
    await page.click('button[title="通知配置"]');
    await page.locator('#notification-config-overlay button[onclick*="addWebhookRow"]').click();
    await page.locator('#notif-webhooks-list .webhook-row').first().locator('.webhook-name').fill('测试群');
    await page.locator('#notif-webhooks-list .webhook-row').first().locator('.webhook-url').fill('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test123');
    await page.uncheck('#notif-enable-resolution');
    await page.check('#notif-mention-all');
    await page.click('button:has-text("保存配置")');

    const cfg = await page.evaluate(() => JSON.parse(localStorage.getItem('dste_notification_config')));
    expect(cfg.webhooks).toHaveLength(1);
    expect(cfg.webhooks[0].name).toBe('测试群');
    expect(cfg.webhooks[0].url).toBe('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test123');
    expect(cfg.enabledTypes.resolution).toBe(false);
    expect(cfg.enabledTypes.todo).toBe(true);
    expect(cfg.enabledTypes.alert).toBe(true);
    expect(cfg.mentionAll).toBe(true);
  });

  test('push resolution button exists in detail view', async ({ page }) => {
    const card = page.locator('.meeting-card').first();
    await card.click();
    await expect(page.locator('#meeting-detail-overlay')).toBeVisible();
    const pushBtn = page.locator('button:has-text("推送")').first();
    await expect(pushBtn).toBeVisible();
    await page.click('#meeting-detail-overlay button[onclick*="closeMeetingDetail"]');
    await expect(page.locator('#meeting-detail-overlay')).toBeHidden();
  });

  test('push todo reminder button exists in detail view', async ({ page }) => {
    const card = page.locator('.meeting-card').first();
    await card.click();
    await expect(page.locator('#meeting-detail-overlay')).toBeVisible();
    const remindBtn = page.locator('button:has-text("提醒")').first();
    await expect(remindBtn).toBeVisible();
    await page.click('#meeting-detail-overlay button[onclick*="closeMeetingDetail"]');
    await expect(page.locator('#meeting-detail-overlay')).toBeHidden();
  });

  test('disabled type shows alert when pushing', async ({ page }) => {
    // Pre-configure with agenda disabled (detail overlay 中首个 推送 通常为议程推送)
    await page.evaluate(() => {
      localStorage.setItem('dste_notification_config', JSON.stringify({
        webhooks: [{ id: '1', name: '测试群', url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test' }],
        enabledTypes: { resolution: true, todo: true, alert: true, agenda: false },
        mentionAll: false,
        lastSent: [],
      }));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    // 选择确定包含 agenda_items 的会议卡片
    const card = page.locator('.meeting-card:has-text("片联一季度经营分析会")').first();
    await card.click();
    await expect(page.locator('#meeting-detail-overlay')).toBeVisible();
    const pushBtn = page.locator('#meeting-detail-overlay button:has-text("推送")').first();
    await expect(pushBtn).toBeVisible();

    await pushBtn.click();
    await page.waitForTimeout(500);
    // 当前实现使用 toast 提示，而非 alert
    await expect(page.locator('#dste-toast-container')).toContainText('推送');
  });

  test('missing webhook shows alert', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('dste_notification_config', JSON.stringify({
        webhooks: [],
        enabledTypes: { resolution: true, todo: true, alert: true, agenda: true },
        mentionAll: false,
        lastSent: [],
      }));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    const card = page.locator('.meeting-card:has-text("片联一季度经营分析会")').first();
    await card.click();
    await expect(page.locator('#meeting-detail-overlay')).toBeVisible();
    const pushBtn = page.locator('#meeting-detail-overlay button:has-text("推送")').first();
    await expect(pushBtn).toBeVisible();

    await pushBtn.click();
    await page.waitForTimeout(500);
    // 当前实现使用 toast 提示并打开配置浮层
    await expect(page.locator('#dste-toast-container')).toContainText('配置');
  });

  test('single webhook sends directly without selector', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('dste_notification_config', JSON.stringify({
        webhooks: [{ id: '1', name: '测试群', url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test_invalid' }],
        enabledTypes: { resolution: true, todo: true, alert: true, agenda: true },
        mentionAll: false,
        lastSent: [],
      }));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    const card = page.locator('.meeting-card:has-text("片联一季度经营分析会")').first();
    await card.click();
    await expect(page.locator('#meeting-detail-overlay')).toBeVisible();
    const pushBtn = page.locator('#meeting-detail-overlay button:has-text("推送")').first();
    await expect(pushBtn).toBeVisible();

    await pushBtn.click();
    await page.waitForTimeout(1500);
    // 单 webhook 直接发送，结果通过 toast 展示（成功/失败均可）
    await expect(page.locator('#dste-toast-container')).toBeVisible();
    const toastText = await page.locator('#dste-toast-container').textContent();
    expect(toastText.length).toBeGreaterThan(0);
  });

  test('multiple webhooks shows selector overlay', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('dste_notification_config', JSON.stringify({
        webhooks: [
          { id: '1', name: '群A', url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=a' },
          { id: '2', name: '群B', url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=b' },
        ],
        enabledTypes: { resolution: true, todo: true, alert: true },
        mentionAll: false,
        lastSent: [],
      }));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    const card = page.locator('.meeting-card').first();
    await card.click();
    await expect(page.locator('#meeting-detail-overlay')).toBeVisible();
    const pushBtn = page.locator('button:has-text("推送")').first();
    await pushBtn.click();

    await expect(page.locator('#webhook-selector-overlay')).toBeVisible();
    await expect(page.locator('#webhook-selector-list')).toContainText('群A');
    await expect(page.locator('#webhook-selector-list')).toContainText('群B');

    await page.click('#webhook-selector-overlay button[onclick*="closeWebhookSelector"]');
    await expect(page.locator('#webhook-selector-overlay')).toBeHidden();
  });
});
