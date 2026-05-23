import { test, expect } from '@playwright/test';

/**
 * reviewer.html 6维度述职场景升级测试
 * 目标：验证 vertical-segment-review 场景支持完整的6维度评分体系
 * 对应后端 prompt_templates.py 的述职模板
 */

const MOCK_REPORT_6DIM = `
# 述职审核报告

## 总体评分
52 / 100 分
判定：❌ 待修改

## 分项评分
| 维度 | 得分 | 满分 | 打分理由 |
| 完整性 | 28 | 35 | 材料覆盖了5大模块中的4个，缺少资源需求 |
| 差距与根因分析 | 15 | 20 | 差距有量化，但根因分析缺少主观归因 |
| 业绩预测达成概率分析 | 8 | 10 | 预测有逻辑支撑，但假设条件不够完整 |
| 下一步计划 | 14 | 20 | 计划有时间节点，但缺少里程碑验收标准 |
| SP战略关联度 | 5 | 10 | 材料提及了战略方向，但缺少具体对齐分析 |
| 态度与反思 | 2 | 5 | 有反思意识，但缺乏深度自我剖析 |

## 问题清单（分级）
| 严重 | 维度 | 描述 |
| 严重 | 完整性 | 缺少资源需求模块 |
| 警告 | 差距与根因分析 | 缺少主观归因 |

## 改进建议
| P0 | 缺少资源需求 | 补充人员、预算、培训需求 |
| P1 | 根因分析不够深入 | 增加主观归因分析 |

## 亮点
• 数据支撑较充分
• 差距量化清晰

## 审核结论
52分，待修改。
`;

test.describe('6维度述职场景——配置完整性', () => {
  test('getDimensionConfig 返回6个维度', async ({ page }) => {
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
    expect(config.map(c => c.max)).toEqual([35, 20, 10, 20, 10, 5]);
  });

  test('场景维度卡片渲染6个', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    await page.selectOption('#sceneSelect', 'vertical-segment-review');
    await page.waitForTimeout(500);

    const cards = page.locator('#principleCardsContainer .principle-card');
    expect(await cards.count()).toBe(6);
  });
});

test.describe('6维度述职场景——评分解析', () => {
  test('parseDimensionScores 解析6维度全部正确', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    const result = await page.evaluate((report) => {
      return window._testParseDimensionScores(report, 'vertical-segment-review');
    }, MOCK_REPORT_6DIM);

    expect(result.scores).toHaveLength(6);
    expect(result.scores[0]).toMatchObject({ name: '完整性', score: 28, max: 35 });
    expect(result.scores[1]).toMatchObject({ name: '差距与根因分析', score: 15, max: 20 });
    expect(result.scores[2]).toMatchObject({ name: '业绩预测达成概率分析', score: 8, max: 10 });
    expect(result.scores[3]).toMatchObject({ name: '下一步计划', score: 14, max: 20 });
    expect(result.scores[4]).toMatchObject({ name: 'SP战略关联度', score: 5, max: 10 });
    expect(result.scores[5]).toMatchObject({ name: '态度与反思', score: 2, max: 5 });
  });

  test('缺失维度返回0分并标记未识别', async ({ page }) => {
    await page.goto('/src/reviewer.html');
    const result = await page.evaluate(() => {
      return window._testParseDimensionScores(
        '【总体评分】 30 / 100\n| 其他维度 | 10 | 35 | ... |',
        'vertical-segment-review'
      );
    });

    expect(result.scores).toHaveLength(6);
    for (const s of result.scores) {
      expect(s.score).toBe(0);
      expect(s.comment).toBe('未识别到评分');
    }
  });
});
