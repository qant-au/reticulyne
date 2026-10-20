import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * The flat view is the same diagram as the isometric one in everything but
 * the drawing: the packaged icons connect with their catalogue ports, the
 * model survives the switch there and back untouched, every layer draws,
 * animations run, and every export works. Each check runs in both views.
 * Fixtures are injected via `window.__RETICULYNE_E2E__` (Docker entry only,
 * see src/index-docker.tsx) or imported from `samples/`.
 */
type Projection = 'iso' | 'schematic';
const PROJECTIONS: Projection[] = ['iso', 'schematic'];
const label = (p: Projection) => {
  return p === 'iso' ? 'isometric' : 'flat';
};

const hook = async (
  page: Page,
  initialData: unknown,
  extra: Record<string, unknown> = {}
) => {
  await page.addInitScript(
    ({ data, more }) => {
      (
        window as unknown as { __RETICULYNE_E2E__: unknown }
      ).__RETICULYNE_E2E__ = { initialData: data, ...more };
    },
    { data: initialData, more: extra }
  );
};

const importSample = async (page: Page, file: string) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
  await page.getByTestId('diagram-import-input').setInputFiles({
    name: file,
    mimeType: 'application/json',
    buffer: await readFile(`${__dirname}/../samples/${file}`)
  });
  await page.keyboard.press('Escape');
};

const toView = async (page: Page, projection: Projection) => {
  const name = projection === 'iso' ? 'Isometric view' : 'Flat 2D view';
  const button = page.getByRole('button', { name, exact: true });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
};

const exported = async (page: Page) => {
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Main menu' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const text = await readFile(await (await download).path(), 'utf8');
  return JSON.parse(text);
};

// The scene less the icons (written as the editor carries them) and less
// the view kinds, which the switch is meant to change.
const kept = (scene: {
  icons?: unknown;
  lastUpdated?: string;
  views: { kind?: string; lastUpdated?: string }[];
}) => {
  const rest = { ...scene } as Record<string, unknown>;
  delete rest.icons;
  delete rest.lastUpdated;
  rest.views = scene.views.map((view) => {
    const v = { ...view };
    delete v.kind;
    delete v.lastUpdated;
    return v;
  });
  return rest;
};

const canvas = (page: Page) => {
  return page.getByRole('application');
};

const imageSources = (page: Page) => {
  return canvas(page)
    .locator('img')
    .evaluateAll((els) => {
      return els.map((el) => {
        return el.getAttribute('src');
      });
    });
};

const noErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
};

