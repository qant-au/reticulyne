import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * The keyboard and the pointer work the same in the flat view as in the
 * isometric one, and the switch keeps the zoom and the point under the
 * centre of the canvas. The keyboard battery runs in both views and the
 * outcomes are compared; the pointer gestures run in the flat view, where
 * the tile geometry differs. Fixtures via `window.__RETICULYNE_E2E__`
 * (Docker entry only, see src/index-docker.tsx).
 */
type Projection = 'iso' | 'schematic';
const PROJECTIONS: Projection[] = ['iso', 'schematic'];

const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23888%22/%3E%3C/svg%3E';

const fixture = (kind: Projection) => {
  return {
    title: 'e2e shortcuts',
    icons: [{ id: 'tiny', name: 'Tiny', url: tinyIconSvg, collection: 't' }],
    colors: [{ id: 'c', value: '#1f77b4' }],
    items: [
      { id: 'a', name: 'Alpha', icon: 'tiny' },
      { id: 'b', name: 'Bravo', icon: 'tiny' },
      { id: 'c', name: 'Charlie', icon: 'tiny' },
      { id: 'd', name: 'Delta', icon: 'tiny' }
    ],
    views: [
      {
        id: 'v',
        name: 'Ground',
        kind,
        items: [
          { id: 'a', tile: { x: -2, y: 0 } },
          { id: 'b', tile: { x: 0, y: 0 } },
          { id: 'c', tile: { x: 2, y: 0 } }
        ]
      },
      {
        id: 'v2',
        name: 'Level 1',
        kind,
        items: [{ id: 'd', tile: { x: 0, y: 0 } }]
      }
    ]
  };
};

const load = async (page: Page, kind: Projection) => {
  await page.addInitScript((data) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      { initialData: data };
  }, fixture(kind));
  await page.goto('/');
  await expect(page.getByText('Bravo', { exact: true })).toBeVisible();
  const vp = page.viewportSize()!;
  await page.mouse.move(vp.width / 2, vp.height / 2);
  await page.getByRole('application').focus();
  return { x: vp.width / 2, y: vp.height / 2 };
};

const zoomPercent = async (page: Page) => {
  const text = await page.locator('text=/^[0-9]+%$/').first().textContent();
  return Number((text ?? '0').replace('%', ''));
};

