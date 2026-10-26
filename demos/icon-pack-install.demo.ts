import { expect, test } from '@playwright/test';
import {
  clickAt,
  connect,
  exportScene,
  installFlags,
  pause,
  place,
  saveVideo,
  startEmpty,
  toView
} from './lib';

/**
 * Demo: installing an icon pack. The Nautical Flags pack is installed from
 * its file in Main menu > Icon packs; its flags are at once in the library,
 * two of them (Uniform over Whiskey, "a pleasant voyage") are placed and
 * clipped together on the pack's own Halyard, and the flat view shows the
 * pack's flat drawings.
 */
test('install an icon pack and use it', async ({ page }, testInfo) => {
  await startEmpty(page, 'pleasant-voyage', 'A pleasant voyage');
  const dialog = await installFlags(page);
  await pause(page, 2200);
  await clickAt(page, dialog.getByRole('button', { name: 'Close' }).first());
  await pause(page, 500);

  await place(page, 'Uniform (U)', { x: 0, y: -2 }, 'Uniform');
  await place(page, 'Whiskey (W)', { x: 0, y: 2 }, 'Whiskey');
  await connect(page, { x: 0, y: -2 }, 'Whiskey (W)', {
    fromPortOf: 'Uniform (U)',
    fromPort: 'Hoist bottom',
    toPort: 'Hoist top'
  });
  await pause(page, 1200);
  await toView(page, 'flat');
  await pause(page, 1800);
  await toView(page, 'iso');
  await pause(page, 1200);

  const scene = await exportScene(page);
  expect(
    scene.objects.map((o) => {
      return o.icon;
    })
  ).toEqual(['nautical-flags-uniform', 'nautical-flags-whiskey']);
  expect(scene.connections).toEqual([
    expect.objectContaining({
      fromPort: 'hoist-bottom',
      toPort: 'hoist-top',
      kind: 'halyard'
    })
  ]);
  await saveVideo(page, testInfo, 'icon-pack-install');
});
