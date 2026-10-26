import { expect, test, type Page } from '@playwright/test';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOGUE, itemToSceneObject, pickPorts } from '../src/catalogue';
import { BUILTIN_PACK } from '../src/icons/builtin';
import type { Scene, SceneObject } from '../src/core';

/**
 * The sample diagrams in samples/ (rtl-060). Builds the two that are made
 * from the catalogue, writes them to samples/, then opens every sample in
 * the editor and exports each view with Export as image at the default
 * settings, once isometric (<name>.png) and once flat (<name>-flat.png):
 * the pictures beside each JSON are what the editor draws, not drawn by
 * hand.
 *
 *   bash restart.sh && npm run demos:record -- samples
 */
const SAMPLES = join(__dirname, '..', 'samples');

const item = (id: string) => {
  const found = CATALOGUE.items.find((i) => {
    return i.id === id;
  });
  if (!found) throw new Error(`no catalogue item ${id}`);
  return found;
};

type Place = [id: string, catalogueId: string, name: string, x: number, y: number];

/** A scene of catalogue devices, joined port to port where they share a medium. */
const build = (
  meta: { id: string; title: string; description: string },
  places: Place[],
  links: [string, string, string?][],
  extra: Partial<Scene> & { rectangles?: unknown[]; textBoxes?: unknown[] } = {}
): Scene => {
  const objects: SceneObject[] = places.map(([id, catalogueId, name]) => {
    return { ...itemToSceneObject(item(catalogueId), id), name };
  });
  const byId = new Map(
    objects.map((o) => {
      return [o.id, o];
    })
  );
  const connections: NonNullable<Scene['connections']> = [];
  for (const [from, to, description] of links) {
    const ports = pickPorts(byId.get(from)!, byId.get(to)!, connections);
    if (!ports) throw new Error(`no shared medium: ${from} -> ${to}`);
    connections.push({
      id: `${from}--${to}`,
      from,
      to,
      ...ports,
      ...(description ? { description } : {})
    });
  }
  const used = new Set(
    objects.map((o) => {
      return o.icon;
    })
  );
  const { rectangles, textBoxes, ...rest } = extra;
  return {
    format: 'reticulyne-scene',
    version: 2,
    ...meta,
    objects,
    connections,
    views: [
      {
        id: 'site',
        name: 'Site',
        kind: 'iso',
        placements: places.map(([id, , , x, y]) => {
          return { object: id, tile: { x, y } };
        }),
        connectors: connections.map((c) => {
          return {
            id: c.id,
            connection: c.id,
            anchors: [
              { id: `${c.id}-a`, ref: { object: c.from } },
              { id: `${c.id}-b`, ref: { object: c.to } }
            ],
            ...(c.description ? { description: c.description } : {})
          };
        }),
        ...(rectangles ? { rectangles } : {}),
        ...(textBoxes ? { textBoxes } : {})
      } as NonNullable<Scene['views']>[number]
    ],
    icons: BUILTIN_PACK.icons.filter((i) => {
      return used.has(i.id);
    }),
    ...rest
  } as Scene;
};

const builtInDevices = () => {
  return build(
    {
      id: 'built-in-devices',
      title: 'Built-in devices',
      description:
        'A small business site drawn only with built-in catalogue devices, each placed with its ports and joined port to port.'
    },
    [
      ['ont', 'fibre-ont', 'Fibre ONT', -12, 0],
      ['firewall', 'firewall', 'Firewall', -8, 0],
      ['core', 'network-switch-24', 'Core switch', -4, 0],
      ['poe', 'poe-switch-8', 'PoE switch', 0, 0],
      ['server', 'rack-server-1u', 'Server', -4, -4],
      ['nas', 'nas', 'NAS', -6, -4],
      ['nvr', 'nvr-8', 'NVR', -2, -4],
      ['ups', 'rack-ups', 'Rack UPS', -8, -4],
      ['ap', 'wifi-ap-ceiling', 'Wi-Fi AP', 4, 4],
      ['laptop', 'laptop', 'Laptop', 8, 4],
      ['phone', 'ip-phone', 'Desk phone', 4, 1],
      ['dome', 'ip-camera-dome', 'Reception camera', 4, -2],
      ['bullet', 'ip-camera-bullet', 'Car park camera', 4, -5],
      ['door', 'door-controller', 'Door controller', 0, 5],
      ['reader', 'card-reader', 'Front door reader', 0, 9],
      ['mfp', 'mfp', 'Printer', -4, 4],
      ['pc', 'desktop-pc', 'Reception PC', -8, 4]
    ],
    [
      ['ont', 'firewall', 'Fibre'],
      ['firewall', 'core'],
      ['core', 'poe'],
      ['core', 'server'],
      ['core', 'nas'],
      ['core', 'nvr'],
      ['ups', 'firewall'],
      ['poe', 'ap'],
      ['ap', 'laptop'],
      ['poe', 'phone'],
      ['poe', 'dome'],
      ['poe', 'bullet'],
      ['poe', 'door'],
      ['door', 'reader'],
      ['core', 'mfp'],
      ['core', 'pc']
    ],
    {
      rectangles: [
        {
          id: 'rack',
          from: { x: -10, y: -6 },
          to: { x: -1, y: -2 },
          colorValue: '#a5b8f3',
          transparency: 0.5
        }
      ],
      textBoxes: [{ id: 'rack-label', tile: { x: -5, y: -8 }, content: 'Comms rack' }]
    }
  );
};

