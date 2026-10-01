import { validateScene, type Scene } from 'src/vendor/accurona-core';
import { model as fixtureModel } from 'src/fixtures/model';
import { modelSchema } from 'src/schemas/model';
import type { Model } from 'src/types';
import {
  freshSceneContext,
  leanIcons,
  legacyModelToScene,
  modelToSceneUpdate,
  readScene,
  sceneFromModel,
  sceneToModel
} from 'src/scene';

const expectValid = (scene: Scene) => {
  const result = validateScene(scene);
  expect(result.ok ? [] : result.errors).toEqual([]);
};

// A scene with things Reticulyne does not show: a plan view, object props,
// ports and links, a connection, layers and a connector drawing it.
const richScene = (): Scene => {
  return {
    format: 'accurona-scene',
    version: 1,
    id: 'hq',
    title: 'Head office',
    units: 'm',
    layers: [{ id: 'notes', name: 'Notes' }],
    icons: [{ id: 'switch', name: 'Switch', url: 'https://example.com/s.svg' }],
    colors: [{ id: 'blue', value: '#0000ff' }],
    objects: [
      {
        id: 'sw',
        name: 'Switch',
        icon: 'switch',
        element: 'network-switch',
        props: { ip: '10.0.0.2' },
        ports: [{ id: '14', kind: 'ethernet' }],
        links: [{ source: 'rmm', ref: 'Sw1' }]
      },
      { id: 'ap', name: 'AP', description: 'East wing' },
      { id: 'door', element: 'door' },
      { id: 'spare', name: 'Spare, not drawn' }
    ],
    connections: [
      { id: 'c1', from: 'sw', fromPort: '14', to: 'ap', kind: 'ethernet' }
    ],
    views: [
      {
        id: 'plan',
        kind: 'plan',
        name: 'Building',
        floors: [{ id: 'g', name: 'Ground' }],
        placements: [
          { object: 'sw', floor: 'g', x: 100, y: 100 },
          { object: 'door', floor: 'g', x: 500, y: 0 }
        ]
      },
      {
        id: 'net',
        kind: 'schematic',
        name: 'Network',
        placements: [
          { object: 'sw', tile: { x: 0, y: 0 }, layer: 'notes' },
          { object: 'ap', tile: { x: 4, y: 0 }, group: 'g1' }
        ],
        connectors: [
          {
            id: 'k1',
            connection: 'c1',
            layer: 'notes',
            color: 'blue',
            anchors: [
              { id: 'a1', ref: { object: 'sw' } },
              { id: 'a2', ref: { tile: { x: 2, y: 1 } } },
              { id: 'a3', ref: { object: 'ap' } }
            ]
          }
        ],
        rectangles: [
          {
            id: 'r1',
            from: { x: -1, y: -1 },
            to: { x: 5, y: 1 },
            layer: 'notes',
            group: 'g1'
          }
        ],
        textBoxes: [
          {
            id: 't1',
            tile: { x: 0, y: 3 },
            content: 'Rack A',
            layer: 'redacted'
          }
        ],
        groups: [{ id: 'g1', name: 'Wing', color: '#112233', collapsed: true }]
      },
      {
        id: 'iso',
        kind: 'iso',
        name: 'Iso',
        placements: [{ object: 'ap', tile: { x: 1, y: 1 } }]
      }
    ]
  };
};

describe('sceneToModel', () => {
  test('loads the diagram views and the objects placed in them', () => {
    const { model } = sceneToModel(richScene());
    expect(
      model.views.map((v) => {
        return v.id;
      })
    ).toEqual(['net', 'iso']);
    expect(
      model.items.map((i) => {
        return i.id;
      })
    ).toEqual(['sw', 'ap']);
    // With the element, props, ports and links it carries.
    expect(model.items[0]).toEqual({
      id: 'sw',
      name: 'Switch',
      icon: 'switch',
      element: 'network-switch',
      props: { ip: '10.0.0.2' },
      ports: [{ id: '14', kind: 'ethernet' }],
      links: [{ source: 'rmm', ref: 'Sw1' }]
    });
    expect(model.views[0].connectors?.[0].anchors[0]).toEqual({
      id: 'a1',
      ref: { item: 'sw' }
    });
    expect(model.views[0].items[1].parentGroupId).toBe('g1');
    expect(
      model.views.map((v) => {
        return [v.id, v.kind];
      })
    ).toEqual([
      ['net', 'schematic'],
      ['iso', undefined]
    ]);
    expect(modelSchema.safeParse(model).success).toBe(true);
  });

  test('an object with no name gets an empty one; a title defaults', () => {
    const scene: Scene = {
      format: 'accurona-scene',
      version: 1,
      id: 's',
      objects: [{ id: 'x' }],
      views: [
        {
          id: 'v',
          kind: 'iso',
          name: 'V',
          placements: [{ object: 'x', tile: { x: 0, y: 0 } }]
        }
      ]
    };
    const { model } = sceneToModel(scene);
    expect(model.title).toBe('Untitled');
    expect(model.items).toEqual([{ id: 'x', name: '' }]);
  });
});

