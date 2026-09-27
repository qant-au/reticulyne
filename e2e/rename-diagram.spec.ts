import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * ROADMAP 1.2 — rename the diagram from the main menu. The new title shows
 * in the title bar and names the JSON export, and the exported model
 * carries it.
 */
test('Rename diagram updates the title bar and the export', async ({
  page
}) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
  await expect(page.getByText('Untitled', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Rename diagram' }).click();

  const field = page.getByLabel('Title');
  await expect(field).toHaveValue('Untitled');
  await field.fill('Site network');
  await field.press('Enter');

  await expect(page.getByText('Site network', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Main menu' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('Site-network.json');
  const model = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(model.title).toBe('Site network');
});
