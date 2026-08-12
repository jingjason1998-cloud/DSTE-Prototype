import { describe, it, expect } from 'vitest';
import {
  scoreMatch,
  searchItems,
  buildPageIndex,
  buildRecordIndex,
  RECORD_SOURCES,
} from '../../src/lib/command-palette.js';

describe('scoreMatch', () => {
  it('完全相等得分最高', () => {
    expect(scoreMatch('会议', '会议')).toBe(100);
  });

  it('前缀匹配高于包含匹配', () => {
    expect(scoreMatch('经营', '经营分析会')).toBe(80);
    expect(scoreMatch('分析', '经营分析会')).toBe(60);
  });

  it('连续子序列匹配得分最低', () => {
    expect(scoreMatch('经会', '经营分析会议')).toBe(30);
  });

  it('不匹配返回 0', () => {
    expect(scoreMatch('预算', '经营分析会')).toBe(0);
  });

  it('空查询或空文本返回 0', () => {
    expect(scoreMatch('', '会议')).toBe(0);
    expect(scoreMatch('会议', '')).toBe(0);
    expect(scoreMatch(null, undefined)).toBe(0);
  });

  it('大小写不敏感', () => {
    expect(scoreMatch('KPI', 'kpi 看板')).toBe(80);
  });
});

describe('searchItems', () => {
  const items = [
    { group: '页面', title: '经营分析会', subtitle: '执行' },
    { group: '页面', title: 'KPI 看板', subtitle: '驾驶舱' },
    { group: '会议', title: '华东战区经营分析会', subtitle: '2026-05-20' },
    { group: '会议', title: '华南战区经营分析会', subtitle: '2026-05-21' },
  ];

  it('按分组返回且组内按分数排序', () => {
    const result = searchItems('经营分析会', items);
    expect(result.length).toBe(2);
    const pageGroup = result.find((g) => g.group === '页面');
    const meetingGroup = result.find((g) => g.group === '会议');
    expect(pageGroup.items[0].title).toBe('经营分析会');
    expect(meetingGroup.items.length).toBe(2);
  });

  it('每组截断 limitPerGroup 条', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ group: '会议', title: `会议${i}`, subtitle: '' }));
    const result = searchItems('会议', many, 5);
    expect(result[0].items.length).toBe(5);
  });

  it('空查询返回全部（分组截断）', () => {
    const result = searchItems('', items);
    expect(result.length).toBe(2);
  });

  it('无匹配返回空数组', () => {
    expect(searchItems('zzz', items)).toEqual([]);
  });

  it('subtitle 匹配得分低于 title 匹配', () => {
    const list = [
      { group: '页面', title: '战略地图', subtitle: 'SP' },
      { group: '会议', title: '月度复盘', subtitle: '战略地图专项' },
    ];
    const result = searchItems('战略地图', list);
    const page = result.find((g) => g.group === '页面').items[0];
    const meeting = result.find((g) => g.group === '会议').items[0];
    expect(page.score).toBeGreaterThan(meeting.score);
  });
});

describe('buildPageIndex', () => {
  const sidebar = {
    exe: [
      { type: 'item', id: 'exe/meetings', label: '经营分析会', icon: 'meeting' },
      { type: 'quick', label: '快捷入口' },
      {
        type: 'group',
        title: '报表中心',
        items: [
          { id: 'exe/report-center', label: '报表首页', reportId: 'home' },
          { id: 'exe/report-center', label: '利润表', reportId: 'pnl' },
        ],
      },
    ],
  };
  const topNav = [{ id: 'exe', label: '战略执行' }];

  it('展开分组子项并按 pageId 去重', () => {
    const items = buildPageIndex(sidebar, topNav);
    expect(items.length).toBe(2);
    expect(items[0]).toMatchObject({ kind: 'page', pageId: 'exe/meetings', title: '经营分析会', subtitle: '战略执行' });
    expect(items[1].title).toBe('报表首页');
  });

  it('quick 分隔标签不进索引', () => {
    const items = buildPageIndex(sidebar, topNav);
    expect(items.some((i) => i.title === '快捷入口')).toBe(false);
  });
});

describe('buildRecordIndex', () => {
  function mockStorage(data) {
    return { getItem: (k) => (k in data ? data[k] : null) };
  }

  it('读取会议记录生成 deep-link 项', () => {
    const storage = mockStorage({
      dste_meetings: JSON.stringify([{ id: 'm1', title: '月度经营会', date: '2026-05-20', host: '张三' }]),
    });
    const items = buildRecordIndex(storage);
    expect(items.length).toBe(1);
    expect(items[0]).toMatchObject({
      kind: 'record', group: '会议', pageId: 'exe/meetings',
      recordType: 'meeting', recordId: 'm1', title: '月度经营会', subtitle: '2026-05-20 · 张三',
    });
  });

  it('决议预解析为来源会议 + decisions 区块', () => {
    const storage = mockStorage({
      dste_resolutions_v2: JSON.stringify([
        { id: 'r1', content: 'Q2 营收目标上调', owner: '李四', sourceMeetingId: 'm9', sourceMeetingTitle: '季度会' },
      ]),
    });
    const items = buildRecordIndex(storage);
    expect(items[0]).toMatchObject({ recordType: 'meeting', recordId: 'm9', section: 'decisions' });
  });

  it('决议缺 sourceMeetingId 时跳过', () => {
    const storage = mockStorage({
      dste_resolutions_v2: JSON.stringify([{ id: 'r1', content: '孤儿决议' }]),
    });
    expect(buildRecordIndex(storage)).toEqual([]);
  });

  it('deepLink=false 的源退化为页面跳转项', () => {
    const storage = mockStorage({
      dste_employees_v1: JSON.stringify([{ id: 'e1', name: '王五', orgPath: '营销线/华东' }]),
    });
    const items = buildRecordIndex(storage);
    expect(items[0]).toMatchObject({ kind: 'page', pageId: 'admin/employee-directory', title: '王五' });
  });

  it('损坏的 JSON 跳过该源不影响其他源', () => {
    const storage = mockStorage({
      dste_meetings: '{bad json',
      dste_requirements_v1: JSON.stringify([{ id: 'q1', title: '需求A', reqCode: 'REQ-1' }]),
    });
    const items = buildRecordIndex(storage);
    expect(items.length).toBe(1);
    expect(items[0].group).toBe('需求');
  });

  it('无 storage 返回空数组', () => {
    expect(buildRecordIndex(null)).toEqual([]);
  });

  it('缺标题的记录被跳过', () => {
    const storage = mockStorage({ dste_meetings: JSON.stringify([{ id: 'm1' }, { id: 'm2', title: '有效会议' }]) });
    const items = buildRecordIndex(storage);
    expect(items.length).toBe(1);
  });
});

describe('RECORD_SOURCES 配置', () => {
  it('每个源都有 storageKey/pageId/titleField', () => {
    for (const src of RECORD_SOURCES) {
      expect(src.storageKey).toBeTruthy();
      expect(src.pageId).toBeTruthy();
      expect(src.titleField).toBeTruthy();
    }
  });
});
