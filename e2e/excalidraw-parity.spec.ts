import { expect, test, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * Worklist 20: UXA-02 (Space+drag pan), UXA-03 (Alt+drag duplicate),
 * UXA-05 (help dialog), UXA-08 (Alt+Shift+D theme), and ROADMAP 2.12
 * (pinch to zoom). One node on the centre tile.
 */
const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23999%22/%3E%3C/svg%3E';

const load = async (page: Page) => {
  await page.addInitScript((url) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      {
        editorMode: 'EDITABLE',
        initialData: {
          title: 'e2e parity',
          items: [{ id: 'node-a', name: 'Node A', icon: 'icon-tiny' }],
          icons: [{ id: 'icon-tiny', name: 'Tiny', url, collection: 'test' }],
          colors: [{ id: 'c', value: '#999999' }],
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

const label = (page: Page) => {
  return page.getByText('Node A', { exact: true });
};

test('UXA-02: holding Space pans; releasing returns to the cursor tool', async ({
  page
}) => {
  const c = await load(page);
  const before = (await label(page).boundingBox())!;

  await page.mouse.move(c.x + 200, c.y + 150);
  await page.keyboard.down('Space');
  await page.mouse.down();
  await page.mouse.move(c.x + 320, c.y + 210, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Space');
  // Scene layers tween to a new scroll over 0.25 s (SceneLayer); measure
  // after it settles, not mid-animation.
  await page.waitForTimeout(500);

  const after = (await label(page).boundingBox())!;
  // A 120 x 60 drag in 8 steps pans about 105 x 52: pan mode lags the
  // pointer by one event, exactly as the Hand tool (H) does. Space+drag
  // is that same mode, so the assertion is the direction and rough size.
  expect(after.x - before.x).toBeGreaterThan(90);
  expect(after.x - before.x).toBeLessThanOrEqual(121);
  expect(after.y - before.y).toBeGreaterThan(45);
  expect(after.y - before.y).toBeLessThanOrEqual(61);

  // Back in the cursor tool: clicking the node selects it.
  await page.mouse.click(c.x + 120, c.y + 60);
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
});

test('UXA-03: Alt+drag leaves the original and places a copy', async ({
  page
}) => {
  const c = await load(page);
  await page.keyboard.down('Alt');
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 250, c.y + 130, { steps: 10 });
  await page.mouse.up();
  await page.keyboard.up('Alt');

  await page.getByRole('button', { name: 'Main menu' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const download = await downloadPromise;
  const view = JSON.parse(await readFile(await download.path(), 'utf8'))
    .views[0];
  expect(view.items).toHaveLength(2);
  const original = view.items.find((i: { id: string }) => {
    return i.id === 'node-a';
  });
  const copy = view.items.find((i: { id: string }) => {
    return i.id !== 'node-a';
  });
  expect(original.tile).toEqual({ x: 0, y: 0 });
  expect(copy.tile).not.toEqual({ x: 0, y: 0 });
});

test('UXA-08: Alt+Shift+D flips the theme, and flips it back', async ({
  page
}) => {
  await load(page);
  const canvas = page.getByRole('application', { name: 'Diagram canvas' });
  const bg = () => {
    return canvas.evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });
  };
  const first = await bg();
  await page.keyboard.press('Alt+Shift+KeyD');
  await expect.poll(bg).not.toBe(first);
  await page.keyboard.press('Alt+Shift+KeyD');
  await expect.poll(bg).toBe(first);
});

test('2.12: pinching in zooms out', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true });
  const page = await context.newPage();
  const c = await load(page);
  const zoomChip = page.locator('text=/^[0-9]+%$/').first();
  await expect(zoomChip).toHaveText('100%');

  const cdp = await context.newCDPSession(page);
  const touch = (type: string, spread: number) => {
    return cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints:
        type === 'touchEnd'
          ? []
          : [
              { x: c.x - spread, y: c.y, id: 1 },
              { x: c.x + spread, y: c.y, id: 2 }
            ]
    });
  };
  await touch('touchStart', 200);
  for (const spread of [180, 150, 120, 100]) {
    await touch('touchMove', spread);
  }
  await touch('touchEnd', 0);

  await expect(zoomChip).toHaveText('50%');
  await context.close();
});

test('UXA-05: the help dialog lists the gestures and the Excalidraw differences', async ({
  page
}) => {
  await load(page);
  await page.keyboard.press('?');
  await expect(
    page.getByText('Toggle light / dark', { exact: true })
  ).toBeVisible();
  await expect(page.getByText('Drag a copy', { exact: true })).toBeVisible();
  await expect(page.getByTestId('excalidraw-differences')).toContainText(
    'No diamond, ellipse'
  );
});
