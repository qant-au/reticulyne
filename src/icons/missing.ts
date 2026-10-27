import type { Icon } from 'src/types/model';
import { svgDataUrl } from './drawingIcons';

// An object whose icon is neither in its diagram nor in the editor's
// library (a pack that is not installed, a file edited by hand) would make
// the scene invalid, and the editor used to refuse to open it. On opening,
// such an icon becomes a placeholder of the same id instead: the object
// keeps its icon id, ports and connections, draws as a question mark in
// both views, and is listed so it can be replaced. The placeholder is saved
// with the diagram (a scene may refer only to icons it carries) and is
// recognised again by its drawing, so the diagram stays "missing" until the
// icon comes back: when a pack with that id is loaded, its icon takes over.

const INK = '#16213d';
const FILL = '#f3d9a4';
const EDGE = '#c48a1c';

const ISO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  `<path d="M32 18 L52 29.5 L32 41 L12 29.5 Z" fill="${FILL}" stroke="${EDGE}" stroke-width="1.6" stroke-dasharray="4 3" stroke-linejoin="round"/>` +
  `<path d="M12 29.5 L12 37 L32 48.5 L32 41 Z" fill="${FILL}" stroke="${EDGE}" stroke-width="1.6" stroke-dasharray="4 3" stroke-linejoin="round"/>` +
  `<path d="M52 29.5 L52 37 L32 48.5 L32 41 Z" fill="${FILL}" stroke="${EDGE}" stroke-width="1.6" stroke-dasharray="4 3" stroke-linejoin="round"/>` +
  `<text x="32" y="34" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="${INK}">?</text>` +
  '</svg>';

const FLAT =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' +
  `<rect x="6" y="6" width="36" height="36" rx="4" fill="${FILL}" stroke="${EDGE}" stroke-width="1.6" stroke-dasharray="4 3"/>` +
  `<text x="24" y="31" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="700" fill="${INK}">?</text>` +
  '</svg>';

export const MISSING_ICON_URL = svgDataUrl(ISO);
export const MISSING_ICON_FLAT_URL = svgDataUrl(FLAT);
export const MISSING_ICON_COLLECTION = 'Missing icons';

/** A placeholder for the icon of this id. */
export const missingIcon = (id: string): Icon => {
  return {
    id,
    name: `Missing icon: ${id}`.slice(0, 100),
    url: MISSING_ICON_URL,
    flatUrl: MISSING_ICON_FLAT_URL,
    isIsometric: true,
    collection: MISSING_ICON_COLLECTION
  };
};

export const isMissingIcon = (icon: { url?: string }) => {
  return icon.url === MISSING_ICON_URL;
};

/** A missing icon, and how many objects draw with it. */
export interface MissingIcon {
  id: string;
  objects: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * A scene document with every icon its objects name and it does not carry
 * put in: from `library` when the editor has one of that id, else as a
 * placeholder. Returns the scene (unchanged when nothing was missing) and
 * the icons still missing, placeholders it already carried included.
 * Structure is not checked here; the scene schema does that next.
 */
export const fillMissingIcons = (
  value: unknown,
  library: Icon[]
): { value: unknown; missing: MissingIcon[] } => {
  if (!isRecord(value) || !Array.isArray(value.objects)) {
    return { value, missing: [] };
  }
  const carried = Array.isArray(value.icons)
    ? value.icons.filter(isRecord)
    : [];
  const carriedIds = new Set(
    carried.map((icon) => {
      return icon.id;
    })
  );
  const libraryById = new Map(
    library.map((icon) => {
      return [icon.id, icon];
    })
  );
  const counts = new Map<string, number>();
  for (const object of value.objects) {
    if (!isRecord(object) || typeof object.icon !== 'string') continue;
    counts.set(object.icon, (counts.get(object.icon) ?? 0) + 1);
  }
  const added: Icon[] = [];
  const missing: MissingIcon[] = [];
  for (const [id, objects] of counts) {
    const own = carried.find((icon) => {
      return icon.id === id;
    });
    if (own) {
      if (isMissingIcon(own)) missing.push({ id, objects });
      continue;
    }
    if (carriedIds.has(id)) continue;
    const fromLibrary = libraryById.get(id);
    if (fromLibrary && !isMissingIcon(fromLibrary)) {
      added.push(fromLibrary);
    } else {
      added.push(missingIcon(id));
      missing.push({ id, objects });
    }
  }
  if (!added.length) return { value, missing };
  return {
    value: { ...value, icons: [...carried, ...added] },
    missing
  };
};
