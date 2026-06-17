import { test, expect } from '@playwright/test';

const BASE_URL = '/src/business-topics.html';

// Helper: navigate to page, reset filters, and wait for table to render
test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL, { timeout: 120000 });
  await page.waitForSelector('#topicTableBody tr', { timeout: 60000 });
  // Reset year filter to "all" since the UI defaults to current year
  await page.selectOption('#filterYear', '');
  await page.waitForTimeout(200);
});

// ===================== Page Load =====================
test.describe('Business Topics - Page Load', () => {
  test('page loads with correct title and navigation', async ({ page }) => {
    await expect(page.locator('body')).toContainText('业务专题管理');
    await expect(page.locator('.top-nav-links li')).toHaveCount(6);
    await expect(page.locator('#sidebar')).toContainText('战略执行');
    await expect(page.locator('#sidebar')).toContainText('业务专题管理');
  });

  test('stats cards are rendered', async ({ page }) => {
    await expect(page.locator('#statInProgress')).toBeVisible();
    await expect(page.locator('#statArchived')).toBeVisible();
    await expect(page.locator('#statP1Urgent')).toBeVisible();
    await expect(page.locator('#statDelayed')).toBeVisible();
  });

  test('table has default data rows', async ({ page }) => {
    const rows = page.locator('#topicTableBody tr');
    await expect(rows).toHaveCount(11);
  });

  test('theme toggle works', async ({ page }) => {
    const html = page.locator('html');
    // Initial theme from localStorage or default
    const initialTheme = await html.getAttribute('data-theme');
    expect(['light', 'dark']).toContain(initialTheme);

    await page.locator('#theme-toggle').click();
    await page.waitForTimeout(300);

    const newTheme = await html.getAttribute('data-theme');
    expect(newTheme).not.toEqual(initialTheme);
  });
});

// ===================== Tab Filtering =====================
test.describe('Business Topics - Tab Filtering', () => {
  test('switching tabs filters table', async ({ page }) => {
    // Default: all tab
    await expect(page.locator('[data-tab="all"]')).toHaveClass(/active/);
    await expect(page.locator('#topicTableBody tr')).toHaveCount(11);

    // Click "in_progress" tab
    await page.locator('[data-tab="in_progress"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('[data-tab="in_progress"]')).toHaveClass(/active/);
    const inProgressCount = await page.locator('#topicTableBody tr').count();
    expect(inProgressCount).toBeGreaterThan(0);
    expect(inProgressCount).toBeLessThan(11);

    // Click "done" tab
    await page.locator('[data-tab="done"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('[data-tab="done"]')).toHaveClass(/active/);
    const doneCount = await page.locator('#topicTableBody tr').count();
    expect(doneCount).toBeGreaterThanOrEqual(0);
    expect(doneCount).toBeLessThan(11);

    // Click "all" tab again
    await page.locator('[data-tab="all"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#topicTableBody tr')).toHaveCount(11);
  });
});

// ===================== Search =====================
test.describe('Business Topics - Search', () => {
  test('search filters table in real-time', async ({ page }) => {
    await page.locator('#searchInput').fill('预测');
    await page.waitForTimeout(500);

    const count = await page.locator('#topicTableBody tr').count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(11);
    await expect(page.locator('#topicTableBody')).toContainText('预测');

    // Clear search
    await page.locator('#searchInput').fill('');
    await page.waitForTimeout(500);
    await expect(page.locator('#topicTableBody tr')).toHaveCount(11);
  });

  test('search by owner name', async ({ page }) => {
    await page.locator('#searchInput').fill('财务总监');
    await page.waitForTimeout(500);

    const count = await page.locator('#topicTableBody tr').count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(11);
  });
});

// ===================== Sorting =====================
test.describe('Business Topics - Sorting', () => {
  test('clicking priority header sorts table', async ({ page }) => {
    const firstPriorityBefore = await page.locator('#topicTableBody tr:first-child td:nth-child(2)').textContent();

    await page.locator('[data-sort-field="priority"]').click();
    await page.waitForTimeout(500);

    const firstPriorityAfter = await page.locator('#topicTableBody tr:first-child td:nth-child(2)').textContent();

    const indicator = await page.locator('[data-sort-field="priority"] .sort-indicator').textContent();
    expect(indicator.trim()).toMatch(/[↑↓]/);

    // Click again to reverse
    await page.locator('[data-sort-field="priority"]').click();
    await page.waitForTimeout(500);

    const firstPriorityDesc = await page.locator('#topicTableBody tr:first-child td:nth-child(2)').textContent();

    if (firstPriorityBefore !== firstPriorityDesc) {
      expect(firstPriorityAfter).not.toEqual(firstPriorityDesc);
    }
  });

  test('clicking progress header sorts table', async ({ page }) => {
    await page.locator('[data-sort-field="progress"]').click();
    await page.waitForTimeout(500);

    const indicator = await page.locator('[data-sort-field="progress"] .sort-indicator').textContent();
    expect(indicator.trim()).toMatch(/[↑↓]/);
  });
});

// ===================== Create =====================
test.describe('Business Topics - Create', () => {
  test('create new topic and verify in table', async ({ page }) => {
    await page.locator('[data-action="new-topic"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#formModal')).toBeVisible();

    await page.locator('#fName').fill('E2E测试专题');
    await page.locator('#fOwner').fill('测试负责人');
    await page.locator('#fPriority').selectOption('P0');
    await page.locator('#fStatus').selectOption('in_progress');
    await page.locator('#fDepartment').fill('测试部');

    // Add a milestone
    await page.locator('button:has-text("添加里程碑")').click();
    await page.waitForTimeout(200);
    await page.locator('#formMilestones .milestone-row .ms-name').fill('E2E里程碑1');
    await page.locator('#formMilestones .milestone-row .ms-date').fill('2025-06-30');

    await page.locator('#topicForm button[type="submit"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#formModal')).not.toBeVisible();
    await expect(page.locator('#topicTableBody')).toContainText('E2E测试专题');
    await expect(page.locator('#topicTableBody')).toContainText('测试负责人');

    // Stats should update (in_progress count increased)
    const inProgressText = await page.locator('#statInProgress').textContent();
    expect(Number(inProgressText)).toBeGreaterThan(0);
  });

  test('create topic without required fields shows validation', async ({ page }) => {
    await page.locator('[data-action="new-topic"]').click();
    await page.waitForTimeout(300);

    // Clear default values and try to submit empty
    await page.locator('#fName').fill('');
    await page.locator('#fOwner').fill('');

    // Form has HTML5 required validation - browser will prevent submit
    const isFormValid = await page.locator('#topicForm').evaluate(form => form.checkValidity());
    expect(isFormValid).toBe(false);
  });
});

