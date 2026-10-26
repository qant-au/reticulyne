import { expect, test } from '@playwright/test';
import {
  connectNth,
  emptyScene,
  exportJson,
  flagsPack,
  hook,
  openEditor,
  openLibrary,
  placeFromPalette,
  storePack
} from './iconPackHelpers';

/**
 * Icon packs pushed in from code (the `iconPacks` prop, here through the
 * Docker editor's e2e hook) and kept in the browser: a pack's devices come
 * into the palette with their ports, and two of them connect on the pack's
 * own medium.
 */

test('a locked pack from code: flags place from the palette and connect by halyard', async ({
  page
}) => {
  await hook(page, {
    initialData: emptyScene(),
    iconPacks: [{ pack: flagsPack(), removable: false }]
  });
  await openEditor(page);

  // The pack's section is in the library.
  const palette = await openLibrary(page);
  await palette.getByRole('textbox').fill('Alfa');
  await expect(
    palette.getByTestId('catalogue-items').getByRole('button', {
      name: /Alfa \(A\)/
    })
  ).toBeVisible();

  await placeFromPalette(page, 'Alfa', /Alfa \(A\)/, [520, 380]);
  await placeFromPalette(page, 'Bravo', /Bravo \(B\)/, [820, 540]);
  await connectNth(page, 0, /Bravo \(B\)/);

  const scene = await exportJson(page);
  expect(
    scene.objects.map((o: { icon: string }) => {
      return o.icon;
    })
  ).toEqual(['nautical-flags-alfa', 'nautical-flags-bravo']);
  for (const object of scene.objects) {
    expect(
      object.ports.map((p: { id: string; kind: string }) => {
        return `${p.id}:${p.kind}`;
      })
    ).toEqual(['hoist-top:halyard', 'hoist-bottom:halyard']);
  }
  expect(scene.connections).toHaveLength(1);
  expect(scene.connections[0].kind).toBe('halyard');
  // The diagram carries its own copy of the two flags it uses, both views.
  const carried = scene.icons.filter((i: { id: string }) => {
    return i.id.startsWith('nautical-flags-');
  });
  expect(carried).toHaveLength(2);
  for (const icon of carried) expect(icon.flatUrl).toMatch(/^data:image/);
});

test('a pack kept in the browser loads again after a reload, ports and all', async ({
  page
}) => {
  await hook(page, { initialData: emptyScene() });
  await openEditor(page);
  await storePack(page, flagsPack());
  await page.reload();
  await expect(page.getByRole('application')).toBeVisible();

  await placeFromPalette(page, 'Zulu', /Zulu \(Z\)/, [600, 420]);
  const scene = await exportJson(page);
  expect(scene.objects[0].icon).toBe('nautical-flags-zulu');
  expect(scene.objects[0].ports).toHaveLength(2);
});
