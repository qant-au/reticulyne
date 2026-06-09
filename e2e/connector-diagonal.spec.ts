import { expect, test } from '@playwright/test';

/**
 * BUG6-01 regression — connector renders along the correct diagonal.
 *
 * Bug: `getConnectorPath` stores path tiles as world-deltas from
 * rectangle.from (+Y = world-up), but the SVG container that renders
 * them has the iso projection matrix applied — and under that matrix
 * SVG-local +Y maps to screen-DOWN-right (= world-DOWN). Without a
 * Y-flip in the renderer, connectors between two anchors that differ
 * in BOTH X and Y are mirrored across their bounding box (source ends
 * up at (sourceX, destY), dest at (destX, sourceY)). Axis-aligned
 * spans (only X or only Y differs) hide the bug.
 *
 * Fix lives in src/components/SceneLayers/Connectors/Connector.tsx,
 * with flipConnectorTileY / anchorWorldYToRenderY helpers in
 * src/utils/connector.ts.
 *
 * This e2e is the visual lock-in: a connector wired between
 * non-axis-aligned items must produce a polyline whose first and last
 * pixel coordinates land on the SVG-local positions of the source and
 * destination items, not on the Y-mirrored ones.
 *
 * The companion logical/unit lock-in tests live in
 * src/utils/__tests__/renderer.connector.test.ts (BUG6-01 helpers).
 */

const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23888%22/%3E%3C/svg%3E';

// SVG-local positions the path tiles should resolve to, given the
// fixture below. UNPROJECTED_TILE_SIZE is 100 (src/config.ts).
//
// Anchors: A=(-2,-1) and B=(2,2). The pathfinder bounding box adds
// CONNECTOR_SEARCH_OFFSET={1,1}, so rectangle.from=(-3,-2),
// rectangle.to=(3,3), gridSize=(7,6).
//   A path tile = (1, 1) → Y-flip → (1, 4) → SVG-local (150, 450)
//   B path tile = (5, 4) → Y-flip → (5, 1) → SVG-local (550, 150)
//
// Pre-fix would have produced (150, 150) for A and (550, 450) for B —
// the Y mirror. The negative-case assertions below pin that
// regression explicitly.
const EXPECTED_FIRST = { x: 150, y: 450 };
const EXPECTED_LAST = { x: 550, y: 150 };
const MIRRORED_FIRST = { x: 150, y: 150 };
const MIRRORED_LAST = { x: 550, y: 450 };

test('non-axis-aligned connector renders along the correct diagonal', async ({
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

  await page.addInitScript((iconSvg) => {
    window.__RETICULYNE_E2E__ = {
      initialData: {
        title: 'e2e diagonal connector fixture',
        items: [
          { id: 'modelItem-A', name: 'Item A', icon: 'icon-tiny' },
          { id: 'modelItem-B', name: 'Item B', icon: 'icon-tiny' }
        ],
        icons: [
          {
            id: 'icon-tiny',
            name: 'Tiny test icon',
            url: iconSvg,
            collection: 'test'
          }
        ],
        colors: [{ id: 'color1', value: '#1f77b4' }],
        views: [
          {
            id: 'view-main',
            name: 'Main',
            items: [
              // Differ in BOTH X and Y. Same coordinates as the
              // companion jest test in renderer.connector.test.ts so
              // the expected pixel positions line up across surfaces.
              { id: 'modelItem-A', tile: { x: -2, y: -1 } },
              { id: 'modelItem-B', tile: { x: 2, y: 2 } }
            ],
            connectors: [
              {
                id: 'connector-AB',
                color: 'color1',
                anchors: [
                  { id: 'anchor-A', ref: { item: 'modelItem-A' } },
                  { id: 'anchor-B', ref: { item: 'modelItem-B' } }
                ]
              }
            ]
          }
        ]
      }
    };
  }, tinyIconSvg);

  await page.goto('/');
  await expect(page).toHaveTitle(/Isoflow/);

  // The connector renders as a pair of stacked <polyline>s (white
  // outline + coloured stroke). Both share the same `points`
  // attribute — read the first.
  const polyline = page.locator('svg polyline').first();
  await expect(polyline).toBeAttached({ timeout: 5000 });

  // Wait until the points attribute actually populates (sync from
  // initial data runs once the renderer mounts).
  await expect
    .poll(
      async () => {
        const attr = await polyline.getAttribute('points');
        return attr ? attr.trim().split(/\s+/).length : 0;
      },
      { timeout: 5000 }
    )
    .toBeGreaterThanOrEqual(2);

  const pointsAttr = await polyline.getAttribute('points');
  expect(pointsAttr).not.toBeNull();
  const pairs = pointsAttr!
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return { x, y };
    });

  const first = pairs[0];
  const last = pairs[pairs.length - 1];

  expect(first).toEqual(EXPECTED_FIRST);
  expect(last).toEqual(EXPECTED_LAST);

  // Make the regression explicit — pre-fix, these were the values
  // the renderer produced. If a future change reintroduces the Y
  // mirror, both of these `.not.toEqual` will fail with a clear
  // diff naming the wrong-diagonal coordinates.
  expect(first).not.toEqual(MIRRORED_FIRST);
  expect(last).not.toEqual(MIRRORED_LAST);

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
