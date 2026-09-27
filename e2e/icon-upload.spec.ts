import { expect, test, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * ROADMAP 2.13: the Docker shell passes readIconAsDataUrl as onIconUpload,
 * so an uploaded icon is embedded in the diagram under "My icons".
 */
const svg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="#c00"/></svg>'
);

const load = async (page: Page) => {
  await page.addInitScript(() => {
    (
      window as unknown as { __RETICULYNE_E2E__: unknown }
    ).__RETICULYNE_E2E__ = {
      initialData: {
        title: 'e2e upload',
        items: [],
        icons: [],
        colors: [{ id: 'c', value: '#999999' }],
        views: [{ id: 'view-main', name: 'Main', items: [] }]
      }
    };
  });
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
};

const exported = async (page: Page) => {
  await page.getByRole('button', { name: 'Main menu' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const download = await downloadPromise;
  return JSON.parse(await readFile(await download.path(), 'utf8'));
};

const upload = async (page: Page) => {
  await page.getByTestId('icon-upload-input').setInputFiles({
    name: 'red-box.svg',
    mimeType: 'image/svg+xml',
    buffer: svg
  });
};

test('upload an icon, place it, and it is saved in the diagram', async ({
  page
}) => {
  await load(page);
  await page.getByRole('button', { name: 'Icon library' }).click();
  await upload(page);
  // Armed for placing: click the canvas.
  await page.mouse.click(500, 400);

  const model = await exported(page);
  expect(model.icons).toHaveLength(1);
  expect(model.icons[0]).toMatchObject({
    name: 'red-box',
    collection: 'My icons'
  });
  expect(model.icons[0].url).toMatch(/^data:image\/svg\+xml/);
  expect(model.items).toHaveLength(1);
  expect(model.items[0].icon).toBe(model.icons[0].id);
});

test('the same file uploaded twice is one icon', async ({ page }) => {
  await load(page);
  await page.getByRole('button', { name: 'Icon library' }).click();
  await upload(page);
  await page.keyboard.press('Escape');
  await upload(page);
  await page.keyboard.press('Escape');
  const model = await exported(page);
  expect(model.icons).toHaveLength(1);
});

test('a file that is not an image is refused with a message', async ({
  page
}) => {
  await load(page);
  await page.getByRole('button', { name: 'Icon library' }).click();
  await page.getByTestId('icon-upload-input').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello')
  });
  await expect(page.getByText(/Use an SVG, PNG/)).toBeVisible();
});
