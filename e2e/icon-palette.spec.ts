import { expect, test, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * ROADMAP 2.11 — the persistent icon library: open it from the toolbar,
 * drag an icon onto the canvas, and it stays open for the next one.
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
          title: 'e2e palette',
          items: [],
          icons: [
            { id: 'icon-tiny', name: 'Tiny test icon', url, collection: 'test' }
          ],
          colors: [{ id: 'c', value: '#999999' }],
          views: [{ id: 'view-main', name: 'Main', items: [] }]
        }
      };
    },
    { url: tinyIconSvg, mode: editorMode }
  );
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
};

const exportedItems = async (page: Page) => {
  await page.getByRole('button', { name: 'Main menu' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const download = await downloadPromise;
  return JSON.parse(await readFile(await download.path(), 'utf8')).views[0]
    .items;
};

test('drag an icon from the library onto the canvas; the library stays open', async ({
  page
}) => {
  await load(page);
  await page.getByRole('button', { name: 'Icon library' }).click();
  const palette = page.getByTestId('icon-palette');
  await expect(palette).toBeVisible();
  await palette.getByRole('textbox').fill('Tiny');

  const icon = palette.getByRole('button', { name: /Tiny test icon/ }).first();
  const from = (await icon.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(500, 400, { steps: 12 });
  await page.mouse.up();

  await expect(palette).toBeVisible();
  expect(await exportedItems(page)).toHaveLength(1);
});

test('the library toggle is not offered read-only', async ({ page }) => {
  await load(page, 'EXPLORABLE_READONLY');
  await expect(page.getByRole('button', { name: 'Icon library' })).toHaveCount(
    0
  );
});
