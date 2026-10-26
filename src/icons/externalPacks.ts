import type { ExternalPack, Scene } from 'src/core';
import type { LoadedPack } from './packRegistry';

// A diagram's `externalPacks`: the icon packs other than Reticulyne's own
// whose icons it uses, each written once with where to get it, so a file
// shared with someone who lacks a pack says which one and where it lives.

/**
 * The scene with its `externalPacks` brought up to date: an entry for each
 * loaded pack whose icons its objects use, and, for a pack listed when the
 * diagram was opened that is not loaded here, its entry kept while objects
 * still use its icons. Left out when there are none.
 */
export const withExternalPacks = (scene: Scene, packs: LoadedPack[]): Scene => {
  const used = new Set(
    scene.objects.flatMap((object) => {
      return object.icon === undefined ? [] : [object.icon];
    })
  );
  const loaded = new Set(
    packs.map((p) => {
      return p.pack.id;
    })
  );
  const entries: ExternalPack[] = [];
  for (const { pack } of packs) {
    const icons = pack.icons
      .map((icon) => {
        return icon.id;
      })
      .filter((id) => {
        return used.has(id);
      });
    if (!icons.length) continue;
    entries.push({
      id: pack.id,
      name: pack.name,
      ...(pack.version ? { version: pack.version } : {}),
      sourceUrl: pack.sourceUrl,
      icons
    });
  }
  for (const previous of scene.externalPacks ?? []) {
    if (loaded.has(previous.id)) continue;
    const icons = previous.icons.filter((id) => {
      return used.has(id);
    });
    if (icons.length) entries.push({ ...previous, icons });
  }
  const { externalPacks, ...rest } = scene;
  void externalPacks;
  return entries.length ? { ...rest, externalPacks: entries } : rest;
};

/** A listed pack that is not loaded, or is loaded at another version. */
export interface PackNotice {
  pack: ExternalPack;
  /** The version loaded, when it differs from the one the diagram lists. */
  loadedVersion?: string;
}

/** The packs a diagram lists that this editor lacks or has another version of. */
export const packNotices = (
  scene: Pick<Scene, 'externalPacks'>,
  packs: LoadedPack[]
): PackNotice[] => {
  return (scene.externalPacks ?? []).flatMap((pack) => {
    const here = packs.find((p) => {
      return p.pack.id === pack.id;
    });
    if (!here) return [{ pack }];
    if (
      pack.version &&
      here.pack.version &&
      here.pack.version !== pack.version
    ) {
      return [{ pack, loadedVersion: here.pack.version }];
    }
    return [];
  });
};