describe('scene -> model -> scene', () => {
  test('round-trips, keeping what Reticulyne does not show', () => {
    const opened = richScene();
    const { model, context } = sceneToModel(opened);
    const saved = sceneFromModel(model, context);
    expectValid(saved);
    expect(saved).toEqual(opened);
  });

  test('keeps the kind of each view, and new views are iso', () => {
    const { model, context } = sceneToModel(richScene());
    const edited: Model = {
      ...model,
      views: [...model.views, { id: 'new', name: 'New', items: [] }]
    };
    const saved = sceneFromModel(edited, context);
    expect(
      saved.views?.map((v) => {
        return [v.id, v.kind];
      })
    ).toEqual([
      ['plan', 'plan'],
      ['net', 'schematic'],
      ['iso', 'iso'],
      ['new', 'iso']
    ]);
  });

  test('a view switched in the editor saves as its new kind', () => {
    const { model, context } = sceneToModel(richScene());
    const edited: Model = {
      ...model,
      views: model.views.map((v) => {
        return { ...v, kind: v.id === 'iso' ? 'schematic' : undefined };
      })
    };
    const saved = sceneFromModel(edited, context);
    expectValid(saved);
    expect(
      saved.views?.map((v) => {
        return [v.id, v.kind];
      })
    ).toEqual([
      ['plan', 'plan'],
      ['net', 'iso'],
      ['iso', 'schematic']
    ]);
  });

  test('edits land; object props, ports and links are kept', () => {
    const { model, context } = sceneToModel(richScene());
    const edited: Model = {
      ...model,
      title: 'Renamed',
      items: model.items.map((item) => {
        return item.id === 'sw' ? { ...item, name: 'Core switch' } : item;
      })
    };
    const saved = sceneFromModel(edited, context);
    expectValid(saved);
    expect(saved.title).toBe('Renamed');
    const sw = saved.objects.find((o) => {
      return o.id === 'sw';
    });
    expect(sw).toMatchObject({
      name: 'Core switch',
      element: 'network-switch',
      props: { ip: '10.0.0.2' },
      ports: [{ id: '14', kind: 'ethernet' }],
      links: [{ source: 'rmm', ref: 'Sw1' }]
    });
  });

  test('a connector whose end moves stops drawing its connection', () => {
    const { model, context } = sceneToModel(richScene());
    const view = model.views[0];
    const edited: Model = {
      ...model,
      views: [
        {
          ...view,
          connectors: view.connectors?.map((c) => {
            return {
              ...c,
              anchors: [
                c.anchors[0],
                { id: 'a3', ref: { tile: { x: 9, y: 9 } } }
              ]
            };
          })
        },
        model.views[1]
      ]
    };
    const saved = sceneFromModel(edited, context);
    expectValid(saved);
    const net = saved.views?.find((v) => {
      return v.id === 'net';
    });
    expect(net?.kind !== 'plan' && net?.connectors?.[0].connection).toBe(
      undefined
    );
    expect(saved.connections).toHaveLength(1);
  });

  test('a fresh diagram saves to a valid scene', () => {
    const context = freshSceneContext('New');
    const { model } = sceneToModel(context.opened);
    const saved = sceneFromModel(
      { ...model, views: [{ id: 'v1', name: 'View', items: [] }] },
      context
    );
    expectValid(saved);
    expect(saved.id).toBe(context.opened.id);
  });

  test('the update carries Reticulyne fields only', () => {
    const { model, context } = sceneToModel(richScene());
    const update = modelToSceneUpdate(model, context);
    expect(update.viewKinds).toEqual(['iso', 'schematic']);
    expect(update.objectFields).toEqual([
      'name',
      'description',
      'icon',
      'element',
      'props',
      'ports',
      'links'
    ]);
    // Layers are Reticulyne's now, so only connection is kept.
    expect(update.preserve).toEqual({ connector: ['connection'] });
    expect(update.set?.layers).toEqual([{ id: 'notes', name: 'Notes' }]);
  });

  test('layers are read into the model and written back', () => {
    const { model, context } = sceneToModel(richScene());
    expect(model.layers).toEqual([{ id: 'notes', name: 'Notes' }]);
    const net = model.views.find((v) => {
      return v.id === 'net';
    })!;
    expect(net.items[0].layerId).toBe('notes');
    expect(net.connectors?.[0].layerId).toBe('notes');
    expect(net.rectangles?.[0].layerId).toBe('notes');
    expect(net.textBoxes?.[0].layerId).toBe('redacted');
    expect(modelSchema.safeParse(model).success).toBe(true);

    const hidden = {
      ...model,
      layers: [{ id: 'notes', name: 'Notes', visible: false }],
      views: model.views.map((v) => {
        if (v.id !== 'net') return v;
        return {
          ...v,
          textBoxes: v.textBoxes?.map((t) => {
            const rest = { ...t };
            delete rest.layerId;
            return rest;
          })
        };
      })
    };
    const saved = sceneFromModel(hidden, context);
    expectValid(saved);
    expect(saved.layers).toEqual([
      { id: 'notes', name: 'Notes', visible: false }
    ]);
    const view = saved.views!.find((v) => {
      return v.id === 'net';
    });
    expect(
      view && view.kind !== 'plan' && view.textBoxes?.[0]
    ).not.toHaveProperty('layer');
  });
});

