/**
 * One-off Playwright spec to verify the refactored ConnectorControls
 * panel against the user-facing requirements. Loaded by passing
 * --config to playwright so it can live outside e2e/ without
 * polluting the persistent test surface.
 */
import { expect, test } from '@playwright/test';

const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23888%22/%3E%3C/svg%3E';

test('Edit line panel meets the new requirements', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.addInitScript((iconSvg) => {
    window.__ISOFLOW_E2E__ = {
      initialData: {
        title: 'panel smoke',
        items: [
          { id: 'A', name: 'A', icon: 'icn' },
          { id: 'B', name: 'B', icon: 'icn' }
        ],
        icons: [
          { id: 'icn', name: 'icn', url: iconSvg, collection: 't' }
        ],
        colors: [{ id: 'c', value: '#1f77b4' }],
        views: [
          {
            id: 'v',
            name: 'v',
            items: [
              { id: 'A', tile: { x: -2, y: 0 } },
              { id: 'B', tile: { x: 2, y: 0 } }
            ],
            connectors: [
              {
                id: 'con',
                color: 'c',
                anchors: [
                  { id: 'aA', ref: { item: 'A' } },
                  { id: 'aB', ref: { item: 'B' } }
                ]
              }
            ]
          }
        ]
      }
    };
  }, tinyIconSvg);

  await page.goto('/');
  await expect(page).toHaveTitle(/Isoflow/);

  // Wait for the polyline to render, then click it to open the panel.
  const polyline = page.locator('svg polyline').first();
  await expect(polyline).toBeAttached({ timeout: 5000 });
  await polyline.click({ force: true });

  // The panel is identified by the Description input.
  const description = page.getByLabel('Description');
  await expect(description).toBeAttached({ timeout: 5000 });

  // (1) No "Edit line" header.
  const editLineHeader = page.getByText('Edit line', { exact: true });
  expect(await editLineHeader.count()).toBe(0);

  // (2) Description label is shrunk (floating) even when empty/unfocused.
  // MUI applies the `MuiInputLabel-shrink` class when the label is in
  // its floated position.
  const descLabel = page.locator('label', { hasText: 'Description' }).first();
  await expect(descLabel).toHaveClass(/MuiInputLabel-shrink/);

  // Each half-width column wraps a <Typography variant="body2"> label
  // (rendered as <p>) + a <Select> sibling in a Box. Locate by exact
  // label text, then walk to the column's parent and grab its
  // combobox. Avoids matching `Arrow` inside `Arrow Type`'s subtree.
  const selectForLabel = (label: string) => {
    return page
      .locator('p', { hasText: new RegExp(`^${label}$`) })
      .locator('xpath=..')
      .locator('[role="combobox"]');
  };

  // (3) Width dropdown shows THIN / MEDIUM / THICK.
  await expect(page.getByText('Width', { exact: true })).toBeVisible();
  const widthSelect = selectForLabel('Width');
  await widthSelect.click();
  const widthOptions = await page.locator('[role="option"]').allInnerTexts();
  expect(widthOptions).toEqual(['THIN', 'MEDIUM', 'THICK']);
  await page.keyboard.press('Escape');

  // (4) Style dropdown is next to Width (same row).
  await expect(page.getByText('Style', { exact: true })).toBeVisible();

  // (5) Arrow + Arrow Type are below.
  await expect(page.getByText('Arrow', { exact: true })).toBeVisible();
  await expect(page.getByText('Arrow Type', { exact: true })).toBeVisible();

  // (6) Arrow options are uppercase.
  const arrowSelect = selectForLabel('Arrow');
  await arrowSelect.click();
  const arrowOptions = await page.locator('[role="option"]').allInnerTexts();
  // Order from connectorDirectionOptions: START_TO_END, END_TO_START, BOTH, NONE.
  expect(arrowOptions).toEqual([
    'START TO END',
    'END TO START',
    'BOTH ENDS',
    'NO ARROW'
  ]);
  await page.keyboard.press('Escape');

  // (7) Arrow Type options are uppercase + alphabetical.
  const arrowTypeSelect = selectForLabel('Arrow Type');
  await arrowTypeSelect.click();
  const typeOptions = await page.locator('[role="option"]').allInnerTexts();
  // Every option must be uppercase.
  for (const opt of typeOptions) {
    expect(opt).toBe(opt.toUpperCase());
  }
  // Alphabetical order.
  const sorted = [...typeOptions].sort((a, b) => a.localeCompare(b));
  expect(typeOptions).toEqual(sorted);
  await page.keyboard.press('Escape');

  // (8) Arrow Type is enabled by default (direction starts as
  // START_TO_END).
  await expect(arrowTypeSelect).not.toHaveAttribute('aria-disabled', 'true');

  // (9) Pick "NO ARROW" — Arrow Type should become disabled.
  await arrowSelect.click();
  await page.getByRole('option', { name: 'NO ARROW' }).click();
  await expect(arrowTypeSelect).toHaveAttribute('aria-disabled', 'true');

  // Console hygiene.
  await page.waitForTimeout(250);
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
