import { expect, test, Page } from '@playwright/test';

/**
 * The bottom bar: the zoom row (zoom, fit, 2D toggle, Layers, ?) stays on
 * screen at phone width, and a long title never covers it (BUG15-34,
 * BUG15-02).
 */
const TITLE =
  'A diagram with a very long title that would run right across the bottom bar';

const open = async (page: Page, width: number, height: number) => {
  await page.setViewportSize({ width, height });
  await page.addInitScript((title) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      {
        editorMode: 'EDITABLE',
        initialData: {
          title,
          items: [{ id: 'a', name: 'Router' }],
          icons: [],
          colors: [],
          views: [
            {
              id: 'v',
              name: 'Main',
              items: [{ id: 'a', tile: { x: 0, y: 0 } }]
            }
          ]
        }
      };
  }, TITLE);
  await page.goto('/');
  await expect(page.getByRole('application')).toBeVisible();
};

const boxOf = async (page: Page, name: string) => {
  const box = await page.getByRole('button', { name }).first().boundingBox();
  expect(box, name).not.toBeNull();
  return box!;
};

test('at phone width the whole zoom row is on screen', async ({ page }) => {
  await open(page, 390, 844);
  for (const name of ['Layers', 'Keyboard shortcuts (?)']) {
    const box = await boxOf(page, name);
    expect(box.x, name).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, name).toBeLessThanOrEqual(390);
  }
});

test('a long title stops short of the zoom row at full width', async ({
  page
}) => {
  await open(page, 1440, 900);
  const title = await page
    .getByText(TITLE, { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"MuiPaper-root")][1]')
    .boundingBox();
  expect(title).not.toBeNull();
  for (const name of ['Layers', 'Keyboard shortcuts (?)']) {
    const box = await boxOf(page, name);
    const overlaps =
      title!.x < box.x + box.width &&
      box.x < title!.x + title!.width &&
      title!.y < box.y + box.height &&
      box.y < title!.y + title!.height;
    expect(overlaps, `title covers ${name}`).toBe(false);
  }
});
