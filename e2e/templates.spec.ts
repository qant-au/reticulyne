import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * "New from template" replaces the diagram with a starter,
 * using the editor's own icon set (the Docker default: every isopack).
 */
test('start a diagram from the Kubernetes template', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);

  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'New from template' }).click();
  await page.getByRole('button', { name: 'Kubernetes service' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Volume claim', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Main menu' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const model = JSON.parse(
    await readFile(await (await downloadPromise).path(), 'utf8')
  );
  expect(model.title).toBe('Kubernetes service');
  expect(model.items).toHaveLength(6);
  expect(
    model.items.every((i: { icon?: string }) => {
      return i.icon?.startsWith('k8s-');
    })
  ).toBe(true);
  expect(model.views[0].connectors).toHaveLength(7);
});

test('undo after picking a template does not crash the editor', async ({
  page
}) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);

  // Some history on the diagram being replaced.
  await page.keyboard.press('r');
  await page.mouse.move(600, 400);
  await page.mouse.down();
  await page.mouse.move(700, 480, { steps: 5 });
  await page.mouse.up();

  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'New from template' }).click();
  await page.getByRole('button', { name: 'Kubernetes service' }).click();
  await expect(page.getByText('Volume claim', { exact: true })).toBeVisible();

  await page.mouse.click(1100, 150);
  await page.keyboard.press('Control+z');
  await expect(page.getByText(/Editor failed to load/)).toHaveCount(0);
  await expect(page.getByText('Volume claim', { exact: true })).toBeVisible();
});

test('Clear asks first; Cancel keeps the diagram', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'New from template' }).click();
  await page.getByRole('button', { name: 'Kubernetes service' }).click();
  await expect(page.getByText('Volume claim', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Clear' }).click();
  const dialog = page.getByRole('dialog', { name: 'Clear the canvas?' });
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Volume claim', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Clear' }).click();
  await dialog.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByText('Volume claim', { exact: true })).toHaveCount(0);
});
