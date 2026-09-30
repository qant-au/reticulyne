import { expect, test, type Page } from '@playwright/test';

/**
 * Export as image draws every node's icon.
 *
 * Sweep 2026-09-30 (A14): node icons are <img loading="lazy">, and the
 * export dialog renders its editor off screen, so the lazy icons the
 * browser never saw never loaded: the PNG and its preview drew the labels
 * with one icon of five. The export now makes every image eager and waits
 * for it to decode before capturing. Each icon here is a solid square of
 * its own colour, and the preview must contain all four colours.
 * Fixture injected via `window.__RETICULYNE_E2E__` (Docker entry only).
 */
const COLOURS = {
  red: [255, 0, 0],
  green: [0, 200, 0],
  blue: [0, 0, 255],
  magenta: [255, 0, 255]
} as const;

const square = (hex: string) => {
  return `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23${hex}%22/%3E%3C/svg%3E`;
};

const load = async (page: Page) => {
  const icons = [
    { id: 'red', url: square('ff0000') },
    { id: 'green', url: square('00c800') },
    { id: 'blue', url: square('0000ff') },
    { id: 'magenta', url: square('ff00ff') }
  ];
  await page.addInitScript((iconList) => {
    (
      window as unknown as { __RETICULYNE_E2E__: unknown }
    ).__RETICULYNE_E2E__ = {
      initialData: {
        title: 'e2e icons',
        icons: iconList.map((icon) => {
          return { ...icon, name: icon.id, collection: 'test' };
        }),
        colors: [{ id: 'c', value: '#1f77b4' }],
        items: iconList.map((icon) => {
          return { id: icon.id, name: `Node ${icon.id}`, icon: icon.id };
        }),
        views: [
          {
            id: 'v',
            name: 'Main',
            items: iconList.map((icon, i) => {
              return { id: icon.id, tile: { x: i * 4, y: -i * 3 } };
            })
          }
        ]
      }
    };
  }, icons);
  await page.goto('/');
  await expect(page.getByText('Node red', { exact: true })).toBeVisible();
};

test('the PNG preview draws every icon, not only the first', async ({
  page
}) => {
  await load(page);
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Export as Image' }).click();

  const preview = page
    .getByRole('dialog', { name: 'Export as image' })
    .locator('img[src^="data:image/png"]');
  await expect(preview).toBeVisible({ timeout: 20000 });

  const found = await preview.evaluate(async (img: HTMLImageElement, cols) => {
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const seen = new Set<string>();
    for (let i = 0; i < data.length; i += 4) {
      for (const [name, [r, g, b]] of Object.entries(cols)) {
        if (
          Math.abs(data[i] - r) < 8 &&
          Math.abs(data[i + 1] - g) < 8 &&
          Math.abs(data[i + 2] - b) < 8
        ) {
          seen.add(name);
        }
      }
    }
    return [...seen].sort();
  }, COLOURS);

  expect(found).toEqual(['blue', 'green', 'magenta', 'red']);
});
