import { validateScene, type Scene } from 'src/vendor/accurona-core';
import { modelSchema } from 'src/schemas/model';
import type { Model } from 'src/types';
import {
  legacyModelToScene,
  readScene,
  sceneFromModel,
  sceneToModel
} from 'src/scene';

// lw-053: connections between items, whatever floors (views) they are on.

const expectValid = (scene: Scene) => {
  const result = validateScene(scene);
  expect(result.ok ? [] : result.errors).toEqual([]);
};

// Two floors and a plan. The switch on the ground floor feeds the AP on
// level 1 (c1, with a port and a kind Reticulyne does not edit); the AP is
// also patched to a door controller that is only on the plan (c2).
const building = (): Scene => {
  return {
    format: 'accurona-scene',
    version: 1,
    id: 'hq',
    objects: [
      { id: 'sw', name: 'Switch', ports: [{ id: '14' }] },
      { id: 'ap', name: 'AP' },
      { id: 'dc', name: 'Door controller' }
    ],
    connections: [
      { id: 'c1', from: 'sw', fromPort: '14', to: 'ap', kind: 'ethernet' },
      { id: 'c2', from: 'ap', to: 'dc' }
    ],
    views: [
      {
        id: 'plan',
        kind: 'plan',
        name: 'Building',
        floors: [{ id: 'g' }],
        placements: [{ object: 'dc', floor: 'g', x: 0, y: 0 }]
      },
      {
        id: 'ground',
        kind: 'iso',
        name: 'Ground',
        placements: [{ object: 'sw', tile: { x: 0, y: 0 } }]
      },
      {
        id: 'l1',
        kind: 'iso',
        name: 'Level 1',
        placements: [{ object: 'ap', tile: { x: 2, y: 0 } }]
      }
    ]
  };
};

describe('connections', () => {
  test('load: only the ones between two items Reticulyne shows', () => {
    const { model } = sceneToModel(building());
    // lw-083: with the port and medium it is attached to.
    expect(model.connections).toEqual([
      { id: 'c1', from: 'sw', fromPort: '14', to: 'ap', kind: 'ethernet' }
    ]);
    expect(modelSchema.safeParse(model).success).toBe(true);
  });

  test('save unchanged keeps the fields Reticulyne does not edit', () => {
    const { model, context } = sceneToModel(building());
    const saved = sceneFromModel(model, context);
    expectValid(saved);
    expect(saved.connections).toEqual(building().connections);
  });

  test('a connection removed in the editor goes; one to a plan object stays', () => {
    const { model, context } = sceneToModel(building());
    const saved = sceneFromModel({ ...model, connections: [] }, context);
    expectValid(saved);
    expect(saved.connections).toEqual([{ id: 'c2', from: 'ap', to: 'dc' }]);
  });

  test('a connection added in the editor is saved', () => {
    const scene = building();
    scene.connections = [];
    const { model, context } = sceneToModel(scene);
    expect(model.connections).toBeUndefined();
    const saved = sceneFromModel(
      {
        ...model,
        connections: [{ id: 'n1', from: 'ap', to: 'sw', description: 'Uplink' }]
      },
      context
    );
    expectValid(saved);
    expect(saved.connections).toEqual([
      { id: 'n1', from: 'ap', to: 'sw', description: 'Uplink' }
    ]);
  });

  test('a scene with no connections saves with none', () => {
    const scene = building();
    delete scene.connections;
    const { model, context } = sceneToModel(scene);
    expect(sceneFromModel(model, context)).not.toHaveProperty('connections');
  });

  test('changed ends drop the port, which belonged to the old end', () => {
    const scene = building();
    scene.objects.push({ id: 'sw2', name: 'Switch 2' });
    (scene.views![1] as { placements: unknown[] }).placements.push({
      object: 'sw2',
      tile: { x: 3, y: 3 }
    });
    const { model, context } = sceneToModel(scene);
    const saved = sceneFromModel(
      { ...model, connections: [{ id: 'c1', from: 'sw2', to: 'ap' }] },
      context
    );
    expectValid(saved);
    expect(saved.connections?.[0]).toEqual({ id: 'c1', from: 'sw2', to: 'ap' });
  });

  test('a connector that drew a removed connection no longer names it', () => {
    const scene = building();
    const ground = scene.views![1] as { placements: unknown[] };
    ground.placements.push({ object: 'ap', tile: { x: 4, y: 0 } });
    (scene.views![1] as { connectors?: unknown[] }).connectors = [
      {
        id: 'k1',
        connection: 'c1',
        anchors: [
          { id: 'a1', ref: { object: 'sw' } },
          { id: 'a2', ref: { object: 'ap' } }
        ]
      }
    ];
    expectValid(scene);
    const { model, context } = sceneToModel(scene);
    const saved = sceneFromModel({ ...model, connections: [] }, context);
    expectValid(saved);
    const view = saved.views!.find((v) => {
      return v.id === 'ground';
    });
    expect(
      view && view.kind !== 'plan' && view.connectors?.[0]
    ).not.toHaveProperty('connection');
  });

  test('a legacy model: connection ids and ends follow the remapped ids', () => {
    const legacy: Model = {
      title: 'Old',
      items: [
        { id: 'a b', name: 'A' },
        { id: 'c', name: 'C' }
      ],
      views: [
        { id: 'v1', name: 'One', items: [{ id: 'a b', tile: { x: 0, y: 0 } }] },
        { id: 'v2', name: 'Two', items: [{ id: 'c', tile: { x: 0, y: 0 } }] }
      ],
      icons: [],
      colors: [],
      connections: [{ id: 'x y', from: 'a b', to: 'c' }]
    };
    const scene = legacyModelToScene(legacy, 'old');
    expectValid(scene);
    expect(scene.connections).toEqual([{ id: 'x_y', from: 'a_b', to: 'c' }]);
  });
});

