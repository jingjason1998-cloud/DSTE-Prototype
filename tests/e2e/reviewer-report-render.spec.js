import { test, expect } from '@playwright/test';

/**
 * reviewer.html 报告渲染端到端测试
 * 目标：验证后端返回报告后，前端能正确渲染评分、改进建议、亮点、结论
 * 策略：拦截 /api/review 请求，返回 mock 报告，断言 DOM 渲染结果
 */

const MOCK_BACKEND_REPORT = {
  success: true,
  report: `## 总体评分
【总体评分】 58 / 100
判定：❌ 待修改

## 分项评分
| 维度 | 得分 | 满分 | 打分理由 |
| 目标-解决方案对齐度 | 10 | 30 | 零决策请求，材料没有明确写出决策事项 |
| 决策支撑度 | 12 | 30 | 核心论点有一定数据支撑，但不够全面 |
| 行动具体化 | 8 | 25 | 行动项描述不够具体，缺少责任人和时间节点 |
| 材料规范度 | 10 | 15 | 材料结构相对清晰，篇幅适中，但存在一些空话套话 |

## 问题清单（分级）
| 严重 | 维度 | 描述 |
| 严重 | 目标-解决方案对齐度 | 零决策请求 |
| 警告 | 行动具体化 | 缺少责任人 |

## 改进建议
| P0 | 零决策请求 | 明确写出请会议决策的事项 |
| P1 | 行动具体化不足 | 每个行动项应明确责任人和时间节点 |
| P2 | 数据支撑不全面 | 增加对比分析，如同比环比数据 |

## 亮点
• 亮点1: 问题定义较为精准，区分了现象和根因
• 亮点2: 数据支撑有量化指标

## 审核结论
58分，待修改。材料聚焦于尾端人才识别，有一定的数据支撑和问题精准度，但缺少明确的决策请求和具体的行动计划。`,
  scene_id: 'general-topic-review',
  total_score: 58,
  facts: {}
};

test.describe('审核报告渲染 — 通用议题场景', () => {
  test.beforeEach(async ({ page }) => {
    // 拦截后端健康检查与场景接口，避免本地无代理服务时测试失败
    await page.route('**/api/health', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
    });
    await page.route('**/api/scenes', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          scenes: [
            { id: 'vertical-segment-review', short_name: '垂直客群-落后述职' },
            { id: 'lagging-region-review', short_name: '落后战区业绩承诺会' },
            { id: 'annual-leader-review', short_name: '负责人年度述职' },
            { id: 'general-topic-review', short_name: '通用议题材料审核（以本部会为例）' }
          ]
        })
      });
    });
    // 拦截 /api/review 请求，返回 mock 报告
    await page.route('**/api/review', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_BACKEND_REPORT)
      });
    });

    await page.goto('/src/reviewer.html');

    // 选择通用议题场景
    await page.selectOption('#sceneSelect', 'general-topic-review');

    // 输入测试链接并提交
    await page.fill('#kmsUrl', 'https://kms.fineres.com/pages/viewpage.action?pageId=TEST123');
    await page.click('#reviewBtn');

    // 等待报告区域显示（最多15秒）
    await page.waitForSelector('#reportSection:not(.hidden)', { timeout: 15000 });
  });

  test('总分显示正确', async ({ page }) => {
    const totalScore = page.locator('#analysisTotalScore');
    await expect(totalScore).toHaveText('58');
  });

  test('状态标签显示待修改', async ({ page }) => {
    const badge = page.locator('#analysisStatusBadge');
    await expect(badge).toContainText('待修改');
  });

  test('4个维度小卡片都有具体分数（不为0）', async ({ page }) => {
    const dimValues = page.locator('.score-dim-value');
    const count = await dimValues.count();
    expect(count).toBe(4);

    for (let i = 0; i < count; i++) {
      const text = await dimValues.nth(i).textContent();
      const score = parseInt(text.trim(), 10);
      expect(score).toBeGreaterThan(0);
    }
  });

  test('维度小卡片显示预期分数', async ({ page }) => {
    const dimValues = page.locator('.score-dim-value');
    const texts = await dimValues.allTextContents();

    // 期望包含 4 个维度的分数
    expect(texts.some(t => t.includes('10'))).toBeTruthy(); // 目标对齐
    expect(texts.some(t => t.includes('12'))).toBeTruthy(); // 决策支撑
    expect(texts.some(t => t.includes('8'))).toBeTruthy();  // 行动具体
    expect(texts.some(t => t.includes('10'))).toBeTruthy(); // 材料规范
  });

  test('分项评分表格有4行数据且打分理由不为空', async ({ page }) => {
    const tbody = page.locator('#dimensionTableBody');
    // 等待表格加载
    await page.waitForTimeout(500);
    const rows = tbody.locator('tr');
    const count = await rows.count();
    expect(count).toBe(4);

    // 检查没有"未识别到评分"
    const html = await tbody.innerHTML();
    expect(html).not.toContain('未识别到评分');
  });

  test('问题清单显示', async ({ page }) => {
    const issuesCard = page.locator('#issuesCard');
    await expect(issuesCard).toBeVisible();
    const rows = issuesCard.locator('#issueTableBody tr');
    expect(await rows.count()).toBeGreaterThanOrEqual(1);
  });

  test('改进建议显示3条', async ({ page }) => {
    const suggCard = page.locator('#suggestionsCard');
    await expect(suggCard).toBeVisible();
    const rows = suggCard.locator('#suggestionTableBody tr');
    await expect(rows).toHaveCount(3);
  });

  test('亮点显示', async ({ page }) => {
    const highCard = page.locator('#highlightsCard');
    await expect(highCard).toBeVisible();
    const items = highCard.locator('.highlight-list li');
    expect(await items.count()).toBeGreaterThanOrEqual(1);
  });

  test('审核结论显示且包含关键文字', async ({ page }) => {
    const concCard = page.locator('#conclusionCard');
    await expect(concCard).toBeVisible();
    const text = await concCard.textContent();
    expect(text).toContain('58分');
    expect(text).toContain('待修改');
  });

  test('合格标准显示通用议题标准', async ({ page }) => {
    const stdBody = page.locator('#passStandardBody');
    await expect(stdBody).toContainText('总分');
    await expect(stdBody).toContainText('80分');
  });

  test('原始报告文本显示在 reportBox', async ({ page }) => {
    const reportBox = page.locator('#reportBox');
    await expect(reportBox).toContainText('【总体评分】');
    await expect(reportBox).toContainText('58');
  });
});

