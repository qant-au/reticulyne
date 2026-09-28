/**
 * @jest-environment jsdom
 */
import { INITIAL_DATA } from 'src/config';
import type { Model } from 'src/types';
import { createDiagramStorage, StorageFullError } from '../diagramStorage';

// APP-01.
const bundled = [
  { id: 'server', name: 'Server', url: 'server.svg', collection: 'isoflow' }
];
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
    icons: [...bundled, uploaded],
    items: [{ id: 'a', name: 'A', icon: 'server' }],
    views: [{ id: 'v', name: 'V', items: [{ id: 'a', tile: { x: 0, y: 0 } }] }]
  };
};

beforeEach(() => {
  localStorage.clear();
});

test('round-trips a diagram, storing only its own icons', () => {
  const store = createDiagramStorage(localStorage, bundled);
  store.save('d1', model('Network'));

  const raw = JSON.parse(localStorage.getItem('reticulyne.diagram.d1')!);
  expect(raw.icons).toEqual([uploaded]);

  const back = store.load('d1')!;
  expect(back.title).toBe('Network');
  expect(back.icons).toEqual([...bundled, uploaded]);
  expect(back.items).toEqual(model('Network').items);
});

test('lists newest first and renames on save', () => {
  const store = createDiagramStorage(localStorage, bundled);
  store.save('d1', model('One'), 1000);
  store.save('d2', model('Two'), 2000);
  store.save('d1', model('One renamed'), 3000);
  expect(store.list()).toEqual([
    { id: 'd1', name: 'One renamed', updatedAt: 3000 },
    { id: 'd2', name: 'Two', updatedAt: 2000 }
  ]);
});

test('remove drops the diagram, its index entry and the current pointer', () => {
  const store = createDiagramStorage(localStorage, bundled);
  store.save('d1', model('One'));
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
    store.save('d1', model('One'));
  }).toThrow(StorageFullError);
});

test('a corrupt index reads as empty rather than throwing', () => {
  localStorage.setItem('reticulyne.diagrams', '{nope');
  expect(createDiagramStorage(localStorage, bundled).list()).toEqual([]);
});
