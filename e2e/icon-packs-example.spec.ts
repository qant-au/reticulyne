import { expect, test } from '@playwright/test';
import { exportJson } from './iconPackHelpers';

/**
 * The examples container's "Icon packs from code": the Nautical Flags pack
 * loaded and locked by the app, and a hoist of two flags drawn from it.
 */
const BASE =
  process.env.RETICULYNE_EXAMPLES_BASE_URL ?? 'http://localhost:2223';

test('the example loads the flags pack locked and draws the hoist on a halyard', async ({
  page
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });
  await page.goto(BASE);
  await page.getByText('Icon packs from code', { exact: true }).click();
  await expect(
    page.getByText('A pleasant voyage', { exact: true })
  ).toBeVisible();
  // The scene names the flags without carrying them; the pack supplies them.
  await expect(page.getByTestId('open-notice')).toHaveCount(0);

  const scene = await exportJson(page);
  expect(
    scene.objects.map((o: { icon: string }) => {
      return o.icon;
    })
  ).toEqual(['nautical-flags-uniform', 'nautical-flags-whiskey']);
  expect(scene.connections[0].kind).toBe('halyard');
  expect(scene.externalPacks[0]).toMatchObject({
    id: 'nautical-flags',
    icons: ['nautical-flags-uniform', 'nautical-flags-whiskey']
  });

  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Icon packs' }).click();
  const row = page
    .getByRole('dialog', { name: 'Icon packs' })
    .getByTestId('icon-pack-nautical-flags');
  await expect(row).toContainText('Loaded by the app');
  await expect(row).toContainText('Locked by the app');
  expect(errors).toEqual([]);
});
