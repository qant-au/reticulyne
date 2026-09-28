import { expect, test, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * ROADMAP 3.1 (hover tooltip) and 3.2 (align / distribute).
 */
const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23999%22/%3E%3C/svg%3E';

type Node = {
  id: string;
  tile: { x: number; y: number };
  description?: string;
};

const load = async (page: Page, nodes: Node[], editorMode = 'EDITABLE') => {
  await page.addInitScript(
    ({ url, nodes: ns, mode }) => {
      (
        window as unknown as { __RETICULYNE_E2E__: unknown }
      ).__RETICULYNE_E2E__ = {
        editorMode: mode,
        initialData: {
          title: 'e2e tier 3',
          items: ns.map((n) => {
            return {
              id: n.id,
              name: `Node ${n.id}`,
              icon: 'icon-tiny',
              description: n.description
            };
          }),
          icons: [{ id: 'icon-tiny', name: 'Tiny', url, collection: 'test' }],
          colors: [{ id: 'c', value: '#999999' }],
          views: [
            {
              id: 'view-main',
              name: 'Main',
              items: ns.map((n) => {
                return { id: n.id, tile: n.tile };
              })
            }
          ]
        }
      };
    },
    { url: tinyIconSvg, nodes, mode: editorMode }
  );
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
  const vp = page.viewportSize()!;
  return { x: vp.width / 2, y: vp.height / 2 };
};

const exportedTiles = async (page: Page) => {
  await page.getByRole('button', { name: 'Main menu' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const download = await downloadPromise;
  const view = JSON.parse(await readFile(await download.path(), 'utf8'))
    .views[0];
  return Object.fromEntries(
    view.items.map((i: Node) => {
      return [i.id, i.tile];
    })
  );
};

test('3.1: resting on a node shows its name and description as text', async ({
  page
}) => {
  const c = await load(
    page,
    [
      {
        id: 'a',
        tile: { x: 0, y: 0 },
        description: '<p>Core <strong>switch</strong> for level 2</p>'
      }
    ],
    'EXPLORABLE_READONLY'
  );
  await page.mouse.move(c.x, c.y);
  const tip = page.getByTestId('hover-tooltip');
  await expect(tip).toBeVisible();
  await expect(tip).toContainText('Node a');
  await expect(tip).toContainText('Core switch for level 2');
  // Rendered as text, not markup.
  await expect(tip.locator('strong')).toHaveCount(0);

  await page.mouse.move(c.x + 400, c.y + 200);
  await expect(tip).toHaveCount(0);
});

test('3.1: no tooltip on load for a node at the origin before the pointer moves', async ({
  page
}) => {
  // The mouse state starts at tile 0,0, which is where this node sits.
  await load(page, [{ id: 'a', tile: { x: 0, y: 0 } }], 'EXPLORABLE_READONLY');
  await page.waitForTimeout(1200);
  await expect(page.getByTestId('hover-tooltip')).toHaveCount(0);
});

test('3.2: distribute Y spaces the middle node evenly', async ({ page }) => {
  await load(page, [
    { id: 'a', tile: { x: 0, y: 0 } },
    { id: 'b', tile: { x: 1, y: 1 } },
    { id: 'c', tile: { x: 2, y: 10 } }
  ]);
  await page.mouse.move(1200, 600);
  await page.keyboard.press('Control+a');
  await page.getByRole('button', { name: 'Distribute Y' }).click();
  const tiles = await exportedTiles(page);
  expect(tiles.b).toEqual({ x: 1, y: 5 });
  expect(tiles.a).toEqual({ x: 0, y: 0 });
  expect(tiles.c).toEqual({ x: 2, y: 10 });
});

test('3.2: an align that would stack two nodes is disabled', async ({
  page
}) => {
  await load(page, [
    { id: 'a', tile: { x: 0, y: 0 } },
    { id: 'b', tile: { x: 3, y: 0 } },
    // Selected last, so it is the active item Align lines up with.
    { id: 'c', tile: { x: 1, y: 4 } }
  ]);
  await page.mouse.move(1200, 600);
  await page.keyboard.press('Control+a');
  await expect(page.getByRole('button', { name: 'Align X' })).toBeDisabled();
  // Align X to c's X (1) would put a and b both on tile (1, 0): refused.
  // Align Y to c's Y (4) keeps them on different tiles: allowed.
  await expect(page.getByRole('button', { name: 'Align Y' })).toBeEnabled();
});

test('ArrowUp nudges a node up the screen, ArrowDown down', async ({ page }) => {
  const c = await load(page, [{ id: 'a', tile: { x: 0, y: 0 } }]);
  const node = page.locator('img').first();
  await page.mouse.click(c.x, c.y);
  const before = (await node.boundingBox())!.y;
  await page.keyboard.press('ArrowUp');
  await expect.poll(async () => {
    return (await node.boundingBox())!.y;
  }).toBeLessThan(before);
  expect((await exportedTiles(page)).a).toEqual({ x: 0, y: 1 });
});

test('Ctrl+D twice gives two copies on two tiles, not a stack', async ({
  page
}) => {
  const c = await load(page, [{ id: 'a', tile: { x: 0, y: 0 } }]);
  await page.mouse.click(c.x, c.y);
  await page.keyboard.press('Control+d');
  await page.keyboard.press('Control+d');
  const tiles = Object.values(await exportedTiles(page)).map((t) => {
    return JSON.stringify(t);
  });
  expect(tiles).toHaveLength(3);
  expect(new Set(tiles).size).toBe(3);
});

test('a text box left empty is removed when it is deselected', async ({
  page
}) => {
  const c = await load(page, [{ id: 'a', tile: { x: 0, y: 0 } }]);
  await page.mouse.move(c.x + 200, c.y + 100);
  await page.keyboard.press('t');
  await page.mouse.click(c.x + 200, c.y + 100);
  const field = page.getByLabel('Text');
  await expect(field).toBeFocused();
  await field.fill('');
  await page.mouse.click(c.x - 300, c.y + 200);
  await page.getByRole('button', { name: 'Main menu' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const model = JSON.parse(
    await readFile(await (await downloadPromise).path(), 'utf8')
  );
  expect(model.views[0].textBoxes ?? []).toHaveLength(0);
});
