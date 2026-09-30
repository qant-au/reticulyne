import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * The vector SVG draws a flat icon with the iso projection the editor gives
 * it, not as the upright square around it.
 *
 * Sweep 2026-09-30 (E07): icons were placed by their bounding box, so a
 * flat (non-isometric) icon, which the editor projects onto the iso grid
 * with a CSS matrix, came out as an upright square. Each <image> now sits
 * in a <g> carrying that projection. Fixture injected via
 * `window.__RETICULYNE_E2E__` (Docker entry only).
 */
const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23888%22/%3E%3C/svg%3E';

test('a flat icon in the vector SVG keeps its iso projection', async ({
  page
}) => {
  await page.addInitScript((url) => {
    (
      window as unknown as { __RETICULYNE_E2E__: unknown }
    ).__RETICULYNE_E2E__ = {
      initialData: {
        title: 'e2e vector',
        icons: [{ id: 'tiny', name: 'Tiny', url, collection: 'test' }],
        colors: [{ id: 'c', value: '#1f77b4' }],
        items: [{ id: 'a', name: 'Flat', icon: 'tiny' }],
        views: [{ id: 'v', name: 'V', items: [{ id: 'a', tile: { x: 0, y: 0 } }] }]
      }
    };
  }, tinyIconSvg);
  await page.goto('/');
  await expect(page.getByText('Flat', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Export as SVG' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export as SVG' });
  const download = page.waitForEvent('download', { timeout: 20000 });
  await dialog
    .getByRole('button', { name: 'Download vector SVG' })
    .click({ timeout: 20000 });
  const svg = await readFile(await (await download).path(), 'utf8');

  const doc = await page.evaluate((text) => {
    const root = new DOMParser().parseFromString(text, 'image/svg+xml');
    return [...root.querySelectorAll('image')].map((image) => {
      return image.parentElement?.getAttribute('transform') ?? '';
    });
  }, svg);
  expect(doc).toHaveLength(1);
  // The last matrix is the icon's own: a skew (b and c non-zero), as the
  // iso projection is, not a plain translate.
  const own = doc[0].match(/matrix\(([^)]+)\)\s*$/);
  expect(own).not.toBeNull();
  const [, b, c] = own![1].split(/[\s,]+/).map(Number);
  expect(Math.abs(b)).toBeGreaterThan(0.1);
  expect(Math.abs(c)).toBeGreaterThan(0.1);
});
