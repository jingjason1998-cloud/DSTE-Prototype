import { test, expect } from '@playwright/test';

const TEST_EMPLOYEES = [
  {
    id: '10001', name: '张三', englishName: 'Zhang.San', displayName: '张三 (Zhang.San)',
    orgPath: '国内营销与服务线-华东大区-销售组-上海一组',
    l1Org: '国内营销与服务线', l1Team: '华东大区', l2Team: '销售组', l3Team: '上海一组',
    orgId: '100101', ldap: '100101,10010,1001,100', orgChain: ['100101', '10010', '1001', '100'],
    searchTokens: ['张三', 'zhang.san', '上海一组'],
  },
  {
    id: '10002', name: '李四', englishName: 'Li.Si', displayName: '李四 (Li.Si)',
    orgPath: '国内营销与服务线-华东大区-销售组-上海二组',
    l1Org: '国内营销与服务线', l1Team: '华东大区', l2Team: '销售组', l3Team: '上海二组',
    orgId: '100102', ldap: '100102,10010,1001,100', orgChain: ['100102', '10010', '1001', '100'],
    searchTokens: ['李四', 'li.si', '上海二组'],
  },
];

const TEST_ORG_UNITS = {
  '100': { id: '100', name: '国内营销与服务线', level: 0, parentId: null, path: '国内营销与服务线', employeeCount: 2, children: ['1001'] },
  '1001': { id: '1001', name: '华东大区', level: 1, parentId: '100', path: '国内营销与服务线 > 华东大区', employeeCount: 2, children: ['10010'] },
  '10010': { id: '10010', name: '销售组', level: 2, parentId: '1001', path: '国内营销与服务线 > 华东大区 > 销售组', employeeCount: 2, children: ['100101', '100102'] },
  '100101': { id: '100101', name: '上海一组', level: 3, parentId: '10010', path: '国内营销与服务线 > 华东大区 > 销售组 > 上海一组', employeeCount: 1, children: [] },
  '100102': { id: '100102', name: '上海二组', level: 3, parentId: '10010', path: '国内营销与服务线 > 华东大区 > 销售组 > 上海二组', employeeCount: 1, children: [] },
};