describe('legacyModelToScene', () => {
  test('the test fixture becomes a valid scene with one iso view per view', () => {
    const scene = legacyModelToScene(fixtureModel, 'fixture');
    expectValid(scene);
    expect(scene.id).toBe('fixture');
    expect(scene).not.toHaveProperty('version', '1.0.0');
    expect(
      scene.views?.map((v) => {
        return v.kind;
      })
    ).toEqual(
      fixtureModel.views.map(() => {
        return 'iso';
      })
    );
    expect(scene.objects).toHaveLength(fixtureModel.items.length);
  });

  test('opening a legacy model and saving it again changes nothing more', () => {
    const scene = legacyModelToScene(fixtureModel, 'fixture');
    const { model, context } = sceneToModel(scene);
    expect(sceneFromModel(model, context)).toEqual(scene);
  });

  test('remaps invalid ids deterministically and rewrites every reference', () => {
    const long = 'x'.repeat(80);
    const legacy: Model = {
      title: 'Ids',
      icons: [
        {
          id: 'aws-elemental-appliances-&-software',
          name: 'Appliance',
          url: 'https://example.com/a.svg'
        }
      ],
      colors: [{ id: 'my colour', value: '#abc' }],
      items: [
        { id: 'a b', name: 'A', icon: 'aws-elemental-appliances-&-software' },
        { id: 'a_b', name: 'Already valid' },
        { id: long, name: 'Long' },
        { id: 'a.b', name: 'Collides' }
      ],
      views: [
        {
          id: 'view one',
          name: 'One',
          items: [
            { id: 'a b', tile: { x: 0, y: 0 }, parentGroupId: 'g 1' },
            { id: long, tile: { x: 2, y: 0 } }
          ],
          groups: [{ id: 'g 1' }],
          connectors: [
            {
              id: 'c 1',
              color: 'my colour',
              anchors: [
                { id: 'p 1', ref: { item: 'a b' } },
                { id: 'p 2', ref: { anchor: 'p 1' } },
                { id: 'p 3', ref: { item: long } }
              ]
            }
          ]
        }
      ]
    };
    const scene = legacyModelToScene(legacy, 'ids');
    expectValid(scene);
    expect(
      scene.objects.map((o) => {
        return o.id;
      })
    ).toEqual(['a_b-2', 'a_b', 'x'.repeat(64), 'a_b-3']);
    expect(scene.objects[0].icon).toBe('aws-elemental-appliances-_-software');
    expect(scene.icons?.[0].id).toBe('aws-elemental-appliances-_-software');
    expect(scene.colors).toEqual([{ id: 'my_colour', value: '#aabbcc' }]);
    const [view] = scene.views ?? [];
    expect(view.id).toBe('view_one');
    if (view.kind === 'plan') throw new Error('expected a diagram view');
    expect(view.placements?.[0]).toEqual({
      object: 'a_b-2',
      tile: { x: 0, y: 0 },
      group: 'g_1'
    });
    expect(view.connectors?.[0]).toMatchObject({
      id: 'c_1',
      color: 'my_colour',
      anchors: [
        { id: 'p_1', ref: { object: 'a_b-2' } },
        { id: 'p_2', ref: { anchor: 'p_1' } },
        { id: 'p_3', ref: { object: 'x'.repeat(64) } }
      ]
    });
    // Deterministic: the same input maps to the same ids.
    expect(legacyModelToScene(legacy, 'ids')).toEqual(scene);
  });

  test('a colour that is not #rgb or #rrggbb is dropped with its references', () => {
    const legacy: Model = {
      title: 'Colours',
      icons: [],
      colors: [
        { id: 'ok', value: '#A1B2C3' },
        { id: 'bad', value: 'red' }
      ],
      items: [{ id: 'n', name: 'N' }],
      views: [
        {
          id: 'v',
          name: 'V',
          items: [{ id: 'n', tile: { x: 0, y: 0 } }],
          rectangles: [
            { id: 'r', color: 'bad', from: { x: 0, y: 0 }, to: { x: 1, y: 1 } }
          ],
          connectors: [
            {
              id: 'c',
              color: 'bad',
              anchors: [
                { id: 'a', ref: { item: 'n' } },
                { id: 'b', ref: { tile: { x: 3, y: 3 } } }
              ]
            }
          ]
        }
      ]
    };
    const scene = legacyModelToScene(legacy, 'colours');
    expectValid(scene);
    expect(scene.colors).toEqual([{ id: 'ok', value: '#A1B2C3' }]);
    const [view] = scene.views ?? [];
    if (view.kind === 'plan') throw new Error('expected a diagram view');
    expect(view.rectangles?.[0]).not.toHaveProperty('color');
    expect(view.connectors?.[0]).not.toHaveProperty('color');
  });

  test('a model item placed in no view is kept as an object', () => {
    const scene = legacyModelToScene(
      {
        title: 'Unplaced',
        icons: [],
        colors: [],
        items: [{ id: 'loose', name: 'Loose' }],
        views: [{ id: 'v', name: 'V', items: [] }]
      },
      'u'
    );
    expectValid(scene);
    expect(scene.objects).toEqual([{ id: 'loose', name: 'Loose' }]);
  });
});