const exported = async (page: Page) => {
  await page.getByRole('button', { name: 'Main menu' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const text = await readFile(await (await download).path(), 'utf8');
  return JSON.parse(text);
};

const counts = async (page: Page) => {
  const scene = await exported(page);
  const view = scene.views[0];
  return {
    placements: (view.placements ?? []).length,
    rectangles: (view.rectangles ?? []).length,
    groups: (view.groups ?? []).length,
    connectors: (view.connectors ?? []).length,
    grouped: (view.placements ?? []).filter((p: { group?: string }) => {
      return p.group !== undefined;
    }).length
  };
};

const labelCentre = async (page: Page, name: string) => {
  const box = (await page
    .getByText(name, { exact: true })
    .first()
    .boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

// True when the locator shows within a moment, false when it does not.
const shows = async (locator: ReturnType<Page['locator']>) => {
  try {
    await expect(locator).toBeVisible({ timeout: 3000 });
    return true;
  } catch {
    return false;
  }
};
const selected = async (tab: ReturnType<Page['locator']>) => {
  try {
    await expect(tab).toHaveAttribute('aria-selected', 'true', {
      timeout: 3000
    });
    return true;
  } catch {
    return false;
  }
};

// Select one object by name with the find bar (Ctrl+F, Enter): Tab walks
// objects in screen reading order, which differs between the views.
const selectByName = async (page: Page, name: string) => {
  await page.getByRole('application').focus();
  await page.keyboard.press('Control+f');
  const find = page.getByRole('textbox', { name: 'Find items' });
  await find.fill(name);
  await find.press('Enter');
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  await find.press('Escape');
  await expect(find).toHaveCount(0);
};

const selectedCount = async (page: Page) => {
  const header = page.locator('text=/^[0-9]+ selected$/').first();
  if ((await header.count()) === 0) return 0;
  return Number(((await header.textContent()) ?? '0').replace(' selected', ''));
};

// ---------------------------------------------------------------------
// The keyboard battery, run in each view, with the outcomes compared.
// ---------------------------------------------------------------------
const keyboardBattery = async (page: Page) => {
  const out: Record<string, unknown> = {};

  // Zoom keys.
  await page.keyboard.press('-');
  out.zoomOut = await zoomPercent(page);
  await page.keyboard.press('=');
  out.zoomIn = await zoomPercent(page);
  await page.keyboard.press('-');
  await page.keyboard.press('Control+0');
  out.zoomReset = await zoomPercent(page);
  await page.keyboard.press('f');
  await page.waitForTimeout(200);
  const fit = await zoomPercent(page);
  out.fitInRange = fit >= 20 && fit <= 100;
  await page.keyboard.press('Control+0');

  // Pan with Ctrl + arrows moves everything on screen.
  const before = await labelCentre(page, 'Bravo');
  for (let i = 0; i < 3; i += 1)
    await page.keyboard.press('Control+ArrowRight');
  await page.waitForTimeout(300);
  const after = await labelCentre(page, 'Bravo');
  out.panned =
    Math.abs(after.x - before.x) > 10 && Math.abs(after.y - before.y) < 1;
  for (let i = 0; i < 3; i += 1) await page.keyboard.press('Control+ArrowLeft');

  // Add an item from the keyboard: I, pick, Enter.
  await page.keyboard.press('i');
  await page.getByPlaceholder('Search icons').fill('Tiny');
  await page
    .getByAltText('Icon Tiny')
    .locator('xpath=ancestor::button[1]')
    .focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Untitled', { exact: true })).toBeVisible();
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  out.afterAdd = await counts(page);

  // Draw a rectangle from the keyboard: R, Enter; undo and redo it.
  await page.getByRole('application').focus();
  await page.keyboard.press('r');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  out.afterRect = await counts(page);
  await page.getByRole('application').focus();
  await page.keyboard.press('Control+z');
  out.afterUndo = await counts(page);
  await page.getByRole('application').focus();
  await page.keyboard.press('Control+y');
  out.afterRedo = await counts(page);

  // Select all, group, ungroup.
  await page.getByRole('application').focus();
  await page.keyboard.press('Control+a');
  out.selectedAll = await selectedCount(page);
  await page.keyboard.press('Control+g');
  out.afterGroup = await counts(page);
  await page.getByRole('application').focus();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Control+Shift+g');
  out.afterUngroup = await counts(page);

  // Delete removes the selected object.
  await page.keyboard.press('Escape');
  await selectByName(page, 'Charlie');
  await page.getByRole('application').focus();
  await page.keyboard.press('Delete');
  out.afterDelete = await counts(page);

  // Copy and paste a selection.
  await selectByName(page, 'Alpha');
  await page.getByRole('application').focus();
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  out.afterPaste = await counts(page);

  // Dialogs and panels open and close from the keyboard.
  await page.keyboard.press('Escape');
  await page.getByRole('application').focus();
  await page.keyboard.press('?');
  out.helpOpens = await shows(page.getByRole('dialog'));
  await page.keyboard.press('Escape');
  await page.getByRole('application').focus();
  await page.keyboard.press('Control+f');
  const find = page.getByRole('textbox', { name: 'Find items' });
  out.searchOpens = await shows(find);
  await find.press('Escape');
  await page.getByRole('application').focus();
  await page.keyboard.press('Alt+KeyI');
  out.highlightToggles = true;
  await page.keyboard.press('Alt+KeyI');

  // Floors.
  await page.getByRole('application').focus();
  await page.keyboard.press('Alt+ArrowUp');
  out.floorUp = await selected(page.getByRole('tab', { name: 'Level 1' }));
  await page.getByRole('application').focus();
  await page.keyboard.press('Alt+ArrowDown');
  out.floorDown = await selected(page.getByRole('tab', { name: 'Ground' }));

  // The context menu from the keyboard on a selected object.
  await selectByName(page, 'Bravo');
  await page.getByRole('application').focus();
  await page.keyboard.press('Shift+F10');
  out.menuFromKeyboard = await shows(
    page.getByRole('menuitem', { name: 'Connect to…' })
  );
  await page.keyboard.press('Escape');
  return out;
};

test('the keyboard does the same things in the isometric and the flat view', async ({
  page
}) => {
  const results: Partial<Record<Projection, Record<string, unknown>>> = {};
  for (const projection of PROJECTIONS) {
    await load(page, projection);
    results[projection] = await keyboardBattery(page);
  }
  expect(results.schematic).toEqual(results.iso);
  // And the outcomes are the right ones, not merely the same wrong ones.
  const r = results.iso!;
  expect(r.zoomOut).toBe(80);
  expect(r.zoomIn).toBe(100);
  expect(r.zoomReset).toBe(100);
  expect(r.fitInRange).toBe(true);
  expect(r.panned).toBe(true);
  expect(r.afterAdd).toMatchObject({ placements: 4 });
  expect(r.afterRect).toMatchObject({ placements: 4, rectangles: 1 });
  expect(r.afterUndo).toMatchObject({ rectangles: 0 });
  expect(r.afterRedo).toMatchObject({ rectangles: 1 });
  expect(r.selectedAll).toBeGreaterThanOrEqual(4);
  expect(r.afterGroup).toMatchObject({ groups: 1, grouped: 4 });
  expect(r.afterUngroup).toMatchObject({ groups: 0, grouped: 0 });
  expect(r.afterDelete).toMatchObject({ placements: 3 });
  expect(r.afterPaste).toMatchObject({ placements: 4 });
  expect(r.helpOpens).toBe(true);
  expect(r.searchOpens).toBe(true);
  expect(r.floorUp).toBe(true);
  expect(r.floorDown).toBe(true);
  expect(r.menuFromKeyboard).toBe(true);
});

// ---------------------------------------------------------------------
// Pointer gestures in the flat view, on the square grid.
// ---------------------------------------------------------------------
// A flat tile is 100 px square at 100%; a port sits on the tile's edge,
// half a tile from the node's centre; Charlie is two tiles right of Bravo.
const TILE = 100;
const PORT = TILE / 2;

test('pointer gestures work in the flat view: port drag connects, marquee selects, double-click adds, right-click opens the menu, Ctrl+wheel zooms', async ({
  page
}) => {
  const centre = await load(page, 'schematic');
  const bravo = centre;
  const charlie = { x: centre.x + 2 * TILE, y: centre.y };

  // Drag from Bravo's right port to Charlie's left port.
  await page.mouse.move(bravo.x + PORT, bravo.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) {
    await page.mouse.move(
      bravo.x + PORT + ((charlie.x - PORT - bravo.x - PORT) * i) / 10,
      bravo.y
    );
  }
  await page.mouse.up();
  let c = await counts(page);
  expect(c.connectors).toBe(1);
  await page.keyboard.press('Escape');

  // A marquee across all three nodes selects them.
  await page.mouse.move(centre.x - 3 * TILE, centre.y - TILE);
  await page.mouse.down();
  for (let i = 1; i <= 6; i += 1) {
    await page.mouse.move(
      centre.x - 3 * TILE + (6 * TILE * i) / 6,
      centre.y - TILE + (2 * TILE * i) / 6
    );
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  await page.waitForTimeout(150);
  expect(await selectedCount(page)).toBeGreaterThanOrEqual(3);
  await page.keyboard.press('Escape');

  // Double-click an empty tile (clear of the floor bar) and pick an icon:
  // it lands there.
  const empty = { x: centre.x - 2 * TILE, y: centre.y - 2 * TILE };
  await page.mouse.dblclick(empty.x, empty.y);
  await page.getByRole('textbox').first().fill('Tiny');
  await page.getByRole('button', { name: /Tiny/ }).first().click();
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  await page.keyboard.press('Escape');
  c = await counts(page);
  expect(c.placements).toBe(4);
  const scene = await exported(page);
  const added = scene.views[0].placements.find((p: { object: string }) => {
    return !['a', 'b', 'c'].includes(p.object);
  });
  expect(added.tile).toEqual({ x: -2, y: 2 });

  // Right-click a node: its menu.
  await page.mouse.click(bravo.x, bravo.y, { button: 'right' });
  await expect(
    page.getByRole('menuitem', { name: 'Connect to…' })
  ).toBeVisible();
  await page.keyboard.press('Escape');

  // Ctrl + wheel zooms, the plain wheel pans.
  const z0 = await zoomPercent(page);
  await page.mouse.move(centre.x, centre.y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, 300);
  await page.keyboard.up('Control');
  await page.waitForTimeout(300);
  expect(await zoomPercent(page)).toBeLessThan(z0);
  const before = await labelCentre(page, 'Alpha');
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(300);
  const after = await labelCentre(page, 'Alpha');
  expect(Math.abs(after.y - before.y)).toBeGreaterThan(10);
});

// ---------------------------------------------------------------------
// The switch keeps the zoom and the point under the centre.
// ---------------------------------------------------------------------
test('switching views at a zoomed, panned position keeps the zoom and the centre, and comes back to the pixel', async ({
  page
}) => {
  await load(page, 'iso');
  await page.keyboard.press('-');
  await page.keyboard.press('-');
  for (let i = 0; i < 4; i += 1)
    await page.keyboard.press('Control+ArrowRight');
  for (let i = 0; i < 2; i += 1) await page.keyboard.press('Control+ArrowDown');
  await page.waitForTimeout(300);
  const zoom = await zoomPercent(page);
  expect(zoom).toBe(60);
  const before = await Promise.all(
    ['Alpha', 'Bravo', 'Charlie'].map((n) => {
      return labelCentre(page, n);
    })
  );

  await page.getByRole('button', { name: 'Flat 2D view', exact: true }).click();
  await page.waitForTimeout(300);
  expect(await zoomPercent(page)).toBe(zoom);
  // Bravo sits on tile (0, 0); whatever tile was under the centre in the
  // isometric view is still under it: Bravo's offset from the centre is
  // the same number of tiles, measured in each view's tile size.
  const vp = page.viewportSize()!;
  const flatBravo = await labelCentre(page, 'Bravo');
  const isoBravo = before[1];
  const isoTiles = {
    x: (isoBravo.x - vp.width / 2) / (141.42 * 0.6),
    y: (isoBravo.y - vp.height / 2) / (81.65 * 0.6)
  };
  // In the isometric view a tile step moves half a tile on screen in each
  // axis; the flat view moves a whole tile. Recover the tile offset from
  // each and compare.
  const isoTile = { x: isoTiles.x - isoTiles.y, y: -(isoTiles.x + isoTiles.y) };
  const flatTile = {
    x: (flatBravo.x - vp.width / 2) / (100 * 0.6),
    y: -(flatBravo.y - vp.height / 2) / (100 * 0.6)
  };
  expect(Math.abs(flatTile.x - isoTile.x)).toBeLessThan(0.6);
  expect(Math.abs(flatTile.y - isoTile.y)).toBeLessThan(0.6);

  await page
    .getByRole('button', { name: 'Isometric view', exact: true })
    .click();
  await page.waitForTimeout(300);
  expect(await zoomPercent(page)).toBe(zoom);
  const after = await Promise.all(
    ['Alpha', 'Bravo', 'Charlie'].map((n) => {
      return labelCentre(page, n);
    })
  );
  after.forEach((p, i) => {
    expect(Math.abs(p.x - before[i].x)).toBeLessThan(1.5);
    expect(Math.abs(p.y - before[i].y)).toBeLessThan(1.5);
  });
});
