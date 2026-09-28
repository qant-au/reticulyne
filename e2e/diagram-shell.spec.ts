import { expect, test, Page } from '@playwright/test';

/**
 * APP-01: the Docker editor keeps diagrams in localStorage, with a
 * Diagrams menu to create, switch, import and delete them.
 */
const rename = async (page: Page, title: string) => {
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Rename diagram' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Title').press('Enter');
};

const save = async (page: Page) => {
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Save' }).click();
  await expect(page.getByText(/^Saved/)).toBeVisible();
};

const diagrams = (page: Page) => {
  return page.getByRole('button', { name: 'Diagrams' });
};

const titleBar = (page: Page, title: string) => {
  // Scoped to the editor: a closing menu (a portal) can still hold the name.
  return expect(
    page.locator('#root').getByText(title, { exact: true })
  ).toBeVisible();
};

test('save two diagrams, switch between them, and reopen the last one', async ({
  page
}) => {
  await page.goto('/');
  await rename(page, 'Alpha');
  await save(page);

  await diagrams(page).click();
  await page.getByRole('menuitem', { name: 'New diagram' }).click();
  await titleBar(page, 'Untitled');
  await rename(page, 'Beta');
  await save(page);

  await diagrams(page).click();
  await expect(page.getByRole('menuitem', { name: /Alpha/ })).toBeVisible();
  await page.getByRole('menuitem', { name: /Alpha/ }).click();
  await titleBar(page, 'Alpha');

  await page.reload();
  await titleBar(page, 'Alpha');

  // Only the diagram's own data is stored, not the ~4 MB of icon packs.
  const size = await page.evaluate(() => {
    return Object.keys(localStorage).reduce((n, k) => {
      return n + (localStorage.getItem(k) ?? '').length;
    }, 0);
  });
  expect(size).toBeLessThan(20_000);
});

test('a named diagram auto-saves', async ({ page }) => {
  await page.goto('/');
  await rename(page, 'Auto');
  await expect(page.getByText(/^Saved/)).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await titleBar(page, 'Auto');
});

test('leaving unsaved changes asks first', async ({ page }) => {
  await page.goto('/');
  await rename(page, 'Draft');
  await save(page);
  await rename(page, 'Draft 2');

  await diagrams(page).click();
  await page.getByRole('menuitem', { name: 'New diagram' }).click();
  await expect(page.getByText(/unsaved changes/)).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await titleBar(page, 'Draft 2');
});

test('delete asks, then removes the diagram', async ({ page }) => {
  await page.goto('/');
  await rename(page, 'Doomed');
  await save(page);

  await diagrams(page).click();
  await page.getByRole('button', { name: 'Delete Doomed' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await titleBar(page, 'Untitled');
  await diagrams(page).click();
  await expect(page.getByText('Saved diagrams appear here.')).toBeVisible();
});

test('import opens a file as a new, unsaved diagram', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('diagram-import-input').setInputFiles({
    name: 'net.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        title: 'Imported net',
        items: [{ id: 'a', name: 'Edge router', icon: 'router' }],
        icons: [],
        colors: [{ id: 'c', value: '#999999' }],
        views: [
          { id: 'v', name: 'Main', items: [{ id: 'a', tile: { x: 0, y: 0 } }] }
        ]
      })
    )
  });
  await titleBar(page, 'Imported net');
  await expect(page.getByText('Edge router', { exact: true })).toBeVisible();
  await diagrams(page).click();
  await expect(page.getByText('Saved diagrams appear here.')).toBeVisible();
});

test('a file that is not JSON is refused with a message', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('diagram-import-input').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{nope')
  });
  await expect(page.getByText(/not valid JSON/)).toBeVisible();
});

for (const [label, body] of [
  ['JSON that is not a diagram', '{"hello":"world","items":"nope"}'],
  ['a JSON array', '[1,2,3]'],
  [
    'a diagram with a view item pointing at no item',
    JSON.stringify({
      title: 'Broken',
      items: [],
      icons: [],
      colors: [],
      views: [{ id: 'v', name: 'Main', items: [{ id: 'x', tile: { x: 0, y: 0 } }] }]
    })
  ]
]) {
  test(`${label} is refused and the current diagram stays open`, async ({
    page
  }) => {
    await page.goto('/');
    await page.getByTestId('diagram-import-input').setInputFiles({
      name: 'odd.json',
      mimeType: 'application/json',
      buffer: Buffer.from(body)
    });
    await expect(page.getByText(/not a valid diagram/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
  });
}
