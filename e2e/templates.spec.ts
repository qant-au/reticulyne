import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * ROADMAP 2.14: "New from template" replaces the diagram with a starter,
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
