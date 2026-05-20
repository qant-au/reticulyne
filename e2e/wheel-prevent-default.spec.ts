import { expect, test } from '@playwright/test';

/**
 * BUG5-09 regression: the renderer's wheel listener calls
 * preventDefault() and is registered with `{ passive: false }`, so a
 * host page that mounts <Isoflow> inside a scrollable parent does
 * NOT see the parent scroll while the user is zooming the canvas.
 *
 * Repro: drive the dev container in `scrollParent: true` mode (see
 * src/index-docker.tsx) — an outer Box of height 200vh with
 * overflow:auto wraps the editor. Without preventDefault the outer
 * Box scrolls on every wheel tick.
 */
test('wheel events on the canvas do not scroll an embedding parent (BUG5-09)', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.__ISOFLOW_E2E__ = {
      scrollParent: true
    };
  });

  await page.goto('/');
  await expect(page).toHaveTitle(/Isoflow/);

  // The scrolling wrapper is data-testid="scroll-parent". Sanity-
  // check it mounted with overflow:auto and the content is taller
  // than the viewport (otherwise there's nothing to scroll and the
  // assertion below is meaningless).
  const scrollParent = page.getByTestId('scroll-parent');
  await expect(scrollParent).toBeVisible();
  const initialScroll = await scrollParent.evaluate((el) => {
    return { top: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
  });
  expect(initialScroll.top).toBe(0);
  expect(initialScroll.scrollHeight).toBeGreaterThan(initialScroll.clientHeight);

  // Move the mouse onto the canvas area and fire several wheel
  // events. Without preventDefault, each tick would scroll the outer
  // Box by deltaY pixels — many hundreds of px total after this
  // sequence.
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const { width, height } = viewport!;
  await page.mouse.move(width / 2, height / 2);
  for (let i = 0; i < 8; i += 1) {
    await page.mouse.wheel(0, 100);
  }
  await page.waitForTimeout(150);

  const finalScroll = await scrollParent.evaluate((el) => {
    return el.scrollTop;
  });
  // Allow a tiny tolerance in case any single tick slips through
  // before the listener installs — but the order-of-magnitude is the
  // point: bug-version would be ~800 px after 8 ticks of 100; fix
  // version should be 0.
  expect(finalScroll).toBeLessThan(10);
});
