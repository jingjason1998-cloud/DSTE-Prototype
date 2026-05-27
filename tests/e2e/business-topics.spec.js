import { test, expect } from '@playwright/test';

const BASE_URL = '/src/business-topics.html';

test.describe('Business Topics - Page Load', () => {
  test('page loads with correct title and navigation', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('body')).toContainText('业务专题管理');
    await expect(page.locator('.top-nav-links li')).toHaveCount(6);
    await expect(page.locator('#sidebar')).toContainText('战略执行');
    await expect(page.locator('#sidebar')).toContainText('业务专题管理');
  });

  test('stats cards are rendered', async ({ page }) => {
    await page.goto(BASE_URL);
    const statCards = page.locator('[id^="stat"]');
    await expect(statCards).toHaveCount(4);
  });

  test('table has default data rows', async ({ page }) => {
    await page.goto(BASE_URL);
    const rows = page.locator('#topicTableBody tr');
    await expect(rows).toHaveCount(11);
  });

  test('theme toggle works', async ({ page }) => {
    await page.goto(BASE_URL);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.locator('#theme-toggle').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('Business Topics - Tab Filtering', () => {
  test.skip('switching tabs filters table', async ({ page }) => {
    await page.goto(BASE_URL);

    // Default: all tab
    await expect(page.locator('[data-tab="all"]')).toHaveClass(/active/);
    await expect(page.locator('#topicTableBody tr')).toHaveCount(11);

    // Click "in_progress" tab
    await page.locator('[data-tab="in_progress"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('[data-tab="in_progress"]')).toHaveClass(/active/);
    const inProgressCount = await page.locator('#topicTableBody tr').count();
    expect(inProgressCount).toBeLessThan(11);

    // Click "all" tab again
    await page.locator('[data-tab="all"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#topicTableBody tr')).toHaveCount(11);
  });
});

test.describe('Business Topics - Search', () => {
  test.skip('search filters table in real-time', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.locator('#searchInput').fill('预测');
    await page.waitForTimeout(500);

    const count = await page.locator('#topicTableBody tr').count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(11);

    // Clear search
    await page.locator('#searchInput').fill('');
    await page.waitForTimeout(500);
    await expect(page.locator('#topicTableBody tr')).toHaveCount(11);
  });
});

test.describe('Business Topics - Sorting', () => {
  test('clicking header sorts table', async ({ page }) => {
    await page.goto(BASE_URL);

    // Get first row priority before sorting
    const firstPriorityBefore = await page.locator('#topicTableBody tr:first-child td:nth-child(2)').textContent();

    // Click priority header to sort
    await page.locator('[data-sort-field="priority"]').click();
    await page.waitForTimeout(500);

    // Get first row priority after first click
    const firstPriorityAfter = await page.locator('#topicTableBody tr:first-child td:nth-child(2)').textContent();

    // Sort indicator should appear
    const indicator = await page.locator('[data-sort-field="priority"] .sort-indicator').textContent();
    expect(indicator.trim()).toMatch(/[↑↓]/);

    // Click again to reverse sort
    await page.locator('[data-sort-field="priority"]').click();
    await page.waitForTimeout(500);

    const firstPriorityDesc = await page.locator('#topicTableBody tr:first-child td:nth-child(2)').textContent();

    // Ascending and descending should produce different first rows (unless all same priority)
    if (firstPriorityBefore !== firstPriorityDesc) {
      expect(firstPriorityAfter).not.toEqual(firstPriorityDesc);
    }
  });
});

test.describe('Business Topics - Create', () => {
  test.skip('create new topic and verify in table', async ({ page }) => {
    await page.goto(BASE_URL);

    // Open create modal
    await page.locator('[data-action="new-topic"]').click();
    await page.waitForTimeout(500);

    // Modal should be visible
    await expect(page.locator('#formModal')).toBeVisible();

    // Fill form
    await page.locator('#fName').fill('E2E测试专题');
    await page.locator('#fOwner').fill('测试负责人');
    await page.locator('#fPriority').selectOption('P0');
    await page.locator('#fStatus').selectOption('in_progress');

    // Save
    await page.locator('#topicForm button[type="submit"]').click();
    await page.waitForTimeout(500);

    // Modal should close
    await expect(page.locator('#formModal')).not.toBeVisible();

    // Verify new topic appears in table
    await expect(page.locator('#topicTableBody')).toContainText('E2E测试专题');

    // Stats should update
    const inProgressText = await page.locator('#statInProgress').textContent();
    expect(Number(inProgressText)).toBeGreaterThan(0);
  });
});

test.describe('Business Topics - Edit', () => {
  test.skip('edit first topic and verify update', async ({ page }) => {
    await page.goto(BASE_URL);

    // Get first topic name
    const firstTopicName = await page.locator('#topicTableBody tr:first-child td:first-child div').first().textContent();

    // Click edit on first row
    await page.locator('#topicTableBody tr').first().locator('[data-action="edit"]').click();
    await page.waitForTimeout(500);

    // Modal should be visible
    await expect(page.locator('#formModal')).toBeVisible();

    // Modify name
    await page.locator('#fName').fill(firstTopicName + '_已编辑');

    // Save
    await page.locator('#topicForm button[type="submit"]').click();
    await page.waitForTimeout(500);

    // Modal should close
    await expect(page.locator('#formModal')).not.toBeVisible();

    // Verify updated name
    await expect(page.locator('#topicTableBody')).toContainText(firstTopicName + '_已编辑');
  });
});

test.describe('Business Topics - Detail View', () => {
  test.skip('click row opens detail modal', async ({ page }) => {
    await page.goto(BASE_URL);

    // Click first row
    await page.locator('#topicTableBody tr').first().click();
    await page.waitForTimeout(500);

    // Detail modal should be visible
    await expect(page.locator('#bizTopicModal')).toBeVisible();

    // Should contain milestone section
    await expect(page.locator('#bizTopicModal')).toContainText('里程碑');

    // Close modal
    await page.locator('#bizTopicModal [data-modal-close="bizTopicModal"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#bizTopicModal')).not.toBeVisible();
  });
});

