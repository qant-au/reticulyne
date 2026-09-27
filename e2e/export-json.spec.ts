import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * DEP-01 — JSON export downloads through downloadFile(), the inline
 * blob: URL + <a download> helper that replaced file-saver. The unit
 * tests stub URL.createObjectURL and the anchor click, so only a real
 * browser can show the download actually starts and carries the model.
 */
test('Export as JSON downloads a parseable model file', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);

  await page.getByRole('button', { name: 'Main menu' }).click();
  const exportJson = page.getByRole('menuitem', { name: /Export as JSON/i });
  await expect(exportJson).toBeVisible();

  const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
  await exportJson.click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^reticulyne-export-.*\.json$/);
  const body = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(Array.isArray(body.views)).toBe(true);
});
