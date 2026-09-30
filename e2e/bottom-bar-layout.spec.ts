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

// Sweep 2026-09-30: a long title cut the view chip to "M" with no
// ellipsis. The title gives way first; the view keeps its name.
for (const [width, height] of [
  [1440, 900],
  [390, 844]
]) {
  test(`at ${width}px a long title truncates and the view keeps its name`, async ({
    page
  }) => {
    await open(page, width, height);
    const measure = async (el: ReturnType<Page['getByText']>) => {
      return el.evaluate((node) => {
        return { scroll: node.scrollWidth, client: node.clientWidth };
      });
    };
    const title = await measure(page.getByText(TITLE, { exact: true }));
    expect(title.scroll).toBeGreaterThan(title.client);
    const chip = page.getByRole('tab', { name: 'Main' });
    await expect(chip).toBeVisible();
    const name = await measure(chip.locator('span').first());
    expect(name.scroll).toBeLessThanOrEqual(name.client);
  });
}

// Sweep 2026-09-30: at 390 the Layers popover ran off the right edge
// (x285-561), and the inspector ran on under the title bar.
test('at phone width the Layers panel and the inspector stay clear', async ({
  page
}) => {
  await open(page, 390, 844);
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  const layers = (await page
    .getByRole('dialog', { name: 'Layers' })
    .boundingBox())!;
  expect(layers.x).toBeGreaterThanOrEqual(0);
  expect(layers.x + layers.width).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');

  const router = (await page
    .getByText('Router', { exact: true })
    .boundingBox())!;
  await page.mouse.click(
    router.x + router.width / 2,
    router.y + router.height + 40
  );
  const inspector = (await page
    .getByText('Edit object', { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"MuiPaper-root")][1]')
    .boundingBox())!;
  const title = (await page
    .getByText(TITLE, { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"MuiPaper-root")][1]')
    .boundingBox())!;
  expect(inspector.y + inspector.height).toBeLessThan(title.y);
});
