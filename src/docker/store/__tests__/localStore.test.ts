/**
 * @jest-environment jsdom
 */
import { IDBFactory } from 'fake-indexeddb';
import { emptyScene } from 'src/core';
import type { IconPack } from 'src/icons/pack';
import { createDiagramStorage, StorageFullError } from '../../diagramStorage';
import { transactionDone } from '../idb';
import { MIGRATED_KEY, openLocalStore } from '../localStore';

jest.mock('../idb', () => {
  const actual = jest.requireActual('../idb');
  return { ...actual, transactionDone: jest.fn(actual.transactionDone) };
});

const pack: IconPack = {
  id: 'network',
  name: 'Network',
  icons: [
    {
      id: 'switch',
      name: 'Switch',
      url: 'data:image/svg+xml,iso',
      isIsometric: true,
      flatUrl: 'data:image/svg+xml,flat'
    }
  ]
};

let factory: IDBFactory;

beforeEach(() => {
  factory = new IDBFactory();
  localStorage.clear();
});

describe('diagrams', () => {
  test('a saved diagram is there when the store is opened again', async () => {
    const first = await openLocalStore({ factory, legacy: null });
    const diagrams = createDiagramStorage(first.storage, []);
    diagrams.save('d1', { ...emptyScene('d1'), title: 'Office' });
    await first.storage.flush();

    const again = await openLocalStore({ factory, legacy: null });
    const reread = createDiagramStorage(again.storage, []);
    expect(
      reread.list().map((entry) => {
        return entry.name;
      })
    ).toEqual(['Office']);
    expect(reread.load('d1')?.title).toBe('Office');
  });

  test('a removed diagram stays removed', async () => {
    const first = await openLocalStore({ factory, legacy: null });
    const diagrams = createDiagramStorage(first.storage, []);
    diagrams.save('d1', emptyScene('d1'));
    diagrams.remove('d1');
    await first.storage.flush();

    const again = await openLocalStore({ factory, legacy: null });
    expect(createDiagramStorage(again.storage, []).list()).toEqual([]);
  });

  test('a failed write is reported by flush, once', async () => {
    const { storage } = await openLocalStore({ factory, legacy: null });
    // The next write's transaction fails as a full disk would.
    jest
      .mocked(transactionDone)
      .mockRejectedValueOnce(new DOMException('full', 'QuotaExceededError'));
    storage.setItem('reticulyne.x', 'y');
    await expect(storage.flush()).rejects.toBeInstanceOf(StorageFullError);
    await expect(storage.flush()).resolves.toBeUndefined();
  });
});

describe('moving off localStorage', () => {
  test('copies an older build’s diagrams the first time, and leaves them', async () => {
    const old = createDiagramStorage(localStorage, []);
    old.save('d1', { ...emptyScene('d1'), title: 'Kept' });
    old.setCurrent('d1');
    localStorage.setItem('unrelated', 'x');

    const { storage } = await openLocalStore({ factory, legacy: localStorage });
    const diagrams = createDiagramStorage(storage, []);
    expect(diagrams.load('d1')?.title).toBe('Kept');
    expect(diagrams.getCurrent()).toBe('d1');
    expect(storage.getItem('unrelated')).toBeNull();
    expect(storage.getItem(MIGRATED_KEY)).not.toBeNull();
    // The originals stay, for an older build to find.
    expect(localStorage.getItem('reticulyne.diagram.d1')).not.toBeNull();
  });

  test('copies only once: a diagram deleted since is not brought back', async () => {
    createDiagramStorage(localStorage, []).save('d1', emptyScene('d1'));

    const first = await openLocalStore({ factory, legacy: localStorage });
    createDiagramStorage(first.storage, []).remove('d1');
    await first.storage.flush();

    const again = await openLocalStore({ factory, legacy: localStorage });
    expect(createDiagramStorage(again.storage, []).list()).toEqual([]);
  });
});

describe('icon packs', () => {
  test('an installed pack is listed, and still there next time', async () => {
    const first = await openLocalStore({ factory, legacy: null });
    expect(first.packs.list()).toEqual([]);
    expect((await first.packs.install(pack)).ok).toBe(true);
    expect(first.packs.list()).toEqual([pack]);

    const again = await openLocalStore({ factory, legacy: null });
    expect(again.packs.list()).toEqual([pack]);
  });

  test('installing the same id again replaces the pack', async () => {
    const { packs } = await openLocalStore({ factory, legacy: null });
    await packs.install(pack);
    await packs.install({ ...pack, version: '2' });
    expect(packs.list()).toEqual([{ ...pack, version: '2' }]);
  });

  test('an invalid pack is refused and not stored', async () => {
    const { packs } = await openLocalStore({ factory, legacy: null });
    const result = await packs.install({ id: 'x', icons: [] });
    expect(result.ok).toBe(false);
    expect(packs.list()).toEqual([]);
  });

  test('a removed pack is gone next time', async () => {
    const first = await openLocalStore({ factory, legacy: null });
    await first.packs.install(pack);
    await first.packs.remove('network');
    expect(first.packs.list()).toEqual([]);
    const again = await openLocalStore({ factory, legacy: null });
    expect(again.packs.list()).toEqual([]);
  });
});
