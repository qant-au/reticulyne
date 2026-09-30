import { expect, test, type Page } from '@playwright/test';

/**
 * The marquee catches what is visibly inside the rectangle the pointer
 * draws. Sweep 2026-09-30: the band was the box of tiles between the two
 * corner tiles - in the isometric view a thin diamond - so a node plainly
 * inside the drag (the Firewall, up and to the right) was never selected.
 * Fixture injected via `window.__RETICULYNE_E2E__` (Docker entry only, see
 * src/index-docker.tsx).
 */
const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23888%22/%3E%3C/svg%3E';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((url) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      {
        initialData: {
          title: 'e2e marquee',
          icons: [{ id: 'tiny', name: 'Tiny', url, collection: 'test' }],
          colors: [{ id: 'c', value: '#1f77b4' }],
          items: [
            { id: 'sw', name: 'Switch', icon: 'tiny' },
            { id: 'fw', name: 'Firewall', icon: 'tiny' },
            { id: 'far', name: 'Far away', icon: 'tiny' }
          ],
          views: [
            {
              id: 'v',
              name: 'Main',
              items: [
                { id: 'sw', tile: { x: 0, y: 0 } },
                { id: 'fw', tile: { x: 4, y: 0 } },
                { id: 'far', tile: { x: -4, y: 0 } }
              ]
            }
          ]
        }
      };
  }, tinyIconSvg);
  await page.goto('/');
  await expect(page.getByText('Firewall', { exact: true })).toBeVisible();
});

const box = async (page: Page, name: string) => {
  return (await page.getByText(name, { exact: true }).boundingBox())!;
};

const drag = async (
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  during?: () => Promise<void>
) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const steps = 8;
  for (let i = 1; i <= steps; i += 1) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * i) / steps,
      from.y + ((to.y - from.y) * i) / steps
    );
  }
  if (during) await during();
  await page.mouse.up();
};

test('a node visibly inside the dragged rectangle is selected', async ({
  page
}) => {
  const sw = await box(page, 'Switch');
  const fw = await box(page, 'Firewall');
  // From empty canvas left of and above the Switch, to past the Firewall
  // and below the Switch: both are inside, 'Far away' (to the left) is not.
  const from = { x: sw.x - 30, y: fw.y - 40 };
  const to = { x: fw.x + fw.width + 40, y: sw.y + sw.height + 90 };

  await drag(page, from, to, async () => {
    // The band is that rectangle, on the screen.
    const band = (await page.getByTestId('marquee-band').boundingBox())!;
    expect(band.x).toBeCloseTo(Math.min(from.x, to.x), -1);
    expect(band.y).toBeCloseTo(Math.min(from.y, to.y), -1);
    expect(band.width).toBeCloseTo(Math.abs(to.x - from.x), -1);
    expect(band.height).toBeCloseTo(Math.abs(to.y - from.y), -1);
  });

  await expect(page.getByText('2 selected', { exact: true })).toBeVisible();
});
