import { validateScene, type Scene } from 'src/vendor/accurona-core';
import { ITEMS } from 'src/catalogue/items';
import {
  availableIcon,
  catalogueTemplate,
  freshSceneContext,
  objectIcon,
  objectName,
  sceneFromModel,
  objectTemplate,
  sceneToModel,
  twinOf
} from 'src/scene';

// A device on the floor plan and its node in a diagram are one
// scene object. Axonometra writes only the element; Reticulyne draws it
// with the element's catalogue twin and keeps the plan on save.

const expectValid = (scene: Scene) => {
  const result = validateScene(scene);
  expect(result.ok ? [] : result.errors).toEqual([]);
};

const building = (): Scene => {
  return {
    format: 'accurona-scene',
    version: 1,
    id: 'hq',
    objects: [
      { id: 'ap-1', element: 'wifi-ap' },
      { id: 'cam-1', element: 'cctv-dome', props: { ip: '10.0.0.9' } },
      { id: 'sofa', element: 'sofa' }
    ],
    views: [
      {
        id: 'plan',
        kind: 'plan',
        name: 'Building',
        floors: [{ id: 'l2', name: 'Level 2' }],
        placements: [
          { object: 'ap-1', floor: 'l2', x: 1000, y: 2000 },
          { object: 'cam-1', floor: 'l2', x: 3000, y: 4000 },
          { object: 'sofa', floor: 'l2', x: 5000, y: 6000 }
        ]
      },
      {
        id: 'net',
        kind: 'iso',
        name: 'Level 2 network',
        placements: [{ object: 'ap-1', tile: { x: 0, y: 0 } }]
      }
    ]
  };
};

describe('crossover', () => {
  test('an element finds its catalogue twin, its icon and its name', () => {
    expect(twinOf('wifi-ap')?.id).toBeDefined();
    expect(twinOf('sofa')).toBeUndefined();
    expect(twinOf(undefined)).toBeUndefined();
    expect(objectIcon({ element: 'wifi-ap' })).toBe('accurona-wifi-ap');
    // An object's own icon wins over its twin's.
    expect(objectIcon({ icon: 'mine', element: 'wifi-ap' })).toBe('mine');
    expect(objectIcon({})).toBeUndefined();
    expect(objectName({ element: 'wifi-ap' })).toBe(twinOf('wifi-ap')!.name);
    expect(objectName({ name: 'AP east', element: 'wifi-ap' })).toBe('AP east');
    expect(objectName({})).toBe('Untitled');
  });

  test('an icon is given only when the editor has it', () => {
    const ap = { element: 'wifi-ap' };
    expect(availableIcon(ap, [{ id: 'accurona-wifi-ap' }])).toBe(
      'accurona-wifi-ap'
    );
    expect(availableIcon(ap, [{ id: 'other' }])).toBeUndefined();
  });

  test('save: a device placed from the plan keeps its id, element, props and plan place', () => {
    const { model, context } = sceneToModel(building());
    // The editor's library, as the host passes it (accuronaIcons()).
    model.icons = [
      {
        id: 'accurona-cctv-dome',
        name: 'Dome camera',
        url: 'https://example.com/d.svg',
        isIsometric: true
      }
    ];
    // What placing cam-1 from the "On the floor plan" palette does.
    model.items.push({
      ...objectTemplate(
        building().objects.find((o) => {
          return o.id === 'cam-1';
        })!,
        model.icons
      ),
      id: 'cam-1'
    });
    model.views[0].items.push({ id: 'cam-1', tile: { x: 2, y: 0 } });

    const saved = sceneFromModel(model, context);
    expectValid(saved);
    expect(
      saved.objects.find((o) => {
        return o.id === 'cam-1';
      })
    ).toEqual({
      id: 'cam-1',
      element: 'cctv-dome',
      props: { ip: '10.0.0.9' },
      name: objectName({ element: 'cctv-dome' }),
      icon: 'accurona-cctv-dome'
    });
    const plan = saved.views!.find((v) => {
      return v.kind === 'plan';
    })!;
    expect(plan.placements).toEqual(building().views![0].placements);
    // Exactly one object per id: linked, not copied.
    expect(
      saved.objects.filter((o) => {
        return o.id === 'cam-1';
      })
    ).toHaveLength(1);
  });

  test('save: taking a plan device out of the diagram leaves it on the plan', () => {
    const { model, context } = sceneToModel(building());
    model.items = [];
    model.views[0].items = [];
    const saved = sceneFromModel(model, context);
    expectValid(saved);
    expect(
      saved.objects.map((o) => {
        return o.id;
      })
    ).toEqual(['ap-1', 'cam-1', 'sofa']);
  });

  test('save: a catalogue item keeps its ports, catalogue link and element, and reopens as it was', () => {
    const item = ITEMS.find((i) => {
      return i.id === 'poe-switch-8';
    })!;
    const context = freshSceneContext('Office');
    const { model } = sceneToModel(context.opened);
    model.icons = [
      {
        id: 'accurona-network-switch',
        name: 'Network switch',
        url: 'https://example.com/s.svg',
        isIsometric: true
      }
    ];
    model.items.push({ ...catalogueTemplate(item, model.icons), id: 'sw1' });
    model.views = [
      { id: 'v', name: 'Network', items: [{ id: 'sw1', tile: { x: 0, y: 0 } }] }
    ];

    const saved = sceneFromModel(model, context);
    expectValid(saved);
    const sw1 = saved.objects.find((o) => {
      return o.id === 'sw1';
    })!;
    expect(sw1).toMatchObject({
      name: 'PoE switch (8-port)',
      element: 'network-switch',
      icon: 'accurona-network-switch',
      links: [{ source: 'reticulyne', ref: 'poe-switch-8' }]
    });
    expect(sw1.ports).toHaveLength(11);
    expect(sw1.ports![8]).toMatchObject({
      id: 'uplink1',
      kind: 'ethernet-fibre'
    });

    // Opened again and saved with no edits: the same object.
    const reopened = sceneToModel(saved);
    const again = sceneFromModel(reopened.model, reopened.context);
    expect(
      again.objects.find((o) => {
        return o.id === 'sw1';
      })
    ).toEqual(sw1);
  });
});
