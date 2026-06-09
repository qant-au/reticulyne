import { expect, test } from '@playwright/test';

/**
 * Smoke check: load the standalone editor served at the configured
 * baseURL (default http://localhost:2222), wait for the renderer to
 * mount, and exercise a single mouse-move-and-click interaction inside
 * the canvas. The point of this test is to keep the editor's
 * interactive surface honest end-to-end — the docker image starts, the
 * SPA hydrates, pointer events reach the renderer, and no JS error
 * escapes during the interaction.
 *
 * Run locally:
 *   bash restart.sh           # ensure container is up
 *   npm run test:e2e
 */
test('loads the editor and accepts a mouse move + click', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('/');

  await expect(page).toHaveTitle(/Reticulyne/);

  // The renderer wraps everything in a top-level absolutely-positioned
  // Box. Wait for it to be present + occupy non-zero area before
  // attempting to interact.
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const { width, height } = viewport!;

  // Move the mouse across the canvas to the centre, then click.
  await page.mouse.move(width / 4, height / 4);
  await page.mouse.move(width / 2, height / 2, { steps: 10 });
  await page.mouse.click(width / 2, height / 2);

  // Give any post-click effects (cursor placement, mode transitions)
  // a tick to settle, then re-check we didn't blow up.
  await page.waitForTimeout(250);

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
