import { expect, test } from '@playwright/test';

/**
 * APP-02: the Docker editor is an installable PWA that opens offline.
 */
test('the manifest is linked and names both icon sizes', async ({
  page,
  request
}) => {
  await page.goto('/');
  const href = await page
    .locator('link[rel="manifest"]')
    .getAttribute('href');
  const res = await request.get(`/${href}`);
  expect(res.ok()).toBe(true);
  expect(res.headers()['content-type']).toContain('application/manifest+json');
  const manifest = await res.json();
  expect(manifest.display).toBe('standalone');
  expect(
    manifest.icons.map((i: { sizes: string }) => {
      return i.sizes;
    })
  ).toEqual(['192x192', '512x512']);
  for (const icon of manifest.icons) {
    expect((await request.get(`/${icon.src}`)).ok()).toBe(true);
  }
});

test('the worker is never cached; the bundles are hashed and immutable', async ({
  page,
  request
}) => {
  const sw = await request.get('/sw.js');
  expect(sw.headers()['cache-control']).toBe('no-cache');

  await page.goto('/');
  const src = await page.locator('script[src^="main."]').getAttribute('src');
  expect(src).toMatch(/^main\.[0-9a-f]{8,}\.js$/);
  const main = await request.get(`/${src}`);
  expect(main.headers()['cache-control']).toContain('immutable');
});

test('after one visit the editor opens offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // The first load was not yet controlled; the second one is.
  await page.reload();
  await expect
    .poll(() => {
      return page.evaluate(() => {
        return navigator.serviceWorker.controller !== null;
      });
    })
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
  await expect(page).toHaveTitle(/Reticulyne/);
});

test('Chrome reports the editor as installable', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const cdp = await context.newCDPSession(page);
  await expect
    .poll(async () => {
      const { installabilityErrors } = await cdp.send(
        'Page.getInstallabilityErrors'
      );
      return installabilityErrors;
    })
    .toEqual([]);
});
