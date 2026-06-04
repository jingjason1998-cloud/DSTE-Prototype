import { test, expect } from '@playwright/test';

test.describe('Meeting Pipeline Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/meetings.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    page.on('dialog', async dialog => {
      if (dialog.type() === 'confirm') {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
  });

  test('clicking pipeline step toggles status and persists to localStorage', async ({ page }) => {
    const cards = page.locator('.meeting-card');
    const count = await cards.count();
    let pipelineCardIndex = -1;
    let cardId = null;
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const hasPipeline = await card.locator('text=一报一会').isVisible().catch(() => false);
      if (hasPipeline) {
        pipelineCardIndex = i;
        cardId = await card.evaluate(el => {
          const onclick = el.getAttribute('onclick') || '';
          const match = onclick.match(/openMeetingDetail\('(.+?)'\)/);
          return match ? match[1] : null;
        });
        break;
      }
    }

    test.skip(pipelineCardIndex === -1 || !cardId, 'No meeting card with pipeline found');

    // Read in-memory state before click
    const beforeState = await page.evaluate((id) => {
      const m = window._meetingsData?.find(x => x.id === id);
      return m?.pipeline || null;
    }, cardId);

    expect(beforeState).not.toBeNull();

    // Find the first toggleable step
    const card = cards.nth(pipelineCardIndex);
    const pipelineSteps = card.locator('[onclick^="togglePipelineStep"]');
    const stepCount = await pipelineSteps.count();
    expect(stepCount).toBeGreaterThan(0);

    // Get the step key from the onclick attribute
    const stepKey = await pipelineSteps.nth(0).evaluate(el => {
      const onclick = el.getAttribute('onclick') || '';
      const match = onclick.match(/togglePipelineStep\('.*?',\s*'(.*?)'\)/);
      return match ? match[1] : null;
    });
    expect(stepKey).not.toBeNull();

    const beforeValue = beforeState[stepKey];

    // Click the first step
    await pipelineSteps.nth(0).click();
    await page.waitForTimeout(500);

    // Verify localStorage was updated
    const afterLocalState = await page.evaluate((id) => {
      const data = JSON.parse(localStorage.getItem('dste_meetings') || '[]');
      const m = data.find(x => x.id === id);
      return m?.pipeline || null;
    }, cardId);

    expect(afterLocalState).not.toBeNull();
    expect(afterLocalState[stepKey]).toBe(!beforeValue);
  });

  test('no JavaScript errors when toggling pipeline step', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const cards = page.locator('.meeting-card');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const hasPipeline = await cards.nth(i).locator('text=一报一会').isVisible().catch(() => false);
      if (hasPipeline) {
        const steps = cards.nth(i).locator('[onclick^="togglePipelineStep"]');
        if (await steps.count() > 0) {
          await steps.nth(0).click();
          await page.waitForTimeout(300);
          break;
        }
      }
    }

    expect(errors).toEqual([]);
  });
});
