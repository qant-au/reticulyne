import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * Save and reopen keeps today's features: floors (lw-053), crossover with
 * the floor plan (lw-055), locks (lw-069), a collapsed group (lw-062) and
 * a connector with sided ends and a manual waypoint (lw-061, 3.3). The
 * scene is loaded through `window.__RETICULYNE_E2E__` (Docker entry only,
 * see src/index-docker.tsx), exported, imported back through Diagrams >
 * Import from file, and exported again.
 */
const scene = {
  format: 'accurona-scene',
  version: 1,
  id: 'round-trip',
  title: 'Round trip',
  units: 'mm',
  objects: [
    { id: 'ap', name: 'Access point', element: 'wifi-ap' },
    { id: 'sw', name: 'Core switch', element: 'network-switch' },
    { id: 'srv', name: 'Server', element: 'server-tower' },
    { id: 'pc1', name: 'PC one', element: 'pc-tower' },
    { id: 'pc2', name: 'PC two', element: 'pc-tower' },
    { id: 'lap', name: 'Laptop', element: 'laptop' },
    { id: 'nvr', element: 'nvr' }
  ],
  connections: [{ id: 'c-riser', from: 'sw', to: 'srv' }],
  views: [
    {
      id: 'plan',
      kind: 'plan',
      name: 'Floor plan',
      floors: [
        {
          id: 'g',
          name: 'Ground',
          nodes: [
            { id: 'n1', x: 0, y: 0 },
            { id: 'n2', x: 8000, y: 0 }
          ],
          walls: [{ id: 'w1', from: 'n1', to: 'n2', exterior: true }]
        }
      ],
      placements: [
        { object: 'ap', floor: 'g', x: 2000, y: 1500 },
        { object: 'nvr', floor: 'g', x: 7000, y: 5000 }
      ]
    },
    {
      id: 'net-g',
      kind: 'iso',
      name: 'Ground net',
      placements: [
        { object: 'ap', tile: { x: 0, y: 0 }, locked: true },
        { object: 'sw', tile: { x: 0, y: -3 } }
      ]
    },
    {
      id: 'net-1',
      kind: 'iso',
      name: 'Level 1 net',
      placements: [{ object: 'srv', tile: { x: 1, y: 1 } }]
    },
    {
      id: 'lab',
      kind: 'iso',
      name: 'Lab',
      groups: [{ id: 'desk', name: 'Desk pair', collapsed: true }],
      placements: [
        { object: 'pc1', tile: { x: -2, y: 0 }, group: 'desk' },
        { object: 'pc2', tile: { x: -2, y: 2 }, group: 'desk' },
        { object: 'lap', tile: { x: 4, y: 1 } }
      ],
      connectors: [
        {
          id: 'k-ext',
          anchors: [
            { id: 'e1', ref: { object: 'lap', side: '-Y' } },
            { id: 'w1', ref: { tile: { x: 1, y: 4 } } },
            { id: 'e2', ref: { object: 'pc1', side: '+Y' } }
          ]
        }
      ]
    }
  ]
};

const exported = async (page: Page) => {
  await page.getByRole('button', { name: 'Main menu' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const file = await download;
  const text = await readFile(await file.path(), 'utf8');
  return { text, json: JSON.parse(text) };
};

// What must survive: everything bar the icons, which the export writes as
// the editor carries them.
const kept = (s: { icons?: unknown }) => {
  const rest = { ...s };
  delete rest.icons;
  return rest;
};

test('floors, crossover, locks and a collapsed group survive save and reopen', async ({
  page
}) => {
  await page.addInitScript((initialData) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      { initialData };
  }, scene);
  await page.goto('/');
  await expect(page.getByRole('tablist', { name: 'Floors' })).toBeVisible();

  const first = await exported(page);
  const views = first.json.views as { id: string }[];
  expect(
    views.map((v) => {
      return v.id;
    })
  ).toEqual(['plan', 'net-g', 'net-1', 'lab']);

  // Reopen: import the exported file as a new diagram.
  await page.getByRole('button', { name: 'Diagrams' }).click();
  await page.getByTestId('diagram-import-input').setInputFiles({
    name: 'round-trip.json',
    mimeType: 'application/json',
    buffer: Buffer.from(first.text)
  });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tab', { name: 'Lab' })).toBeVisible();

  const second = await exported(page);
  expect(kept(second.json)).toEqual(kept(first.json));

  // And what the reopened diagram shows agrees.
  await expect(page.getByRole('tab')).toHaveText([
    'Ground net',
    'Level 1 net',
    'Lab'
  ]);
  await expect(
    page.getByRole('button', { name: 'Go to Level 1 net · Server' })
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Lab' }).click();
  await expect(page.getByText('Desk pair (2)')).toBeVisible();

  const lab = second.json.views.find((v: { id: string }) => {
    return v.id === 'lab';
  });
  expect(lab.groups).toEqual([
    { id: 'desk', name: 'Desk pair', collapsed: true }
  ]);
  expect(
    lab.connectors[0].anchors.map((a: { ref: unknown }) => {
      return a.ref;
    })
  ).toEqual([
    { object: 'lap', side: '-Y' },
    { tile: { x: 1, y: 4 } },
    { object: 'pc1', side: '+Y' }
  ]);
  const ground = second.json.views.find((v: { id: string }) => {
    return v.id === 'net-g';
  });
  expect(
    ground.placements.find((p: { object: string }) => {
      return p.object === 'ap';
    }).locked
  ).toBe(true);
  expect(second.json.connections).toEqual([
    { id: 'c-riser', from: 'sw', to: 'srv' }
  ]);
  expect(second.json.views[0].placements).toEqual(scene.views[0].placements);
});
