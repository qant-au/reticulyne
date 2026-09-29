import {
  isSceneDocument,
  parseJson,
  serializeScene,
  type Scene
} from 'src/vendor/accurona-core';
import { readScene, sceneSafeId } from 'src/scene';
import type { Icon } from 'src/types';

// APP-01: the Docker editor's diagrams, kept in the browser's localStorage.
// One key per diagram plus an index, so listing never parses every
// diagram. Each diagram is stored as a scene (the file format). The
// bundled icon packs are stripped on write and put back on read: they are
// ~4 MB and identical in every diagram, and storing them would fill the
// ~5 MB quota with a single save. A bundled icon an object uses is kept,
// so the stored text is a valid scene on its own. Uploaded icons are the
// diagram's own and are kept. Diagrams saved by older builds, as
// Reticulyne models, are still read (and converted).

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

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const createDiagramStorage = (
  storage: Storage,
  bundledIcons: Icon[]
) => {
  // Legacy models name the bundled icons by their own ids; a scene names
  // them by scene-safe ones (the same, bar one AWS icon with an '&').
  const rawBundledIds = new Set(
    bundledIcons.map((icon) => {
      return icon.id;
    })
  );
  const bundled = bundledIcons.map((icon) => {
    return { ...icon, id: sceneSafeId(icon.id) };
  });
  const bundledIds = new Set(
    bundled.map((icon) => {
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

  /**
   * A parsed diagram file (a scene, or a legacy model) with the bundled
   * icons put back, as a validated scene; null when it is neither.
   */
  const open = (value: unknown, id?: string): Scene | null => {
    if (!isObject(value)) return null;
    const own = (Array.isArray(value.icons) ? value.icons : []) as Icon[];
    let data: unknown;
    if (isSceneDocument(value)) {
      const ownIds = new Set(
        own.map((icon) => {
          return icon.id;
        })
      );
      data = {
        ...value,
        icons: [
          ...bundled.filter((icon) => {
            return !ownIds.has(icon.id);
          }),
          ...own
        ]
      };
    } else {
      data = {
        ...value,
        icons: [
          ...bundledIcons,
          ...own.filter((icon) => {
            return !rawBundledIds.has(icon?.id);
          })
        ]
      };
    }
    const result = readScene(
      data,
      id === undefined ? undefined : sceneSafeId(id)
    );
    return result.ok ? result.scene : null;
  };

  return {
    open,

    /** Saved diagrams, most recently saved first. */
    list(): DiagramEntry[] {
      return [...readIndex()].sort((a, b) => {
        return b.updatedAt - a.updatedAt;
      });
    },

    /** The diagram with the bundled icons put back, or null. */
    load(id: string): Scene | null {
      try {
        const raw = storage.getItem(diagramKey(id));
        if (!raw) return null;
        return open(parseJson(raw), id);
      } catch {
        return null;
      }
    },

    /**
     * Stores the scene without the bundled icons it does not use. Throws
     * StorageFullError when the quota is reached, and an Error if the
     * scene is invalid.
     */
    save(id: string, scene: Scene, now = Date.now()): void {
      const used = new Set(
        scene.objects.map((object) => {
          return object.icon;
        })
      );
      const stored: Scene = {
        ...scene,
        icons: (scene.icons ?? []).filter((icon) => {
          return !bundledIds.has(icon.id) || used.has(icon.id);
        })
      };
      write(diagramKey(id), serializeScene(stored));
      const others = readIndex().filter((entry) => {
        return entry.id !== id;
      });
      write(
        INDEX_KEY,
        JSON.stringify([
          ...others,
          { id, name: scene.title ?? 'Untitled', updatedAt: now }
        ])
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