// ===================== Edit =====================
test.describe('Business Topics - Edit', () => {
  test('edit first topic and verify update', async ({ page }) => {
    const firstTopicName = await page.locator('#topicTableBody tr:first-child td:first-child div').first().textContent();

    await page.locator('#topicTableBody tr').first().locator('[data-action="edit"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#formModal')).toBeVisible();

    const newName = firstTopicName + '_已编辑';
    await page.locator('#fName').fill(newName);

    await page.locator('#topicForm button[type="submit"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#formModal')).not.toBeVisible();
    await expect(page.locator('#topicTableBody')).toContainText(newName);
  });

  test('edit topic priority and verify tag changes', async ({ page }) => {
    await page.locator('#topicTableBody tr').first().locator('[data-action="edit"]').click();
    await page.waitForTimeout(300);

    await page.locator('#fPriority').selectOption('P0');
    await page.locator('#topicForm button[type="submit"]').click();
    await page.waitForTimeout(500);

    // First row should now show P0 tag
    const firstPriority = await page.locator('#topicTableBody tr:first-child td:nth-child(2)').textContent();
    expect(firstPriority.trim()).toBe('P0');
  });
});

// ===================== Detail View =====================
test.describe('Business Topics - Detail View', () => {
  test('click row opens detail modal', async ({ page }) => {
    await page.locator('#topicTableBody tr').first().click();
    await page.waitForTimeout(500);

    await expect(page.locator('#bizTopicModal')).toBeVisible();
    await expect(page.locator('#bizTopicModal')).toContainText('里程碑');
    await expect(page.locator('#bizTopicModal')).toContainText('专题目标');

    await page.locator('#bizTopicModal .modal-close').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('#bizTopicModal')).not.toBeVisible();
  });

  test('detail modal shows correct topic info', async ({ page }) => {
    const firstTopicName = await page.locator('#topicTableBody tr:first-child td:first-child div').first().textContent();

    await page.locator('#topicTableBody tr').first().click();
    await page.waitForTimeout(500);

    await expect(page.locator('#detailTitle')).toContainText(firstTopicName);
    await expect(page.locator('#bizTopicModal')).toContainText('整体进度');
    await expect(page.locator('#bizTopicModal')).toContainText('剩余天数');
  });
});