describe('readScene', () => {
  test('accepts a scene', () => {
    const result = readScene(richScene());
    expect(result.ok).toBe(true);
  });

  test('refuses an invalid scene whole', () => {
    const scene = richScene();
    scene.objects[0].icon = 'missing';
    const result = readScene(scene);
    expect(result.ok).toBe(false);
  });

  test('converts a legacy model, keeping its view hints', () => {
    const result = readScene({
      ...fixtureModel,
      fitToView: true,
      view: fixtureModel.views[0].id
    });
    if (!result.ok) throw new Error('expected the model to be read');
    expectValid(result.scene);
    expect(result.hints).toEqual({
      fitToView: true,
      view: fixtureModel.views[0].id
    });
  });

  test('refuses something that is neither', () => {
    expect(readScene({ hello: 'world' }).ok).toBe(false);
  });
});

test('a file keeps only the icons its objects use and the uploaded ones', () => {
  const scene: Scene = {
    format: 'accurona-scene',
    version: 1,
    id: 's',
    objects: [{ id: 'a', name: 'A', icon: 'used' }],
    icons: [
      { id: 'used', name: 'Used', url: 'u.svg', collection: 'pack' },
      { id: 'unused', name: 'Unused', url: 'n.svg', collection: 'pack' },
      { id: 'mine', name: 'Mine', url: 'm.svg', collection: 'My icons' }
    ]
  };
  expect(
    leanIcons(scene).icons?.map((icon) => {
      return icon.id;
    })
  ).toEqual(['used', 'mine']);
  expect(
    leanIcons({ ...scene, objects: [], icons: [scene.icons![1]] })
  ).not.toHaveProperty('icons');
});
