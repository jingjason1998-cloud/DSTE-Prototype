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

    // Debug: check edit-meeting-id and active overlay
    const debugInfo = await page.evaluate(() => {
      const allIds = document.querySelectorAll('#edit-meeting-id');
      const activeOverlay = document.getElementById('meeting-editor-overlay');
      return {
        idCount: allIds.length,
        firstId: allIds[0]?.value,
        firstIdDisplay: window.getComputedStyle(allIds[0]?.closest('#meeting-editor-overlay, div') || allIds[0]).display,
        overlayDisplay: activeOverlay?.style.display,
        overlayId: activeOverlay?.querySelector('#edit-meeting-id')?.value,
      };
    });
    console.log('Debug after open new:', debugInfo);

    // 填写会议名称
    await page.fill('#meeting-editor-overlay #edit-title', '片联年初季度会议');
    await page.fill('#meeting-editor-overlay #edit-date', '2026-01-15');
    await page.fill('#meeting-editor-overlay #edit-location', '总部大会议室');
    await page.fill('#meeting-editor-overlay #edit-host', '陈总裁');
    await page.fill('#meeting-editor-overlay #edit-recorder', 'Jason.Jing');
    await page.selectOption('#meeting-editor-overlay #edit-scenario', 'union_quarterly');
    await page.selectOption('#meeting-editor-overlay #edit-level', 'L1');
    await page.selectOption('#meeting-editor-overlay #edit-status', 'planned');

    const beforeSave = await page.evaluate(() => {
      const allIds = document.querySelectorAll('#edit-meeting-id');
      return {
        idCount: allIds.length,
        values: Array.from(allIds).map((el, i) => ({ i, value: el.value, display: window.getComputedStyle(el.closest('#meeting-editor-overlay, div') || el).display }))
      };
    });
    console.log('Debug before save:', beforeSave);

    // 点击保存
    const saveBtn = page.locator('#meeting-editor-overlay button[onclick="saveMeeting()"]');
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

  test('auto-fills date from title with Chinese month-day', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/src/meetings.html');
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /新建会议/ }).click();
    await page.waitForSelector('#meeting-editor-overlay', { state: 'visible' });

    // 输入带日期的会议名称，触发防抖自动填充
    await page.fill('#meeting-editor-overlay #edit-title', '华东战区 5月11日经营分析会');
    await page.waitForTimeout(700);

    const expectedYear = new Date().getFullYear();
    const expectedDate = `${expectedYear}-05-11`;
    await expect(page.locator('#meeting-editor-overlay #edit-date')).toHaveValue(expectedDate);

    expect(errors).toEqual([]);
  });
});