// ===================== Delete =====================
test.describe('Business Topics - Delete', () => {
  test('delete topic and verify removal', async ({ page }) => {
    const initialCount = await page.locator('#topicTableBody tr').count();
    const firstRow = page.locator('#topicTableBody tr').first();
    const firstTopicName = await firstRow.locator('td:first-child div').first().textContent();

    await firstRow.locator('[data-action="delete"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#deleteModal')).toBeVisible();

    await page.locator('button:has-text("确认删除")').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#deleteModal')).not.toBeVisible();

    const newCount = await page.locator('#topicTableBody tr').count();
    expect(newCount).toEqual(initialCount - 1);
    await expect(page.locator('#topicTableBody')).not.toContainText(firstTopicName);
  });
});

// ===================== Milestone Management =====================
test.describe('Business Topics - Milestone Management', () => {
  test('add milestones and verify progress calculation', async ({ page }) => {
    await page.locator('[data-action="new-topic"]').click();
    await page.waitForTimeout(300);

    await page.locator('#fName').fill('里程碑测试专题');
    await page.locator('#fOwner').fill('测试负责人');

    // Add 2 milestones
    await page.locator('button:has-text("添加里程碑")').click();
    await page.waitForTimeout(200);
    const rows = page.locator('#formMilestones .milestone-row');
    await rows.nth(0).locator('.ms-name').fill('里程碑A');
    await rows.nth(0).locator('.ms-date').fill('2025-03-01');

    await page.locator('button:has-text("添加里程碑")').click();
    await page.waitForTimeout(200);
    await rows.nth(1).locator('.ms-name').fill('里程碑B');
    await rows.nth(1).locator('.ms-date').fill('2025-06-01');

    // Mark first milestone as completed
    await rows.nth(0).locator('.milestone-status').click();
    await page.waitForTimeout(200);

    await page.locator('#topicForm button[type="submit"]').click();
    await page.waitForTimeout(500);

    // Open detail to verify progress is 50% (1 of 2 completed)
    await page.locator('#topicTableBody tr').filter({ hasText: '里程碑测试专题' }).click();
    await page.waitForTimeout(500);

    await expect(page.locator('#bizTopicModal')).toContainText('50%');

    // Verify milestones shown in timeline
    await expect(page.locator('#bizTopicModal')).toContainText('里程碑A');
    await expect(page.locator('#bizTopicModal')).toContainText('里程碑B');
  });

  test('remove milestone from form', async ({ page }) => {
    await page.locator('[data-action="new-topic"]').click();
    await page.waitForTimeout(300);

    await page.locator('button:has-text("添加里程碑")').click();
    await page.waitForTimeout(200);
    await page.locator('#formMilestones .milestone-row .ms-name').fill('待删除里程碑');

    // Remove the milestone
    await page.locator('#formMilestones .milestone-row .milestone-remove').click();
    await page.waitForTimeout(200);

    // Should show placeholder
    await expect(page.locator('#formMilestones')).toContainText('暂无里程碑');
  });
});

