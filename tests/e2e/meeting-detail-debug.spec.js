import { test, expect } from '@playwright/test';

test.skip('debug clicking second card at specific area', async ({ page }) => {
  await page.goto('http://localhost:3456/src/cockpit.html#exe/meetings');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  const cards = page.locator('.meeting-card');
  const card = cards.nth(1);

  // Scroll card into view first
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const box = await card.boundingBox();
  console.log('Second card bounding box after scroll:', box);

  // Check elementFromPoint at center-right area
  const clickX = box.x + box.width * 0.75;
  const clickY = box.y + box.height * 0.35;

  const elementInfo = await page.evaluate(({x, y}) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    let current = el;
    const path = [];
    for (let i = 0; i < 5 && current; i++) {
      path.push({
        tagName: current.tagName,
        className: current.className,
        onclick: current.getAttribute('onclick'),
      });
      current = current.parentElement;
    }
    return path;
  }, { x: clickX, y: clickY });

  console.log('Element path at click position:', JSON.stringify(elementInfo, null, 2));

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  // Click at the specific area
  await page.mouse.click(clickX, clickY);
  await page.waitForTimeout(500);

  const overlay = page.locator('#meeting-detail-overlay');
  const isVisible = await overlay.isVisible().catch(() => false);
  console.log('Overlay visible after side click:', isVisible);
  console.log('JS errors:', errors);

  await page.screenshot({ path: 'test-results/after-side-click.png', fullPage: false });

  // Now click center of card
  if (!isVisible) {
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    await page.mouse.click(centerX, centerY);
    await page.waitForTimeout(500);
    const centerVisible = await overlay.isVisible().catch(() => false);
    console.log('Overlay visible after center click:', centerVisible);
    console.log('JS errors after center:', errors);
  }
});
