import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IconPack } from '../pack';
import {
  checkInstall,
  packContents,
  PACK_LOCKED_MESSAGE,
  resolvePacks,
  type IconPackEntry,
  type LoadedPack
} from '../packRegistry';

// The loading rules, over the Nautical Flags pack: every way a pack can
// arrive (from the app, removable or locked; installed by the user; none)
// against every way the same id can arrive again.

const flags: IconPack = JSON.parse(
  readFileSync(
    join(
      __dirname,
      '../../../packs/nautical-flags/nautical-flags.reticulyne-pack.json'
    ),
    'utf8'
  )
);
const v2: IconPack = { ...flags, version: '2.0.0' };

const user = (pack: IconPack): LoadedPack => {
  return { pack, removable: true, origin: 'user' };
};

type First = 'app removable' | 'app locked' | 'user' | 'none';
type Second = 'host prop' | 'install' | 'none';

const firstEntries = (first: First): IconPackEntry[] => {
  if (first === 'app removable') return [{ pack: flags }];
  if (first === 'app locked') return [{ pack: flags, removable: false }];
  if (first === 'user') return [{ pack: flags, origin: 'user' }];
  return [];
};

describe('the loading rules, every combination', () => {
  const cases: [First, Second, string | null, string | null][] = [
    // first, then the same id again, -> the version loaded, the refusal
    ['app removable', 'host prop', '2.0.0', null],
    ['app removable', 'install', '2.0.0', null],
    ['app removable', 'none', '1.0.0', null],
    ['app locked', 'host prop', '1.0.0', null],
    ['app locked', 'install', '1.0.0', PACK_LOCKED_MESSAGE],
    ['app locked', 'none', '1.0.0', null],
    ['user', 'host prop', '2.0.0', null],
    ['user', 'install', '2.0.0', null],
    ['user', 'none', '1.0.0', null],
    ['none', 'host prop', '2.0.0', null],
    ['none', 'install', '2.0.0', null],
    ['none', 'none', null, null]
  ];

  test.each(cases)('%s, then %s', (first, second, version, refusal) => {
    let host = firstEntries(first);
    const installed: LoadedPack[] = [];
    if (second === 'host prop') host = [...host, { pack: v2 }];
    if (second === 'install') {
      const result = checkInstall(resolvePacks(host, [], new Set()), v2);
      if (refusal) {
        expect(result).toEqual({ ok: false, errors: [refusal] });
      } else {
        expect(result.ok).toBe(true);
        installed.push(user(v2));
      }
    }
    const loaded = resolvePacks(host, installed, new Set());
    const ids = loaded.filter((p) => {
      return p.pack.id === 'nautical-flags';
    });
    expect(ids.length).toBe(version ? 1 : 0);
    if (version) expect(ids[0].pack.version).toBe(version);
  });
});

describe('resolvePacks', () => {
  test('a later pack of an id takes the later place', () => {
    const other: IconPack = { ...flags, id: 'other', name: 'Other' };
    const loaded = resolvePacks(
      [{ pack: flags }, { pack: other }],
      [user(v2)],
      new Set()
    );
    expect(
      loaded.map((p) => {
        return `${p.pack.id}@${p.pack.version}`;
      })
    ).toEqual(['other@1.0.0', 'nautical-flags@2.0.0']);
  });

  test('a removed id drops an app pack, never a locked one', () => {
    const removed = new Set(['nautical-flags']);
    expect(resolvePacks([{ pack: flags }], [], removed)).toEqual([]);
    expect(
      resolvePacks([{ pack: flags, removable: false }], [], removed)
    ).toHaveLength(1);
  });

  test('an app pack is "app" and removable unless it says otherwise', () => {
    expect(resolvePacks([{ pack: flags }], [], new Set())[0]).toEqual({
      pack: flags,
      removable: true,
      origin: 'app'
    });
  });
});

describe('checkInstall', () => {
  test('refuses an invalid pack with its errors', () => {
    const result = checkInstall([], { ...flags, sourceUrl: undefined });
    expect(result.ok).toBe(false);
  });
});

describe('packContents', () => {
  test('brings the icons, the palette items and the media', () => {
    const { icons, items, media } = packContents([user(flags)]);
    expect(icons).toHaveLength(40);
    expect(icons[0].collection).toBe('nautical-flags');
    expect(items).toHaveLength(40);
    expect(
      items[0].ports.map((p) => {
        return p.medium;
      })
    ).toEqual(['halyard', 'halyard']);
    expect(
      media.some((m) => {
        return m.id === 'halyard';
      })
    ).toBe(true);
    expect(
      media.some((m) => {
        return m.id === 'ethernet-copper';
      })
    ).toBe(true);
  });
});
