import { test, expect } from '@playwright/test';

test.describe('Meeting Create', () => {
  test('create new meeting with 片联年初季度会议', async ({ page }) => {
    const errors = [];
    const consoleLogs = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));

    await page.goto('/src/meetings.html');
    await page.waitForTimeout(3000);

    // 检查页面内容
    const html = await page.content();
    console.log('page html length:', html.length);
    console.log('page errors:', errors);
    console.log('console logs:', consoleLogs);

    // 等待新建会议按钮
    await page.waitForSelector('button:has-text("新建会议")', { timeout: 15000 });

    // 点击新建会议按钮
    const newBtn = page.getByRole('button', { name: /新建会议/ });
    await expect(newBtn).toBeVisible();
    await newBtn.click();

    // 等待编辑弹窗出现
    await page.waitForSelector('#meeting-editor-overlay', { state: 'visible' });

    // 填写会议名称
    await page.fill('#edit-title', '片联年初季度会议');

    // 填写日期
    await page.fill('#edit-date', '2026-01-15');

    // 填写地点
    await page.fill('#edit-location', '总部大会议室');

    // 填写主持人
    await page.fill('#edit-host', '陈总裁');

    // 填写记录人
    await page.fill('#edit-recorder', 'Jason.Jing');

    // 选择场景
    await page.selectOption('#edit-scenario', 'union_quarterly');

    // 选择层级
    await page.selectOption('#edit-level', 'L1');

    // 选择状态
    await page.selectOption('#edit-status', 'planned');

    // 点击保存
    const saveBtn = page.locator('#meeting-editor-overlay button:has-text("保存")');
    await saveBtn.click();

    // 等待详情弹窗出现（新建成功后自动打开详情）
    await page.waitForSelector('#meeting-detail-overlay', { state: 'visible', timeout: 10000 });

    // 验证详情弹窗中显示会议名称
    await expect(page.locator('#meeting-detail-content')).toContainText('片联年初季度会议');

    // 验证没有 JS 错误
    expect(errors).toEqual([]);

    // 验证 localStorage 中有新会议
    const hasMeeting = await page.evaluate(() => {
      const raw = localStorage.getItem('dste_meetings');
      if (!raw) return false;
      const meetings = JSON.parse(raw);
      return meetings.some(m => m.title === '片联年初季度会议');
    });
    expect(hasMeeting).toBe(true);
  });
});
