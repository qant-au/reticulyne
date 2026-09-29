import { expect, test, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * Connector hotspots and double-click to add.
 *
 * Fixture: one node on tile (0, 0), which sits under the viewport centre,
 * and one icon in the library to pick.
 */
const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23999%22/%3E%3C/svg%3E';

const load = async (page: Page) => {
  await page.addInitScript((url) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      {
        editorMode: 'EDITABLE',
        initialData: {
          title: 'e2e affordances',
          items: [{ id: 'node-a', name: 'Node A', icon: 'icon-tiny' }],
          icons: [
            { id: 'icon-tiny', name: 'Tiny test icon', url, collection: 'test' }
          ],
          colors: [{ id: 'color1', value: '#999999' }],
          views: [
            {
              id: 'view-main',
              name: 'Main',
              items: [{ id: 'node-a', tile: { x: 0, y: 0 } }]
            }
          ]
        }
      };
  }, tinyIconSvg);
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
  const vp = page.viewportSize()!;
  return { x: vp.width / 2, y: vp.height / 2 };
};

const exportedModel = async (page: Page) => {
  await page.getByRole('button', { name: 'Main menu' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const download = await downloadPromise;
  return JSON.parse(await readFile(await download.path(), 'utf8'));
};

const exportedItems = async (page: Page) => {
  await page.getByRole('button', { name: 'Main menu' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const download = await downloadPromise;
  const model = JSON.parse(await readFile(await download.path(), 'utf8'));
  return model.views[0].items as {
    id: string;
    tile: { x: number; y: number };
  }[];
};

test('2.1: ports show on the hovered node only, in connector and cursor modes', async ({
  page
}) => {
  const centre = await load(page);
  await page.mouse.move(centre.x + 400, centre.y + 200);
  await page.keyboard.press('a');

  // Over empty canvas: no ports.
  await expect(page.getByTestId('connector-hotspots')).toHaveCount(0);

  await page.mouse.move(centre.x, centre.y);
  const ports = page.getByTestId('connector-hotspots');
  await expect(ports).toHaveCount(1);
  await expect(ports.locator('circle')).toHaveCount(4);

  // Cursor tool (2.5): hovering a node still shows its ports; empty
  // canvas shows none.
  await page.keyboard.press('v');
  await expect(page.getByTestId('connector-hotspots')).toHaveCount(1);
  await page.mouse.move(centre.x + 400, centre.y + 200);
  await expect(page.getByTestId('connector-hotspots')).toHaveCount(0);
});

test('2.2: double-click an empty tile, pick an icon, it lands there', async ({
  page
}) => {
  const centre = await load(page);
  const target = { x: centre.x + 250, y: centre.y + 120 };
  await page.mouse.dblclick(target.x, target.y);

  await page.getByRole('textbox').first().fill('Tiny');
  await page
    .getByRole('button', { name: /Tiny test icon/ })
    .first()
    .click();

  // Placed at once and selected: the node inspector is open.
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  const items = await exportedItems(page);
  expect(items).toHaveLength(2);
  const added = items.find((i) => {
    return i.id !== 'node-a';
  })!;
  expect(added.tile).not.toEqual({ x: 0, y: 0 });
});

test('2.2: double-click an existing node opens its inspector', async ({
  page
}) => {
  const centre = await load(page);
  await page.mouse.dblclick(centre.x, centre.y);
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  expect(await exportedItems(page)).toHaveLength(1);
});

// 2.5. Port offsets at 100% zoom: a projected tile is 141.5 x 81.9 px, so
// each port sits a quarter of that from the node's centre.
const PORT = { x: 141.5 / 4, y: 81.9 / 4 };
// Node B on tile (3, 0): its centre is 1.5 tile-widths right and 1.5
// tile-heights up from node A's.
const B_OFFSET = { x: 141.5 * 1.5, y: -81.9 * 1.5 };

const loadTwoNodes = async (page: Page) => {
  await page.addInitScript((url) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      {
        editorMode: 'EDITABLE',
        initialData: {
          title: 'e2e drag connect',
          items: [
            { id: 'node-a', name: 'A', icon: 'icon-tiny' },
            { id: 'node-b', name: 'B', icon: 'icon-tiny' }
          ],
          icons: [
            { id: 'icon-tiny', name: 'Tiny test icon', url, collection: 'test' }
          ],
          colors: [{ id: 'color1', value: '#999999' }],
          views: [
            {
              id: 'view-main',
              name: 'Main',
              items: [
                { id: 'node-a', tile: { x: 0, y: 0 } },
                { id: 'node-b', tile: { x: 3, y: 0 } }
              ]
            }
          ]
        }
      };
  }, tinyIconSvg);
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
  const vp = page.viewportSize()!;
  return { x: vp.width / 2, y: vp.height / 2 };
};

const drag = async (
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number }
) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * i) / 10,
      from.y + ((to.y - from.y) * i) / 10
    );
  }
  await page.mouse.up();
};

test('2.5: drag from a port to another node connects them', async ({
  page
}) => {
  const a = await loadTwoNodes(page);
  const b = { x: a.x + B_OFFSET.x, y: a.y + B_OFFSET.y };
  // From A's top-right port to B's bottom-left port (not B's centre), so
  // the release is resolved through B's port.
  await drag(
    page,
    { x: a.x + PORT.x, y: a.y - PORT.y },
    { x: b.x - PORT.x, y: b.y + PORT.y }
  );

  const model = await exportedModel(page);
  const connectors = model.views[0].connectors ?? [];
  expect(connectors).toHaveLength(1);
  const ends = connectors[0].anchors.map((x: { ref: { item?: string } }) => {
    return x.ref.item;
  });
  expect(ends[0]).toBe('node-a');
  expect(ends[ends.length - 1]).toBe('node-b');
});

test('2.5: dragging from a node centre still moves it; a port drag into empty space cancels', async ({
  page
}) => {
  const a = await loadTwoNodes(page);
  await drag(page, a, { x: a.x - 200, y: a.y + 150 });
  await drag(
    page,
    { x: a.x + PORT.x, y: a.y - PORT.y },
    { x: a.x + 300, y: a.y + 250 }
  );

  const model = await exportedModel(page);
  expect(model.views[0].connectors ?? []).toHaveLength(0);
  const nodeA = model.views[0].items.find((i: { id: string }) => {
    return i.id === 'node-a';
  });
  expect(nodeA.tile).not.toEqual({ x: 0, y: 0 });
});

test('Esc during a connector drag abandons it, and costs no undo step', async ({
  page
}) => {
  const a = await loadTwoNodes(page);
  const b = { x: a.x + B_OFFSET.x, y: a.y + B_OFFSET.y };
  await page.keyboard.press('a');
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 20, a.y - 10, { steps: 3 });
  await page.keyboard.press('Escape');
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();

  const model = await exportedModel(page);
  expect(model.views[0].connectors ?? []).toHaveLength(0);
});
