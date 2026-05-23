import { test, expect } from '@playwright/test';

/**
 * reviewer.html 解析函数单元测试
 * 目标：防止 parseDimensionScores / parseIssues / parseSuggestions / parseHighlights / parseConclusion
 * 因配置变化或格式兼容性问题导致解析失败（v0.3.2 事故根因）
 *
 * 测试策略：page.goto 加载 reviewer.html，通过 page.evaluate 调用 window._test* 函数
 */

const MOCK_REPORT_GENERAL = `
# 会议材料审核报告

## 总体评分
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
58分，待修改。材料聚焦于尾端人才识别，有一定的数据支撑和问题精准度，但缺少明确的决策请求和具体的行动计划。
`;

const MOCK_REPORT_VERTICAL = `
# 述职审核报告

## 总体评分
【总体评分】 72 / 100
判定：❌ 待修改

## 分项评分
| 维度 | 得分 | 满分 | 打分理由 |
| 完整性 | 22 | 35 | 材料覆盖了市场现状和业绩回顾 |
| 差距与根因分析 | 20 | 20 | 业绩差距量化清晰，根因分析较深入 |
| 业绩预测达成概率分析 | 18 | 10 | 预测有逻辑支撑，但假设条件不够完整 |
| 下一步计划 | 12 | 20 | 改进措施不够具体，缺少责任人 |
| SP战略关联度 | 5 | 10 | 材料提及了战略方向，但缺少具体对齐分析 |
| 态度与反思 | 2 | 5 | 有反思意识，但缺乏深度自我剖析 |
`;

const MOCK_REPORT_HTML_TAGS = `
## 分项评分
| <b>维度</b> | <b>得分</b> | <b>满分</b> | <b>打分理由</b> |
| <span>目标-解决方案对齐度</span> | <em>15</em> | <strong>30</strong> | 有决策请求但不够明确 |
| 决策支撑度 | 20 | 30 | 数据支撑较全面 |
| 行动具体化 | 18 | 25 | 有责任人但时间节点模糊 |
| 材料规范度 | 12 | 15 | 结构清晰，少量空话 |
`;

test.describe('parseDimensionScores — 评分解析', () => {
  test('通用议题场景：4个维度全部解析正确', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    const result = await page.evaluate((report) => {
      return window._testParseDimensionScores(report, 'general-topic-review');
    }, MOCK_REPORT_GENERAL);

    expect(result.totalScore).toBe(58);
    expect(result.passed).toBe(false);
    expect(result.scores).toHaveLength(4);
    expect(result.scores[0]).toMatchObject({ name: '目标-解决方案对齐度', score: 10, max: 30 });
    expect(result.scores[1]).toMatchObject({ name: '决策支撑度', score: 12, max: 30 });
    expect(result.scores[2]).toMatchObject({ name: '行动具体化', score: 8, max: 25 });
    expect(result.scores[3]).toMatchObject({ name: '材料规范度', score: 10, max: 15 });
    // 打分理由不应为空
    expect(result.scores[0].comment.length).toBeGreaterThan(5);
    expect(result.scores[1].comment.length).toBeGreaterThan(5);
  });

  test('述职场景：6个维度全部解析正确', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    const result = await page.evaluate((report) => {
      return window._testParseDimensionScores(report, 'vertical-segment-review');
    }, MOCK_REPORT_VERTICAL);

    expect(result.totalScore).toBe(72);
    expect(result.scores).toHaveLength(6);
    expect(result.scores[0]).toMatchObject({ name: '完整性', score: 22, max: 35 });
    expect(result.scores[1]).toMatchObject({ name: '差距与根因分析', score: 20, max: 20 });
    expect(result.scores[2]).toMatchObject({ name: '业绩预测达成概率分析', score: 18, max: 10 });
    expect(result.scores[3]).toMatchObject({ name: '下一步计划', score: 12, max: 20 });
    expect(result.scores[4]).toMatchObject({ name: 'SP战略关联度', score: 5, max: 10 });
    expect(result.scores[5]).toMatchObject({ name: '态度与反思', score: 2, max: 5 });
  });

  test('HTML标签包裹的表格行也能解析', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    const result = await page.evaluate((report) => {
      return window._testParseDimensionScores(report, 'general-topic-review');
    }, MOCK_REPORT_HTML_TAGS);

    expect(result.scores[0]).toMatchObject({ name: '目标-解决方案对齐度', score: 15, max: 30 });
    expect(result.scores[1]).toMatchObject({ name: '决策支撑度', score: 20, max: 30 });
    expect(result.scores[2]).toMatchObject({ name: '行动具体化', score: 18, max: 25 });
    expect(result.scores[3]).toMatchObject({ name: '材料规范度', score: 12, max: 15 });
  });

  test('维度缺失时返回0分并标记未识别', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    const result = await page.evaluate(() => {
      return window._testParseDimensionScores('【总体评分】 50 / 100\n| 其他维度 | 20 | 30 | ... |', 'general-topic-review');
    });

    expect(result.scores).toHaveLength(4);
    // 所有维度都应该是0分（因为报告中没有匹配的维度）
    for (const s of result.scores) {
      expect(s.score).toBe(0);
      expect(s.comment).toBe('未识别到评分');
    }
  });
});

