import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeAgendaTimeSlots } from '../../src/meetings/utils/helpers.js';

// Set up window globals BEFORE vi.mock hoisting resolves
Object.assign(globalThis, {
  window: {
    _meetingEditData: null,
    _userEditedFields: new Set(),
    _agendaReviewMode: false,
    _agendaBatchSelections: new Set(),
    _agendaReviewing: new Set(),
    showToast: vi.fn(),
    navigate: vi.fn(),
    openMeetingDetail: vi.fn(),
    closeMeetingEditor: vi.fn(),
    getPersonValue: vi.fn(),
    ensurePersonInput: vi.fn(),
    getActiveEditorContainer: vi.fn(),
    escapeHtml: (s) => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    escapeJsString: (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r'),
    AGENDA_TYPE_LABELS: { goal_management: '目标管理', budget_finance: '预算财务' },
    openReportAssetManager: vi.fn(),
    openPostponeTargetSelector: vi.fn(),
  },
  document: {
    getElementById: vi.fn(() => ({ value: '', style: {}, addEventListener: vi.fn(), querySelector: vi.fn(), querySelectorAll: vi.fn(() => []), innerHTML: '', textContent: '' })),
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
  },
  DSTE: { Storage: { get: vi.fn(() => ({})), set: vi.fn(), getString: vi.fn(() => '') } },
  fetch: vi.fn(),
});

let mockMeetings = [];
vi.mock('../../src/meetings/data-store.js', () => ({
  getMeetings: () => mockMeetings,
  addMeeting: (m) => { mockMeetings.push(m); },
  persistMeetings: () => {},
  deleteMeetingByIndex: (idx) => { mockMeetings.splice(idx, 1); },
}));

const editor = await import('../../src/meetings/renderers/meeting-editor.js');

beforeEach(() => {
  // Reset mutable mocks and window state
  mockMeetings = [];
  window._meetingEditData = null;
  window._userEditedFields = new Set();
  window._agendaReviewMode = false;
  window._agendaBatchSelections = new Set();
  window._agendaReviewing = new Set();
  window.showToast.mockClear();
  window.navigate.mockClear();
  window.openMeetingDetail.mockClear();
  document.getElementById.mockReturnValue({ value: '', style: {}, addEventListener: vi.fn(), querySelector: vi.fn(), querySelectorAll: vi.fn(() => []), innerHTML: '', textContent: '' });
});

describe('extractTitleKeywords', () => {
  it('removes dates, numbers and filters short words', () => {
    expect(editor.extractTitleKeywords('2026年5月营销经分会')).toEqual(['营销经分会']);
  });

  it('removes Q-quarter markers', () => {
    expect(editor.extractTitleKeywords('Q2战区述职会')).toEqual(['战区述职会']);
  });

  it('returns empty array for empty or null input', () => {
    expect(editor.extractTitleKeywords('')).toEqual([]);
    expect(editor.extractTitleKeywords(null)).toEqual([]);
  });

  it('filters out single-character words', () => {
    expect(editor.extractTitleKeywords('A B 营销')).toEqual(['营销']);
  });
});

describe('findBestMeetingMatch', () => {
  it('returns the best match based on keyword overlap', () => {
    mockMeetings = [
      { id: 'm1', title: '营销本部月度经分会' },
      { id: 'm2', title: '战区-季度述职会' },
    ];
    const result = editor.findBestMeetingMatch('战区-经分会');
    expect(result).not.toBeNull();
    expect(result.id).toBe('m2');
  });

  it('returns null when no meetings exist', () => {
    mockMeetings = [];
    expect(editor.findBestMeetingMatch('某会议')).toBeNull();
  });

  it('returns null when no keyword overlap meets threshold', () => {
    mockMeetings = [{ id: 'm1', title: '完全不同的会议名称' }];
    expect(editor.findBestMeetingMatch('abc xyz')).toBeNull();
  });

  it('returns null for empty input', () => {
    mockMeetings = [{ id: 'm1', title: '某会议' }];
    expect(editor.findBestMeetingMatch('')).toBeNull();
  });
});

describe('applyKeywordRules', () => {
  it('maps multi-keyword rules to scenario/level', () => {
    expect(editor.applyKeywordRules('落后垂直行业分析')).toEqual({ scenario: 'lagging_vertical', level: 'L3' });
  });

  it('falls back to single-keyword rules', () => {
    expect(editor.applyKeywordRules('落后战区分析')).toEqual({ scenario: 'lagging_region', level: 'L3' });
  });

  it('returns null when no keywords match', () => {
    expect(editor.applyKeywordRules('普通会议')).toBeNull();
  });

  it('matches more specific rules first', () => {
    expect(editor.applyKeywordRules('营销本部经分会')).toEqual({ scenario: 'hq_routine', level: 'L2' });
  });
});

describe('inferDateFromTitle', () => {
  const year = new Date().getFullYear();

  it('handles full Chinese date', () => {
    expect(editor.inferDateFromTitle('2026年5月11日会议')).toBe('2026-05-11');
  });

  it('handles month-day Chinese format', () => {
    expect(editor.inferDateFromTitle('5月11号会议')).toBe(`${year}-05-11`);
  });

  it('handles ISO date format', () => {
    expect(editor.inferDateFromTitle('会议 2026-05-11')).toBe('2026-05-11');
  });

  it('handles month-only format', () => {
    expect(editor.inferDateFromTitle('5月会议')).toBe(`${year}-05-01`);
  });

  it('handles quarter format', () => {
    expect(editor.inferDateFromTitle('Q2季度会')).toBe(`${year}-04-01`);
  });

  it('returns null when no date found', () => {
    expect(editor.inferDateFromTitle('普通会议')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(editor.inferDateFromTitle('')).toBeNull();
    expect(editor.inferDateFromTitle(null)).toBeNull();
  });
});

describe('computeAgendaTimeSlots', () => {
  it('calculates slots correctly across hours', () => {
    const meeting = {
      startTime: '09:00',
      agenda_items: [
        { duration: 30 },
        { duration: 45 },
        { duration: 15 },
      ],
    };
    const slots = computeAgendaTimeSlots(meeting);
    expect(slots).toEqual([
      { start: '09:00', end: '09:30' },
      { start: '09:30', end: '10:15' },
      { start: '10:15', end: '10:30' },
    ]);
  });

  it('uses default start time when not specified', () => {
    const meeting = {
      agenda_items: [{ duration: 60 }],
    };
    const slots = computeAgendaTimeSlots(meeting);
    expect(slots).toEqual([{ start: '09:00', end: '10:00' }]);
  });

  it('returns empty array when no agenda items', () => {
    expect(computeAgendaTimeSlots({ agenda_items: [] })).toEqual([]);
  });

  it('handles items with missing duration', () => {
    const meeting = {
      startTime: '14:00',
      agenda_items: [{ duration: null }, { duration: 20 }],
    };
    const slots = computeAgendaTimeSlots(meeting);
    expect(slots).toEqual([
      { start: '14:00', end: '14:00' },
      { start: '14:00', end: '14:20' },
    ]);
  });
});

describe('addAgendaItem', () => {
  beforeEach(() => {
    window._meetingEditData = { agenda_items: [] };
  });

  it('adds a new agenda to _meetingEditData.agenda_items', () => {
    editor.addAgendaItem();
    expect(window._meetingEditData.agenda_items.length).toBe(1);
    const item = window._meetingEditData.agenda_items[0];
    expect(item.type).toBe('goal_management');
    expect(item.title).toBe('新议程项');
    expect(item.duration).toBe(15);
    expect(item.status).toBe('planned');
    expect(item.id).toMatch(/^ag_\d+_\d+$/);
  });

  it('initializes agenda_items array if missing', () => {
    window._meetingEditData = {};
    editor.addAgendaItem();
    expect(window._meetingEditData.agenda_items.length).toBe(1);
  });

  it('does nothing when _meetingEditData is null', () => {
    window._meetingEditData = null;
    expect(() => editor.addAgendaItem()).not.toThrow();
  });
});

describe('removeAgendaItem', () => {
  beforeEach(() => {
    window._meetingEditData = {
      agenda_items: [
        { id: 'ag_1', title: '议题一' },
        { id: 'ag_2', title: '议题二' },
      ],
    };
  });

  it('removes an agenda item by index', () => {
    editor.removeAgendaItem(0);
    expect(window._meetingEditData.agenda_items.length).toBe(1);
    expect(window._meetingEditData.agenda_items[0].title).toBe('议题二');
  });

  it('shows toast when only one item left', () => {
    window._meetingEditData.agenda_items = [{ id: 'ag_1', title: '唯一议题' }];
    editor.removeAgendaItem(0);
    expect(window.showToast).toHaveBeenCalledWith('至少保留一个议程项', 'warning');
    expect(window._meetingEditData.agenda_items.length).toBe(1);
  });

  it('cleans cross-references in decisions and actions', () => {
    window._meetingEditData.decisions = [{ sourceTopicId: 'ag_1' }];
    window._meetingEditData.actions = [{ sourceAgendaId: 'ag_1' }];
    editor.removeAgendaItem(0);
    expect(window._meetingEditData.decisions[0].sourceTopicId).toBe('');
    expect(window._meetingEditData.actions[0].sourceAgendaId).toBe('');
  });

  it('does nothing when _meetingEditData or agenda_items is missing', () => {
    window._meetingEditData = null;
    expect(() => editor.removeAgendaItem(0)).not.toThrow();
  });
});

describe('moveAgendaItem', () => {
  beforeEach(() => {
    window._meetingEditData = {
      agenda_items: [
        { id: 'ag_1', title: '第一' },
        { id: 'ag_2', title: '第二' },
        { id: 'ag_3', title: '第三' },
      ],
    };
  });

  it('swaps adjacent items moving down', () => {
    editor.moveAgendaItem(0, 1);
    expect(window._meetingEditData.agenda_items[0].title).toBe('第二');
    expect(window._meetingEditData.agenda_items[1].title).toBe('第一');
  });

  it('swaps adjacent items moving up', () => {
    editor.moveAgendaItem(2, -1);
    expect(window._meetingEditData.agenda_items[1].title).toBe('第三');
    expect(window._meetingEditData.agenda_items[2].title).toBe('第二');
  });

  it('does nothing when moving out of bounds', () => {
    editor.moveAgendaItem(0, -1);
    expect(window._meetingEditData.agenda_items[0].title).toBe('第一');
    editor.moveAgendaItem(2, 1);
    expect(window._meetingEditData.agenda_items[2].title).toBe('第三');
  });

  it('does nothing when agenda_items is missing', () => {
    window._meetingEditData = null;
    expect(() => editor.moveAgendaItem(0, 1)).not.toThrow();
  });
});

describe('addActionItem', () => {
  beforeEach(() => {
    window._meetingEditData = { actions: [] };
  });

  it('adds a new action item to _meetingEditData.actions', () => {
    editor.addActionItem();
    expect(window._meetingEditData.actions.length).toBe(1);
    const item = window._meetingEditData.actions[0];
    expect(item.content).toBe('');
    expect(item.status).toBe('pending');
    expect(item.id).toMatch(/^A\d+_\d+$/);
    expect(item.deadline).toBe(new Date().toISOString().split('T')[0]);
  });

  it('initializes actions array if missing', () => {
    window._meetingEditData = {};
    editor.addActionItem();
    expect(window._meetingEditData.actions.length).toBe(1);
  });

  it('does nothing when _meetingEditData is null', () => {
    window._meetingEditData = null;
    expect(() => editor.addActionItem()).not.toThrow();
  });
});

describe('removeActionItem', () => {
  beforeEach(() => {
    window._meetingEditData = {
      actions: [
        { id: 'A1', content: '行动一' },
        { id: 'A2', content: '行动二' },
      ],
    };
  });

  it('removes an action item by index', () => {
    editor.removeActionItem(0);
    expect(window._meetingEditData.actions.length).toBe(1);
    expect(window._meetingEditData.actions[0].content).toBe('行动二');
  });

  it('does nothing when actions array is missing', () => {
    window._meetingEditData = null;
    expect(() => editor.removeActionItem(0)).not.toThrow();
  });
});

describe('addDecisionItem', () => {
  beforeEach(() => {
    window._meetingEditData = { id: 'm1', title: '测试会议', decisions: [] };
  });

  it('adds a new decision item to _meetingEditData.decisions', () => {
    editor.addDecisionItem();
    expect(window._meetingEditData.decisions.length).toBe(1);
    const item = window._meetingEditData.decisions[0];
    expect(item.content).toBe('');
    expect(item.status).toBe('pending');
    expect(item.sourceMeetingId).toBe('m1');
    expect(item.sourceMeetingTitle).toBe('测试会议');
  });

  it('initializes decisions array if missing', () => {
    window._meetingEditData = { id: 'm1', title: '测试' };
    editor.addDecisionItem();
    expect(window._meetingEditData.decisions.length).toBe(1);
  });

  it('does nothing when _meetingEditData is null', () => {
    window._meetingEditData = null;
    expect(() => editor.addDecisionItem()).not.toThrow();
  });
});

describe('removeDecisionItem', () => {
  beforeEach(() => {
    window._meetingEditData = {
      decisions: [
        { id: 'D1', content: '决议一' },
        { id: 'D2', content: '决议二' },
      ],
      actions: [
        { sourceDecisionId: 'D1' },
        { sourceDecisionId: 'D2' },
      ],
    };
  });

  it('removes a decision item by index', () => {
    editor.removeDecisionItem(0);
    expect(window._meetingEditData.decisions.length).toBe(1);
    expect(window._meetingEditData.decisions[0].content).toBe('决议二');
  });

  it('cleans cross-references in actions', () => {
    editor.removeDecisionItem(0);
    expect(window._meetingEditData.actions[0].sourceDecisionId).toBe('');
    expect(window._meetingEditData.actions[1].sourceDecisionId).toBe('D2');
  });

  it('does nothing when decisions array is missing', () => {
    window._meetingEditData = null;
    expect(() => editor.removeDecisionItem(0)).not.toThrow();
  });
});

describe('saveMeeting', () => {
  beforeEach(() => {
    window._meetingEditData = {
      id: 'new_test',
      agenda_items: [{ id: 'ag_1', title: '议题', duration: 30 }],
      actions: [],
      decisions: [],
    };
    // Mock document.getElementById to return inputs with values
    const inputs = {
      'edit-meeting-id': { value: 'new_test' },
      'edit-title': { value: '' },
      'edit-date': { value: '' },
      'edit-start-time': { value: '09:00' },
      'edit-location': { value: '' },
      'edit-scenario': { value: 'hq_routine' },
      'edit-level': { value: 'L2' },
      'edit-status': { value: 'planned' },
      'edit-kms-link': { value: '' },
      'edit-pre-report-id': { value: '' },
      'edit-minutes-content': { value: '' },
    };
    document.getElementById = vi.fn((id) => inputs[id] || { value: '' });
  });

  it('shows toast when title is empty', () => {
    editor.saveMeeting();
    expect(window.showToast).toHaveBeenCalledWith('会议名称不能为空', 'warning');
  });

  it('shows toast when date is empty', () => {
    document.getElementById = vi.fn((id) => {
      if (id === 'edit-title') return { value: '测试会议' };
      if (id === 'edit-date') return { value: '' };
      return { value: '' };
    });
    editor.saveMeeting();
    expect(window.showToast).toHaveBeenCalledWith('会议日期不能为空', 'warning');
  });

  it('shows error toast when _meetingEditData is null', () => {
    window._meetingEditData = null;
    editor.saveMeeting();
    expect(window.showToast).toHaveBeenCalledWith('编辑数据丢失，请重新打开编辑窗口', 'error');
  });
});
