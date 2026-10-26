import { expect, test } from '@playwright/test';
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
  setLabelPosition,
  startEmpty,
  tidyIds,
  toView,
  zoomOut,
  type Tile
} from './lib';

/**
 * Demo 3: an NMEA 2000 network on a boat. A backbone of tees between two
 * terminators, powered by an injector, with the instruments on the drops:
 * radar, two GPS receivers, a weather station, two chartplotters, a depth
 * transducer, an engine gateway and an AIS transponder. The backbone is
 * connected from the terminator end so each tee takes its backbone-in
 * first, its backbone-out second, and the devices get the drops.
 */
const AT: Record<string, Tile> = {
  'Terminator (bow)': { x: -2, y: 2 },
  'Tee (bow)': { x: -1, y: 1 },
  '4-Way Tee (fwd)': { x: 0, y: 0 },
  'Tee (mid)': { x: 1, y: -1 },
  '4-Way Tee (aft)': { x: 2, y: -2 },
  'Terminator (stern)': { x: 3, y: -3 },
  'NMEA 2000 Power Injector': { x: -3, y: -1 },
  Radar: { x: 4, y: 4 },
  'GPS 1': { x: 1, y: 3 },
  'Weather Station': { x: 2, y: 2 },
  'Depth Transducer': { x: -2, y: -2 },
  'Engine Gateway (J1939 to NMEA 2000)': { x: -1, y: -3 },
  'Chartplotter (helm)': { x: 4, y: 0 },
  'Chartplotter (nav)': { x: 6, y: 2 },
  'GPS 2': { x: 3, y: 1 },
  'AIS Transponder': { x: 0, y: -4 }
};

const IDS: Record<string, string> = {
  'Terminator (bow)': 'term-bow',
  'Tee (bow)': 'tee-bow',
  '4-Way Tee (fwd)': 'tee4-fwd',
  'Tee (mid)': 'tee-mid',
  '4-Way Tee (aft)': 'tee4-aft',
  'Terminator (stern)': 'term-stern',
  'NMEA 2000 Power Injector': 'power',
  Radar: 'radar',
  'GPS 1': 'gps-1',
  'Weather Station': 'weather',
  'Depth Transducer': 'depth',
  'Engine Gateway (J1939 to NMEA 2000)': 'engine',
  'Chartplotter (helm)': 'plotter-helm',
  'Chartplotter (nav)': 'plotter-nav',
  'GPS 2': 'gps-2',
  'AIS Transponder': 'ais'
};

