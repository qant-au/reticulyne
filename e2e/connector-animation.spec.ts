import { expect, test } from '@playwright/test';

/**
 * FEA5-06 — per-connector animation toggle (looping).
 *
 * Loads a fixture with `animated: true` on the connector AND
 * `enableAnimation: true` on Reticulyne. Both flags are required for
 * the moving glyph to render. Verifies:
 *   - the SVG <animateMotion> element materialises while both flags
 *     are true
 *   - flipping the Animate toggle off in ConnectorControls makes
 *     the <animateMotion> disappear without unmounting the
 *     connector itself.
 */
test('animated connector emits <animateMotion>, toggle removes it', async ({
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

  await page.addInitScript(() => {
    const tinyIconSvg =
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23888%22/%3E%3C/svg%3E';

    window.__RETICULYNE_E2E__ = {
      enableAnimation: true,
      initialData: {
        title: 'e2e animated-connector fixture',
        items: [
          { id: 'item-A', name: 'Item A', icon: 'icon-tiny' },
          { id: 'item-B', name: 'Item B', icon: 'icon-tiny' }
        ],
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
            items: [
              { id: 'item-A', tile: { x: -2, y: 0 } },
              { id: 'item-B', tile: { x: 2, y: 0 } }
            ],
            connectors: [
              {
                id: 'connector-AB',
                color: 'color1',
                glyph: 'dollar',
                animated: true,
                anchors: [
                  { id: 'anchor-A', ref: { item: 'item-A' } },
                  { id: 'anchor-B', ref: { item: 'item-B' } }
                ]
              }
            ]
          }
        ]
      }
    };
  });

  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);

  // The static connector polyline appears first; the animated glyph
  // is the second SVG fragment we verify exists. <animateMotion> is
  // a SMIL element; querySelector treats lowercase tag names
  // correctly in SVG contexts.
  const animateMotion = page.locator('animateMotion').first();
  await expect(animateMotion).toBeAttached({ timeout: 5000 });
  expect(await animateMotion.getAttribute('repeatCount')).toBe('indefinite');

  // Click the connector polyline to select it — that opens the
  // ConnectorControls panel where the Animate toggle lives.
  const polyline = page.locator('svg polyline').first();
  await polyline.click({ force: true });

  // The Animate toggle is a labelled Switch. MUI renders the label
  // in a <span> next to a <span class="MuiSwitch-root"> hosting the
  // checkbox-like <input role="switch">.
  const toggle = page.getByRole('switch', { name: /animate/i });
  await expect(toggle).toBeVisible({ timeout: 5000 });
  await expect(toggle).toBeChecked();

  await toggle.click();
  await expect(toggle).not.toBeChecked();

  // The animateMotion element should disappear once `animated` flips
  // to false (Stage 2 gates the render on both flags).
  await expect(page.locator('animateMotion')).toHaveCount(0, {
    timeout: 2000
  });

  await page.waitForTimeout(250);
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
