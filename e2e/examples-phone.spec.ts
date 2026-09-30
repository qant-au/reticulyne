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
