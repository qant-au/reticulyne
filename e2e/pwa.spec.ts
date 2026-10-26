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

test('every location block sends the full security header set', async ({
  request
}) => {
  const page = await request.get('/');
  expect(page.headers()['permissions-policy']).toContain('camera=()');
  const sw = await request.get('/sw.js');
  expect(sw.headers()['content-security-policy']).toContain(
    "default-src 'self'"
  );
  expect(sw.headers()['permissions-policy']).toContain('camera=()');
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

// A rebuild while a tab is open: the second tab registers the worker under
// another script URL, which installs a new worker for the same scope, as a
// redeploy does. It must wait, keeping the old build's cache, so the first
// tab can still load its lazy chunks.
test('a new build waits while another tab is on the old one', async ({
  page,
  context
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const oldCaches = await page.evaluate(() => {
    return caches.keys();
  });
  expect(oldCaches.length).toBeGreaterThan(0);

  const other = await context.newPage();
  await other.goto('/');
  await other.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await navigator.serviceWorker.register('./sw.js?build=next');
  });
  await expect
    .poll(() => {
      return other.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        return (
          registration?.waiting !== null && registration?.waiting !== undefined
        );
      });
    })
    .toBe(true);

  // The old build's cache is still there, and the first tab still opens a
  // lazily loaded dialog with no network.
  expect(await page.evaluate(() => caches.keys())).toEqual(
    expect.arrayContaining(oldCaches)
  );
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: /Export as image/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
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
