import { expect, test } from '@playwright/test';
import {
  emptyScene,
  exportJson,
  flagsPack,
  hook,
  installFile,
  newDiagram,
  openEditor,
  openIconPacks,
  openLibrary,
  placeFromPalette,
  renameDiagram,
  saveDiagram,
  storedPackIds
} from './iconPackHelpers';

/**
 * The Icon packs dialog in the Docker editor, with the Nautical Flags pack:
 * install from a file, a broken file, a newer version over an older one, a
 * locked pack from the app, and removal refused while saved diagrams use
 * the pack, with Show taking the user to the objects.
 */

const flagTile = (page: import('@playwright/test').Page, name: RegExp) => {
  return page
    .getByTestId('icon-palette')
    .getByTestId('catalogue-items')
    .getByRole('button', { name });
};

test('install a pack from a file: dialog, library and palette at once, and after a reload', async ({
  page
}) => {
  await openEditor(page);
  let dialog = await openIconPacks(page);
  await expect(dialog.getByText(/No icon packs are installed/)).toBeVisible();
  await installFile(page, flagsPack(), 'nautical-flags.reticulyne-pack.json');
  await expect(
    dialog.getByText('Installed Nautical Flags 1.0.0: 40 icons.')
  ).toBeVisible();
  const row = dialog.getByTestId('icon-pack-nautical-flags');
  await expect(row).toContainText('Installed by you');
  await expect(row).toContainText('40 icons');
  await expect(
    row.getByRole('link', {
      name: 'https://github.com/qant-au/reticulyne/tree/main/packs/nautical-flags'
    })
  ).toHaveAttribute('target', '_blank');
  await page.keyboard.press('Escape');

  // In the palette straight away, with no reload.
  const palette = await openLibrary(page);
  await palette.getByRole('textbox').fill('Quebec');
  await expect(flagTile(page, /Quebec \(Q\)/)).toBeVisible();
  expect(await storedPackIds(page)).toEqual(['nautical-flags']);

  await page.reload();
  await expect(page.getByRole('application')).toBeVisible();
  dialog = await openIconPacks(page);
  await expect(dialog.getByTestId('icon-pack-nautical-flags')).toContainText(
    'Installed by you'
  );
});

test('a broken pack file lists every problem and installs nothing', async ({
  page
}) => {
  await openEditor(page);
  const dialog = await openIconPacks(page);
  const flags = flagsPack();
  await installFile(
    page,
    {
      ...flags,
      sourceUrl: '',
      icons: [{ ...flags.icons[0], flatUrl: 'javascript:alert(1)' }]
    },
    'broken.json'
  );
  await expect(dialog.getByText('The pack has 2 problems:')).toBeVisible();
  await expect(dialog.getByText(/^sourceUrl/)).toBeVisible();
  await expect(dialog.getByText(/^icons\.0\.flatUrl/)).toBeVisible();
  await expect(dialog.getByText(/No icon packs are installed/)).toBeVisible();
  expect(await storedPackIds(page)).toEqual([]);
});

