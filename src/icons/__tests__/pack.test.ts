import { emptyScene, serializeScene, validateScene } from 'src/core';
import { sceneFromModel, sceneToModel } from 'src/scene';
import { iconSchema } from 'src/schemas/icons';
import {
  fillFlatUrls,
  flattenPacks,
  packIcons,
  validateIconPack,
  type IconPack
} from '../pack';

const iso = 'data:image/svg+xml,iso';
const flat = 'data:image/svg+xml,flat';

const pack: IconPack = {
  id: 'network',
  name: 'Network',
  version: '1.0.0',
  icons: [
    {
      id: 'switch',
      name: 'Switch',
      url: iso,
      isIsometric: true,
      flatUrl: flat
    },
    { id: 'logo', name: 'Logo', url: flat, collection: 'Brands' }
  ]
};

describe('validateIconPack', () => {
  test('accepts a pack whose icons carry both drawings', () => {
    const result = validateIconPack(pack);
    expect(result.ok).toBe(true);
  });

  test('refuses an icon whose flat drawing is not an image url', () => {
    const result = validateIconPack({
      ...pack,
      icons: [{ id: 'x', name: 'X', url: iso, flatUrl: 'javascript:alert(1)' }]
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/icons\.0\.flatUrl/);
  });

  test('refuses unknown fields and a missing name', () => {
    expect(validateIconPack({ ...pack, extra: true }).ok).toBe(false);
    const { name: _name, ...nameless } = pack;
    expect(validateIconPack(nameless).ok).toBe(false);
  });

  test('refuses an icon id used twice', () => {
    const result = validateIconPack({
      ...pack,
      icons: [pack.icons[0], { ...pack.icons[1], id: 'switch' }]
    });
    expect(result).toEqual({
      ok: false,
      errors: ['Icon id "switch" appears more than once']
    });
  });
});

describe('packIcons and flattenPacks', () => {
  test('file an icon with no collection under the pack id', () => {
    expect(
      packIcons(pack).map((icon) => {
        return icon.collection;
      })
    ).toEqual(['network', 'Brands']);
  });

  test('keep the first icon of an id across packs', () => {
    const other: IconPack = {
      id: 'other',
      name: 'Other',
      icons: [
        { id: 'switch', name: 'Other switch', url: iso },
        { id: 'router', name: 'Router', url: iso }
      ]
    };
    const icons = flattenPacks([pack, other]);
    expect(
      icons.map((icon) => {
        return [icon.id, icon.name];
      })
    ).toEqual([
      ['switch', 'Switch'],
      ['logo', 'Logo'],
      ['router', 'Router']
    ]);
  });
});

describe('fillFlatUrls', () => {
  test('gives an icon with no flat drawing the library one of its id', () => {
    const filled = fillFlatUrls(
      [
        { id: 'switch', name: 'Switch', url: iso },
        { id: 'mine', name: 'Mine', url: iso }
      ],
      pack.icons
    );
    expect(filled[0].flatUrl).toBe(flat);
    expect(filled[1].flatUrl).toBeUndefined();
  });

  test('keeps a flat drawing the icon already has', () => {
    const own = { id: 'switch', name: 'Switch', url: iso, flatUrl: 'x.svg' };
    expect(fillFlatUrls([own], pack.icons)[0]).toBe(own);
  });
});

describe('the flat drawing in the file format', () => {
  test('is valid on an icon in the model and in a scene', () => {
    expect(iconSchema.safeParse(pack.icons[0]).success).toBe(true);
    const scene = {
      ...emptyScene('s'),
      objects: [{ id: 'a', icon: 'switch' }],
      icons: [pack.icons[0]]
    };
    expect(validateScene(scene).ok).toBe(true);
  });

  test('survives a save and an open', () => {
    const scene = {
      ...emptyScene('s'),
      objects: [{ id: 'a', icon: 'switch' }],
      icons: [pack.icons[0]]
    };
    const result = validateScene(JSON.parse(serializeScene(scene)));
    if (!result.ok) throw new Error(result.errors.join('\n'));
    const { model, context } = sceneToModel(result.scene);
    expect(model.icons[0].flatUrl).toBe(flat);
    expect(sceneFromModel(model, context).icons?.[0].flatUrl).toBe(flat);
  });
});
