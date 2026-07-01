import { test, expect } from '@playwright/test';

const TEST_EMPLOYEES = [
  {
    id: '10001', name: '张三', englishName: 'Zhang.San', displayName: '张三 (Zhang.San)',
    orgPath: '国内营销与服务线 > 华东大区 > 销售组 > 上海一组',
    l1Org: '国内营销与服务线', l1Team: '华东大区', l2Team: '销售组', l3Team: '上海一组',
    orgId: '100101', ldap: '100101,10010,1001,100', orgChain: ['100101', '10010', '1001', '100'],
    searchTokens: ['张三', 'zhang.san', '国内营销与服务线', '华东大区', '销售组', '上海一组'],
  },
  {
    id: '10002', name: '李四', englishName: 'Li.Si', displayName: '李四 (Li.Si)',
    orgPath: '国内营销与服务线 > 华东大区 > 销售组 > 上海二组',
    l1Org: '国内营销与服务线', l1Team: '华东大区', l2Team: '销售组', l3Team: '上海二组',
    orgId: '100102', ldap: '100102,10010,1001,100', orgChain: ['100102', '10010', '1001', '100'],
    searchTokens: ['李四', 'li.si', '国内营销与服务线', '华东大区', '销售组', '上海二组'],
  },
];

const TEST_ORG_UNITS = {
  'org:国内营销与服务线': { id: 'org:国内营销与服务线', name: '国内营销与服务线', level: 0, parentId: null, path: '国内营销与服务线', employeeCount: 2, children: ['org:国内营销与服务线/华东大区'] },
  'org:国内营销与服务线/华东大区': { id: 'org:国内营销与服务线/华东大区', name: '华东大区', level: 1, parentId: 'org:国内营销与服务线', path: '国内营销与服务线 > 华东大区', employeeCount: 2, children: ['org:国内营销与服务线/华东大区/销售组'] },
  'org:国内营销与服务线/华东大区/销售组': { id: 'org:国内营销与服务线/华东大区/销售组', name: '销售组', level: 2, parentId: 'org:国内营销与服务线/华东大区', path: '国内营销与服务线 > 华东大区 > 销售组', employeeCount: 2, children: ['org:国内营销与服务线/华东大区/销售组/上海一组', 'org:国内营销与服务线/华东大区/销售组/上海二组'] },
  'org:国内营销与服务线/华东大区/销售组/上海一组': { id: 'org:国内营销与服务线/华东大区/销售组/上海一组', name: '上海一组', level: 3, parentId: 'org:国内营销与服务线/华东大区/销售组', path: '国内营销与服务线 > 华东大区 > 销售组 > 上海一组', employeeCount: 1, children: [] },
  'org:国内营销与服务线/华东大区/销售组/上海二组': { id: 'org:国内营销与服务线/华东大区/销售组/上海二组', name: '上海二组', level: 3, parentId: 'org:国内营销与服务线/华东大区/销售组', path: '国内营销与服务线 > 华东大区 > 销售组 > 上海二组', employeeCount: 1, children: [] },
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

  test('employees are shown as leaf nodes in org tree', async ({ page }) => {
    await page.click('#btn-expand-all');
    await expect(page.locator('.org-tree')).toContainText('张三 (Zhang.San)');
    await expect(page.locator('.org-tree')).toContainText('李四 (Li.Si)');
    // 旧的右侧搜索面板不应存在
    await expect(page.locator('#directory-search')).toHaveCount(0);
  });

  test('imports employees from Excel file', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('dste_employees_v1');
      localStorage.removeItem('dste_org_units_v1');
      localStorage.removeItem('dste_employee_import_meta');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 通过 fileChooser 上传测试 Excel
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

test.describe('Employee Directory Cloud Sync', () => {
  test('loads remote employee data on page init', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('dste_api_base', 'http://localhost:8787');
    });

    await page.route('http://localhost:8787/api/employees', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: TEST_EMPLOYEES }),
      });
    });
    await page.route('http://localhost:8787/api/org-units', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { lastModified: Date.now(), data: TEST_ORG_UNITS } }),
      });
    });
    await page.route('http://localhost:8787/api/employee-import-meta', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: null }),
      });
    });

    await page.goto('/src/employee-directory.html');
    await page.waitForLoadState('networkidle');

    const employees = await page.evaluate(() => JSON.parse(localStorage.getItem('dste_employees_v1') || '[]'));
    expect(employees.length).toBe(2);
    expect(employees.some(e => e.id === '10001')).toBe(true);
  });

  test('pushes employee data to API on import', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('dste_api_base', 'http://localhost:8787');
    });

    const requests = [];
    await page.route('http://localhost:8787/api/employees/*', async (route) => {
      requests.push(route.request());
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });
    await page.route('http://localhost:8787/api/org-units', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    });
    await page.route('http://localhost:8787/api/employee-import-meta', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: null }) });
    });

    await page.goto('/src/employee-directory.html');
    await page.waitForLoadState('networkidle');

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('#import-drop-zone'),
    ]);
    await fileChooser.setFiles('tests/fixtures/test-employees.xlsx');

    // 等待导入完成并触发同步
    await page.waitForTimeout(2000);

    const putRequests = requests.filter(req => req.method() === 'PUT');
    expect(putRequests.length).toBeGreaterThanOrEqual(3);
    const postedEmployees = putRequests.map(req => req.postDataJSON());
    expect(postedEmployees.every(e => e.lastModified)).toBe(true);
    const ids = [...new Set(postedEmployees.map(e => e.id))].sort();
    expect(ids).toEqual(['10001', '10002', '10003']);
  });

  test('pushes empty state to API on clear', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('dste_api_base', 'http://localhost:8787');
    });

    await page.route('http://localhost:8787/api/employees/*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });
    await page.route('http://localhost:8787/api/org-units', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });
    await page.route('http://localhost:8787/api/employee-import-meta', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: null }) });
    });

    await page.goto('/src/employee-directory.html');
    await page.waitForLoadState('networkidle');

    await page.evaluate(({ employees, orgUnits }) => {
      localStorage.setItem('dste_employees_v1', JSON.stringify(employees));
      localStorage.setItem('dste_org_units_v1', JSON.stringify(orgUnits));
    }, { employees: TEST_EMPLOYEES, orgUnits: TEST_ORG_UNITS });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 页面没有清空按钮，通过暴露的 window API 触发清空并同步
    await page.evaluate(() => {
      window.clearEmployeeDirectory();
    });

    // 验证同步队列中包含逐条 DELETE
    const queue = await page.evaluate(() => JSON.parse(localStorage.getItem('dste_sync_queue') || '[]'));
    const deleteOps = queue.filter(q => q.endpoint.startsWith('/api/employees/') && q.method === 'DELETE');
    expect(deleteOps).toHaveLength(TEST_EMPLOYEES.length);
    const deletedIds = deleteOps.map(q => q.endpoint.split('/').pop()).sort();
    expect(deletedIds).toEqual(TEST_EMPLOYEES.map(e => e.id).sort());

    const orgUnitsOp = queue.find(q => q.endpoint === '/api/org-units' && q.method === 'POST');
    expect(orgUnitsOp).toBeDefined();
    expect(orgUnitsOp.payload).toMatchObject({ data: {} });
  });
});
