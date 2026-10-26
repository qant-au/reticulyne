import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { emptyScene, validateScene, type Scene } from 'src/core';
import type { IconPack } from '../pack';
import type { LoadedPack } from '../packRegistry';
import { packNotices, withExternalPacks } from '../externalPacks';
import {
  fillMissingIcons,
  isMissingIcon,
  MISSING_ICON_URL,
  missingIcon
} from '../missing';
import { readScene } from 'src/scene';

// Sharing a diagram drawn with a pack: the scene names the packs it used,
// once each, with their source; opening it without them says so; and an
// icon nobody has opens as a placeholder rather than refusing the file.

const flags: IconPack = JSON.parse(
  readFileSync(
    join(
      __dirname,
      '../../../packs/nautical-flags/nautical-flags.reticulyne-pack.json'
    ),
    'utf8'
  )
);
const loaded = (pack: IconPack): LoadedPack => {
  return { pack, removable: true, origin: 'user' };
};
const alfa = flags.icons[0];
const zulu = flags.icons[25];

const sceneWith = (icons: string[], carried = true): Scene => {
  const base = emptyScene('d', 'Harbour');
  return {
    ...base,
    objects: icons.map((icon, i) => {
      return { id: `o${i}`, name: `Object ${i}`, icon };
    }),
    icons: carried
      ? flags.icons
          .filter((icon) => {
            return icons.includes(icon.id);
          })
          .map((icon) => {
            return {
              id: icon.id,
              name: icon.name,
              url: icon.url,
              isIsometric: true,
              flatUrl: icon.flatUrl
            };
          })
      : []
  };
};

describe('withExternalPacks', () => {
  test('names each pack used once, with its source and the icons used', () => {
    const scene = withExternalPacks(sceneWith([alfa.id, zulu.id, alfa.id]), [
      loaded(flags)
    ]);
    expect(scene.externalPacks).toEqual([
      {
        id: 'nautical-flags',
        name: 'Nautical Flags',
        version: '1.0.0',
        sourceUrl: flags.sourceUrl,
        icons: [alfa.id, zulu.id]
      }
    ]);
    expect(validateScene(scene).ok).toBe(true);
  });

  test('leaves the field out when no pack icon is used', () => {
    const scene = withExternalPacks(sceneWith([]), [loaded(flags)]);
    expect(scene).not.toHaveProperty('externalPacks');
  });

  test('keeps an entry for a pack not loaded here while its icons are used', () => {
    const opened = withExternalPacks(sceneWith([alfa.id, zulu.id]), [
      loaded(flags)
    ]);
    // Opened elsewhere, without the pack, and Zulu deleted.
    const edited: Scene = {
      ...opened,
      objects: opened.objects.slice(0, 1)
    };
    expect(withExternalPacks(edited, []).externalPacks).toEqual([
      expect.objectContaining({ id: 'nautical-flags', icons: [alfa.id] })
    ]);
    expect(
      withExternalPacks({ ...edited, objects: [] }, []).externalPacks
    ).toBeUndefined();
  });
});

describe('packNotices', () => {
  const scene = withExternalPacks(sceneWith([alfa.id]), [loaded(flags)]);

  test('names a listed pack that is not loaded', () => {
    expect(packNotices(scene, [])).toEqual([{ pack: scene.externalPacks![0] }]);
  });

  test('says nothing when the pack is loaded at the same version', () => {
    expect(packNotices(scene, [loaded(flags)])).toEqual([]);
  });

  test('names the version loaded when it differs', () => {
    expect(
      packNotices(scene, [loaded({ ...flags, version: '2.0.0' })])
    ).toEqual([{ pack: scene.externalPacks![0], loadedVersion: '2.0.0' }]);
  });
});

describe('a missing icon', () => {
  test('is taken from the library when the library has it', () => {
    const { value, missing } = fillMissingIcons(sceneWith([alfa.id], false), [
      alfa
    ]);
    expect(missing).toEqual([]);
    expect((value as Scene).icons?.[0].url).toBe(alfa.url);
  });

  test('else becomes a placeholder of the same id, counted', () => {
    const { value, missing } = fillMissingIcons(
      sceneWith([alfa.id, alfa.id], false),
      []
    );
    expect(missing).toEqual([{ id: alfa.id, objects: 2 }]);
    const [icon] = (value as Scene).icons!;
    expect(icon.id).toBe(alfa.id);
    expect(isMissingIcon(icon)).toBe(true);
  });

  test('a placeholder saved in the file is still missing next time', () => {
    const saved: Scene = {
      ...sceneWith([alfa.id], false),
      icons: [missingIcon(alfa.id)]
    };
    expect(fillMissingIcons(saved, []).missing).toEqual([
      { id: alfa.id, objects: 1 }
    ]);
  });

  test('readScene opens it with the library given, and refuses it without', () => {
    const scene = sceneWith(['nowhere'], false);
    expect(readScene(scene).ok).toBe(false);
    const read = readScene(scene, undefined, { library: [] });
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.missingIcons).toEqual([{ id: 'nowhere', objects: 1 }]);
      expect(read.scene.icons?.[0].url).toBe(MISSING_ICON_URL);
      // The placeholder makes a valid file.
      expect(validateScene(read.scene).ok).toBe(true);
    }
  });
});
