import { expect, test, type Page } from '@playwright/test';

/**
 * Isometric -> Flat 2D -> Isometric puts every node back where it was.
 *
 * Sweep 2026-09-30 (A07): the round trip moved every node 45px left,
 * because the view toggle rounded the centre of the canvas to its tile
 * before switching. Fixture injected via `window.__RETICULYNE_E2E__`
 * (Docker entry only, see src/index-docker.tsx).
 */
const tinyIconSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 fill=%22%23888%22/%3E%3C/svg%3E';

const NAMES = ['Alpha', 'Bravo', 'Charlie'];

const load = async (page: Page) => {
  await page.addInitScript(
    ({ url, names }) => {
      (
        window as unknown as { __RETICULYNE_E2E__: unknown }
      ).__RETICULYNE_E2E__ = {
        initialData: {
          title: 'e2e view toggle',
          icons: [{ id: 'tiny', name: 'Tiny', url, collection: 'test' }],
          colors: [{ id: 'c', value: '#1f77b4' }],
          items: names.map((name: string) => {
            return { id: name, name, icon: 'tiny' };
          }),
          views: [
            {
              id: 'v',
              name: 'Main',
              items: names.map((name: string, i: number) => {
                return { id: name, tile: { x: i * 2 - 1, y: i - 1 } };
              })
            }
          ]
        }
      };
    },
    { url: tinyIconSvg, names: NAMES }
  );
  await page.goto('/');
  await expect(page.getByText('Alpha', { exact: true }).first()).toBeVisible();
};

// Each canvas label's centre on screen (a <p> with the node's name, not
// the screen-reader list).
const labelCentres = async (page: Page) => {
  return page.evaluate((names) => {
    return names.map((name) => {
      const el = [...document.querySelectorAll('p')].find((p) => {
        return (
          p.textContent?.trim() === name && p.getBoundingClientRect().width > 0
        );
      });
      const r = el?.getBoundingClientRect();
      return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
    });
  }, NAMES);
};

test('iso -> flat -> iso leaves every node where it was', async ({ page }) => {
  await load(page);
  const before = await labelCentres(page);
  expect(before.every(Boolean)).toBe(true);

  await page.getByRole('button', { name: 'Flat 2D view', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Flat 2D view', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Isometric view', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Isometric view', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');

  const after = await labelCentres(page);
  after.forEach((p, i) => {
    expect(Math.abs(p!.x - before[i]!.x)).toBeLessThan(1.5);
    expect(Math.abs(p!.y - before[i]!.y)).toBeLessThan(1.5);
  });
});

test('flat -> iso -> flat leaves every node where it was', async ({ page }) => {
  await load(page);
  await page.getByRole('button', { name: 'Flat 2D view', exact: true }).click();
  const before = await labelCentres(page);

  await page.getByRole('button', { name: 'Isometric view', exact: true }).click();
  await page.getByRole('button', { name: 'Flat 2D view', exact: true }).click();

  const after = await labelCentres(page);
  after.forEach((p, i) => {
    expect(Math.abs(p!.x - before[i]!.x)).toBeLessThan(1.5);
    expect(Math.abs(p!.y - before[i]!.y)).toBeLessThan(1.5);
  });
});
