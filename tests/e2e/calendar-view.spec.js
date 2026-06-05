import { test, expect } from '@playwright/test';

test('calendar view replaces only meeting list panel', async ({ page }) => {
  await page.goto('/src/meetings.html');
  await page.waitForLoadState('networkidle');

  // Click calendar view toggle
  const btn = page.locator('#btn-toggle-view');
  await btn.click();
  await page.waitForTimeout(100);

  // Calendar panel should be visible
  const calPanel = page.locator('#meetings-calendar-panel');
  await expect(calPanel).toBeVisible();

  // Meeting list panel should be hidden
  const listPanel = page.locator('#meetings-list-panel');
  await expect(listPanel).not.toBeVisible();

  // Right sidebar modules should still be visible
  await expect(page.locator('text=📊 执行概览').first()).toBeVisible();
  await expect(page.locator('text=📈 决议执行趋势').first()).toBeVisible();
  await expect(page.locator('text=🔔 待办提醒').first()).toBeVisible();

  // KPI bar should still be visible
  await expect(page.locator('text=本年会议').first()).toBeVisible();

  // Filter bar should still be visible
  await expect(page.locator('#filter-month')).toBeVisible();

  // Minutes section should still be visible
  await expect(page.locator('text=📄 会议纪要').first()).toBeVisible();

  // Decision tracking section should still be visible
  await expect(page.locator('text=✅ 决议跟踪').first()).toBeVisible();
});

test('toggle back to list view restores meeting list', async ({ page }) => {
  await page.goto('/src/meetings.html');
  await page.waitForLoadState('networkidle');

  // Switch to calendar
  const btn = page.locator('#btn-toggle-view');
  await btn.click();
  await page.waitForTimeout(100);

  // Switch back to list
  await btn.click();
  await page.waitForTimeout(100);

  // Meeting list should be visible again
  const listPanel = page.locator('#meetings-list-panel');
  await expect(listPanel).toBeVisible();

  // Calendar panel should be hidden
  const calPanel = page.locator('#meetings-calendar-panel');
  await expect(calPanel).not.toBeVisible();
});

test('calendar panel has card styling', async ({ page }) => {
  await page.goto('/src/meetings.html');
  await page.waitForLoadState('networkidle');

  const btn = page.locator('#btn-toggle-view');
  await btn.click();
  await page.waitForTimeout(100);

  const calPanel = page.locator('#meetings-calendar-panel');
  const className = await calPanel.evaluate(el => el.className);
  expect(className).toContain('card');
});

test('calendar meeting items show status dot and location', async ({ page }) => {
  await page.goto('/src/meetings.html');
  await page.waitForLoadState('networkidle');

  const btn = page.locator('#btn-toggle-view');
  await btn.click();
  await page.waitForTimeout(200);

  // Calendar grid should have meeting items with status indicator
  const calendarBody = page.locator('#calendar-body');
  await expect(calendarBody).toBeVisible();

  // Meeting items in grid should have a status dot (colored circle)
  const meetingItems = calendarBody.locator('[data-calendar-meeting]');
  const count = await meetingItems.count();
  expect(count).toBeGreaterThan(0);

  // First item should have a status dot
  const firstItem = meetingItems.first();
  const hasDot = await firstItem.evaluate(el => el.querySelector('[data-status-dot]') !== null);
  expect(hasDot).toBe(true);
});

test('calendar footer list shows host and location', async ({ page }) => {
  await page.goto('/src/meetings.html');
  await page.waitForLoadState('networkidle');

  const btn = page.locator('#btn-toggle-view');
  await btn.click();
  await page.waitForTimeout(200);

  // Footer should show meeting list with host info
  const footer = page.locator('#calendar-footer');
  await expect(footer).toBeVisible();

  // Should contain host or location info in the meeting list items
  const footerText = await footer.textContent();
  expect(footerText).toContain('片联');
});

test('hovering meeting item shows tooltip with details', async ({ page }) => {
  await page.goto('/src/meetings.html');
  await page.waitForLoadState('networkidle');

  const btn = page.locator('#btn-toggle-view');
  await btn.click();
  await page.waitForTimeout(200);

  // Find a meeting item in the calendar grid
  const meetingItem = page.locator('[data-calendar-meeting]').first();
  await expect(meetingItem).toBeVisible();

  // Hover over the meeting item
  await meetingItem.hover();
  await page.waitForTimeout(100);

  // Tooltip should appear with meeting details
  const tooltip = meetingItem.locator('.meeting-tooltip');
  await expect(tooltip).toBeVisible();

  // Tooltip should contain the meeting title
  const tooltipText = await tooltip.textContent();
  expect(tooltipText.length).toBeGreaterThan(0);
});

test('year view shows month meeting counts', async ({ page }) => {
  await page.goto('/src/meetings.html');
  await page.waitForLoadState('networkidle');

  // Switch to calendar
  const btn = page.locator('#btn-toggle-view');
  await btn.click();
  await page.waitForTimeout(200);

  // Switch to year view
  const yearBtn = page.locator('button:has-text("年视图")');
  await yearBtn.click();
  await page.waitForTimeout(200);

  // Year view should show month cards with meeting count
  const calendarBody = page.locator('#calendar-body');
  const bodyText = await calendarBody.textContent();
  // Should contain "N 场" (meeting count indicator with space)
  expect(bodyText).toMatch(/\d+\s*场/);
});

test('agenda types use new 6-category system', async ({ page }) => {
  await page.goto('/src/meetings.html');
  await page.waitForLoadState('networkidle');

  // Check page source contains new agenda type labels
  const content = await page.content();
  expect(content).toContain('目标管理');
  expect(content).toContain('重点工作管理');
  expect(content).toContain('预算与财经');
  expect(content).toContain('人力资源');
  expect(content).toContain('业务专项');
  expect(content).toContain('其他');
});
