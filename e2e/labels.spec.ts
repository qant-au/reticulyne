import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * Hide labels: the toolbar button and Alt+L hide and show the nodes' labels
 * for the session, the host's `showLabels` prop sets the start, and labels
 * hidden on the canvas are left out of an export.
 */
const hook = async (page: Page, extra: Record<string, unknown> = {}) => {
  await page.addInitScript(
    ({ data, more }) => {
      (
        window as unknown as { __RETICULYNE_E2E__: unknown }
      ).__RETICULYNE_E2E__ = { initialData: data, ...more };
    },
    {
      data: {
        format: 'reticulyne-scene',
        version: 2,
        id: 'e2e-labels',
        title: 'Labels',
        objects: [
          { id: 'sw', name: 'Core switch', element: 'network-switch' },
          { id: 'srv', name: 'File server', element: 'rack-server-1u' }
        ],
        views: [
          {
            id: 'v',
            kind: 'iso',
            name: 'Main',
            placements: [
              { object: 'sw', tile: { x: 0, y: 0 } },
              { object: 'srv', tile: { x: 2, y: 0 } }
            ]
          }
        ]
      },
      more: extra
    }
  );
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
};

const label = (page: Page, name: string) => {
  return page.getByRole('application').getByText(name, { exact: true });
};

test('the toolbar button and Alt+L hide and show the labels', async ({ page }) => {
  await hook(page);
  await expect(label(page, 'Core switch')).toBeVisible();
  await expect(label(page, 'File server')).toBeVisible();

  await page.getByRole('button', { name: 'Hide labels (Alt+L)' }).click();
  await expect(label(page, 'Core switch')).toHaveCount(0);
  await expect(label(page, 'File server')).toHaveCount(0);
  // The nodes themselves are still drawn.
  await expect(page.getByRole('application').locator('img')).toHaveCount(2);

  await page.getByRole('application').focus();
  await page.keyboard.press('Alt+KeyL');
  await expect(label(page, 'Core switch')).toBeVisible();
  await page.keyboard.press('Alt+KeyL');
  await expect(label(page, 'Core switch')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Show labels (Alt+L)' })
  ).toBeVisible();
});

test('showLabels: false starts with the labels hidden, in the read-only mode too', async ({
  page
}) => {
  await hook(page, { showLabels: false, editorMode: 'EXPLORABLE_READONLY' });
  await expect(page.getByRole('application').locator('img')).toHaveCount(2);
  await expect(label(page, 'Core switch')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show labels (Alt+L)' }).click();
  await expect(label(page, 'Core switch')).toBeVisible();
});

test('an SVG export leaves hidden labels out', async ({ page }) => {
  await hook(page);
  await page.getByRole('button', { name: 'Hide labels (Alt+L)' }).click();
  await expect(label(page, 'Core switch')).toHaveCount(0);

  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Export as SVG' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export as SVG' });
  const download = page.waitForEvent('download', { timeout: 20000 });
  await dialog
    .getByRole('button', { name: 'Download vector SVG' })
    .click({ timeout: 20000 });
  const svg = await readFile(await (await download).path(), 'utf8');
  expect(svg).not.toContain('Core switch');
  expect(svg).not.toContain('File server');
  expect(svg).toContain('<image');
});
