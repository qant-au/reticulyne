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

// Sweep 2026-09-30, round 3: a wrapped row ended its first line with "or"
// and the label sat between the lines; two pointer rows were both "Pan";
// "the add-item tool, then Enter" was plain text; and at 390 the
// differences were three 80-100px columns.
for (const [width, height] of [
  [1440, 900],
  [390, 844]
] as const) {
  test(`\`or\` starts the line of its alternative, labels are distinct, at ${width}`, async ({
    page
  }) => {
    await openDialog(page, width, height);
    const dialog = page.getByTestId('keyboard-shortcuts');
    const dangling = await dialog.getByRole('row').evaluateAll((rows) => {
      const bad: string[] = [];
      for (const r of rows) {
        const cells = r.querySelectorAll('td');
        if (cells.length < 2) continue;
        const ors = [...cells[1].querySelectorAll('span')].filter((s) => {
          return s.children.length === 0 && s.textContent === 'or';
        });
        for (const or of ors) {
          // What follows "or" in reading order must share its line.
          const all = [...cells[1].querySelectorAll('kbd, span')].filter((e) => {
            return e.children.length === 0;
          });
          const next = all[all.indexOf(or) + 1];
          const a = or.getBoundingClientRect();
          const b = next?.getBoundingClientRect();
          if (!b || Math.abs(a.top + a.height / 2 - (b.top + b.height / 2)) > 6) {
            bad.push(cells[0].textContent ?? '');
          }
        }
        // The label is level with the first line of its keys.
        const first = cells[1].querySelector('kbd, span span');
        if (first && getComputedStyle(cells[0]).display === 'table-cell') {
          const l = cells[0].getBoundingClientRect();
          const k = first.getBoundingClientRect();
          if (Math.abs(l.top - k.top) > 12) bad.push('label: ' + cells[0].textContent);
        }
      }
      return bad;
    });
    expect(dangling).toEqual([]);

    const pointer = dialog.getByRole('region', { name: 'Pointer and touch' });
    const labels = await pointer.getByRole('row').evaluateAll((rows) => {
      return rows.map((r) => {
        return r.querySelector('td')?.textContent ?? '';
      });
    });
    expect(new Set(labels).size).toBe(labels.length);
    await expect(row(page, 'Pan by dragging')).toBeVisible();
    await expect(row(page, 'Pan with the wheel')).toBeVisible();

    const addRow = row(page, 'Add an item on an empty tile');
    await expect(addRow.locator('kbd', { hasText: /^I$/ })).toHaveCount(1);
    await expect(addRow.locator('kbd', { hasText: /^Enter$/ })).toHaveCount(1);
    await expect(addRow).not.toContainText('add-item tool');

    const cellWidths = await page
      .getByTestId('excalidraw-differences')
      .locator('tbody tr')
      .first()
      .locator('td')
      .evaluateAll((tds) => {
        return tds.map((td) => {
          return td.getBoundingClientRect().width;
        });
      });
    if (width < 600) {
      // Stacked: every column runs the dialog's width.
      for (const w of cellWidths) expect(w).toBeGreaterThan(250);
    } else {
      expect(cellWidths).toHaveLength(3);
    }
  });
}
