import { INITIAL_DATA, INITIAL_SCENE_STATE } from 'src/config';
import * as reducers from 'src/stores/reducers';
import { validateModel } from 'src/schemas/validation';
import type { Model, View } from 'src/types';
import type { State } from 'src/stores/reducers/types';
import type { useScene } from 'src/hooks/useScene';
import { validateScene } from 'src/vendor/accurona-core';
import { sceneFromModel, sceneToModel, freshSceneContext } from 'src/scene';
import { getItemAtTile, getItemsInBounds } from '../hitTest';
import { hasLocked, isLocked } from '../lock';

// lw-069. A node (a) locked on top of a rectangle (r), a free node (b), a
// note (t) and a connector (k) from a to b.
const view = (): View => {
  return {
    id: 'v',
    name: 'V',
    items: [
      { id: 'a', tile: { x: 1, y: 1 }, locked: true },
      { id: 'b', tile: { x: 5, y: 1 } }
    ],
    connectors: [
      {
        id: 'k',
        anchors: [
          { id: 'k1', ref: { item: 'a' } },
          { id: 'k2', ref: { item: 'b' } }
        ]
      }
    ],
    rectangles: [{ id: 'r', from: { x: 0, y: 0 }, to: { x: 2, y: 2 } }],
    textBoxes: [{ id: 't', tile: { x: 0, y: 4 }, content: 'Note' }]
  };
};

const model = (): Model => {
  return {
    ...INITIAL_DATA,
    items: [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' }
    ],
    views: [view()]
  };
};

const state = (): State => {
  return { model: model(), scene: INITIAL_SCENE_STATE };
};

type SceneShape = ReturnType<typeof useScene>;

const sceneOf = (v: View): SceneShape => {
  return {
    items: v.items,
    textBoxes: [],
    connectors: [],
    rectangles: v.rectangles ?? []
  } as unknown as SceneShape;
};

describe('lock helpers', () => {
  test('isLocked and hasLocked read the flag', () => {
    const v = view();
    expect(isLocked(v, { type: 'ITEM', id: 'a' })).toBe(true);
    expect(isLocked(v, { type: 'ITEM', id: 'b' })).toBe(false);
    expect(isLocked(v, { type: 'RECTANGLE', id: 'r' })).toBe(false);
    expect(hasLocked(v)).toBe(true);
    v.items[0].locked = undefined;
    expect(hasLocked(v)).toBe(false);
  });

  test('the model validates with locked items', () => {
    expect(validateModel(model())).toEqual([]);
  });
});

describe('hit testing', () => {
  test('a click passes over a locked node to the rectangle below', () => {
    const scene = sceneOf(view());
    const tile = { x: 1, y: 1 };
    expect(getItemAtTile({ tile, scene })).toEqual({ type: 'ITEM', id: 'a' });
    expect(getItemAtTile({ tile, scene, skipLocked: true })).toEqual({
      type: 'RECTANGLE',
      id: 'r'
    });
  });

  test('the marquee never catches a locked item', () => {
    const found = getItemsInBounds({
      from: { x: 0, y: 0 },
      to: { x: 6, y: 2 },
      scene: sceneOf(view())
    });
    expect(found).toEqual([
      { type: 'ITEM', id: 'b' },
      { type: 'RECTANGLE', id: 'r' }
    ]);
  });
});

describe('setItemsLocked', () => {
  test('locks a selection of every kind, one undo step, and unlocks it', () => {
    let s = reducers.setItemsLocked(
      state(),
      'v',
      [
        { type: 'ITEM', id: 'b' },
        { type: 'CONNECTOR', id: 'k' },
        { type: 'RECTANGLE', id: 'r' },
        { type: 'TEXTBOX', id: 't' }
      ],
      true
    );
    const v = s.model.views[0];
    expect(v.items[1].locked).toBe(true);
    expect(v.connectors?.[0].locked).toBe(true);
    expect(v.rectangles?.[0].locked).toBe(true);
    expect(v.textBoxes?.[0].locked).toBe(true);
    s = reducers.setItemsLocked(s, 'v', [{ type: 'ITEM', id: 'b' }], false);
    // Unlocked is stored as no flag at all.
    expect(s.model.views[0].items[1]).not.toHaveProperty('locked');
  });

  test('unlocks everything in the view', () => {
    const s = reducers.setItemsLocked(state(), 'v', 'all', false);
    expect(hasLocked(s.model.views[0])).toBe(false);
  });

  test('a no-op returns the same state', () => {
    const s = state();
    expect(
      reducers.setItemsLocked(s, 'v', [{ type: 'ITEM', id: 'a' }], true)
    ).toBe(s);
    expect(
      reducers.setItemsLocked(
        s,
        'v',
        [{ type: 'CONNECTOR_ANCHOR', id: 'k1' }],
        true
      )
    ).toBe(s);
  });
});

describe('scene format', () => {
  test('locked is saved to the scene and read back', () => {
    const context = freshSceneContext('Locks');
    const locked = reducers.setItemsLocked(
      state(),
      'v',
      [
        { type: 'CONNECTOR', id: 'k' },
        { type: 'RECTANGLE', id: 'r' },
        { type: 'TEXTBOX', id: 't' }
      ],
      true
    ).model;
    const saved = sceneFromModel(locked, context);
    const result = validateScene(saved);
    expect(result.ok ? [] : result.errors).toEqual([]);
    const sv = saved.views?.[0];
    if (!sv || sv.kind === 'plan') throw new Error('expected a diagram view');
    expect(sv.placements?.[0].locked).toBe(true);
    expect(sv.placements?.[1]).not.toHaveProperty('locked');
    expect(sv.connectors?.[0].locked).toBe(true);
    expect(sv.rectangles?.[0].locked).toBe(true);
    expect(sv.textBoxes?.[0].locked).toBe(true);

    const back = sceneToModel(saved).model.views[0];
    expect(back.items[0].locked).toBe(true);
    expect(back.items[1]).not.toHaveProperty('locked');
    expect(back.connectors?.[0].locked).toBe(true);
    expect(back.rectangles?.[0].locked).toBe(true);
    expect(back.textBoxes?.[0].locked).toBe(true);
  });
});
