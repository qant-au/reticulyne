import { expect, test, Page } from '@playwright/test';

/**
 * Worklist 29. Mode handlers used to see the pointer as of the last
 * render, one event behind. A click that arrives straight after a jump
 * (the pointer moves from the main menu to an item and presses at once,
 * as after an export) was handled against the old position and missed
 * the item; pan lagged the pointer by one event for the same reason.
 */
const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23999%22/%3E%3C/svg%3E';

const load = async (page: Page) => {
  await page.addInitScript((url) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      {
        editorMode: 'EDITABLE',
        initialData: {
          title: 'e2e freshness',
          items: [{ id: 'node-a', name: 'Node A', icon: 'icon-tiny' }],
          icons: [{ id: 'icon-tiny', name: 'Tiny', url, collection: 'test' }],
          colors: [{ id: 'c', value: '#999999' }],
          views: [
            {
              id: 'view-main',
              name: 'Main',
              items: [{ id: 'node-a', tile: { x: 0, y: 0 } }]
            }
          ]
        }
      };
  }, tinyIconSvg);
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
  const vp = page.viewportSize()!;
  return { x: vp.width / 2, y: vp.height / 2 };
};

test('the first click after an export selects the item', async ({ page }) => {
  const c = await load(page);
  await page.getByRole('button', { name: 'Main menu' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  await downloadPromise;

  await page.mouse.click(c.x, c.y);
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
});

test('a click straight after a long jump selects the item', async ({
  page
}) => {
  const c = await load(page);
  await page.mouse.move(20, 20);
  await page.waitForTimeout(100);
  await page.mouse.click(c.x, c.y);
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
});

test('pan follows the pointer exactly', async ({ page }) => {
  const c = await load(page);
  const label = page.getByText('Node A', { exact: true });
  const before = (await label.boundingBox())!;
  await page.keyboard.press('h');
  await page.mouse.move(c.x + 200, c.y + 150);
  await page.mouse.down();
  await page.mouse.move(c.x + 320, c.y + 210, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const after = (await label.boundingBox())!;
  expect(after.x - before.x).toBeCloseTo(120, 0);
  expect(after.y - before.y).toBeCloseTo(60, 0);
});