test.describe('Meetings person selector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/meetings.html');
    await page.waitForLoadState('networkidle');
    await page.evaluate(({ employees, orgUnits }) => {
      localStorage.removeItem('dste_meetings');
      localStorage.removeItem('dste_meetings_version');
      localStorage.setItem('dste_employees_v1', JSON.stringify(employees));
      localStorage.setItem('dste_employees_v1_version', JSON.stringify(1));
      localStorage.setItem('dste_org_units_v1', JSON.stringify(orgUnits));
      localStorage.setItem('dste_org_units_v1_version', JSON.stringify(1));
    }, { employees: TEST_EMPLOYEES, orgUnits: TEST_ORG_UNITS });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('selects employee for host and recorder in editor', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => console.log('PAGE CONSOLE:', msg.type(), msg.text()));

    await expect(page.locator('.meeting-card').first()).toBeVisible({ timeout: 10000 });

    // 打开编辑页（卡片列表的编辑按钮进入全页编辑）
    const card = page.locator('.meeting-card').first();
    await card.locator('[data-edit-meeting]').click();
    await expect(page.locator('text=编辑会议').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#page-content #edit-host')).toBeVisible();
    // 等待人员输入增强组件初始化完成
    await expect(page.locator('#page-content #edit-host[data-person-input="true"]')).toBeVisible({ timeout: 5000 });

    // 主持人字段搜索并选择（作用在全页编辑器的 input）
    await page.locator('#page-content #edit-host').fill('张三');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // 记录人字段搜索并选择
    await page.locator('#page-content #edit-recorder').fill('李四');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(200);

    // 保存
    await page.click('button:has-text("保存")');

    // 验证 localStorage 中保存的是 PersonRef 对象（找到刚编辑的那条会议）
    const meetings = await page.evaluate(() => JSON.parse(localStorage.getItem('dste_meetings') || '[]'));
    const edited = meetings.find(m => m.host && typeof m.host === 'object' && m.host.id === '10001');
    expect(edited).toBeTruthy();
    expect(edited.recorder).toMatchObject({ id: '10002', name: '李四' });
  });

  test('selects employee for action owner in editor', async ({ page }) => {
    await expect(page.locator('.meeting-card').first()).toBeVisible({ timeout: 10000 });
    await page.locator('.meeting-card').first().locator('[data-edit-meeting]').click();
    await expect(page.locator('text=编辑会议').first()).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("+ 添加行动项")');
    const contentInput = page.locator('input[placeholder="行动内容"]').last();
    await contentInput.fill('测试行动项');
    const ownerInput = page.locator('input[id^="edit-action-owner-"]').last();
    await ownerInput.click();
    await ownerInput.fill('张三');
    const ownerDropdown = ownerInput.locator('+ .person-input-dropdown');
    await expect(ownerDropdown).toBeVisible({ timeout: 5000 });
    await ownerDropdown.locator('div').first().click();

    await page.click('button:has-text("保存")');

    const meetings = await page.evaluate(() => JSON.parse(localStorage.getItem('dste_meetings') || '[]'));
    const edited = meetings.find(m => m.actions?.some(a => a.content === '测试行动项'));
    expect(edited).toBeTruthy();
    const action = edited.actions.find(a => a.content === '测试行动项');
    expect(action.owner).toMatchObject({ id: '10001', name: '张三' });
  });

  test('selects employee for decision owner and decider in editor', async ({ page }) => {
    await expect(page.locator('.meeting-card').first()).toBeVisible({ timeout: 10000 });
    await page.locator('.meeting-card').first().locator('[data-edit-meeting]').click();
    await expect(page.locator('text=编辑会议').first()).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("+ 添加决议")');
    const contentInput = page.locator('input[placeholder="决议内容"]').last();
    await contentInput.fill('测试决议');

    const ownerInput = page.locator('input[id^="edit-decision-owner-"]').last();
    await ownerInput.click();
    await ownerInput.fill('张三');
    const ownerDropdown = ownerInput.locator('+ .person-input-dropdown');
    await expect(ownerDropdown).toBeVisible({ timeout: 5000 });
    await ownerDropdown.locator('div').first().click();

    const deciderInput = page.locator('input[id^="edit-decision-decider-"]').last();
    await deciderInput.click();
    await deciderInput.fill('李四');
    const deciderDropdown = deciderInput.locator('+ .person-input-dropdown');
    await expect(deciderDropdown).toBeVisible({ timeout: 5000 });
    await deciderDropdown.locator('div').first().click();

    await page.click('button:has-text("保存")');

    const meetings = await page.evaluate(() => JSON.parse(localStorage.getItem('dste_meetings') || '[]'));
    const edited = meetings.find(m => m.decisions?.some(d => d.content === '测试决议'));
    expect(edited).toBeTruthy();
    const decision = edited.decisions.find(d => d.content === '测试决议');
    expect(decision.owner).toMatchObject({ id: '10001', name: '张三' });
    expect(decision.decider).toMatchObject({ id: '10002', name: '李四' });
  });

  test('selects employee for agenda item owner in editor', async ({ page }) => {
    await expect(page.locator('.meeting-card').first()).toBeVisible({ timeout: 10000 });
    await page.locator('.meeting-card').first().locator('[data-edit-meeting]').click();
    await expect(page.locator('text=编辑会议').first()).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("+ 添加议程项")');
    const ownerInput = page.locator('input[id^="edit-agenda-owner-"]').last();
    await ownerInput.click();
    await ownerInput.fill('张三');
    const ownerDropdown = ownerInput.locator('+ .person-input-dropdown');
    await expect(ownerDropdown).toBeVisible({ timeout: 5000 });
    await ownerDropdown.locator('div').first().click();

    await page.click('button:has-text("保存")');

    const meetings = await page.evaluate(() => JSON.parse(localStorage.getItem('dste_meetings') || '[]'));
    const edited = meetings.find(m => m.agenda_items?.some(a => a.owner?.id === '10001'));
    expect(edited).toBeTruthy();
  });
});
