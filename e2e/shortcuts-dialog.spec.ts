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

// Sweep 2026-09-30: pointer rows mixed chips and text, and glyphs and
// words; Bring to front's second way wrapped onto a line starting "or";
// the differences said "fit everything" and "Ctrl/Cmd"; and the
// right-click row claimed a context menu empty canvas does not have.
test('pointer rows are keys, alternatives stay together, differences use row names', async ({
  page
}) => {
  await openDialog(page, 1440, 900);
  for (const [label, count] of [
    ['Add to or remove from the selection', 2],
    ['Drag a copy', 2],
    ['Pan the view', 2],
    ['Select an area', 1]
  ] as const) {
    await expect(row(page, label).locator('kbd'), label).toHaveCount(count);
  }
  await expect(row(page, 'Drag a copy')).not.toContainText('Alt + drag');
  await expect(row(page, "Open an object's menu")).toContainText(
    /Right-click\s*an object/
  );
  await expect(
    page.getByTestId('keyboard-shortcuts').getByRole('cell', {
      name: 'Context menu',
      exact: true
    })
  ).toHaveCount(0);

  for (const label of ['Bring to front', 'Send to back']) {
    const tops = await row(page, label)
      .locator('kbd')
      .evaluateAll((kbds) => {
        return kbds.map((k) => {
          return Math.round(k.getBoundingClientRect().top);
        });
      });
    expect(tops.length, label).toBeGreaterThan(3);
    expect(Math.max(...tops) - Math.min(...tops), label).toBeLessThanOrEqual(2);
  }

  const differences = page.getByTestId('excalidraw-differences');
  await expect(differences).toContainText('Fit to view');
  await expect(differences).not.toContainText('fit everything');
  await expect(differences).not.toContainText('Ctrl/Cmd');
  await expect(differences).not.toContainText('{');
});
