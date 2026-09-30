import { emptyScene, validateScene } from 'src/vendor/accurona-core';
import { ISO_DRAWINGS } from 'src/vendor/accurona-iso';
import { SCHEMATIC_DRAWINGS } from 'src/vendor/accurona-schematic';
import { iconSchema } from 'src/schemas/icons';
import {
  CATALOGUE,
  ITEM_SYMBOLS,
  SCHEMATIC_ICON_COLLECTION,
  accuronaElement,
  accuronaIcons,
  catalogueItemIcon,
  catalogueItemSymbol,
  expandPorts,
  itemToSceneObject,
  schematicIconUrl,
  schematicIcons,
  validateCatalogue,
  type Catalogue,
  type CatalogueItem
} from 'src/catalogue';

const withItems = (...items: CatalogueItem[]): Catalogue => {
  return { ...CATALOGUE, items };
};

const issuesOf = (catalogue: unknown) => {
  const result = validateCatalogue(catalogue);
  return result.ok ? [] : result.issues;
};

describe('the built-in catalogue', () => {
  it('passes every rule', () => {
    expect(issuesOf(CATALOGUE)).toEqual([]);
  });

  it('covers the twins the spec names first', () => {
    const twins = new Set(CATALOGUE.items.map(accuronaElement));
    for (const element of [
      'wifi-ap',
      'network-switch',
      'router',
      'firewall',
      'nas',
      'ip-phone',
      'cctv-dome',
      'cctv-bullet',
      'cctv-ptz',
      'nvr',
      'alarm-panel',
      'card-reader',
      'pir-sensor',
      'door-contact',
      'intercom',
      'fire-panel',
      'smoke-detector',
      'heat-detector',
      'manual-call-point'
    ]) {
      expect(twins).toContain(element);
    }
  });

  it('has the virtual items, none with a twin', () => {
    const virtual = CATALOGUE.items.filter((item) => {
      return item.virtual;
    });
    expect(
      virtual.map((item) => {
        return item.id;
      })
    ).toEqual(
      expect.arrayContaining(['internet', 'vpn-tunnel', 'cloud-service'])
    );
    for (const item of virtual) expect(accuronaElement(item)).toBeUndefined();
  });

  it('draws every item with a twin with that element’s isometric view', () => {
    const linked = CATALOGUE.items.filter((item) => {
      return accuronaElement(item) !== undefined;
    });
    expect(linked.length).toBeGreaterThan(19);
    for (const item of linked) {
      expect(catalogueItemIcon(item)).toBe(`accurona-${accuronaElement(item)}`);
    }
    // And the vendored drawings are exactly the ones referenced.
    expect(Object.keys(ISO_DRAWINGS).sort()).toEqual(
      [...new Set(linked.map(accuronaElement))].sort()
    );
  });
});

describe('accuronaIcons', () => {
  it('are valid isometric icons, one per vendored drawing', () => {
    const icons = accuronaIcons();
    expect(icons).toHaveLength(Object.keys(ISO_DRAWINGS).length);
    for (const icon of icons) {
      expect(iconSchema.safeParse(icon).success).toBe(true);
      expect(icon.isIsometric).toBe(true);
      expect(icon.url.startsWith('data:image/svg+xml,')).toBe(true);
    }
    const ap = icons.find((icon) => {
      return icon.id === 'accurona-wifi-ap';
    });
    expect(ap?.collection).toBe('Accurona');
  });

  it('an item’s own icon wins over its twin', () => {
    expect(
      catalogueItemIcon({
        icon: 'mine',
        links: [{ source: 'accurona', ref: 'wifi-ap' }]
      })
    ).toBe('mine');
    expect(
      catalogueItemIcon({
        links: [{ source: 'accurona', ref: 'no-such-element' }]
      })
    ).toBeUndefined();
  });
});

