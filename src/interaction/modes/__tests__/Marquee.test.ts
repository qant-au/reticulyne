/**
 * @jest-environment jsdom
 */
import { Marquee } from '../Marquee';
import { makeState, lastModeChange, ref, type SceneShape } from './_helpers';
import type { ViewItem } from 'src/types';

const itemAt = (id: string, tile: { x: number; y: number }): ViewItem => {
  return { id, tile };
};

const scene = (items: ViewItem[]): Partial<SceneShape> => {
  return { items: items as unknown as SceneShape['items'] };
};

const nodeA = ref('ITEM', 'a');
const nodeB = ref('ITEM', 'b');
const nodeFar = ref('ITEM', 'far');

const threeNodes = scene([
  itemAt('a', { x: 1, y: 1 }),
  itemAt('b', { x: 3, y: 3 }),
  itemAt('far', { x: 20, y: 20 })
]);

const marqueeMode = (
  to: { x: number; y: number },
  base: (typeof nodeA)[] = []
) => {
  return {
    type: 'MARQUEE' as const,
    showCursor: true,
    from: { x: 0, y: 0 },
    to,
    base
  };
};

const setSelectionCalls = (state: ReturnType<typeof makeState>) => {
  return (state.uiState.actions.setSelection as jest.Mock).mock.calls;
};

describe('Marquee mode', () => {
  test('selects everything the band covers', () => {
    const state = makeState({
      mode: marqueeMode({ x: 5, y: 5 }),
      mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 5, y: 5 } } },
      scene: threeNodes
    });

    Marquee.mousemove?.(state);

    expect(state.uiState.actions.setSelection).toHaveBeenCalledWith([
      nodeA,
      nodeB
    ]);
  });

  test('tracks the pointer into mode.to so the band redraws', () => {
    const state = makeState({
      mode: marqueeMode({ x: 2, y: 2 }),
      mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 7, y: 7 } } },
      scene: threeNodes
    });

    Marquee.mousemove?.(state);

    expect(lastModeChange(state)).toEqual(
      expect.objectContaining({ type: 'MARQUEE', to: { x: 7, y: 7 } })
    );
  });

  test('unions with the base on a Shift-drag', () => {
    const state = makeState({
      mode: marqueeMode({ x: 5, y: 5 }, [nodeFar]),
      mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 5, y: 5 } } },
      scene: threeNodes
    });

    Marquee.mousemove?.(state);

    expect(state.uiState.actions.setSelection).toHaveBeenCalledWith([
      nodeFar,
      nodeA,
      nodeB
    ]);
  });

  test('an item already in the base is not added twice', () => {
    const state = makeState({
      mode: marqueeMode({ x: 5, y: 5 }, [nodeA]),
      mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 5, y: 5 } } },
      scene: threeNodes
    });

    Marquee.mousemove?.(state);

    expect(state.uiState.actions.setSelection).toHaveBeenCalledWith([
      nodeA,
      nodeB
    ]);
  });

  // The reason MarqueeMode carries `base` rather than an `additive` flag:
  // recomputing from `base` each frame means shrinking the band releases
  // what it no longer covers. Accumulating onto the live selection would
  // make every sweep monotonically grow.
  test('shrinking the band releases items it no longer covers', () => {
    const wide = makeState({
      mode: marqueeMode({ x: 5, y: 5 }),
      mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 5, y: 5 } } },
      scene: threeNodes
    });
    Marquee.mousemove?.(wide);
    expect(setSelectionCalls(wide)[0][0]).toEqual([nodeA, nodeB]);

    // Same drag, band pulled back to cover only node 'a'. The live
    // selection at this point is [a, b] — the result must still be [a].
    const narrow = makeState({
      mode: marqueeMode({ x: 2, y: 2 }),
      mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 2, y: 2 } } },
      scene: threeNodes,
      selection: [nodeA, nodeB]
    });
    Marquee.mousemove?.(narrow);

    expect(setSelectionCalls(narrow)[0][0]).toEqual([nodeA]);
  });

  test('shrinking a Shift-drag never drops the pre-drag selection', () => {
    const state = makeState({
      mode: marqueeMode({ x: -1, y: -1 }, [nodeFar]),
      mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: -1, y: -1 } } },
      scene: threeNodes,
      selection: [nodeFar, nodeA, nodeB]
    });

    Marquee.mousemove?.(state);

    expect(setSelectionCalls(state)[0][0]).toEqual([nodeFar]);
  });

  test('does nothing in a read-only diagram', () => {
    const state = makeState({
      mode: marqueeMode({ x: 5, y: 5 }),
      mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 5, y: 5 } } },
      scene: threeNodes,
      editorMode: 'EXPLORABLE_READONLY'
    });

    Marquee.mousemove?.(state);

    expect(state.uiState.actions.setSelection).not.toHaveBeenCalled();
    expect(state.uiState.actions.setMode).not.toHaveBeenCalled();
  });

  test('mouseup returns to CURSOR and keeps the selection', () => {
    const state = makeState({
      mode: marqueeMode({ x: 5, y: 5 }),
      scene: threeNodes,
      selection: [nodeA, nodeB]
    });

    Marquee.mouseup?.(state);

    expect(lastModeChange(state)).toEqual({
      type: 'CURSOR',
      showCursor: true,
      mousedownItem: null
    });
    expect(state.uiState.actions.setSelection).not.toHaveBeenCalled();
    expect(state.uiState.actions.clearSelection).not.toHaveBeenCalled();
  });

  test('entry suppresses native text selection, exit restores it', () => {
    const el = document.createElement('div');
    const state = makeState({
      mode: marqueeMode({ x: 1, y: 1 }),
      scene: threeNodes,
      rendererRef: el
    });

    Marquee.entry?.(state);
    expect(el.style.userSelect).toBe('none');

    Marquee.exit?.(state);
    expect(el.style.userSelect).toBe('auto');
  });
});
