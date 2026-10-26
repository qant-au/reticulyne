import { expect, type Page } from '@playwright/test';
import { readFile, readFileSync } from 'node:fs';
import { promisify } from 'node:util';

// Shared by the icon pack specs: the Nautical Flags pack, the e2e hook, and
// the steps a user takes with packs (place from the palette, connect,
// export, install into the browser's store directly).

export const FLAGS_FILE = `${__dirname}/../packs/nautical-flags/nautical-flags.reticulyne-pack.json`;

export interface Pack {
  id: string;
  name: string;
  version?: string;
  sourceUrl: string;
  icons: { id: string; name: string }[];
  [key: string]: unknown;
}

export const flagsPack = (): Pack => {
  return JSON.parse(readFileSync(FLAGS_FILE, 'utf8'));
};

export const emptyScene = (id = 'e2e-packs') => {
  return {
    format: 'reticulyne-scene',
    version: 2,
    id,
    title: id,
    objects: [],
    views: [{ id: 'v', name: 'Main', placements: [] }]
  };
};

/** The e2e hook: the diagram to open and any other settings. */
export const hook = async (page: Page, settings: Record<string, unknown>) => {
  await page.addInitScript((value) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      value;
  }, settings);
};

export const openEditor = async (page: Page) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
  await expect(page.getByRole('application')).toBeVisible();
};

export const openLibrary = async (page: Page) => {
  const palette = page.getByTestId('icon-palette');
  if (!(await palette.isVisible())) {
    await page
      .getByRole('button', { name: 'Icon library', exact: true })
      .click();
  }
  await expect(palette).toBeVisible();
  return palette;
};

/** Drags a catalogue item from the palette to a point on the canvas. */
export const placeFromPalette = async (
  page: Page,
  search: string,
  name: RegExp,
  to: [number, number]
) => {
  const palette = await openLibrary(page);
  await palette.getByRole('textbox').fill(search);
  const tile = palette
    .getByTestId('catalogue-items')
    .getByRole('button', { name })
    .first();
  const from = (await tile.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to[0], to[1], { steps: 12 });
  await page.mouse.up();
  await page.keyboard.press('Escape');
};

/** Connects the node drawn by the nth image to the named node. */
export const connectNth = async (page: Page, nth: number, to: RegExp) => {
  const node = page.getByRole('application').locator('img').nth(nth);
  await node.click({ button: 'right', force: true });
  await page.getByRole('menuitem', { name: 'Connect to…' }).click();
  const dialog = page.getByRole('dialog', { name: /Connect .* to/ });
  await dialog.getByRole('combobox').fill(to.source.replace(/[\\^$]/g, ''));
  await page.getByRole('option', { name: to }).first().click();
  await dialog.getByRole('button', { name: 'Connect' }).click();
  await expect(dialog).toHaveCount(0);
};

export const exportJson = async (page: Page) => {
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Main menu' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const path = await (await download).path();
  return JSON.parse(await promisify(readFile)(path, 'utf8'));
};

/** Puts a pack straight into the browser's store, as an install leaves it. */
export const storePack = async (page: Page, pack: Pack) => {
  await page.evaluate((value) => {
    return new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('reticulyne');
      open.onerror = () => {
        reject(open.error);
      };
      open.onsuccess = () => {
        const tx = open.result.transaction('packs', 'readwrite');
        tx.objectStore('packs').put({
          id: value.id,
          pack: value,
          installedAt: Date.now()
        });
        tx.oncomplete = () => {
          open.result.close();
          resolve();
        };
        tx.onerror = () => {
          reject(tx.error);
        };
      };
    });
  }, pack);
};

/** The ids of the packs kept in the browser's store. */
export const storedPackIds = async (page: Page) => {
  return page.evaluate(() => {
    return new Promise<string[]>((resolve, reject) => {
      const open = indexedDB.open('reticulyne');
      open.onerror = () => {
        reject(open.error);
      };
      open.onsuccess = () => {
        const req = open.result
          .transaction('packs', 'readonly')
          .objectStore('packs')
          .getAllKeys();
        req.onsuccess = () => {
          open.result.close();
          resolve(req.result.map(String));
        };
        req.onerror = () => {
          reject(req.error);
        };
      };
    });
  });
};
