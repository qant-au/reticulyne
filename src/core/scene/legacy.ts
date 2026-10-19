// Files written before Reticulyne had its own names. They are the same
// format under older names, so they are read as if they carried the current
// ones and take the current names on their next save. This is the only
// place the older names may appear.

export const LEGACY_SCENE_FORMATS: readonly string[] = ['accurona-scene'];

// The built-in drawings' icons were `accurona-<drawing>`; they are
// `reticulyne-<drawing>` (src/icons/builtin.ts).
export const LEGACY_ICON_PREFIX = 'accurona-';
const ICON_PREFIX = 'reticulyne-';

type Doc = Record<string, unknown>;

const isDoc = (value: unknown): value is Doc => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/** Whether `format` is an older name of the scene format. */
export function isLegacySceneFormat(format: unknown): boolean {
  return typeof format === 'string' && LEGACY_SCENE_FORMATS.includes(format);
}

/** The current id of an icon id, which may be an older one. */
export function currentIconId(id: string): string {
  return id.startsWith(LEGACY_ICON_PREFIX)
    ? `${ICON_PREFIX}${id.slice(LEGACY_ICON_PREFIX.length)}`
    : id;
}

const renameIcon = (value: unknown) => {
  if (!isDoc(value) || typeof value.icon !== 'string') return value;
  const icon = currentIconId(value.icon);
  return icon === value.icon ? value : { ...value, icon };
};

// ...and were filed under this collection, now 'Reticulyne'.
export const LEGACY_COLLECTION = 'Accurona';
const COLLECTION = 'Reticulyne';

const renameIconRecord = (value: unknown) => {
  if (!isDoc(value) || typeof value.id !== 'string') return value;
  const id = currentIconId(value.id);
  const collection =
    value.collection === LEGACY_COLLECTION ? COLLECTION : value.collection;
  return id === value.id && collection === value.collection
    ? value
    : { ...value, id, ...(collection === undefined ? {} : { collection }) };
};

/**
 * A copy of a scene document under the current names: the format, the icon
 * ids and collection in `icons`, and the icon in each object's `icon`. Anything else is left
 * as it is, for the schema to judge.
 */
export function renameLegacy(value: Doc, current: string): Doc {
  const out: Doc = isLegacySceneFormat(value.format)
    ? { ...value, format: current }
    : { ...value };
  if (Array.isArray(value.icons)) out.icons = value.icons.map(renameIconRecord);
  if (Array.isArray(value.objects)) {
    out.objects = value.objects.map(renameIcon);
  }
  return out;
}
