import { describe, it, expect, beforeEach } from 'vitest';
import {
  RESOLUTION_STATUS_CONFIG,
  RESOLUTION_STATUSES,
  canTransitionResolutionStatus,
  getResolutionStatusConfig,
  createDefaultResolution,
  migrateResolutionStatus,
  normalizeResolution,
  migrateDecisionData,
  computeResolutionProgress,
  buildResolutionsMap,
  getResolutionsFromStore,
  saveResolutionsToStore,
  syncResolutionsToStore,
  computeResolutionStats,
  addApprovalLog,
  advanceResolutionStatus,
  RESOLUTIONS_STORE_KEY,
} from '../../src/meetings/utils/resolution-helpers.js';

// mock localStorage for Node test environment
const mockStorage = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key) => (key in mockStorage ? mockStorage[key] : null),
    setItem: (key, val) => { mockStorage[key] = String(val); },
    removeItem: (key) => { delete mockStorage[key]; },
  },
  writable: true,
  configurable: true,
});

describe('RESOLUTION_STATUS_CONFIG', () => {
  it('contains 3 simplified statuses', () => {
    expect(RESOLUTION_STATUSES).toEqual(['pending', 'approved', 'closed']);
    expect(RESOLUTION_STATUS_CONFIG.pending.label).toBe('待审批');
    expect(RESOLUTION_STATUS_CONFIG.approved.label).toBe('已通过');
    expect(RESOLUTION_STATUS_CONFIG.closed.label).toBe('已闭环');
  });
});

describe('canTransitionResolutionStatus', () => {
  it('allows pending -> approved and closed', () => {
    expect(canTransitionResolutionStatus('pending', 'approved')).toBe(true);
    expect(canTransitionResolutionStatus('pending', 'closed')).toBe(true);
  });

  it('allows approved -> closed', () => {
    expect(canTransitionResolutionStatus('approved', 'closed')).toBe(true);
  });

  it('does not allow approved -> pending', () => {
    expect(canTransitionResolutionStatus('approved', 'pending')).toBe(false);
  });

  it('allows same status', () => {
    expect(canTransitionResolutionStatus('approved', 'approved')).toBe(true);
  });

  it('blocks transitions from terminal state', () => {
    expect(canTransitionResolutionStatus('closed', 'pending')).toBe(false);
    expect(canTransitionResolutionStatus('closed', 'approved')).toBe(false);
  });
});

describe('getResolutionStatusConfig', () => {
  it('returns config for known status', () => {
    expect(getResolutionStatusConfig('closed').label).toBe('已闭环');
  });

  it('falls back to pending for unknown status', () => {
    expect(getResolutionStatusConfig('unknown').label).toBe('待审批');
  });
});

describe('createDefaultResolution', () => {
  it('creates a default resolution with id and timestamps', () => {
    const r = createDefaultResolution({ content: 'test' });
    expect(r.id).toMatch(/^D\d+_\d+$/);
    expect(r.content).toBe('test');
    expect(r.status).toBe('pending');
    expect(r.approvalLogs).toEqual([]);
    expect(r.actions).toEqual([]);
    expect(r.createdAt).toBeTruthy();
    expect(r.updatedAt).toBeTruthy();
  });
});

describe('migrateResolutionStatus', () => {
  it('maps pending/pending_approval/draft to pending', () => {
    expect(migrateResolutionStatus('pending')).toBe('pending');
    expect(migrateResolutionStatus('pending_approval')).toBe('pending');
    expect(migrateResolutionStatus('draft')).toBe('pending');
  });

  it('maps approved/executing to approved', () => {
    expect(migrateResolutionStatus('approved')).toBe('approved');
    expect(migrateResolutionStatus('executing')).toBe('approved');
  });

  it('maps all terminal old statuses to closed', () => {
    expect(migrateResolutionStatus('implemented')).toBe('closed');
    expect(migrateResolutionStatus('closed')).toBe('closed');
    expect(migrateResolutionStatus('archived')).toBe('closed');
    expect(migrateResolutionStatus('rejected')).toBe('closed');
    expect(migrateResolutionStatus('vetoed')).toBe('closed');
    expect(migrateResolutionStatus('aborted')).toBe('closed');
  });

  it('defaults to pending for unknown status', () => {
    expect(migrateResolutionStatus('unknown')).toBe('pending');
  });
});

describe('normalizeResolution', () => {
  it('normalizes old status and adds missing fields', () => {
    const r = normalizeResolution({ content: 'test', status: 'approved' }, { id: 'm1', title: 'M1' });
    expect(r.status).toBe('approved');
    expect(r.sourceMeetingId).toBe('m1');
    expect(r.sourceMeetingTitle).toBe('M1');
    expect(r.approvalLogs).toEqual([]);
  });

  it('keeps new status if valid', () => {
    const r = normalizeResolution({ status: 'pending' });
    expect(r.status).toBe('pending');
  });

  it('migrates old status to simplified status', () => {
    const r = normalizeResolution({ status: 'executing' });
    expect(r.status).toBe('approved');
  });
});