// lw-091: connectors between items becoming connections, only when asked.
describe('a legacy model with connections from connectors', () => {
  const connector = (id: string, from: string, to: string) => {
    return {
      id,
      anchors: [
        { id: `${id}-a`, ref: { item: from } },
        { id: `${id}-b`, ref: { item: to } }
      ]
    };
  };
  // a-b drawn twice on one view and once on another, a-c once, and one
  // connector ending on a tile.
  const legacy = (): Model => {
    return {
      title: 'Old',
      items: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
        { id: 'c', name: 'C' }
      ],
      views: [
        {
          id: 'v1',
          name: 'One',
          items: [
            { id: 'a', tile: { x: 0, y: 0 } },
            { id: 'b', tile: { x: 2, y: 0 } },
            { id: 'c', tile: { x: 4, y: 0 } }
          ],
          connectors: [
            connector('k1', 'a', 'b'),
            connector('k2', 'b', 'a'),
            connector('k3', 'a', 'c'),
            {
              id: 'k4',
              anchors: [
                { id: 'k4-a', ref: { item: 'c' } },
                { id: 'k4-b', ref: { tile: { x: 6, y: 0 } } }
              ]
            }
          ]
        },
        {
          id: 'v2',
          name: 'Two',
          items: [
            { id: 'a', tile: { x: 0, y: 0 } },
            { id: 'b', tile: { x: 2, y: 0 } }
          ],
          connectors: [connector('k5', 'a', 'b')]
        }
      ],
      icons: [],
      colors: []
    };
  };
  const drawn = (scene: Scene) => {
    return Object.fromEntries(
      (scene.views ?? []).flatMap((view) => {
        return view.kind === 'plan'
          ? []
          : (view.connectors ?? []).map((c) => {
              return [c.id, c.connection];
            });
      })
    );
  };

  test('off by default: no connection is made', () => {
    const scene = legacyModelToScene(legacy(), 'old');
    expectValid(scene);
    expect(scene.connections).toBeUndefined();
    expect(Object.values(drawn(scene)).filter(Boolean)).toEqual([]);
  });

  test('one connection per pair, drawn by every connector between it', () => {
    const scene = legacyModelToScene(legacy(), 'old', { connections: true });
    expectValid(scene);
    expect(scene.connections).toHaveLength(2);
    const [ab, ac] = scene.connections!;
    expect(ab).toEqual({ id: ab.id, from: 'a', to: 'b' });
    expect(ac).toEqual({ id: ac.id, from: 'a', to: 'c' });
    expect(drawn(scene)).toEqual({
      k1: ab.id,
      k2: ab.id,
      k3: ac.id,
      k4: undefined,
      k5: ab.id
    });
    // And it opens with them, ready to edit.
    const { model } = sceneToModel(scene);
    expect(model.connections).toHaveLength(2);
  });

  test("the model's own connections are reused, not doubled", () => {
    const model = legacy();
    model.connections = [{ id: 'own', from: 'b', to: 'a', kind: 'ethernet' }];
    const scene = legacyModelToScene(model, 'old', { connections: true });
    expectValid(scene);
    expect(scene.connections).toEqual([
      { id: 'own', from: 'b', to: 'a', kind: 'ethernet' },
      { id: expect.any(String), from: 'a', to: 'c' }
    ]);
    expect(drawn(scene)).toMatchObject({ k1: 'own', k2: 'own', k5: 'own' });
  });

  test('readScene passes the option to a legacy model', () => {
    const result = readScene(legacy(), 'old', { connections: true });
    expect(result.ok && result.scene.connections).toHaveLength(2);
  });
});

describe('model validation', () => {
  const base = (): Model => {
    return {
      title: 'T',
      items: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' }
      ],
      views: [{ id: 'v', name: 'V', items: [] }],
      icons: [],
      colors: []
    };
  };

  test('accepts a connection between two items', () => {
    const model = { ...base(), connections: [{ id: 'c', from: 'a', to: 'b' }] };
    expect(modelSchema.safeParse(model).success).toBe(true);
  });

  test.each([
    ['an unknown item', [{ id: 'c', from: 'a', to: 'zz' }]],
    ['an item to itself', [{ id: 'c', from: 'a', to: 'a' }]],
    [
      'a repeated id',
      [
        { id: 'c', from: 'a', to: 'b' },
        { id: 'c', from: 'b', to: 'a' }
      ]
    ]
  ])('refuses %s', (_label, connections) => {
    const model = { ...base(), connections };
    expect(modelSchema.safeParse(model).success).toBe(false);
  });
});
