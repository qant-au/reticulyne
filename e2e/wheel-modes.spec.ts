import { expect, test, Page } from '@playwright/test';

/**
 * FEA5-01 — wheel input semantics.
 *
 * The editor's wheel handler routes events two ways:
 *   - Plain wheel / trackpad scroll → PAN (deltaY vertical, deltaX
 *     horizontal). Zoom stays put.
 *   - Ctrl+wheel or Cmd+wheel → ZOOM (deltaY only). Pinch-zoom on
 *     trackpads already arrives with ctrlKey synthesised by the
 *     browser, so it follows the zoom path too.
 *
 * We probe the contract through the visible zoom-percentage chip in
 * ZoomControls (e.g. "100%"). If zoom changes the chip updates; if
 * it doesn't, the chip stays at 100%.
 */

async function readZoomPercent(page: Page): Promise<number> {
  // The chip renders as "<n>%". Match the first occurrence in
  // the toolbar — there's only one ZoomControls instance.
  const text = await page
    .locator('text=/^[0-9]+%$/')
    .first()
    .textContent();
  if (!text) throw new Error('zoom percent chip not found');
  return Number(text.replace('%', ''));
}

test.describe('FEA5-01 — wheel input semantics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Reticulyne/);
    // Park the cursor in the middle of the canvas so wheel events
    // land on the renderer, not on the toolbar.
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    await page.mouse.move(viewport!.width / 2, viewport!.height / 2);
    // Wait until the zoom chip is mounted; it sits at 100% on a
    // fresh editor.
    await expect(async () => {
      expect(await readZoomPercent(page)).toBe(100);
    }).toPass();
  });

  test('plain wheel does NOT change zoom (pan branch)', async ({ page }) => {
    for (let i = 0; i < 5; i += 1) {
      await page.mouse.wheel(0, 100);
    }
    await page.waitForTimeout(150);
    expect(await readZoomPercent(page)).toBe(100);
  });

  test('Ctrl+wheel zooms out on positive deltaY', async ({ page }) => {
    await page.keyboard.down('Control');
    for (let i = 0; i < 3; i += 1) {
      await page.mouse.wheel(0, 100);
    }
    await page.keyboard.up('Control');
    await page.waitForTimeout(150);
    expect(await readZoomPercent(page)).toBeLessThan(100);
  });

  test('Ctrl+wheel zooms in on negative deltaY', async ({ page }) => {
    // The editor opens at MAX_ZOOM (100%), so zoom out first to give
    // the zoom-in path somewhere to climb back to.
    await page.keyboard.down('Control');
    for (let i = 0; i < 3; i += 1) {
      await page.mouse.wheel(0, 100);
    }
    await page.waitForTimeout(150);
    const afterZoomOut = await readZoomPercent(page);
    expect(afterZoomOut).toBeLessThan(100);

    for (let i = 0; i < 2; i += 1) {
      await page.mouse.wheel(0, -100);
    }
    await page.keyboard.up('Control');
    await page.waitForTimeout(150);
    expect(await readZoomPercent(page)).toBeGreaterThan(afterZoomOut);
  });

  test('Cmd+wheel also zooms (Mac cross-platform parity)', async ({ page }) => {
    // Same caveat: zoom-out first, then verify Cmd+wheel reverses.
    await page.keyboard.down('Meta');
    for (let i = 0; i < 3; i += 1) {
      await page.mouse.wheel(0, 100);
    }
    await page.waitForTimeout(150);
    const afterZoomOut = await readZoomPercent(page);
    expect(afterZoomOut).toBeLessThan(100);

    for (let i = 0; i < 2; i += 1) {
      await page.mouse.wheel(0, -100);
    }
    await page.keyboard.up('Meta');
    await page.waitForTimeout(150);
    expect(await readZoomPercent(page)).toBeGreaterThan(afterZoomOut);
  });
});
