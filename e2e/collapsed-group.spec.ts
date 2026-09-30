import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * lw-062: a collapsed group is one box. Sweep 2026-09-30: a press off the
 * box's centre tile selected nothing, and dragging the box grabbed the end
 * of a connector drawn to it, pinning that end to a bare tile and leaving
 * the members where they were. Fixture injected via
 * `window.__RETICULYNE_E2E__` (Docker entry only, see src/index-docker.tsx).
 */
const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23888%22/%3E%3C/svg%3E';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((url) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      {
        initialData: {
          title: 'e2e collapsed',
          icons: [{ id: 'tiny', name: 'Tiny', url, collection: 'test' }],
          colors: [{ id: 'c', value: '#1f77b4' }],
          items: [
            { id: 'pc1', name: 'PC one', icon: 'tiny' },
            { id: 'pc2', name: 'PC two', icon: 'tiny' },
            { id: 'laptop', name: 'Laptop', icon: 'tiny' }
          ],
          views: [
            {
              id: 'v',
              name: 'Main',
              items: [
                { id: 'pc1', tile: { x: -2, y: 0 }, parentGroupId: 'desk' },
                { id: 'pc2', tile: { x: -2, y: 2 }, parentGroupId: 'desk' },
                { id: 'laptop', tile: { x: 3, y: 1 } }
              ],
              groups: [{ id: 'desk', name: 'Desk pair', collapsed: true }],
              connectors: [
                {
                  id: 'k-ext',
                  color: 'c',
                  anchors: [
                    { id: 'a1', ref: { item: 'laptop' } },
                    { id: 'a2', ref: { item: 'pc1' } }
                  ]
                }
              ]
            }
          ]
        }
      };
  }, tinyIconSvg);
  await page.goto('/');
  await expect(page.getByText('Desk pair (2)')).toBeVisible();
});

const boxArea = async (page: Page) => {
  return (await page
    .getByTestId('collapsed-group')
    .locator('svg')
    .first()
    .boundingBox())!;
};

const exported = async (page: Page) => {
  await page.getByRole('button', { name: 'Main menu' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  return JSON.parse(await readFile(await (await download).path(), 'utf8'));
};

test('a click off the centre of the box selects the group', async ({
  page
}) => {
  const box = await boxArea(page);
  // Left of centre, still well inside the drawn box.
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height / 2);
  await expect(page.getByText('2 selected', { exact: true })).toBeVisible();
});

test('dragging the box moves the group and keeps its connector', async ({
  page
}) => {
  const box = await boxArea(page);
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x - 120, from.y + 60, { steps: 12 });
  await page.mouse.up();

  const scene = await exported(page);
  const view = scene.views.find((v: { id: string }) => {
    return v.id === 'v';
  });
  const tileOf = (id: string) => {
    return view.placements.find((p: { object: string }) => {
      return p.object === id;
    }).tile;
  };
  // The members moved, together.
  expect(tileOf('pc1')).not.toEqual({ x: -2, y: 0 });
  expect(tileOf('pc2').x - tileOf('pc1').x).toBe(0);
  expect(tileOf('pc2').y - tileOf('pc1').y).toBe(2);
  expect(tileOf('laptop')).toEqual({ x: 3, y: 1 });
  // The connector still ends on the member, not on a bare tile.
  const k = view.connectors.find((c: { id: string }) => {
    return c.id === 'k-ext';
  });
  expect(k.anchors.map((a: { ref: unknown }) => a.ref)).toEqual([
    { object: 'laptop' },
    { object: 'pc1' }
  ]);
});

// Sweep 2026-09-30: the docked connector ran on past its arrowhead to the
// box's centre, and the name ran over the box's lower-right edge.
test('the docked connector stops at the box edge; the name sits under the box', async ({
  page
}) => {
  const box = await boxArea(page);
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const end = await page.evaluate(() => {
    const lines = [...document.querySelectorAll('polyline')].filter((l) => {
      return (
        !l.closest('[data-testid="collapsed-group"]') &&
        l.getAttribute('stroke') !== '#fff' &&
        l.getAttribute('stroke') !== '#ffffff'
      );
    });
    const line = lines[lines.length - 1];
    const pts = line.points;
    const last = pts.getItem(pts.numberOfItems - 1);
    const m = line.getScreenCTM()!;
    return {
      x: m.a * last.x + m.c * last.y + m.e,
      y: m.b * last.x + m.d * last.y + m.f
    };
  });
  // Where the end sits in the box's diamond: 0 at the centre, 1 on its edge.
  const reach =
    Math.abs(end.x - centre.x) / (box.width / 2) +
    Math.abs(end.y - centre.y) / (box.height / 2);
  expect(reach).toBeGreaterThan(0.85);

  const label = (await page.getByText('Desk pair (2)').boundingBox())!;
  expect(label.y).toBeGreaterThanOrEqual(box.y + box.height - 4);
  expect(Math.abs(label.x + label.width / 2 - centre.x)).toBeLessThan(4);
});
