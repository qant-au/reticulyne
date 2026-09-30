import { expect, test, type Page } from '@playwright/test';

/**
 * Main menu > Export as PDF produces a PDF file.
 *
 * Sweep 2026-09-30: with an item that has no icon on the canvas (here
 * 'Printer box'), the canvas held an <img src="">, html-to-image rejected
 * the capture with the image's DOM error Event, and the export did
 * nothing but log a pageerror "Event". Fixture injected via
 * `window.__RETICULYNE_E2E__` (Docker entry only, see src/index-docker.tsx).
 */
const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23888%22/%3E%3C/svg%3E';

const load = async (page: Page, redacted: boolean) => {
  await page.addInitScript(
    ({ url, redacted: withRedacted }) => {
      (
        window as unknown as { __RETICULYNE_E2E__: unknown }
      ).__RETICULYNE_E2E__ = {
        initialData: {
          title: 'e2e pdf',
          icons: [{ id: 'tiny', name: 'Tiny', url, collection: 'test' }],
          colors: [{ id: 'c', value: '#1f77b4' }],
          items: [
            { id: 'a', name: 'Switch', icon: 'tiny' },
            // No icon: the case that broke the capture.
            { id: 'b', name: 'Printer box' }
          ],
          views: [
            {
              id: 'v',
              name: 'Main',
              items: [
                { id: 'a', tile: { x: 0, y: 0 } },
                {
                  id: 'b',
                  tile: { x: 3, y: 0 },
                  ...(withRedacted ? { layerId: 'redacted' } : {})
                }
              ]
            },
            // A second floor, so the faint other-floor layer is drawn too.
            {
              id: 'v2',
              name: 'Upstairs',
              items: [{ id: 'b', tile: { x: 0, y: 2 } }]
            }
          ]
        }
      };
    },
    { url: tinyIconSvg, redacted }
  );
  await page.goto('/');
  await expect(page.getByText('Switch', { exact: true })).toBeVisible();
};

test('Export as PDF downloads a PDF, with no page error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });
  await load(page, false);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Export as PDF' }).click();
  const file = await download;

  expect(file.suggestedFilename()).toBe('e2e-pdf.pdf');
  const path = await file.path();
  const { readFileSync } = await import('node:fs');
  expect(readFileSync(path).subarray(0, 5).toString()).toBe('%PDF-');
  expect(errors).toEqual([]);
});

test('with Redacted content, Export as PDF asks first, then downloads', async ({
  page
}) => {
  await load(page, true);
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Export as PDF' }).click();

  const dialog = page.getByRole('dialog', { name: 'Export as PDF' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Include redacted content')).not.toBeChecked();

  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download PDF' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
});
