import {
  validateIconPack,
  type IconPack,
  type IconPackResult
} from 'src/icons/pack';
import { isQuotaError, StorageFullError } from '../diagramStorage';
import { openDatabase, readEntries, transactionDone } from './idb';

// The Docker app's local store, in the browser's IndexedDB: the saved
// diagrams and the icon packs installed in this browser. IndexedDB has room
// for far more than localStorage's ~5 MB, which a few diagrams with uploaded
// icons, or one installed pack, would fill.
//
// Diagrams keep the key scheme diagramStorage.ts defines, in a `kv` store,
// behind a Storage-shaped cache: everything is read into memory when the
// app starts, so reads stay synchronous, and writes go through to
// IndexedDB.
// - Writes made in the same turn (a diagram and the index that lists it)
//   are one transaction, so they reach the disk together or not at all. A
//   batch that fails is rolled back in the cache too, so the editor never
//   lists or opens what is not on disk.
// - `flush()` waits for the writes so far and rejects if one of them failed,
//   which is how a save learns it did not reach the disk.
// - Other tabs are told of each committed batch (BroadcastChannel) and
//   update their cache, so one tab's save is not undone by another's stale
//   copy of the index.
//
// The first time it opens, it copies the diagrams an older build kept in
// localStorage, and leaves them there for an older build to find. Later, it
// copies again any diagram saved to localStorage after that, in a session
// where IndexedDB could not be used.

export const DB_NAME = 'reticulyne';
const DB_VERSION = 1;
const KV = 'kv';
const PACKS = 'packs';
const KEY_PREFIX = 'reticulyne.';
const INDEX_KEY = 'reticulyne.diagrams';
const diagramKey = (id: string) => {
  return `reticulyne.diagram.${id}`;
};
export const MIGRATED_KEY = 'reticulyne.migrated-from-local-storage';
export const CHANNEL = 'reticulyne-local-store';

export interface PersistentStorage extends Storage {
  /** Waits for every write so far; rejects if one of them failed. */
  flush(): Promise<void>;
}

export interface PackStore {
  /** The installed packs, in install order. */
  list(): IconPack[];
  /** Validates and installs a pack, replacing one with the same id. */
  install(value: unknown): Promise<IconPackResult>;
  remove(id: string): Promise<void>;
}

export interface LocalStore {
  storage: PersistentStorage;
  packs: PackStore;
}

type Change = [key: string, value: string | null];

interface Batch {
  changes: Map<string, string | null>;
  // What the cache held for each key before this batch, for a rollback.
  before: Map<string, string | null>;
}

const createStorage = (
  db: IDBDatabase,
  entries: Map<string, string>
): PersistentStorage => {
  const channel =
    typeof BroadcastChannel === 'undefined'
      ? null
      : new BroadcastChannel(CHANNEL);
  channel?.addEventListener('message', (event: MessageEvent<Change[]>) => {
    for (const [key, value] of event.data) {
      if (value === null) entries.delete(key);
      else entries.set(key, value);
    }
  });

  let queued: Batch | null = null;
  // Each committing batch's outcome: null, or the error it failed with.
  const committing = new Set<Promise<unknown>>();

  const set = (key: string, value: string | null) => {
    if (value === null) entries.delete(key);
    else entries.set(key, value);
  };

  const commit = (batch: Batch) => {
    const tx = db.transaction(KV, 'readwrite');
    const store = tx.objectStore(KV);
    for (const [key, value] of batch.changes) {
      if (value === null) store.delete(key);
      else store.put(value, key);
    }
    const outcome = transactionDone(tx).then(
      () => {
        channel?.postMessage([...batch.changes]);
        return null;
      },
      (e: unknown) => {
        // Roll the cache back, for each key nothing has written since.
        for (const [key, value] of batch.changes) {
          if ((entries.get(key) ?? null) === value) {
            set(key, batch.before.get(key) ?? null);
          }
        }
        console.warn('[reticulyne] a write to the local store failed:', e);
        return e;
      }
    );
    committing.add(outcome);
    void outcome.finally(() => {
      committing.delete(outcome);
    });
  };

  const write = (key: string, value: string | null) => {
    if (!queued) {
      const batch: Batch = { changes: new Map(), before: new Map() };
      queued = batch;
      queueMicrotask(() => {
        queued = null;
        commit(batch);
      });
    }
    if (!queued.before.has(key)) {
      queued.before.set(key, entries.get(key) ?? null);
    }
    queued.changes.set(key, value);
    set(key, value);
  };

  return {
    get length() {
      return entries.size;
    },
    key(index: number) {
      return [...entries.keys()][index] ?? null;
    },
    getItem(key: string) {
      return entries.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      write(key, String(value));
    },
    removeItem(key: string) {
      write(key, null);
    },
    clear() {
      for (const key of [...entries.keys()]) write(key, null);
    },
    async flush() {
      // Lets this turn's batch start committing first.
      await Promise.resolve();
      const outcomes = await Promise.all([...committing]);
      const failure = outcomes.find((outcome) => {
        return outcome !== null;
      });
      if (failure === undefined) return;
      throw isQuotaError(failure) ? new StorageFullError() : failure;
    }
  };
};