describe('schematic symbols', () => {
  const wellFormed = (svg: string) => {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    return (
      doc.documentElement.nodeName === 'svg' &&
      !doc.querySelector('parsererror') &&
      !/NaN|undefined|Infinity/.test(svg)
    );
  };

  it('every built-in item has one', () => {
    const missing = CATALOGUE.items.filter((item) => {
      return !catalogueItemSymbol(item);
    });
    expect(
      missing.map((item) => {
        return item.id;
      })
    ).toEqual([]);
  });

  it('an item with a twin uses the schematic generated from its element', () => {
    const twinned = CATALOGUE.items.filter((item) => {
      return accuronaElement(item);
    });
    expect(twinned.length).toBeGreaterThan(0);
    for (const item of twinned) {
      expect(catalogueItemSymbol(item)).toBe(
        SCHEMATIC_DRAWINGS[accuronaElement(item)!].svg
      );
    }
    // And the vendored drawings are exactly the ones referenced.
    expect(Object.keys(SCHEMATIC_DRAWINGS).sort()).toEqual(
      Object.keys(ISO_DRAWINGS).sort()
    );
  });

  it('are drawn by hand exactly for the items with no twin', () => {
    const untwinned = CATALOGUE.items.filter((item) => {
      return !accuronaElement(item);
    });
    expect(Object.keys(ITEM_SYMBOLS).sort()).toEqual(
      untwinned
        .map((item) => {
          return item.id;
        })
        .sort()
    );
  });

  it('are well-formed SVG', () => {
    for (const item of CATALOGUE.items) {
      expect([item.id, wellFormed(catalogueItemSymbol(item)!)]).toEqual([
        item.id,
        true
      ]);
    }
  });

  it('become valid flat icons, one per item', () => {
    const icons = schematicIcons();
    expect(icons).toHaveLength(CATALOGUE.items.length);
    for (const icon of icons) {
      expect(iconSchema.safeParse(icon).success).toBe(true);
      expect(icon.isIsometric).toBe(false);
      expect(icon.collection).toBe(SCHEMATIC_ICON_COLLECTION);
    }
    expect(
      icons.find((icon) => {
        return icon.id === 'schematic-internet';
      })?.name
    ).toBe('Internet');
  });

  it('a host item with neither a twin nor a symbol has none', () => {
    expect(catalogueItemSymbol({ id: 'custom-thing' })).toBeUndefined();
    expect(
      schematicIcons([
        { id: 'custom-thing', name: 'X', family: 'virtual', ports: [] }
      ])
    ).toEqual([]);
  });
});

describe('expandPorts', () => {
  it('expands a pattern and numbers the name', () => {
    const ports = expandPorts({
      ports: [{ id: 'eth{1..3}', name: 'Port {n}', medium: 'ethernet-copper' }]
    });
    expect(
      ports.map((p) => {
        return [p.id, p.name];
      })
    ).toEqual([
      ['eth1', 'Port 1'],
      ['eth2', 'Port 2'],
      ['eth3', 'Port 3']
    ]);
  });
});

describe('validateCatalogue rules', () => {
  const item = (
    ports: CatalogueItem['ports'],
    extra: Partial<CatalogueItem> = {}
  ): CatalogueItem => {
    return { id: 'thing', name: 'Thing', family: 'ethernet', ports, ...extra };
  };

  it('refuses an item with only power ports', () => {
    const issues = issuesOf(
      withItems(
        item([{ id: 'ac-in', medium: 'power-ac', capabilities: ['power-in'] }])
      )
    );
    expect(issues[0].message).toMatch(/not power/);
  });

  it('allows a virtual item with no ports', () => {
    expect(
      issuesOf(withItems(item([], { virtual: true, family: 'virtual' })))
    ).toEqual([]);
  });

  it.each([
    [
      'an unknown medium',
      { id: 'p', medium: 'carrier-pigeon' },
      /does not exist/
    ],
    [
      'a connector from another medium',
      { id: 'p', medium: 'rs-485', connector: 'rj11' },
      /Connector/
    ],
    [
      'a protocol that does not ride on the medium',
      { id: 'p', medium: 'rs-485', protocols: ['onvif'] },
      /does not ride/
    ],
    [
      'PoE off Ethernet',
      { id: 'p', medium: 'rs-485', capabilities: ['poe-pd'] },
      /poe-pd/
    ],
    [
      'a terminator on an eol medium',
      { id: 'p', medium: 'dry-contact', capabilities: ['terminator'] },
      /terminator/
    ],
    [
      'an eol on a both-ends medium',
      { id: 'p', medium: 'rs-485', capabilities: ['eol'] },
      /"eol"/
    ],
    [
      'a hub on a wired medium',
      { id: 'p', medium: 'ethernet-copper', role: 'hub' },
      /Role "hub"/
    ],
    [
      'a drop on a point-to-point medium',
      { id: 'p', medium: 'ethernet-copper', role: 'drop' },
      /Role "drop"/
    ],
    [
      'a loop-out off a loop',
      { id: 'p', medium: 'rs-485', role: 'loop-out' },
      /Role "loop-out"/
    ]
  ] as const)('refuses %s', (_label, port, message) => {
    const issues = issuesOf(
      withItems(item([port as CatalogueItem['ports'][number]]))
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].message).toMatch(message);
  });

  it('refuses port ids that collide after expansion', () => {
    const issues = issuesOf(
      withItems(
        item([
          { id: 'eth{1..4}', medium: 'ethernet-copper' },
          { id: 'eth3', medium: 'ethernet-copper' }
        ])
      )
    );
    expect(issues).toEqual([
      { path: 'items.thing.ports.eth3', message: 'Duplicate port id "eth3"' }
    ]);
  });

  it('refuses a protocol and a medium that disagree', () => {
    const issues = issuesOf({
      ...CATALOGUE,
      protocols: CATALOGUE.protocols.map((p) => {
        return p.id === 'bacnet-mstp' ? { ...p, media: ['rs-485', 'can'] } : p;
      })
    });
    expect(issues).toEqual([
      {
        path: 'protocols.bacnet-mstp',
        message: 'Medium "can" does not list this protocol'
      }
    ]);
  });

  it('reports a bad shape by path', () => {
    const issues = issuesOf({ ...CATALOGUE, items: [{ id: 'Not Kebab' }] });
    expect(
      issues.some((issue) => {
        return issue.path === 'items.0.id';
      })
    ).toBe(true);
  });
});

