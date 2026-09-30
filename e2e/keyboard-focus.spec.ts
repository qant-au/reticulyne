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
