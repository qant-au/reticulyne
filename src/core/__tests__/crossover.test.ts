// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- see below
// @ts-nocheck: ported as-is from untyped JavaScript tests; the fixtures
// are deliberately loose literals (the schema is what checks them).
import { strict as assert } from 'node:assert';
import {
  diagramLocations,
  floorsOf,
  objectPlaces,
  placedOnlyElsewhere,
  validateScene
} from 'src/core';

// Two floors on one plan; a diagram per floor, and a switch on no plan.
const scene = {
  format: 'reticulyne-scene',
  version: 1,
  id: 'hq',
  objects: [
    { id: 'sw-1', element: 'network-switch' },
    { id: 'ap-1', element: 'wifi-ap' },
    { id: 'ap-2', element: 'wifi-ap' },
    { id: 'cam-2', element: 'camera' },
    { id: 'sofa', element: 'sofa' },
    { id: 'cloud' },
    { id: 'loose' }
  ],
  views: [
    {
      id: 'plan',
      kind: 'plan',
      name: 'Building',
      floors: [
        { id: 'g', name: 'Ground' },
        { id: 'l2', name: 'Level 2' }
      ],
      placements: [
        { object: 'sw-1', floor: 'g', x: 100, y: 200 },
        { object: 'ap-1', floor: 'g', x: 300, y: 400 },
        { object: 'ap-2', floor: 'l2', x: 500, y: 600 },
        { object: 'cam-2', floor: 'l2', x: 700, y: 800 },
        { object: 'sofa', floor: 'l2', x: 900, y: 1000 }
      ]
    },
    {
      id: 'net-g',
      kind: 'iso',
      name: 'Ground network',
      placements: [
        { object: 'sw-1', tile: { x: 0, y: 0 } },
        { object: 'ap-1', tile: { x: 2, y: 0 } },
        { object: 'cloud', tile: { x: 4, y: 0 } }
      ]
    },
    {
      id: 'net-2',
      kind: 'schematic',
      name: 'Level 2 network',
      placements: [
        { object: 'ap-2', tile: { x: 0, y: 0 } },
        { object: 'sw-1', tile: { x: 2, y: 0 } }
      ]
    }
  ]
};

test('the fixture is a valid scene', () => {
  assert.equal(validateScene(scene).ok, true);
});

test('objectPlaces lists every view an object is in, with where', () => {
  assert.deepEqual(objectPlaces(scene, 'sw-1'), [
    {
      viewId: 'plan',
      viewName: 'Building',
      kind: 'plan',
      floorId: 'g',
      floorName: 'Ground',
      x: 100,
      y: 200
    },
    {
      viewId: 'net-g',
      viewName: 'Ground network',
      kind: 'iso',
      tile: { x: 0, y: 0 }
    },
    {
      viewId: 'net-2',
      viewName: 'Level 2 network',
      kind: 'schematic',
      tile: { x: 2, y: 0 }
    }
  ]);
  assert.deepEqual(objectPlaces(scene, 'loose'), []);
  assert.deepEqual(objectPlaces(scene, 'nothing'), []);
});

test('placedOnlyElsewhere: what the other editor placed and this one has not', () => {
  const ids = (list) => {
    return list.map((o) => {
      return o.id;
    });
  };
  // For a diagram editor: on the plan, in no diagram. Never the unplaced.
  assert.deepEqual(ids(placedOnlyElsewhere(scene, ['iso', 'schematic'])), [
    'cam-2',
    'sofa'
  ]);
  // For a plan editor: in a diagram, on no plan.
  assert.deepEqual(ids(placedOnlyElsewhere(scene, ['plan'])), ['cloud']);
  // A diagram editor that draws only iso still counts schematic as elsewhere.
  assert.deepEqual(ids(placedOnlyElsewhere(scene, ['iso'])), [
    'ap-2',
    'cam-2',
    'sofa'
  ]);
});

test('diagramLocations maps a diagram view to the plan floors of its objects', () => {
  assert.deepEqual(diagramLocations(scene, 'net-g'), [
    {
      planViewId: 'plan',
      planViewName: 'Building',
      floorId: 'g',
      floorName: 'Ground',
      count: 2
    }
  ]);
  // Most objects first; a tie keeps floor order.
  assert.deepEqual(
    diagramLocations(scene, 'net-2').map((l) => {
      return [l.floorId, l.count];
    }),
    [
      ['g', 1],
      ['l2', 1]
    ]
  );
});

test('floorsOf maps any set of objects, placed in a diagram or not', () => {
  assert.deepEqual(
    floorsOf(scene, ['ap-2', 'cam-2', 'sw-1', 'cloud']).map((l) => {
      return [l.floorName, l.count];
    }),
    [
      ['Level 2', 2],
      ['Ground', 1]
    ]
  );
  assert.deepEqual(floorsOf(scene, []), []);
  assert.deepEqual(floorsOf(scene, ['cloud', 'nothing']), []);
});

test('diagramLocations: nothing for a plan view, an unknown view or no plan', () => {
  assert.deepEqual(diagramLocations(scene, 'plan'), []);
  assert.deepEqual(diagramLocations(scene, 'nope'), []);
  const noPlan = { ...scene, views: scene.views.slice(1) };
  assert.deepEqual(diagramLocations(noPlan, 'net-g'), []);
});
