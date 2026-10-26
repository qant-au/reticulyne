import { expect, test, type Page } from '@playwright/test';
import {
  emptyScene,
  exportJson,
  flagsPack,
  hook,
  openEditor,
  placeFromPalette,
  storePack
} from './iconPackHelpers';

/**
 * Sharing a diagram drawn with the Nautical Flags pack: the export names the
 * pack once, with its source; opening the file without the pack says so and
 * still draws the flags from the copies the file carries; with the pack
 * there is nothing to say; and an icon nobody has opens as a placeholder
 * that can be replaced. Each test runs in a fresh browser, so "without the
 * pack" is a browser that never installed it.
 */

const MISSING = 'data:image/svg+xml,' as const;

const importFile = async (page: Page, scene: unknown, name: string) => {
  await page.getByTestId('diagram-import-input').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(scene))
  });
  await page.keyboard.press('Escape');
};

const canvasImages = (page: Page) => {
  return page
    .getByRole('application')
    .locator('img')
    .evaluateAll((els) => {
      return els.map((el) => {
        return el.getAttribute('src') ?? '';
      });
    });
};

const toFlat = async (page: Page) => {
  const button = page.getByRole('button', {
    name: 'Flat 2D view',
    exact: true
  });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
};

/** A diagram exported with the flags pack installed: Alfa and Zulu, joined. */
const exportedWithPack = async (page: Page) => {
  await hook(page, { initialData: emptyScene('regatta') });
  await openEditor(page);
  await storePack(page, flagsPack());
  await page.reload();
  await expect(page.getByRole('application')).toBeVisible();
  await placeFromPalette(page, 'Alfa', /Alfa \(A\)/, [520, 380]);
  await placeFromPalette(page, 'Zulu', /Zulu \(Z\)/, [800, 520]);
  return exportJson(page);
};

test('an export names the pack once, with its source, and carries both drawings', async ({
  page
}) => {
  const scene = await exportedWithPack(page);
  expect(scene.externalPacks).toEqual([
    {
      id: 'nautical-flags',
      name: 'Nautical Flags',
      version: '1.0.0',
      sourceUrl:
        'https://github.com/qant-au/reticulyne/tree/main/packs/nautical-flags',
      icons: ['nautical-flags-alfa', 'nautical-flags-zulu']
    }
  ]);
  const carried = scene.icons.filter((i: { id: string }) => {
    return i.id.startsWith('nautical-flags-');
  });
  expect(carried).toHaveLength(2);
  for (const icon of carried) {
    expect(icon.url).toMatch(/^data:image\/svg\+xml/);
    expect(icon.flatUrl).toMatch(/^data:image\/svg\+xml/);
  }
});

test('opened without the pack: the notice names it with its link, and the flags still draw in both views', async ({
  page,
  browser
}) => {
  const scene = await exportedWithPack(page);
  const flags = scene.icons.filter((i: { id: string }) => {
    return i.id.startsWith('nautical-flags-');
  });

  const other = await browser.newPage();
  await openEditor(other);
  await importFile(other, scene, 'regatta.json');
  const notice = other.getByTestId('open-notice');
  await expect(notice).toContainText(
    'It was drawn with an icon pack that isn’t installed'
  );
  await expect(notice).toContainText('Nautical Flags 1.0.0, from');
  await expect(
    notice.getByRole('link', {
      name: 'https://github.com/qant-au/reticulyne/tree/main/packs/nautical-flags'
    })
  ).toHaveAttribute('target', '_blank');

  const iso = await canvasImages(other);
  for (const icon of flags) expect(iso).toContain(icon.url);
  await toFlat(other);
  const flat = await canvasImages(other);
  for (const icon of flags) expect(flat).toContain(icon.flatUrl);

  // Saved again here, without the pack, it still names it.
  expect((await exportJson(other)).externalPacks).toEqual(scene.externalPacks);
  await other.close();
});

