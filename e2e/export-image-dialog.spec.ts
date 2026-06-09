import { expect, test } from '@playwright/test';

/**
 * BUG5-08 regression: ExportImageDialog clears its 2s debounce timer
 * on unmount. Repro: open the menu, click "Export as Image", close
 * the dialog within the 2s debounce window, wait long enough for the
 * (cleared) timer to have fired. Before BUG5-08 the timer fired
 * after unmount — containerRef.current was null, html-to-image
 * threw, and setState ran on an unmounted React tree.
 *
 * Assertion: no console errors / pageerrors after the wait.
 */
test('ExportImageDialog does not error when closed during the debounce window (BUG5-08)', async ({
  page
}) => {
  const consoleErrors: string[] = [];
  // The PNG export path tries to inline Google Fonts CSS for the
  // generated image; the standalone container's nginx CSP blocks that
  // with `connect-src 'self'`. Those console errors are environment
  // noise, not regression signal — same filter as export-png.spec.ts.
  const isHtmlToImageRemoteCssNoise = (text: string) => {
    return (
      text.includes('fonts.googleapis.com') ||
      text.includes('Error inlining remote css file') ||
      text.includes('Error loading remote stylesheet') ||
      text.includes('Error while reading CSS rules')
    );
  };
  page.on('pageerror', (err) => {
    if (!isHtmlToImageRemoteCssNoise(err.message)) {
      consoleErrors.push(err.message);
    }
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !isHtmlToImageRemoteCssNoise(msg.text())) {
      consoleErrors.push(msg.text());
    }
  });

  await page.addInitScript(() => {
    const tinyIconSvg =
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%231f77b4%22/%3E%3C/svg%3E';
    window.__RETICULYNE_E2E__ = {
      initialData: {
        title: 'e2e export-dialog fixture',
        items: [{ id: 'modelItem-A', name: 'Item A', icon: 'icon-tiny' }],
        icons: [
          {
            id: 'icon-tiny',
            name: 'Tiny test icon',
            url: tinyIconSvg,
            collection: 'test'
          }
        ],
        colors: [{ id: 'color1', value: '#1f77b4' }],
        views: [
          {
            id: 'view-main',
            name: 'Main',
            items: [{ id: 'modelItem-A', tile: { x: 0, y: 0 } }]
          }
        ]
      }
    };
  });

  await page.goto('/');
  await expect(page).toHaveTitle(/Isoflow/);

  const mainMenuButton = page.getByRole('button', { name: 'Main menu' });
  await expect(mainMenuButton).toBeVisible();
  await mainMenuButton.click();

  const exportImageItem = page.getByRole('menuitem', {
    name: /Export as image/i
  });
  await expect(exportImageItem).toBeVisible();
  await exportImageItem.click();

  // The dialog title is "Export as image" — wait for it before
  // attempting to close to make sure the dialog actually mounted.
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 5000 });

  // Close the dialog inside the 2s debounce window (immediately).
  // Escape is the cleanest cross-renderer close trigger MUI Dialog
  // honours when no explicit close button has focus.
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible({ timeout: 5000 });

  // Wait past the 2s debounce so the (cleared) timer would have
  // fired and thrown if BUG5-08 regressed.
  await page.waitForTimeout(3000);

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
