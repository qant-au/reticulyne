import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * The local icon system: built-in icons carry an isometric and a flat
 * drawing, a file whose built-in icons carry no flat drawing still draws
 * both, an icon pack installed in this browser's
 * IndexedDB is in the library, and diagrams an older build kept in
 * localStorage are moved into IndexedDB. Fixtures are injected via
 * `window.__RETICULYNE_E2E__` (Docker entry only, see src/index-docker.tsx).
 */

const svg = (fill: string) => {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="${fill}"/></svg>`
  )}`;
};

const hook = async (page: Page, initialData: unknown) => {
  await page.addInitScript((data) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      { initialData: data };
  }, initialData);
};

const sceneNaming = (icon: string) => {
  return {
    format: 'reticulyne-scene',
    version: 2,
    id: 'e2e-icons',
    title: 'e2e icons',
    objects: [{ id: 'a', name: 'Device A', icon }],
    views: [
      {
        id: 'v',
        kind: 'iso',
        name: 'Main',
        placements: [{ object: 'a', tile: { x: 0, y: 0 } }]
      }
    ]
  };
};

// The image the node draws with on the canvas.
const nodeImage = (page: Page) => {
  return page.getByRole('application').locator('img').first();
};

const toFlat = async (page: Page) => {
  await page.getByRole('button', { name: 'Flat 2D view', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Flat 2D view', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
};

const noAlert = async (page: Page) => {
  await expect(
    page.getByText('Device A', { exact: true }).first()
  ).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
};

// Every key and value in the local store's `kv` object store.
const readStore = (page: Page) => {
  return page.evaluate(() => {
    return new Promise<Record<string, string>>((resolve, reject) => {
      const open = indexedDB.open('reticulyne');
      open.onerror = () => {
        reject(open.error);
      };
      open.onsuccess = () => {
        const tx = open.result.transaction('kv', 'readonly');
        const store = tx.objectStore('kv');
        const keys = store.getAllKeys();
        const values = store.getAll();
        tx.oncomplete = () => {
          const out: Record<string, string> = {};
          keys.result.forEach((key, i) => {
            out[String(key)] = values.result[i];
          });
          open.result.close();
          resolve(out);
        };
      };
    });
  });
};

test('a built-in device draws its isometric view, then its flat one', async ({
  page
}) => {
  await hook(page, sceneNaming('reticulyne-firewall'));
  await page.goto('/');
  await noAlert(page);
  const iso = await nodeImage(page).getAttribute('src');
  expect(iso).toMatch(/^data:image\/svg\+xml,/);

  await toFlat(page);
  await expect(nodeImage(page)).not.toHaveAttribute('src', iso!);
  const flat = await nodeImage(page).getAttribute('src');
  expect(flat).toMatch(/^data:image\/svg\+xml,/);
});

test('a file whose built-in icons carry no flat drawing draws both views', async ({
  page
}) => {
  const fixture = JSON.parse(
    await readFile(`${__dirname}/fixtures/export-icons-scene.json`, 'utf8')
  );
  await hook(page, fixture);
  await page.goto('/');
  await expect(page.getByRole('application')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  const images = page.getByRole('application').locator('img');
  await expect(images.first()).toBeVisible();
  const iso = await images.evaluateAll((els) => {
    return els.map((el) => {
      return el.getAttribute('src');
    });
  });

  await toFlat(page);
  // The file's icons carry no flat drawing; the built-in ones of the same
  // ids supply it, so no node draws its isometric image flat.
  await expect
    .poll(async () => {
      const flat = await images.evaluateAll((els) => {
        return els.map((el) => {
          return el.getAttribute('src');
        });
      });
      return flat.filter((src) => {
        return iso.includes(src);
      }).length;
    })
    .toBe(0);
});

test('an icon pack installed in this browser is in the library', async ({
  page
}) => {
  // Open the app once so the local store exists, then install a pack into
  // it directly (the install UI is a later phase) and reload.
  await page.goto('/');
  await expect(page.getByRole('application')).toBeVisible();
  const pack = {
    id: 'e2e-pack',
    name: 'E2E pack',
    icons: [
      {
        id: 'e2e-pack-icon',
        name: 'Pack icon',
        url: svg('#c0392b'),
        isIsometric: false,
        flatUrl: svg('#2f6fb0')
      }
    ]
  };
  await page.evaluate((value) => {
    return new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('reticulyne');
      open.onerror = () => {
        reject(open.error);
      };
      open.onsuccess = () => {
        const tx = open.result.transaction('packs', 'readwrite');
        tx.objectStore('packs').put(value);
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

  await hook(page, sceneNaming('e2e-pack-icon'));
  await page.reload();
  await noAlert(page);
  await expect(nodeImage(page)).toHaveAttribute('src', pack.icons[0].url);
  await toFlat(page);
  await expect(nodeImage(page)).toHaveAttribute('src', pack.icons[0].flatUrl);
});

test('diagrams an older build kept in localStorage move to IndexedDB', async ({
  page
}) => {
  await page.addInitScript(() => {
    const scene = {
      format: 'reticulyne-scene',
      version: 2,
      id: 'old',
      title: 'From localStorage',
      objects: [{ id: 'a', name: 'Device A', icon: 'reticulyne-router' }],
      views: [
        {
          id: 'v',
          kind: 'iso',
          name: 'Main',
          placements: [{ object: 'a', tile: { x: 0, y: 0 } }]
        }
      ]
    };
    window.localStorage.setItem(
      'reticulyne.diagram.old',
      JSON.stringify(scene)
    );
    window.localStorage.setItem(
      'reticulyne.diagrams',
      JSON.stringify([{ id: 'old', name: 'From localStorage', updatedAt: 1 }])
    );
    window.localStorage.setItem('reticulyne.current', 'old');
  });
  await page.goto('/');
  await expect(
    page.locator('#root').getByText('From localStorage', { exact: true })
  ).toBeVisible();
  await noAlert(page);
  await expect(nodeImage(page)).toHaveAttribute(
    'src',
    /^data:image\/svg\+xml,/
  );

  const stored = await readStore(page);
  expect(JSON.parse(stored['reticulyne.diagram.old']).title).toBe(
    'From localStorage'
  );
  expect(stored['reticulyne.current']).toBe('old');
  // The originals stay, for an older build to find.
  expect(
    await page.evaluate(() => {
      return localStorage.getItem('reticulyne.diagram.old') !== null;
    })
  ).toBe(true);
});
