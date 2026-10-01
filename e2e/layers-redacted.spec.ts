import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * Layers: the Layers panel, and the Redacted layer's opt-in on
 * the JSON, SVG and PNG exports.
 *
 * Sweep 2026-09-30 found these features had no browser cover. The scene
 * holds a plain Switch, a Camera on the Cameras layer and a SECRET NVR on
 * the reserved Redacted layer, whose icon is a solid red square so the
 * PNG check can look for it. Fixture injected via `window.__RETICULYNE_E2E__`
 * (Docker entry only, see src/index-docker.tsx).
 */
const icon = (hex: string) => {
  return `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23${hex}%22/%3E%3C/svg%3E`;
};

const scene = {
  format: 'accurona-scene',
  version: 1,
  id: 'e2e-layers',
  title: 'e2e layers',
  units: 'mm',
  icons: [
    { id: 'grey', name: 'Grey', url: icon('888888'), collection: 'test' },
    { id: 'red', name: 'Red', url: icon('ff0000'), collection: 'test' }
  ],
  layers: [{ id: 'cams', name: 'Cameras' }],
  objects: [
    { id: 'sw', name: 'Switch', icon: 'grey' },
    { id: 'cam', name: 'Camera', icon: 'grey' },
    { id: 'nvr', name: 'SECRET NVR', icon: 'red' }
  ],
  connections: [],
  views: [
    {
      id: 'v',
      kind: 'iso',
      name: 'Main',
      placements: [
        { object: 'sw', tile: { x: 0, y: 0 } },
        { object: 'cam', tile: { x: 3, y: 3 }, layer: 'cams' },
        { object: 'nvr', tile: { x: 3, y: 0 }, layer: 'redacted' }
      ],
      connectors: []
    }
  ]
};

const load = async (page: Page) => {
  await page.addInitScript((s) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      { initialData: s };
  }, scene);
  await page.goto('/');
  await expect(page.getByText('Switch', { exact: true }).first()).toBeVisible();
};

// A canvas label (a <p> with the node's name), not the screen-reader list.
const canvasLabel = (page: Page, name: string) => {
  return page.locator('p').filter({ hasText: new RegExp(`^${name}$`) });
};

const openExport = async (page: Page, item: string) => {
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: item }).click();
};

test.describe('Layers panel', () => {
  test('add, rename, hide and show a layer, with the page still reachable', async ({
    page
  }) => {
    await load(page);
    await page.getByRole('button', { name: 'Layers', exact: true }).click();
    const panel = page.getByRole('dialog', { name: 'Layers' });
    await expect(panel).toBeVisible();

    // Non-modal: the rest of the page is still in the accessibility tree.
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();

    await panel.getByRole('button', { name: 'Add layer' }).click();
    const names = panel.getByRole('textbox', { name: 'Layer name' });
    await expect(names).toHaveCount(2);
    // Focus goes to the new layer's name field (sweep 2026-09-30).
    await expect(names.nth(1)).toBeFocused();
    await names.nth(1).fill('Scratch');
    await names.nth(1).press('Enter');
    await expect(
      panel.getByRole('button', { name: 'Delete Scratch' })
    ).toBeVisible();

    await expect(canvasLabel(page, 'Camera')).toBeVisible();
    await panel.getByRole('button', { name: 'Hide Cameras' }).click();
    await expect(
      panel.getByRole('button', { name: 'Show Cameras' })
    ).toHaveAttribute('aria-pressed', 'false');
    await expect(canvasLabel(page, 'Camera')).toHaveCount(0);
    await panel.getByRole('button', { name: 'Show Cameras' }).click();
    await expect(canvasLabel(page, 'Camera')).toBeVisible();

    await panel.getByRole('button', { name: 'Delete Scratch' }).click();
    await expect(names).toHaveCount(1);

    await page.keyboard.press('Escape');
  });

  // Sweep 2026-09-30: Base and Redacted sat 7px right of the other names.
  test("every row's name starts at the same x", async ({ page }) => {
    await load(page);
    await page.getByRole('button', { name: 'Layers', exact: true }).click();
    const panel = page.getByRole('dialog', { name: 'Layers' });
    const xs = await panel.evaluate((el) => {
      const textLeft = (node: Element) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        return Math.round(range.getBoundingClientRect().left);
      };
      const input = el.querySelector('input[aria-label="Layer name"]')!;
      const inputLeft =
        input.getBoundingClientRect().left +
        parseFloat(getComputedStyle(input).paddingLeft);
      const byText = (t: string) => {
        return [...el.querySelectorAll('p')].find((p) => {
          return p.textContent === t;
        })!;
      };
      return {
        base: textLeft(byText('Base')),
        layer: Math.round(inputLeft),
        redacted: textLeft(byText('Redacted'))
      };
    });
    expect(Math.abs(xs.base - xs.layer)).toBeLessThanOrEqual(1);
    expect(Math.abs(xs.redacted - xs.layer)).toBeLessThanOrEqual(1);
  });

  test('the Redacted layer says it is in use', async ({ page }) => {
    await load(page);
    await page.getByRole('button', { name: 'Layers', exact: true }).click();
    const panel = page.getByRole('dialog', { name: 'Layers' });
    await expect(panel).toContainText(
      'left out of exports unless you include it'
    );
    await expect(panel).not.toContainText('Nothing is on it yet');
  });
});

test.describe('Redacted content in exports', () => {
  for (const include of [false, true]) {
    const label = include ? 'included when ticked' : 'left out by default';

    test(`JSON: ${label}`, async ({ page }) => {
      await load(page);
      await openExport(page, 'Export as JSON');
      const dialog = page.getByRole('dialog', { name: 'Export as JSON' });
      const box = dialog.getByLabel('Include redacted content');
      await expect(box).not.toBeChecked();
      if (include) await box.check();
      const download = page.waitForEvent('download');
      await dialog.getByRole('button', { name: 'Download JSON' }).click();
      const body = await readFile(await (await download).path(), 'utf8');
      expect(body.includes('SECRET')).toBe(include);
      const ids = JSON.parse(body).objects.map((o: { id: string }) => {
        return o.id;
      });
      expect(ids.includes('nvr')).toBe(include);
      expect(ids).toContain('sw');
    });

    test(`SVG: ${label}`, async ({ page }) => {
      await load(page);
      await openExport(page, 'Export as SVG');
      const dialog = page.getByRole('dialog', { name: 'Export as SVG' });
      const box = dialog.getByLabel('Include redacted content');
      await expect(box).not.toBeChecked();
      if (include) await box.check();
      const download = page.waitForEvent('download', { timeout: 20000 });
      await dialog
        .getByRole('button', { name: 'Download universal SVG' })
        .click({ timeout: 20000 });
      const body = await readFile(await (await download).path(), 'utf8');
      expect(body.includes('SECRET')).toBe(include);
      expect(body).toContain('Switch');
    });

    test(`PNG: ${label}`, async ({ page }) => {
      await load(page);
      await openExport(page, 'Export as Image');
      const dialog = page.getByRole('dialog', { name: 'Export as image' });
      const box = dialog.getByLabel('Include redacted content');
      await expect(box).not.toBeChecked();
      if (include) await box.check();
      const preview = dialog.locator('img[src^="data:image/png"]');
      await expect(preview).toBeVisible({ timeout: 20000 });
      const hasRed = await preview.evaluate(async (img: HTMLImageElement) => {
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        if (!ctx) return false;
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, c.width, c.height);
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 240 && data[i + 1] < 15 && data[i + 2] < 15) {
            return true;
          }
        }
        return false;
      });
      expect(hasRed).toBe(include);
    });
  }
});