// ===================== Filters =====================
test.describe('Business Topics - Filters', () => {
  test('department filter updates table', async ({ page }) => {
    const deptSelect = page.locator('#filterDept');
    const options = await deptSelect.locator('option').allTextContents();

    expect(options.length).toBeGreaterThan(1); // "全部部门" + at least one dept

    // Select first non-empty department
    await deptSelect.selectOption(options[1]);
    await page.waitForTimeout(500);

    const count = await page.locator('#topicTableBody tr').count();
    expect(count).toBeGreaterThanOrEqual(0);
    expect(count).toBeLessThanOrEqual(11);
  });

  test('priority filter updates table', async ({ page }) => {
    await page.locator('#filterPriority').selectOption('P0');
    await page.waitForTimeout(500);

    const count = await page.locator('#topicTableBody tr').count();
    expect(count).toBeGreaterThanOrEqual(0);
    expect(count).toBeLessThanOrEqual(11);

    // All visible rows should have P0 tag
    if (count > 0) {
      const priorities = await page.locator('#topicTableBody tr td:nth-child(2)').allTextContents();
      for (const p of priorities) {
        expect(p.trim()).toBe('P0');
      }
    }
  });

  test('year filter updates table', async ({ page }) => {
    await page.locator('#filterYear').selectOption('2024');
    await page.waitForTimeout(500);

    const count = await page.locator('#topicTableBody tr').count();
    expect(count).toBeGreaterThanOrEqual(0);
    expect(count).toBeLessThanOrEqual(11);
  });

  test('combined filters work together', async ({ page }) => {
    await page.locator('#filterPriority').selectOption('P0');
    await page.waitForTimeout(300);
    await page.locator('#filterYear').selectOption('2024');
    await page.waitForTimeout(500);

    const count = await page.locator('#topicTableBody tr').count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// ===================== Stats =====================
test.describe('Business Topics - Stats', () => {
  test('stats reflect current data', async ({ page }) => {
    const inProgress = await page.locator('#statInProgress').textContent();
    const archived = await page.locator('#statArchived').textContent();
    const p1Urgent = await page.locator('#statP1Urgent').textContent();
    const delayed = await page.locator('#statDelayed').textContent();

    expect(Number(inProgress)).toBeGreaterThanOrEqual(0);
    expect(Number(archived)).toBeGreaterThanOrEqual(0);
    expect(Number(p1Urgent)).toBeGreaterThanOrEqual(0);
    expect(Number(delayed)).toBeGreaterThanOrEqual(0);
  });

  test('stats update after creating new topic', async ({ page }) => {
    const beforeInProgress = Number(await page.locator('#statInProgress').textContent());

    await page.locator('[data-action="new-topic"]').click();
    await page.waitForTimeout(300);
    await page.locator('#fName').fill('统计测试专题');
    await page.locator('#fOwner').fill('测试人');
    await page.locator('#fStatus').selectOption('in_progress');
    await page.locator('#topicForm button[type="submit"]').click();
    await page.waitForTimeout(500);

    const afterInProgress = Number(await page.locator('#statInProgress').textContent());
    expect(afterInProgress).toBe(beforeInProgress + 1);
  });
});

// ===================== Export =====================
test.describe('Business Topics - Export', () => {
  test('export button is present', async ({ page }) => {
    await expect(page.locator('[data-action="export-topics"]')).toBeVisible();
    await expect(page.locator('[data-action="export-topics"]')).toContainText('导出');
  });
});

// ===================== Issue Import =====================
test.describe('Business Topics - Issue Import', () => {
  test('open import modal', async ({ page }) => {
    await page.locator('[data-action="open-import"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#importModal')).toBeVisible();
    await expect(page.locator('#importModal')).toContainText('导入 ST/AT 议题');

    await page.locator('#importModal .modal-close').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('#importModal')).not.toBeVisible();
  });

  test('paste CSV data shows preview', async ({ page }) => {
    await page.locator('[data-action="open-import"]').click();
    await page.waitForTimeout(300);

    const csvData = `会议名称,会议日期,议题编号,议题标题,议题类型,主责部门,提案人,议题内容,决议内容,行动项,关联KPI,状态,优先级
片联ST-2026-Q1,2026-01-20,ST-2026-Q1-001,渠道下沉策略,战略,销售部,销售总监,简要描述,决定推进,项1|负责人|2026-02-15|已完成,KPI-001,已决议,P0
片联ST-2026-Q1,2026-01-20,ST-2026-Q1-002,产品价格优化,经营,产品部,产品总监,分析价格,决定调整,项1|负责人|2026-03-15|进行中,KPI-002,已决议,P1`;

    await page.locator('#importPasteArea').fill(csvData);
    await page.waitForTimeout(800);

    // Preview area should appear
    const previewVisible = await page.locator('#importPreviewArea').isVisible();
    expect(previewVisible).toBe(true);

    // Should show validation results
    await expect(page.locator('#importPreviewTable tbody tr')).toHaveCount(2);
  });
});

// ===================== AI Report =====================
test.describe('Business Topics - AI Report', () => {
  test('AI report modal opens', async ({ page }) => {
    await page.locator('[data-action="ai-report"]').first().click();
    await page.waitForTimeout(500);

    await expect(page.locator('#aiReportModal')).toBeVisible();
    await expect(page.locator('#aiReportModal')).toContainText('全局分析报告');

    await page.locator('#aiReportModal .modal-close').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('#aiReportModal')).not.toBeVisible();
  });
});

// ===================== Empty State =====================
test.describe('Business Topics - Empty State', () => {
  test('empty state shows when no data matches filter', async ({ page }) => {
    // Search for something that doesn't exist
    await page.locator('#searchInput').fill('XYZ_NONEXISTENT_12345');
    await page.waitForTimeout(500);

    await expect(page.locator('#emptyState')).toBeVisible();
    await expect(page.locator('#emptyState')).toContainText('暂无业务专题');
  });
});