// ---------------------------------------------------------------------
// 1. Packaged icons connect with their catalogue ports, in either view.
// ---------------------------------------------------------------------
for (const projection of PROJECTIONS) {
  test(`catalogue items placed and connected in the ${label(projection)} view carry their ports`, async ({
    page
  }) => {
    const errors = noErrors(page);
    await hook(page, {
      format: 'reticulyne-scene',
      version: 2,
      id: 'e2e-parity',
      title: 'e2e parity',
      objects: [],
      views: [{ id: 'v', kind: projection, name: 'Main', placements: [] }]
    });
    await page.goto('/');
    await expect(page).toHaveTitle(/Reticulyne/);
    await page
      .getByRole('button', { name: 'Icon library', exact: true })
      .click();
    const palette = page.getByTestId('icon-palette');
    await expect(palette).toBeVisible();

    const drop = async (search: string, name: RegExp, to: [number, number]) => {
      // Placing an item selects it, which swaps the palette for its
      // inspector; open the library again for the next one.
      if (!(await palette.getByRole('textbox').isVisible())) {
        await page
          .getByRole('button', { name: 'Icon library', exact: true })
          .click();
      }
      await palette.getByRole('textbox').fill(search);
      const tile = palette
        .getByTestId('catalogue-items')
        .getByRole('button', { name })
        .first();
      const from = (await tile.boundingBox())!;
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(to[0], to[1], { steps: 12 });
      await page.mouse.up();
      await page.keyboard.press('Escape');
    };
    await drop('Router', /^Icon Router Router$/, [520, 420]);
    await drop('24-Port', /^Icon Network Switch \(24-Port\)/, [860, 560]);
    await expect(page.getByText('Router', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Network Switch (24-Port)', { exact: true })
    ).toBeVisible();

    // Connect the router to the switch from its context menu: the
    // connection takes a free port on each, on a medium they share.
    const router = canvas(page).locator('img').first();
    await router.click({ button: 'right', force: true });
    await page.getByRole('menuitem', { name: 'Connect to…' }).click();
    const dialog = page.getByRole('dialog', { name: /Connect .* to/ });
    await dialog.getByRole('combobox').fill('Network Switch');
    await page
      .getByRole('option', { name: /Network Switch/ })
      .first()
      .click();
    await dialog.getByRole('button', { name: 'Connect' }).click();
    await expect(dialog).toHaveCount(0);

    const scene = await exported(page);
    expect(scene.views[0].kind).toBe(projection);
    expect(scene.objects).toHaveLength(2);
    for (const object of scene.objects) {
      expect(object.ports?.length).toBeGreaterThan(0);
      expect(object.icon).toMatch(/^reticulyne-/);
    }
    expect(scene.connections).toHaveLength(1);
    const [connection] = scene.connections;
    expect(connection.fromPort).toBeTruthy();
    expect(connection.toPort).toBeTruthy();
    expect(scene.views[0].connectors).toHaveLength(1);
    expect(scene.views[0].connectors[0].connection).toBe(connection.id);
    await expect(canvas(page).locator('svg polyline').first()).toBeAttached();
    expect(errors, errors.join('\n')).toEqual([]);
  });
}

// ---------------------------------------------------------------------
// 2. The switch changes the drawing and nothing else.
// ---------------------------------------------------------------------
test('isometric -> flat -> isometric leaves the model untouched and draws everything in both', async ({
  page
}) => {
  const errors = noErrors(page);
  await importSample(page, 'office-network.json');
  await expect(page.getByText('Core switch', { exact: true })).toBeVisible();

  const first = await exported(page);
  const isoCounts = {
    lines: await canvas(page).locator('svg polyline').count(),
    images: await canvas(page).locator('img').count()
  };
  const isoSources = await imageSources(page);

  await toView(page, 'schematic');
  const flat = await exported(page);
  expect(flat.views[0].kind).toBe('schematic');
  expect(kept(flat)).toEqual(kept(first));
  expect(await canvas(page).locator('svg polyline').count()).toBe(
    isoCounts.lines
  );
  expect(await canvas(page).locator('img').count()).toBe(isoCounts.images);
  // Every node draws its flat drawing, none its isometric one.
  const flatSources = await imageSources(page);
  expect(
    flatSources.filter((src) => {
      return isoSources.includes(src);
    })
  ).toEqual([]);
  // The rectangle and the text box are still there.
  await expect(
    page.getByText('Office LAN', { exact: true }).first()
  ).toBeVisible();

  await toView(page, 'iso');
  const back = await exported(page);
  expect(back.views[0].kind).toBe('iso');
  expect(kept(back)).toEqual(kept(first));
  expect(errors, errors.join('\n')).toEqual([]);
});

// ---------------------------------------------------------------------
// 3. Floors: the other floors and the cross-floor stubs draw flat too.
// ---------------------------------------------------------------------
test('the flat view draws the other floors faintly and the cross-floor stub', async ({
  page
}) => {
  await importSample(page, 'two-floor-building.json');
  await expect(page.getByRole('tablist', { name: 'Floors' })).toBeVisible();
  const ghosts = page.locator('[data-testid^="other-floor-"]');
  await expect(ghosts).toHaveCount(1);
  const stub = page.getByRole('button', { name: /^Go to Level 1/ });
  await expect(stub).toBeVisible();

  await toView(page, 'schematic');
  await expect(ghosts).toHaveCount(1);
  await expect(ghosts.first().locator('img').first()).toBeAttached();
  await expect(stub).toBeVisible();
  // Walking up the stack still works from the flat floor.
  await page.keyboard.press('Alt+ArrowUp');
  await expect(page.getByRole('tab', { name: 'Level 1' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
});

// ---------------------------------------------------------------------
// 4. Animations and glyphs, per view.
// ---------------------------------------------------------------------
const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23888%22/%3E%3C/svg%3E';

const glyphScene = (kind: Projection) => {
  return {
    title: 'e2e glyphs',
    icons: [{ id: 'tiny', name: 'Tiny', url: tinyIconSvg, collection: 't' }],
    colors: [{ id: 'c', value: '#1f77b4' }],
    items: [
      { id: 'a', name: 'A', icon: 'tiny' },
      { id: 'b', name: 'B', icon: 'tiny' },
      { id: 'c', name: 'C', icon: 'tiny' },
      { id: 'd', name: 'D', icon: 'tiny' }
    ],
    views: [
      {
        id: 'v',
        name: 'Main',
        kind,
        items: [
          { id: 'a', tile: { x: -3, y: 0 } },
          { id: 'b', tile: { x: 3, y: 0 } },
          { id: 'c', tile: { x: -3, y: -3 } },
          { id: 'd', tile: { x: 3, y: -3 } }
        ],
        connectors: [
          {
            id: 'k1',
            color: 'c',
            glyph: 'diamond',
            animated: true,
            anchors: [
              { id: 'a1', ref: { item: 'a' } },
              { id: 'a2', ref: { item: 'b' } }
            ]
          },
          {
            id: 'k2',
            color: 'c',
            glyph: 'square',
            anchors: [
              { id: 'a3', ref: { item: 'c' } },
              { id: 'a4', ref: { item: 'd' } }
            ]
          }
        ]
      }
    ]
  };
};

for (const projection of PROJECTIONS) {
  test(`an animated connector moves its glyph in the ${label(projection)} view, and the diamond and square keep their shapes`, async ({
    page
  }) => {
    const errors = noErrors(page);
    await hook(page, glyphScene(projection), { enableAnimation: true });
    await page.goto('/');
    await expect(page.getByText('A', { exact: true }).first()).toBeVisible();

    const motion = page.locator('animateMotion').first();
    await expect(motion).toBeAttached();
    const glyph = motion.locator('xpath=..');
    const before = (await glyph.boundingBox())!;
    await page.waitForTimeout(500);
    const after = (await glyph.boundingBox())!;
    expect(
      Math.abs(after.x - before.x) + Math.abs(after.y - before.y)
    ).toBeGreaterThan(5);

    // The diamond is drawn as an axis-aligned <rect> for the isometric
    // view (the projection turns it into a diamond) and as a 45-degree
    // polygon for the flat one; the square the other way round. On
    // screen each is the shape its name says in both views.
    // Each connector draws a halo and a line.
    const lines = canvas(page).locator('svg polyline');
    await expect(lines).toHaveCount(4);
    const shapes = await page.evaluate(() => {
      const out: { rects: number; diamonds: number } = {
        rects: 0,
        diamonds: 0
      };
      document.querySelectorAll('svg rect').forEach((el) => {
        if (el.getAttribute('width') === '26') out.rects += 1;
      });
      document.querySelectorAll('svg polygon').forEach((el) => {
        if (el.getAttribute('points') === '0,-16 16,0 0,16 -16,0') {
          out.diamonds += 1;
        }
      });
      return out;
    });
    // Both glyph kinds are on screen, whichever primitive draws each.
    expect(shapes.rects).toBeGreaterThan(0);
    expect(shapes.diamonds).toBeGreaterThan(0);
    expect(errors, errors.join('\n')).toEqual([]);
  });
}

// ---------------------------------------------------------------------
// 5. Exports from the flat view.
// ---------------------------------------------------------------------
test('PNG, SVG, PDF and JSON export from the flat view', async ({ page }) => {
  await importSample(page, 'office-network.json');
  await expect(page.getByText('Core switch', { exact: true })).toBeVisible();
  await toView(page, 'schematic');

  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: /Export as Image/i }).click();
  const png = page.getByRole('dialog', { name: 'Export as image' });
  await expect(png.locator('img[src^="data:image/png"]')).toBeVisible({
    timeout: 20000
  });
  await png.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Export as SVG' }).click();
  const svg = page.getByRole('dialog', { name: 'Export as SVG' });
  const svgDownload = page.waitForEvent('download', { timeout: 20000 });
  await svg
    .getByRole('button', { name: 'Download universal SVG' })
    .click({ timeout: 20000 });
  const body = await readFile(await (await svgDownload).path(), 'utf8');
  expect(body).toContain('Core switch');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Main menu' }).click();
  const pdf = page.waitForEvent('download', { timeout: 30000 });
  await page.getByRole('menuitem', { name: 'Export as PDF' }).click();
  expect((await pdf).suggestedFilename()).toMatch(/\.pdf$/);

  const json = await exported(page);
  expect(json.views[0].kind).toBe('schematic');
});

// ---------------------------------------------------------------------
// 6. Read-only viewers see the view's kind.
// ---------------------------------------------------------------------
test('a read-only viewer draws a flat view with the flat drawings', async ({
  page
}) => {
  const naming = (kind: Projection) => {
    return {
      format: 'reticulyne-scene',
      version: 2,
      id: 'e2e-ro',
      title: 'e2e read-only',
      objects: [{ id: 'a', name: 'Device A', icon: 'reticulyne-firewall' }],
      views: [
        {
          id: 'v',
          kind,
          name: 'Main',
          placements: [{ object: 'a', tile: { x: 0, y: 0 } }]
        }
      ]
    };
  };
  await hook(page, naming('iso'), { editorMode: 'EXPLORABLE_READONLY' });
  await page.goto('/');
  await expect(
    page.getByText('Device A', { exact: true }).first()
  ).toBeVisible();
  const iso = await canvas(page).locator('img').first().getAttribute('src');

  await hook(page, naming('schematic'), { editorMode: 'EXPLORABLE_READONLY' });
  await page.goto('/');
  await expect(
    page.getByText('Device A', { exact: true }).first()
  ).toBeVisible();
  const flat = await canvas(page).locator('img').first().getAttribute('src');
  expect(flat).toMatch(/^data:image\/svg\+xml,/);
  expect(flat).not.toBe(iso);
  await expect(page.getByRole('button', { name: 'Flat 2D view' })).toHaveCount(
    0
  );
});

// ---------------------------------------------------------------------
// 7. Editing in the flat view lands on the square grid.
// ---------------------------------------------------------------------
test('dragging a node in the flat view moves it by whole square tiles, and undo puts it back', async ({
  page
}) => {
  await hook(page, {
    title: 'e2e flat drag',
    icons: [{ id: 'tiny', name: 'Tiny', url: tinyIconSvg, collection: 't' }],
    colors: [],
    items: [{ id: 'a', name: 'Node A', icon: 'tiny' }],
    views: [
      {
        id: 'v',
        name: 'Main',
        kind: 'schematic',
        items: [{ id: 'a', tile: { x: 0, y: 0 } }]
      }
    ]
  });
  await page.goto('/');
  await expect(page.getByText('Node A', { exact: true })).toBeVisible();
  const vp = page.viewportSize()!;
  const centre = { x: vp.width / 2, y: vp.height / 2 };
  // A flat tile is 100 px square at 100%: two tiles right, one tile down.
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) {
    await page.mouse.move(centre.x + 20 * i, centre.y + 10 * i);
  }
  await page.mouse.up();
  let scene = await exported(page);
  expect(scene.views[0].placements[0].tile).toEqual({ x: 2, y: -1 });

  await page.keyboard.press('Control+z');
  scene = await exported(page);
  expect(scene.views[0].placements[0].tile).toEqual({ x: 0, y: 0 });
});
