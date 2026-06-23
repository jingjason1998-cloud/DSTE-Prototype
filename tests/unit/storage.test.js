import { describe, it, expect, beforeEach, vi } from 'vitest';

// Keep a reference to real localStorage if needed; we use a map-backed mock here.
const storageMap = new Map();
const quotaError = new Error('QuotaExceededError');
quotaError.name = 'QuotaExceededError';
quotaError.code = 22;

let shouldThrowQuota = false;

const mockLocalStorage = {
  getItem: (key) => storageMap.get(key) ?? null,
  setItem: (key, value) => {
    if (shouldThrowQuota) throw quotaError;
    storageMap.set(key, value);
  },
  removeItem: (key) => storageMap.delete(key),
  key: (index) => Array.from(storageMap.keys())[index] || null,
  get length() { return storageMap.size; },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

// Provide minimal document for showToast
Object.defineProperty(globalThis, 'document', {
  value: {
    getElementById: () => null,
    createElement: () => ({
      set style(_) {},
      set textContent(_) {},
      appendChild: () => {},
      remove: () => {},
    }),
    body: { appendChild: () => {} },
  },
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, 'requestAnimationFrame', {
  value: (cb) => cb(),
  writable: true,
  configurable: true,
});

const { Storage } = await import('../../src/lib/utils.js');

describe('Storage wrapper', () => {
  beforeEach(() => {
    storageMap.clear();
    shouldThrowQuota = false;
  });

  describe('quota handling', () => {
    it('returns false and shows toast on QuotaExceededError for set', () => {
      shouldThrowQuota = true;
      const result = Storage.set('key', { value: 'x' });
      expect(result).toBe(false);
    });

    it('returns false on QuotaExceededError for setString', () => {
      shouldThrowQuota = true;
      const result = Storage.setString('key', 'x');
      expect(result).toBe(false);
    });

    it('returns true on normal set', () => {
      const result = Storage.set('key', { value: 'x' });
      expect(result).toBe(true);
      expect(Storage.get('key')).toEqual({ value: 'x' });
    });
  });

  describe('checkQuota', () => {
    it('returns ok:true when storage has space', () => {
      const result = Storage.checkQuota();
      expect(result.ok).toBe(true);
      expect(result.usedBytes).toBeGreaterThanOrEqual(0);
    });

    it('returns ok:false when quota is exceeded', () => {
      shouldThrowQuota = true;
      const result = Storage.checkQuota();
      expect(result.ok).toBe(false);
      expect(result.message).toContain('quota');
    });
  });

  describe('estimateSize', () => {
    it('estimates JSON string size in bytes', () => {
      const size = Storage.estimateSize({ a: 1 });
      expect(size).toBe(JSON.stringify({ a: 1 }).length * 2);
    });
  });
});
