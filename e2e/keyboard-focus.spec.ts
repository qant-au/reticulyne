import { expect, test, Page } from '@playwright/test';

/**
 * Keyboard focus: where focus goes after a keyboard command, and that Tab
 * is never trapped. Each test injects the fixture below through
 * `window.__RETICULYNE_E2E__` (Docker entry only, see src/index-docker.tsx).
 */

const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23888%22/%3E%3C/svg%3E';

const LONG =
  '<p>Edge router that terminates both upstream links, runs the firewall and hands out addresses to every floor of the building.</p>';

const fixture = {
  title: 'e2e keyboard focus fixture',
  items: [
    { id: 'A', name: 'Router', icon: 'icon-tiny', description: LONG },
    { id: 'B', name: 'Switch', icon: 'icon-tiny' }
  ],
  icons: [
    { id: 'icon-tiny', name: 'Tiny', url: tinyIconSvg, collection: 'test' }
  ],
  colors: [{ id: 'color1', value: '#1f77b4' }],
  views: [
    {
      id: 'view-main',
      name: 'Main',
      items: [
        { id: 'A', tile: { x: -3, y: 0 } },
        { id: 'B', tile: { x: 0, y: 0 } }
      ],
      textBoxes: [{ id: 'tb1', content: 'Label text', tile: { x: 0, y: 3 } }]
    }
  ]
};

const openEditor = async (page: Page) => {
  await page.addInitScript((f) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      { initialData: f };
  }, fixture);
  await page.goto('/');
  await expect(page.getByRole('application')).toBeVisible();
};

test('Tab from a label Show more button moves focus on, not the selection', async ({
  page
}) => {
  await openEditor(page);
  const showMore = page.getByRole('button', { name: 'Show more' }).first();
  await showMore.focus();
  await page.keyboard.press('Tab');
  await expect(showMore).not.toBeFocused();
  await showMore.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(showMore).not.toBeFocused();
});

test('Enter on a text box reached with Tab puts focus in its text', async ({
  page
}) => {
  await openEditor(page);
  const canvas = page.getByRole('application');
  await canvas.focus();
  const status = page.locator('[role="status"][aria-atomic]');
  for (let i = 0; i < 5; i += 1) {
    await page.keyboard.press('Tab');
    if (((await status.textContent()) ?? '').startsWith('Text:')) break;
  }
  await expect(status).toHaveText(/^Text: Label text/);
  await page.keyboard.press('Enter');
  const field = page.getByRole('textbox', { name: 'Text' });
  await expect(field).toBeFocused();
  await page.keyboard.type('Edited');
  await expect(field).toHaveValue('Edited');
});

const placeTinyFromKeyboard = async (page: Page) => {
  await page.getByRole('application').focus();
  await page.keyboard.press('i');
  await page.getByPlaceholder('Search icons').fill('Tiny');
  await page
    .getByAltText('Icon Tiny')
    .locator('xpath=ancestor::button[1]')
    .focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Untitled', { exact: true })).toBeVisible();
};

test('an icon placed from the keyboard keeps its label clear of the others', async ({
  page
}) => {
  await openEditor(page);
  await placeTinyFromKeyboard(page);
  const added = await page.getByText('Untitled', { exact: true }).boundingBox();
  for (const name of ['Router', 'Switch']) {
    const other = await page
      .getByText(name, { exact: true })
      .first()
      .boundingBox();
    expect(added && other).toBeTruthy();
    const overlaps =
      added!.x < other!.x + other!.width &&
      other!.x < added!.x + added!.width &&
      added!.y < other!.y + other!.height &&
      other!.y < added!.y + added!.height;
    expect(overlaps, `Untitled label overlaps ${name}`).toBe(false);
  }
});

test('an icon placed from the keyboard leaves focus on the canvas', async ({
  page
}) => {
  await openEditor(page);
  await placeTinyFromKeyboard(page);
  await expect(page.getByRole('application')).toBeFocused();
});

test('the canvas hint writes the pan keys as the shortcuts dialog does', async ({
  page
}) => {
  await openEditor(page);
  const canvas = page.getByRole('application');
  const hintId = await canvas.getAttribute('aria-describedby');
  const hint = (await page.locator(`[id="${hintId}"]`).textContent()) ?? '';
  await canvas.focus();
  await page.keyboard.press('?');
  const row = page.getByRole('row').filter({ hasText: 'Pan the view' });
  const keys = (
    (await row.getByRole('cell').nth(1).textContent()) ?? ''
  ).trim();
  // The cell draws each key as a key, so its text has no spaces round +.
  expect(keys).toMatch(/Arrow keys$/);
  const squash = (text: string) => {
    return text.replace(/\s/g, '');
  };
  expect(squash(hint)).toContain(`${squash(keys)}pan.`);
});