describe('migrateDecisionData', () => {
  it('migrates all decisions in meetings', () => {
    const meetings = [
      { id: 'm1', decisions: [{ id: 'D1', status: 'pending' }] },
      { id: 'm2', decisions: [{ id: 'D2', status: 'implemented' }] },
      { id: 'm3', decisions: [{ id: 'D3', status: 'executing' }] },
    ];
    const migrated = migrateDecisionData(meetings);
    expect(migrated[0].decisions[0].status).toBe('pending');
    expect(migrated[1].decisions[0].status).toBe('closed');
    expect(migrated[2].decisions[0].status).toBe('approved');
  });
});

describe('computeResolutionProgress', () => {
  it('returns 0 when no actions', () => {
    expect(computeResolutionProgress({ actions: [] })).toBe(0);
  });

  it('computes average progress from actions map', () => {
    const decision = { actions: ['A1', 'A2'] };
    const actionsMap = { A1: { progress: 50 }, A2: { progress: 100 } };
    expect(computeResolutionProgress(decision, actionsMap)).toBe(75);
  });

  it('returns 100 for closed even without actions', () => {
    expect(computeResolutionProgress({ status: 'closed', actions: [] })).toBe(100);
  });
});

describe('buildResolutionsMap', () => {
  it('builds a map keyed by resolution id', () => {
    const meetings = [
      { id: 'm1', title: 'M1', decisions: [{ id: 'D1', content: 'C1' }], actions: [] },
    ];
    const map = buildResolutionsMap(meetings);
    expect(map.D1.content).toBe('C1');
    expect(map.D1.sourceMeetingTitle).toBe('M1');
  });

  it('computes progress from related actions', () => {
    const meetings = [
      {
        id: 'm1', title: 'M1',
        decisions: [{ id: 'D1', content: 'C1', actions: ['A1', 'A2'] }],
        actions: [{ id: 'A1', progress: 50 }, { id: 'A2', progress: 100 }],
      },
    ];
    const map = buildResolutionsMap(meetings);
    expect(map.D1.progress).toBe(75);
  });
});

describe('store sync', () => {
  beforeEach(() => {
    localStorage.removeItem(RESOLUTIONS_STORE_KEY);
  });

  it('syncs meetings to store', () => {
    const meetings = [
      { id: 'm1', title: 'M1', decisions: [{ id: 'D1', content: 'C1' }], actions: [] },
    ];
    const map = syncResolutionsToStore(meetings);
    expect(map.D1).toBeTruthy();
    const fromStore = getResolutionsFromStore();
    expect(fromStore.D1.content).toBe('C1');
  });
});

describe('computeResolutionStats', () => {
  it('computes total and closure rate', () => {
    const resolutions = [
      { status: 'closed' },
      { status: 'approved' },
      { status: 'pending' },
    ];
    const stats = computeResolutionStats(resolutions);
    expect(stats.total).toBe(3);
    expect(stats.closedCount).toBe(1);
    expect(stats.closureRate).toBe(33);
  });

  it('counts overdue excluding closed', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const resolutions = [
      { status: 'approved', deadline: yesterday.toISOString().slice(0, 10) },
      { status: 'closed', deadline: yesterday.toISOString().slice(0, 10) },
      { status: 'pending', deadline: tomorrow.toISOString().slice(0, 10) },
    ];
    const stats = computeResolutionStats(resolutions);
    expect(stats.overdueCount).toBe(1);
  });
});

describe('addApprovalLog', () => {
  it('adds a log entry and updates updatedAt', () => {
    const decision = { approvalLogs: [] };
    addApprovalLog(decision, 'approved', '张三', '同意');
    expect(decision.approvalLogs.length).toBe(1);
    expect(decision.approvalLogs[0].action).toBe('approved');
    expect(decision.approvalLogs[0].user).toBe('张三');
    expect(decision.updatedAt).toBeTruthy();
  });
});

describe('advanceResolutionStatus', () => {
  it('advances status and records log', () => {
    const decision = { status: 'pending', approvalLogs: [] };
    const result = advanceResolutionStatus(decision, 'approved', '张三', '同意');
    expect(result.success).toBe(true);
    expect(decision.status).toBe('approved');
    expect(decision.approvalLogs.length).toBe(1);
  });

  it('sets closedAt when transitioning to closed', () => {
    const decision = { status: 'approved', approvalLogs: [] };
    advanceResolutionStatus(decision, 'closed', '张三');
    expect(decision.status).toBe('closed');
    expect(decision.closedAt).toBeTruthy();
  });

  it('rejects invalid transition', () => {
    const decision = { status: 'closed', approvalLogs: [] };
    const result = advanceResolutionStatus(decision, 'pending', '张三');
    expect(result.success).toBe(false);
  });
});
