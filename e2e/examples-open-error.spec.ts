import { expect, test, Page } from '@playwright/test';

/**
 * Examples picker (:2223): Main menu > Open with a file that is not a
 * diagram shows a message, as the editor build's import does, instead of
 * only a console error.
 */
const BASE =
  process.env.RETICULYNE_EXAMPLES_BASE_URL ?? 'http://localhost:2223';

const openWith = async (page: Page, name: string, text: string) => {
  await page.goto(BASE);
  await page.getByRole('button', { name: 'Main menu' }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('menuitem', { name: 'Open' }).click();
  await (
    await chooser
  ).setFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(text)
  });
};

test('Open with a file that is not JSON says so', async ({ page }) => {
  await openWith(page, 'invalid.json', 'not json {');
  await expect(page.getByRole('alert')).toContainText('not valid JSON');
});

test('Open with JSON that is not a diagram says so', async ({ page }) => {
  await openWith(page, 'other.json', '{"hello":"world"}');
  await expect(page.getByRole('alert')).toContainText('not a valid diagram');
  // The diagram that was open stays open.
  await expect(
    page.getByText('Airport management software system', { exact: true })
  ).toBeVisible();
});
