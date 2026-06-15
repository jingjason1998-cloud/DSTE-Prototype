const { test, expect } = require('@playwright/test');

test.fixme('OMP delete leaf KPI works with confirmation', async ({ page }) => {
  const dialogs = [];
  page.on('dialog', async dialog => {
    dialogs.push(dialog.message());
    if (dialog.message().includes('确定要删除')) {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });
  
  await page.goto('/src/cockpit.html#exe/tasks');
  await page.waitForTimeout(2000);
  
  // Switch to KPI tab, tree view
  await page.locator('button[data-tab="kpi"]').first().click();
  await page.waitForTimeout(500);
  
  // Try clicking delete buttons until we find one without children
  const deleteBtns = page.locator('[data-action="omp-delete-kpi"]');
  const count = await deleteBtns.count();
  for (let i = 0; i < count; i++) {
    await deleteBtns.nth(i).click();
    await page.waitForTimeout(300);
    if (dialogs.length > 0 && dialogs[dialogs.length - 1].includes('确定要删除')) {
      break;
    }
    dialogs.length = 0;
  }
  
  expect(dialogs.some(d => d.includes('确定要删除'))).toBe(true);
});

test.fixme('OMP delete task works with confirmation', async ({ page }) => {
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('确定要删除');
    await dialog.accept();
  });
  
  await page.goto('/src/cockpit.html#exe/tasks');
  await page.waitForTimeout(2000);
  
  await page.locator('button[data-tab="tasks"]').first().click();
  await page.waitForTimeout(500);
  
  const deleteBtn = page.locator('[data-action="omp-delete-task"]').first();
  if (await deleteBtn.isVisible()) {
    await deleteBtn.click();
    await page.waitForTimeout(500);
  }
});
