import { expect, test } from '@playwright/test';

/**
 * FEA5-03 — undo/redo keyboard binding smoke test.
 *
 * The history mechanism itself is covered by unit tests
 * (src/stores/__tests__/historyStore.test.tsx — 11 tests) and the
 * useScene integration tests (src/hooks/__tests__/useScene.test.tsx
 * — 4 undo/redo tests). This Playwright spec only confirms that
 * the keyboard binding reaches the history store via
 * useKeyboardShortcuts: pressing Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z
 * does not throw, and the editor stays responsive after.
 */
test.describe('FEA5-03 — undo / redo keybindings', () => {
  test('Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z do not crash the editor', async ({
    page
  }) => {
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
    await expect(page).toHaveTitle(/Isoflow/);

    // Park focus on the canvas so the window-level keydown handler
    // receives the events.
    const vp = page.viewportSize();
    expect(vp).not.toBeNull();
    await page.mouse.move(vp!.width / 2, vp!.height / 2);

    // Each chord variant — empty-history undo is a graceful no-op
    // in the store; redo with nothing to redo is the same.
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+y');
    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(150);

    // Liveness probe: the zoom chip still renders a valid %.
    const zoom = await page.locator('text=/^[0-9]+%$/').first().textContent();
    expect(zoom).toMatch(/^[0-9]+%$/);

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });
});
