import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

// 按 pageId 定位对应 keep-alive 容器内的 iframe（多 iframe 并存，不能用单数选择器）
const iframeOf = (page, pageId) =>
  page.locator(`.workspace-iframe-wrap[data-page-id="${pageId}"] .workspace-iframe`);

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
    await expect(iframeOf(page, 'sp/strategy-map')).toHaveAttribute('src', /strategy-map-list\.html\?embed=1/);

    // 打开战略执行阶段（默认内部页），再从侧边栏打开经营分析会外部页
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    await expect(page).toHaveURL(/cockpit\.html#exe\/tasks/);
    await page.locator('.sidebar-item[data-page="exe/meetings"]').click();
    await expect(page).toHaveURL(/cockpit\.html#exe\/meetings/);
    await expect(iframeOf(page, 'exe/meetings')).toHaveAttribute('src', /meetings\.html\?embed=1/);

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
    await expect(iframeOf(page, 'sp/strategy-map')).toBeVisible();
    await expect(iframeOf(page, 'sp/strategy-map')).toHaveAttribute('src', /strategy-map-list\.html\?embed=1/);

    // 切换到经营分析会标签
    await tabs.filter({ hasText: '经营分析会' }).click();
    await expect(page).toHaveURL(/cockpit\.html#exe\/meetings/);
    await expect(iframeOf(page, 'exe/meetings')).toBeVisible();
    await expect(iframeOf(page, 'exe/meetings')).toHaveAttribute('src', /meetings\.html\?embed=1/);
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
    await expect(iframeOf(page, 'exe/meetings')).toHaveAttribute('src', /meetings\.html\?embed=1/);
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
    await expect(iframeOf(page, 'sp/strategy-map')).toHaveAttribute('src', /strategy-map-list\.html\?embed=1/);
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

test.describe('Workspace Tab Keep-Alive (RFC-010)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/cockpit.html');
    await page.evaluate(() => localStorage.removeItem('dste-workspace-tabs-v1'));
    await page.reload();
  });

  test('switching away and back does not rebuild the external page iframe', async ({ page }) => {
    await page.locator('.top-nav-item[data-phase="sp"]').click();
    await expect(iframeOf(page, 'sp/strategy-map')).toBeVisible();
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    await page.locator('.sidebar-item[data-page="exe/meetings"]').click();
    await expect(iframeOf(page, 'exe/meetings')).toBeVisible();

    // 给两个 iframe 打 DOM 标记（元素被重建则标记丢失）
    await page.evaluate(() => {
      document.querySelector('.workspace-iframe-wrap[data-page-id="sp/strategy-map"] .workspace-iframe')
        .setAttribute('data-ka-mark', 'strategy-map');
      document.querySelector('.workspace-iframe-wrap[data-page-id="exe/meetings"] .workspace-iframe')
        .setAttribute('data-ka-mark', 'meetings');
    });

    // 切到战略地图再切回经营分析会
    const tabs = page.locator('#page-tabs .tab');
    await tabs.filter({ hasText: '战略地图' }).click();
    await expect(iframeOf(page, 'sp/strategy-map')).toBeVisible();
    // 切走：经营分析会容器隐藏但保留在 DOM 中
    await expect(iframeOf(page, 'exe/meetings')).toBeHidden();
    await expect(page.locator('.workspace-iframe-wrap[data-page-id="exe/meetings"]')).toHaveCount(1);

    await tabs.filter({ hasText: '经营分析会' }).click();
    await expect(iframeOf(page, 'exe/meetings')).toBeVisible();

    // iframe 元素未重建：标记仍在
    await expect(iframeOf(page, 'exe/meetings')).toHaveAttribute('data-ka-mark', 'meetings');
    await expect(iframeOf(page, 'sp/strategy-map')).toHaveAttribute('data-ka-mark', 'strategy-map');
    // 切回不重载：不出现骨架屏
    await expect(page.locator('.workspace-iframe-wrap[data-page-id="exe/meetings"] .workspace-iframe-skeleton')).toHaveCount(0);
  });

  test('external page runtime state survives tab switch', async ({ page }) => {
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    await page.locator('.sidebar-item[data-page="exe/meetings"]').click();
    await expect(iframeOf(page, 'exe/meetings')).toBeVisible();

    // 在 iframe 内写入运行时状态（非 localStorage，重建即丢失）
    const frame = page.frames().find(f => f.url().includes('meetings.html'));
    expect(frame).toBeTruthy();
    await frame.evaluate(() => { window.__keepAliveProbe = 42; });

    // 切走再切回
    await page.locator('.top-nav-item[data-phase="sp"]').click();
    await expect(iframeOf(page, 'sp/strategy-map')).toBeVisible();
    await page.locator('#page-tabs .tab').filter({ hasText: '经营分析会' }).click();
    await expect(iframeOf(page, 'exe/meetings')).toBeVisible();

    const probe = await frame.evaluate(() => window.__keepAliveProbe);
    expect(probe).toBe(42);
  });

  test('internal page scroll position is restored after tab switch', async ({ page }) => {
    // 驾驶舱（内部页）等待渲染完成
    await expect(page.locator('#page-content .card').first()).toBeVisible();

    const maxScroll = await page.evaluate(() => {
      const el = document.getElementById('page-content');
      return el.scrollHeight - el.clientHeight;
    });
    expect(maxScroll).toBeGreaterThan(100);
    const target = Math.min(300, maxScroll);
    await page.evaluate((y) => { document.getElementById('page-content').scrollTop = y; }, target);

    // 切到战略地图（外部页）标签
    await page.locator('.top-nav-item[data-phase="sp"]').click();
    await expect(iframeOf(page, 'sp/strategy-map')).toBeVisible();
    // 内部页容器隐藏、keep-alive 层显示
    await expect(page.locator('#page-content')).toBeHidden();

    // 切回驾驶舱标签
    await page.locator('#page-tabs .tab').filter({ hasText: '驾驶舱' }).click();
    await expect(page.locator('#page-content')).toBeVisible();

    const restored = await page.evaluate(() => document.getElementById('page-content').scrollTop);
    expect(restored).toBe(target);
  });

  test('closing external tab removes its keep-alive iframe container', async ({ page }) => {
    await page.locator('.top-nav-item[data-phase="exe"]').click();
    await page.locator('.sidebar-item[data-page="exe/meetings"]').click();
    await expect(page.locator('.workspace-iframe-wrap[data-page-id="exe/meetings"]')).toHaveCount(1);

    await page.locator('#page-tabs .tab.active .tab-close').click();
    await expect(page.locator('.workspace-iframe-wrap[data-page-id="exe/meetings"]')).toHaveCount(0);
  });

  test('LRU: keep-alive iframes are capped, least recently active one is destroyed', async ({ page }) => {
    // 依次打开 6 个外部页标签（上限 5）；侧边栏导航会复用当前标签，故用 openTab 确保每页一个标签
    const pages = ['sp/strategy-map', 'sp/knowledge', 'bp/kpi', 'exe/meetings', 'exe/business-topics'];
    for (const pageId of pages) {
      await page.evaluate((id) => window.openTab(id), pageId);
      await expect(iframeOf(page, pageId)).toBeVisible();
    }
    await expect(page.locator('.workspace-iframe-wrap')).toHaveCount(5);

    // 第 6 个外部页：超出上限，最久未激活的战略地图容器被销毁
    await page.evaluate(() => window.openTab('exe/st-issue-tracking'));
    await expect(iframeOf(page, 'exe/st-issue-tracking')).toBeVisible();
    await expect(page.locator('.workspace-iframe-wrap')).toHaveCount(5);
    await expect(page.locator('.workspace-iframe-wrap[data-page-id="sp/strategy-map"]')).toHaveCount(0);

    // 被销毁的页签再次激活时按需重建（同时淘汰下一个最久未激活的容器）
    await page.locator('#page-tabs .tab').filter({ hasText: '战略地图' }).click();
    await expect(iframeOf(page, 'sp/strategy-map')).toBeVisible();
    await expect(iframeOf(page, 'sp/strategy-map')).toHaveAttribute('src', /strategy-map-list\.html\?embed=1/);
    await expect(page.locator('.workspace-iframe-wrap')).toHaveCount(5);
    await expect(page.locator('.workspace-iframe-wrap[data-page-id="sp/knowledge"]')).toHaveCount(0);
  });
});
