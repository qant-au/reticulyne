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

// Sweep 2026-09-30, round 4: Previous disabling itself at step 1 dropped
// focus to <body>, and Escape from there left it on <body>.
test('Previous at step 2 hands focus to Next; Escape from anywhere returns to Start tour', async ({
  page
}) => {
  await openReadonly(page);
  const start = page.getByRole('button', { name: 'Start tour' });
  await startFromKeyboard(page);
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText(/^Step 2 of/)).toBeVisible();
  await page.getByRole('button', { name: 'Previous' }).click();
  await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Next' })).toBeFocused();

  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('tour-panel')).toHaveCount(0);
  await expect(start).toBeFocused();
});

// Sweep 2026-09-30: Start tour sat after the canvas in the DOM, and Tab
// walks the canvas's objects, so reaching it took 74 presses.
test('Tab reaches Start tour before the canvas', async ({ page }) => {
  await openReadonly(page);
  const start = page.getByRole('button', { name: 'Start tour' });
  await page.getByTestId('sidebar-item-2').focus();
  let presses = 0;
  for (; presses < 20; presses += 1) {
    const onStart = await start.evaluate((el) => {
      return el === document.activeElement;
    });
    if (onStart) break;
    const onCanvas = await page.getByLabel('Diagram canvas').evaluate((el) => {
      return el.contains(document.activeElement);
    });
    expect(onCanvas, 'Tab reached the canvas before Start tour').toBe(false);
    await page.keyboard.press('Tab');
  }
  await expect(start).toBeFocused();
});

// Sweep 2026-09-30, round 3: at 390 Step 1 left the AODB description at two
// lines and a Show more chevron, by click and by keyboard. A step shows its
// node's description in full, at every width, on screen.
for (const [width, height] of [
  [1440, 900],
  [390, 844]
] as const) {
  for (const how of ['click', 'keyboard'] as const) {
    test(`at ${width} Step 1 shows its node's description in full (${how})`, async ({
      page
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto(BASE);
      const expand = page.getByRole('button', { name: 'Expand sidebar' });
      if (await expand.isVisible()) await expand.click();
      await page.getByTestId('sidebar-item-2').click();
      const start = page.getByRole('button', { name: 'Start tour' });
      await expect(start).toBeVisible();
      if (how === 'click') await start.click();
      else await startFromKeyboard(page);
      await expect(page.getByTestId('tour-panel')).toBeVisible();
      const label = page.locator('[data-node-label="item1"]');
      await expect(
        label.getByRole('button', { name: 'Show less' })
      ).toBeVisible();
      await expect(label.getByRole('button', { name: 'Show more' })).toHaveCount(0);
      await page.getByRole('button', { name: 'Next' }).click();
      await expect(label.getByRole('button', { name: 'Show more' })).toBeVisible();
    });
  }
}