test.describe('审核报告渲染 — 述职场景', () => {
  const MOCK_VERTICAL_REPORT = {
    success: true,
    report: `## 总体评分
【总体评分】 72 / 100
判定：❌ 待修改

## 分项评分
| 维度 | 得分 | 满分 | 打分理由 |
| 完整性 | 22 | 25 | 材料覆盖了市场现状和业绩回顾 |
| 差距与根因分析 | 20 | 25 | 业绩差距量化清晰，根因分析较深入 |
| 业绩预测达成概率分析 | 18 | 25 | 预测有逻辑支撑，但假设条件不够完整 |
| 下一步计划 | 12 | 25 | 改进措施不够具体，缺少责任人 |
`,
    scene_id: 'vertical-segment-review',
    total_score: 72,
    facts: {}
  };

  test('述职场景4个维度全部解析正确', async ({ page }) => {
    // 该测试单独导航，需重新 mock 健康检查与场景接口
    await page.route('**/api/health', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
    });
    await page.route('**/api/scenes', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          scenes: [
            { id: 'vertical-segment-review', short_name: '垂直客群-落后述职' },
            { id: 'general-topic-review', short_name: '通用议题材料审核（以本部会为例）' }
          ]
        })
      });
    });
    await page.route('**/api/review', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_VERTICAL_REPORT)
      });
    });

    await page.goto('/src/reviewer.html');
    await page.selectOption('#sceneSelect', 'vertical-segment-review');
    await page.fill('#kmsUrl', 'https://kms.fineres.com/test');
    await page.click('#reviewBtn');
    await page.waitForSelector('#reportSection:not(.hidden)', { timeout: 15000 });

    const totalScore = page.locator('#analysisTotalScore');
    await expect(totalScore).toHaveText('72');

    const dimValues = page.locator('.score-dim-value');
    const texts = await dimValues.allTextContents();
    expect(texts.some(t => t.includes('22'))).toBeTruthy();
    expect(texts.some(t => t.includes('20'))).toBeTruthy();
    expect(texts.some(t => t.includes('18'))).toBeTruthy();
    expect(texts.some(t => t.includes('12'))).toBeTruthy();
  });
});
