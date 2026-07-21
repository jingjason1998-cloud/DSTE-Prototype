import { test, expect } from '@playwright/test';

/**
 * 规则引擎中心 E2E 测试
 * 验证：创建规则 → 手动执行 → 预览落后战区 → 生成会议 → 幂等跳过
 */

const MOCK_INDICATORS = [
  { id: 'ind_sales_d', name: '销售额-D', unit: '万元' },
];

const MOCK_KPI_INSTANCES = [
  { id: 'kpi_bj', indicatorId: 'ind_sales_d', period: '2026-06', dept: '北京大区', actualValue: 90, targetValue: 100, achievementRate: 90 },
  { id: 'kpi_sh', indicatorId: 'ind_sales_d', period: '2026-06', dept: '上海大区', actualValue: 95, targetValue: 100, achievementRate: 95 },
  { id: 'kpi_db', indicatorId: 'ind_sales_d', period: '2026-06', dept: '东北大区', actualValue: 60, targetValue: 100, achievementRate: 60 },
];

async function setupRuleEngineData(page) {
  await page.goto('/src/rule-engine.html');
  await page.evaluate(({ indicators, kpis }) => {
    localStorage.removeItem('dste_rule_engine_rules_v1');
    localStorage.removeItem('dste_rule_engine_logs_v1');
    localStorage.removeItem('dste_rule_engine_last_runs_v1');
    localStorage.removeItem('dste_meetings');
    localStorage.setItem('dste_omp_indicators_v1', JSON.stringify(indicators));
    localStorage.setItem('dste_omp_kpi_instances_v1', JSON.stringify(kpis));
  }, { indicators: MOCK_INDICATORS, kpis: MOCK_KPI_INSTANCES });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
}

async function createRule(page, name, options = {}) {
  await page.click('[data-re-action="new-rule"]');
  await page.waitForSelector('#ruleForm', { state: 'visible' });
  await page.fill('#ruleName', name);
  await page.selectOption('#ruleIndicator', 'ind_sales_d');
  await page.fill('#ruleRankingBottomN', String(options.bottomN || 1));
  if (options.minRate) {
    await page.fill('#ruleMinAchievementRate', String(options.minRate));
  }
  if (options.autoSave) {
    await page.selectOption('#actionAutoSave', 'true');
  }
  await page.click('[data-re-action="save-rule"]');
  await page.waitForTimeout(500);
  const rules = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('dste_rule_engine_rules_v1') || '[]');
    } catch (e) {
      return [];
    }
  });
  console.log('RULES AFTER SUBMIT:', JSON.stringify(rules, null, 2));
  await page.waitForSelector(`.re-rule-card:has-text("${name}")`, { state: 'visible', timeout: 5000 });
}

async function openPreview(page, ruleName) {
  const card = page.locator('.re-rule-card', { hasText: ruleName });
  await card.locator('[data-re-action="run-rule"]').click();
  await page.waitForSelector('#previewModal', { state: 'visible' });
}

test.describe.serial('Rule Engine Center', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('PAGE ERROR:', msg.text());
      }
    });
    page.on('pageerror', err => console.error('PAGE EXCEPTION:', err.message));
    await setupRuleEngineData(page);
  });

  test('loads rule engine page and seeds default rule', async ({ page }) => {
    await expect(page.locator('.re-page-title')).toContainText('规则引擎中心');
    await expect(page.locator('.re-rule-card')).toHaveCount(1);
  });

  test('executes rule and shows preview modal with bottom theater', async ({ page }) => {
    await createRule(page, '东北大区落后预警', { bottomN: 1 });
    await openPreview(page, '东北大区落后预警');
    await expect(page.locator('#previewModal')).toContainText('东北大区');
    await expect(page.locator('#previewModal')).toContainText('倒数第 1 名');
  });

  test('creates lagging_region meeting and skips duplicate on re-run', async ({ page }) => {
    await createRule(page, '东北大区落后预警', { bottomN: 1, autoSave: true });
    await openPreview(page, '东北大区落后预警');
    await page.click('[data-re-action="confirm-create"]');
    await page.waitForTimeout(500);

    // 验证会议已创建
    await page.goto('/src/meetings.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    const meetingTitles = await page.locator('.meeting-card').allTextContents();
    expect(meetingTitles.some(t => t.includes('东北大区') && t.includes('业绩承诺会'))).toBe(true);

    // 再次执行同一规则，验证跳过重复
    await page.goto('/src/rule-engine.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await openPreview(page, '东北大区落后预警');
    await expect(page.locator('.re-preview-table tbody tr').first()).toContainText('已存在，跳过');
  });
});
