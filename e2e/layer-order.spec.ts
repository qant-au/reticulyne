import { expect, test, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * ROADMAP 1.3 / UXA-06 — layer ordering, driven through the browser.
 *
 * Three rectangles, of which only `rA` covers the centre tile. Each test
 * does one ordering action on a fresh page and reads the result back from
 * Export as JSON (index 0 = frontmost), because that export is the
 * persisted truth. One action per page keeps every click ahead of the
 * export: right after an export the first click on an item does not
 * select it, a separate existing bug that is out of scope here.
 */
type Mode = 'EDITABLE' | 'EXPLORABLE_READONLY';

const rect = (id: string, x: number) => {
  return {
    id,
    color: 'color1',
    from: { x, y: x },
    to: { x: x + 2, y: x + 2 }
  };
};

const RECTS = { rA: rect('rA', -1), rB: rect('rB', 6), rC: rect('rC', -8) };

const load = async (page: Page, order: (keyof typeof RECTS)[], mode: Mode) => {
  const data = {
    editorMode: mode,
    initialData: {
      title: 'e2e layer order',
      items: [],
      icons: [],
      colors: [{ id: 'color1', value: '#88aacc' }],
      views: [
        {
          id: 'view-main',
          name: 'Main',
          items: [],
          rectangles: order.map((id) => {
            return RECTS[id];
          })
        }
      ]
    }
  };
  await page.addInitScript((d) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      d;
  }, data);
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
  const vp = page.viewportSize()!;
  const centre = { x: vp.width / 2, y: vp.height / 2 };
  await page.mouse.move(centre.x, centre.y);
  return centre;
};

const exportedOrder = async (page: Page): Promise<string[]> => {
  await page.getByRole('button', { name: 'Main menu' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const download = await downloadPromise;
  const model = JSON.parse(await readFile(await download.path(), 'utf8'));
  return model.views[0].rectangles.map((r: { id: string }) => {
    return r.id;
  });
};

test('context menu offers the four layer actions and sends to back', async ({
  page
}) => {
  const centre = await load(page, ['rA', 'rB', 'rC'], 'EDITABLE');
  await page.mouse.click(centre.x, centre.y, { button: 'right' });
  for (const label of [
    'Bring to front',
    'Bring forward',
    'Send backward',
    'Send to back'
  ]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  await page.getByText('Send to back', { exact: true }).click();
  expect(await exportedOrder(page)).toEqual(['rB', 'rC', 'rA']);
});

for (const [keys, expected] of [
  ['Control+BracketRight', ['rB', 'rA', 'rC']],
  ['Control+Shift+BracketRight', ['rA', 'rB', 'rC']]
] as const) {
  test(`${keys} moves the selected rectangle`, async ({ page }) => {
    const centre = await load(page, ['rB', 'rC', 'rA'], 'EDITABLE');
    await page.mouse.click(centre.x, centre.y);
    await expect(page.getByText('Layer order', { exact: true })).toBeVisible();
    await page.keyboard.press(keys);
    expect(await exportedOrder(page)).toEqual(expected);
  });
}

test('inspector Back button moves the selected rectangle', async ({ page }) => {
  const centre = await load(page, ['rA', 'rB', 'rC'], 'EDITABLE');
  await page.mouse.click(centre.x, centre.y);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  expect(await exportedOrder(page)).toEqual(['rB', 'rC', 'rA']);
});

test('read-only mode opens no layer menu', async ({ page }) => {
  const centre = await load(page, ['rA', 'rB', 'rC'], 'EXPLORABLE_READONLY');
  await page.mouse.click(centre.x, centre.y, { button: 'right' });
  await page.waitForTimeout(200);
  await expect(page.getByText('Bring to front', { exact: true })).toHaveCount(
    0
  );
});