test('a newer version installs over the older one after a confirm naming both', async ({
  page
}) => {
  await openEditor(page);
  const dialog = await openIconPacks(page);
  await installFile(page, flagsPack(), 'v1.json');
  await expect(
    dialog.getByText(/Installed Nautical Flags 1\.0\.0/)
  ).toBeVisible();
  await installFile(page, { ...flagsPack(), version: '2.0.0' }, 'v2.json');
  await expect(
    dialog.getByText(
      /Replace Nautical Flags 1\.0\.0 with Nautical Flags 2\.0\.0\?/
    )
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Replace' }).click();
  await expect(dialog.getByTestId('icon-pack-nautical-flags')).toContainText(
    'Nautical Flags 2.0.0'
  );
});

test('a pack the app locked has no Remove, and installing over it is refused', async ({
  page
}) => {
  await hook(page, {
    initialData: emptyScene(),
    iconPacks: [{ pack: flagsPack(), removable: false }]
  });
  await openEditor(page);
  const dialog = await openIconPacks(page);
  const row = dialog.getByTestId('icon-pack-nautical-flags');
  await expect(row).toContainText('Loaded by the app');
  await expect(row).toContainText('Locked by the app');
  await expect(
    dialog.getByRole('button', { name: 'Remove Nautical Flags' })
  ).toHaveCount(0);
  await installFile(page, { ...flagsPack(), version: '2.0.0' }, 'v2.json');
  await expect(
    dialog.getByText(/loaded by the app and can't be replaced or removed here/)
  ).toBeVisible();
  await expect(row).toContainText('Nautical Flags 1.0.0');
  expect(await storedPackIds(page)).toEqual([]);
});

test('removal is refused while two saved diagrams use the pack; Show finds the objects; then it goes', async ({
  page
}) => {
  await openEditor(page);
  let dialog = await openIconPacks(page);
  await installFile(page, flagsPack(), 'flags.json');
  await expect(dialog.getByText(/Installed Nautical Flags/)).toBeVisible();
  await page.keyboard.press('Escape');

  // Two saved diagrams, each with a flag.
  await renameDiagram(page, 'Harbour');
  await placeFromPalette(page, 'Alfa', /Alfa \(A\)/, [520, 400]);
  await saveDiagram(page);
  await newDiagram(page);
  await renameDiagram(page, 'Regatta');
  await placeFromPalette(page, 'Zulu', /Zulu \(Z\)/, [560, 420]);
  await placeFromPalette(page, 'Kilo', /Kilo \(K\)/, [800, 520]);
  await saveDiagram(page);

  dialog = await openIconPacks(page);
  await dialog.getByRole('button', { name: 'Remove Nautical Flags' }).click();
  const usage = dialog.getByTestId('icon-pack-usage');
  await expect(usage).toContainText(
    "Nautical Flags can't be removed while diagrams use its icons"
  );
  await expect(usage).toContainText('Regatta (open now)');
  await expect(usage).toContainText('Zulu (Z), Kilo (K)');
  await expect(usage).toContainText('Harbour');
  await expect(usage).toContainText('Alfa (A)');

  // Show opens Harbour with its flag selected; Delete removes exactly it.
  await dialog
    .getByRole('button', { name: 'Show the objects in Harbour' })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.locator('#root').getByText('Harbour', { exact: true })
  ).toBeVisible();
  await page.keyboard.press('Delete');
  expect((await exportJson(page)).objects).toHaveLength(0);
  await saveDiagram(page);

  // Regatta, saved, still uses it.
  dialog = await openIconPacks(page);
  await dialog.getByRole('button', { name: 'Remove Nautical Flags' }).click();
  await expect(dialog.getByTestId('icon-pack-usage')).toContainText('Regatta');
  await expect(dialog.getByTestId('icon-pack-usage')).not.toContainText(
    'Harbour'
  );
  await dialog
    .getByRole('button', { name: 'Show the objects in Regatta' })
    .click();
  await page.keyboard.press('Delete');
  expect((await exportJson(page)).objects).toHaveLength(0);
  await saveDiagram(page);

  dialog = await openIconPacks(page);
  await dialog.getByRole('button', { name: 'Remove Nautical Flags' }).click();
  await expect(
    dialog.getByText(/Its 40 icons and its devices leave the library/)
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(dialog.getByText('Removed Nautical Flags 1.0.0.')).toBeVisible();
  await expect(dialog.getByText(/No icon packs are installed/)).toBeVisible();
  await page.keyboard.press('Escape');

  const palette = await openLibrary(page);
  await palette.getByRole('textbox').fill('Quebec');
  await expect(flagTile(page, /Quebec \(Q\)/)).toHaveCount(0);
  expect(await storedPackIds(page)).toEqual([]);
});
