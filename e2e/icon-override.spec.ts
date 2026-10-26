import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { BUILTIN_PACK } from '../src/icons/builtin';

/**
 * Icon images (rtl-060): an uploaded image overrides one object's
 * isometric and/or flat drawing. The icon itself, the other objects using
 * it and the object's ports are untouched; copy and paste carries the
 * override; Remove brings the icon's own drawing back.
 */
const ICON = BUILTIN_PACK.icons.find((i) => {
  return i.id === 'reticulyne-network-switch';
})!;
const PORTS = [
  { id: 'eth1', kind: 'ethernet-copper' },
  { id: 'eth2', kind: 'ethernet-copper' }
];
const red = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="#c00"/></svg>'
);

const load = async (page: Page) => {
  await page.addInitScript(
    (data) => {
      (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
        { initialData: data };
    },
    {
      format: 'reticulyne-scene',
      version: 2,
      id: 'override',
      title: 'Override',
      objects: [
        { id: 'core', name: 'Core', icon: ICON.id, ports: PORTS },
        { id: 'edge', name: 'Edge', icon: ICON.id, ports: PORTS }
      ],
      views: [
        {
          id: 'v',
          name: 'V',
          kind: 'iso',
          placements: [
            { object: 'core', tile: { x: 0, y: 0 } },
            { object: 'edge', tile: { x: 4, y: 0 } }
          ]
        }
      ],
      icons: [ICON]
    }
  );
  await page.goto('/');
  await expect(page.getByRole('application')).toBeVisible();
};

// Every image drawn on the canvas: the two nodes' drawings.
const drawn = async (page: Page) => {
  const imgs = page.getByRole('application').locator('img');
  await expect(imgs).toHaveCount(2);
  return (await imgs.evaluateAll((els) => {
    return els.map((el) => {
      return el.getAttribute('src') ?? '';
    });
  })).sort();
};
const UPLOADED = /^data:image\/svg\+xml;base64,/;

const exported = async (page: Page) => {
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Main menu' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  return JSON.parse(await readFile(await (await download).path(), 'utf8'));
};

const toView = async (page: Page, name: 'Isometric view' | 'Flat 2D view') => {
  const button = page.getByRole('button', { name, exact: true });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
};

const selectCore = async (page: Page) => {
  // Tile (0, 0) sits at the centre of the viewport.
  const vp = page.viewportSize()!;
  await page.mouse.click(vp.width / 2, vp.height / 2);
  await expect(page.getByText('Icon images')).toBeVisible();
};

test('a flat image overrides one object, travels with copy and paste, and comes off', async ({
  page
}) => {
  await load(page);
  await selectCore(page);
  const flatRow = page.getByTestId('icon-override-flat');
  await expect(flatRow).toContainText("The icon's own");

  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload flat image' }).click();
  await (await chooser).setFiles({
    name: 'red.svg',
    mimeType: 'image/svg+xml',
    buffer: red
  });
  await expect(flatRow).toContainText('Uploaded');
  await expect(page.getByTestId('icon-override-iso')).toContainText(
    "The icon's own"
  );

  // The flat view draws the upload for Core only; the iso view is unchanged.
  await page.keyboard.press('Escape');
  await toView(page, 'Flat 2D view');
  const flat = await drawn(page);
  expect(flat.filter((s) => UPLOADED.test(s))).toHaveLength(1);
  expect(flat.filter((s) => s === ICON.flatUrl)).toHaveLength(1);
  await toView(page, 'Isometric view');
  expect(await drawn(page)).toEqual([ICON.url, ICON.url]);

  // Copy and paste: the copy carries the override; nothing else moves.
  await selectCore(page);
  await page.keyboard.press('Escape');
  const vp = page.viewportSize()!;
  await page.mouse.click(vp.width / 2, vp.height / 2);
  await page.keyboard.press('ControlOrMeta+C');
  await page.keyboard.press('ControlOrMeta+V');
  const scene = await exported(page);
  const withOverride = scene.objects.filter((o: { iconOverride?: unknown }) => {
    return o.iconOverride;
  });
  expect(withOverride).toHaveLength(2);
  for (const o of scene.objects) {
    expect(o.icon).toBe(ICON.id);
    expect(o.ports).toEqual(PORTS);
  }
  expect(
    scene.objects.find((o: { id: string }) => {
      return o.id === 'edge';
    }).iconOverride
  ).toBeUndefined();
  // The icon in the file is the library's, untouched.
  expect(
    scene.icons.find((i: { id: string }) => {
      return i.id === ICON.id;
    })
  ).toMatchObject({ url: ICON.url, flatUrl: ICON.flatUrl });

  // Remove brings the icon's own drawing back.
  await selectCore(page);
  await page.getByRole('button', { name: 'Remove flat image' }).click();
  await expect(flatRow).toContainText("The icon's own");
  const after = await exported(page);
  expect(
    after.objects.find((o: { id: string }) => {
      return o.id === 'core';
    })
  ).not.toHaveProperty('iconOverride');
});

test('an isometric image overrides the iso view only', async ({ page }) => {
  await load(page);
  await selectCore(page);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload isometric image' }).click();
  await (await chooser).setFiles({
    name: 'red.svg',
    mimeType: 'image/svg+xml',
    buffer: red
  });
  await expect(page.getByTestId('icon-override-iso')).toContainText('Uploaded');
  await page.keyboard.press('Escape');
  const iso = await drawn(page);
  expect(iso.filter((s) => UPLOADED.test(s))).toHaveLength(1);
  expect(iso.filter((s) => s === ICON.url)).toHaveLength(1);
  await toView(page, 'Flat 2D view');
  expect(await drawn(page)).toEqual([ICON.flatUrl, ICON.flatUrl]);
});

test('a file that is not an image is refused with a message', async ({ page }) => {
  await load(page);
  await selectCore(page);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload flat image' }).click();
  await (await chooser).setFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello')
  });
  await expect(page.getByText('Use an SVG, PNG, JPEG, GIF or WebP image.')).toBeVisible();
  await expect(page.getByTestId('icon-override-flat')).toContainText("The icon's own");
});