test('nmea 2000 network', async ({ page }, testInfo) => {
  await startEmpty(page, 'nmea-2000', 'NMEA 2000 network');
  await zoomOut(page, 2);
  await pause(page, 400);

  // The backbone, bow to stern.
  await placeAs(page, 'NMEA 2000 Terminator (Male)', 'Terminator (bow)', AT['Terminator (bow)'], 'Terminator (Male');
  await placeAs(page, 'NMEA 2000 Tee', 'Tee (bow)', AT['Tee (bow)'], 'NMEA 2000 Tee');
  await placeAs(page, 'NMEA 2000 4-Way Tee', '4-Way Tee (fwd)', AT['4-Way Tee (fwd)'], '4-Way');
  await placeAs(page, 'NMEA 2000 Tee', 'Tee (mid)', AT['Tee (mid)'], 'NMEA 2000 Tee');
  await placeAs(page, 'NMEA 2000 4-Way Tee', '4-Way Tee (aft)', AT['4-Way Tee (aft)'], '4-Way');
  await placeAs(page, 'NMEA 2000 Terminator (Female)', 'Terminator (stern)', AT['Terminator (stern)'], 'Terminator (Female');
  // Then what hangs off it.
  await place(page, 'NMEA 2000 Power Injector', AT['NMEA 2000 Power Injector'], 'Power Injector');
  await place(page, 'Radar', AT.Radar);
  await placeAs(page, 'GPS Receiver', 'GPS 1', AT['GPS 1'], 'GPS Receiver');
  await placeAs(page, 'Wind Instrument', 'Weather Station', AT['Weather Station'], 'Wind');
  await place(page, 'Depth Transducer', AT['Depth Transducer'], 'Depth');
  await place(page, 'Engine Gateway (J1939 to NMEA 2000)', AT['Engine Gateway (J1939 to NMEA 2000)'], 'Engine Gateway');
  await placeAs(page, 'Chartplotter', 'Chartplotter (helm)', AT['Chartplotter (helm)'], 'Chartplotter');
  await placeAs(page, 'Chartplotter', 'Chartplotter (nav)', AT['Chartplotter (nav)'], 'Chartplotter');
  await placeAs(page, 'GPS Receiver', 'GPS 2', AT['GPS 2'], 'GPS Receiver');
  await place(page, 'AIS Transponder', AT['AIS Transponder'], 'AIS');
  await pause(page, 600);

  // Backbone first, from the bow: each tee's "in" then its "out".
  await connect(page, AT['Terminator (bow)'], 'Tee (bow)');
  await connect(page, AT['Tee (bow)'], '4-Way Tee (fwd)');
  await connect(page, AT['4-Way Tee (fwd)'], 'Tee (mid)');
  await connect(page, AT['Tee (mid)'], '4-Way Tee (aft)');
  await connect(page, AT['4-Way Tee (aft)'], 'Terminator (stern)');
  // The drops.
  await connect(page, AT['NMEA 2000 Power Injector'], 'Tee (bow)');
  await connect(page, AT.Radar, '4-Way Tee (fwd)');
  await connect(page, AT['GPS 1'], '4-Way Tee (fwd)');
  await connect(page, AT['Weather Station'], '4-Way Tee (fwd)');
  await connect(page, AT['Depth Transducer'], '4-Way Tee (fwd)');
  await connect(page, AT['Engine Gateway (J1939 to NMEA 2000)'], 'Tee (mid)');
  await connect(page, AT['Chartplotter (helm)'], '4-Way Tee (aft)');
  await connect(page, AT['Chartplotter (nav)'], '4-Way Tee (aft)');
  await connect(page, AT['GPS 2'], '4-Way Tee (aft)');
  await connect(page, AT['AIS Transponder'], '4-Way Tee (aft)');

  // The finished diagram: a long look at it, the flat view, and back to
  // the isometric view, which stays on screen before the GIF loops.
  // Six labels in a row crowd each other: every other one goes below.
  await setLabelPosition(page, AT['Tee (bow)'], 'Label below');
  await setLabelPosition(page, AT['Tee (mid)'], 'Label below');
  await setLabelPosition(page, AT['Terminator (stern)'], 'Label below');
  await pause(page, 400);

  await fitToView(page);
  await pause(page, 9000);
  await toView(page, 'flat');
  await pause(page, 11000);
  await toView(page, 'iso');
  await pause(page, 18000);

  const scene = tidyIds(await exportScene(page), IDS);
  await saveScene(scene, join(__dirname, 'scenes', 'nmea-2000.json'));
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
  expect(scene.connections).toHaveLength(15);
  const ports = Object.fromEntries(
    scene.connections!.map((c) => {
      return [c.id, [c.fromPort, c.toPort]];
    })
  );
  expect(ports['term-bow--tee-bow']).toEqual(['t', 'in']);
  expect(ports['tee-bow--tee4-fwd']).toEqual(['out', 'in']);
  expect(ports['tee4-fwd--tee-mid']).toEqual(['out', 'in']);
  expect(ports['tee-mid--tee4-aft']).toEqual(['out', 'in']);
  expect(ports['tee4-aft--term-stern']).toEqual(['out', 't']);
  expect(ports['power--tee-bow']).toEqual(['n2k', 'drop']);
  expect(ports['radar--tee4-fwd']).toEqual(['n2k', 'drop1']);
  expect(ports['ais--tee4-aft']).toEqual(['n2k', 'drop4']);
  const below = (view.placements ?? [])
    .filter((p) => {
      return p.labelPosition === 'S';
    })
    .map((p) => {
      return p.object;
    })
    .sort();
  expect(below).toEqual(['tee-bow', 'tee-mid', 'term-stern']);

  await saveVideo(page, testInfo, 'nmea-2000');
});
