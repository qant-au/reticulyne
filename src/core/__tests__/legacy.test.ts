import {
  LEGACY_COLLECTION,
  LEGACY_ICON_PREFIX,
  LEGACY_SCENE_FORMATS,
  currentIconId,
  SCENE_FORMAT,
  isSceneDocument,
  parseScene,
  serializeScene,
  validateScene
} from 'src/core';

const legacyFormat = LEGACY_SCENE_FORMATS[0];

describe('a scene saved under the older format name', () => {
  const old = { format: legacyFormat, version: 2, id: 'old', objects: [] };

  test('is recognised as a scene', () => {
    expect(isSceneDocument(old)).toBe(true);
    expect(isSceneDocument({ ...old, format: 'something-else' })).toBe(false);
  });

  test('reads, under the current name', () => {
    const result = validateScene(old);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.scene.format).toBe(SCENE_FORMAT);
  });

  test('is migrated from version 1 too', () => {
    const result = parseScene(JSON.stringify({ ...old, version: 1 }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.scene.version).toBe(2);
  });

  test('is written back under the current name', () => {
    const result = validateScene(old);
    if (!result.ok) throw new Error(result.errors.join('\n'));
    const text = serializeScene(result.scene);
    expect(JSON.parse(text).format).toBe(SCENE_FORMAT);
  });

  test('a newer version is still refused', () => {
    const result = validateScene({ ...old, version: 99 });
    expect(result.ok).toBe(false);
  });
});

describe('icon ids saved under the older prefix', () => {
  const old = {
    format: legacyFormat,
    version: 2,
    id: 'old',
    objects: [
      { id: 'ap', icon: `${LEGACY_ICON_PREFIX}wifi-ap`, element: 'wifi-ap' },
      { id: 'srv', icon: 'server' }
    ],
    icons: [
      {
        id: `${LEGACY_ICON_PREFIX}wifi-ap`,
        name: 'Wi-Fi AP',
        url: 'data:image/svg+xml,a'
      },
      { id: 'server', name: 'Server', url: 'data:image/svg+xml,s' }
    ]
  };

  test('read under the current prefix, in icons and object refs alike', () => {
    const result = validateScene(old);
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(
      result.scene.icons?.map((icon) => {
        return icon.id;
      })
    ).toEqual(['reticulyne-wifi-ap', 'server']);
    expect(
      result.scene.objects.map((object) => {
        return object.icon;
      })
    ).toEqual(['reticulyne-wifi-ap', 'server']);
    // Filed under the current collection, not the older one.
    expect(
      validateScene({
        ...old,
        icons: [
          { ...old.icons[0], collection: LEGACY_COLLECTION },
          old.icons[1]
        ]
      })
    ).toMatchObject({
      ok: true,
      scene: { icons: [{ collection: 'Reticulyne' }, {}] }
    });
    // The element is a drawing id, unchanged.
    expect(result.scene.objects[0].element).toBe('wifi-ap');
  });

  test('currentIconId leaves every other id alone', () => {
    expect(currentIconId(`${LEGACY_ICON_PREFIX}nvr`)).toBe('reticulyne-nvr');
    expect(currentIconId('reticulyne-nvr')).toBe('reticulyne-nvr');
    expect(currentIconId('aws-ec2')).toBe('aws-ec2');
  });
});
