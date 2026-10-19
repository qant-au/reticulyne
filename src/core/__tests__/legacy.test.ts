import {
  LEGACY_SCENE_FORMATS,
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
