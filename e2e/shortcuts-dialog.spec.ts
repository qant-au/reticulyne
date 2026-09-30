import { expect, test, Page } from '@playwright/test';

/**
 * The ? dialog (shared with Axonometra, from @accurona/ui): alternatives
 * separated by "or", a chord's keys joined by "+", the toolbar's names,
 * and at phone width every key inside the dialog (BUG15-14).
 */
const openDialog = async (page: Page, width: number, height: number) => {
  await page.setViewportSize({ width, height });
  await page.goto('/');
  await page.getByRole('application').focus();
  await page.keyboard.press('?');
  await expect(page.getByTestId('keyboard-shortcuts')).toBeVisible();
};

const row = (page: Page, label: string) => {
  return page
    .getByTestId('keyboard-shortcuts')
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: label, exact: true }) })
    .first();
};

test('alternatives read "or", chords read "+", names match the toolbar', async ({
  page
}) => {
  await openDialog(page, 1440, 900);
  await expect(row(page, 'Select')).toContainText('or');
  await expect(row(page, 'Redo')).toContainText('+');
  await expect(row(page, 'Pan')).toContainText('H');
  await expect(row(page, 'Fit to view')).toContainText('F');
  await expect(
    page.getByTestId('keyboard-shortcuts').getByText('Hand (pan)')
  ).toHaveCount(0);
});

test('at phone width every key is inside the dialog', async ({ page }) => {
  await openDialog(page, 390, 844);
  const dialog = await page.getByRole('dialog').boundingBox();
  expect(dialog).not.toBeNull();
  const keys = page.getByTestId('keyboard-shortcuts').locator('kbd');
  const count = await keys.count();
  expect(count).toBeGreaterThan(10);
  for (let i = 0; i < count; i += 1) {
    const box = await keys.nth(i).boundingBox();
    if (!box) continue;
    expect(box.x + box.width).toBeLessThanOrEqual(dialog!.x + dialog!.width);
  }
});
