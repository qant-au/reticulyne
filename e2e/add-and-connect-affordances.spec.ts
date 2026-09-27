import { expect, test, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * ROADMAP 2.1 (connector hotspots) and 2.2 (double-click to add).
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

test('2.1: connector mode shows four ports on the hovered node only', async ({
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

  // Back to the cursor tool: gone.
  await page.keyboard.press('v');
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
