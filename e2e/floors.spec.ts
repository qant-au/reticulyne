import { expect, test } from '@playwright/test';

/**
 * Floors (lw-053): the floor switcher in the title bar. The fixture is
 * injected via `window.__RETICULYNE_E2E__` (Docker entry only, see
 * src/index-docker.tsx).
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      {
        initialData: {
          title: 'e2e floors',
          icons: [],
          colors: [{ id: 'c', value: '#1f77b4' }],
          items: [
            { id: 'sw', name: 'Core switch' },
            { id: 'ap', name: 'AP east' }
          ],
          views: [
            {
              id: 'ground',
              name: 'Ground',
              items: [{ id: 'sw', tile: { x: 0, y: 0 } }]
            },
            {
              id: 'l1',
              name: 'Level 1',
              items: [{ id: 'ap', tile: { x: 2, y: 0 } }]
            }
          ],
          connections: [{ id: 'c1', from: 'sw', to: 'ap' }]
        }
      };
  });
  await page.goto('/');
  await expect(page.getByRole('tablist', { name: 'Floors' })).toBeVisible();
});

test('Floor options > Rename floor opens the name field and renames', async ({
  page
}) => {
  await page.getByRole('button', { name: 'Floor options' }).click();
  await page.getByRole('menuitem', { name: 'Rename floor' }).click();
  const field = page.getByLabel('Floor name');
  await expect(field).toBeVisible();
  await expect(field).toBeFocused();
  await field.fill('Basement');
  await field.press('Enter');
  await expect(page.getByRole('tab', { name: 'Basement' })).toBeVisible();
  await expect(page.getByLabel('Floor name')).toHaveCount(0);
});

test('double-clicking a tab still renames', async ({ page }) => {
  await page.getByRole('tab', { name: 'Level 1' }).dblclick();
  await page.getByLabel('Floor name').fill('Mezzanine');
  await page.getByLabel('Floor name').press('Enter');
  await expect(page.getByRole('tab', { name: 'Mezzanine' })).toBeVisible();
});
