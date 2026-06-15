import { test, expect } from '@playwright/test';

test.describe('Meeting clone', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/meetings.html');
  });

  test('can clone a meeting from list card', async ({ page }) => {
    // 找到第一个会议卡片的复制按钮并点击
    const cloneBtn = page.locator('[data-clone-meeting]').first();
    await expect(cloneBtn).toBeVisible();
    await cloneBtn.click();

    // 验证编辑表单弹出
    const overlay = page.locator('#meeting-editor-overlay');
    await expect(overlay).toBeVisible();

    // 验证标题含"复制"后缀
    const titleInput = page.locator('#edit-title');
    await expect(titleInput).toHaveValue(/（复制）$/);

    // 验证日期为今天
    const today = new Date().toISOString().split('T')[0];
    const dateInput = page.locator('#edit-date');
    await expect(dateInput).toHaveValue(today);

    // 验证状态为规划中
    const statusSelect = page.locator('#edit-status');
    await expect(statusSelect).toHaveValue('planned');

    // 验证议程项存在（复制保留了议程结构）
    const agendaList = page.locator('#edit-agenda-list');
    await expect(agendaList).not.toBeEmpty();

    // 验证行动项为空（复制清空了行动项，但会显示空状态提示）
    const actionList = page.locator('#edit-action-list');
    await expect(actionList).toContainText('暂无行动项');

    // 验证决议为空（复制清空了决议，但会显示空状态提示）
    const decisionList = page.locator('#edit-decision-list');
    await expect(decisionList).toContainText('暂无决议');
  });

  test('cloned meeting can be saved as new', async ({ page }) => {
    // 点击第一个卡片的复制按钮
    await page.locator('[data-clone-meeting]').first().click();

    // 修改标题为新名称
    const newTitle = '复制会议测试-' + Date.now();
    await page.locator('#edit-title').fill(newTitle);

    // 保存
    await page.locator('#meeting-editor-overlay button[onclick="saveMeeting()"]').click();

    // 验证进入详情页且标题正确
    const detailOverlay = page.locator('#meeting-detail-overlay');
    await expect(detailOverlay).toBeVisible();
    await expect(page.locator('#meeting-detail-overlay')).toContainText(newTitle);
  });
});
