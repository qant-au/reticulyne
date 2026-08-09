/**
 * @jest-environment jsdom
 */
import { Cursor } from '../Cursor';
import { makeState, lastModeChange, ref, type SceneShape } from './_helpers';
import type { ItemReference, ViewItem } from 'src/types';

const itemAt = (id: string, tile: { x: number; y: number }): ViewItem => {
  return { id, tile };
};

const sceneWithItems = (items: ViewItem[]): Partial<SceneShape> => {
  return { items: items as unknown as SceneShape['items'] };
};

const node1 = ref('ITEM', 'node1');
const node2 = ref('ITEM', 'node2');

// A press at { x: 2, y: 2 } that has since moved to { x: 4, y: 4 } — the
// shape every drag test below needs.
const draggingMouse = {
  position: { screen: { x: 40, y: 40 }, tile: { x: 4, y: 4 } },
  mousedown: { screen: { x: 20, y: 20 }, tile: { x: 2, y: 2 } },
  delta: { screen: { x: 20, y: 20 }, tile: { x: 2, y: 2 } }
};

describe('Cursor mode — 1.4 multi-select', () => {
  describe('Shift+click', () => {
    test('toggles the item instead of replacing the selection', () => {
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
        mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 2, y: 2 } } },
        scene: sceneWithItems([itemAt('node1', { x: 2, y: 2 })]),
        selection: [node2],
        modifiers: { shift: true }
      });

      Cursor.mousedown?.(state);

      expect(state.uiState.actions.toggleSelected).toHaveBeenCalledWith(node1);
      expect(state.uiState.actions.setItemControls).not.toHaveBeenCalled();
    });

    test('on empty canvas keeps the selection — an additive marquee may follow', () => {
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
        mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 9, y: 9 } } },
        scene: sceneWithItems([]),
        selection: [node1, node2],
        modifiers: { shift: true }
      });

      Cursor.mousedown?.(state);

      expect(state.uiState.actions.setItemControls).not.toHaveBeenCalled();
    });

    test('without Shift, empty canvas still clears', () => {
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
        mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 9, y: 9 } } },
        scene: sceneWithItems([]),
        selection: [node1, node2]
      });

      Cursor.mousedown?.(state);

      expect(state.uiState.actions.setItemControls).toHaveBeenCalledWith(null);
    });

    test('mouseup does not undo the toggle done on mousedown', () => {
      const state = makeState({
        mode: {
          type: 'CURSOR',
          showCursor: true,
          mousedownItem: node1
        },
        scene: sceneWithItems([itemAt('node1', { x: 2, y: 2 })]),
        selection: [node2, node1],
        modifiers: { shift: true }
      });

      Cursor.mouseup?.(state);

      expect(state.uiState.actions.setItemControls).not.toHaveBeenCalled();
    });
  });

  describe('plain click on a member of a multi-selection', () => {
    test('mousedown leaves the group intact so it can be dragged as one', () => {
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
        mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 2, y: 2 } } },
        scene: sceneWithItems([itemAt('node1', { x: 2, y: 2 })]),
        selection: [node1, node2]
      });

      Cursor.mousedown?.(state);

      expect(state.uiState.actions.setItemControls).not.toHaveBeenCalled();
      expect(lastModeChange(state)).toEqual(
        expect.objectContaining({ mousedownItem: node1 })
      );
    });

    test('mouseup likewise leaves it intact', () => {
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: node1 },
        scene: sceneWithItems([itemAt('node1', { x: 2, y: 2 })]),
        selection: [node1, node2]
      });

      Cursor.mouseup?.(state);

      expect(state.uiState.actions.setItemControls).not.toHaveBeenCalled();
    });

    test('clicking an item OUTSIDE the selection still collapses to it', () => {
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
        mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 7, y: 7 } } },
        scene: sceneWithItems([itemAt('node3', { x: 7, y: 7 })]),
        selection: [node1, node2]
      });

      Cursor.mousedown?.(state);

      expect(state.uiState.actions.setItemControls).toHaveBeenCalledWith(
        ref('ITEM', 'node3')
      );
    });
  });

  describe('marquee entry', () => {
    test('dragging from empty canvas enters MARQUEE with an empty base', () => {
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
        mouse: draggingMouse,
        scene: sceneWithItems([]),
        selection: [node1]
      });

      Cursor.mousemove?.(state);

      expect(lastModeChange(state)).toEqual({
        type: 'MARQUEE',
        showCursor: true,
        from: { x: 2, y: 2 },
        to: { x: 4, y: 4 },
        base: []
      });
    });

    test('Shift+drag from empty canvas carries the existing selection as base', () => {
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
        mouse: draggingMouse,
        scene: sceneWithItems([]),
        selection: [node1, node2],
        modifiers: { shift: true }
      });

      Cursor.mousemove?.(state);

      expect(lastModeChange(state)).toEqual(
        expect.objectContaining({ type: 'MARQUEE', base: [node1, node2] })
      );
    });

    test('a hover with no button held does NOT open a band', () => {
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
        mouse: {
          position: { screen: { x: 40, y: 40 }, tile: { x: 4, y: 4 } },
          mousedown: null,
          delta: { screen: { x: 20, y: 20 }, tile: { x: 2, y: 2 } }
        },
        scene: sceneWithItems([])
      });

      Cursor.mousemove?.(state);

      expect(state.uiState.actions.setMode).not.toHaveBeenCalled();
    });

    test('a read-only diagram cannot be marquee-selected', () => {
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
        mouse: draggingMouse,
        scene: sceneWithItems([]),
        editorMode: 'EXPLORABLE_READONLY'
      });

      Cursor.mousemove?.(state);

      expect(state.uiState.actions.setMode).not.toHaveBeenCalled();
    });
  });

  describe('group drag', () => {
    test('dragging a member of a multi-selection drags the whole selection', () => {
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: node1 },
        mouse: draggingMouse,
        scene: sceneWithItems([itemAt('node1', { x: 2, y: 2 })]),
        selection: [node1, node2]
      });

      Cursor.mousemove?.(state);

      expect(lastModeChange(state)).toEqual(
        expect.objectContaining({
          type: 'DRAG_ITEMS',
          items: [node1, node2]
        })
      );
    });

    test('dragging an item outside the selection drags only that item', () => {
      const outsider: ItemReference = ref('ITEM', 'node9');
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: outsider },
        mouse: draggingMouse,
        scene: sceneWithItems([itemAt('node9', { x: 2, y: 2 })]),
        selection: [node1, node2]
      });

      Cursor.mousemove?.(state);

      expect(lastModeChange(state)).toEqual(
        expect.objectContaining({ type: 'DRAG_ITEMS', items: [outsider] })
      );
    });

    test('a single selection drags only itself', () => {
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: node1 },
        mouse: draggingMouse,
        scene: sceneWithItems([itemAt('node1', { x: 2, y: 2 })]),
        selection: [node1]
      });

      Cursor.mousemove?.(state);

      expect(lastModeChange(state)).toEqual(
        expect.objectContaining({ type: 'DRAG_ITEMS', items: [node1] })
      );
    });
  });
});