test.describe('parseIssues — 问题清单解析', () => {
  test('解析表格行和列表行', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    const issues = await page.evaluate((report) => {
      return window._testParseIssues(report);
    }, MOCK_REPORT_GENERAL);

    expect(issues.length).toBeGreaterThanOrEqual(1);
    // 不应包含表头行
    const headerIssue = issues.find(i => i.dimension === '维度' && i.desc === '描述');
    expect(headerIssue).toBeUndefined();
    // 应有"零决策请求"
    const decisionIssue = issues.find(i => i.desc.includes('零决策请求'));
    expect(decisionIssue).toBeDefined();
  });
});

test.describe('parseSuggestions — 改进建议解析', () => {
  test('解析3条改进建议', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    const suggestions = await page.evaluate((report) => {
      return window._testParseSuggestions(report);
    }, MOCK_REPORT_GENERAL);

    expect(suggestions).toHaveLength(3);
    expect(suggestions[0]).toMatchObject({ priority: 'P0', problem: '零决策请求' });
    expect(suggestions[1]).toMatchObject({ priority: 'P1', problem: '行动具体化不足' });
    expect(suggestions[2]).toMatchObject({ priority: 'P2', problem: '数据支撑不全面' });
  });
});

test.describe('parseHighlights — 亮点解析', () => {
  test('解析2条亮点', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    const highlights = await page.evaluate((report) => {
      return window._testParseHighlights(report);
    }, MOCK_REPORT_GENERAL);

    expect(highlights.length).toBeGreaterThanOrEqual(1);
    // 不应把标题行"亮点"当作内容
    expect(highlights.some(h => h === '亮点')).toBeFalsy();
  });
});

test.describe('parseConclusion — 审核结论解析', () => {
  test('提取结论文字', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    const conclusion = await page.evaluate((report) => {
      return window._testParseConclusion(report);
    }, MOCK_REPORT_GENERAL);

    expect(conclusion.length).toBeGreaterThan(10);
    expect(conclusion).toContain('58分');
    expect(conclusion).toContain('待修改');
  });
});

test.describe('getDimensionConfig — 维度配置完整性', () => {
  test('general-topic-review 返回4个通用维度', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    const config = await page.evaluate(() => {
      return window._testGetDimensionConfig('general-topic-review');
    });

    expect(config).toHaveLength(4);
    expect(config.map(c => c.name)).toEqual([
      '目标-解决方案对齐度',
      '决策支撑度',
      '行动具体化',
      '材料规范度'
    ]);
  });

  test('vertical-segment-review 返回6个述职维度', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    const config = await page.evaluate(() => {
      return window._testGetDimensionConfig('vertical-segment-review');
    });

    expect(config).toHaveLength(6);
    expect(config.map(c => c.name)).toEqual([
      '完整性',
      '差距与根因分析',
      '业绩预测达成概率分析',
      '下一步计划',
      'SP战略关联度',
      '态度与反思'
    ]);
  });

  test('未知场景回退到 general-topic-review', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    const config = await page.evaluate(() => {
      return window._testGetDimensionConfig('unknown-scene');
    });

    expect(config).toHaveLength(4);
    expect(config[0].name).toBe('目标-解决方案对齐度');
  });
});
