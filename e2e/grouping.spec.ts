import { expect, test, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * group, select as a unit, drag as a unit, name, enter with
 * a double-click, ungroup. A (0, 0) is the centre tile; B (0, 2) and
 * C (0, -3) sit on the same line. One tile along +Y is (-70.75, -40.95) px
 * on screen at 100% zoom.
 */
const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23999%22/%3E%3C/svg%3E';

const load = async (page: Page) => {
  await page.addInitScript((url) => {
    (
      window as unknown as { __RETICULYNE_E2E__: unknown }
    ).__RETICULYNE_E2E__ = {
      initialData: {
        title: 'e2e groups',
        items: ['A', 'B', 'C'].map((n) => {
          return { id: n.toLowerCase(), name: `Node ${n}`, icon: 'icon-tiny' };
        }),
        icons: [{ id: 'icon-tiny', name: 'Tiny', url, collection: 'test' }],
        colors: [{ id: 'c', value: '#999999' }],
        views: [
          {
            id: 'view-main',
            name: 'Main',
            items: [
              { id: 'a', tile: { x: 0, y: 0 } },
              { id: 'b', tile: { x: 0, y: 2 } },
              { id: 'c', tile: { x: 0, y: -3 } }
            ]
          }
        ]
      }
    };
  }, tinyIconSvg);
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
  const vp = page.viewportSize()!;
  const c = { x: vp.width / 2, y: vp.height / 2 };
  return (y: number) => {
    return { x: c.x - 70.75 * y, y: c.y - 40.95 * y };
  };
};

const exported = async (page: Page) => {
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Main menu' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const download = await downloadPromise;
  return JSON.parse(await readFile(await download.path(), 'utf8'));
};

const clickAt = async (page: Page, p: { x: number; y: number }) => {
  await page.mouse.click(p.x, p.y);
};

test('group two nodes, select and drag them as one, name, enter, ungroup', async ({
  page
}) => {
  const at = await load(page);

  // Select A and B, then Ctrl+G.
  await clickAt(page, at(0));
  await page.keyboard.down('Shift');
  await clickAt(page, at(2));
  await page.keyboard.up('Shift');
  await page.keyboard.press('Control+g');

  // A click on one member now selects the group.
  await clickAt(page, { x: 60, y: 600 });
  await clickAt(page, at(2));
  await expect(page.getByText('2 selected')).toBeVisible();
  const name = page.getByLabel('Group name');
  await name.fill('Web tier');
  await name.press('Enter');
  await expect(page.getByText('Web tier', { exact: true })).toBeVisible();

  // Dragging one member drags the group.
  await page.mouse.move(at(0).x, at(0).y);
  await page.mouse.down();
  await page.mouse.move(at(-1).x, at(-1).y, { steps: 6 });
  await page.mouse.up();

  let model = await exported(page);
  const view = model.views[0];
  expect(view.groups).toHaveLength(1);
  expect(view.groups[0].name).toBe('Web tier');
  const tile = (id: string) => {
    return view.placements.find((p: { object: string }) => {
      return p.object === id;
    }).tile;
  };
  expect(tile('a')).toEqual({ x: 0, y: -1 });
  expect(tile('b')).toEqual({ x: 0, y: 1 });
  expect(tile('c')).toEqual({ x: 0, y: -3 });

  // Double-click enters the group: now a click picks one member.
  await page.mouse.dblclick(at(1).x, at(1).y);
  await expect(page.getByText('2 selected')).toHaveCount(0);
  await page.keyboard.press('Escape');

  // Select the group again and ungroup it.
  await clickAt(page, at(1));
  await page.keyboard.press('Control+Shift+g');
  model = await exported(page);
  expect(model.views[0].groups ?? []).toEqual([]);
  expect(
    model.views[0].placements.every((p: { group?: string }) => {
      return p.group === undefined;
    })
  ).toBe(true);
});

test('undo of ungroup brings the same group id back', async ({ page }) => {
  const at = await load(page);
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Control+g');
  const before = (await exported(page)).views[0].groups[0].id;

  await clickAt(page, at(0));
  await page.keyboard.press('Control+Shift+g');
  await page.waitForTimeout(400);
  await page.keyboard.press('Control+z');
  const after = await exported(page);
  expect(after.views[0].groups[0].id).toBe(before);
});
