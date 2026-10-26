import { MEDIA } from 'src/catalogue/media';
import type { CatalogueItem, Medium } from 'src/catalogue/schema';
import type { Icon } from 'src/types/model';
import {
  flattenPacks,
  packCatalogueItems,
  packMedia,
  validateIconPack,
  type IconPack,
  type IconPackResult
} from './pack';

// The icon packs an editor has loaded, and the rules for adding and
// removing them (docs/icon-packs.md "Loading rules").
//
// Packs come from two places: the host's `iconPacks` prop (the app) and
// installs made in the editor itself (the Icon packs dialog, or
// useReticulyne().installIconPack). Whatever is loaded last wins when two
// have the same id, so an install replaces an earlier pack of that id,
// except that a pack the app loaded with `removable: false` is locked: it is
// never replaced or removed from the editor, because the developer chose it.

/** Where a loaded pack came from: the host's code, or a user's install. */
export type PackOrigin = 'app' | 'user';

/** One entry of the `iconPacks` prop. */
export interface IconPackEntry {
  pack: IconPack;
  /** False locks the pack: no Remove, and no install over it. Default true. */
  removable?: boolean;
  /**
   * Who loaded it. A host that keeps the user's installs (the Docker
   * editor keeps them in the browser) passes them back as 'user'. Default
   * 'app'.
   */
  origin?: PackOrigin;
}

/** A pack as the editor holds it. */
export interface LoadedPack {
  pack: IconPack;
  removable: boolean;
  origin: PackOrigin;
}

/** The objects in one diagram that draw with a pack's icons. */
export interface IconPackUsage {
  diagramId: string;
  diagramName: string;
  objects: { id: string; name: string }[];
}

/** What the host does with the Icon packs dialog's installs and removals. */
export interface IconPackHandlers {
  /** Keep a pack the user installed; a rejection is shown in the dialog. */
  onIconPackInstall?: (pack: IconPack) => void | Promise<void>;
  /** Forget a pack the user removed. */
  onIconPackRemove?: (id: string) => void | Promise<void>;
  /**
   * The host's other diagrams that draw with any of these icons. The
   * editor checks the diagram that is open itself.
   */
  iconPackUsage?: (
    packId: string,
    iconIds: string[]
  ) => IconPackUsage[] | Promise<IconPackUsage[]>;
  /** Open one of the host's diagrams with these objects selected. */
  onShowIconPackUsage?: (diagramId: string, objectIds: string[]) => void;
}

export const PACK_LOCKED_MESSAGE =
  "This pack was loaded by the app and can't be replaced or removed here.";

const toLoaded = (entry: IconPackEntry): LoadedPack => {
  return {
    pack: entry.pack,
    removable: entry.removable !== false,
    origin: entry.origin ?? 'app'
  };
};

/**
 * The packs loaded, in load order: the host's, then the installs made in
 * the editor, less the ids removed in the editor. For an id given twice the
 * later one wins and takes the later place, unless the earlier is locked.
 */
export const resolvePacks = (
  fromHost: IconPackEntry[],
  installed: LoadedPack[],
  removed: ReadonlySet<string>
): LoadedPack[] => {
  const list: LoadedPack[] = [];
  const add = (next: LoadedPack) => {
    const at = list.findIndex((p) => {
      return p.pack.id === next.pack.id;
    });
    if (at !== -1) {
      if (!list[at].removable) return;
      list.splice(at, 1);
    }
    list.push(next);
  };
  for (const entry of fromHost) {
    const loaded = toLoaded(entry);
    if (loaded.removable && removed.has(loaded.pack.id)) continue;
    add(loaded);
  }
  for (const pack of installed) add(pack);
  return list;
};

/** The loaded pack of an id that refuses to be replaced or removed. */
export const lockedPack = (
  loaded: LoadedPack[],
  id: string
): LoadedPack | undefined => {
  return loaded.find((p) => {
    return p.pack.id === id && !p.removable;
  });
};

/**
 * Checks an install against the packs loaded: valid, and not over a locked
 * pack. The editor installs it only when this is ok.
 */
export const checkInstall = (
  loaded: LoadedPack[],
  value: unknown
): IconPackResult => {
  const result = validateIconPack(value);
  if (!result.ok) return result;
  if (lockedPack(loaded, result.pack.id)) {
    return { ok: false, errors: [PACK_LOCKED_MESSAGE] };
  }
  return result;
};

/** The icons, palette items and media the loaded packs bring. */
export const packContents = (
  loaded: LoadedPack[]
): { icons: Icon[]; items: CatalogueItem[]; media: Medium[] } => {
  const packs = loaded.map((p) => {
    return p.pack;
  });
  return {
    icons: flattenPacks(packs),
    items: packs.flatMap(packCatalogueItems),
    media: [...MEDIA, ...packs.flatMap(packMedia)]
  };
};
