import { expect, test } from '@playwright/test';

/**
 * BUG5-09 regression: the renderer's wheel listener calls
 * preventDefault() and is registered with `{ passive: false }`, so a
 * host page that mounts <Isoflow> inside a scrollable parent does
 * NOT see the parent scroll while the user is panning OR zooming the
 * canvas.
 *
 * The contract is the same regardless of which branch handles the
 * event (FEA5-01 split the wheel handler into pan vs zoom paths) —
 * preventDefault fires on both. We assert both paths below to make
 * sure neither regression-breaks the embedder guarantee.
 *
 * Repro: drive the dev container in `scrollParent: true` mode (see
 * src/index-docker.tsx) — an outer Box of height 200vh with
 * overflow:auto wraps the editor. Without preventDefault the outer
 * Box scrolls on every wheel tick.
 */
test.describe('BUG5-09 — wheel events do not scroll an embedding parent', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__RETICULYNE_E2E__ = {
        scrollParent: true
      };
    });
    await page.goto('/');
    await expect(page).toHaveTitle(/Isoflow/);

    const scrollParent = page.getByTestId('scroll-parent');
    await expect(scrollParent).toBeVisible();
    const initial = await scrollParent.evaluate((el) => {
      return {
        top: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight
      };
    });
    expect(initial.top).toBe(0);
    expect(initial.scrollHeight).toBeGreaterThan(initial.clientHeight);

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    await page.mouse.move(viewport!.width / 2, viewport!.height / 2);
  });

  test('plain wheel (pan branch) does not scroll the parent', async ({
    page
  }) => {
    for (let i = 0; i < 8; i += 1) {
      await page.mouse.wheel(0, 100);
    }
    await page.waitForTimeout(150);
    const finalScroll = await page
      .getByTestId('scroll-parent')
      .evaluate((el) => {
        return el.scrollTop;
      });
    // Bug-version would be ~800 px after 8 ticks of 100; fix
    // version should be 0 (small slip tolerance for the very first
    // tick if the listener attached late).
    expect(finalScroll).toBeLessThan(10);
  });

  test('Ctrl+wheel (zoom branch) does not scroll the parent', async ({
    page
  }) => {
    await page.keyboard.down('Control');
    for (let i = 0; i < 8; i += 1) {
      await page.mouse.wheel(0, 100);
    }
    await page.keyboard.up('Control');
    await page.waitForTimeout(150);
    const finalScroll = await page
      .getByTestId('scroll-parent')
      .evaluate((el) => {
        return el.scrollTop;
      });
    expect(finalScroll).toBeLessThan(10);
  });
});
