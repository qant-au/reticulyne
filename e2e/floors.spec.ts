import { expect, test } from '@playwright/test';

/**
 * Floors (lw-053): the floor switcher in the title bar. The fixture is
 * injected via `window.__RETICULYNE_E2E__` (Docker entry only, see
 * src/index-docker.tsx).
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      {
        initialData: {
          title: 'e2e floors',
          icons: [],
          colors: [{ id: 'c', value: '#1f77b4' }],
          items: [
            { id: 'sw', name: 'Core switch' },
            { id: 'ap', name: 'AP east' }
          ],
          views: [
            {
              id: 'ground',
              name: 'Ground',
              items: [{ id: 'sw', tile: { x: 0, y: 0 } }]
            },
            {
              id: 'l1',
              name: 'Level 1',
              items: [{ id: 'ap', tile: { x: 2, y: 0 } }]
            }
          ],
          connections: [{ id: 'c1', from: 'sw', to: 'ap' }]
        }
      };
  });
  await page.goto('/');
  await expect(page.getByRole('tablist', { name: 'Floors' })).toBeVisible();
});

test('Floor options > Rename floor opens the name field and renames', async ({
  page
}) => {
  await page.getByRole('button', { name: 'Floor options' }).click();
  await page.getByRole('menuitem', { name: 'Rename floor' }).click();
  const field = page.getByLabel('Floor name');
  await expect(field).toBeVisible();
  await expect(field).toBeFocused();
  await field.fill('Basement');
  await field.press('Enter');
  await expect(page.getByRole('tab', { name: 'Basement' })).toBeVisible();
  await expect(page.getByLabel('Floor name')).toHaveCount(0);
});

test('double-clicking a tab still renames', async ({ page }) => {
  await page.getByRole('tab', { name: 'Level 1' }).dblclick();
  await page.getByLabel('Floor name').fill('Mezzanine');
  await page.getByLabel('Floor name').press('Enter');
  await expect(page.getByRole('tab', { name: 'Mezzanine' })).toBeVisible();
});

// Sweep 2026-09-30: the PDF showed the other floors' faint ghosts along its
// top. No export includes them.
test('Export as PDF leaves the other floors out, and they come back after', async ({
  page
}) => {
  const ghosts = page.locator('[data-testid^="other-floor-"]');
  await expect(ghosts.first()).toBeAttached();
  await page.evaluate(() => {
    const w = window as unknown as { __ghostMin: number };
    const count = () => {
      return document.querySelectorAll('[data-testid^="other-floor-"]').length;
    };
    w.__ghostMin = count();
    new MutationObserver(() => {
      w.__ghostMin = Math.min(w.__ghostMin, count());
    }).observe(document.body, { childList: true, subtree: true });
  });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Export as PDF' }).click();
  await download;
  const min = await page.evaluate(() => {
    return (window as unknown as { __ghostMin: number }).__ghostMin;
  });
  expect(min).toBe(0);
  await expect(ghosts.first()).toBeAttached();
});

test('the PNG and SVG exports leave the other floors out', async ({ page }) => {
  await expect(
    page.locator('[data-testid^="other-floor-"]').first()
  ).toBeAttached();
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: /Export as Image/i }).click();
  const png = page.getByRole('dialog', { name: 'Export as image' });
  await expect(png.locator('img[src^="data:image/png"]')).toBeVisible({
    timeout: 20000
  });
  await expect(png.locator('[data-testid^="other-floor-"]')).toHaveCount(0);
  await png.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Export as SVG' }).click();
  const svg = page.getByRole('dialog', { name: 'Export as SVG' });
  for (const name of ['Download universal SVG', 'Download vector SVG']) {
    const download = page.waitForEvent('download', { timeout: 20000 });
    await svg.getByRole('button', { name }).click({ timeout: 20000 });
    const { readFileSync } = await import('node:fs');
    const body = readFileSync(await (await download).path(), 'utf8');
    expect(body, name).not.toContain('other-floor-');
    // The universal SVG is a picture of the canvas, labels and all.
    if (name === 'Download universal SVG') {
      expect(body, name).toContain('Core switch');
    }
  }
});

// Sweep 2026-09-30, round 3: the image, PDF and universal SVG exports kept
// the cross-floor marker but dropped the dashed riser to it, and drew the
// diamond black instead of blue. The PDF is the same picture as the PNG.
test('the exports draw the cross-floor riser and its blue diamond', async ({
  page
}) => {
  await expect(page.getByTestId('floor-stub-riser-c1-sw')).toBeAttached();
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: /Export as Image/i }).click();
  const png = page.getByRole('dialog', { name: 'Export as image' });
  const img = png.locator('img[src^="data:image/png"]');
  await expect(img).toBeVisible({ timeout: 20000 });
  // The diagram's only blue is the diamond: the connector is not on Ground.
  const blue = await img.evaluate(async (el: HTMLImageElement) => {
    await el.decode();
    const c = document.createElement('canvas');
    c.width = el.naturalWidth;
    c.height = el.naturalHeight;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(el, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 2] > 150 && d[i + 2] - d[i] > 80) n += 1;
    }
    return n;
  });
  expect(blue).toBeGreaterThan(40);
  await png.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Export as SVG' }).click();
  const svg = page.getByRole('dialog', { name: 'Export as SVG' });
  const download = page.waitForEvent('download', { timeout: 20000 });
  await svg
    .getByRole('button', { name: 'Download universal SVG' })
    .click({ timeout: 20000 });
  const { readFileSync } = await import('node:fs');
  const body = readFileSync(await (await download).path(), 'utf8');
  const riser = body.match(/<line[^>]*stroke-dasharray="8 6"[^>]*>/)?.[0];
  expect(riser).toBeDefined();
  expect(riser).toMatch(/ stroke="(#|rgb)/);
  const diamond = body.match(/<rect[^>]*rotate\(45[^>]*>/)?.[0];
  expect(diamond).toMatch(/ fill="(#|rgb)/);
});
