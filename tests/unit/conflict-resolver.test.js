import { describe, it, expect } from 'vitest';

const {
  compareTimestamp,
  detectArrayConflicts,
  resolveArrayConflict,
  ensureLastModified,
} = await import('../../src/lib/conflict-resolver.js');

describe('conflict-resolver', () => {
  describe('compareTimestamp', () => {
    it('identifies local as newer', () => {
      expect(compareTimestamp(2000, 1000)).toBe('local');
    });

    it('identifies remote as newer', () => {
      expect(compareTimestamp(1000, 2000)).toBe('remote');
    });

    it('identifies equal timestamps', () => {
      expect(compareTimestamp(1000, 1000)).toBe('equal');
    });

    it('returns unknown for invalid values', () => {
      expect(compareTimestamp('abc', 1000)).toBe('unknown');
    });
  });

  describe('detectArrayConflicts', () => {
    it('detects remote winner conflicts', () => {
      const local = [{ id: 'a', lastModified: 1000 }];
      const remote = [{ id: 'a', lastModified: 2000 }];
      const conflicts = detectArrayConflicts(local, remote);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].winner).toBe('remote');
    });

    it('ignores local newer and equal items', () => {
      const local = [{ id: 'a', lastModified: 2000 }, { id: 'b', lastModified: 1000 }];
      const remote = [{ id: 'a', lastModified: 1000 }, { id: 'b', lastModified: 1000 }];
      const conflicts = detectArrayConflicts(local, remote);
      expect(conflicts).toHaveLength(0);
    });

    it('ignores items present only on one side', () => {
      const local = [{ id: 'a', lastModified: 1000 }];
      const remote = [{ id: 'b', lastModified: 2000 }];
      const conflicts = detectArrayConflicts(local, remote);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('resolveArrayConflict', () => {
    it('returns remote when strategy is remote', () => {
      const local = [{ id: 'a' }];
      const remote = [{ id: 'a', remote: true }];
      expect(resolveArrayConflict(local, remote, 'remote')).toBe(remote);
    });

    it('merges by timestamp', () => {
      const local = [{ id: 'a', lastModified: 2000 }, { id: 'b', lastModified: 500 }];
      const remote = [{ id: 'a', lastModified: 1000 }, { id: 'b', lastModified: 1500 }];
      const merged = resolveArrayConflict(local, remote, 'merge');
      expect(merged.find(i => i.id === 'a').lastModified).toBe(2000);
      expect(merged.find(i => i.id === 'b').lastModified).toBe(1500);
    });
  });

  describe('ensureLastModified', () => {
    it('adds lastModified to items missing it', () => {
      const items = [{ id: 'a' }, { id: 'b', lastModified: 1000 }];
      const result = ensureLastModified(items);
      expect(result[0].lastModified).toBeDefined();
      expect(result[1].lastModified).toBe(1000);
    });
  });
});
