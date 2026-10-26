import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * Label position: a node's label sits at one of eight compass points around
 * it, chosen on the inspector's compass, saved with the diagram as the
 * placement's `labelPosition`, and drawn where it says in both views.
 */
const scene = (labelPosition?: string) => {
  return {
    format: 'reticulyne-scene',
    version: 2,
    id: 'e2e-label-position',
    title: 'Label position',
    objects: [{ id: 'sw', name: 'Core switch', element: 'network-switch' }],
    views: [
      {
        id: 'v',
        kind: 'iso',
        name: 'Main',
        placements: [
          {
            object: 'sw',
            tile: { x: 0, y: 0 },
            labelHeight: 120,
            ...(labelPosition ? { labelPosition } : {})
          }
        ]
      }
    ]
  };
};

const open = async (page: Page, data: unknown) => {
  await page.addInitScript((initialData) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      { initialData };
  }, data);
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
};

const boxes = async (page: Page) => {
  const canvas = page.getByRole('application');
  const icon = (await canvas.locator('img').first().boundingBox())!;
  const label = (await canvas
    .getByText('Core switch', { exact: true })
    .boundingBox())!;
  return { icon, label };
};

const centre = (b: { x: number; y: number; width: number; height: number }) => {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

const exported = async (page: Page) => {
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Main menu' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const text = await readFile(await (await download).path(), 'utf8');
  await page.keyboard.press('Escape');
  return JSON.parse(text);
};

test('a saved position is drawn where it says', async ({ page }) => {
  await open(page, scene('E'));
  const { icon, label } = await boxes(page);
  // Right of the icon, level with its middle.
  expect(label.x).toBeGreaterThan(icon.x + icon.width * 0.6);
  expect(Math.abs(centre(label).y - centre(icon).y)).toBeLessThan(
    icon.height * 0.5
  );
});

test('the default is above, and the compass moves the label and saves it', async ({
  page
}) => {
  await open(page, scene());
  const before = await boxes(page);
  expect(before.label.y + before.label.height).toBeLessThan(before.icon.y + 10);
  expect(Math.abs(centre(before.label).x - centre(before.icon).x)).toBeLessThan(
    20
  );

  // Select the node: its inspector opens with the compass.
  await page
    .getByRole('application')
    .locator('img')
    .first()
    .click({ force: true });
  await page
    .getByRole('button', { name: 'Label position', exact: true })
    .click();
  const compass = page.getByRole('group', { name: 'Label position' });
  await expect(compass).toBeVisible();
  await expect(
    compass.getByRole('button', { name: 'Label above', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
  await compass
    .getByRole('button', { name: 'Label below', exact: true })
    .click();
  // Choosing closes the popover; it reopens showing the choice.
  await expect(compass).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Label position', exact: true })
    .click();
  await expect(
    page
      .getByRole('group', { name: 'Label position' })
      .getByRole('button', { name: 'Label below', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  const after = await boxes(page);
  expect(after.label.y).toBeGreaterThan(
    before.icon.y + before.icon.height * 0.6
  );

  let saved = await exported(page);
  expect(saved.views[0].placements[0].labelPosition).toBe('S');

  // Undo puts it back above, and the file no longer says where.
  await page.getByRole('application').focus();
  await page.keyboard.press('ControlOrMeta+KeyZ');
  const undone = await boxes(page);
  expect(undone.label.y + undone.label.height).toBeLessThan(undone.icon.y + 10);
  saved = await exported(page);
  expect(saved.views[0].placements[0].labelPosition).toBeUndefined();
});

test('the position holds in the flat view', async ({ page }) => {
  await open(page, scene('W'));
  await page.getByRole('button', { name: 'Flat 2D view', exact: true }).click();
  const { icon, label } = await boxes(page);
  expect(label.x + label.width).toBeLessThan(icon.x + icon.width * 0.4);
});
