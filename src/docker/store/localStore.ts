import {
  validateIconPack,
  type IconPack,
  type IconPackResult
} from 'src/icons/pack';
import { StorageFullError } from '../diagramStorage';
import { openDatabase, readEntries, transactionDone } from './idb';

// The Docker app's local store, in the browser's IndexedDB: the saved
// diagrams and the icon packs installed in this browser. IndexedDB has room
// for far more than localStorage's ~5 MB, which a few diagrams with uploaded
// icons, or one installed pack, would fill.
//
// Diagrams keep the key scheme diagramStorage.ts defines, in a `kv` store,
// behind a Storage-shaped cache: everything is read into memory when the
// app starts, so reads stay synchronous, and each write goes through to
// IndexedDB. `flush()` waits for the writes and reports a failed one, which
// is how a save learns it did not reach the disk.
//
// The first time it opens, it copies the diagrams an older build kept in
// localStorage. Those keys are left where they are, so going back to an
// older build still finds them.

export const DB_NAME = 'reticulyne';
const DB_VERSION = 1;
const KV = 'kv';
const PACKS = 'packs';
const KEY_PREFIX = 'reticulyne.';
export const MIGRATED_KEY = 'reticulyne.migrated-from-local-storage';

export interface PersistentStorage extends Storage {
  /** Waits for every write so far; rejects if one failed. */
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

const isQuotaError = (e: unknown) => {
  return (
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
};

const createStorage = (
  db: IDBDatabase,
  entries: Map<string, string>
): PersistentStorage => {
  const pending = new Set<Promise<void>>();
  let failure: unknown = null;

  const write = (run: (store: IDBObjectStore) => void) => {
    const tx = db.transaction(KV, 'readwrite');
    run(tx.objectStore(KV));
    const done = transactionDone(tx).catch((e: unknown) => {
      failure ??= e;
    });
    pending.add(done);
    void done.finally(() => {
      pending.delete(done);
    });
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
      entries.set(key, String(value));
      write((store) => {
        store.put(String(value), key);
      });
    },
    removeItem(key: string) {
      entries.delete(key);
      write((store) => {
        store.delete(key);
      });
    },
    clear() {
      entries.clear();
      write((store) => {
        store.clear();
      });
    },
    async flush() {
      await Promise.all([...pending]);
      if (failure === null) return;
      const e = failure;
      failure = null;
      throw isQuotaError(e) ? new StorageFullError() : e;
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

/**
 * Opens the local store, copying an older build's localStorage diagrams in
 * the first time. Rejects when IndexedDB cannot be used (some private
 * windows); the caller falls back to localStorage.
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

  if (!entries.has(MIGRATED_KEY)) {
    const copied: [string, string][] = [];
    if (legacy) {
      for (let i = 0; i < legacy.length; i += 1) {
        const key = legacy.key(i);
        const value = key === null ? null : legacy.getItem(key);
        if (
          key?.startsWith(KEY_PREFIX) &&
          value !== null &&
          !entries.has(key)
        ) {
          copied.push([key, value]);
        }
      }
    }
    copied.push([MIGRATED_KEY, new Date().toISOString()]);
    const tx = db.transaction(KV, 'readwrite');
    for (const [key, value] of copied) tx.objectStore(KV).put(value, key);
    await transactionDone(tx);
    for (const [key, value] of copied) entries.set(key, value);
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
