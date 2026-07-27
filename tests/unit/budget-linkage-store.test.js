import { describe, it, expect } from 'vitest';
import {
  ensureRowLink,
  addTaskLink,
  removeTaskLink,
  addSubtaskLink,
  removeSubtaskLink,
  addTopicLink,
  removeTopicLink,
  getLinkCount,
} from '../../src/pages/marketing-budget/budget-linkage-store.js';

describe('budget-linkage-store helpers', () => {
  it('ensureRowLink creates default entry when missing', () => {
    const linkages = {};
    const link = ensureRowLink(linkages, 5);
    expect(link).toEqual({ taskIds: [], subtaskIds: [], topicIds: [] });
    expect(linkages['5']).toBe(link);
  });

  it('addTaskLink appends unique task ids only', () => {
    const linkages = {};
    addTaskLink(linkages, 5, 'task_a');
    addTaskLink(linkages, 5, 'task_b');
    addTaskLink(linkages, 5, 'task_a');
    expect(linkages['5'].taskIds).toEqual(['task_a', 'task_b']);
  });

  it('removeTaskLink filters task id', () => {
    const linkages = { 5: { taskIds: ['task_a', 'task_b'], subtaskIds: [], topicIds: [] } };
    removeTaskLink(linkages, 5, 'task_a');
    expect(linkages['5'].taskIds).toEqual(['task_b']);
  });

  it('addSubtaskLink and addTopicLink work independently', () => {
    const linkages = {};
    addSubtaskLink(linkages, 10, 'sub_1');
    addTopicLink(linkages, 10, 'topic_1');
    expect(linkages['10']).toEqual({
      taskIds: [],
      subtaskIds: ['sub_1'],
      topicIds: ['topic_1'],
    });
  });

  it('removeSubtaskLink and removeTopicLink remove correct ids', () => {
    const linkages = {
      10: {
        taskIds: [],
        subtaskIds: ['sub_1', 'sub_2'],
        topicIds: ['topic_1'],
      },
    };
    removeSubtaskLink(linkages, 10, 'sub_1');
    removeTopicLink(linkages, 10, 'topic_1');
    expect(linkages['10']).toEqual({
      taskIds: [],
      subtaskIds: ['sub_2'],
      topicIds: [],
    });
  });

  it('getLinkCount sums task, subtask and topic ids', () => {
    const linkages = {
      5: {
        taskIds: ['task_1'],
        subtaskIds: ['sub_1', 'sub_2'],
        topicIds: ['topic_1'],
      },
    };
    expect(getLinkCount(linkages, 5)).toBe(4);
    expect(getLinkCount(linkages, 999)).toBe(0);
  });

  it('getLinkCount handles missing arrays gracefully', () => {
    const linkages = {
      5: { taskIds: ['task_1'] },
    };
    expect(getLinkCount(linkages, 5)).toBe(1);
  });
});
