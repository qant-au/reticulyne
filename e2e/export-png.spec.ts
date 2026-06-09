import { expect, test } from '@playwright/test';

/**
 * PNG export: inject a one-icon fixture, open the main menu, click
 * "Export as image", and click the dialog's Export button. Verifies
 * that `html-to-image` doesn't blow up at runtime and that the
 * resulting download is triggered.
 *
 * `html-to-image` is a non-trivial third-party dep that has previously
 * broken on framework bumps (the cloned-DOM rasterisation path is
 * sensitive to React/Emotion render shapes).
 */
test('exports the current view as PNG via the main menu', async ({ page }) => {
  const consoleErrors: string[] = [];
  // `html-to-image` tries to fetch Google Fonts CSS at runtime to
  // inline it into the PNG. Our nginx CSP correctly blocks this with
  // `connect-src 'self'` — the export still produces a valid PNG, just
  // without the remote stylesheet inlined. The resulting console
  // errors are environmental, not regression signal; filter them.
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
        title: 'e2e PNG export fixture',
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

  // The main menu button is an MUI Tooltip-wrapped IconButton with
  // the accessible name "Main menu" — see src/components/MainMenu.
  const mainMenuButton = page.getByRole('button', { name: 'Main menu' });
  await expect(mainMenuButton).toBeVisible();
  await mainMenuButton.click();

  // The menu opens with menu items including "Export as image".
  const exportImageItem = page.getByRole('menuitem', { name: /Export as image/i });
  await expect(exportImageItem).toBeVisible();
  await exportImageItem.click();

  // The Export dialog has a "Download as PNG" button that triggers
  // the html-to-image flow + file save. Click it and listen for the
  // download event.
  const downloadButton = page.getByRole('button', { name: /Download as PNG/i });
  await expect(downloadButton).toBeVisible({ timeout: 5000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
  await downloadButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/i);

  await page.waitForTimeout(250);
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
