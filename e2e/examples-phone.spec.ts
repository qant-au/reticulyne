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

test('narrowed to a phone, the rail closes and the tour panel keeps a usable width', async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE);
  await page.getByTestId('sidebar-item-2').click(); // Read-only mode
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('sidebar-expand')).toBeVisible();
  await page.getByRole('button', { name: 'Start tour' }).click();
  const panel = await page.getByTestId('tour-panel').boundingBox();
  expect(panel).not.toBeNull();
  expect(panel!.width).toBeGreaterThanOrEqual(280);
  expect(panel!.x).toBeGreaterThanOrEqual(0);
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(390);
  await expect(page.getByRole('button', { name: 'Previous' })).toBeInViewport();
});

// Sweep 2026-09-30: at 390 the Start tour button sat on the title bar's
// text, and at Step 1 an expanded description ran off the top.
test('Read-only mode on a phone: Start tour and the tour clear the title bar; the label fits', async ({
  page
}) => {
  await openPhone(page);
  await pick(page, 2); // Read-only mode
  const titleBar = async () => {
    return (await page
      .getByText('Airport management software system', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"MuiPaper-root")][1]')
      .boundingBox())!;
  };
  const start = (await page
    .getByRole('button', { name: 'Start tour' })
    .boundingBox())!;
  expect(start.y + start.height).toBeLessThanOrEqual((await titleBar()).y);

  // Expand the first node's description, then start the tour on it.
  await page
    .getByRole('button', { name: 'Show more' })
    .first()
    .click({ force: true });
  await page.getByRole('button', { name: 'Start tour' }).click();
  const panel = (await page.getByTestId('tour-panel').boundingBox())!;
  expect(panel.y + panel.height).toBeLessThanOrEqual((await titleBar()).y);
  await expect(async () => {
    const top = await page.evaluate(() => {
      const label = document.querySelector('[data-node-label="item1"]');
      return Math.min(
        ...[...label!.querySelectorAll('*')].map((el) => {
          return el.getBoundingClientRect().top;
        })
      );
    });
    expect(top).toBeGreaterThanOrEqual(0);
  }).toPass({ timeout: 3000 });
});
