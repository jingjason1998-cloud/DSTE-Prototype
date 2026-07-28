import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Workspace Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.evaluate(() => localStorage.removeItem('dste-workspace-tabs-v1'));
  });

  test('can open external pages from different phases in separate tabs', async ({ page }) => {
    await page.goto('/src/cockpit.html');

    // 打开战略规划 - 战略地图（外部页 iframe）
    await page.locator('.top-nav-item[data-phase="sp"]').click();
    await expect(page).toHaveURL(/cockpit\.html#sp\/strategy-map/);
    await expect(page.locator('.workspace-iframe')).toHaveAttribute('src', /strategy-map-list\.html\?embed=1/);

    // 打开战略执行阶段（默认内部页），再从侧边栏打开经营分析会外部页
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    await expect(page).toHaveURL(/cockpit\.html#exe\/tasks/);
    await page.locator('.sidebar-item[data-page="exe/meetings"]').click();
    await expect(page).toHaveURL(/cockpit\.html#exe\/meetings/);
    await expect(page.locator('.workspace-iframe')).toHaveAttribute('src', /meetings\.html\?embed=1/);

    // 应存在 3 个标签：驾驶舱、战略地图、经营分析会
    await expect(page.locator('#page-tabs .tab')).toHaveCount(3);
  });

  test('switching tabs restores the correct external page iframe', async ({ page }) => {
    await page.goto('/src/cockpit.html');

    await page.locator('.top-nav-item[data-phase="sp"]').click();
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    await page.locator('.sidebar-item[data-page="exe/meetings"]').click();
    await expect(page.locator('#page-tabs .tab')).toHaveCount(3);

    // 切换回战略地图标签
    const tabs = page.locator('#page-tabs .tab');
    await tabs.filter({ hasText: '战略地图' }).click();
    await expect(page).toHaveURL(/cockpit\.html#sp\/strategy-map/);
    await expect(page.locator('.workspace-iframe')).toHaveAttribute('src', /strategy-map-list\.html\?embed=1/);

    // 切换到经营分析会标签
    await tabs.filter({ hasText: '经营分析会' }).click();
    await expect(page).toHaveURL(/cockpit\.html#exe\/meetings/);
    await expect(page.locator('.workspace-iframe')).toHaveAttribute('src', /meetings\.html\?embed=1/);
  });

  test('external page tabs persist after refresh', async ({ page }) => {
    await page.goto('/src/cockpit.html');

    await page.locator('.top-nav-item[data-phase="sp"]').click();
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    await page.locator('.sidebar-item[data-page="exe/meetings"]').click();
    await expect(page.locator('#page-tabs .tab')).toHaveCount(3);

    await page.reload();
    await expect(page.locator('#page-tabs .tab')).toHaveCount(3);
    await expect(page.locator('#page-tabs .tab.active .tab-title')).toContainText('经营分析会');
    await expect(page.locator('.workspace-iframe')).toHaveAttribute('src', /meetings\.html\?embed=1/);
  });

  test('closing external tab switches to previous tab', async ({ page }) => {
    await page.goto('/src/cockpit.html');

    await page.locator('.top-nav-item[data-phase="sp"]').click();
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    await page.locator('.sidebar-item[data-page="exe/meetings"]').click();
    await expect(page.locator('#page-tabs .tab')).toHaveCount(3);

    // 关闭当前经营分析会标签
    const activeTab = page.locator('#page-tabs .tab.active');
    await activeTab.locator('.tab-close').click();

    await expect(page.locator('#page-tabs .tab')).toHaveCount(2);
    await expect(page.locator('#page-tabs .tab.active .tab-title')).toContainText('战略地图');
    await expect(page.locator('.workspace-iframe')).toHaveAttribute('src', /strategy-map-list\.html\?embed=1/);
  });

  test('navigating to a page already open in another tab activates it instead of duplicating', async ({ page }) => {
    await page.goto('/src/cockpit.html');

    // 在当前（驾驶舱）标签内打开开发路线图，标签被复用为路线图
    await page.locator('.sidebar-item[data-page="dashboard/roadmap"]').click();
    await expect(page).toHaveURL(/cockpit\.html#dashboard\/roadmap/);
    await expect(page.locator('#page-tabs .tab')).toHaveCount(1);

    // 打开战略地图（新标签）
    await page.locator('.top-nav-item[data-phase="sp"]').click();
    await expect(page.locator('#page-tabs .tab')).toHaveCount(2);

    // 重新打开一个驾驶舱标签
    await page.locator('.top-nav-item[data-phase="dashboard"]').click();
    await expect(page.locator('#page-tabs .tab')).toHaveCount(3);

    // 在驾驶舱标签中再次点击开发路线图：应激活已有路线图标签，而不是产生重复标签
    await page.locator('.sidebar-item[data-page="dashboard/roadmap"]').click();
    await expect(page.locator('#page-tabs .tab')).toHaveCount(3);
    await expect(page.locator('#page-tabs .tab', { hasText: '开发路线图' })).toHaveCount(1);
    await expect(page.locator('#page-tabs .tab.active .tab-title')).toContainText('开发路线图');
  });

  test('duplicate page tabs from legacy state are deduped on load', async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.evaluate(() => {
      localStorage.setItem('dste-workspace-tabs-v1', JSON.stringify({
        version: 1,
        activeTabId: 'tab-3',
        tabs: [
          { id: 'tab-1', pageId: 'dashboard', phase: 'dashboard', title: '驾驶舱', icon: 'dashboard', pinned: true, createdAt: 1 },
          { id: 'tab-2', pageId: 'dashboard/roadmap', phase: 'dashboard', title: '开发路线图 Road Map', icon: 'dashboard/roadmap', pinned: false, createdAt: 2 },
          { id: 'tab-3', pageId: 'dashboard/roadmap', phase: 'dashboard', title: '开发路线图 Road Map', icon: 'dashboard/roadmap', pinned: false, createdAt: 3 }
        ],
        nextCounter: 4
      }));
    });
    await page.reload();

    // 重复的路线图标签被清理，只保留一个；activeTabId 回退到有效标签
    await expect(page.locator('#page-tabs .tab')).toHaveCount(2);
    await expect(page.locator('#page-tabs .tab', { hasText: '开发路线图' })).toHaveCount(1);
  });
});