// A third-party pack icon and an uploaded one, drawn as plain SVG.
const svg = (body: string, view = '0 0 64 64') => {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}">${body}</svg>`
  )}`;
};
const PACK_ISO = svg(
  '<path d="M32 10 54 22 54 44 32 56 10 44 10 22Z" fill="#f2a541" stroke="#16213d" stroke-width="2"/><path d="M10 22 32 34 54 22M32 34V56" fill="none" stroke="#16213d" stroke-width="2"/>'
);
const PACK_FLAT = svg(
  '<rect x="8" y="12" width="32" height="24" rx="3" fill="#f2a541" stroke="#16213d" stroke-width="1.5"/>',
  '0 0 48 48'
);
const UPLOADED = svg(
  '<circle cx="32" cy="32" r="22" fill="#2ea88e" stroke="#16213d" stroke-width="2"/><path d="M22 32h20M32 22v20" stroke="#fff" stroke-width="4"/>'
);
const OVERRIDE_ISO = svg(
  '<path d="M32 14 52 26 52 42 32 54 12 42 12 26Z" fill="#c94f6d" stroke="#16213d" stroke-width="2"/>'
);
const OVERRIDE_FLAT = svg(
  '<rect x="10" y="14" width="28" height="20" fill="#c94f6d" stroke="#16213d" stroke-width="1.5"/>',
  '0 0 48 48'
);

const mixedIcons = () => {
  const scene = build(
    {
      id: 'mixed-icons',
      title: 'Mixed icons',
      description:
        'Built-in devices beside an icon from a third-party pack, an uploaded icon, and a built-in device with its own images laid over its icon.'
    },
    [
      ['router', 'router', 'Router', -6, 0],
      ['switch', 'network-switch-24', 'Switch', -2, 0],
      ['pc', 'desktop-pc', 'Desktop PC', 2, 3],
      ['branded', 'network-switch-24', 'Branded switch', 2, -3]
    ],
    [
      ['router', 'switch'],
      ['switch', 'pc'],
      ['switch', 'branded', 'Uplink']
    ]
  );
  // The built-in switch, drawn with its own images: an iso and a flat
  // override. Its icon and ports stay the library's.
  scene.objects.find((o) => {
    return o.id === 'branded';
  })!.iconOverride = { url: OVERRIDE_ISO, flatUrl: OVERRIDE_FLAT };
  scene.objects.push(
    { id: 'appliance', name: 'Pack appliance', icon: 'acme-appliance' },
    { id: 'gadget', name: 'Uploaded gadget', icon: 'uploaded-gadget' }
  );
  scene.icons!.push(
    {
      id: 'acme-appliance',
      name: 'Appliance',
      collection: 'Acme pack',
      url: PACK_ISO,
      flatUrl: PACK_FLAT,
      isIsometric: true
    },
    { id: 'uploaded-gadget', name: 'Gadget', collection: 'My icons', url: UPLOADED }
  );
  const view = scene.views![0] as {
    placements: { object: string; tile: { x: number; y: number } }[];
    connectors: unknown[];
  };
  view.placements.push(
    { object: 'appliance', tile: { x: -6, y: -4 } },
    { object: 'gadget', tile: { x: 6, y: 3 } }
  );
  view.connectors.push(
    {
      id: 'router--appliance',
      anchors: [
        { id: 'ra-a', ref: { object: 'router' } },
        { id: 'ra-b', ref: { object: 'appliance' } }
      ],
      style: 'DASHED'
    },
    {
      id: 'pc--gadget',
      anchors: [
        { id: 'lg-a', ref: { object: 'pc' } },
        { id: 'lg-b', ref: { object: 'gadget' } }
      ],
      style: 'DOTTED'
    }
  );
  return scene;
};

const open = async (page: Page, scene: Scene) => {
  await page.addInitScript((initialData) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      { initialData };
  }, scene);
  await page.goto('/');
  await expect(page.getByRole('application')).toBeVisible();
};

const exportPng = async (page: Page, file: string) => {
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: /Export as image/i }).click();
  const button = page.getByRole('button', { name: /Download as PNG/i });
  await expect(button).toBeVisible({ timeout: 10_000 });
  const download = page.waitForEvent('download', { timeout: 20_000 });
  await button.click();
  await (await download).saveAs(join(SAMPLES, file));
  await page.keyboard.press('Escape');
  await expect(button).toBeHidden();
};

const toView = async (page: Page, name: 'Isometric view' | 'Flat 2D view') => {
  const button = page.getByRole('button', { name, exact: true });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
};

test('samples: build and export iso and flat pictures', async ({ browser }) => {
  test.setTimeout(10 * 60 * 1000);
  for (const scene of [builtInDevices(), mixedIcons()]) {
    writeFileSync(
      join(SAMPLES, `${scene.id}.json`),
      `${JSON.stringify(scene, null, 2)}\n`
    );
  }
  const files = readdirSync(SAMPLES).filter((f) => {
    return f.endsWith('.json');
  });
  for (const file of files) {
    const scene = JSON.parse(readFileSync(join(SAMPLES, file), 'utf8')) as Scene;
    const base = file.replace(/\.json$/, '');
    const views = (scene.views ?? []).filter((v) => {
      return v.kind !== 'plan';
    });
    for (const view of views) {
      const page = await browser.newPage();
      await open(page, scene);
      if (views.length > 1) {
        await page
          .getByRole('tablist', { name: 'Floors' })
          .getByRole('tab', { name: view.name })
          .click();
      }
      const slug =
        views.length > 1
          ? `${base}-${view.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-floor$/, '')}`
          : base;
      await toView(page, 'Isometric view');
      await exportPng(page, `${slug}.png`);
      await toView(page, 'Flat 2D view');
      await exportPng(page, `${slug}-flat.png`);
      await page.close();
    }
  }
});
