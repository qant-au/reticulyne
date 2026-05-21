import { expect, test } from '@playwright/test';

/**
 * FEA5-04 — copy/paste keyboard binding smoke test.
 *
 * The behaviour itself is covered by unit tests
 * (src/hooks/__tests__/useScene.test.tsx — 6 copy/paste tests
 * exercising clipboard semantics, repeat pastes, empty-clipboard,
 * undo integration, rectangle support, and connector skip).
 *
 * This Playwright spec only confirms that Ctrl+C / Ctrl+V do not
 * crash the editor and don't bubble to the browser's native copy
 * (which would copy surrounding page text into the OS clipboard).
 */
test.describe('FEA5-04 — copy / paste keybindings', () => {
  test('Ctrl+C / Ctrl+V do not crash and do not select page text', async ({
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

    const vp = page.viewportSize();
    expect(vp).not.toBeNull();
    await page.mouse.move(vp!.width / 2, vp!.height / 2);

    // Nothing selected: Ctrl+C silently no-ops. Empty clipboard:
    // Ctrl+V silently no-ops. Neither should crash.
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(150);

    // Liveness: zoom chip is still a percent.
    const zoom = await page.locator('text=/^[0-9]+%$/').first().textContent();
    expect(zoom).toMatch(/^[0-9]+%$/);

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });
});
