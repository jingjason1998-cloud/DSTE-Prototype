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

test.describe('Employee Directory Admin', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/employee-directory.html');
    await page.waitForLoadState('networkidle');
    await page.evaluate(({ employees, orgUnits }) => {
      localStorage.setItem('dste_employees_v1', JSON.stringify(employees));
      localStorage.setItem('dste_employees_v1_version', JSON.stringify(1));
      localStorage.setItem('dste_org_units_v1', JSON.stringify(orgUnits));
      localStorage.setItem('dste_org_units_v1_version', JSON.stringify(1));
      localStorage.setItem('dste_employee_import_meta', JSON.stringify({ importedAt: new Date().toISOString(), count: employees.length, fileName: 'test.xlsx' }));
    }, { employees: TEST_EMPLOYEES, orgUnits: TEST_ORG_UNITS });
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('loads admin page and shows stats', async ({ page }) => {
    await expect(page.locator('.page-header h1')).toContainText('人员与组织管理');
    await expect(page.locator('.directory-stats')).toContainText('员工总数');
    await expect(page.locator('.directory-stats')).toContainText('2');
  });

  test('org tree renders and can expand', async ({ page }) => {
    await expect(page.locator('.org-tree')).toContainText('国内营销与服务线');
    // 默认根节点应可见
    await page.click('#btn-expand-all');
    await expect(page.locator('.org-tree')).toContainText('上海一组');
    await expect(page.locator('.org-tree')).toContainText('上海二组');
  });

  test('employee search returns matching results', async ({ page }) => {
    await page.fill('#employee-search-input', '张三');
    await expect(page.locator('.employee-list')).toContainText('张三');
    await expect(page.locator('.result-count')).toContainText('共 1 条结果');
  });

  test('imports employees from Excel file', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('dste_employees_v1');
      localStorage.removeItem('dste_org_units_v1');
      localStorage.removeItem('dste_employee_import_meta');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('#import-drop-zone'),
    ]);

    await fileChooser.setFiles('tests/fixtures/test-employees.xlsx');

    // 等待导入完成并刷新统计
    await expect(page.locator('.directory-stats')).toContainText('3', { timeout: 10000 });

    const employees = await page.evaluate(() => JSON.parse(localStorage.getItem('dste_employees_v1') || '[]'));
    expect(employees.length).toBe(3);
    expect(employees.some(e => e.id === '10001' && e.name === '张三')).toBe(true);
  });
});