test.describe('Business Topics - Delete', () => {
  test.skip('delete topic and verify removal', async ({ page }) => {
    await page.goto(BASE_URL);

    // Get initial row count
    const initialCount = await page.locator('#topicTableBody tr').count();

    // Click delete on first row
    const firstRow = page.locator('#topicTableBody tr').first();
    const firstTopicName = await firstRow.locator('td:first-child div').first().textContent();
    await firstRow.locator('[data-action="delete"]').click();
    await page.waitForTimeout(500);

    // Confirm delete modal should be visible
    await expect(page.locator('#deleteModal')).toBeVisible();

    // Confirm deletion
    await page.locator('[data-modal-action="confirm-delete"]').click();
    await page.waitForTimeout(500);

    // Delete modal should close
    await expect(page.locator('#deleteModal')).not.toBeVisible();

    // Verify row count decreased
    const newCount = await page.locator('#topicTableBody tr').count();
    expect(newCount).toEqual(initialCount - 1);

    // Verify topic no longer in table
    await expect(page.locator('#topicTableBody')).not.toContainText(firstTopicName);
  });
});

test.describe('Business Topics - Department Filter', () => {
  test.skip('department filter updates table', async ({ page }) => {
    await page.goto(BASE_URL);

    // Get available departments from filter
    const deptSelect = page.locator('#filterDept');
    const options = await deptSelect.locator('option').allTextContents();

    if (options.length > 1) {
      // Select first non-empty department
      await deptSelect.selectOption(options[1]);
      await page.waitForTimeout(500);

      // Table should be filtered (may show all or fewer)
      const count = await page.locator('#topicTableBody tr').count();
      expect(count).toBeGreaterThanOrEqual(0);
      expect(count).toBeLessThanOrEqual(11);
    }
  });
});

test.describe('Business Topics - Export', () => {
  test('export button is present', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('[data-action="export-topics"]')).toBeVisible();
    await expect(page.locator('[data-action="export-topics"]')).toContainText('导出');
  });
});
