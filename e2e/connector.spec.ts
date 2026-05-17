import { expect, test } from '@playwright/test';

/**
 * Connector rendering: inject a fixture with two icons placed on the
 * canvas and one connector linking them. Verify the connector renders
 * as an SVG polyline and no JS errors escape.
 *
 * This exercises the scene-graph code paths that historically broke
 * under framework bumps — anchor-ref resolution, pathfinding,
 * useIsoProjection's tile→pixel math, and the SVG render. The Zustand
 * v5 render loop landed in DEP-05 was caught by exactly this surface.
 *
 * The fixture is injected via `window.__ISOFLOW_E2E__`, a Docker-entry-
 * only hook (not in the published library). See src/index-docker.tsx.
 */
test('renders a connector between two placed icons', async ({ page }) => {
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
    // Self-contained fixture: two icons (with inline data: SVGs so we
    // don't depend on the isopack bundles), two view items placing
    // them on adjacent tiles, and one connector linking the two
    // via anchor refs.
    const tinyIconSvg =
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23888%22/%3E%3C/svg%3E';

    window.__ISOFLOW_E2E__ = {
      initialData: {
        title: 'e2e connector fixture',
        items: [
          { id: 'modelItem-A', name: 'Item A', icon: 'icon-tiny' },
          { id: 'modelItem-B', name: 'Item B', icon: 'icon-tiny' }
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
              { id: 'modelItem-A', tile: { x: -2, y: 0 } },
              { id: 'modelItem-B', tile: { x: 2, y: 0 } }
            ],
            connectors: [
              {
                id: 'connector-AB',
                color: 'color1',
                anchors: [
                  {
                    id: 'anchor-A',
                    ref: { item: 'modelItem-A' }
                  },
                  {
                    id: 'anchor-B',
                    ref: { item: 'modelItem-B' }
                  }
                ]
              }
            ]
          }
        ]
      }
    };
  });

  await page.goto('/');
  await expect(page).toHaveTitle(/Isoflow/);

  // The connector renders as an SVG <polyline> inside the scene
  // layer. There's exactly one such polyline for the one connector
  // we injected — empty initial data renders no polylines at all.
  const polyline = page.locator('svg polyline').first();
  await expect(polyline).toBeAttached({ timeout: 5000 });

  // The polyline's `points` attribute should encode at least two
  // coordinate pairs (start tile + end tile, possibly more after
  // pathfinding). Format is "x1,y1 x2,y2 ...".
  const pointsAttr = await polyline.getAttribute('points');
  expect(pointsAttr).not.toBeNull();
  expect(pointsAttr!.trim().split(/\s+/).length).toBeGreaterThanOrEqual(2);

  await page.waitForTimeout(250);
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
