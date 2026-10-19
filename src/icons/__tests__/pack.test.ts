import { emptyScene, serializeScene, validateScene } from 'src/core';
import { sceneFromModel, sceneToModel } from 'src/scene';
import { iconSchema } from 'src/schemas/icons';
import { filterIconsByCollection } from 'src/utils/common';
import { BUILTIN_PACK } from '../builtin';
import {
  fillFlatUrls,
  flattenPacks,
  packCatalogueItems,
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

describe('the built-in pack in iconCollections', () => {
  // Its collection is 'Reticulyne' and its id 'reticulyne': the filter
  // ignores case, so the pack is allowed or denied by its id as documented.
  test('is denied and allowed by its id', () => {
    const icons = flattenPacks([BUILTIN_PACK]);
    expect(filterIconsByCollection(icons, { deny: ['reticulyne'] })).toEqual(
      []
    );
    expect(
      filterIconsByCollection(icons, { allow: ['reticulyne'] })
    ).toHaveLength(icons.length);
  });
});

describe('a pack icon with connection detail', () => {
  const withPorts: IconPack = {
    id: 'marine-extra',
    name: 'Marine Extra',
    icons: [
      {
        id: 'sat-hotspot',
        name: 'Sat Hotspot',
        url: iso,
        isIsometric: true,
        flatUrl: flat,
        family: 'marine-vehicle',
        description: 'A satellite hotspot',
        ports: [
          { id: 'sat', medium: 'satellite', role: 'client' },
          { id: 'wifi', medium: 'wi-fi', role: 'hub' },
          { id: 'usb', medium: 'usb', connector: 'usb-c' }
        ]
      },
      { id: 'logo', name: 'Logo', url: flat }
    ]
  };

  it('validates and becomes a catalogue item drawing with its icon', () => {
    expect(validateIconPack(withPorts).ok).toBe(true);
    const items = packCatalogueItems(withPorts);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'sat-hotspot',
      name: 'Sat Hotspot',
      family: 'marine-vehicle',
      icon: 'sat-hotspot',
      description: 'A satellite hotspot'
    });
    expect(
      items[0].ports.map((port) => {
        return port.id;
      })
    ).toEqual(['sat', 'wifi', 'usb']);
  });

  it('keeps the connection detail out of the icon a diagram stores', () => {
    const [icon] = packIcons(withPorts);
    expect(icon).not.toHaveProperty('ports');
    expect(icon).not.toHaveProperty('family');
    expect(iconSchema.safeParse(icon).success).toBe(true);
  });

  it('refuses ports on a medium the catalogue does not have', () => {
    const bad = structuredClone(withPorts);
    bad.icons[0].ports = [{ id: 'x', medium: 'carrier-pigeon' }];
    const result = validateIconPack(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(
        /icons\.sat-hotspot.*carrier-pigeon/
      );
    }
  });

  it('needs a family and a kebab-case id for an icon with ports', () => {
    const bad = structuredClone(withPorts);
    delete bad.icons[0].family;
    bad.icons[0].id = 'Sat_Hotspot';
    const result = validateIconPack(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        expect.stringMatching(/kebab-case id/),
        expect.stringMatching(/needs a family/)
      ]);
    }
  });
});
