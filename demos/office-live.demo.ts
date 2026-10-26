import { expect, test } from '@playwright/test';
import { glide, installCursor, pause, saveVideo } from './lib';

/**
 * Demo 2: the office network as a status board. Records one full cycle of
 * the "Office network, live" example (src/examples/OfficeNetworkLive): the
 * trunk links animate, the laptop's requests pulse through to the NAS, the
 * fibre service drops and the firewall fails over to 4G, the fibre returns,
 * the mains fail and the UPS carries the firewall. Served by the examples
 * container, http://localhost:2223.
 */
const EXAMPLES_URL =
  process.env.PLAYWRIGHT_EXAMPLES_URL ?? 'http://localhost:2223';

test('office network, live', async ({ page }, testInfo) => {
  await installCursor(page);
  await page.goto(EXAMPLES_URL);
  await page.getByRole('button', { name: 'Office network, live' }).click();
  await expect(page.getByTestId('office-live-caption')).toBeVisible();
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /^Fit to view/ }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /^Zoom in/ }).click();
  // Keep the pointer out of the picture.
  await page.mouse.move(1199, 749);
  // One cycle is 30 seconds; a little more so the loop closes on the same
  // state it opened on. Part way in, the labels come off (the toolbar's
  // Hide labels button) and the animation runs on its own.
  await pause(page, 9000);
  const hide = page.getByRole('button', { name: 'Hide labels (Alt+L)' });
  const box = (await hide.boundingBox())!;
  await glide(page, [box.x + box.width / 2, box.y + box.height / 2], 700);
  await hide.click();
  await pause(page, 300);
  await glide(page, [1199, 749], 600);
  await pause(page, 23_000);
  await saveVideo(page, testInfo, 'office-live');
});
