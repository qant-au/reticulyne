import { expect, test, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * Worklist 19 — multi-select follow-ups: bulk colour and a multi-item
 * clipboard, driven through the editor and read back from Export as JSON.
 */
const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23999%22/%3E%3C/svg%3E';

const load = async (page: Page) => {
  await page.addInitScript((url) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      {
        editorMode: 'EDITABLE',
        initialData: {
          title: 'e2e multi edit',
          items: [
            { id: 'node-a', name: 'A', icon: 'icon-tiny' },
            { id: 'node-b', name: 'B', icon: 'icon-tiny' }
          ],
          icons: [{ id: 'icon-tiny', name: 'Tiny', url, collection: 'test' }],
          colors: [
            { id: 'c-grey', value: '#999999' },
            { id: 'c-red', value: '#dd3333' }
          ],
          views: [
            {
              id: 'view-main',
              name: 'Main',
              items: [
                { id: 'node-a', tile: { x: 0, y: 0 } },
                { id: 'node-b', tile: { x: 3, y: 0 } }
              ],
              rectangles: [
                {
                  id: 'rect-1',
                  color: 'c-grey',
                  from: { x: -4, y: -4 },
                  to: { x: -3, y: -3 }
                }
              ],
              connectors: [
                {
                  id: 'conn-1',
                  color: 'c-grey',
                  anchors: [
                    { id: 'a1', ref: { item: 'node-a' } },
                    { id: 'a2', ref: { item: 'node-b' } }
                  ]
                }
              ]
            }
          ]
        }
      };
  }, tinyIconSvg);
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
  const vp = page.viewportSize()!;
  // Keyboard shortcuts need the pointer over the canvas.
  await page.mouse.move(vp.width - 100, vp.height / 2);
};

const exported = async (page: Page) => {
  await page.getByRole('button', { name: 'Main menu' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const download = await downloadPromise;
  return JSON.parse(await readFile(await download.path(), 'utf8')).views[0];
};

test('bulk colour recolours every connector and rectangle in the selection', async ({
  page
}) => {
  await load(page);
  await page.keyboard.press('Control+a');
  await expect(
    page.getByText('Applies to connectors and rectangles', { exact: false })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Colour #dd3333' }).click();

  const view = await exported(page);
  expect(view.connectors[0].color).toBe('c-red');
  expect(view.rectangles[0].color).toBe('c-red');
});

test('copy and paste the whole selection; connectors are left out', async ({
  page
}) => {
  await load(page);
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');

  // The pasted group is now the selection.
  await expect(page.getByText('3 selected', { exact: true })).toBeVisible();

  const view = await exported(page);
  expect(view.items).toHaveLength(4);
  expect(view.rectangles).toHaveLength(2);
  expect(view.connectors).toHaveLength(1);
});
