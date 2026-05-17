import { produce } from 'immer';
import { Connector, ViewItem } from 'src/types';
import { model as modelFixture } from '../../fixtures/model';
import { validateModel } from '../validation';
import { modelSchema, initialDataSchema } from '../model';

describe('Model validation works correctly', () => {
  test('Model fixture is valid', () => {
    const issues = validateModel(modelFixture);

    expect(issues.length).toStrictEqual(0);
  });

  test('Connector with anchor that references an invalid item fails validation', () => {
    const invalidConnector: Connector = {
      id: 'invalidConnector',
      color: 'color1',
      anchors: [
        { id: 'testAnch', ref: { item: 'node1' } },
        { id: 'testAnch2', ref: { item: 'invalidItem' } }
      ]
    };

    const model = produce(modelFixture, (draft) => {
      draft.views[0].connectors?.push(invalidConnector);
    });

    const issues = validateModel(model);

    expect(issues[0].type).toStrictEqual('INVALID_ANCHOR_TO_VIEW_ITEM_REF');
  });

  test('Connector with less than two anchors fails validation', () => {
    const invalidConnector: Connector = {
      id: 'invalidConnector',
      color: 'color1',
      anchors: []
    };

    const model = produce(modelFixture, (draft) => {
      draft.views[0].connectors?.push(invalidConnector);
    });

    const issues = validateModel(model);

    expect(issues[0].type).toStrictEqual('CONNECTOR_TOO_FEW_ANCHORS');
  });

  test('Connector with anchor that references an invalid anchor fails validation', () => {
    const invalidConnector: Connector = {
      id: 'invalidConnector',
      color: 'color1',
      anchors: [
        { id: 'testAnch1', ref: { anchor: 'invalidAnchor' } },
        { id: 'testAnch2', ref: { anchor: 'anchor1' } }
      ]
    };

    const model = produce(modelFixture, (draft) => {
      draft.views[0].connectors?.push(invalidConnector);
    });

    const issues = validateModel(model);

    expect(issues[0].type).toStrictEqual('INVALID_ANCHOR_TO_ANCHOR_REF');
  });

  test('An invalid view item fails validation', () => {
    const invalidItem: ViewItem = {
      id: 'invalidItem',
      tile: {
        x: 0,
        y: 0
      }
    };

    const model = produce(modelFixture, (draft) => {
      draft.views[0].items.push(invalidItem);
    });

    const issues = validateModel(model);

    expect(issues[0].type).toStrictEqual('INVALID_VIEW_ITEM_TO_MODEL_ITEM_REF');
  });

  test('A connector with an invalid color fails validation', () => {
    const invalidConnector: Connector = {
      id: 'invalidConnector',
      color: 'invalidColor',
      anchors: []
    };

    const model = produce(modelFixture, (draft) => {
      draft.views[0].connectors?.push(invalidConnector);
    });

    const issues = validateModel(model);

    expect(issues[0].type).toStrictEqual('INVALID_CONNECTOR_COLOR_REF');
  });

  test('A rectangle with an invalid color fails validation', () => {
    const invalidRectangle = {
      id: 'invalidRectangle',
      color: 'invalidColor',
      from: { x: 0, y: 0 },
      to: { x: 2, y: 2 }
    };

    const model = produce(modelFixture, (draft) => {
      draft.views[0].rectangles?.push(invalidRectangle);
    });

    const issues = validateModel(model);

    expect(issues[0].type).toStrictEqual('INVALID_RECTANGLE_COLOR_REF');
  });
});

describe('Schemas reject unknown keys at the trust boundary', () => {
  test('modelSchema rejects an extra top-level key', () => {
    const model = { ...modelFixture, surpriseField: 'nope' };
    const result = modelSchema.safeParse(model);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe('unrecognized_keys');
    }
  });

  test('modelSchema rejects an extra key on a nested item', () => {
    const model = produce(modelFixture, (draft) => {
      // @ts-expect-error — intentional injection of an unknown key.
      draft.items[0].sneaky = 'nope';
    });
    const result = modelSchema.safeParse(model);
    expect(result.success).toBe(false);
  });

  test('initialDataSchema accepts fitToView and view but rejects other extras', () => {
    const ok = initialDataSchema.safeParse({
      ...modelFixture,
      fitToView: true,
      view: modelFixture.views[0].id
    });
    expect(ok.success).toBe(true);

    const bad = initialDataSchema.safeParse({
      ...modelFixture,
      __proto__: { admin: true }
    });
    // JSON.parse + then safeParse on an object with __proto__ in *source* is
    // a slightly different story (`__proto__` from JSON is parsed as a
    // regular property by JSON.parse, not as the prototype slot — but only
    // if the parser respects it). The spread above puts `__proto__` on the
    // object literal's prototype slot, which Zod sees as a regular key only
    // if iterated explicitly. The relevant guarantee we want is: extras
    // beyond `fitToView` and `view` get rejected. Use an obviously-extra key:
    const extra = initialDataSchema.safeParse({
      ...modelFixture,
      isAdmin: true
    });
    expect(extra.success).toBe(false);
    if (!extra.success) {
      expect(extra.error.issues[0].code).toBe('unrecognized_keys');
    }
    expect(bad.success).toBe(true); // __proto__ via spread is not seen as a key
  });
});
