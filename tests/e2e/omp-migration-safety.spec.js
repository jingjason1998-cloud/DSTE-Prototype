import { test, expect } from '@playwright/test';

test.describe('OMP migration safety', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/cockpit.html#exe/tasks');
  });

  test('OMP data survives version bump', async ({ page }) => {
    // Seed custom OMP data and an old version marker
    await page.evaluate(() => {
      localStorage.setItem('dste_omp_data_version', 'canvas-v10');
      localStorage.setItem('dste_omp_indicators_v1', JSON.stringify([
        { id: 'custom_ind', name: 'Custom Indicator', code: 'CUST_001' },
      ]));
      localStorage.setItem('dste_omp_tasks_v1', JSON.stringify([
        { id: 'custom_task', name: 'Custom Task', status: 'in_progress' },
      ]));
    });

    // Reload to trigger omp_initData
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify version was migrated but data was not wiped
    const version = await page.evaluate(() => localStorage.getItem('dste_omp_data_version'));
    expect(version).toBe('canvas-v11');

    const indicators = await page.evaluate(() => JSON.parse(localStorage.getItem('dste_omp_indicators_v1') || '[]'));
    expect(indicators).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'custom_ind', name: 'Custom Indicator' }),
    ]));

    const tasks = await page.evaluate(() => JSON.parse(localStorage.getItem('dste_omp_tasks_v1') || '[]'));
    expect(tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'custom_task', name: 'Custom Task' }),
    ]));
  });

  test('legacy flat backup keys are cleaned up on version bump', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('dste_omp_data_version', 'canvas-v10');
      localStorage.setItem('dste_omp_backup_before_canvas-v10', JSON.stringify({ old: true }));
      localStorage.setItem('dste_omp_backup_before_unknown', JSON.stringify({ older: true }));
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const legacyKeys = await page.evaluate(() => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('dste_omp_backup_before_')) keys.push(key);
      }
      return keys;
    });
    expect(legacyKeys).toEqual([]);
  });
});
