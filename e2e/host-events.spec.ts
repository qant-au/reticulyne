import { expect, test, Page } from '@playwright/test';

/**
 * ROADMAP 1.6: onNodeClick / onConnectorClick. Node A sits on the centre
 * tile (0, 0), node B at (0, 4), and connector c1 runs between them along
 * X = 0. One tile along +Y is (-70.75, -40.95) px on screen at 100% zoom.
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
        recordEvents: true,
        initialData: {
          title: 'e2e host events',
          items: [
            { id: 'a', name: 'Node A', icon: 'icon-tiny' },
            { id: 'b', name: 'Node B', icon: 'icon-tiny' }
          ],
          icons: [{ id: 'icon-tiny', name: 'Tiny', url, collection: 'test' }],
          colors: [{ id: 'c', value: '#999999' }],
          views: [
            {
              id: 'view-main',
              name: 'Main',
              items: [
                { id: 'a', tile: { x: 0, y: 0 } },
                { id: 'b', tile: { x: 0, y: 4 } }
              ],
              connectors: [
                {
                  id: 'c1',
                  anchors: [
                    { id: 'a1', ref: { item: 'a' } },
                    { id: 'a2', ref: { item: 'b' } }
                  ]
                }
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

const events = (page: Page) => {
  return page.evaluate(() => {
    return (
      (window as unknown as { __RETICULYNE_E2E_EVENTS__?: unknown[] })
        .__RETICULYNE_E2E_EVENTS__ ?? []
    );
  });
};

for (const mode of ['EDITABLE', 'EXPLORABLE_READONLY']) {
  test(`${mode}: clicking a node and a connector calls the host`, async ({
    page
  }) => {
    const c = await load(page, mode);
    await page.mouse.click(c.x, c.y);
    // Two tiles along +Y: the middle of c1.
    await page.mouse.click(c.x - 141.5, c.y - 81.9);
    await expect.poll(() => events(page)).toEqual([
      ['node', 'a'],
      ['connector', 'c1']
    ]);
  });
}

test('dragging a node is not a click', async ({ page }) => {
  const c = await load(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 141.5, c.y, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  expect(await events(page)).toEqual([]);
});
