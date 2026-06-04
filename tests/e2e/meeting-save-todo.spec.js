import { test, expect } from '@playwright/test';

test.describe('Meeting Save TODO', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/meetings.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
  });

  test('saving edited meeting preserves added TODO', async ({ page }) => {
    // 1. Click edit on first meeting card
    const editBtn = page.locator('.meeting-card [data-edit-meeting]').first();
    await editBtn.click();
    await page.waitForTimeout(300);

    // 2. Verify we are on edit page
    await expect(page.locator('text=✏️ 编辑会议')).toBeVisible();

    // 3. Add a TODO item
    const addActionBtn = page.locator('button:has-text("+ 添加行动项")');
    await expect(addActionBtn).toBeVisible();
    await addActionBtn.click();

    // Fill in the action content
    const actionInput = page.locator('#edit-action-list input[placeholder="行动内容"]').first();
    await actionInput.fill('测试行动项内容');

    // 4. Click save
    const saveBtn = page.locator('button:has-text("保存")');
    await saveBtn.click();
    await page.waitForTimeout(500);

    // 5. Should return to meeting list
    await expect(page.locator('h1.page-title:has-text("经营分析会")')).toBeVisible();

    // 6. Re-enter edit for the same meeting and verify TODO is preserved
    const editBtn2 = page.locator('.meeting-card [data-edit-meeting]').first();
    await editBtn2.click();
    await page.waitForTimeout(300);

    await expect(page.locator('text=✏️ 编辑会议')).toBeVisible();
    const savedAction = page.locator('#edit-action-list input[value="测试行动项内容"]');
    await expect(savedAction).toBeVisible();
  });

  test('no JavaScript errors when saving with TODO', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const editBtn = page.locator('.meeting-card [data-edit-meeting]').first();
    await editBtn.click();
    await page.waitForTimeout(300);

    const addActionBtn = page.locator('button:has-text("+ 添加行动项")');
    await addActionBtn.click();

    const actionInput = page.locator('#edit-action-list input[placeholder="行动内容"]').first();
    await actionInput.fill('测试保存');

    await page.locator('button:has-text("保存")').click();
    await page.waitForTimeout(500);

    expect(errors).toEqual([]);
  });
});
