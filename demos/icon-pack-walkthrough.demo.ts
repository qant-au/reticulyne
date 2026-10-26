import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  clickAt,
  connect,
  installFlags,
  exportScene,
  glide,
  pause,
  place,
  saveVideo,
  screenOf,
  startEmpty
} from './lib';

/**
 * Demo: the whole life of an icon pack. The Nautical Flags pack is
 * installed and two flags are hoisted in "Regatta", which is saved and
 * exported. Removing the pack is refused while Regatta uses it; Show goes
 * to the flags, one is given another icon and the other deleted, and the
 * pack is removed. The exported file is then opened without the pack: the
 * editor names it, with its source, and draws the flags from the copies in
 * the file. Installing the pack again clears the message.
 */
test('install, use, share, find and remove an icon pack', async ({
  page
}, testInfo) => {
  await startEmpty(page, 'regatta', 'Regatta');
  let dialog = await installFlags(page);
  await pause(page, 1000);
  await clickAt(page, dialog.getByRole('button', { name: 'Close' }).first());

  await place(page, 'Alfa (A)', { x: 0, y: -2 }, 'Alfa');
  await place(page, 'Zulu (Z)', { x: 0, y: 2 }, 'Zulu');
  await connect(page, { x: 0, y: -2 }, 'Zulu (Z)', {
    fromPortOf: 'Alfa (A)',
    fromPort: 'Hoist bottom',
    toPort: 'Hoist top'
  });
  const shared = await exportScene(page);
  expect(shared.externalPacks).toEqual([
    expect.objectContaining({ id: 'nautical-flags' })
  ]);
  const file = join(testInfo.outputDir, 'regatta.json');
  await mkdir(testInfo.outputDir, { recursive: true });
  await writeFile(file, JSON.stringify(shared));
  await pause(page, 600);

  // Removing the pack is refused while Regatta uses it.
  await clickAt(page, page.getByRole('button', { name: 'Main menu' }));
  await clickAt(page, page.getByRole('menuitem', { name: 'Icon packs' }));
  dialog = page.getByRole('dialog', { name: 'Icon packs' });
  await clickAt(
    page,
    dialog.getByRole('button', { name: 'Remove Nautical Flags' })
  );
  await expect(dialog.getByTestId('icon-pack-usage')).toContainText(
    'Regatta (open now)'
  );
  await pause(page, 2400);
  await clickAt(
    page,
    dialog.getByRole('button', { name: /Show the objects in Regatta/ })
  );
  await pause(page, 1400);

  // Alfa takes a built-in icon instead; Zulu goes.
  await page.keyboard.press('Escape');
  await glide(page, screenOf(page, { x: 0, y: -2 }), 450);
  await page.mouse.click(...screenOf(page, { x: 0, y: -2 }));
  await pause(page, 500);
  await clickAt(page, page.getByRole('button', { name: /Update icon/ }));
  await clickAt(page, page.getByRole('button', { name: /^Reticulyne$/i }));
  await clickAt(
    page,
    page.getByRole('button', { name: /^Icon Satellite Dish/ }).first()
  );
  await pause(page, 900);
  await page.keyboard.press('Escape');
  await glide(page, screenOf(page, { x: 0, y: 2 }), 450);
  await page.mouse.click(...screenOf(page, { x: 0, y: 2 }));
  await pause(page, 400);
  await page.keyboard.press('Delete');
  await pause(page, 900);

  // Nothing uses it now: it goes.
  await clickAt(page, page.getByRole('button', { name: 'Main menu' }));
  await clickAt(page, page.getByRole('menuitem', { name: 'Icon packs' }));
  await clickAt(
    page,
    dialog.getByRole('button', { name: 'Remove Nautical Flags' })
  );
  await pause(page, 900);
  await clickAt(
    page,
    dialog.getByRole('button', { name: 'Remove', exact: true })
  );
  await expect(dialog.getByText('Removed Nautical Flags 1.0.0.')).toBeVisible();
  await pause(page, 1500);
  await clickAt(page, dialog.getByRole('button', { name: 'Close' }).first());

  // The shared file, opened without the pack.
  await clickAt(page, page.getByRole('button', { name: 'Diagrams' }));
  const chooser = page.waitForEvent('filechooser');
  await clickAt(page, page.getByRole('menuitem', { name: /Import from file/ }));
  await (await chooser).setFiles(file);
  const notice = page.getByTestId('open-notice');
  await expect(notice).toContainText('Nautical Flags 1.0.0, from');
  await glide(page, [640, 600], 500);
  await pause(page, 3500);

  // Installed again, the message goes.
  await installFlags(page);
  await pause(page, 900);
  await clickAt(
    page,
    page
      .getByRole('dialog', { name: 'Icon packs' })
      .getByRole('button', { name: 'Close' })
      .first()
  );
  await expect(notice).toHaveCount(0);
  await pause(page, 2000);
  await saveVideo(page, testInfo, 'icon-pack-walkthrough');
});
