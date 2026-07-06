import { expect, test } from '@playwright/test';

/**
 * TipTap description editor (DEP-04-follow-up). Two guarantees that only the
 * bundled/production build can prove and that unit tests (jsdom) cannot:
 *
 *  1. Read-only render: a node `description` is rendered on the canvas by
 *     regenerating HTML through the ProseMirror schema. Allowed marks survive
 *     and XSS payloads are dropped end-to-end.
 *  2. Editable mount: selecting a node opens the editable TipTap editor and
 *     its MUI toolbar. This is a regression guard — an earlier version called
 *     editor.getHTML() in a mount effect, which threw
 *     "Cannot read properties of null (reading 'cached')" in the production
 *     build (schema not yet ready) and tripped the error boundary.
 *
 * Fixtures are injected via `window.__RETICULYNE_E2E__` (Docker-entry hook,
 * see src/index-docker.tsx).
 */

const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23888%22/%3E%3C/svg%3E';

test('read-only description renders via the schema and drops XSS', async ({
  page
}) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.addInitScript((iconSvg) => {
    window.__RETICULYNE_E2E__ = {
      editorMode: 'EDITABLE',
      initialData: {
        title: 'description render fixture',
        items: [
          {
            id: 'modelItem-A',
            name: 'Item A',
            icon: 'icon-tiny',
            description:
              '<p><strong>BoldDesc</strong> <a href="https://ok.example/x">LinkDesc</a></p>' +
              '<img src=x onerror="window.__XSS__=1">' +
              '<iframe src="https://evil.example"></iframe>' +
              '<a href="javascript:window.__XSS__=2">bad</a>'
          }
        ],
        icons: [
          { id: 'icon-tiny', name: 'T', url: iconSvg, collection: 'test' }
        ],
        colors: [{ id: 'color1', value: '#888888' }],
        views: [
          {
            id: 'view-main',
            name: 'Main',
            items: [{ id: 'modelItem-A', tile: { x: 0, y: 0 } }]
          }
        ]
      }
    };
  }, tinyIconSvg);

  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);

  const view = page.locator('.reticulyne-markdown-view').first();
  await expect(view).toBeAttached({ timeout: 15000 });
  const html = await view.innerHTML();

  expect(html).toContain('<strong>BoldDesc</strong>');
  expect(html).toContain('href="https://ok.example/x"');
  expect(html).not.toMatch(/<img/i);
  expect(html).not.toMatch(/onerror/i);
  expect(html).not.toMatch(/<iframe/i);
  expect(html).not.toMatch(/javascript:/i);

  const xss = await page.evaluate(
    () => (window as unknown as { __XSS__?: unknown }).__XSS__
  );
  expect(xss).toBeUndefined();
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});

test('selecting a node mounts the editable editor and the bold toolbar works', async ({
  page
}) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.addInitScript((iconSvg) => {
    window.__RETICULYNE_E2E__ = {
      editorMode: 'EDITABLE',
      initialData: {
        title: 'editable fixture',
        items: [{ id: 'modelItem-A', name: 'Item A', icon: 'icon-tiny' }],
        icons: [
          { id: 'icon-tiny', name: 'T', url: iconSvg, collection: 'test' }
        ],
        colors: [{ id: 'color1', value: '#888888' }],
        views: [
          {
            id: 'view-main',
            name: 'Main',
            items: [{ id: 'modelItem-A', tile: { x: 0, y: 0 } }]
          }
        ]
      }
    };
  }, tinyIconSvg);

  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);

  // The single node fits-to-view at the canvas centre; clicking it selects it
  // (the icon has pointer-events:none, so the click lands on the interaction
  // layer that hit-tests the tile).
  const viewport = page.viewportSize();
  await page.mouse.click(viewport!.width / 2, viewport!.height / 2 + 3);

  const editor = page.locator('.ProseMirror[contenteditable="true"]').first();
  await expect(editor).toBeAttached({ timeout: 10000 });
  const boldBtn = page.getByRole('button', { name: 'Bold' });
  await expect(boldBtn).toBeVisible();

  await editor.click();
  await page.keyboard.type('hello');
  await editor.selectText(); // cross-platform select-all (Ctrl+A is not select-all on macOS)
  await boldBtn.click();

  await expect
    .poll(async () => editor.innerHTML(), { timeout: 4000 })
    .toContain('<strong>');

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
