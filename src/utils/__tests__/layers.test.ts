import { INITIAL_DATA, INITIAL_SCENE_STATE } from 'src/config';
import * as reducers from 'src/stores/reducers';
import { validateModel } from 'src/schemas/validation';
import type { Layer, Model, View } from 'src/types';
import type { State } from 'src/stores/reducers/types';
import {
  filterViewByLayers,
  hasRedactedContent,
  hiddenLayerIds,
  modelForExport,
  REDACTED_LAYER_ID
} from '../layers';

// lw-052. A switch (a) and a server (b) joined by k1; an address label on
// the Redacted layer; a note, a rectangle and the server on 'detail'; a
// second connector (k2) hanging off k1's end anchor.
const view = (): View => {
  return {
    id: 'v',
    name: 'V',
    items: [
      { id: 'a', tile: { x: 0, y: 0 } },
      { id: 'b', tile: { x: 4, y: 0 }, layerId: 'detail' }
    ],
    connectors: [
      {
        id: 'k1',
        anchors: [
          { id: 'k1a', ref: { item: 'a' } },
          { id: 'k1b', ref: { item: 'b' } }
        ]
      },
      {
        id: 'k2',
        anchors: [
          { id: 'k2a', ref: { anchor: 'k1b' } },
          { id: 'k2b', ref: { tile: { x: 6, y: 6 } } }
        ]
      }
    ],
    rectangles: [
      { id: 'r', from: { x: 0, y: 2 }, to: { x: 2, y: 3 }, layerId: 'detail' }
    ],
    textBoxes: [
      {
        id: 'ip',
        tile: { x: 0, y: 1 },
        content: '10.0.0.1',
        layerId: REDACTED_LAYER_ID
      },
      { id: 'note', tile: { x: 0, y: 4 }, content: 'Office' }
    ]
  };
};

const model = (layers: Layer[] = [{ id: 'detail', name: 'Detail' }]): Model => {
  return {
    ...INITIAL_DATA,
    items: [
      { id: 'a', name: 'Switch' },
      { id: 'b', name: 'Server' },
      { id: 'unplaced', name: 'Spare' }
    ],
    views: [view()],
    layers
  };
};

describe('layers', () => {
  test('a valid model, and bad layer references are refused', () => {
    expect(validateModel(model())).toEqual([]);
    const bad = model([]);
    expect(
      validateModel(bad).map((i) => {
        return i.type;
      })
    ).toEqual(['INVALID_LAYER_REF', 'INVALID_LAYER_REF']);
    const reserved = model([{ id: REDACTED_LAYER_ID, name: 'Mine' }]);
    expect(
      validateModel(reserved).some((i) => {
        return i.type === 'INVALID_LAYERS';
      })
    ).toBe(true);
  });

  test('hiddenLayerIds lists only layers switched off', () => {
    expect(hiddenLayerIds(undefined).size).toBe(0);
    expect([
      ...hiddenLayerIds([
        { id: 'x', name: 'X' },
        { id: 'y', name: 'Y', visible: false }
      ])
    ]).toEqual(['y']);
  });

  test('nothing left out returns the same view', () => {
    const v = view();
    expect(filterViewByLayers(v, new Set())).toBe(v);
    expect(filterViewByLayers(v, new Set(['nothing-on-it']))).toBe(v);
  });

  test('a hidden layer takes its connectors, and those hanging off them', () => {
    const out = filterViewByLayers(view(), new Set(['detail']));
    expect(
      out.items.map((i) => {
        return i.id;
      })
    ).toEqual(['a']);
    expect(out.connectors).toEqual([]);
    expect(out.rectangles).toEqual([]);
    expect(
      out.textBoxes?.map((t) => {
        return t.id;
      })
    ).toEqual(['ip', 'note']);
  });

  test('hasRedactedContent', () => {
    expect(hasRedactedContent(model())).toBe(true);
    const m = model();
    m.views[0].textBoxes = m.views[0].textBoxes?.filter((t) => {
      return t.layerId !== REDACTED_LAYER_ID;
    });
    expect(hasRedactedContent(m)).toBe(false);
  });

  test('an export leaves Redacted out unless it opts in', () => {
    const m = model();
    const out = modelForExport(m, { includeRedacted: false });
    expect(
      out.views[0].textBoxes?.map((t) => {
        return t.id;
      })
    ).toEqual(['note']);
    expect(out.views[0].items).toHaveLength(2);
    expect(validateModel(out)).toEqual([]);
    expect(modelForExport(m, { includeRedacted: true })).toBe(m);
  });

  test('an export leaves hidden layers out, and the items only they placed', () => {
    const m = model([{ id: 'detail', name: 'Detail', visible: false }]);
    const out = modelForExport(m, { includeRedacted: true });
    expect(
      out.items.map((i) => {
        return i.id;
      })
    ).toEqual(['a', 'unplaced']);
    expect(validateModel(out)).toEqual([]);
  });
});

describe('layer reducers', () => {
  const state = (): State => {
    return { model: model(), scene: INITIAL_SCENE_STATE };
  };

  test('add, rename, hide and show', () => {
    let s = reducers.addLayer(state(), { id: 'n', name: 'Notes' });
    expect(s.model.layers).toHaveLength(2);
    s = reducers.updateLayer(s, 'n', { name: 'Annotations', visible: false });
    expect(s.model.layers?.[1]).toEqual({
      id: 'n',
      name: 'Annotations',
      visible: false
    });
    s = reducers.updateLayer(s, 'n', { visible: true });
    // Visible is the default, and is stored as nothing.
    expect(s.model.layers?.[1]).toEqual({ id: 'n', name: 'Annotations' });
  });

  test('the reserved id cannot be added, and no-ops return the state', () => {
    const s = state();
    expect(reducers.addLayer(s, { id: REDACTED_LAYER_ID, name: 'R' })).toBe(s);
    expect(reducers.updateLayer(s, 'missing', { name: 'X' })).toBe(s);
    expect(reducers.deleteLayer(s, 'missing')).toBe(s);
    expect(
      reducers.setItemsLayer(s, 'v', [{ type: 'ITEM', id: 'b' }], 'detail')
    ).toBe(s);
  });

  test('deleting a layer moves what it held to the base layer', () => {
    const s = reducers.deleteLayer(state(), 'detail');
    expect(s.model.layers).toEqual([]);
    const v = s.model.views[0];
    expect(v.items[1]).not.toHaveProperty('layerId');
    expect(v.rectangles?.[0]).not.toHaveProperty('layerId');
    expect(v.textBoxes?.[0].layerId).toBe(REDACTED_LAYER_ID);
    expect(validateModel(s.model)).toEqual([]);
  });

  test('setItemsLayer moves a selection, and back to base', () => {
    let s = reducers.setItemsLayer(
      state(),
      'v',
      [
        { type: 'ITEM', id: 'a' },
        { type: 'CONNECTOR', id: 'k1' },
        { type: 'TEXTBOX', id: 'note' }
      ],
      REDACTED_LAYER_ID
    );
    const v = s.model.views[0];
    expect(v.items[0].layerId).toBe(REDACTED_LAYER_ID);
    expect(v.connectors?.[0].layerId).toBe(REDACTED_LAYER_ID);
    expect(v.connectors?.[1]).not.toHaveProperty('layerId');
    expect(v.textBoxes?.[1].layerId).toBe(REDACTED_LAYER_ID);
    s = reducers.setItemsLayer(s, 'v', [{ type: 'ITEM', id: 'a' }], undefined);
    expect(s.model.views[0].items[0]).not.toHaveProperty('layerId');
  });
});
