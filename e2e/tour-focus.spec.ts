import { expect, test, Page } from '@playwright/test';

/**
 * Tour focus: starting, finishing or ending the tour from the keyboard
 * leaves focus on the next control, never on <body>. The Read-only mode
 * example offers the tour, so this targets the examples-picker container
 * (:2223), as examples-picker.spec.ts does.
 */
const BASE =
  process.env.RETICULYNE_EXAMPLES_BASE_URL ?? 'http://localhost:2223';

const openReadonly = async (page: Page) => {
  await page.goto(BASE);
  await page.getByTestId('sidebar-item-2').click();
  await expect(page.getByRole('button', { name: 'Start tour' })).toBeVisible();
};

const startFromKeyboard = async (page: Page) => {
  await page.getByRole('button', { name: 'Start tour' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('tour-panel')).toBeVisible();
};

test('Start tour puts focus on Next', async ({ page }) => {
  await openReadonly(page);
  await startFromKeyboard(page);
  await expect(page.getByRole('button', { name: 'Next' })).toBeFocused();
});

test('Finish, End tour and Escape return focus to Start tour', async ({
  page
}) => {
  await openReadonly(page);
  const start = page.getByRole('button', { name: 'Start tour' });

  await startFromKeyboard(page);
  await page.keyboard.press('End');
  await expect(page.getByRole('button', { name: 'Finish' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish' }).focus();
  await page.keyboard.press('Enter');
  await expect(start).toBeFocused();

  await startFromKeyboard(page);
  await page.getByRole('button', { name: 'End tour' }).focus();
  await page.keyboard.press('Enter');
  await expect(start).toBeFocused();

  await startFromKeyboard(page);
  await page.keyboard.press('Escape');
  await expect(start).toBeFocused();
});