describe('itemToSceneObject', () => {
  const find = (id: string) => {
    return CATALOGUE.items.find((item) => {
      return item.id === id;
    })!;
  };

  it('copies ports, the twin and the item link onto the object', () => {
    const object = itemToSceneObject(find('poe-switch-8'), 'sw1');
    expect(object.element).toBe('network-switch');
    expect(object.icon).toBe('accurona-network-switch');
    expect(object.links).toEqual([
      { source: 'reticulyne', ref: 'poe-switch-8' }
    ]);
    expect(object.ports?.[0]).toEqual({
      id: 'eth1',
      name: 'PoE port 1',
      kind: 'ethernet-copper',
      props: { connector: 'rj45', capabilities: 'poe-pse' }
    });
    expect(object.ports).toHaveLength(11);
  });

  it('writes lists as comma-separated props and keeps port props', () => {
    const plotter = itemToSceneObject(find('chartplotter'), 'mfd');
    expect(plotter.element).toBeUndefined();
    expect(
      plotter.ports?.find((p) => {
        return p.id === 'n2k';
      })?.props
    ).toEqual({
      connector: 'micro-c',
      gender: 'male',
      protocols: 'nmea-2000',
      len: 1
    });
    const hdmi = itemToSceneObject(find('wall-display'), 'tv').ports?.[0];
    expect(hdmi?.props?.protocols).toBe('hdmi,cec');
  });

  it('gives a virtual item no element', () => {
    const net = itemToSceneObject(find('internet'), 'net');
    expect(net.element).toBeUndefined();
    expect(net.icon).toBeUndefined();
  });

  it('every item makes an object the scene format accepts', () => {
    const scene = emptyScene('s1', 'Catalogue');
    scene.icons = accuronaIcons();
    scene.objects = CATALOGUE.items.map((item, i) => {
      return itemToSceneObject(item, `o${i}`);
    });
    const result = validateScene(scene);
    expect(result.ok ? [] : result).toEqual([]);
  });
});

describe('schematicIconUrl (lw-050)', () => {
  it('swaps an Accurona element drawing for its 2D schematic', () => {
    const [element] = Object.keys(SCHEMATIC_DRAWINGS);
    const icon = accuronaIcons().find((i) => {
      return i.id === `accurona-${element}`;
    });
    expect(icon).toBeDefined();
    expect(schematicIconUrl(icon!)).toBe(
      `data:image/svg+xml,${encodeURIComponent(SCHEMATIC_DRAWINGS[element].svg)}`
    );
  });

  it('draws any other icon as it is', () => {
    const icon = { id: 'isoflow-server', url: 'https://example.com/s.svg' };
    expect(schematicIconUrl(icon)).toBe(icon.url);
    const unknown = { id: 'accurona-no-such-element', url: 'x.svg' };
    expect(schematicIconUrl(unknown)).toBe('x.svg');
  });
});
