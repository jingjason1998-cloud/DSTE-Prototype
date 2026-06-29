import { test, expect } from '@playwright/test';

test.describe('Meetings storage resilience', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/meetings.html');
    await page.waitForLoadState('networkidle');
  });

  test('corrupted meetings localStorage falls back to mock data on localhost', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('dste_meetings', 'not-valid-json');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for the app to initialize and verify runtime data is populated
    const meetings = await page.evaluate(() => window._meetingsData);
    expect(Array.isArray(meetings)).toBe(true);
    expect(meetings.length).toBeGreaterThan(0);
  });

  test('meetings data version is persisted', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('dste_meetings', JSON.stringify([{ id: 'm1', title: 'M1' }]));
      localStorage.setItem('dste_meetings_version', '1');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const version = await page.evaluate(() => localStorage.getItem('dste_meetings_version'));
    expect(version).toBe('5');
  });
});
