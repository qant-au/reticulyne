import type { Icon, Model } from 'src/types';

// APP-01: the Docker editor's diagrams, kept in the browser's localStorage.
// One key per diagram plus an index, so listing never parses every
// diagram. The bundled icon packs are stripped on write and put back on
// read: they are ~4 MB and identical in every diagram, and storing them
// would fill the ~5 MB quota with a single save. Uploaded icons are the
// diagram's own and are kept.

export interface DiagramEntry {
  id: string;
  name: string;
  updatedAt: number;
}

const INDEX_KEY = 'reticulyne.diagrams';
const CURRENT_KEY = 'reticulyne.current';
const diagramKey = (id: string) => {
  return `reticulyne.diagram.${id}`;
};

export class StorageFullError extends Error {
  constructor() {
    super('Browser storage is full. Delete a diagram to make room.');
    this.name = 'StorageFullError';
  }
}

const isQuotaError = (e: unknown) => {
  return (
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.code === 22)
  );
};

export const createDiagramStorage = (
  storage: Storage,
  bundledIcons: Icon[]
) => {
  const bundledIds = new Set(
    bundledIcons.map((icon) => {
      return icon.id;
    })
  );

  const readIndex = (): DiagramEntry[] => {
    try {
      const parsed = JSON.parse(storage.getItem(INDEX_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const write = (key: string, value: string) => {
    try {
      storage.setItem(key, value);
    } catch (e) {
      if (isQuotaError(e)) throw new StorageFullError();
      throw e;
    }
  };

  return {
    /** Saved diagrams, most recently saved first. */
    list(): DiagramEntry[] {
      return [...readIndex()].sort((a, b) => {
        return b.updatedAt - a.updatedAt;
      });
    },

    /** The diagram with the bundled icons put back, or null. */
    load(id: string): Model | null {
      try {
        const raw = storage.getItem(diagramKey(id));
        if (!raw) return null;
        const model = JSON.parse(raw) as Model;
        return { ...model, icons: [...bundledIcons, ...(model.icons ?? [])] };
      } catch {
        return null;
      }
    },

    /** Throws StorageFullError when the quota is reached. */
    save(id: string, model: Model, now = Date.now()): void {
      const stored = {
        ...model,
        icons: model.icons.filter((icon) => {
          return !bundledIds.has(icon.id);
        })
      };
      write(diagramKey(id), JSON.stringify(stored));
      const others = readIndex().filter((entry) => {
        return entry.id !== id;
      });
      write(
        INDEX_KEY,
        JSON.stringify([...others, { id, name: model.title, updatedAt: now }])
      );
    },

    remove(id: string): void {
      storage.removeItem(diagramKey(id));
      write(
        INDEX_KEY,
        JSON.stringify(
          readIndex().filter((entry) => {
            return entry.id !== id;
          })
        )
      );
      if (storage.getItem(CURRENT_KEY) === id) storage.removeItem(CURRENT_KEY);
    },

    /** The diagram open last time, if it was saved. */
    getCurrent(): string | null {
      return storage.getItem(CURRENT_KEY);
    },

    setCurrent(id: string): void {
      try {
        storage.setItem(CURRENT_KEY, id);
      } catch {
        // Remembering the open diagram is a convenience; never fail on it.
      }
    }
  };
};

export type DiagramStorage = ReturnType<typeof createDiagramStorage>;
