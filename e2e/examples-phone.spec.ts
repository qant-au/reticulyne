import { expect, test, Page } from '@playwright/test';

/**
 * The examples picker (:2223) at phone width.
 */
const BASE =
  process.env.RETICULYNE_EXAMPLES_BASE_URL ?? 'http://localhost:2223';

const openPhone = async (page: Page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE);
};

const pick = async (page: Page, index: number) => {
  if (!(await page.getByTestId(`sidebar-item-${index}`).isVisible())) {
    await page.getByTestId('sidebar-expand').click();
  }
  await page.getByTestId(`sidebar-item-${index}`).click();
};

test('picking an example shows no hover tooltip until the pointer moves (BUG15-04)', async ({
  page
}) => {
  await openPhone(page);
  await pick(page, 3); // Live dashboard
  // Longer than the tooltip's 600ms delay.
  await page.waitForTimeout(1200);
  await expect(page.getByTestId('hover-tooltip')).toHaveCount(0);
});

test('Debug tools keeps its panel to half the canvas, above the title bar', async ({
  page
}) => {
  await openPhone(page);
  await pick(page, 1); // Debug tools
  const panel = await page
    .getByText('Mouse down', { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"MuiPaper-root")][1]')
    .boundingBox();
  const title = await page
    .getByText('Airport management software system', { exact: true })
    .boundingBox();
  expect(panel && title).toBeTruthy();
  expect(panel!.height).toBeLessThanOrEqual(844 / 2 + 1);
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(390);
  expect(panel!.y + panel!.height).toBeLessThanOrEqual(title!.y);
});
