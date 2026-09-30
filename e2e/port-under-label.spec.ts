import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * A node's upper ports sit under the bottom of its name. Sweep 2026-09-30:
 * a press there landed on the name, not the canvas, so it started a marquee
 * instead of a connector. The name now lets the pointer through. Fixture
 * injected via `window.__RETICULYNE_E2E__` (Docker entry only, see
 * src/index-docker.tsx).
 */
const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23888%22/%3E%3C/svg%3E';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((url) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      {
        initialData: {
          title: 'e2e ports',
          icons: [{ id: 'tiny', name: 'Tiny', url, collection: 'test' }],
          colors: [{ id: 'c', value: '#1f77b4' }],
          items: [
            { id: 'printer', name: 'Printer box', icon: 'tiny' },
            { id: 'laptop', name: 'Laptop', icon: 'tiny' }
          ],
          views: [
            {
              id: 'v',
              name: 'Main',
              items: [
                { id: 'printer', tile: { x: 0, y: 0 } },
                { id: 'laptop', tile: { x: 4, y: -2 } }
              ]
            }
          ]
        }
      };
  }, tinyIconSvg);
  await page.goto('/');
  await expect(page.getByText('Printer box', { exact: true })).toBeVisible();
});

// The node's tile: just below the foot of its name.
const nodeAt = async (page: Page, name: string) => {
  const label = (await page.getByText(name, { exact: true }).boundingBox())!;
  return { x: label.x + label.width / 2, y: label.y + label.height + 36 };
};

const exportedConnectors = async (page: Page) => {
  await page.getByRole('button', { name: 'Main menu' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const scene = JSON.parse(
    await readFile(await (await download).path(), 'utf8')
  );
  return scene.views[0].connectors ?? [];
};

test('pressing an upper port under the name draws a connector', async ({
  page
}) => {
  const printer = await nodeAt(page, 'Printer box');
  await page.mouse.move(printer.x, printer.y);
  const ports = page.getByTestId('connector-hotspots').locator('circle');
  await expect(ports).toHaveCount(4);

  // The highest port on the screen: the one under the name.
  const boxes = await Promise.all(
    (await ports.all()).map(async (p) => {
      return (await p.boundingBox())!;
    })
  );
  const upper = boxes.sort((a, b) => {
    return a.y - b.y;
  })[0];
  const at = { x: upper.x + upper.width / 2, y: upper.y + upper.height / 2 };

  // What is under the port is the canvas, not the name.
  const underName = await page.evaluate(({ x, y }) => {
    return !!document
      .elementFromPoint(x, y)
      ?.closest('p, span, h6')
      ?.textContent?.includes('Printer box');
  }, at);
  expect(underName).toBe(false);

  const laptop = await nodeAt(page, 'Laptop');
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(laptop.x, laptop.y, { steps: 10 });
  await page.mouse.up();

  // A connector, not a marquee: nothing is selected in bulk.
  await expect(page.getByText(/^[0-9]+ selected$/)).toHaveCount(0);
  const connectors = await exportedConnectors(page);
  expect(connectors).toHaveLength(1);
  const ends = connectors[0].anchors.map((a: { ref: { object?: string } }) => {
    return a.ref.object;
  });
  expect(ends[0]).toBe('printer');
  expect(ends[ends.length - 1]).toBe('laptop');
});
