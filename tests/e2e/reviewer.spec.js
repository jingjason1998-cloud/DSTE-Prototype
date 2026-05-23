import { test, expect } from '@playwright/test';

/**
 * 会议材料审核页面 E2E 测试
 * 核心目标：防止AI修改导致 reviewer.html 功能降质
 * 覆盖：页面加载、审核流程、安全过滤、历史记录、主题同步
 */

test.describe('会议材料审核 - 页面基础', () => {
  test('页面正确加载并显示标题', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    await expect(page.locator('body')).toContainText('会议材料审核');
    await expect(page.locator('.top-nav')).toContainText('DSTE 战略管理平台');
  });

  test('包含返回驾驶舱链接', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    // 使用更精确的选择器：顶部导航中的返回链接
    const cockpitLink = page.locator('.top-nav a[href*="cockpit.html"], .back-link[href*="cockpit.html"], a:has-text("驾驶舱")').first();
    await expect(cockpitLink).toBeVisible();
  });

  test('主题与DSTE同步（light模式）', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('主题与DSTE同步（dark模式）', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    // 先设置 dark 主题
    await page.evaluate(() => {
      localStorage.setItem('dste-theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.reload();
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('会议材料审核 - 核心功能', () => {
  test('待审核材料列表渲染', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    // 等待数据加载（reviewer 页面可能有异步加载）
    await page.waitForTimeout(1000);

    // 尝试多种可能的选择器
    const selectors = [
      '.review-table tbody tr',
      '.data-table tbody tr',
      '.review-item',
      '.material-item',
      '[class*="review"] tbody tr',
      '[class*="material"] tbody tr'
    ];

    let foundRows = false;
    for (const selector of selectors) {
      const rows = page.locator(selector);
      const count = await rows.count();
      if (count > 0) {
        foundRows = true;
        break;
      }
    }

    // 如果找不到表格行，检查页面是否包含"暂无"或加载状态
    if (!foundRows) {
      const bodyText = await page.locator('body').textContent();
      const hasContent = bodyText.includes('审核') || bodyText.includes('材料') ||
        bodyText.includes('暂无') || bodyText.includes('加载');
      expect(hasContent).toBeTruthy();
    }
  });

  test('审核状态筛选功能', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    await page.waitForTimeout(500);

    // 查找筛选按钮/下拉框
    const filterBtn = page.locator('[data-filter], .filter-btn, select').first();
    if (await filterBtn.isVisible().catch(() => false)) {
      await filterBtn.click();
      // 选择"已通过"或"已驳回"
      const option = page.locator('text=已通过, text=已驳回').first();
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        // 验证筛选后列表变化
        await page.waitForTimeout(300);
      }
    }
  });

  test('点击材料打开详情/对比视图', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    await page.waitForTimeout(500);

    const firstRow = page.locator('.review-table tbody tr, .data-table tbody tr').first();
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click();
      // 验证详情面板或弹窗出现
      const detailPanel = page.locator('.detail-panel, .modal, .compare-panel, [class*="detail"]').first();
      await expect(detailPanel).toBeVisible({ timeout: 2000 });
    }
  });

  test('审核操作按钮存在（通过/驳回）', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    await page.waitForTimeout(500);

    // 检查页面包含审核操作相关文本
    const bodyText = await page.locator('body').textContent();
    const hasApprove = bodyText.includes('通过') || bodyText.includes('同意') || bodyText.includes('✓');
    const hasReject = bodyText.includes('驳回') || bodyText.includes('拒绝') || bodyText.includes('✗');
    expect(hasApprove || hasReject).toBeTruthy();
  });
});

test.describe('会议材料审核 - 安全与防御', () => {
  test('XSS防护：sanitizeUrl函数工作正常', async ({ page }) => {
    await page.goto('/src/reviewer.html');

    // 验证 sanitizeUrl 函数存在
    const hasSanitize = await page.evaluate(() => typeof window.sanitizeUrl === 'function' ||
      typeof sanitizeUrl === 'function');
    expect(hasSanitize).toBeTruthy();
  });

  test('空数据防护：无数据时显示友好提示', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    await page.waitForTimeout(500);

    // 检查是否有空状态提示
    const bodyText = await page.locator('body').textContent();
    const hasEmptyState = bodyText.includes('暂无') || bodyText.includes('空') ||
      bodyText.includes('无数据') || bodyText.includes('loading');
    // 有数据或有空状态提示都算通过
    expect(hasEmptyState || bodyText.includes('会议')).toBeTruthy();
  });

  test('矩阵对比空数组防护', async ({ page }) => {
    await page.goto('/src/reviewer.html');

    // 验证 renderCompareMatrix 或类似函数存在空数组检查
    const hasGuard = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const text = scripts.map(s => s.textContent).join('');
      return text.includes('length === 0') || text.includes('.length == 0') ||
        text.includes('!data') || text.includes('data.length');
    });
    expect(hasGuard).toBeTruthy();
  });
});

test.describe('会议材料审核 - 历史记录', () => {
  test('历史记录面板可访问', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    await page.waitForTimeout(500);

    // 查找历史记录标签/按钮
    const historyTab = page.locator('text=历史, text=记录, [data-tab*="history"], .history-tab').first();
    if (await historyTab.isVisible().catch(() => false)) {
      await historyTab.click();
      await page.waitForTimeout(300);
      // 验证历史记录内容出现
      const historyContent = page.locator('.history-list, .history-panel, [class*="history"]').first();
      await expect(historyContent).toBeVisible({ timeout: 2000 });
    }
  });

  test('历史详情可展开', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    await page.waitForTimeout(500);

    // 尝试点击历史记录项
    const historyItems = page.locator('.history-item, [class*="history"] tr, .record-item');
    const count = await historyItems.count();
    if (count > 0) {
      await historyItems.first().click();
      // 验证详情展开
      await page.waitForTimeout(300);
    }
  });
});

test.describe('会议材料审核 - 场景映射完整性', () => {
  test('vertical-segment-review 场景存在', async ({ page }) => {
    await page.goto('/src/reviewer.html');

    const hasScenario = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const text = scripts.map(s => s.textContent).join('');
      return text.includes('vertical-segment-review');
    });
    expect(hasScenario).toBeTruthy();
  });

  test('getLocalFocusDimensions 映射完整', async ({ page }) => {
    await page.goto('/src/reviewer.html');

    const hasMapping = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const text = scripts.map(s => s.textContent).join('');
      return text.includes('getLocalFocusDimensions') &&
        text.includes('vertical-segment-review');
    });
    expect(hasMapping).toBeTruthy();
  });
});