test('opened with the pack installed: nothing to say', async ({ page }) => {
  const scene = await exportedWithPack(page);
  await importFile(page, scene, 'regatta.json');
  await expect(page.getByRole('application')).toBeVisible();
  await expect(page.getByTestId('open-notice')).toHaveCount(0);
});

/** A diagram whose objects name an icon nobody has, two of them, joined. */
const lostIcons = () => {
  return {
    format: 'reticulyne-scene',
    version: 2,
    id: 'lost',
    title: 'Lost icons',
    objects: [
      { id: 'a', name: 'Lost one', icon: 'gone-icon' },
      { id: 'b', name: 'Lost two', icon: 'gone-icon' }
    ],
    connections: [{ id: 'c1', from: 'a', to: 'b' }],
    views: [
      {
        id: 'v',
        kind: 'iso',
        name: 'Main',
        placements: [
          { object: 'a', tile: { x: 0, y: 0 } },
          { object: 'b', tile: { x: 4, y: 0 } }
        ],
        connectors: [
          {
            id: 'k1',
            connection: 'c1',
            anchors: [
              { id: 'k1a', ref: { object: 'a' } },
              { id: 'k1b', ref: { object: 'b' } }
            ]
          }
        ]
      }
    ]
  };
};

test('an icon nobody has opens as a placeholder in both views; Replace swaps it on every object in one undo step', async ({
  page
}) => {
  await openEditor(page);
  await importFile(page, lostIcons(), 'lost.json');
  const notice = page.getByTestId('open-notice');
  await expect(notice).toContainText('Some icons in this diagram are missing');
  await expect(notice).toContainText('gone-icon (2 objects)');
  const placeholders = (await canvasImages(page)).filter((src) => {
    return src.startsWith(MISSING) && decodeURIComponent(src).includes('?');
  });
  expect(placeholders).toHaveLength(2);
  await toFlat(page);
  expect(
    (await canvasImages(page)).filter((src) => {
      return decodeURIComponent(src).includes('rx="4"');
    })
  ).toHaveLength(2);

  await notice.getByRole('button', { name: 'Replace gone-icon' }).click();
  const dialog = page.getByRole('dialog', { name: 'Replace a missing icon' });
  await dialog.getByLabel('Search icons').fill('Router');
  await dialog
    .getByTestId('replace-icon-choices')
    .locator('img')
    .first()
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(notice).toHaveCount(0);

  const replaced = await exportJson(page);
  const icons = replaced.objects.map((o: { icon: string }) => {
    return o.icon;
  });
  expect(new Set(icons).size).toBe(1);
  expect(icons[0]).not.toBe('gone-icon');
  expect(replaced.connections).toEqual([
    expect.objectContaining({ id: 'c1', from: 'a', to: 'b' })
  ]);

  // One undo brings both placeholders back.
  await page.getByRole('application').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('ControlOrMeta+z');
  expect(
    (await exportJson(page)).objects.map((o: { icon: string }) => {
      return o.icon;
    })
  ).toEqual(['gone-icon', 'gone-icon']);
});

test('a missing icon replaced on one object leaves the other on the placeholder', async ({
  page
}) => {
  await openEditor(page);
  await importFile(page, lostIcons(), 'lost.json');
  // Select the first object and change its icon from its inspector.
  const node = page.getByRole('application').locator('img').first();
  await node.click({ force: true });
  await page.getByRole('button', { name: /Update icon/ }).click();
  await page.getByRole('button', { name: /^Reticulyne$/i }).click();
  await page
    .getByRole('button', { name: /^Icon Router/ })
    .first()
    .click();

  const scene = await exportJson(page);
  const icons = scene.objects.map((o: { icon: string }) => {
    return o.icon;
  });
  expect(icons.filter((i: string) => i === 'gone-icon')).toHaveLength(1);
  await expect(page.getByTestId('open-notice')).toContainText(
    'gone-icon (1 object)'
  );
});
