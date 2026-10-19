// Files written before Reticulyne had its own format name. They are the same
// format under an older name, so they are read as if they carried the
// current one and take the current name on their next save. This is the
// only place the older name may appear.

export const LEGACY_SCENE_FORMATS: readonly string[] = ['accurona-scene'];

type Doc = Record<string, unknown>;

/** Whether `format` is an older name of the scene format. */
export function isLegacySceneFormat(format: unknown): boolean {
  return typeof format === 'string' && LEGACY_SCENE_FORMATS.includes(format);
}

/** A copy of `value` under the current format name, or `value` unchanged. */
export function renameLegacyFormat(value: Doc, current: string): Doc {
  return isLegacySceneFormat(value.format)
    ? { ...value, format: current }
    : value;
}
