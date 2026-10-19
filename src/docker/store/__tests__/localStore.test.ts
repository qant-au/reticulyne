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

  // Code review 2026-10-19: a failed save left the diagram and its index
  // entry in the cache, so it looked saved for the rest of the session.
  test('a failed save is rolled back: the diagram is neither listed nor opened', async () => {
    const { storage } = await openLocalStore({ factory, legacy: null });
    const diagrams = createDiagramStorage(storage, []);
    jest
      .mocked(transactionDone)
      .mockRejectedValueOnce(new DOMException('full', 'QuotaExceededError'));
    diagrams.save('d1', { ...emptyScene('d1'), title: 'Lost' });
    await expect(storage.flush()).rejects.toBeInstanceOf(StorageFullError);
    expect(diagrams.list()).toEqual([]);
    expect(diagrams.load('d1')).toBeNull();
  });

  test('a diagram and its index entry are written in one transaction', async () => {
    const { storage } = await openLocalStore({ factory, legacy: null });
    const calls = jest.mocked(transactionDone).mock.calls.length;
    createDiagramStorage(storage, []).save('d1', emptyScene('d1'));
    await storage.flush();
    expect(jest.mocked(transactionDone).mock.calls.length - calls).toBe(1);
  });

  // Code review 2026-10-19: one failure slot for the whole store reported an
  // earlier, unrelated failed write against the next save.
  test('a write that failed earlier is not reported against a later save', async () => {
    const { storage } = await openLocalStore({ factory, legacy: null });
    jest
      .mocked(transactionDone)
      .mockRejectedValueOnce(new DOMException('full', 'QuotaExceededError'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {
      return undefined;
    });
    storage.setItem('reticulyne.current', 'x');
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    storage.setItem('reticulyne.diagram.d1', '{}');
    await expect(storage.flush()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  // Code review 2026-10-19: each tab cached the index at start-up, so one
  // tab's save dropped the diagram another tab had saved since.
  test('a diagram saved in another tab survives this tab’s next save', async () => {
    const original = globalThis.BroadcastChannel;
    // jsdom has none; Node's is the same API, across instances in-process.
    // Each one made is closed after, or it holds the test process open.
    const { BroadcastChannel: NodeChannel } = jest.requireActual<
      typeof import('node:worker_threads')
    >('node:worker_threads');
    const made: { close(): void }[] = [];
    class Tracked extends NodeChannel {
      constructor(name: string) {
        super(name);
        made.push(this);
      }
    }
    globalThis.BroadcastChannel = Tracked as unknown as typeof BroadcastChannel;
    try {
      const tabA = await openLocalStore({ factory, legacy: null });
      const tabB = await openLocalStore({ factory, legacy: null });
      const a = createDiagramStorage(tabA.storage, []);
      const b = createDiagramStorage(tabB.storage, []);

      b.save('rack', { ...emptyScene('rack'), title: 'Rack' });
      await tabB.storage.flush();
      // The other tab hears of the save.
      for (let i = 0; i < 50 && a.list().length === 0; i += 1) {
        await new Promise((resolve) => {
          setTimeout(resolve, 10);
        });
      }

      expect(a.list()).toHaveLength(1);

      a.save('desk', { ...emptyScene('desk'), title: 'Desk' });
      await tabA.storage.flush();

      const reopened = await openLocalStore({ factory, legacy: null });
      expect(
        createDiagramStorage(reopened.storage, [])
          .list()
          .map((entry) => {
            return entry.name;
          })
          .sort()
      ).toEqual(['Desk', 'Rack']);
    } finally {
      for (const channel of made) channel.close();
      globalThis.BroadcastChannel = original;
    }
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

// Code review 2026-10-19: diagrams saved to localStorage in a later session
// that fell back to it (IndexedDB unavailable that time) were never copied.
test('a diagram saved to localStorage after the first copy is copied next time', async () => {
  createDiagramStorage(localStorage, []).save(
    'old',
    { ...emptyScene('old'), title: 'Old' },
    1
  );
  const first = await openLocalStore({ factory, legacy: localStorage });
  createDiagramStorage(first.storage, []).remove('old');
  await first.storage.flush();

  // A session that fell back to localStorage saves a new diagram.
  createDiagramStorage(localStorage, []).save(
    'floor-2',
    { ...emptyScene('floor-2'), title: 'Floor 2' },
    Date.now() + 1000
  );

  const again = await openLocalStore({ factory, legacy: localStorage });
  const diagrams = createDiagramStorage(again.storage, []);
  // The new one is copied; the one deleted here does not come back.
  expect(
    diagrams.list().map((entry) => {
      return entry.name;
    })
  ).toEqual(['Floor 2']);
  expect(diagrams.load('floor-2')?.title).toBe('Floor 2');
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
