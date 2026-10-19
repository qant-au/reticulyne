/**
 * @jest-environment jsdom
 */
import { INITIAL_DATA } from 'src/config';
import type { Model } from 'src/types';
import { legacyModelToScene } from 'src/scene';
import type { Scene } from 'src/core';
import { createDiagramStorage, StorageFullError } from '../diagramStorage';

// APP-01.
const bundled = [
  { id: 'server', name: 'Server', url: 'server.svg', collection: 'isoflow' },
  { id: 'a&b', name: 'A and B', url: 'ab.svg', collection: 'aws' }
];
const extra = bundled[1];
const uploaded = {
  id: 'mine',
  name: 'Mine',
  url: 'data:image/png;base64,AA',
  collection: 'My icons'
};
const model = (title: string): Model => {
  return {
    ...INITIAL_DATA,
    title,
    icons: [...bundled, uploaded, extra],
    items: [{ id: 'a', name: 'A', icon: 'server' }],
    views: [{ id: 'v', name: 'V', items: [{ id: 'a', tile: { x: 0, y: 0 } }] }]
  };
};
const scene = (title: string): Scene => {
  return legacyModelToScene(model(title), 'd');
};

beforeEach(() => {
  localStorage.clear();
});

test('stores a scene with only its own icons and the bundled ones it uses', () => {
  const store = createDiagramStorage(localStorage, bundled);
  store.save('d1', scene('Network'));

  const raw = JSON.parse(localStorage.getItem('reticulyne.diagram.d1')!);
  expect(raw.format).toBe('reticulyne-scene');
  expect(raw.objects).toEqual([{ id: 'a', name: 'A', icon: 'server' }]);
  expect(raw.icons).toEqual([bundled[0], uploaded]);

  const back = store.load('d1')!;
  expect(back.title).toBe('Network');
  expect(back.icons).toEqual([
    { ...bundled[1], id: 'a_b' },
    bundled[0],
    uploaded
  ]);
  expect(back.objects).toEqual(raw.objects);
});

test('a stored icon saved without a flat drawing takes the bundled one', () => {
  const withFlat = [{ ...bundled[0], flatUrl: 'server-flat.svg' }, bundled[1]];
  createDiagramStorage(localStorage, bundled).save('d1', scene('Old'));

  const back = createDiagramStorage(localStorage, withFlat).load('d1')!;
  const server = back.icons!.find((icon) => {
    return icon.id === 'server';
  });
  expect(server?.flatUrl).toBe('server-flat.svg');
});

test('a stored copy of a bundled icon under its older id is not doubled', () => {
  const ap = {
    id: 'reticulyne-wifi-ap',
    name: 'Wi-Fi AP',
    url: 'ap.svg',
    flatUrl: 'ap-flat.svg'
  };
  localStorage.setItem(
    'reticulyne.diagram.old',
    JSON.stringify({
      format: 'reticulyne-scene',
      version: 2,
      id: 'old',
      objects: [{ id: 'a', icon: 'accurona-wifi-ap' }],
      icons: [{ ...ap, id: 'accurona-wifi-ap', flatUrl: undefined }]
    })
  );
  const back = createDiagramStorage(localStorage, [...bundled, ap]).load(
    'old'
  )!;
  const aps = back.icons!.filter((icon) => {
    return icon.id === 'reticulyne-wifi-ap';
  });
  expect(aps).toHaveLength(1);
  expect(aps[0].flatUrl).toBe('ap-flat.svg');
  expect(back.objects[0].icon).toBe('reticulyne-wifi-ap');
});

test('reads a diagram an older build stored as a Reticulyne model', () => {
  const legacy = model('Old');
  localStorage.setItem(
    'reticulyne.diagram.old',
    JSON.stringify({ ...legacy, icons: [uploaded] })
  );
  const back = createDiagramStorage(localStorage, bundled).load('old')!;
  expect(back.format).toBe('reticulyne-scene');
  expect(back.id).toBe('old');
  expect(back.objects).toEqual([{ id: 'a', name: 'A', icon: 'server' }]);
  expect(
    back.icons?.map((icon) => {
      return icon.id;
    })
  ).toEqual(['server', 'a_b', 'mine']);
});

test('withBundledIcons puts the bundled icons back and changes nothing else', () => {
  const store = createDiagramStorage(localStorage, bundled);
  const own = scene('Mine');
  const back = store.withBundledIcons({ ...own, icons: [uploaded] });
  expect(back.objects).toBe(own.objects);
  expect(
    back.icons?.map((icon) => {
      return icon.id;
    })
  ).toEqual(['server', 'a_b', 'mine']);
  // A legacy model is left a model, not converted.
  const legacy = store.withBundledIcons({ ...model('Old'), icons: [uploaded] });
  expect('format' in legacy).toBe(false);
  expect(
    legacy.icons.map((icon) => {
      return icon.id;
    })
  ).toEqual(['server', 'a&b', 'mine']);
});

test('a scene naming a bundled icon it does not carry opens; an unknown one does not', () => {
  const store = createDiagramStorage(localStorage, bundled);
  const base = scene('Refs');
  const naming = (icon: string): Scene => {
    return {
      ...base,
      icons: [],
      objects: [{ id: 'a', name: 'A', icon }]
    };
  };
  expect(store.open(naming('server'))).not.toBeNull();
  expect(store.open(naming('no-such-icon'))).toBeNull();
});

test('an invalid stored diagram reads as null', () => {
  localStorage.setItem(
    'reticulyne.diagram.bad',
    JSON.stringify({ format: 'reticulyne-scene', version: 1, id: 'bad' })
  );
  expect(createDiagramStorage(localStorage, bundled).load('bad')).toBeNull();
});

test('lists newest first and renames on save', () => {
  const store = createDiagramStorage(localStorage, bundled);
  store.save('d1', scene('One'), 1000);
  store.save('d2', scene('Two'), 2000);
  store.save('d1', scene('One renamed'), 3000);
  expect(store.list()).toEqual([
    { id: 'd1', name: 'One renamed', updatedAt: 3000 },
    { id: 'd2', name: 'Two', updatedAt: 2000 }
  ]);
});

test('remove drops the diagram, its index entry and the current pointer', () => {
  const store = createDiagramStorage(localStorage, bundled);
  store.save('d1', scene('One'));
  store.setCurrent('d1');
  store.remove('d1');
  expect(store.list()).toEqual([]);
  expect(store.load('d1')).toBeNull();
  expect(store.getCurrent()).toBeNull();
});

test('a full quota becomes StorageFullError', () => {
  const full = {
    ...localStorage,
    getItem: (k: string) => {
      return localStorage.getItem(k);
    },
    setItem: () => {
      throw new DOMException('full', 'QuotaExceededError');
    }
  } as unknown as Storage;
  const store = createDiagramStorage(full, bundled);
  expect(() => {
    store.save('d1', scene('One'));
  }).toThrow(StorageFullError);
});

test('a corrupt index reads as empty rather than throwing', () => {
  localStorage.setItem('reticulyne.diagrams', '{nope');
  expect(createDiagramStorage(localStorage, bundled).list()).toEqual([]);
});
