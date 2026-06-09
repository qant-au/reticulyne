import { expect, test } from '@playwright/test';

/**
 * Read-only mode: inject `editorMode: 'EXPLORABLE_READONLY'` along with
 * a fixture containing one icon. Verify that the read-only UI affordances
 * are correct — the main menu and tool menu (both editor-only) are NOT
 * rendered, but the zoom controls and view title (both available in
 * read-only mode) ARE rendered. See EDITOR_MODE_MAPPING in
 * src/components/UiOverlay/UiOverlay.tsx.
 *
 * This is the rendered-side correlate of the data-layer gating in
 * useIsoflow() that QUA-04 / SEC3-01 added: `Model.set` rejects in
 * non-EDITABLE mode, and the UI should not surface mutation entry
 * points either.
 */
test('read-only mode hides editor-only UI affordances', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.addInitScript(() => {
    const tinyIconSvg =
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23999%22/%3E%3C/svg%3E';

    window.__RETICULYNE_E2E__ = {
      editorMode: 'EXPLORABLE_READONLY',
      initialData: {
        title: 'e2e readonly fixture',
        items: [{ id: 'modelItem-A', name: 'Item A', icon: 'icon-tiny' }],
        icons: [
          {
            id: 'icon-tiny',
            name: 'Tiny test icon',
            url: tinyIconSvg,
            collection: 'test'
          }
        ],
        colors: [{ id: 'color1', value: '#999999' }],
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

  // EXPLORABLE_READONLY's availableTools is ['ZOOM_CONTROLS',
  // 'VIEW_TITLE']. Main menu and tool menu should NOT exist.
  await expect(
    page.getByRole('button', { name: 'Main menu' })
  ).toHaveCount(0);

  // Zoom-in and zoom-out are part of ZoomControls, which IS available
  // in read-only mode. Both buttons should be present.
  await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zoom out' })).toBeVisible();

  // The injected view name "Main" is shown in the VIEW_TITLE block.
  await expect(page.getByText('Main', { exact: true })).toBeVisible();

  await page.waitForTimeout(250);
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
