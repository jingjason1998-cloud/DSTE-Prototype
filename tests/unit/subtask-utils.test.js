import { describe, it, expect } from 'vitest';
import {
  isSubtask,
  getSubtasks,
  hasSubtasks,
  calculateParentProgress,
  recalculateParentProgress,
  collectCascadeDeleteIds,
  validateSubtask,
  generateSubtaskId,
} from '../../src/lib/subtask-utils.js';

describe('subtask-utils', () => {
  describe('isSubtask', () => {
    it('returns true when parentId exists', () => {
      expect(isSubtask({ id: 's1', parentId: 'p1' })).toBe(true);
    });
    it('returns false when parentId is missing or empty', () => {
      expect(isSubtask({ id: 'p1' })).toBe(false);
      expect(isSubtask({ id: 'p1', parentId: '' })).toBe(false);
      expect(isSubtask(null)).toBe(false);
    });
  });

  describe('getSubtasks', () => {
    it('returns subtasks sorted by seq', () => {
      const tasks = [
        { id: 'p1', parentId: undefined },
        { id: 's2', parentId: 'p1', seq: 2 },
        { id: 's1', parentId: 'p1', seq: 1 },
        { id: 's3', parentId: 'p1', seq: 3 },
      ];
      const result = getSubtasks(tasks, 'p1');
      expect(result.map(t => t.id)).toEqual(['s1', 's2', 's3']);
    });
    it('returns empty array for non-array input', () => {
      expect(getSubtasks(null, 'p1')).toEqual([]);
      expect(getSubtasks(undefined, 'p1')).toEqual([]);
    });
  });

  describe('hasSubtasks', () => {
    it('returns true when subtasks exist', () => {
      expect(hasSubtasks([{ id: 's1', parentId: 'p1' }], 'p1')).toBe(true);
    });
    it('returns false when no subtasks', () => {
      expect(hasSubtasks([{ id: 'p1' }], 'p1')).toBe(false);
    });
  });

  describe('calculateParentProgress', () => {
    it('calculates weighted average progress', () => {
      const tasks = [
        { id: 'p1' },
        { id: 's1', parentId: 'p1', progress: 50, weight: 1 },
        { id: 's2', parentId: 'p1', progress: 100, weight: 3 },
      ];
      // (50*1 + 100*3) / 4 = 350/4 = 87.5 -> 88
      expect(calculateParentProgress(tasks, 'p1')).toBe(88);
    });
    it('uses default weight 1 when missing', () => {
      const tasks = [
        { id: 'p1' },
        { id: 's1', parentId: 'p1', progress: 0 },
        { id: 's2', parentId: 'p1', progress: 100 },
      ];
      expect(calculateParentProgress(tasks, 'p1')).toBe(50);
    });
    it('returns null when no subtasks', () => {
      expect(calculateParentProgress([{ id: 'p1' }], 'p1')).toBeNull();
    });
  });

  describe('recalculateParentProgress', () => {
    it('updates parent progress and returns true', () => {
      const tasks = [
        { id: 'p1', progress: 0 },
        { id: 's1', parentId: 'p1', progress: 50, weight: 1 },
        { id: 's2', parentId: 'p1', progress: 100, weight: 1 },
      ];
      const changed = recalculateParentProgress(tasks, 'p1');
      expect(changed).toBe(true);
      expect(tasks.find(t => t.id === 'p1').progress).toBe(75);
    });
    it('skips when progressOverridden is true', () => {
      const tasks = [
        { id: 'p1', progress: 10, progressOverridden: true },
        { id: 's1', parentId: 'p1', progress: 100, weight: 1 },
      ];
      const changed = recalculateParentProgress(tasks, 'p1');
      expect(changed).toBe(false);
      expect(tasks.find(t => t.id === 'p1').progress).toBe(10);
    });
    it('returns false when no change', () => {
      const tasks = [
        { id: 'p1', progress: 50 },
        { id: 's1', parentId: 'p1', progress: 50, weight: 1 },
      ];
      const changed = recalculateParentProgress(tasks, 'p1');
      expect(changed).toBe(false);
    });
  });

  describe('collectCascadeDeleteIds', () => {
    it('collects parent and all subtasks', () => {
      const tasks = [
        { id: 'p1' },
        { id: 's1', parentId: 'p1' },
        { id: 's2', parentId: 'p1' },
        { id: 'other' },
      ];
      const ids = collectCascadeDeleteIds(tasks, 'p1');
      expect(Array.from(ids).sort()).toEqual(['p1', 's1', 's2']);
    });
  });

  describe('validateSubtask', () => {
    it('validates correct subtask', () => {
      const result = validateSubtask({
        parentId: 'p1',
        source: 'omp',
        annualPlanTaskId: null,
        name: '子任务',
        owner: '张三',
      }, 'p1');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
    it('reports mismatched parentId', () => {
      const result = validateSubtask({ parentId: 'p2', source: 'omp', name: 'x', owner: 'y' }, 'p1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('parentId 不匹配');
    });
    it('reports non-omp source', () => {
      const result = validateSubtask({ parentId: 'p1', source: 'annual_plan', name: 'x', owner: 'y' }, 'p1');
      expect(result.errors).toContain('子任务 source 必须是 omp');
    });
    it('reports annualPlanTaskId', () => {
      const result = validateSubtask({ parentId: 'p1', source: 'omp', annualPlanTaskId: 'a1', name: 'x', owner: 'y' }, 'p1');
      expect(result.errors).toContain('子任务不能有 annualPlanTaskId');
    });
  });

  describe('generateSubtaskId', () => {
    it('generates unique ids with subtask_ prefix', () => {
      const id1 = generateSubtaskId();
      const id2 = generateSubtaskId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^subtask_\d+/);
    });
  });
});
