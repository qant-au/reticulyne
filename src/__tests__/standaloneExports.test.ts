/**
 * @jest-environment node
 */
import * as standalone from '../standaloneExports';

// FEA-05: the option-maps are runtime values on the standalone subpath,
// and the subpath still loads without a DOM (this suite runs under the
// node environment, not jsdom).
test.each([
  ['EditorModeEnum', 'EDITABLE'],
  ['MainMenuOptionsEnum', 'EXPORT.JSON'],
  ['ProjectionOrientationEnum', 'X'],
  ['AnchorPositionOptions', 'TOP_LEFT'],
  ['DialogTypeEnum', 'EXPORT_IMAGE'],
  ['LayerOrderingActionOptions', 'BRING_TO_FRONT'],
  ['tileOriginOptions', 'CENTER'],
  ['ItemReferenceTypeOptions', 'CONNECTOR']
])('%s is exported at runtime and maps %s to itself', (name, key) => {
  const map = (standalone as unknown as Record<string, Record<string, string>>)[
    name
  ];
  expect(map[key]).toBe(key);
});

// The scene format helpers load without a DOM too.
test('exports the scene format helpers', () => {
  const scene = standalone.legacyModelToScene(
    { title: 'T', icons: [], colors: [], items: [], views: [] },
    'id'
  );
  expect(standalone.validateScene(scene).ok).toBe(true);
  const text = standalone.serializeScene(scene);
  expect(standalone.parseScene(text)).toEqual({
    ok: true,
    scene: JSON.parse(text)
  });
});