const createPackStore = (db: IDBDatabase, installed: IconPack[]): PackStore => {
  const packs = [...installed];
  return {
    list() {
      return [...packs];
    },
    async install(value: unknown) {
      const result = validateIconPack(value);
      if (!result.ok) return result;
      const tx = db.transaction(PACKS, 'readwrite');
      tx.objectStore(PACKS).put(result.pack);
      try {
        await transactionDone(tx);
      } catch (e) {
        throw isQuotaError(e) ? new StorageFullError() : e;
      }
      const at = packs.findIndex((pack) => {
        return pack.id === result.pack.id;
      });
      if (at === -1) packs.push(result.pack);
      else packs[at] = result.pack;
      return result;
    },
    async remove(id: string) {
      const tx = db.transaction(PACKS, 'readwrite');
      tx.objectStore(PACKS).delete(id);
      await transactionDone(tx);
      const at = packs.findIndex((pack) => {
        return pack.id === id;
      });
      if (at !== -1) packs.splice(at, 1);
    }
  };
};

interface IndexEntry {
  id: string;
  name: string;
  updatedAt: number;
}

const readIndex = (text: string | null | undefined): IndexEntry[] => {
  try {
    const value: unknown = JSON.parse(text ?? '[]');
    return Array.isArray(value)
      ? value.filter((entry): entry is IndexEntry => {
          return (
            typeof entry?.id === 'string' &&
            typeof entry?.updatedAt === 'number'
          );
        })
      : [];
  } catch {
    return [];
  }
};

/**
 * What to copy from localStorage on the first open: every `reticulyne.*`
 * key the store does not have.
 */
const firstCopy = (legacy: Storage, entries: Map<string, string>): Change[] => {
  const copied: Change[] = [];
  for (let i = 0; i < legacy.length; i += 1) {
    const key = legacy.key(i);
    const value = key === null ? null : legacy.getItem(key);
    if (key?.startsWith(KEY_PREFIX) && value !== null && !entries.has(key)) {
      copied.push([key, value]);
    }
  }
  return copied;
};

/**
 * What to copy on a later open: the diagrams saved to localStorage after the
 * first copy (in a session that fell back to it) and newer than the store's
 * own, with their index entries. Older localStorage diagrams are not copied
 * again, so one deleted here does not come back.
 */
const laterCopy = (
  legacy: Storage,
  entries: Map<string, string>,
  since: number
): Change[] => {
  const ours = readIndex(entries.get(INDEX_KEY));
  const byId = new Map(
    ours.map((entry) => {
      return [entry.id, entry];
    })
  );
  const newer = readIndex(legacy.getItem(INDEX_KEY)).filter((entry) => {
    const own = byId.get(entry.id);
    return (
      entry.updatedAt > since &&
      (!own || entry.updatedAt > own.updatedAt) &&
      legacy.getItem(diagramKey(entry.id)) !== null
    );
  });
  if (!newer.length) return [];
  for (const entry of newer) byId.set(entry.id, entry);
  return [
    ...newer.map((entry): Change => {
      return [diagramKey(entry.id), legacy.getItem(diagramKey(entry.id))];
    }),
    [INDEX_KEY, JSON.stringify([...byId.values()])]
  ];
};

/**
 * Opens the local store, copying an older build's localStorage diagrams in.
 * Rejects when IndexedDB cannot be used (some private windows); the caller
 * falls back to localStorage.
 */
export const openLocalStore = async ({
  factory = window.indexedDB,
  legacy = window.localStorage
}: {
  factory?: IDBFactory;
  legacy?: Storage | null;
} = {}): Promise<LocalStore> => {
  if (!factory) throw new Error('IndexedDB is not available.');
  const db = await openDatabase(factory, DB_NAME, DB_VERSION, (upgrading) => {
    if (!upgrading.objectStoreNames.contains(KV)) {
      upgrading.createObjectStore(KV);
    }
    if (!upgrading.objectStoreNames.contains(PACKS)) {
      upgrading.createObjectStore(PACKS, { keyPath: 'id' });
    }
  });

  const entries = new Map<string, string>();
  for (const [key, value] of await readEntries<string>(db, KV)) {
    if (typeof key === 'string' && typeof value === 'string') {
      entries.set(key, value);
    }
  }

  const migrated = entries.get(MIGRATED_KEY);
  const copied: Change[] =
    migrated === undefined
      ? [
          ...(legacy ? firstCopy(legacy, entries) : []),
          [MIGRATED_KEY, new Date().toISOString()]
        ]
      : legacy
        ? laterCopy(legacy, entries, Date.parse(migrated) || 0)
        : [];
  if (copied.length) {
    const tx = db.transaction(KV, 'readwrite');
    for (const [key, value] of copied) {
      if (value !== null) tx.objectStore(KV).put(value, key);
    }
    await transactionDone(tx);
    for (const [key, value] of copied) {
      if (value !== null) entries.set(key, value);
    }
  }

  const installed = (await readEntries<IconPack>(db, PACKS)).flatMap(
    ([, value]) => {
      const result = validateIconPack(value);
      return result.ok ? [result.pack] : [];
    }
  );

  return {
    storage: createStorage(db, entries),
    packs: createPackStore(db, installed)
  };
};
