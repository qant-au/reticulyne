import { sceneSchema, type Scene } from 'src/core';
import { sceneFromModel, sceneToModel } from '../convert';

const scene = (iconOverride?: unknown): Scene => {
  return {
    format: 'reticulyne-scene',
    version: 2,
    id: 's',
    objects: [
      {
        id: 'sw',
        name: 'Switch',
        icon: 'reticulyne-network-switch',
        ...(iconOverride ? { iconOverride } : {})
      }
    ],
    views: [
      {
        id: 'v',
        name: 'V',
        kind: 'iso',
        placements: [{ object: 'sw', tile: { x: 0, y: 0 } }]
      }
    ],
    icons: [
      {
        id: 'reticulyne-network-switch',
        name: 'Network Switch',
        url: 'data:image/svg+xml,base',
        isIsometric: true
      }
    ]
  } as Scene;
};

describe('an object icon override in the scene format', () => {
  it('takes an isometric image, a flat one, or both', () => {
    for (const o of [
      { url: 'data:image/png;base64,AA' },
      { flatUrl: 'https://example.com/flat.svg' },
      { url: 'icons/iso.svg', flatUrl: 'icons/flat.svg' }
    ]) {
      expect(sceneSchema.safeParse(scene(o)).success).toBe(true);
    }
  });

  it('refuses an empty override, an unsafe url and an unknown key', () => {
    for (const o of [
      {},
      { url: 'javascript:alert(1)' },
      { flatUrl: 'data:text/html,<b>' },
      { url: 'icons/a.svg', colour: 'red' }
    ]) {
      expect(sceneSchema.safeParse(scene(o)).success).toBe(false);
    }
  });

  it('survives opening and saving, and leaves the icon alone', () => {
    const opened = scene({ flatUrl: 'data:image/png;base64,AA' });
    const { model, context } = sceneToModel(opened);
    expect(model.items[0].iconOverride).toEqual({
      flatUrl: 'data:image/png;base64,AA'
    });
    const saved = sceneFromModel(model, context);
    expect(saved.objects[0].iconOverride).toEqual({
      flatUrl: 'data:image/png;base64,AA'
    });
    expect(saved.icons).toEqual(opened.icons);
  });

  it('is gone from the saved scene once removed', () => {
    const { model, context } = sceneToModel(
      scene({ url: 'data:image/png;base64,AA' })
    );
    const removed = {
      ...model,
      items: model.items.map((i) => {
        return { ...i, iconOverride: undefined };
      })
    };
    const saved = sceneFromModel(removed, context);
    expect(saved.objects[0]).not.toHaveProperty('iconOverride');
    expect(saved.objects[0].icon).toBe('reticulyne-network-switch');
  });
});
