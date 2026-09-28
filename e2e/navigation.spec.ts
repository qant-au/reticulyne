import { expect, test, Page } from '@playwright/test';

/**
 * ROADMAP 2.7 (find), 2.8 (mini-map) and 2.9 (alignment guides).
 * Three nodes: A and C share tile X = 0; B sits well away.
 */
const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23999%22/%3E%3C/svg%3E';

const load = async (page: Page, editorMode = 'EDITABLE') => {
  await page.addInitScript(
    ({ url, mode }) => {
      (
        window as unknown as { __RETICULYNE_E2E__: unknown }
      ).__RETICULYNE_E2E__ = {
        editorMode: mode,
        initialData: {
          title: 'e2e navigation',
          items: [
            { id: 'a', name: 'Web server', icon: 'icon-tiny' },
            { id: 'b', name: 'Database', icon: 'icon-tiny' },
            { id: 'c', name: 'Web cache', icon: 'icon-tiny' }
          ],
          icons: [{ id: 'icon-tiny', name: 'Tiny', url, collection: 'test' }],
          colors: [{ id: 'c1', value: '#999999' }],
          views: [
            {
              id: 'view-main',
              name: 'Main',
              items: [
                { id: 'a', tile: { x: 0, y: 0 } },
                { id: 'b', tile: { x: 8, y: -6 } },
                { id: 'c', tile: { x: 0, y: 4 } }
              ]
            }
          ]
        }
      };
    },
    { url: tinyIconSvg, mode: editorMode }
  );
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
  const vp = page.viewportSize()!;
  return { x: vp.width / 2, y: vp.height / 2 };
};

test('2.7: Ctrl+F finds by name, Enter walks the matches, Esc closes', async ({
  page
}) => {
  await load(page);
  await page.mouse.move(1200, 650);
  await page.keyboard.press('Control+f');
  const input = page.getByRole('textbox', { name: 'Find items' });
  await expect(input).toBeFocused();
  await input.fill('web');
  await expect(page.getByTestId('search-count')).toHaveText('0 / 2');
  await input.press('Enter');
  await expect(page.getByTestId('search-count')).toHaveText('1 / 2');
  // The match is selected: its inspector is open.
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  await input.press('Escape');
  await expect(input).toHaveCount(0);
});

test('2.8: the mini-map shows in an editable diagram and moves the view', async ({
  page
}) => {
  await load(page);
  const map = page.getByTestId('mini-map');
  await expect(map).toBeVisible();
  // What must change is the main view, so watch a node on it.
  const label = page.getByText('Web server', { exact: true });
  const before = (await label.boundingBox())!;
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + 10, box.y + 10);
  await page.waitForTimeout(500);
  const after = (await label.boundingBox())!;
  expect(Math.abs(after.x - before.x)).toBeGreaterThan(20);
});

test('2.8: hidden by default when read-only', async ({ page }) => {
  await load(page, 'EXPLORABLE_READONLY');
  await expect(page.getByTestId('mini-map')).toHaveCount(0);
});

test('2.9: dragging a node along a shared line draws a guide', async ({
  page
}) => {
  const c = await load(page);
  // A (0, 0) is on the centre tile and shares X = 0 with C (0, 4). One
  // tile along +Y is (-70.75, -40.95) px on screen at 100% zoom, so
  // dragging A that way keeps it on C's line for the whole drag.
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x - 70.75, c.y - 40.95, { steps: 6 });
  await expect(page.getByTestId('smart-guide').first()).toBeAttached();
  await page.mouse.up();
  await expect(page.getByTestId('smart-guide')).toHaveCount(0);
});

test('zoom buttons disable at their own limit, not the other one', async ({
  page
}) => {
  await load(page);
  const zoomIn = page.getByRole('button', { name: 'Zoom in (+)' });
  const zoomOut = page.getByRole('button', { name: 'Zoom out (-)' });
  // Loads at 100%, the maximum.
  await expect(page.getByText('100%')).toBeVisible();
  await expect(zoomIn).toBeDisabled();
  await expect(zoomOut).toBeEnabled();
  await zoomOut.click();
  await expect(zoomIn).toBeEnabled();
});

test('Ctrl+wheel zooms about the pointer, not the screen centre', async ({
  page
}) => {
  await load(page);
  // Node c (tile 0,4) sits up-left of centre.
  const label = page.getByText('Web cache', { exact: true }).first();
  const box = (await label.boundingBox())!;
  const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(at.x, at.y);
  await page.keyboard.down('Control');
  for (let i = 0; i < 2; i += 1) {
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(60);
  }
  await page.keyboard.up('Control');
  await expect(page.getByText('60%')).toBeVisible();
  await page.waitForTimeout(400);
  const after = (await label.boundingBox())!;
  // The label shrinks with the zoom, so compare its bottom-centre anchor
  // loosely: it stays near the pointer instead of sliding to the centre.
  expect(Math.abs(after.x + after.width / 2 - at.x)).toBeLessThan(40);
  expect(Math.abs(after.y + after.height - (box.y + box.height))).toBeLessThan(40);
});
