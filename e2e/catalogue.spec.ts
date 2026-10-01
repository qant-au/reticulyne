import { expect, test, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * The catalogue in the icon library: an item placed from it becomes an
 * object with its ports and its catalogue link, drawn with its Accurona
 * twin, or with its 2D schematic symbol when it has no twin.
 */
const exportScene = async (page: Page) => {
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Main menu' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const download = await downloadPromise;
  return JSON.parse(await readFile(await download.path(), 'utf8')) as {
    objects: {
      name: string;
      icon?: string;
      element?: string;
      ports?: { id: string }[];
      links?: { source: string; ref: string }[];
    }[];
    icons: { id: string; url: string }[];
  };
};

const dragFromCatalogue = async (page: Page, search: string, name: RegExp) => {
  const palette = page.getByTestId('icon-palette');
  await palette.getByRole('textbox').fill(search);
  const tile = palette
    .getByTestId('catalogue-items')
    .getByRole('button', { name })
    .first();
  const from = (await tile.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(500, 450, { steps: 12 });
  await page.mouse.up();
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
  await page.getByRole('button', { name: 'Icon library', exact: true }).click();
  await expect(page.getByTestId('icon-palette')).toBeVisible();
});

test('an item with an Accurona twin keeps its ports, link and element', async ({
  page
}) => {
  await dragFromCatalogue(page, 'Turnstile', /^Icon Turnstile/);
  const scene = await exportScene(page);
  expect(scene.objects).toHaveLength(1);
  const [object] = scene.objects;
  expect(object.element).toBe('turnstile');
  expect(object.icon).toBe('accurona-turnstile');
  expect(object.links).toEqual([{ source: 'reticulyne', ref: 'turnstile' }]);
  expect(object.ports?.length).toBeGreaterThan(0);
});

test('an item with no twin is drawn with its schematic symbol', async ({
  page
}) => {
  await dragFromCatalogue(page, 'RS-485', /^Icon RS-485/);
  // The node draws an image, not just its label.
  await expect(
    page.locator('img[src^="data:image/svg+xml"]').last()
  ).toBeVisible();
  const scene = await exportScene(page);
  expect(scene.objects).toHaveLength(1);
  const [object] = scene.objects;
  expect(object.icon).toBe('schematic-rs485-ethernet-gateway');
  // The diagram carries the icon it refers to.
  expect(
    scene.icons.some((icon) => {
      return icon.id === object.icon;
    })
  ).toBe(true);
});
