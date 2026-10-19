// A thin promise wrapper over the few IndexedDB calls the Docker app's
// local store makes. Nothing here knows about diagrams or packs.

export const requestResult = <T>(request: IDBRequest<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => {
      resolve(request.result);
    });
    request.addEventListener('error', () => {
      reject(request.error);
    });
  });
};

/** Resolves when the transaction commits, rejects when it fails. */
export const transactionDone = (tx: IDBTransaction): Promise<void> => {
  return new Promise((resolve, reject) => {
    tx.addEventListener('complete', () => {
      resolve();
    });
    tx.addEventListener('error', () => {
      reject(tx.error);
    });
    tx.addEventListener('abort', () => {
      reject(tx.error ?? new DOMException('Transaction aborted', 'AbortError'));
    });
  });
};

export const openDatabase = (
  factory: IDBFactory,
  name: string,
  version: number,
  upgrade: (db: IDBDatabase) => void
): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, version);
    request.onupgradeneeded = () => {
      upgrade(request.result);
    };
    request.onsuccess = () => {
      const db = request.result;
      // A newer build opening the database with a higher version waits on
      // every open connection; this one steps aside rather than block it.
      db.onversionchange = () => {
        db.close();
      };
      resolve(db);
    };
    request.onerror = () => {
      reject(request.error);
    };
    request.onblocked = () => {
      reject(
        new Error(
          'The local store is open in another tab with an older version.'
        )
      );
    };
  });
};

/** Every key and value in an object store. */
export const readEntries = async <T>(
  db: IDBDatabase,
  store: string
): Promise<[IDBValidKey, T][]> => {
  const tx = db.transaction(store, 'readonly');
  const os = tx.objectStore(store);
  const [keys, values] = await Promise.all([
    requestResult(os.getAllKeys()),
    requestResult(os.getAll() as IDBRequest<T[]>)
  ]);
  return keys.map((key, i) => {
    return [key, values[i]];
  });
};
