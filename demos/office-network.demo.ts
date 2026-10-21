import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  connect,
  exportScene,
  fitToView,
  pause,
  place,
  placeAs,
  saveScene,
  saveVideo,
  startEmpty,
  tidyIds,
  toView,
  zoomOut,
  type Tile
} from './lib';

/**
 * Demo 1: drawing a small office network from the catalogue. Two internet
 * services into a firewall, two switches, two access points, a server, a
 * NAS, a UPS and a laptop on Wi-Fi: eleven items placed from the library
 * and connected from the context menu, each connection taking a real port.
 * The finished scene is saved as demos/scenes/small-office.json and as the
 * data of the "Office network, live" example.
 */
const AT: Record<string, Tile> = {
  'Fibre ONT': { x: 4, y: 4 },
  '4G/5G Router': { x: 6, y: 2 },
  'Firewall (Rack-Mount)': { x: 3, y: 1 },
  'Network Switch (24-Port)': { x: 0, y: 0 },
  'PoE Switch (8-Port)': { x: 2, y: -2 },
  Server: { x: -4, y: 2 },
  NAS: { x: -3, y: 1 },
  'UPS (Network Managed)': { x: -2, y: 0 },
  'Wi-Fi AP, front': { x: 0, y: -2 },
  'Wi-Fi AP, rear': { x: 1, y: -3 },
  Laptop: { x: -1, y: -5 }
};

const IDS: Record<string, string> = {
  'Fibre ONT': 'fibre-ont',
  '4G/5G Router': 'cellular-router',
  'Firewall (Rack-Mount)': 'firewall',
  'Network Switch (24-Port)': 'core-switch',
  'PoE Switch (8-Port)': 'poe-switch',
  Server: 'server',
  NAS: 'nas',
  'UPS (Network Managed)': 'ups',
  'Wi-Fi AP, front': 'ap-front',
  'Wi-Fi AP, rear': 'ap-rear',
  Laptop: 'laptop'
};

test('office network', async ({ page }, testInfo) => {
  await startEmpty(page, 'small-office', 'Small office network');
  await zoomOut(page, 2);
  await pause(page, 400);

  // The internet side first, then the core, then what hangs off it.
  await place(page, 'Fibre ONT', AT['Fibre ONT']);
  await place(page, '4G/5G Router', AT['4G/5G Router'], '4G');
  await place(page, 'Firewall (Rack-Mount)', AT['Firewall (Rack-Mount)'], 'Firewall (Rack');
  await place(page, 'Network Switch (24-Port)', AT['Network Switch (24-Port)'], '24-Port');
  await place(page, 'PoE Switch (8-Port)', AT['PoE Switch (8-Port)'], 'PoE Switch');
  await place(page, 'Server', AT.Server);
  await place(page, 'NAS', AT.NAS);
  await place(page, 'UPS (Network Managed)', AT['UPS (Network Managed)'], 'UPS');
  await placeAs(page, 'Wi-Fi Access Point', 'Wi-Fi AP, front', AT['Wi-Fi AP, front'], 'Access Point');
  await placeAs(page, 'Wi-Fi Access Point', 'Wi-Fi AP, rear', AT['Wi-Fi AP, rear'], 'Access Point');
  await place(page, 'Laptop', AT.Laptop);
  await pause(page, 600);

  // Connections: the first free port on each side, on a medium they share.
  // Where that is not the right port (the ONT's PON is its upstream, the 4G
  // router's first port is its WAN) the connector's Ports section fixes it.
  await connect(page, AT['Fibre ONT'], 'Firewall (Rack-Mount)', {
    fromPortOf: 'Fibre ONT',
    fromPort: 'LAN 1',
    toPort: 'WAN 1'
  });
  await connect(page, AT['4G/5G Router'], 'Firewall (Rack-Mount)', {
    fromPortOf: '4G/5G Router',
    fromPort: 'LAN 1',
    toPort: 'WAN 2'
  });
  await connect(page, AT['Firewall (Rack-Mount)'], 'Network Switch (24-Port)');
  await connect(page, AT['Firewall (Rack-Mount)'], 'PoE Switch (8-Port)');
  await connect(page, AT['Network Switch (24-Port)'], 'PoE Switch (8-Port)');
  await connect(page, AT.Server, 'Network Switch (24-Port)');
  await connect(page, AT.NAS, 'Network Switch (24-Port)');
  await connect(page, AT['UPS (Network Managed)'], 'Network Switch (24-Port)');
  await connect(page, AT['Wi-Fi AP, front'], 'PoE Switch (8-Port)');
  await connect(page, AT['Wi-Fi AP, rear'], 'PoE Switch (8-Port)');
  await connect(page, AT.Laptop, 'Wi-Fi AP, rear');
  // The UPS's network port is taken, so this one is power: an outlet to
  // the firewall's mains inlet.
  await connect(page, AT['UPS (Network Managed)'], 'Firewall (Rack-Mount)', {
    fromPortOf: 'UPS (Network Managed)',
    fromPort: 'Outlet 1',
    toPort: 'Mains in 1'
  });

  // The finished diagram: a long look at it, the flat view, and back to
  // the isometric view, which stays on screen before the GIF loops.
  await fitToView(page);
  await pause(page, 9000);
  await toView(page, 'flat');
  await pause(page, 11000);
  await toView(page, 'iso');
  await pause(page, 18000);

  const scene = tidyIds(await exportScene(page), IDS);
  await saveScene(scene, join(__dirname, 'scenes', 'small-office.json'));
  const view = scene.views[0];
  for (const [name, tile] of Object.entries(AT)) {
    const object = scene.objects.find((o) => {
      return o.name === name;
    });
    expect(object, name).toBeTruthy();
    const placement = view.placements?.find((p) => {
      return p.object === object!.id;
    });
    expect(placement?.tile, name).toEqual(tile);
  }
  expect(scene.connections).toHaveLength(12);
  const ports = Object.fromEntries(
    scene.connections!.map((c) => {
      return [c.id, [c.fromPort, c.toPort, c.kind]];
    })
  );
  expect(ports['fibre-ont--firewall']).toEqual(['lan1', 'wan1', 'ethernet-copper']);
  expect(ports['cellular-router--firewall']).toEqual(['lan1', 'wan2', 'ethernet-copper']);
  expect(ports['firewall--core-switch']).toEqual(['lan1', 'eth1', 'ethernet-copper']);
  expect(ports['laptop--ap-rear']).toEqual(['wifi', 'radio', 'wi-fi']);
  expect(ports['ups--firewall']).toEqual(['out1', 'ac1', 'power-ac']);

  // The example needs no `icons`: every object names its element, and the
  // built-in pack supplies the drawing.
  const { icons: _icons, ...rest } = scene;
  const forExample = {
    ...rest,
    objects: rest.objects.map(({ icon: _icon, ...object }) => {
      return object;
    })
  };
  await writeFile(
    join(__dirname, '..', 'src', 'examples', 'OfficeNetworkLive', 'scene.ts'),
    `// Generated by demos/office-network.demo.ts: the scene that demo draws,\n` +
      `// kept here so the "Office network, live" example can drive it.\n` +
      `/* eslint-disable prettier/prettier */\n` +
      `import type { Scene } from 'src/core';\n\n` +
      `export const officeScene: Scene = ${JSON.stringify(forExample, null, 2)};\n`
  );
  await saveVideo(page, testInfo, 'office-network');
});
